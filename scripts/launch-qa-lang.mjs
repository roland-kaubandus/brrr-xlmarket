#!/usr/bin/env node
/**
 * launch-qa-lang.mjs — LAUNCH-QA keelesegaduse-kontroll (LLM, READ-ONLY).
 *
 * Loeb prod.ndjson (launch-qa-crawl --kind products väljund). Iga toote kohta on kaks rida:
 * loc=et ja loc=en, mõlemal nähtav sampleText. Paaritab handle järgi ja saadab batch'ina
 * Opus 4.8-le: kas ET-leht on PÕHILISELT eesti keeles ja EN-leht inglise? Flag:
 *   - ET-leht domineerivalt inglise (tõlge puudu / fallback nähtav kliendile)
 *   - segakeel (pool-eesti, pool-inglise ühel lehel — rikutud mulje)
 *   - EN-leht eesti keeles (vale suund)
 * Chrome/nav-tekst (menüü "Kategooriad/Starterid") EI loe — hinda ainult toote pealkirja+kirjeldust.
 *
 * KASUTUS: ANTHROPIC_API_KEY=... node scripts/launch-qa-lang.mjs --in /path/prod.ndjson [--batch 12]
 * Väljund: reports/launch-qa-keel.md + stdout kokkuvõte.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const IN = argv("--in", "/tmp/prod.ndjson");
const BATCH = +argv("--batch", "12") || 12;
const MODEL = "claude-opus-4-8";
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub."); process.exit(2); }

// --- paarita handle järgi (et + en) ---
const rows = fs.readFileSync(IN, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const byHandle = {};
for (const r of rows) { (byHandle[r.handle] ||= {})[r.loc] = r; }
const pairs = Object.entries(byHandle)
  .filter(([, v]) => v.et && v.en && v.et.status === 200 && v.en.status === 200 && v.et.sampleText && v.en.sampleText)
  .map(([handle, v]) => ({ handle, et: v.et.sampleText, en: v.en.sampleText, h1_et: v.et.h1, h1_en: v.en.h1 }));
console.error(`[launch-qa-lang] ${rows.length} rida → ${pairs.length} ET+EN paari · batch=${BATCH} · ${Math.ceil(pairs.length / BATCH)} API-kutset`);

const USAGE = { in: 0, out: 0 };
const flags = [];

async function checkBatch(batch) {
  const blocks = batch.map((p, i) => `### ${i}: handle=${p.handle}\nET-leht (nähtav tekst): ${p.et.slice(0, 450)}\nEN-leht (nähtav tekst): ${p.en.slice(0, 450)}`).join("\n\n");
  const prompt = `Oled e-poe keele-QA. Allpool ${batch.length} toodet, igaühel ET-lehe ja EN-lehe nähtav tekst (navigatsiooni-/menüütekst nagu "Kategooriad/Starterid/Otsi" EI loe — hinda AINULT toote pealkirja ja kirjeldust).

Iga toote kohta hinda:
- kas ET-lehe TOOTE-sisu (pealkiri+kirjeldus) on põhiliselt EESTI keeles?
- kas EN-lehe TOOTE-sisu on põhiliselt INGLISE keeles?

Flag AINULT probleemid:
- "et_english": ET-lehel on toote pealkiri/kirjeldus domineerivalt INGLISE keeles (tõlge puudub, klient näeb inglise teksti)
- "mixed": ühel lehel selgelt segakeel (pool eesti, pool inglise toote-sisus — rikutud mulje)
- "en_estonian": EN-lehel toote-sisu eesti keeles (vale suund)
- "garbled": loetamatu/katkine tekst (kodeeringu-praht, HTML-jäägid)

${blocks}

Vasta AINULT JSON-massiiviga (tühi [] kui kõik korras):
[{"i":0,"handle":"...","issue":"et_english"|"mixed"|"en_estonian"|"garbled","evidence":"lühi tsitaat","confidence":"korge"|"kesk"}]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 3000, thinking: { type: "adaptive" }, output_config: { effort: "low" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  if (data.usage) { USAGE.in += data.usage.input_tokens || 0; USAGE.out += data.usage.output_tokens || 0; }
  const txt = (data.content.find((b) => b.type === "text") || {}).text || "";
  const m = txt.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("JSON puudub: " + txt.slice(0, 120));
  return JSON.parse(m[0]);
}

for (let i = 0; i < pairs.length; i += BATCH) {
  const batch = pairs.slice(i, i + BATCH);
  try {
    const r = await checkBatch(batch);
    for (const x of r) if (x.issue) flags.push({ ...x, handle: x.handle || batch[x.i]?.handle });
    console.error(`  [${Math.floor(i / BATCH) + 1}/${Math.ceil(pairs.length / BATCH)}] +${r.length}`);
  } catch (e) { console.error(`  batch ${i} VIGA: ${e.message}`); }
}

const stamp = new Date().toISOString().slice(0, 10);
const byIssue = {}; flags.forEach((f) => { (byIssue[f.issue] ||= []).push(f); });
const lines = ["# LAUNCH-QA — keelesegaduse-kontroll (LLM)\n",
  `**${stamp} · ${MODEL} · ${pairs.length} ET+EN toote-paari**\n`,
  `**Flag'e kokku: ${flags.length}** · ${Object.entries(byIssue).map(([k, v]) => `${k}: ${v.length}`).join(" · ")}\n`,
  ...Object.entries(byIssue).flatMap(([issue, fs2]) => [
    `\n## ${issue} (${fs2.length})`, "| kindlus | handle | tõend |", "|---|---|---|",
    ...fs2.map((f) => `| ${f.confidence} | ${f.handle} | ${(f.evidence || "").slice(0, 80)} |`)])];
fs.writeFileSync("/opt/eumotors-tasks/reports/launch-qa-keel.md", lines.join("\n"));
const cost = (USAGE.in / 1e6) * 5 + (USAGE.out / 1e6) * 25;
console.log(`\n🟢 Keel-flag'e: ${flags.length} (${Object.entries(byIssue).map(([k, v]) => `${k} ${v.length}`).join(", ")})`);
console.log(`💰 Token-kulu: input ${USAGE.in} · output ${USAGE.out} · ~$${cost.toFixed(4)}`);
console.log(`Raport: /opt/eumotors-tasks/reports/launch-qa-keel.md`);
