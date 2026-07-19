#!/usr/bin/env node
/*
 * l3-l2-misfit-judge.mjs — L3→L2 MISFIT detektor (LLM-judge, Claude Messages API).
 *
 * MIKS: L2-domeeni-judge püüab "terve L2 vales mainis". L3-domeeni-judge püüab "L3 vales mainis".
 * AGA "L3 ÕIGES mainis, vale L2-GRUPIS" (nagu konveierid Transpordikärudes, tee-märgistused
 * Aiadekooris) jäi mõlemast läbi — L3 on õiges mainis, aga vale L2-alamgrupis. See judge hindab
 * iga L3 vs parent-L2 sisu (+ sibling-L3-d) ja pakub õige L2 (sama main VÕI teine).
 *
 * NIME-LÕKS: L3/L2-nimi võib petta — judge loeb SISU (näidistooted).
 * SAMPLE-BIAS: kui L2 enamik FIT ja üksik misfit → "üksik-L3 misfit" (mitte "L2 katki") post-proc.
 * INTRA vs CROSS: suggested_main ≠ praegune → cross-main; muidu intra-main L2-misfit.
 *
 * KASUTUS:  ANTHROPIC_API_KEY=sk-... node scripts/l3-l2-misfit-judge.mjs [--min N] [--limit M] [--ids ...]
 * Väljund: reports/l3-l2-misfit-raport.md + cache reports/l3-l2-misfit-verdiktid.json. EI muuda DB-d.
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
const BATCH = 10;
const SAMPLE = 6;

let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

// 0. KATALOOG: main → L2-nimed (judge pakub siht-L2)
const catRaw = q(`SELECT l1.name, string_agg(DISTINCT l2.name, ' · ' ORDER BY l2.name) l2s
FROM product_category l1 JOIN product_category l2 ON l2.parent_category_id=l1.id
WHERE l1.mpath NOT LIKE '%.%' AND l1.mpath LIKE 'pcat_v4_l%' AND l1.deleted_at IS NULL AND l2.deleted_at IS NULL
GROUP BY l1.name, l1.rank ORDER BY l1.rank;`).split("\n").filter(Boolean).map((r) => { const [main, l2s] = r.split("\t"); return { main, l2s }; });
const CATALOG = catRaw.map((m) => `**${m.main}**: ${m.l2s}`).join("\n");
const VALID_L2 = new Set(); const VALID_MAIN = new Set();
for (const m of catRaw) { VALID_MAIN.add(m.main); m.l2s.split(" · ").forEach((x) => VALID_L2.add(x)); }

// 0b. sibling-L3-d per L2
const sibs = {};
for (const r of q(`SELECT l2.id, string_agg(l3.name, ', ' ORDER BY l3.rank) FROM product_category l2
  JOIN product_category l3 ON l3.parent_category_id=l2.id AND l3.deleted_at IS NULL
  WHERE l2.mpath LIKE 'pcat_v4_l%' AND l2.deleted_at IS NULL AND (char_length(l2.mpath)-char_length(replace(l2.mpath,'.','')))=1
  GROUP BY l2.id;`).split("\n").filter(Boolean)) { const [id, l] = r.split("\t"); sibs[id] = l; }

// 1. L3-de loend
let rows = q(`SELECT l3.id, l3.name, l3.parent_category_id l2id,
  (SELECT name FROM product_category WHERE id=l3.parent_category_id) l2,
  (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) main,
  (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
  AND ${IDS ? `l3.id IN (${IDS.map((i) => `'${i.replace(/[^a-zA-Z0-9_]/g, "")}'`).join(",")})` : `(SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) >= ${MIN}`}
ORDER BY main, l2, l3.rank;`).split("\n").filter(Boolean).map((r) => { const [id, name, l2id, l2, main, n] = r.split("\t"); return { id, name, l2id, l2, main, n: +n }; });
if (LIMIT) rows = rows.slice(0, LIMIT);
console.error(`L3→L2 misfit: ${rows.length} L3, ${Math.ceil(rows.length / BATCH)} API-kutset. L2 katalog: ${VALID_L2.size}.`);

for (const r of rows) r.titles = q(`SELECT left(p.title,85) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
  WHERE pcp.product_category_id='${r.id}' ORDER BY p.title LIMIT ${SAMPLE};`).split("\n").filter(Boolean);

const USAGE = { in: 0, out: 0, cache_r: 0, cache_w: 0 };
const STATIC = `Oled taksonoomia struktuuri-QA. E-poe TÄIS L2-KATALOOG (main → alamkategooriad):

${CATALOG}

Hinda IGA allolev L3: kas see kuulub SISU järgi oma PRAEGUSSE L2-gruppi? Või teise L2 alla (sama main VÕI teine main)?

REEGLID:
- **Loe SISU (näidistooted), MITTE L3/L2-nime.** NIME-LÕKS: nimi võib petta (nt "Transpordikärud" sisaldas lintkonveiereid; "Aiadekoor" sisaldas tee-märgistusi).
- **DOMEEN = kus OSTJA seda tüüpi otsib.** Vaata ka sibling-L3-sid: kas see L3 sobib nende sekka?
- **FIT:** kuulub selgelt praegusesse L2. **MISFIT:** kuulub selgelt TEISE L2 (nimeta täpne L2 katalogist). **BORDERLINE:** kaheti.
- **suggested_l2:** kui MISFIT/BORDERLINE, nimeta TÄPNE olemasolev L2 katalogist (kopeeri täht-tähelt). Kui õiget L2 pole katalogis aga selge uus kodu vajalik, kirjuta "UUS: <nimi>". ÄRA leiuta olematuid.
- **suggested_main:** ainult kui siht-L2 on TEISES mainis (cross-main); muidu tühi (sama main).
- MISFIT ainult kui SELGE — mitte "võiks ka mujal". Kui kahtled, BORDERLINE.

Vasta AINULT JSON-massiiviga, üks objekt per L3, samas järjekorras:
[{"id":"pcat_...","verdict":"FIT"|"MISFIT"|"BORDERLINE","confidence":"korge"|"kesk"|"madal","suggested_l2":"täpne L2 või UUS: nimi või tühi","suggested_main":"teine main kui cross-main, muidu tühi","reason":"lühi: mis TÜÜP + miks sinna"}]`;

async function judgeBatch(batch) {
  const blocks = batch.map((r, i) => `### L3 #${i} — id=${r.id} — "${r.name}" (${r.n}t)\nPRAEGUNE L2: "${r.l2}" (main: "${r.main}")\nteised L3-d selles L2-s: ${(sibs[r.l2id] || "(pole)").slice(0, 400)}\nNäidistooted:\n${r.titles.join("\n")}`).join("\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4500, thinking: { type: "adaptive" }, output_config: { effort: "low" },
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
      out.push({ ...r, verdict: v.verdict, confidence: v.confidence || "", suggested_l2: v.suggested_l2 || "", suggested_main: v.suggested_main || "", reason: v.reason || "" });
    }
    console.error(`  [${Math.min(i + BATCH, rows.length)}/${rows.length}]`);
  } catch (e) { console.error(`  batch ${i} VIGA: ${e.message.slice(0, 90)}`); batch.forEach((r) => out.push({ ...r, verdict: "ERROR", confidence: "", suggested_l2: "", suggested_main: "", reason: e.message.slice(0, 80) })); }
}

// post-proc: klassifitseeri
for (const r of out) {
  r.cross = (r.verdict === "MISFIT" || r.verdict === "BORDERLINE") && r.suggested_main && r.suggested_main !== r.main && VALID_MAIN.has(r.suggested_main);
  r.invalid = r.suggested_l2 && !r.suggested_l2.startsWith("UUS:") && !VALID_L2.has(r.suggested_l2);
}
// üksik-L3 misfit vs L2-katki: loenda misfitid per allikas-L2
const misfitPerL2 = {};
for (const r of out) if (r.verdict === "MISFIT") misfitPerL2[r.l2id] = (misfitPerL2[r.l2id] || 0) + 1;
const l3countPerL2 = {};
for (const r of out) l3countPerL2[r.l2id] = (l3countPerL2[r.l2id] || 0) + 1;
for (const r of out) r.l2broken = r.verdict === "MISFIT" && misfitPerL2[r.l2id] >= Math.max(2, Math.ceil(l3countPerL2[r.l2id] * 0.5));

// cache
const CACHE = "/opt/eumotors-tasks/reports/l3-l2-misfit-verdiktid.json";
const stamp = new Date().toISOString().slice(0, 10);
const verdicts = {};
for (const r of out) verdicts[r.id] = { name: r.name, l2: r.l2, main: r.main, n: r.n, verdict: r.verdict, confidence: r.confidence, suggested_l2: r.suggested_l2, suggested_main: r.suggested_main, cross: r.cross, reason: r.reason, date: stamp };
if (!IDS) fs.writeFileSync(CACHE, JSON.stringify({ generated: stamp, model: MODEL, count: out.length, verdicts }, null, 1));

// raport
const cw = { korge: 3, kesk: 2, madal: 1 };
const conf = (c) => ({ korge: "🔴 kõrge", kesk: "🟠 kesk", madal: "🟡 madal" }[c] || c);
const misfits = out.filter((r) => r.verdict === "MISFIT");
const borders = out.filter((r) => r.verdict === "BORDERLINE");
const fits = out.filter((r) => r.verdict === "FIT").length;
const errs = out.filter((r) => r.verdict === "ERROR").length;
const cross = misfits.filter((r) => r.cross);
const cost = (USAGE.in / 1e6) * 5 + (USAGE.cache_r / 1e6) * 0.5 + (USAGE.cache_w / 1e6) * 6.25 + (USAGE.out / 1e6) * 25;
// grupeeri siht-L2 järgi
const byTarget = {};
for (const r of misfits) { const k = r.suggested_l2 || "(määramata)"; (byTarget[k] = byTarget[k] || []).push(r); }
const targetKeys = Object.keys(byTarget).sort((a, b) => byTarget[b].length - byTarget[a].length);
// DUP-L2: allikas-L2 kust ≥3 L3 pakub SAMA siht-L2 → potentsiaalne L2-merge
const dupPairs = {};
for (const r of misfits) if (r.suggested_l2 && !r.suggested_l2.startsWith("UUS:")) { const k = `${r.l2} → ${r.suggested_l2}`; dupPairs[k] = (dupPairs[k] || 0) + 1; }
const dupL2 = Object.entries(dupPairs).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]);

const L = ["# L3→L2 MISFIT JUDGE (siht-L2 järgi grupeeritud)\n",
  `**${stamp} · ${MODEL} · ${out.length} L3 (≥${MIN}t)**\n`,
  `**FIT: ${fits} · MISFIT: ${misfits.length} (cross-main: ${cross.length}) · BORDERLINE: ${borders.length} · ERROR: ${errs}** · 💰 ~$${cost.toFixed(2)}\n`,
  cross.length ? "" : "",
  "## 🔴 CROSS-MAIN MISFIT (vale MAIN — tähtsaim)\n",
  "| L3 | n | praegune L2/main | → L2/main | kindlus | põhjus |", "|---|--:|---|---|---|---|",
  ...cross.sort((a, b) => (cw[b.confidence] || 0) - (cw[a.confidence] || 0) || b.n - a.n).map((r) => `| ${r.name} | ${r.n} | ${r.l2} / ${r.main} | **${r.suggested_l2} / ${r.suggested_main}**${r.invalid ? " ⚠️" : ""} | ${conf(r.confidence)} | ${r.reason} |`),
  "\n## 🎯 INTRA-MAIN MISFIT (õige main, vale L2) — SIHT-L2 järgi grupeeritud\n"];
for (const k of targetKeys) {
  const grp = byTarget[k].filter((r) => !r.cross);
  if (!grp.length) continue;
  L.push(`\n### → ${k} (${grp.length})\n`, "| L3 | n | praegune L2 | kindlus | põhjus |", "|---|--:|---|---|---|",
    ...grp.sort((a, b) => (cw[b.confidence] || 0) - (cw[a.confidence] || 0) || b.n - a.n).map((r) => `| ${r.name}${r.l2broken ? " ⚠️L2" : ""} | ${r.n} | ${r.l2} | ${conf(r.confidence)} | ${r.reason} |`));
}
L.push("\n## 🔀 DUP-L2 kandidaadid (≥3 L3 samast L2 → sama siht = võimalik L2-merge)\n");
if (dupL2.length) for (const [k, c] of dupL2) L.push(`- **${k}** — ${c} L3`);
else L.push("- (pole)");
L.push("\n## 🟠 BORDERLINE\n", "| L3 | n | praegune L2/main | võimalik L2 | kindlus | põhjus |", "|---|--:|---|---|---|---|",
  ...borders.sort((a, b) => (cw[b.confidence] || 0) - (cw[a.confidence] || 0) || b.n - a.n).slice(0, 60).map((r) => `| ${r.name} | ${r.n} | ${r.l2} / ${r.main} | ${r.suggested_l2}${r.suggested_main ? " / " + r.suggested_main : ""} | ${conf(r.confidence)} | ${r.reason} |`));
fs.writeFileSync("/opt/eumotors-tasks/reports/l3-l2-misfit-raport.md", L.filter((x) => x !== "").join("\n") + "\n");
console.log(`\n🟢 FIT ${fits} · MISFIT ${misfits.length} (cross ${cross.length}) · BORDERLINE ${borders.length} · ERROR ${errs}`);
console.log(`   DUP-L2 kandidaate: ${dupL2.length} · raport: reports/l3-l2-misfit-raport.md`);
console.log(`💰 input ${USAGE.in} · cache_r ${USAGE.cache_r} · cache_w ${USAGE.cache_w} · output ${USAGE.out} · ~$${cost.toFixed(4)}`);
