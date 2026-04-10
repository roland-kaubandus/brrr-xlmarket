#!/usr/bin/env node
/**
 * WO-CODEX-001 batch generator.
 *
 * Loeb DB-st või feed-cache failist tooted, mis vajavad kvaliteettõlke
 * review-batchi, saadab need tõlkijale ja kirjutab tulemuse Git-i sobiva
 * JSON failina.
 */

import pg from "pg"
import { execFileSync } from "child_process"
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { fileURLToPath } from "url"

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DB_URL = "postgres://xlmarket:PG_PASSWORD_REDACTED@localhost:5435/xlmarket"
const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, "../../data/translation-batches")
const DEFAULT_BATCH_ID = "wo-codex-001-batch-001"
const DEFAULT_CHUNK_SIZE = 10
const DEFAULT_FEED_CACHE = path.resolve(__dirname, "../../data/feeds/vevor-feed-cache.json")

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return fallback
  return process.argv[idx + 1] ?? fallback
}

function hasFlag(name) {
  return process.argv.includes(name)
}

const DB_URL = process.env.DATABASE_URL || DEFAULT_DB_URL
const LIMIT = Number.parseInt(getArg("--limit", "50"), 10)
const OFFSET = Number.parseInt(getArg("--offset", "0"), 10)
const POOL_LIMIT = Number.parseInt(getArg("--pool-limit", String(Math.max(LIMIT * 6, 300))), 10)
const CHUNK_SIZE = Number.parseInt(getArg("--chunk-size", String(DEFAULT_CHUNK_SIZE)), 10)
const BATCH_ID = getArg("--batch-id", DEFAULT_BATCH_ID)
const OUTPUT_DIR = path.resolve(getArg("--output-dir", DEFAULT_OUTPUT_DIR))
const OUTPUT_FILE = path.resolve(getArg("--output", path.join(OUTPUT_DIR, `${BATCH_ID}.json`)))
const DRY_RUN = hasFlag("--dry-run")
const SOURCE = getArg("--source", "db")
const FEED_CACHE_PATH = path.resolve(getArg("--feed-cache", DEFAULT_FEED_CACHE))
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini"
let feedCacheBySku = null

function normalizeText(value) {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function normalizeHtml(value) {
  return normalizeText(value).replace(/\r\n/g, "\n")
}

function stripTags(value) {
  return normalizeText(value).replace(/<[^>]*>/g, " ")
}

function getSellingPointFromRow(row, index) {
  const direct = normalizeText(row[`selling_point_${index}`])
  if (direct) return direct
  if (Array.isArray(row.selling_points) && row.selling_points[index - 1]) {
    return normalizeText(row.selling_points[index - 1])
  }
  return ""
}

function englishScore(product) {
  const text = stripTags(`${product.title} ${product.description} ${product.product_type}`).toLowerCase()
  const hints = [
    "with",
    "for",
    "and",
    "inch",
    "stainless",
    "steel",
    "black",
    "white",
    "machine",
    "table",
    "stand",
    "rack",
    "kit",
    "wheel",
    "adjustable",
    "commercial",
    "electric",
    "portable",
    "heavy-duty",
    "aluminum",
  ]

  let score = 0
  for (const hint of hints) {
    if (text.includes(hint)) score += 1
  }

  if (!/[õäöü]/i.test(text)) score += 1
  if (/^[\x00-\x7F\s]+$/.test(text)) score += 1
  if (text.includes("vevor")) score += 0.5

  return score
}

function estonianScore(text) {
  const normalized = ` ${stripTags(text).toLowerCase()} `
  const hints = [
    " ja ",
    " koos ",
    " jaoks ",
    " reguleeritav ",
    " tugev ",
    " vastupidav ",
    " kõrgus ",
    " laius ",
    " alus ",
    " pesumasina ",
    " kandevõime ",
    " sobib ",
    " komplekt ",
    " lihtne ",
    " mugav ",
    " terasest ",
    " must ",
    " valge ",
    " sinine ",
    " hõbedane ",
    " roolialus ",
    " seebilõikur ",
  ]

  let score = /[õäöü]/i.test(normalized) ? 2 : 0
  for (const hint of hints) {
    if (normalized.includes(hint)) score += 1
  }
  return score
}

function isLikelyEnglishText(text) {
  return normalizeText(text) !== "" && englishScore({ title: text, description: "", product_type: "" }) >= 2
}

function isLikelyEstonianText(text) {
  return normalizeText(text) !== "" && estonianScore(text) >= 2
}

function loadFeedCacheBySku() {
  if (feedCacheBySku !== null) return feedCacheBySku

  if (!existsSync(FEED_CACHE_PATH)) {
    feedCacheBySku = new Map()
    return feedCacheBySku
  }

  const raw = JSON.parse(readFileSync(FEED_CACHE_PATH, "utf8"))
  feedCacheBySku = new Map(Object.entries(raw.bySku || {}))
  return feedCacheBySku
}

function getFeedEntry(sku) {
  if (!normalizeText(sku)) return null
  return loadFeedCacheBySku().get(normalizeText(sku)) || null
}

function resolveOriginalField(currentValue, feedValue) {
  const current = normalizeHtml(currentValue)
  const feed = normalizeHtml(feedValue)

  if (!current) return feed
  if (!feed) return current
  if (isLikelyEstonianText(current) && isLikelyEnglishText(feed)) return feed
  return current
}

function translationArraySchema() {
  return {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "sku",
        "title_et",
        "description_et",
        "selling_point_1_et",
        "selling_point_2_et",
        "selling_point_3_et",
        "selling_point_4_et",
        "selling_point_5_et",
      ],
      properties: {
        id: { type: "string" },
        sku: { type: "string" },
        title_et: { type: "string" },
        description_et: { type: "string" },
        selling_point_1_et: { type: "string" },
        selling_point_2_et: { type: "string" },
        selling_point_3_et: { type: "string" },
        selling_point_4_et: { type: "string" },
        selling_point_5_et: { type: "string" },
      },
    },
  }
}

function codexResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["translations"],
    properties: {
      translations: translationArraySchema(),
    },
  }
}

function makePrompt(chunk) {
  return [
    "Tõlgi järgmised VEVOR tooted inglise keelest eesti keelde.",
    "",
    "Tõlkereeglid:",
    "- VEVOR brändinimi jääb alati muutmata.",
    "- Title peab olema loomulik eestikeelne tootenimi, mitte sõnasõnaline tõlge.",
    "- Säilita tehnilised numbrid, mõõdud, võimsused ja mudelitähised.",
    "- Kui tollimõõt pealkirjas kõlab eesti keeles kohmakalt, teisenda see sentimeetriteks.",
    "- Description peab olema informatiivne ja müüv. HTML märgendid säilita, kui need on olemas.",
    "- Selling point formaat säilita kujul 'Pealkiri: selgitus'. Kui lähteväärtust ei ole, tagasta tühi string.",
    "- Kasuta loomulikke eestikeelseid termineid, mida klient päriselt otsiks.",
    "",
    "Standardterminid:",
    "- Meat Grinder -> Hakklihamasin",
    "- Food Dehydrator -> Toidukuivati",
    "- Work Table -> Töölaud",
    "- Air Heater -> Õhksoojendaja",
    "- Pressure Washer -> Survepesur",
    "- Hydraulic Jack -> Hüdrauliline tungraud",
    "- Welding Machine -> Keevitusaparaat",
    "- Chainsaw -> Kettsaag",
    "",
    'Vasta ainult kehtiva JSON objektina kujul {"translations":[...]} ilma lisaselgitusteta.',
    JSON.stringify(chunk, null, 2),
  ].join("\n")
}

function validateChunkTranslations(sourceChunk, translatedChunk) {
  if (!Array.isArray(translatedChunk)) {
    throw new Error("Tõlkevastus ei olnud JSON massiiv")
  }

  if (translatedChunk.length !== sourceChunk.length) {
    throw new Error(`Oodatud ${sourceChunk.length} tõlget, saadi ${translatedChunk.length}`)
  }

  const expectedKeys = new Set(sourceChunk.map((item) => `${item.id}::${item.sku}`))
  const seenKeys = new Set()

  for (const item of translatedChunk) {
    const compoundKey = `${item?.id || ""}::${item?.sku || ""}`
    if (!item || !expectedKeys.has(compoundKey)) {
      throw new Error(`Tundmatu või puuduva id/sku-ga kirje: ${JSON.stringify(item)}`)
    }
    if (seenKeys.has(compoundKey)) {
      throw new Error(`Dubleeritud id/sku tõlgetes: ${compoundKey}`)
    }
    seenKeys.add(compoundKey)

    if (!normalizeText(item.title_et)) {
      throw new Error(`Puuduv või tühi title_et kirjel ${compoundKey}`)
    }

    const source = sourceChunk.find((row) => `${row.id}::${row.sku}` === compoundKey)
    if (normalizeText(source?.description) && !normalizeText(item.description_et)) {
      throw new Error(`Puuduv description_et kirjel ${compoundKey}`)
    }

    for (let index = 1; index <= 5; index++) {
      const translatedKey = `selling_point_${index}_et`
      const sourceKey = `selling_point_${index}`
      if (typeof item[translatedKey] !== "string") {
        throw new Error(`Puuduv või vigane väli ${translatedKey} kirjel ${compoundKey}`)
      }
      if (normalizeText(source?.[sourceKey]) && !normalizeText(item[translatedKey])) {
        throw new Error(`Puuduv ${translatedKey} kirjel ${compoundKey}`)
      }
    }
  }
}

function mergeSourceAndTranslation(sourceChunk, translatedChunk) {
  const byKey = new Map(translatedChunk.map((item) => [`${item.id}::${item.sku}`, item]))
  return sourceChunk.map((source) => {
    const translated = byKey.get(`${source.id}::${source.sku}`)
    return {
      id: source.id,
      sku: source.sku,
      product_type: source.product_type,
      original_title: source.title,
      title_et: translated.title_et.trim(),
      original_description: source.description,
      description_et: translated.description_et.trim(),
      original_selling_point_1: source.selling_point_1,
      selling_point_1_et: translated.selling_point_1_et.trim(),
      original_selling_point_2: source.selling_point_2,
      selling_point_2_et: translated.selling_point_2_et.trim(),
      original_selling_point_3: source.selling_point_3,
      selling_point_3_et: translated.selling_point_3_et.trim(),
      original_selling_point_4: source.selling_point_4,
      selling_point_4_et: translated.selling_point_4_et.trim(),
      original_selling_point_5: source.selling_point_5,
      selling_point_5_et: translated.selling_point_5_et.trim(),
    }
  })
}

function extractResponseText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text
  }

  const texts = []
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        texts.push(content.text)
      }
      if (content.type === "refusal" && typeof content.refusal === "string") {
        throw new Error(`OpenAI keeldus tõlkest: ${content.refusal}`)
      }
    }
  }

  return texts.join("\n").trim()
}

async function runOpenAiTranslation(chunk) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY puudub")
  }

  const prompt = makePrompt(chunk)
  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "translation_batch",
          strict: true,
          schema: codexResponseSchema(),
        },
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI Responses API ${response.status}: ${body.slice(0, 400)}`)
  }

  const data = await response.json()
  const rawText = extractResponseText(data)
  if (!rawText) {
    throw new Error("OpenAI vastusest ei leitud struktureeritud sisu")
  }

  const parsed = JSON.parse(rawText)
  if (!parsed || !Array.isArray(parsed.translations)) {
    throw new Error("OpenAI vastus ei sisaldanud translations massiivi")
  }

  return parsed.translations
}

function parseCodexTranslationFile(outputFile) {
  if (!existsSync(outputFile)) {
    throw new Error("Codex ei loonud väljundfaili")
  }

  const parsed = JSON.parse(readFileSync(outputFile, "utf8"))
  if (!parsed || !Array.isArray(parsed.translations)) {
    throw new Error("Codex väljund ei sisaldanud translations massiivi")
  }

  return parsed.translations
}

function runCodexTranslation(chunk) {
  const workspace = path.resolve(__dirname, "../../..")
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const outputFile = path.join(tmpdir(), `xlm-codex-translation-${stamp}.json`)
  const schemaFile = path.join(tmpdir(), `xlm-codex-schema-${stamp}.json`)
  const prompt = makePrompt(chunk)

  try {
    writeFileSync(schemaFile, JSON.stringify(codexResponseSchema(), null, 2), "utf8")

    execFileSync(
      "codex",
      [
        "exec",
        "-C",
        workspace,
        "--skip-git-repo-check",
        "--dangerously-bypass-approvals-and-sandbox",
        "-m",
        OPENAI_MODEL,
        "--output-schema",
        schemaFile,
        "-o",
        outputFile,
        "-",
      ],
      {
        input: prompt,
        encoding: "utf8",
        timeout: 10 * 60 * 1000,
        maxBuffer: 20 * 1024 * 1024,
        shell: process.platform === "win32",
      }
    )

    return parseCodexTranslationFile(outputFile)
  } finally {
    try { unlinkSync(outputFile) } catch {}
    try { unlinkSync(schemaFile) } catch {}
  }
}

async function runTranslation(chunk) {
  if (OPENAI_API_KEY) {
    return runOpenAiTranslation(chunk)
  }
  return runCodexTranslation(chunk)
}

function sortProducts(products) {
  return [...products].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.product_type !== b.product_type) return a.product_type.localeCompare(b.product_type)
    return a.title.localeCompare(b.title)
  })
}

function buildChunks(products) {
  const groups = new Map()

  for (const product of products) {
    const key = product.product_type || "Muu"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(product)
  }

  const chunks = []
  for (const groupKey of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
    const groupProducts = groups.get(groupKey)
    for (let index = 0; index < groupProducts.length; index += CHUNK_SIZE) {
      chunks.push(groupProducts.slice(index, index + CHUNK_SIZE))
    }
  }

  return chunks
}

async function loadProducts(client) {
  const { rows } = await client.query(
    `
      SELECT
        id,
        COALESCE(metadata->>'vevor_sku', '') AS sku,
        title,
        COALESCE(description, '') AS description,
        COALESCE(metadata->>'vevor_product_type', '') AS product_type,
        metadata->>'selling_point_1' AS selling_point_1,
        metadata->>'selling_point_2' AS selling_point_2,
        metadata->>'selling_point_3' AS selling_point_3,
        metadata->>'selling_point_4' AS selling_point_4,
        metadata->>'selling_point_5' AS selling_point_5,
        metadata->'selling_points' AS selling_points
      FROM product
      WHERE deleted_at IS NULL
        AND (
          COALESCE((metadata->>'translated')::boolean, false) = false
          OR NOT (metadata ? 'original_title')
          OR NOT (metadata ? 'original_description')
        )
      ORDER BY COALESCE(metadata->>'vevor_product_type', ''), title
      LIMIT $1
      OFFSET $2
    `,
    [POOL_LIMIT, OFFSET]
  )

  return sortProducts(rows.map((row) => {
    const sku = normalizeText(row.sku)
    const feedEntry = getFeedEntry(sku)
    const sourceTitle = resolveOriginalField(row.title, feedEntry?.title)
    const sourceDescription = resolveOriginalField(row.description, feedEntry?.descriptionText)
    const sellingPoints = {}

    for (let index = 1; index <= 5; index++) {
      sellingPoints[`selling_point_${index}`] = resolveOriginalField(
        getSellingPointFromRow(row, index),
        feedEntry?.sellingPoints?.[index - 1]
      )
    }

    return {
      id: row.id,
      sku,
      title: sourceTitle,
      description: sourceDescription,
      product_type: normalizeText(row.product_type),
      ...sellingPoints,
      score: englishScore({
        title: sourceTitle,
        description: sourceDescription,
        product_type: row.product_type || "",
      }),
    }
  })).slice(0, LIMIT)
}

function loadProductsFromFeedCache() {
  const raw = JSON.parse(readFileSync(FEED_CACHE_PATH, "utf8"))
  const rows = Object.values(raw.bySku || {})

  return sortProducts(rows.map((row) => ({
    id: "",
    sku: normalizeText(row.sku),
    title: normalizeText(row.title),
    description: normalizeHtml(row.descriptionText),
    product_type: normalizeText(row.productType),
    selling_point_1: normalizeText(row.sellingPoints?.[0]),
    selling_point_2: normalizeText(row.sellingPoints?.[1]),
    selling_point_3: normalizeText(row.sellingPoints?.[2]),
    selling_point_4: normalizeText(row.sellingPoints?.[3]),
    selling_point_5: normalizeText(row.sellingPoints?.[4]),
    score: englishScore({
      title: row.title || "",
      description: row.descriptionText || "",
      product_type: row.productType || "",
    }),
  }))).slice(0, LIMIT)
}

async function main() {
  if (!Number.isFinite(LIMIT) || LIMIT <= 0) {
    throw new Error("--limit peab olema positiivne arv")
  }
  if (!Number.isFinite(CHUNK_SIZE) || CHUNK_SIZE <= 0) {
    throw new Error("--chunk-size peab olema positiivne arv")
  }

  let client = null

  try {
    const products = SOURCE === "feed-cache"
      ? loadProductsFromFeedCache()
      : await (async () => {
        client = new Client({ connectionString: DB_URL })
        await client.connect()
        return loadProducts(client)
      })()

    if (products.length === 0) {
      console.log("✅ Sobivaid tooteid batchi jaoks ei leitud")
      return
    }

    const chunks = buildChunks(products)

    console.log(`📦 Valitud ${products.length} toodet batchi ${BATCH_ID}`)
    console.log(`📁 Väljund: ${OUTPUT_FILE}`)
    console.log(`🧩 Chunks: ${chunks.length}`)

    const preview = products.slice(0, Math.min(products.length, 5)).map((item) => ({
      id: item.id,
      sku: item.sku,
      title: item.title,
      product_type: item.product_type,
      score: item.score,
    }))
    console.log(JSON.stringify(preview, null, 2))

    if (DRY_RUN) return

    const mergedTranslations = []
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index].map((item) => ({
        id: item.id,
        sku: item.sku,
        title: item.title,
        description: item.description,
        product_type: item.product_type,
        selling_point_1: item.selling_point_1,
        selling_point_2: item.selling_point_2,
        selling_point_3: item.selling_point_3,
        selling_point_4: item.selling_point_4,
        selling_point_5: item.selling_point_5,
      }))

      console.log(`🔄 Tõlgin chunk ${index + 1}/${chunks.length} (${chunk.length} toodet)`)
      const translatedChunk = await runTranslation(chunk)
      validateChunkTranslations(chunk, translatedChunk)
      mergedTranslations.push(...mergeSourceAndTranslation(chunk, translatedChunk))
    }

    mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
    writeFileSync(OUTPUT_FILE, JSON.stringify(mergedTranslations, null, 2) + "\n", "utf8")
    console.log(`✅ Batch kirjutatud faili ${OUTPUT_FILE}`)
  } finally {
    if (client) await client.end()
  }
}

main().catch((error) => {
  console.error("❌", error.message)
  process.exit(1)
})
