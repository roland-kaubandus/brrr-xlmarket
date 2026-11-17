#!/usr/bin/env node
/**
 * launch-qa-crawl.mjs — LAUNCH-QA Playwright läbikäik (READ-ONLY, staging.xlmarket.ee).
 *
 * Kaks režiimi:
 *   --kind categories : KÕIK v4-kategooriad (1971: 25 L1 / 225 L2 / 1721 L3), mõlemad locale (et,en).
 *                       Kontroll: HTTP-staatus · konsooli-vead · katkised pildid · alam-kaardid/tootevõre.
 *   --kind products   : --sample N juhuslikku toodet, mõlemad locale.
 *                       Kontroll: staatus · hind nähtav · pilt · konsool + kogub ET/EN nähtava teksti
 *                       (pealkiri+kirjeldus) → LLM keelesegaduse-kontroll (eraldi samm, vt launch-qa-lang.mjs).
 *
 * Väljund: NDJSON (rida-kaupa, osaline progress püsib) → --out fail. Kokkuvõte stdout.
 * EI muuda midagi (ainult GET brauseriga) → EI võta stack-lukku. Self-signed SSL → ignoreHTTPSErrors.
 *
 * KASUTUS:
 *   node scripts/launch-qa-crawl.mjs --kind categories --out /tmp/cat.ndjson [--locales et,en] [--concurrency 6] [--limit M]
 *   node scripts/launch-qa-crawl.mjs --kind products --sample 500 --out /tmp/prod.ndjson [--locales et,en]
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { createWriteStream, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "storefront/"));
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const KIND = argv("--kind", "categories");
const LOCALES = argv("--locales", "et,en").split(",").map((s) => s.trim()).filter(Boolean);
const CONC = +argv("--concurrency", "6") || 6;
const SAMPLE = +argv("--sample", "500") || 500;
const LIMIT = args.includes("--limit") ? +argv("--limit", "0") : 0;
const OUT = argv("--out", `/tmp/launch-qa-${KIND}.ndjson`);
const BASE = "https://staging.xlmarket.ee";

// --- sihtmärkide loend ---
function categoryHandles() {
  const t = JSON.parse(readFileSync(path.join(ROOT, "storefront/lib/category-tree.generated.json"), "utf8"));
  return Object.values(t.nodes).map((n) => ({ handle: n.handle, level: n.level, name_et: n.name_et, name_en: n.name_en }));
}
function productHandles(n) {
  let DB = "";
  try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
  if (!DB) throw new Error("db-k33g konteinerit ei leitud");
  const sql = `SELECT handle FROM product WHERE deleted_at IS NULL AND status='published' AND handle IS NOT NULL ORDER BY md5(id) LIMIT ${n};`;
  return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -f -`, { input: sql, encoding: "utf8" })
    .trim().split("\n").filter(Boolean).map((handle) => ({ handle }));
}

// --- ehita URL-ülesannete loend (handle × locale) ---
let items = KIND === "products" ? productHandles(SAMPLE) : categoryHandles();
if (LIMIT) items = items.slice(0, LIMIT);
const tasks = [];
for (const it of items) for (const loc of LOCALES) {
  const url = KIND === "products" ? `${BASE}/${loc}/toode/${it.handle}` : `${BASE}/${loc}/kategooriad/${it.handle}`;
  tasks.push({ ...it, loc, url });
}
console.error(`[launch-qa ${KIND}] ${items.length} sihtmärki × ${LOCALES.length} locale = ${tasks.length} lehte · conc=${CONC} · out=${OUT}`);

// --- üksiku lehe audit ---
async function auditPage(ctx, t) {
  const page = await ctx.newPage();
  const errs = [], failed = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + (e.message || "").slice(0, 100)));
  page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + (m.text() || "").slice(0, 120)); });
  page.on("response", (r) => { const s = r.status(); if (s >= 400) failed.push(`${s} ${r.request().resourceType()} ${r.url().slice(0, 90)}`); });
  const rec = { ...t };
  try {
    const resp = await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 25000 });
    rec.status = resp ? resp.status() : 0;
    await page.waitForLoadState("networkidle", { timeout: 7000 }).catch(() => {});
    const d = await page.evaluate(() => {
      const imgs = Array.from(document.images);
      const txt = (document.body.innerText || "");
      const priceRe = /\d[\d\s]*[,.]\d{2}\s*€|€\s*\d/;
      return {
        imgTotal: imgs.length,
        imgBroken: imgs.filter((e) => e.complete && e.naturalWidth === 0).length,
        prodLinks: document.querySelectorAll('a[href*="/toode/"]').length,
        catLinks: document.querySelectorAll('a[href*="/kategooriad/"]').length,
        hasPrice: priceRe.test(txt),
        h1: (document.querySelector("h1")?.innerText || "").slice(0, 120),
        // toote-QA jaoks: pealkiri + esimene kirjeldus-lõik (keelesegaduse-kontrolliks)
        sampleText: txt.replace(/\s+/g, " ").trim().slice(0, 600),
      };
    });
    Object.assign(rec, d);
  } catch (e) { rec.status = rec.status || 0; rec.error = (e.message || "").slice(0, 120); }
  // hea-loomulised: admin-session/whoami 401 (storefront kontrollib admin-login — 401 kui pole sisse logitud), favicon, source-map
  const BENIGN = /admin-session\/whoami|favicon|\.map\b/;
  rec.consoleErrs = errs.filter((e) => !BENIGN.test(e)).slice(0, 8);
  rec.failedResources = failed.filter((f) => !BENIGN.test(f)).slice(0, 8);
  await page.close();
  return rec;
}

// --- worker-pool ---
const out = createWriteStream(OUT, { flags: "w" });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
let idx = 0, done = 0;
const summary = { total: tasks.length, ok: 0, http4xx5xx: 0, loadErr: 0, consoleErr: 0, imgBroken: 0, noPrice: 0, emptyGrid: 0 };
async function worker() {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, userAgent: "xlm-launch-qa-bot" });
  while (idx < tasks.length) {
    const my = idx++;
    const rec = await auditPage(ctx, tasks[my]);
    out.write(JSON.stringify(rec) + "\n");
    done++;
    // kokkuvõte-loendurid
    if (rec.error) summary.loadErr++;
    else if (rec.status >= 400) summary.http4xx5xx++;
    else summary.ok++;
    if ((rec.consoleErrs || []).length) summary.consoleErr++;
    if (rec.imgBroken > 0) summary.imgBroken++;
    if (KIND === "products" && rec.status === 200 && !rec.hasPrice) summary.noPrice++;
    if (KIND === "categories" && rec.status === 200 && rec.level === 3 && rec.prodLinks === 0) summary.emptyGrid++;
    if (done % 100 === 0) console.error(`  [${done}/${tasks.length}] ok=${summary.ok} 4xx5xx=${summary.http4xx5xx} loadErr=${summary.loadErr} consoleErr=${summary.consoleErr}`);
  }
  await ctx.close();
}
await Promise.all(Array.from({ length: CONC }, worker));
await browser.close();
out.end();
console.error(`[launch-qa ${KIND}] VALMIS. Kokkuvõte:`);
console.log(JSON.stringify(summary, null, 1));
