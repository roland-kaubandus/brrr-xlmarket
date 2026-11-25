#!/usr/bin/env node
/**
 * cms-fallback-drift.mjs — KONTROLL: git-fallback-JSON == LIVE DB cms_page sisu kõigil
 * legal-lehtedel (mõlemad keeled). REPORT-ONLY, EI kirjuta midagi.
 *
 * MIKS: storefront loeb CMS-i LIVE DB-st (getLegalPage võidab fallback'i üle). Fallback-JSON
 * on git-SSoT. Kui keegi muudab DB-d admin-CMS-ist, aga ei ekspordi fallback'i (või vastupidi
 * sünkimata), kaks allikat triivivad lahku → leht näitab üht, git teist. See juhtus §6 lisamisel
 * (2026-11-25: DB-s §6 live, fallback vana). See kontroll püüab triivi KINNI enne, kui kordub.
 *
 * VÕRDLUS: parsitud JSON deep-equal (kanooniline võtme-sort), MITTE bait-diff — fallback-failide
 * vorming (pretty vs compact) ei loe, loeb SISU.
 *
 * Väljund: viimane rida "OK ..." või "FAIL ..." (weekly-qa greppib esimest 2 tähte).
 * Exit 0 = kattub, 1 = triiv/viga.
 *
 * Kasutus:
 *   node scripts/cms-fallback-drift.mjs                 # kõik legal-* lehed
 *   node scripts/cms-fallback-drift.mjs --pages=legal-privacy,legal-terms
 *   MEDUSA_CONTAINER=medusa-k33g-… node scripts/cms-fallback-drift.mjs
 */
import { readFileSync, readdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const FALLBACK_DIR = join(__dirname, "..", "storefront", "lib", "cms-fallback")
const LOCALES = ["en", "et"]

const args = process.argv.slice(2)
const pagesArg = args.find((a) => a.startsWith("--pages="))

// Vaikimisi: kõik legal-* fallback-failidest tuletatud page_key'd.
let pages
if (pagesArg) {
  pages = pagesArg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean)
} else {
  const keys = new Set()
  for (const f of readdirSync(FALLBACK_DIR)) {
    const m = f.match(/^(legal-.+?)(?:\.([a-z]{2}))?\.json$/)
    if (m) keys.add(m[1])
  }
  pages = [...keys].sort()
}
if (pages.length === 0) { console.log("FAIL: ühtegi legal-lehte ei leitud fallback-kaustast"); process.exit(1) }

const CONTAINER =
  process.env.MEDUSA_CONTAINER ||
  execFileSync("bash", ["-lc", "docker ps --format '{{.Names}}' | grep '^medusa-k33g' | grep -v worker | head -1"])
    .toString()
    .trim()
if (!CONTAINER) { console.log("FAIL: medusa k33g konteinerit ei leitud"); process.exit(1) }

// Kanooniline JSON-stringistamine: võtmed sorditud rekursiivselt → vormingust sõltumatu võrdlus.
function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]"
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}"
  }
  return JSON.stringify(v)
}

// Lahenda iga (page, locale) fallback-fail (locale-spetsiifiline → baas).
const want = []
for (const key of pages) {
  for (const locale of LOCALES) {
    const localeFile = join(FALLBACK_DIR, `${key}.${locale}.json`)
    const baseFile = join(FALLBACK_DIR, `${key}.json`)
    let file
    try { readFileSync(localeFile); file = localeFile }
    catch { try { readFileSync(baseFile); file = baseFile } catch { file = null } }
    if (!file) { console.log(`FAIL: ${key}/${locale} — fallback-faili pole`); process.exit(1) }
    let content
    try { content = JSON.parse(readFileSync(file, "utf-8")) }
    catch (e) { console.log(`FAIL: ${key}/${locale} — fallback JSON parse: ${e.message}`); process.exit(1) }
    want.push({ page_key: key, locale, fallback: canon(content) })
  }
}

// Loe DB-sisu kanoonilise getPage'iga (modules/cms/db.js) — sama lugeja, mida storefront
// kasutab (HARD RULE #5). Require "/app/..." lahendab pg app'i node_modules'ist (mitte /tmp).
const RUNNER = `
const { getPage } = require("/app/src/modules/cms/db.js");
const fs = require("fs");
(async () => {
  const rows = JSON.parse(fs.readFileSync("/tmp/cms-drift-want.json", "utf-8"));
  const out = [];
  for (const r of rows) {
    const p = await getPage(r.page_key, r.locale);
    out.push({ page_key: r.page_key, locale: r.locale, db: p ? JSON.stringify(p.content) : null });
  }
  fs.writeFileSync("/tmp/cms-drift-db.json", JSON.stringify(out));
})().catch((e) => { console.error("RUNNER ERR", e.message); process.exit(1); });
`

import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
const dir = mkdtempSync(join(tmpdir(), "cms-drift-"))
const wantFile = join(dir, "cms-drift-want.json")
const runnerFile = join(dir, "cms-drift-runner.cjs")
writeFileSync(wantFile, JSON.stringify(want.map(({ fallback, ...r }) => r)))
writeFileSync(runnerFile, RUNNER)
execFileSync("docker", ["cp", wantFile, `${CONTAINER}:/tmp/cms-drift-want.json`], { stdio: "ignore" })
execFileSync("docker", ["cp", runnerFile, `${CONTAINER}:/tmp/cms-drift-runner.cjs`], { stdio: "ignore" })
execFileSync("docker", ["exec", CONTAINER, "node", "/tmp/cms-drift-runner.cjs"], { stdio: "inherit" })
const dbLocal = join(dir, "db.json")
execFileSync("docker", ["cp", `${CONTAINER}:/tmp/cms-drift-db.json`, dbLocal], { stdio: "ignore" })
try {
  execFileSync("docker", ["exec", "-u", "0", CONTAINER, "rm", "-f", "/tmp/cms-drift-want.json", "/tmp/cms-drift-runner.cjs", "/tmp/cms-drift-db.json"], { stdio: "ignore" })
} catch { /* best-effort */ }

const dbRows = JSON.parse(readFileSync(dbLocal, "utf-8"))
const byKey = new Map(dbRows.map((r) => [`${r.page_key}/${r.locale}`, r.db]))

const drift = []
for (const w of want) {
  const id = `${w.page_key}/${w.locale}`
  const dbText = byKey.get(id)
  if (dbText == null) { drift.push(`${id}: DB-s PUUDUB`); continue }
  let dbCanon
  try { dbCanon = canon(JSON.parse(dbText)) }
  catch (e) { drift.push(`${id}: DB JSON parse viga (${e.message})`); continue }
  if (dbCanon !== w.fallback) drift.push(`${id}: SISU LAHKNEB (fallback ≠ DB)`)
}

if (drift.length === 0) {
  console.log(`OK cms-drift: ${want.length} legal-lehte/keelt kattuvad (fallback == DB)`)
  process.exit(0)
} else {
  console.log(`FAIL cms-drift: ${drift.length} lahknevust — ${drift.join("; ")}`)
  process.exit(1)
}
