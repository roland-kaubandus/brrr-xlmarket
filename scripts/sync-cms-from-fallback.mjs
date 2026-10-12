#!/usr/bin/env node
/**
 * CMS SSoT sync: storefront/lib/cms-fallback/*.json → live Medusa cms_page.
 *
 * MIKS: storefront loeb CMS-i LIVE Medusa'st (getPage); live võidab fallback'i üle,
 * kui tagastab non-null. Seega git-tracked fallback-JSON-id (autoriteetne allikas)
 * peavad olema ka LIVE DB-s, muidu leht näitab vana seemnesisu (.eu, xlmarket.store,
 * tühi reg/KMKR). See skript lükkab fallback-sisu → DB, et mõlemad kattuksid.
 *
 * ALLIKAS = fail. page_key + locale tuletatakse failinimest:
 *   {key}.json        → locale "en"
 *   {key}.{locale}.json → see locale
 * Kui locale-spetsiifilist faili pole, kasutatakse {key}.json ka selle locale jaoks.
 *
 * KIRJUTAJA = kanooniline upsertPage (modules/cms/db.js) medusa-konteineris — sama
 * funktsioon, mida admin-CMS kasutab (HARD RULE #5: üks transform, mitu kutsujat) +
 * cms_page_revision audit-rida. updated_by = "cms-sync" (skript, MITTE inimene — HARD RULE #8).
 *
 * HARD RULE #9: --execute võtab stack-luku (DB-kirjutus). DRY (vaikimisi) EI lukusta.
 *
 * Kasutus:
 *   node scripts/sync-cms-from-fallback.mjs                 # DRY: näita plaan
 *   node scripts/sync-cms-from-fallback.mjs --execute       # kirjuta (about,contact,global)
 *   node scripts/sync-cms-from-fallback.mjs --pages=about,contact,global,legal-terms --execute
 *   node scripts/sync-cms-from-fallback.mjs --all --execute # kõik fallback-failid
 */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { execFileSync } from "node:child_process"
import { withStackLock } from "./lib/stack-lock.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const FALLBACK_DIR = join(__dirname, "..", "storefront", "lib", "cms-fallback")
const LOCALES = ["en", "et"]
const DEFAULT_PAGES = ["about", "contact", "global"]

const args = process.argv.slice(2)
const EXECUTE = args.includes("--execute")
const ALL = args.includes("--all")
const pagesArg = args.find((a) => a.startsWith("--pages="))
const CONTAINER =
  process.env.MEDUSA_CONTAINER ||
  execFileSync("bash", ["-lc", "docker ps --format '{{.Names}}' | grep '^medusa-k33g' | grep -v worker | head -1"])
    .toString()
    .trim()

if (!CONTAINER) {
  console.error("FATAL: medusa k33g konteinerit ei leitud (sea MEDUSA_CONTAINER=…)")
  process.exit(1)
}

// Millised page_key'd sünkida?
let pages
if (ALL) {
  const keys = new Set()
  for (const f of readdirSync(FALLBACK_DIR)) {
    const m = f.match(/^(.+?)(?:\.([a-z]{2}))?\.json$/)
    if (m) keys.add(m[1])
  }
  pages = [...keys].sort()
} else if (pagesArg) {
  pages = pagesArg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean)
} else {
  pages = DEFAULT_PAGES
}

// Koosta payload: iga (page, locale) → fail → {page_key, locale, title, content}
const payload = []
for (const key of pages) {
  for (const locale of LOCALES) {
    const localeFile = join(FALLBACK_DIR, `${key}.${locale}.json`)
    const baseFile = join(FALLBACK_DIR, `${key}.json`)
    let file, src
    try {
      readFileSync(localeFile); file = localeFile; src = `${key}.${locale}.json`
    } catch {
      try { readFileSync(baseFile); file = baseFile; src = `${key}.json` }
      catch { console.warn(`  ⚠️  ${key}/${locale}: fallback-faili pole, vahele`); continue }
    }
    const content = JSON.parse(readFileSync(file, "utf-8"))
    const title = content.title || key
    payload.push({ page_key: key, locale, title, content, src })
  }
}

if (payload.length === 0) { console.error("FATAL: midagi sünkida pole"); process.exit(1) }

console.log(`CMS sync → ${CONTAINER}`)
console.log(`Allikas: ${FALLBACK_DIR}`)
console.log(`Ridu: ${payload.length}${EXECUTE ? "  (EXECUTE)" : "  (DRY — lisa --execute)"}`)
for (const p of payload) {
  const preview = (p.content.body_md || p.content.slogan || JSON.stringify(p.content)).replace(/\s+/g, " ").slice(0, 60)
  console.log(`  ${p.page_key}/${p.locale}  ← ${p.src}  "${p.title}"  ${preview}…`)
}

if (!EXECUTE) { console.log("\nDRY — muudatusi ei tehtud."); process.exit(0) }

// In-container runner: loeb payload'i, kutsub kanoonilise upsertPage iga rea kohta.
const RUNNER = `
const fs = require("fs");
const { upsertPage, getPage } = require("/app/src/modules/cms/db.js");
(async () => {
  const rows = JSON.parse(fs.readFileSync("/tmp/cms-sync-payload.json", "utf-8"));
  let ok = 0;
  for (const r of rows) {
    await upsertPage(r.page_key, r.title, r.content, "cms-sync", r.locale);
    const back = await getPage(r.page_key, r.locale);
    const good = back && back.locale === r.locale;
    console.log((good ? "  ✓ " : "  ✗ ") + r.page_key + "/" + r.locale + " → row.locale=" + (back && back.locale));
    if (good) ok++;
  }
  console.log("upsert OK: " + ok + "/" + rows.length);
  if (ok !== rows.length) process.exit(1);
})().catch((e) => { console.error("RUNNER ERR", e.message); process.exit(1); });
`

await withStackLock({ holder: "sync-cms-from-fallback", waitMs: 60_000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "cms-sync-"))
  const payloadFile = join(dir, "cms-sync-payload.json")
  const runnerFile = join(dir, "cms-sync-runner.cjs")
  writeFileSync(payloadFile, JSON.stringify(payload.map(({ src, ...r }) => r)))
  writeFileSync(runnerFile, RUNNER)
  execFileSync("docker", ["cp", payloadFile, `${CONTAINER}:/tmp/cms-sync-payload.json`], { stdio: "inherit" })
  execFileSync("docker", ["cp", runnerFile, `${CONTAINER}:/tmp/cms-sync-runner.cjs`], { stdio: "inherit" })
  execFileSync("docker", ["exec", CONTAINER, "node", "/tmp/cms-sync-runner.cjs"], { stdio: "inherit" })
  // Koristus on best-effort: konteiner jookseb non-root kasutajana, docker cp'd failid on
  // root-omanduses → rm võib keelduda. See EI ole viga (järgmine jooks kirjutab üle).
  try {
    execFileSync("docker", ["exec", "-u", "0", CONTAINER, "rm", "-f", "/tmp/cms-sync-payload.json", "/tmp/cms-sync-runner.cjs"], { stdio: "ignore" })
  } catch { /* best-effort — jäta vahele */ }
})

console.log("\n✅ CMS sync valmis. ISR revalidate ~60s → leht värskeneb.")
