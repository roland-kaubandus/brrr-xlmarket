#!/usr/bin/env node
/**
 * qa-lang-leak.mjs — NÄDALANE QA: kategooria-nime KEELE-LEKE (deterministlik, READ-ONLY).
 *
 * MIKS: regressioon 8291d480 (2026-04-20) kuvas ET-lehel INGLISEKEELSEID kategooria-nimesid.
 * S4-smoke lukustab ühe fikseeritud lehe; SEE kontroll valvab tervet pinda juhuvalimiga.
 *
 * MIDA: juhuslik valim (vaikimisi 30 kategooria-lehte + 20 tootelehte + avaleht), MÕLEMAD locale.
 *   - ET-leht: ükski EN kategooria-nimi ei tohi nähtaval olla
 *   - EN-leht: ükski ET kategooria-nimi ei tohi nähtaval olla
 *   Erand: kui name_et == name_en → nimi on mõlemas keeles sama, pole leke.
 *   Erand: kui kategoorial POLE name_et → ET-leht kuvab seaduslikult name_en (fallback) → EI leke.
 *
 * KUST nimed: ainult kategooria-nime-chrome — `a[href*="/kategooriad/"]` linkide tekst + (kat-lehel) H1.
 *   See on TÄPSUSE valik: kategooria-nimi lekeb just siin (karussell/breadcrumb/menüü/avaleht).
 *   Terve-lehe tekst võrdluseks tooks vale-positiive — bränd/ühik/mudel-märgend (nt "Type 2",
 *   "in", "VEVOR") võib juhuslikult kattuda mõne kategooria-nimega. (NB: ET tootesisu ISE on
 *   eesti keeles — kontrollitud 2026-11-23; skoop pole seotud tootesisu keelega.)
 *   Sobitus = TÄPNE (normaliseeritud, reavahe-kaupa) → ei lõika substringe.
 *
 * SSoT nimeloend: storefront/lib/category-tree.generated.json (name_en + name_et, sama mis DB-tuletus).
 * Väljund: reports/qa-lang-leak-<stamp>.md + viimane stdout-rida = masin-tulem (OK / FAIL ...).
 * Valikuline: --telegram saadab kokkuvõtte (env TELEGRAM_BOT_TOKEN/CHAT_ID). EI võta stack-lukku.
 *
 * KASUTUS: node scripts/qa-lang-leak.mjs [--cat 30] [--prod 20] [--conc 6] [--telegram]
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "storefront/"));
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CAT_N = +argv("--cat", "30") || 30;
const PROD_N = +argv("--prod", "20") || 20;
const CONC = +argv("--conc", "6") || 6;
const TELEGRAM = args.includes("--telegram");
const BASE = process.env.QA_SMOKE_URL || "https://staging.xlmarket.ee";

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

// --- SSoT nimeloend → lekke-keeldude kogumid ---
const tree = JSON.parse(readFileSync(path.join(ROOT, "storefront/lib/category-tree.generated.json"), "utf8"));
const nodes = Object.values(tree.nodes);
const untranslatedEn = new Set(); // name_en seaduslik ka ET-lehel (sõlmel pole name_et)
for (const n of nodes) { if (!norm(n.name_et)) untranslatedEn.add(norm(n.name_en)); }
const enLeak = new Map(); // norm(name_en) → originaal : KEELATUD ET-lehel
const etLeak = new Map(); // norm(name_et) → originaal : KEELATUD EN-lehel
for (const n of nodes) {
  const en = norm(n.name_en), et = norm(n.name_et);
  if (!et || et === en) continue;              // pole tõlget VÕI sama → erand
  if (!untranslatedEn.has(en)) enLeak.set(en, n.name_en); // ära keela, kui mõni tõlketa sõlm seda seaduslikult kuvab
  etLeak.set(et, n.name_et);
}
console.error(`[qa-lang-leak] keelud: ET-lehel ${enLeak.size} EN-nime · EN-lehel ${etLeak.size} ET-nime`);

// --- valim ---
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function productHandles(n) {
  let DB = "";
  try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
  if (!DB) { console.error("  [valim] db-k33g puudub → jätan tootelehed vahele"); return []; }
  const sql = `SELECT handle FROM product WHERE deleted_at IS NULL AND status='published' AND handle IS NOT NULL ORDER BY md5(id||'${Date.now()}') LIMIT ${n};`;
  try {
    return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -f -`, { input: sql, encoding: "utf8" })
      .trim().split("\n").filter(Boolean);
  } catch (e) { console.error("  [valim] toote-päring kukkus: " + e.message.slice(0, 80)); return []; }
}
const catSample = shuffle(nodes.slice()).slice(0, CAT_N).map((n) => n.handle);
const prodSample = productHandles(PROD_N);

const tasks = [];
for (const loc of ["et", "en"]) {
  for (const h of catSample) tasks.push({ loc, kind: "cat", url: `${BASE}/${loc}/kategooriad/${h}`, handle: h });
  for (const h of prodSample) tasks.push({ loc, kind: "prod", url: `${BASE}/${loc}/toode/${h}`, handle: h });
  tasks.push({ loc, kind: "home", url: `${BASE}/${loc}`, handle: "(avaleht)" });
}
console.error(`[qa-lang-leak] ${catSample.length} kat + ${prodSample.length} toodet + avaleht × 2 locale = ${tasks.length} lehte · conc=${CONC}`);

// --- üksiku lehe kontroll ---
async function checkPage(ctx, t) {
  const forbidden = t.loc === "et" ? enLeak : etLeak;
  const page = await ctx.newPage();
  const hits = [];
  try {
    const resp = await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 25000 });
    const status = resp ? resp.status() : 0;
    if (status !== 200) { await page.close(); return { ...t, status, hits: [] }; }
    await page.waitForLoadState("networkidle", { timeout: 7000 }).catch(() => {});
    const labels = await page.evaluate((kind) => {
      const out = [];
      document.querySelectorAll('a[href*="/kategooriad/"]').forEach((a) => out.push(a.innerText || ""));
      if (kind === "cat") { const h1 = document.querySelector("h1"); if (h1) out.push(h1.innerText || ""); }
      return out;
    }, t.kind);
    const seen = new Set();
    for (const raw of labels) {
      for (const line of String(raw).split("\n")) {
        const nl = norm(line);
        if (!nl || seen.has(nl)) continue; seen.add(nl);
        if (forbidden.has(nl)) hits.push(forbidden.get(nl));
      }
    }
    await page.close();
    return { ...t, status, hits: [...new Set(hits)] };
  } catch (e) { await page.close().catch(() => {}); return { ...t, status: 0, error: (e.message || "").slice(0, 100), hits: [] }; }
}

// --- worker-pool ---
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
let idx = 0; const results = [];
async function worker() {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, userAgent: "xlm-qa-lang-leak" });
  while (idx < tasks.length) { const r = await checkPage(ctx, tasks[idx++]); results.push(r); }
  await ctx.close();
}
await Promise.all(Array.from({ length: CONC }, worker));
await browser.close();

// --- raport ---
const leaks = results.filter((r) => r.hits.length);
const errs = results.filter((r) => r.error || r.status !== 200);
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const lines = [
  "# QA — kategooria-nime keele-leke\n",
  `**${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${BASE}**\n`,
  `Valim: ${catSample.length} kategooriat + ${prodSample.length} toodet + avaleht × ET/EN = ${tasks.length} lehte.`,
  `Keelud: ET-lehel ${enLeak.size} EN-nime · EN-lehel ${etLeak.size} ET-nime (erand: name_et==name_en või tõlget pole).\n`,
  `**Lekkeid: ${leaks.length}** · laadimis-vigu: ${errs.length}\n`,
];
if (leaks.length) {
  lines.push("| locale | tüüp | leht | lekkinud (vale-keelne) nimi |", "|---|---|---|---|");
  for (const l of leaks) lines.push(`| ${l.loc} | ${l.kind} | ${l.url.replace(BASE, "")} | ${l.hits.join(", ")} |`);
}
if (errs.length) {
  lines.push("\n## Laadimis-probleemid (ei loe lekkeks)", "| locale | leht | staatus/viga |", "|---|---|---|");
  for (const e of errs.slice(0, 20)) lines.push(`| ${e.loc} | ${e.url.replace(BASE, "")} | ${e.error || e.status} |`);
}
const REPORT = path.join(ROOT, `reports/qa-lang-leak-${stamp}.md`);
try { writeFileSync(REPORT, lines.join("\n")); } catch {}

const resultLine = leaks.length
  ? `FAIL keele-leke: ${leaks.length} lehte (${[...new Set(leaks.flatMap((l) => l.hits))].slice(0, 5).join(", ")}…) — ${REPORT}`
  : `OK keele-leke: 0 (${tasks.length} lehte, ${errs.length} laadimis-viga)`;

if (TELEGRAM) {
  const TOK = process.env.TELEGRAM_BOT_TOKEN, CHAT = process.env.TELEGRAM_CHAT_ID;
  if (TOK && CHAT) {
    const icon = leaks.length ? "🔴" : "🟢";
    const msg = `${icon} QA keele-leke: ${leaks.length} lekkega lehte / ${tasks.length}\n` +
      (leaks.length ? leaks.slice(0, 8).map((l) => `• ${l.loc} ${l.url.replace(BASE, "")} → ${l.hits.join(", ")}`).join("\n") : "puhas") +
      `\nraport: ${REPORT}`;
    try {
      execSync(`curl -s -m 20 -X POST "https://api.telegram.org/bot${TOK}/sendMessage" --data-urlencode "chat_id=${CHAT}" --data-urlencode ${JSON.stringify("text=" + msg)} -o /dev/null`, { stdio: "ignore" });
    } catch {}
  }
}

console.error(`[qa-lang-leak] VALMIS. raport: ${REPORT}`);
console.log(resultLine);
process.exit(leaks.length ? 1 : 0);
