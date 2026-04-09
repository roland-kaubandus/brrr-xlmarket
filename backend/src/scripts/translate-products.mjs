/**
 * XLM-18: Translate product titles and descriptions from English to Estonian
 *
 * Uses Google Translate (free, no API key).
 * Processes in batches to avoid rate limiting.
 *
 * Usage:
 *   node src/scripts/translate-products.mjs                    # translate all
 *   node src/scripts/translate-products.mjs --limit 50         # test with 50
 *   node src/scripts/translate-products.mjs --dry-run          # preview only
 *   node src/scripts/translate-products.mjs --titles-only      # only titles
 */

import translate from "google-translate-api-x"
import http from "http"
import https from "https"

const MEDUSA_URL = process.env.MEDUSA_URL || "http://127.0.0.1:9001"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "tarmo@xlmarket.eu"
const ADMIN_PASS = process.env.ADMIN_PASS
if (!ADMIN_PASS) throw new Error("ADMIN_PASS env variable required")

const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_API_KEY || "xlmarket2024_secure_key"
const MEILI_INDEX = "products"

async function meiliUpdate(docs) {
  if (!docs.length) return
  const res = await fetch(`${MEILI_HOST}/indexes/${MEILI_INDEX}/documents`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(docs),
  })
  if (!res.ok) console.warn("⚠️  MeiliSearch uuendus ebaõnnestus:", res.status)
}

const args = process.argv.slice(2)
const LIMIT = args.includes("--limit")
  ? parseInt(args[args.indexOf("--limit") + 1])
  : 0
const DRY_RUN = args.includes("--dry-run")
const TITLES_ONLY = args.includes("--titles-only")
const BATCH_SIZE = 10 // increased since Google Translate works reliably
const TRANSLATE_DELAY = 800 // ms between batches

let globalToken = null
let stats = { total: 0, translated: 0, skipped: 0, errors: 0 }

function apiCall(method, endpoint, body, useAuth = true) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, MEDUSA_URL)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    }
    if (useAuth && globalToken) {
      options.headers["Authorization"] = `Bearer ${globalToken}`
    }
    const proto = url.protocol === "https:" ? https : http
    const req = proto.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve({ raw: data, status: res.statusCode })
        }
      })
    })
    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function authenticate() {
  const resp = await apiCall(
    "POST",
    "/auth/user/emailpass",
    { email: ADMIN_EMAIL, password: ADMIN_PASS },
    false
  )
  return resp.token
}

function isEnglish(text) {
  if (!text) return false
  // Heuristic: contains common English words and no Estonian characters
  const stripped = text.replace(/<[^>]*>/g, "").trim()
  if (!stripped) return false
  // If already contains Estonian chars (õ, ä, ö, ü), probably already translated
  if (/[õäöü]/i.test(stripped)) return false
  return true
}

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function getSellingPoints(metadata) {
  const direct = []
  for (let index = 1; index <= 5; index++) {
    const value = metadata?.[`selling_point_${index}`]
    if (typeof value === "string" && value.trim()) {
      direct.push(value.trim())
    }
  }

  if (direct.length > 0) return direct.slice(0, 5)

  if (Array.isArray(metadata?.selling_points)) {
    return metadata.selling_points
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5)
  }

  return []
}

async function translateText(text, maxLen = 0) {
  if (!text) return text
  try {
    const clean = stripHtml(text).substring(0, 4000) // Google Translate limit
    const result = await translate(clean, { from: "en", to: "et" })
    let translated = result.text
    if (maxLen && translated.length > maxLen) {
      translated = translated.substring(0, maxLen - 3) + "..."
    }
    return translated
  } catch (err) {
    if (err.message?.includes("Too Many Requests") || err.code === 429) {
      // Rate limited, wait and retry once
      await sleep(5000)
      try {
        const clean = stripHtml(text).substring(0, 4000)
        const result = await translate(clean, { from: "en", to: "et" })
        return result.text
      } catch {
        return null // give up
      }
    }
    return null
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function loadAllProducts() {
  const products = []
  let offset = 0
  const limit = 100

  while (true) {
    const resp = await apiCall(
      "GET",
      `/admin/products?limit=${limit}&offset=${offset}&fields=id,title,description,handle,metadata&status[]=published&status[]=draft`
    )
    const batch = resp.products || []
    products.push(...batch)
    offset += limit
    if (batch.length < limit || (resp.count && offset >= resp.count)) break
  }

  return products
}

async function main() {
  console.log("========================================")
  console.log("  XLMARKET — Product Translator")
  console.log("  EN → ET (Google Translate)")
  console.log("========================================\n")

  if (DRY_RUN) console.log("  MODE: DRY RUN\n")
  if (TITLES_ONLY) console.log("  MODE: TITLES ONLY\n")
  if (LIMIT) console.log(`  LIMIT: ${LIMIT} products\n`)

  // Authenticate
  console.log("[1/3] Authenticating...")
  globalToken = await authenticate()
  console.log("  OK\n")

  // Load products
  console.log("[2/3] Loading products...")
  let products = await loadAllProducts()
  console.log(`  Loaded ${products.length} products`)

  // Filter to untranslated only
  products = products.filter((p) => {
    // Skip if already marked as translated
    if (p.metadata?.translated === true) return false
    // Skip if title looks Estonian already
    if (!isEnglish(p.title)) return false
    return true
  })
  console.log(`  Need translation: ${products.length}`)

  if (LIMIT) {
    products = products.slice(0, LIMIT)
    console.log(`  Processing: ${products.length}`)
  }

  stats.total = products.length
  console.log("")

  if (DRY_RUN) {
    console.log("  Sample titles to translate:")
    for (const p of products.slice(0, 10)) {
      console.log(`    - ${p.title.substring(0, 80)}`)
    }
    console.log("\n  DRY RUN complete.")
    return
  }

  // Translate
  console.log("[3/3] Translating...")
  const startTime = Date.now()

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)

    for (const product of batch) {
      try {
        const translatedTitle = await translateText(product.title)
        if (!translatedTitle) {
          stats.errors++
          continue
        }

        const currentSellingPoints = getSellingPoints(product.metadata)
        const translatedSellingPoints = []
        for (const sellingPoint of currentSellingPoints) {
          const translatedPoint = await translateText(sellingPoint)
          translatedSellingPoints.push(translatedPoint || "")
        }

        // WO-CODEX-001 andmemudel:
        // aktiivne ET sisu kirjutatakse product.title / product.description peale
        // originaal EN salvestatakse metadata.original_* alla
        const updateData = {
          title: translatedTitle,
          metadata: {
            ...product.metadata,
            translated: true,
            original_title: product.title,
          },
        }

        if (!TITLES_ONLY && product.description && isEnglish(product.description)) {
          const translatedDesc = await translateText(product.description)
          if (translatedDesc) {
            updateData.description = translatedDesc
            updateData.metadata.original_description = product.description
          }
        }

        for (let index = 0; index < 5; index++) {
          const translatedPoint = translatedSellingPoints[index] || ""
          const originalPoint = currentSellingPoints[index] || ""
          updateData.metadata[`selling_point_${index + 1}`] = translatedPoint
          if (originalPoint) {
            updateData.metadata[`original_selling_point_${index + 1}`] = originalPoint
          }
        }

        updateData.metadata.selling_points = translatedSellingPoints.filter(Boolean)
        if (currentSellingPoints.length > 0) {
          updateData.metadata.original_selling_points = currentSellingPoints
        }

        const resp = await apiCall(
          "POST",
          `/admin/products/${product.id}`,
          updateData
        )

        if (resp.product) {
          stats.translated++
          // Partial MeiliSearch update — uus mudel + legacy otsinguväljad
          await meiliUpdate([{
            id: product.id,
            title: translatedTitle,
            original_title: product.title,
            title_et: translatedTitle,
            title_en: product.title,
            description: updateData.description || "",
            original_description: updateData.metadata.original_description || "",
            description_et: updateData.description || "",
            description_en: updateData.metadata.original_description || "",
            selling_point_1: updateData.metadata.selling_point_1 || "",
            selling_point_2: updateData.metadata.selling_point_2 || "",
            selling_point_3: updateData.metadata.selling_point_3 || "",
            selling_point_4: updateData.metadata.selling_point_4 || "",
            selling_point_5: updateData.metadata.selling_point_5 || "",
            translated: true,
          }])
        } else {
          stats.errors++
          if (stats.errors <= 5) {
            console.error(
              `\n  ERROR ${product.handle}: ${resp.message || "unknown"}`
            )
          }
        }
      } catch (err) {
        stats.errors++
        if (stats.errors <= 5) {
          console.error(`\n  ERROR ${product.handle}: ${err.message}`)
        }
      }
    }

    const done = Math.min(i + BATCH_SIZE, products.length)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const rate = (done / Math.max(1, (Date.now() - startTime) / 1000)).toFixed(1)
    process.stdout.write(
      `\r  Progress: ${done}/${products.length} (${rate}/s, ${elapsed}s)`
    )

    // Rate limit delay between batches
    if (i + BATCH_SIZE < products.length) {
      await sleep(TRANSLATE_DELAY)
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log("\n\n========================================")
  console.log("  TRANSLATION COMPLETE")
  console.log("========================================")
  console.log(`  Total:      ${stats.total}`)
  console.log(`  Translated: ${stats.translated}`)
  console.log(`  Skipped:    ${stats.skipped}`)
  console.log(`  Errors:     ${stats.errors}`)
  console.log(`  Time:       ${totalTime}s`)
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
