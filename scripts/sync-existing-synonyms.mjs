#!/usr/bin/env node
/**
 * Sync existing product_synonym rows to MeiliSearch as `synonyms` setting.
 * Builds a word→[synonyms] map from DB, pushes to Meili.
 *
 * Meili synonyms bidirectional: "a" → ["b", "c"] means a==b==c at query time.
 */
import pg from "pg"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

// Load .env
try {
  const ROOT = "/home/brrr/brrr-xlmarket"
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
} catch {}

const MEILI = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_API_KEY || process.env.MEILISEARCH_KEY

const { Client } = pg
const db = new Client({
  host: process.env.PGHOST || "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD,
  database: "xlmarket",
})

await db.connect()
const { rows } = await db.query(
  "SELECT word, synonyms FROM product_synonym WHERE synonyms IS NOT NULL AND array_length(synonyms, 1) > 0"
)
await db.end()

console.log(`Loaded ${rows.length} synonym rows from DB`)

// Build word → Set(synonyms) map, combining across products
const wordMap = new Map()
for (const row of rows) {
  const key = row.word.toLowerCase().trim()
  if (!key) continue
  if (!wordMap.has(key)) wordMap.set(key, new Set())
  for (const syn of row.synonyms) {
    const s = syn.toLowerCase().trim()
    if (s && s !== key) wordMap.get(key).add(s)
  }
}

// Meili synonyms format: { word: [syn1, syn2, ...] }
const meiliSynonyms = {}
for (const [word, syns] of wordMap.entries()) {
  if (syns.size === 0) continue
  meiliSynonyms[word] = [...syns]
}

console.log(`Building synonym map: ${Object.keys(meiliSynonyms).length} words`)
console.log(`Sample:`, Object.entries(meiliSynonyms).slice(0, 3))

// Push to Meili
const res = await fetch(`${MEILI}/indexes/products/settings/synonyms`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${MEILI_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify(meiliSynonyms),
})
const body = await res.json()
console.log(`Meili response: uid=${body.taskUid} status=${body.status}`)

// Poll task
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 2000))
  const t = await fetch(`${MEILI}/tasks/${body.taskUid}`, {
    headers: { Authorization: `Bearer ${MEILI_KEY}` },
  }).then((r) => r.json())
  if (t.status === "succeeded") { console.log(`✓ Synonyms synced (${i * 2}s)`); break }
  if (t.status === "failed") {
    console.error(`✗ Failed: ${t.error?.message}`)
    process.exit(1)
  }
}
