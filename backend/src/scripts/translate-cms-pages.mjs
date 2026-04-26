#!/usr/bin/env node
/**
 * Translate CMS pages EN → ET via `claude -p`.
 *
 * For each page in cms_page WHERE locale='en':
 *   1. Send EN content JSON to claude
 *   2. Claude returns ET version with EXACT SAME schema/keys/structure
 *   3. Validate (must be parseable JSON, same top-level shape)
 *   4. Insert new row WHERE locale='et', id=<key>-et
 *   5. Write revision
 *
 * Usage: node src/scripts/translate-cms-pages.mjs [--page homepage] [--dry-run]
 */
import pg from "pg"
import { execFile } from "child_process"
import { readFileSync, writeFileSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const getArg = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const hasFlag = (name) => args.includes(name)

const SINGLE_PAGE = getArg("--page", null)
const DRY_RUN = hasFlag("--dry-run")
const TARGET_LOCALE = getArg("--locale", "et")
const CLAUDE_BIN = "/usr/bin/claude"
const MODEL = getArg("--model", "sonnet")

const ROOT = path.resolve(__dirname, "../../..")
try {
  for (const line of readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
} catch { /* env may already be set */ }

const PG_PASSWORD = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD
if (!PG_PASSWORD) {
  console.error("FATAL: POSTGRES_PASSWORD not set in environment")
  process.exit(1)
}

const DB_URL = `postgres://xlmarket:${PG_PASSWORD}@localhost:5435/xlmarket`

const LOG_DIR = path.resolve(__dirname, "../../data/translation-batches")
mkdirSync(LOG_DIR, { recursive: true })
const LOG_FILE = path.join(LOG_DIR, `cms-translate-${TARGET_LOCALE}.log`)

function log(msg) {
  const line = `[${new Date().toISOString()}] [CMS-T] ${msg}`
  console.log(line)
  try { writeFileSync(LOG_FILE, line + "\n", { flag: "a" }) } catch {}
}

const LOCALE_NAMES = {
  et: "Estonian",
  es: "Spanish",
  de: "German",
  fr: "French",
  ru: "Russian",
}

const PROMPT_HEADER = (locale, title) => `You are translating XLMarket CMS page content from English to ${LOCALE_NAMES[locale] || locale}.

Page: ${title}

CRITICAL RULES:
- Return ONLY valid JSON with EXACTLY the same structure (same keys, same nesting, same array lengths) as input.
- Translate ONLY string values that are user-facing prose (titles, taglines, descriptions, labels, paragraphs, list items).
- DO NOT translate:
  * URLs, hrefs, paths starting with /
  * IDs, slugs, keys, file paths, image paths
  * Brand names: VEVOR, XLMarket, Montonio, AI, B2B, HoReCa
  * Technical identifiers (badge codes like "DEAL", "HOT")
  * Numbers, prices, dates
  * HTML tags within markdown body_md (translate only visible text between tags)
- Estonian style: professional, helpful, natural. Avoid awkward direct translations. Use Estonian e-commerce conventions.
- Currency stays EUR/€, numbers stay as-is.
- For markdown body_md fields: translate the prose, keep markdown syntax (#, **, -, ![alt](url)) intact.
- Return ONLY the JSON object. No markdown fences, no commentary, no explanations.

EN content:
`

function callClaude(prompt, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      CLAUDE_BIN,
      [
        "-p",
        "--output-format", "text",
        "--model", MODEL,
        "--fallback-model", "haiku",
        "--no-session-persistence",
        "--disable-slash-commands",
        "--dangerously-skip-permissions",
      ],
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`claude error: ${err.message}\n${stderr}`))
        resolve(stdout)
      }
    )
    child.stdin.end(prompt)
  })
}

function stripFences(s) {
  let out = s.trim()
  out = out.replace(/^```(?:json)?\s*\n?/, "")
  out = out.replace(/\n?```\s*$/, "")
  return out.trim()
}

function shapesMatch(a, b) {
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!shapesMatch(a[i], b[i])) return false
    }
    return true
  }
  if (typeof a === "object") {
    const ak = Object.keys(a).sort()
    const bk = Object.keys(b).sort()
    if (ak.length !== bk.length) return false
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i]) return false
      if (!shapesMatch(a[ak[i]], b[bk[i]])) return false
    }
    return true
  }
  return true
}

async function translateOne(client, page) {
  const t0 = Date.now()
  log(`-> ${page.page_key}: starting (${page.bytes} bytes EN)`)

  const enContent = typeof page.content === "string" ? JSON.parse(page.content) : page.content
  const prompt = PROMPT_HEADER(TARGET_LOCALE, page.title) + JSON.stringify(enContent, null, 2)

  let raw
  try {
    raw = await callClaude(prompt)
  } catch (e) {
    log(`!! ${page.page_key}: claude call FAILED: ${e.message.slice(0, 200)}`)
    return { ok: false, reason: "claude_error", error: e.message }
  }

  const cleaned = stripFences(raw)
  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    log(`!! ${page.page_key}: JSON parse FAILED: ${e.message}`)
    log(`   first 200 chars: ${cleaned.slice(0, 200)}`)
    return { ok: false, reason: "json_parse_error", raw: cleaned.slice(0, 500) }
  }

  if (!shapesMatch(enContent, parsed)) {
    log(`!! ${page.page_key}: schema MISMATCH — keys/structure differ`)
    return { ok: false, reason: "schema_mismatch" }
  }

  if (DRY_RUN) {
    log(`✓ ${page.page_key}: DRY-RUN passed (${Date.now() - t0}ms)`)
    return { ok: true, content: parsed, dryRun: true }
  }

  const rowId = `${page.page_key}-${TARGET_LOCALE}`
  await client.query("BEGIN")
  try {
    const upsert = await client.query(
      `INSERT INTO cms_page (id, page_key, locale, title, content, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'cms-translator')
       ON CONFLICT (page_key, locale) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         updated_at = NOW(),
         updated_by = 'cms-translator'
       RETURNING id`,
      [rowId, page.page_key, TARGET_LOCALE, page.title, JSON.stringify(parsed)]
    )
    await client.query(
      `INSERT INTO cms_page_revision (page_id, locale, content, created_by, note)
       VALUES ($1, $2, $3, 'cms-translator', $4)`,
      [upsert.rows[0].id, TARGET_LOCALE, JSON.stringify(parsed), `Initial ${TARGET_LOCALE} translation from EN`]
    )
    await client.query("COMMIT")
  } catch (e) {
    await client.query("ROLLBACK")
    log(`!! ${page.page_key}: DB write FAILED: ${e.message}`)
    return { ok: false, reason: "db_error", error: e.message }
  }

  log(`✓ ${page.page_key}: saved as ${rowId} (${Date.now() - t0}ms)`)
  return { ok: true, content: parsed }
}

async function main() {
  const client = new pg.Client({ connectionString: DB_URL })
  await client.connect()

  const where = SINGLE_PAGE
    ? "WHERE locale='en' AND page_key=$1"
    : "WHERE locale='en'"
  const params = SINGLE_PAGE ? [SINGLE_PAGE] : []
  const rs = await client.query(
    `SELECT page_key, title, content, length(content::text) AS bytes
     FROM cms_page ${where}
     ORDER BY page_key`,
    params
  )

  log(`START: ${rs.rows.length} pages, target=${TARGET_LOCALE}, model=${MODEL}, dry-run=${DRY_RUN}`)

  let ok = 0
  let fail = 0
  for (const page of rs.rows) {
    const r = await translateOne(client, page)
    if (r.ok) ok++
    else fail++
  }

  log(`DONE: ${ok} ok, ${fail} failed`)
  await client.end()
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(2)
})
