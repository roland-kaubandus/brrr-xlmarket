#!/usr/bin/env node
/*
 * l2-domain-judge.mjs — L2→MAIN DOMEENI-PAIGUTUSE detektor (LLM-judge, Claude Messages API).
 *
 * MIKS: L3-domeeni-judge püüab "üksik L3 vales mainis". AGA "terve L2 vales mainis" klass
 * (nagu "Aiad, väravad & piirded" oli Ehituses — SEEST homogeenne aga vale MAIN) jäi L3-tasandil
 * pimedaks (iga L3 sobis oma L2-sse, aga kogu L2 kuulus teise domeeni). See judge hindab L2-TÜÜPI
 * kui tervikut vs parent-maini domeen.
 *
 * NIME-LÕKS: L2-nimi võib petta. Judge loeb SISU (L3-nimed + näidistooted kõigi L3-de üleselt).
 * INTRA vs CROSS: kui MISFIT aga soovitab SAMA maini → "intra-main L2-misfit" (vale L2-grupp
 * õiges mainis), muidu cross-main.
 *
 * KASUTUS:  ANTHROPIC_API_KEY=sk-... node scripts/l2-domain-judge.mjs [--min N] [--limit M] [--ids ...]
 * Väljund: reports/l2-domain-placement-raport.md + cache reports/l2-domain-verdiktid.json. EI muuda DB-d.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub."); process.exit(2); }
const MODEL = "claude-opus-4-8";
const args = process.argv.slice(2);
const MIN = args.includes("--min") ? +(args[args.indexOf("--min") + 1]) : 1;
const LIMIT = args.includes("--limit") ? +(args[args.indexOf("--limit") + 1]) : 0;
const IDS = args.includes("--ids") ? args[args.indexOf("--ids") + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
const BATCH = 8;
const SAMPLE = 8;

let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

// 0. MAINIDE DOMEENI-ALLKIRI (main + selle L2-nimed = mida see main katab)
const mainsRaw = q(`SELECT l1.name AS main, string_agg(DISTINCT l2.name, ', ') AS l2s
FROM product_category l1 JOIN product_category l2 ON l2.parent_category_id=l1.id
WHERE l1.mpath NOT LIKE '%.%' AND l1.deleted_at IS NULL AND l2.deleted_at IS NULL
GROUP BY l1.name ORDER BY l1.name;`).split("\n").filter(Boolean).map((r) => { const [main, l2s] = r.split("\t"); return { main, l2s }; });
const MAINLIST = mainsRaw.map((m) => `- **${m.main}** — L2-d: ${m.l2s}`).join("\n");

// 1. L2-de loend (v4-scoped, depth 1) + tootearv (kõik L3-lapsed) + L3-nimed
let rows = q(`SELECT l2.id, l2.name,
  (SELECT name FROM product_category WHERE id=split_part(l2.mpath,'.',1)) main,
  (SELECT count(*) FROM product_category_product pcp WHERE pcp.product_category_id IN
     (SELECT id FROM product_category WHERE parent_category_id=l2.id AND deleted_at IS NULL)) n,
  (SELECT string_agg(name, ' · ' ORDER BY name) FROM product_category WHERE parent_category_id=l2.id AND deleted_at IS NULL) l3s
FROM product_category l2 WHERE l2.mpath LIKE 'pcat_v4_l%' AND l2.deleted_at IS NULL
  AND (char_length(l2.mpath)-char_length(replace(l2.mpath,'.','')))=1
  AND ${IDS ? `l2.id IN (${IDS.map((i) => `'${i.replace(/[^a-zA-Z0-9_]/g, "")}'`).join(",")})`
    : `(SELECT count(*) FROM product_category_product pcp WHERE pcp.product_category_id IN (SELECT id FROM product_category WHERE parent_category_id=l2.id AND deleted_at IS NULL)) >= ${MIN}`}
ORDER BY n DESC;`).split("\n").filter(Boolean).map((r) => { const [id, name, main, n, l3s] = r.split("\t"); return { id, name, main, n: +n, l3s: l3s || "(L3-d puuduvad)" }; });
if (LIMIT) rows = rows.slice(0, LIMIT);
console.error(`L2-domeeni-paigutus: ${rows.length} L2 (≥${MIN} toodet), ${Math.ceil(rows.length / BATCH)} API-kutset. Maine: ${mainsRaw.length}.`);

// näidistooted — spread üle L2 kõigi L3-de (DISTINCT ON L3 → 1 per L3, kuni SAMPLE)
for (const r of rows) {
  r.titles = q(`SELECT title FROM (
      SELECT DISTINCT ON (pcp.product_category_id) left(p.title,90) title, pcp.product_category_id
      FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
      WHERE pcp.product_category_id IN (SELECT id FROM product_category WHERE parent_category_id='${r.id}' AND deleted_at IS NULL)
      ORDER BY pcp.product_category_id, p.title) s
    LIMIT ${SAMPLE};`).split("\n").filter(Boolean);
}

const USAGE = { in: 0, out: 0, cache_r: 0, cache_w: 0 };
const STATIC = `Oled taksonoomia domeeni-QA. Sul on e-poe 25 MAINI (ülemkategooriat), igaüks katab kindla funktsionaalse domeeni:

${MAINLIST}

Hinda IGA allolev L2 (alamkategooria = tüübi-grupp): kas selle L2 TÜÜP kui tervik kuulub PRAEGUSE maini funktsionaalsesse domeeni?

REEGLID:
- **Loe SISU (L3-nimed + näidistooted), MITTE L2-nime.** NIME-LÕKS: L2-nimi võib petta ("Aiad, väravad & piirded" kõlas ehituslikult, aga sisu = aiapiirded → kuulus Aeda, mitte Ehitusse).
- **DOMEEN = kus OSTJA seda tüüpi otsib** (otstarve+funktsioon), mitte tootja-silt ega L2-nimi.
- **SIGNAALI-HIERARHIA:** funktsioon/otstarve/väljund = TUGEV signaal; nimi = NÕRK.
- **Hinda L2 DOMINANTSET tüüpi.** Kui L2 on segu (mõned L3 sobiks mainisse, mõned mitte), aga DOMINANT-tüüp sobib → FIT. MISFIT ainult kui KOGU L2-tüüp kuulub selgelt teise maini.
- **FIT:** L2-tüüp kuulub selgelt praegusesse maini. **MISFIT:** L2-tüüp kuulub selgelt TEISE maini (nimeta täpne main ülalt loendist). **BORDERLINE:** kaheti (kaks maini võrdselt sobivad, või pool-pool segu).
- **suggested_main:** kui MISFIT/BORDERLINE, nimeta TÄPNE main ülalt loendist (kopeeri nimi täht-tähelt). Kui õige main on SAMA mis praegune (L2 kuulub õigesse maini aga vale L2-grupp/nimi) → pane suggested_main=praegune main (märgib intra-main misfiti). ÄRA leiuta main-nimesid — ainult loendis olevad 25.
- Ära flag'i lihtsalt sellepärast, et L2 võiks *ka* mujal sobida — MISFIT ainult kui praegune main SELGELT vale ja teine SELGELT parem.

Vasta AINULT JSON-massiiviga, üks objekt per L2, samas järjekorras:
[{"id":"pcat_...","verdict":"FIT"|"MISFIT"|"BORDERLINE","confidence":"korge"|"kesk"|"madal","suggested_main":"kui MISFIT/BORDERLINE: täpne maini nimi loendist (või praegune main kui intra-main), muidu tühi","reason":"lühi-põhjus: mis TÜÜP see L2 on + miks kuulub sinna"}]`;

async function judgeBatch(batch) {
  const blocks = batch.map((r, i) => `### L2 #${i} — id=${r.id} — nimi="${r.name}"\nPRAEGUNE main: "${r.main}" · ${r.n} toodet\nL3-alamgrupid: ${r.l3s}\nNäidistooted (üle L3-de):\n${r.titles.join("\n")}`).join("\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, thinking: { type: "adaptive" }, output_config: { effort: "low" },
      messages: [{ role: "user", content: [
        { type: "text", text: STATIC, cache_control: { type: "ephemeral" } },
        { type: "text", text: "\n\nHINNATAVAD L2-d:\n\n" + blocks },
      ] }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.usage) { USAGE.in += data.usage.input_tokens || 0; USAGE.out += data.usage.output_tokens || 0; USAGE.cache_r += data.usage.cache_read_input_tokens || 0; USAGE.cache_w += data.usage.cache_creation_input_tokens || 0; }
  const txt = (data.content.find((b) => b.type === "text") || {}).text || "";
  const m = txt.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("JSON massiivi ei leitud: " + txt.slice(0, 200));
  return JSON.parse(m[0]);
}

const VALID_MAINS = new Set(mainsRaw.map((m) => m.main));
const out = [];
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  try {
    const verdicts = await judgeBatch(batch);
    for (const v of verdicts) {
      const r = rows.find((x) => x.id === v.id) || batch[verdicts.indexOf(v)];
      out.push({ ...r, verdict: v.verdict, confidence: v.confidence || "", suggested_main: v.suggested_main || "", reason: v.reason || "" });
    }
    console.error(`  [${Math.min(i + BATCH, rows.length)}/${rows.length}]`);
  } catch (e) { console.error(`  batch ${i} VIGA: ${e.message}`); batch.forEach((r) => out.push({ ...r, verdict: "ERROR", confidence: "", suggested_main: "", reason: e.message.slice(0, 80) })); }
}

// klassifitseeri: cross-main vs intra-main
for (const r of out) {
  r.invalid_sugg = r.suggested_main && !VALID_MAINS.has(r.suggested_main);
  r.intra = (r.verdict === "MISFIT" || r.verdict === "BORDERLINE") && r.suggested_main && r.suggested_main === r.main;
}

// cache
const CACHE = "/opt/eumotors-tasks/reports/l2-domain-verdiktid.json";
const stamp = new Date().toISOString().slice(0, 10);
const verdicts = {};
for (const r of out) verdicts[r.id] = { name: r.name, main: r.main, n: r.n, verdict: r.verdict, confidence: r.confidence, suggested_main: r.suggested_main, intra: r.intra, reason: r.reason, date: stamp };
if (!IDS) fs.writeFileSync(CACHE, JSON.stringify({ generated: stamp, model: MODEL, count: out.length, verdicts }, null, 1));

// raport
const cw = { korge: 3, kesk: 2, madal: 1 };
const conf = (c) => ({ korge: "🔴 kõrge", kesk: "🟠 kesk", madal: "🟡 madal" }[c] || c);
const crossMisfit = out.filter((r) => r.verdict === "MISFIT" && !r.intra).sort((a, b) => (cw[b.confidence] || 0) - (cw[a.confidence] || 0) || b.n - a.n);
const intraMisfit = out.filter((r) => (r.verdict === "MISFIT" || r.verdict === "BORDERLINE") && r.intra).sort((a, b) => (cw[b.confidence] || 0) - (cw[a.confidence] || 0) || b.n - a.n);
const borders = out.filter((r) => r.verdict === "BORDERLINE" && !r.intra).sort((a, b) => (cw[b.confidence] || 0) - (cw[a.confidence] || 0) || b.n - a.n);
const fits = out.filter((r) => r.verdict === "FIT").length;
const errs = out.filter((r) => r.verdict === "ERROR").length;
const cost = (USAGE.in / 1e6) * 5 + (USAGE.cache_r / 1e6) * 0.5 + (USAGE.cache_w / 1e6) * 6.25 + (USAGE.out / 1e6) * 25;
const invalidNote = out.filter((r) => r.invalid_sugg).length;
const lines = ["# L2→MAIN DOMEENI-PAIGUTUSE JUDGE\n",
  `**${stamp} · ${MODEL} · hinnatud ${out.length} L2 (≥${MIN} toodet)**\n`,
  `**FIT: ${fits} · CROSS-MISFIT: ${crossMisfit.length} · INTRA-MISFIT: ${intraMisfit.length} · BORDERLINE: ${borders.length} · ERROR: ${errs}** · 💰 ~$${cost.toFixed(2)}\n`,
  invalidNote ? `⚠️ ${invalidNote} soovitust EI olnud kehtiv main (märgitud) — ignoreeri neid.\n` : "",
  "## 🔴 CROSS-MAIN MISFIT — terve L2 vales MAINIS (kindluse järjekorras)\n",
  "| # | L2 | n | PRAEGUNE main | → SOOVITATUD main | kindlus | põhjus |", "|--:|---|--:|---|---|---|---|",
  ...crossMisfit.map((r, i) => `| ${i + 1} | ${r.name} | ${r.n} | ${r.main} | **${r.suggested_main}**${r.invalid_sugg ? " ⚠️(kehtetu)" : ""} | ${conf(r.confidence)} | ${r.reason} |`),
  "\n## 🟣 INTRA-MAIN L2-MISFIT — õige main, vale L2-grupp/nimi\n",
  "| # | L2 | n | main | kindlus | põhjus |", "|--:|---|--:|---|---|---|",
  ...intraMisfit.map((r, i) => `| ${i + 1} | ${r.name} | ${r.n} | ${r.main} | ${conf(r.confidence)} | ${r.reason} |`),
  "\n## 🟠 BORDERLINE — kaheti-domeen (Tarmo otsus)\n",
  "| # | L2 | n | PRAEGUNE main | võimalik main | kindlus | põhjus |", "|--:|---|--:|---|---|---|---|",
  ...borders.map((r, i) => `| ${i + 1} | ${r.name} | ${r.n} | ${r.main} | ${r.suggested_main}${r.invalid_sugg ? " ⚠️(kehtetu)" : ""} | ${conf(r.confidence)} | ${r.reason} |`),
  "\n## FLAT — ainult CROSS-MAIN MISFIT (kiir-skänn)\n",
  ...(crossMisfit.length ? crossMisfit.map((r) => `- **${r.name}** (${r.n}t) · ${r.main} → **${r.suggested_main}** · ${conf(r.confidence)}`) : ["- (puhas — 0 cross-main misfit)"])];
fs.writeFileSync("/opt/eumotors-tasks/reports/l2-domain-placement-raport.md", lines.filter((x) => x !== "").join("\n"));
console.log(`\n🟢 FIT ${fits} · CROSS-MISFIT ${crossMisfit.length} · INTRA-MISFIT ${intraMisfit.length} · BORDERLINE ${borders.length} · ERROR ${errs}`);
console.log(`   raport: reports/l2-domain-placement-raport.md`);
console.log(`💰 input ${USAGE.in} · cache_r ${USAGE.cache_r} · cache_w ${USAGE.cache_w} · output ${USAGE.out} · ~$${cost.toFixed(4)}`);
