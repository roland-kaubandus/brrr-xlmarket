#!/usr/bin/env node
/*
 * intra-qa-judge.mjs — INTRA-MAIN L3-QA (3. skänni-tüüp, LLM-semantiline).
 *
 * Leiab: toode ÕIGES mainis, VALES L3-s (nt Pickup-Truck-Tent "Rannatelgid" all; RC-tank
 * "Konstruktorites"). Judge (grab-bag) EI püüa neid — üksik-outlier jääb alla grab-läve.
 * See skript vaatab IGA L3 IGA toodet: kas sobib SELLESSE L3-sse või kuulub teise L3-sse
 * SAMAS mainis? Sisu-põhine (title_en), mitte nimi. Väljund per misfit: product_id +
 * praegune L3 → soovitatud L3 (samas mainis) + põhjendus + kindlus.
 *
 * KASUTUS: ANTHROPIC_API_KEY=... node scripts/intra-qa-judge.mjs [--min N] [--main <mpath-L1-id>] [--ids id1,id2] [--estimate]
 *   --min N      : L3-d ≥N tootega (vaikimisi 3; misfit vajab dominant+outlier). --min 2 = KÕIK.
 *   --main <id>  : ainult üks main (L1 pcat-id, nt pcat_v4_l24)
 *   --ids ...    : ainult loetletud L3-id (test)
 *   --estimate   : ainult kulu-hinnang, EI kutsu API-t
 *   (võti .env-st: set -a; . /opt/eumotors-tasks/.env; set +a)
 * EI muuda DB-d (ainult SELECT). Cache: reports/intra-verdiktid.json · raport: reports/intra-qa-taisnimekiri.md
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const args = process.argv.slice(2);
const MIN = +(args[args.indexOf("--min") + 1]) || 3;
const MAIN = args.includes("--main") ? args[args.indexOf("--main") + 1] : null;
const IDS = args.includes("--ids") ? args[args.indexOf("--ids") + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
const ESTIMATE = args.includes("--estimate");
const EFFORT = args.includes("--effort") ? args[args.indexOf("--effort")+1] : "low";
const MODEL = "claude-opus-4-8";
const SAMPLE = 30;             // toodet per L3 (misfit tavaliselt vähemuses → näita rohkem)
const MAXPROD_PER_CALL = 110;  // token-katel: kokku tooteid ühes API-kutses

let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

// 1. KÕIK v4 L3-d (id, name, mainid, n) — menüü jaoks kõik, skänniks ≥MIN
const all = q(`SELECT l3.id, l3.name, split_part(l3.mpath,'.',1) mainid,
  (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
ORDER BY mainid, l3.name;`).split("\n").filter(Boolean).map((r) => { const [id, name, mainid, n] = r.split("\t"); return { id, name, mainid, n: +n }; });
const mainName = Object.fromEntries(q(`SELECT id,name FROM product_category WHERE id IN (${[...new Set(all.map((x) => `'${x.mainid}'`))].join(",")});`).split("\n").filter(Boolean).map((r) => r.split("\t")));
const menuByMain = {}; all.forEach((l3) => { (menuByMain[l3.mainid] ||= []).push(l3); });

// skänni-sihtmärgid
let targets = all.filter((l3) => l3.n >= MIN);
if (MAIN) targets = targets.filter((l3) => l3.mainid === MAIN);
if (IDS) targets = all.filter((l3) => IDS.includes(l3.id));
targets = targets.filter((l3) => (menuByMain[l3.mainid] || []).length >= 2); // vaja ≥2 L3 mainis (kuhu liigutada)

// grupeeri sihtmärgid maini-kaupa → chunk'i toote-arvu järgi
const calls = [];
const byMain = {}; targets.forEach((l3) => { (byMain[l3.mainid] ||= []).push(l3); });
for (const [mid, l3s] of Object.entries(byMain)) {
  let chunk = [], prod = 0;
  for (const l3 of l3s) {
    const p = Math.min(l3.n, SAMPLE);
    if (chunk.length && prod + p > MAXPROD_PER_CALL) { calls.push({ mid, l3s: chunk }); chunk = []; prod = 0; }
    chunk.push(l3); prod += p;
  }
  if (chunk.length) calls.push({ mid, l3s: chunk });
}

// kulu-hinnang
const estCalls = calls.length;
const estProd = targets.reduce((s, l3) => s + Math.min(l3.n, SAMPLE), 0);
const estInTok = estProd * 12 + estCalls * (30 * 5 + 400);  // tooted + menüü + overhead
const estOutTok = estCalls * 400;
const estCost = (estInTok / 1e6) * 5 + (estOutTok / 1e6) * 25;
console.error(`Sihtmärke: ${targets.length} L3 (≥${MIN} toodet${MAIN ? ", main " + MAIN : ""}) · ${estProd} toodet · ${estCalls} API-kutset`);
console.error(`KULU-HINNANG: input ~${(estInTok / 1000).toFixed(0)}k · output ~${(estOutTok / 1000).toFixed(0)}k · ~$${estCost.toFixed(2)} (Opus 4.8)`);
if (ESTIMATE) { console.log("(--estimate: API-t ei kutsutud)"); process.exit(0); }

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub."); process.exit(2); }
const USAGE = { in: 0, out: 0 };

async function judgeCall({ mid, l3s }) {
  const menu = menuByMain[mid].map((x) => `${x.id} = "${x.name}"`).join("\n");
  const blocks = l3s.map((l3) => {
    const prods = q(`SELECT pcp.product_id, left(p.title,80) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
      WHERE pcp.product_category_id='${l3.id}' ORDER BY p.title LIMIT ${SAMPLE};`).split("\n").filter(Boolean);
    return `### L3 ${l3.id} = "${l3.name}"\n${prods.join("\n")}`;
  }).join("\n\n");
  const prompt = `Main "${mainName[mid]}" L3-kodud (soovitatud sihtmärgid — AINULT need):
${menu}

Allpool tooted L3-de kaupa (product_id<TAB>title). Iga toote juures: kas title/sisu SOBIB tema praegusesse L3-sse, või kuulub SELGELT teise L3-sse ülal-loendist (SAMAS mainis)? Sisu otsustab, MITTE nimi. Flag AINULT SELGED misfitid (toode, mille TÜÜP erineb L3 dominantsest ja sobib paremini konkreetsesse teise olemasolevasse L3-sse). ÄRA flag'i kui pole selget paremat kodu samas mainis, ega üld-varianti (nt eri suurus/värv sama tüüp).

${blocks}

Vasta AINULT JSON-massiiviga (tühi [] kui misfite pole):
[{"product_id":"prod_...","current_l3":"pcat_...","suggested_l3":"pcat_... (menüüst!)","reason":"lühi","confidence":"korge"|"kesk"}]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, thinking: { type: "adaptive" }, output_config: { effort: EFFORT }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  if (data.usage) { USAGE.in += data.usage.input_tokens || 0; USAGE.out += data.usage.output_tokens || 0; }
  const txt = (data.content.find((b) => b.type === "text") || {}).text || "";
  const m = txt.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("JSON puudub: " + txt.slice(0, 150));
  return JSON.parse(m[0]);
}

const nm = Object.fromEntries(all.map((x) => [x.id, x.name]));
const misfits = [];
for (let i = 0; i < calls.length; i++) {
  try {
    const r = await judgeCall(calls[i]);
    for (const x of r) if (x.product_id && x.suggested_l3 && x.suggested_l3 !== x.current_l3) misfits.push({ ...x, main: mainName[calls[i].mid], current_name: nm[x.current_l3] || x.current_l3, suggested_name: nm[x.suggested_l3] || x.suggested_l3 });
    console.error(`  [${i + 1}/${calls.length}] main=${mainName[calls[i].mid]} → +${r.length}`);
  } catch (e) { console.error(`  kutse ${i} VIGA: ${e.message}`); }
}

// cache + raport
const stamp = new Date().toISOString().slice(0, 10);
if (!IDS && !MAIN) fs.writeFileSync("/opt/eumotors-tasks/reports/intra-verdiktid.json", JSON.stringify({ generated: stamp, model: MODEL, targets: targets.length, misfits }, null, 1));
const byMainOut = {}; misfits.forEach((m) => { (byMainOut[m.main] ||= []).push(m); });
const conf = (c) => ({ korge: "🔴 kõrge", kesk: "🟠 kesk" }[c] || c);
const lines = ["# INTRA-MAIN L3-QA — LLM-semantiline täisnimekiri\n",
  `**${stamp} · ${MODEL} · sihtmärke: ${targets.length} L3 (≥${MIN} toodet)**\n`,
  `**Misfite kokku: ${misfits.length}** · kõrge: ${misfits.filter((m) => m.confidence === "korge").length}\n`,
  "## Misfitid main-kaupa (toode · praegune L3 → soovitatud L3)\n",
  ...Object.entries(byMainOut).sort((a, b) => b[1].length - a[1].length).flatMap(([main, ms]) => [
    `\n### ${main} (${ms.length})`, "| kindlus | title | praegune → soovitatud | põhjendus |", "|---|---|---|---|",
    ...ms.sort((a, b) => (a.confidence === "korge" ? -1 : 1) - (b.confidence === "korge" ? -1 : 1)).map((m) => `| ${conf(m.confidence)} | ${(m.title || m.product_id).slice(0, 50)} | ${m.current_name} → **${m.suggested_name}** | ${(m.reason || "").slice(0, 60)} |`)])];
const out = IDS || MAIN ? "/opt/eumotors-tasks/reports/intra-qa-test-tulem.md" : "/opt/eumotors-tasks/reports/intra-qa-taisnimekiri.md";
fs.writeFileSync(out, lines.join("\n"));
const cost = (USAGE.in / 1e6) * 5 + (USAGE.out / 1e6) * 25;
console.log(`\n🟢 Misfite: ${misfits.length} (kõrge ${misfits.filter((m) => m.confidence === "korge").length}). Raport: ${out}`);
console.log(`💰 Token-kulu: input ${USAGE.in} · output ${USAGE.out} · ~$${cost.toFixed(4)} (Opus 4.8)`);
