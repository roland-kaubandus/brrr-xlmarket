#!/usr/bin/env node
/*
 * grab-bag-judge.mjs — SEMANTILINE grab-bag detektor (LLM-judge, Claude Messages API).
 *
 * MIKS: keyword-heuristika (inv-taxonomy INV-GRAB-01 vana) andis recall 0% — grab-bagid
 * jagavad DOMINANTSET sõna (grill/desk/aquarium/cooking), mis maskeerib sekundaar-klastri.
 * Nime-signaal ("X ja Y") = 85% recall AGA 50% false-positive (805/1595). Ükski odav
 * heuristika ei tööta. LLM-judge (see skript): valideeritud recall ≈22/22 reaalsete
 * grab-bagide peal, ~2.5% FP juhuvalimis. Vt reports/detektor-valideerimine.md.
 *
 * PERIOODILINE (mitte iga-luku): ~30 API-kutset 1595 L3 peale. Jooksuta uue maini/feedi järel.
 *
 * KASUTUS:  ANTHROPIC_API_KEY=sk-... node scripts/grab-bag-judge.mjs [--min N] [--limit M] [--ids id1,id2]
 *   (võti .env-st: `set -a; . /path/.env; set +a; node scripts/grab-bag-judge.mjs ...`)
 *   --min N   : ainult L3-d ≥N tootega (vaikimisi 8; alla selle harva grab-bag)
 *   --limit M : ainult esimesed M L3 (test-jooks)
 *   --ids ... : AINULT loetletud L3-id (koma-eraldi) — odav sihitud test
 * Väljund: reports/grab-bag-judge-tulem.md + stdout kokkuvõte. EI muuda DB-d (ainult SELECT).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub. Kasuta: ANTHROPIC_API_KEY=sk-... node scripts/grab-bag-judge.mjs"); process.exit(2); }
const MODEL = "claude-opus-4-8";
const args = process.argv.slice(2);
const MIN = +(args[args.indexOf("--min") + 1]) || 8;
const LIMIT = args.includes("--limit") ? +(args[args.indexOf("--limit") + 1]) : 0;
const IDS = args.includes("--ids") ? args[args.indexOf("--ids") + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
const BATCH = 8;         // L3 per API-kutse
const SAMPLE = 24;       // title-näidist per L3

let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

// 1. L3-de loend (≥MIN toodet)
let rows = q(`SELECT l3.id, l3.name, (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) main,
  (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
  AND ${IDS ? `l3.id IN (${IDS.map((i) => `'${i.replace(/[^a-zA-Z0-9_]/g, "")}'`).join(",")})` : `(SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) >= ${MIN}`}
ORDER BY n DESC;`).split("\n").filter(Boolean).map((r) => { const [id, name, main, n] = r.split("\t"); return { id, name, main, n: +n }; });
if (LIMIT) rows = rows.slice(0, LIMIT);
console.error(`Hindan ${rows.length} L3 (≥${MIN} toodet), ${Math.ceil(rows.length / BATCH)} API-kutset...`);

// 2. title-näidised igale L3-le
for (const r of rows) {
  r.titles = q(`SELECT left(p.title,80) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
    WHERE pcp.product_category_id='${r.id}' ORDER BY p.title LIMIT ${SAMPLE};`).split("\n").filter(Boolean);
}

async function judgeBatch(batch) {
  const blocks = batch.map((r, i) => `### L3 #${i} — id=${r.id} — nimi="${r.name}" (${r.main}, ${r.n} toodet)\n${r.titles.join("\n")}`).join("\n\n");
  const prompt = `Oled taksonoomia-QA. Hinda IGA L3 SEMANTILISELT (loe title_en sisu, MITTE märksõna): kas GRAB-BAG (2+ selgelt ERI toote-tüüpi, kumbki ≥3 toodet või ≥15%) või CLEAN.

OTSUSTAV REEGEL — VARIANT vs ERI TÜÜP:
- VARIANT (= CLEAN, ÄRA flag'i): sama FUNKTSIOON, erineb ainult vorm/kinnitus/suurus/materjal. Nt lae- vs seinaventilaator (mõlemad liigutavad õhku) · pitsakivi vs pitsateras (mõlemad küpsetuspind) · kastrul vs stockpot (mõlemad keetmine). Ka: eri suurused/värvid = sama tüüp; nime-paar "X ja Y" kus mõlemad present JA sama funktsioon = CLEAN; üksik-outlier suures homogeenses = CLEAN.
- ERI TÜÜP (= GRAB, flag'i): FUNKTSIOON erineb. Nt õhuniisuti (lisab niiskust) vs jahuti (langetab temp) · kaminatööriist (tule-hooldus) vs tuhaämber (jäätmed) · pott (keetmine) vs küpsetusvorm (ahi) · seade vs kulumaterjal.

${blocks}

Vasta AINULT JSON-massiiviga, üks objekt per L3, järjekorras:
[{"id":"pcat_...","verdict":"GRAB"|"CLEAN","confidence":"korge"|"kesk"|"madal","clusters":"kui GRAB: klastrid+arvud + split-soovitus, muidu lühi-tüüp"}]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, thinking: { type: "adaptive" }, output_config: { effort: "low" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.usage) { USAGE.in += data.usage.input_tokens || 0; USAGE.out += data.usage.output_tokens || 0; }
  const txt = (data.content.find((b) => b.type === "text") || {}).text || "";
  const m = txt.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("JSON massiivi ei leitud vastusest: " + txt.slice(0, 200));
  return JSON.parse(m[0]);
}
const USAGE = { in: 0, out: 0 };

// 3. jooksuta batchidena
const out = [];
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  try {
    const verdicts = await judgeBatch(batch);
    for (const v of verdicts) {
      const r = rows.find((x) => x.id === v.id) || batch[verdicts.indexOf(v)];
      out.push({ ...r, verdict: v.verdict, confidence: v.confidence || "", clusters: v.clusters });
    }
    console.error(`  [${Math.min(i + BATCH, rows.length)}/${rows.length}]`);
  } catch (e) { console.error(`  batch ${i} VIGA: ${e.message}`); batch.forEach((r) => out.push({ ...r, verdict: "ERROR", confidence: "", clusters: e.message.slice(0, 80) })); }
}

// 4a. VERDIKT-CACHE + muutus-tuvastus (võrdle eelmise jooksuga)
const CACHE = "/opt/eumotors-tasks/reports/grab-verdiktid.json";
const stamp = new Date().toISOString().slice(0, 10);
let prev = {};
try { prev = JSON.parse(fs.readFileSync(CACHE, "utf8")).verdicts || {}; } catch {}
const changes = [];
const verdicts = {};
for (const r of out) {
  verdicts[r.id] = { name: r.name, main: r.main, n: r.n, verdict: r.verdict, confidence: r.confidence, clusters: r.clusters, date: stamp };
  const p = prev[r.id];
  if (IDS) continue; // sihitud jooks ei uuenda cache muutus-loogikat tervikuna
  if (!p) changes.push(`UUS L3 ${r.name} (${r.id}): ${r.verdict}`);
  else if (p.verdict !== r.verdict) changes.push(`MUUTUS ${r.name} (${r.id}): ${p.verdict}→${r.verdict}`);
}
if (!IDS) { // täis/laiem jooks kirjutab cache; --ids jätab cache puutumata
  for (const id of Object.keys(prev)) if (!verdicts[id]) changes.push(`KADUNUD L3 ${id} (${prev[id].name}): oli ${prev[id].verdict}`);
  fs.writeFileSync(CACHE, JSON.stringify({ generated: stamp, model: MODEL, count: out.length, verdicts }, null, 1));
} else { // --ids: kirjuta täisverdiktid (GRAB+CLEAN) eraldi faili (re-score võrdluseks + cache-merge)
  fs.writeFileSync("/opt/eumotors-tasks/reports/grab-rescore.json", JSON.stringify({ generated: stamp, model: MODEL, verdicts }, null, 1));
}

// 4b. raport
const grabs = out.filter((r) => r.verdict === "GRAB").sort((a, b) => b.n - a.n);
const conf = (c) => ({ korge: "🔴 kõrge", kesk: "🟠 kesk", madal: "🟡 madal" }[c] || c);
const byMain = {}; grabs.forEach((r) => { (byMain[r.main] ||= []).push(r); });
const lines = ["# GRAB-BAG JUDGE — LLM-semantiline täisnimekiri\n",
  `**${stamp} · ${MODEL} · L3 ≥${MIN} toodet: ${rows.length}**\n`,
  `**GRAB: ${grabs.length}** · CLEAN: ${out.filter((r) => r.verdict === "CLEAN").length} · ERROR: ${out.filter((r) => r.verdict === "ERROR").length}\n`,
  changes.length ? `## MUUTUSED eelmisest jooksust (${changes.length})\n` + changes.map((c) => `- ${c}`).join("\n") + "\n" : "",
  "## GRAB rankitud (toodete arv kahanevalt)\n", "| # | L3 | main | n | kindlus | klastrid + split |", "|--:|---|---|--:|---|---|",
  ...grabs.map((r, i) => `| ${i + 1} | ${r.name} (${r.id}) | ${r.main} | ${r.n} | ${conf(r.confidence)} | ${r.clusters} |`),
  "\n## GRAB main-kaupa (täis-passi planeerimiseks)\n",
  ...Object.entries(byMain).sort((a, b) => b[1].length - a[1].length).map(([m, rs]) => `- **${m}** (${rs.length}): ${rs.map((r) => r.name).join(" · ")}`)];
fs.writeFileSync(IDS ? "/opt/eumotors-tasks/reports/grab-judge-ids-tulem.md" : "/opt/eumotors-tasks/reports/grabbag-judge-taisnimekiri.md", lines.filter(Boolean).join("\n"));
const cost = (USAGE.in / 1e6) * 5 + (USAGE.out / 1e6) * 25;
console.log(`\n🟢 GRAB: ${grabs.length} / ${rows.length} · CLEAN ${out.filter((r) => r.verdict === "CLEAN").length} · ERROR ${out.filter((r) => r.verdict === "ERROR").length}`);
if (!IDS) console.log(`   cache: reports/grab-verdiktid.json · muutusi: ${changes.length}`);
console.log(`   raport: reports/grabbag-judge-taisnimekiri.md`);
console.log(`💰 Token-kulu: input ${USAGE.in} · output ${USAGE.out} · ~$${cost.toFixed(4)} (Opus 4.8)`);
