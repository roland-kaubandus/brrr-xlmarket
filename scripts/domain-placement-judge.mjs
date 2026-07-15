#!/usr/bin/env node
/*
 * domain-placement-judge.mjs — L3→MAIN DOMEENI-PAIGUTUSE detektor (LLM-judge, Claude Messages API).
 *
 * MIKS: grab/intra/merge püüavad L3 SISEST heterogeensust või kõrvuti-L3 duplikaate. AGA
 * "terve L3 vales mainis" klass (teleskoop Spordis, piiritus #4 Kodumasinates) jääb kõigist
 * läbi — L3 ise on homogeenne, aga kuulub TEISE maini funktsionaalsesse domeeni. Seni püüdis
 * seda ainult Tarmo käsitsi nav-QA. See judge süstematiseerib: iga L3 TÜÜP vs parent-maini domeen.
 *
 * NIME-LÕKS: pealkiri võib petta ("Beach Wagon"=üld-veovanker, "Water Alcohol Distiller"≠vee-destill).
 * Judge loeb SISU (title_en näidised), mitte L3-nime.
 *
 * KASUTUS:  ANTHROPIC_API_KEY=sk-... node scripts/domain-placement-judge.mjs [--min N] [--limit M] [--ids ...] [--force]
 *   (võti .env-st: `set -a; . /path/.env; set +a; node scripts/domain-placement-judge.mjs ...`)
 *   --min N   : ainult L3-d ≥N tootega (vaikimisi 3)
 *   --limit M : ainult esimesed M L3 (kulu-kalibreerimiseks)
 *   --ids ... : AINULT loetletud L3-id (koma-eraldi)
 *   --force   : eira cache, hinda kõik uuesti
 * Väljund: reports/domain-placement-raport.md + cache reports/domain-placement-verdiktid.json. EI muuda DB-d.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub."); process.exit(2); }
const MODEL = "claude-opus-4-8";
const args = process.argv.slice(2);
const MIN = args.includes("--min") ? +(args[args.indexOf("--min") + 1]) : 3;
const LIMIT = args.includes("--limit") ? +(args[args.indexOf("--limit") + 1]) : 0;
const IDS = args.includes("--ids") ? args[args.indexOf("--ids") + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
const BATCH = 12;
const SAMPLE = 5;

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

// 1. L3-de loend
let rows = q(`SELECT l3.id, l3.name, (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) main,
  (SELECT name FROM product_category WHERE id=l3.parent_category_id) l2,
  (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
  AND ${IDS ? `l3.id IN (${IDS.map((i) => `'${i.replace(/[^a-zA-Z0-9_]/g, "")}'`).join(",")})` : `(SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) >= ${MIN}`}
ORDER BY n DESC;`).split("\n").filter(Boolean).map((r) => { const [id, name, main, l2, n] = r.split("\t"); return { id, name, main, l2, n: +n }; });
if (LIMIT) rows = rows.slice(0, LIMIT);
console.error(`Domeeni-paigutus: ${rows.length} L3 (≥${MIN} toodet), ${Math.ceil(rows.length / BATCH)} API-kutset. Maine: ${mainsRaw.length}.`);

for (const r of rows) {
  r.titles = q(`SELECT left(p.title,90) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
    WHERE pcp.product_category_id='${r.id}' ORDER BY p.title LIMIT ${SAMPLE};`).split("\n").filter(Boolean);
}

const USAGE = { in: 0, out: 0, cache_r: 0, cache_w: 0 };
// STAATILINE prefiks (cache'itav — identne igal kutsel): MAINLIST + reeglid
const STATIC = `Oled taksonoomia domeeni-QA. Sul on e-poe 25 MAINI (ülemkategooriat), igaüks katab kindla funktsionaalse domeeni:

${MAINLIST}

Hinda IGA allolev L3: kas selle TÜÜP kuulub PRAEGUSE maini funktsionaalsesse domeeni?

REEGLID:
- **Loe SISU (title_en näidised), MITTE L3-nime.** NIME-LÕKS: pealkiri võib petta ("Beach Wagon Cart" spetsist = üld-veovanker, MITTE ranna-spets; "Water Alcohol Distiller" = alkohol-destill, MITTE vee-destill; "Telescope Case" kuulub optika/astronoomiasse, mitte Sporti kus "case/kott" nime järgi sattus).
- **DOMEEN = kus OSTJA seda tüüpi otsib** (otstarve+funktsioon), mitte tootja-silt ega L3-nimi.
- **SIGNAALI-HIERARHIA:** funktsioon/otstarve/väljund = TUGEV signaal; nime "kott/masin/case/stand" = NÕRK (võib olla ükskõik mis domeenist).
- **FIT:** tüüp kuulub selgelt praegusesse maini. **MISFIT:** tüüp kuulub selgelt TEISE maini (nimeta täpne main ülalt loendist). **BORDERLINE:** kaheti (nt kaheti-domeen toode, või kaks maini võrdselt sobivad).
- Ära flag'i lihtsalt sellepärast, et L3 võiks *ka* mujal sobida — MISFIT ainult kui praegune main on SELGELT vale ja teine SELGELT parem.

Vasta AINULT JSON-massiiviga, üks objekt per L3, samas järjekorras:
[{"id":"pcat_...","verdict":"FIT"|"MISFIT"|"BORDERLINE","confidence":"korge"|"kesk"|"madal","suggested_main":"kui MISFIT/BORDERLINE: täpne maini nimi ülalt, muidu tühi","reason":"lühi-põhjus: mis TÜÜP see on + miks kuulub sinna"}]`;
async function judgeBatch(batch) {
  const blocks = batch.map((r, i) => `### L3 #${i} — id=${r.id} — nimi="${r.name}"\nPRAEGUNE main: "${r.main}" (L2: ${r.l2}) · ${r.n} toodet\nNäidistooted:\n${r.titles.join("\n")}`).join("\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, thinking: { type: "adaptive" }, output_config: { effort: "low" },
      messages: [{ role: "user", content: [
        { type: "text", text: STATIC, cache_control: { type: "ephemeral" } },
        { type: "text", text: "\n\nHINNATAVAD L3-d:\n\n" + blocks },
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

// cache
const CACHE = "/opt/eumotors-tasks/reports/domain-placement-verdiktid.json";
const stamp = new Date().toISOString().slice(0, 10);
const verdicts = {};
for (const r of out) verdicts[r.id] = { name: r.name, main: r.main, n: r.n, verdict: r.verdict, confidence: r.confidence, suggested_main: r.suggested_main, reason: r.reason, date: stamp };
if (!IDS) fs.writeFileSync(CACHE, JSON.stringify({ generated: stamp, model: MODEL, count: out.length, verdicts }, null, 1));

// raport (FLAT — MISFIT esimesena kindluse järgi, siis BORDERLINE)
const cw = { korge: 3, kesk: 2, madal: 1 };
const conf = (c) => ({ korge: "🔴 kõrge", kesk: "🟠 kesk", madal: "🟡 madal" }[c] || c);
const misfits = out.filter((r) => r.verdict === "MISFIT").sort((a, b) => (cw[b.confidence] || 0) - (cw[a.confidence] || 0) || b.n - a.n);
const borders = out.filter((r) => r.verdict === "BORDERLINE").sort((a, b) => (cw[b.confidence] || 0) - (cw[a.confidence] || 0) || b.n - a.n);
const fits = out.filter((r) => r.verdict === "FIT").length;
const cost = (USAGE.in / 1e6) * 5 + (USAGE.cache_r / 1e6) * 0.5 + (USAGE.cache_w / 1e6) * 6.25 + (USAGE.out / 1e6) * 25;
const lines = ["# DOMEENI-PAIGUTUSE JUDGE — L3→MAIN (FLAT-nimekiri)\n",
  `**${stamp} · ${MODEL} · hinnatud ${out.length} L3 (≥${MIN} toodet)**\n`,
  `**FIT: ${fits} · MISFIT: ${misfits.length} · BORDERLINE: ${borders.length} · ERROR: ${out.filter((r) => r.verdict === "ERROR").length}** · 💰 ~$${cost.toFixed(2)}\n`,
  "## 🔴 MISFIT — terve L3 vales mainis (kindluse järjekorras)\n",
  "| # | L3 | n | PRAEGUNE main | → SOOVITATUD main | kindlus | põhjus |", "|--:|---|--:|---|---|---|---|",
  ...misfits.map((r, i) => `| ${i + 1} | ${r.name} | ${r.n} | ${r.main} | **${r.suggested_main}** | ${conf(r.confidence)} | ${r.reason} |`),
  "\n## 🟠 BORDERLINE — kaheti-domeen (Tarmo otsus)\n",
  "| # | L3 | n | PRAEGUNE main | võimalik main | kindlus | põhjus |", "|--:|---|--:|---|---|---|---|",
  ...borders.map((r, i) => `| ${i + 1} | ${r.name} | ${r.n} | ${r.main} | ${r.suggested_main} | ${conf(r.confidence)} | ${r.reason} |`)];
fs.writeFileSync("/opt/eumotors-tasks/reports/domain-placement-raport.md", lines.join("\n"));
console.log(`\n🟢 FIT ${fits} · MISFIT ${misfits.length} · BORDERLINE ${borders.length} · ERROR ${out.filter((r) => r.verdict === "ERROR").length}`);
console.log(`   raport: reports/domain-placement-raport.md`);
console.log(`💰 input ${USAGE.in} · cache_r ${USAGE.cache_r} · cache_w ${USAGE.cache_w} · output ${USAGE.out} · ~$${cost.toFixed(4)}`);
