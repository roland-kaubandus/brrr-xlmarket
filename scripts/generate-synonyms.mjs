#!/usr/bin/env node
/**
 * XLM-92: Synonyms + inflections + relations generation
 *
 * Uses Claude CLI (OAuth) to generate for each product:
 * 1. Estonian inflections (cases + plural)
 * 2. Synonyms (ET + EN)
 * 3. Relations between products
 *
 * Results: product_synonym table + MeiliSearch synonyms register
 *
 * Usage: node scripts/generate-synonyms.mjs [--batch-size 20] [--limit 100] [--dry-run]
 */

import pg from "pg"
import { execSync } from "child_process"

const DB_URL = process.env.DATABASE_URL || `postgres://xlmarket:${process.env.PGPASSWORD}@localhost:5435/xlmarket`
const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY
const BATCH_SIZE = parseInt(process.argv.find((_, i, a) => a[i-1] === "--batch-size") || "20")
const DRY_RUN = process.argv.includes("--dry-run")
const LIMIT_ARG = process.argv.find((_, i, a) => a[i-1] === "--limit")
const MAX_PRODUCTS = LIMIT_ARG ? parseInt(LIMIT_ARG) : Infinity

// -- Claude CLI (OAuth) --
function claudeCli(prompt) {
  const escaped = prompt.replace(/'/g, "'\\''")
  const cmd = "claude -p '" + escaped + "' --output-format text --model haiku"
  const output = execSync(cmd, {
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 10,
    timeout: 120000,
  })
  return output.trim()
}

// -- MeiliSearch --
async function meili(path, method = "GET", body = null) {
  const opts = { method, headers: { "Authorization": "Bearer " + MEILI_KEY, "Content-Type": "application/json" } }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(MEILI_HOST + path, opts)
  if (!r.ok && r.status !== 202) {
    const text = await r.text()
    throw new Error("MeiliSearch " + r.status + ": " + text.slice(0, 200))
  }
  return r.json()
}

// -- DB queries --
async function getUnprocessedProducts(client, limit) {
  const { rows } = await client.query(
    "SELECT p.id, p.title, p.handle, " +
    "array_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as categories " +
    "FROM product p " +
    "LEFT JOIN product_category_product pcp ON pcp.product_id = p.id " +
    "LEFT JOIN product_category c ON c.id = pcp.product_category_id " +
    "WHERE p.status = 'published' AND p.deleted_at IS NULL " +
    "AND p.id NOT IN (SELECT DISTINCT product_id FROM product_synonym) " +
    "GROUP BY p.id, p.title, p.handle " +
    "ORDER BY p.created_at LIMIT $1",
    [limit]
  )
  return rows
}

async function saveSynonyms(client, productId, word, synonyms, inflections, lang) {
  await client.query(
    "INSERT INTO product_synonym (product_id, word, synonyms, inflections, lang) " +
    "VALUES ($1, $2, $3, $4, $5) " +
    "ON CONFLICT (product_id, word, lang) DO UPDATE SET synonyms = EXCLUDED.synonyms, inflections = EXCLUDED.inflections",
    [productId, word, synonyms, inflections, lang || "et"]
  )
}

async function saveRelation(client, sourceId, targetId, relationType, confidence) {
  await client.query(
    "INSERT INTO product_relation (source_product_id, target_product_id, relation_type, confidence) " +
    "VALUES ($1, $2, $3, $4) " +
    "ON CONFLICT (source_product_id, target_product_id, relation_type) DO NOTHING",
    [sourceId, targetId, relationType, confidence]
  )
}

// -- LLM prompt --
function buildPrompt(products) {
  const productList = products.map((p, i) =>
    (i+1) + ". [" + p.id + '] "' + p.title + '" (kategooriad: ' + ((p.categories || []).join(", ") || "puudub") + ")"
  ).join("\n")

  return "Sa oled eesti keele ja e-kaubanduse ekspert. Analyysi neid tooteid ja genereeri.\n\n" +
    "TOOTED:\n" + productList + "\n\n" +
    "YLESANNE 1 - SYNONYYYMID JA KAANDEVORMID\n" +
    "Iga toote puhul tuvasta pohisonad (nt treipink, pump, ventilaator) ja genereeri:\n" +
    "- synonyms: synonyyymid eesti ja inglise keeles (nt treipink -> lathe, metalltreipink)\n" +
    "- inflections: eesti kaandevormid (nimetav, omastav, osastav, mitmuse nimetav, omastav, osastav)\n\n" +
    "YLESANNE 2 - SEOSED TOODETE VAHEL\n" +
    "Kui moned tooted sellest nimekirjast sobivad kokku, on alternatiivid voi taiendavad - margi ara.\n" +
    "Seosetyyybid: sobib-kokku, on-alternatiiv, on-upgrade, kasutatakse-koos\n\n" +
    "VASTUS AINULT JSON, mitte midagi muud:\n" +
    '{"synonyms":[{"product_id":"prod_...","keywords":[{"word":"treipink","synonyms":["lathe","metalltreipink"],"inflections":["treipingi","treipinki","treipingid","treipinkide","treipinke"]}]}],"relations":[{"source_id":"prod_...","target_id":"prod_...","type":"kasutatakse-koos","confidence":0.85}]}\n\n' +
    "REEGLID:\n" +
    "- Iga toote kohta 2-5 pohisona (olulised otsinguterminid, mitte kogu pealkiri)\n" +
    "- Kaandevormid AINULT eesti keeles\n" +
    "- Synonyyymid nii eesti kui inglise keeles\n" +
    "- Seosed ainult kui loogiline\n" +
    "- Confidence 0.5-1.0\n" +
    "- AINULT JSON vastus"
}

// -- Sync to MeiliSearch --
async function syncSynonymsToMeili(client) {
  console.log("Synkroniseerin MeiliSearchi...")

  const { rows } = await client.query(
    "SELECT word, synonyms, inflections FROM product_synonym WHERE lang = 'et'"
  )

  const synonymMap = {}
  for (const row of rows) {
    const allForms = [row.word, ...row.synonyms, ...row.inflections]
      .map(s => s.toLowerCase().trim())
      .filter(Boolean)

    const unique = [...new Set(allForms)]
    if (unique.length > 1) {
      for (const form of unique) {
        if (!synonymMap[form]) synonymMap[form] = new Set()
        for (const other of unique) {
          if (other !== form) synonymMap[form].add(other)
        }
      }
    }
  }

  const meiliSynonyms = {}
  for (const [key, val] of Object.entries(synonymMap)) {
    meiliSynonyms[key] = [...val]
  }

  const count = Object.keys(meiliSynonyms).length
  console.log(count + " synonyyymigruppi")

  if (!DRY_RUN) {
    await meili("/indexes/products/settings/synonyms", "PUT", meiliSynonyms)
    console.log("MeiliSearch uuendatud")
  } else {
    console.log("DRY RUN - ei uuenda")
    const sample = Object.entries(meiliSynonyms).slice(0, 5)
    for (const [key, val] of sample) {
      console.log("  " + key + " -> " + val.join(", "))
    }
  }
}

// -- Main --
async function main() {
  const t0 = Date.now()
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  try {
    const { rows: [{ count }] } = await client.query(
      "SELECT COUNT(DISTINCT p.id) as count FROM product p " +
      "WHERE p.status='published' AND p.deleted_at IS NULL " +
      "AND p.id NOT IN (SELECT DISTINCT product_id FROM product_synonym)"
    )
    console.log(count + " tootlemata toodet (" + (MAX_PRODUCTS === Infinity ? "koik" : "limit " + MAX_PRODUCTS) + ")")
    if (DRY_RUN) console.log("DRY RUN")

    let processed = 0
    let totalSynonyms = 0
    let totalRelations = 0

    while (processed < MAX_PRODUCTS) {
      const batchLimit = Math.min(BATCH_SIZE, MAX_PRODUCTS - processed)
      const products = await getUnprocessedProducts(client, batchLimit)
      if (products.length === 0) {
        console.log("Koik tooted toodeldud!")
        break
      }

      console.log("\nBatch " + (Math.floor(processed / BATCH_SIZE) + 1) + ": " + products.length + " toodet (" + processed + "/" + count + ")")

      let result
      try {
        const prompt = buildPrompt(products)
        const response = claudeCli(prompt)
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error("JSON not found in response")
        result = JSON.parse(jsonMatch[0])
      } catch (e) {
        console.error("  Claude error: " + e.message)
        if (!DRY_RUN) {
          for (const p of products) {
            await saveSynonyms(client, p.id, p.title.slice(0, 50).toLowerCase(), [], [], "et")
          }
        }
        processed += products.length
        await new Promise(r => setTimeout(r, 3000))
        continue
      }

      // Save synonyms
      if (result.synonyms) {
        for (const prod of result.synonyms) {
          if (!prod.product_id || !prod.keywords) continue
          for (const kw of prod.keywords) {
            if (!kw.word) continue
            if (!DRY_RUN) {
              await saveSynonyms(client, prod.product_id, kw.word.toLowerCase(), kw.synonyms || [], kw.inflections || [], "et")
            }
            totalSynonyms++
          }
        }
      }

      // Save relations
      if (result.relations) {
        for (const rel of result.relations) {
          if (!rel.source_id || !rel.target_id || !rel.type) continue
          if (!DRY_RUN) {
            try {
              await saveRelation(client, rel.source_id, rel.target_id, rel.type, rel.confidence || 0.8)
              totalRelations++
            } catch (e) {
              // Skip invalid relation types
            }
          } else {
            totalRelations++
          }
        }
      }

      processed += products.length
      console.log("  " + totalSynonyms + " synonyyymi, " + totalRelations + " seost kokku")

      // Small delay between batches
      await new Promise(r => setTimeout(r, 500))
    }

    // Sync to MeiliSearch
    if (totalSynonyms > 0) {
      await syncSynonymsToMeili(client)
    }

    console.log("\nValmis! " + processed + " toodet, " + totalSynonyms + " synonyyymi, " + totalRelations + " seost")
    console.log(((Date.now() - t0) / 1000).toFixed(1) + "s")

  } finally {
    await client.end()
  }
}

main().catch(e => { console.error("ERROR: " + e.message); process.exit(1) })
