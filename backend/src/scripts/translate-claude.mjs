#!/usr/bin/env node
/**
 * Tõlkeskript: kasutab Claude CLI-t (Max plaan, tasuta)
 * Loeb tõlkimata tooted DB-st, tõlgib eesti keelde, kirjutab tagasi.
 */

import pg from "pg"
import { execFileSync } from "child_process"
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

const { Client } = pg
const DB_URL = process.env.DATABASE_URL || "postgres://xlmarket:xlmarket_pg_2026_secure@localhost:5435/xlmarket"
const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_API_KEY || "xlmarket2024_secure_key"
const MEILI_INDEX = "products"
const args = process.argv.slice(2)
const LIMIT = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : 50

async function meiliUpdate(docs) {
  if (!docs.length) return
  const res = await fetch(`${MEILI_HOST}/indexes/${MEILI_INDEX}/documents`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(docs),
  })
  if (!res.ok) console.warn("⚠️  MeiliSearch uuendus ebaõnnestus:", res.status)
}

async function main() {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()

  const { rows: products } = await client.query(`
    SELECT id, title, description
    FROM product
    WHERE metadata->>'translated' IS NULL
       OR (metadata->>'translated')::boolean = false
    ORDER BY created_at ASC
    LIMIT $1
  `, [LIMIT])
  if (products.length === 0) {
    console.log("✅ Kõik tooted on tõlgitud!")
    await client.end()
    return
  }

  console.log(`🔄 Tõlgin ${products.length} toodet...`)

  const inputFile = join(tmpdir(), `xl-translate-in-${Date.now()}.json`)
  const outputFile = join(tmpdir(), `xl-translate-out-${Date.now()}.json`)

  // Kirjuta sisend
  writeFileSync(inputFile, JSON.stringify(products, null, 2), "utf8")

  const prompt = `Tõlgi VEVOR tooteid inglise keelest eesti keelde.

Loe fail: ${inputFile}
See sisaldab JSON massiivi kujul: [{"id":"...","title":"...","description":"..."}]

TÕLKEREEGLID:
- Loomulik eesti keel, mitte sõnasõnaline tõlge
- Tehniline täpsus on oluline
- VEVOR brändinimi jääb muutmata
- Pealkiri: lühike ja selge
- Kirjeldus: informatiivne, HTML-märgendid säilita

Kirjuta tulemus faili ${outputFile} kujul:
[{"id":"sama id mis sisendis","title_et":"eestikeelne pealkiri","description_et":"eestikeelne kirjeldus"}]

Tõlgi KÕIK ${products.length} toodet. Ära lisa kommentaare.`

  try {
    execFileSync("claude", ["--dangerously-skip-permissions", "-p", prompt], {
      cwd: "/home/brrr/brrr-xlmarket",
      timeout: 600000,
      stdio: ["ignore", "pipe", "pipe"]
    })
  } catch (e) {
    // Claude võib exitida mitte-nulliga
  }

  if (!existsSync(outputFile)) {
    console.error("❌ Claude ei loonud väljundfaili")
    try { unlinkSync(inputFile) } catch {}
    await client.end()
    return
  }

  let translations
  try {
    const raw = readFileSync(outputFile, "utf8")
    // Otsi JSON massiiv tekstist
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error("JSON massiivi ei leitud")
    translations = JSON.parse(match[0])
  } catch (e) {
    console.error("❌ Tõlgete lugemine ebaõnnestus:", e.message)
    try { unlinkSync(inputFile) } catch {}
    try { unlinkSync(outputFile) } catch {}
    await client.end()
    return
  }

  console.log(`✅ Saadud ${translations.length} tõlget`)

  let updated = 0
  const meiliDocs = []
  for (const t of translations) {
    if (!t.id || !t.title_et) continue
    try {
      // KRIITILINE: title väli EI muutu — originaal EN jääb alles!
      // Tõlge läheb metadata-sse: title_et + description_et
      await client.query(`
        UPDATE product
        SET
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'translated', true,
            'title_et', $1::text,
            'description_et', COALESCE($2::text, metadata->>'description_et'),
            'original_title', title,
            'original_description', LEFT(COALESCE(description, ''), 500)
          ),
          updated_at = NOW()
        WHERE id = $3
      `, [t.title_et, t.description_et || null, t.id])
      updated++
      // MeiliSearch partial update — ainult tõlkeväljad
      meiliDocs.push({
        id: t.id,
        title_et: t.title_et,
        description_et: t.description_et || '',
        translated: true,
      })
    } catch (e) {
      console.error(`Viga ${t.id}:`, e.message)
    }
  }

  console.log(`💾 Uuendatud ${updated} toodet DB-s`)

  // Uuenda MeiliSearch — partial update (ainult tõlkeväljad, title_en jääb puutumata)
  await meiliUpdate(meiliDocs)
  if (meiliDocs.length) console.log(`🔍 MeiliSearch uuendatud: ${meiliDocs.length} dokumenti`)

  try { unlinkSync(inputFile) } catch {}
  try { unlinkSync(outputFile) } catch {}
  await client.end()
}

main().catch(console.error)
