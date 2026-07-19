#!/usr/bin/env node
/*
 * l3-order-judge.mjs — L3-järjestus L2 sees (populaarsus + seotud grupid kõrvuti). LLM-grouper (Opus).
 *
 * Algoritm: reports/l3-order-reegel.md. Iga L2: tuvasta seade+tarvik grupid, juht populaarsuse järgi,
 * grupi sees seade→tarvikud, üksikud tootearvu-positsioonil, grab-bag lõppu.
 *
 * KASUTUS:  ANTHROPIC_API_KEY=sk-... node scripts/l3-order-judge.mjs --main pcat_v4_l1,pcat_v4_l3 [--out piloot]
 * Väljund: reports/l3-order-<out>.md + cache reports/l3-order-<out>.json ({l2id:[orderedL3ids]}). EI muuda DB-d.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub."); process.exit(2); }
const MODEL = "claude-opus-4-8";
const args = process.argv.slice(2);
const MAINS = args.includes("--main") ? args[args.indexOf("--main") + 1].split(",") : null;
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : "piloot";
const L2FILTER = args.includes("--l2") ? new Set(args[args.indexOf("--l2") + 1].split(",")) : null;
if (!MAINS) { console.error("🔴 --main vajalik"); process.exit(2); }
const BATCH = args.includes("--batch") ? +(args[args.indexOf("--batch") + 1]) : 5;

let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g puudub."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

// L2-d + L3-d (name+count) piloot-mainides
const mainList = MAINS.map((m) => `'${m.replace(/[^a-z0-9_]/g, "")}'`).join(",");
const l2rows = q(`SELECT l2.id, l2.name, (SELECT name FROM product_category WHERE id=split_part(l2.mpath,'.',1)) main
FROM product_category l2 WHERE l2.parent_category_id IN (${mainList}) AND l2.deleted_at IS NULL ORDER BY l2.rank;`)
  .split("\n").filter(Boolean).map((r) => { const [id, name, main] = r.split("\t"); return { id, name, main, l3: [] }; });
for (const l2 of l2rows) {
  l2.l3 = q(`SELECT l3.id, l3.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
    FROM product_category l3 WHERE l3.parent_category_id='${l2.id}' AND l3.deleted_at IS NULL ORDER BY l3.rank;`)
    .split("\n").filter(Boolean).map((r) => { const [id, name, n] = r.split("\t"); return { id, name, n: +n }; });
}
const todo = l2rows.filter((l2) => l2.l3.length >= 2 && (!L2FILTER || L2FILTER.has(l2.id)));
const single = l2rows.filter((l2) => l2.l3.length < 2);
console.error(`L3-order: ${l2rows.length} L2 (${todo.length} järjestatavat ≥2 L3, ${single.length} üksik-L3). ${Math.ceil(todo.length / BATCH)} kutset.`);

const USAGE = { in: 0, out: 0, cache_r: 0, cache_w: 0 };
const STATIC = `Oled taksonoomia järjestus-QA. Järjesta iga L2 sees L3-d selle algoritmiga:

a. SEOTUD GRUPID — 2 TÜÜPI:
   - TÜÜP A (seade + tarvikud): põhiseade + selle tarvikud/varuosad/lisaseadmed/kulumaterjal. Signaalid: nime-muster ("X"+"X tarvikud/varuosad/osad/terad/kettad"), tüübi-perekond (nt "Mootorsaed"+"Saeketid"; "Survepesurid"+"Survepesuri otsikud"). JUHT = põhiseade, roll "juht"; liikmed roll "tarvik".
   - TÜÜP B (seotud tüübi-perekond ILMA ühe vanem-seadmeta): grupeeri omavahel-seotud L3-d kokku, kui nad kuuluvad samasse funktsionaalsesse alamdomeeni, isegi kui pole ühte põhiseadet. Nt rigging: "Tõstetropid ja -ketid"+"Tõstekonksud"+"Tõstemagnetid"+"Tõsterihmade komplektid" = tõste-tarvikute klaster. Signaal: sama alamdomeen (kõik = tõste-koorma-kinnitus), sama nime-tüvi ("Tõste-"). Klastri KÕIK liikmed roll "tarvik" (grupp ühine); klaster asetseb ühes kohas.
b. Järjesta GRUPID populaarsuse järgi: TÜÜP A grupi juht-L3 VÕI TÜÜP B klastri suurima liikme tootearv määrab grupi positsiooni — suurim ees.
c. GRUPI SEES: TÜÜP A põhiseade ees → tarvikud järel (kahanevalt); TÜÜP B klastri liikmed kahanevalt tootearvu järgi.
d. ÜKSIKUD L3-d (grupita): tootearvu-positsioonil, gruppide vahel.
e. GRAB-BAG ("Muud X"/"Üldtarvikud"/üld-varuosad): L2 LÕPPU.

Rollid: "juht" (TÜÜP A põhiseade) · "tarvik" (TÜÜP A liige VÕI TÜÜP B klastri liige) · "üksik" (grupita) · "lopp" (grab-bag lõppu).
NB: TÜÜP B klastris pole "juht"-i — kõik liikmed "tarvik", ühine grupp-nimi. Kasuta grupeerimist HELDELT (seotud tüübid kõrvuti > lahjalt laiali), aga ainult tõeliselt seotud alamdomeen.

Vasta AINULT JSON-objektiga {l2_id: [{"id":"pcat_...","role":"juht|tarvik|üksik|lopp","grupp":"lühi-nimi või tühi"}]}, KÕIK L3-d õiges järjekorras (ükski ei tohi kaduda), grupi liikmed järjestikku (juht kohe tarvikute ees).`;

async function judge(batch) {
  const blocks = batch.map((l2) => `### L2 id=${l2.id} — "${l2.name}" (main: ${l2.main})\nL3-d (id | nimi | tootearv):\n${l2.l3.map((x) => `${x.id} | ${x.name} | ${x.n}`).join("\n")}`).join("\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 16000, thinking: { type: "adaptive" }, output_config: { effort: "low" },
      messages: [{ role: "user", content: [
        { type: "text", text: STATIC, cache_control: { type: "ephemeral" } },
        { type: "text", text: "\n\nJÄRJESTA:\n\n" + blocks }] }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.usage) { USAGE.in += data.usage.input_tokens || 0; USAGE.out += data.usage.output_tokens || 0; USAGE.cache_r += data.usage.cache_read_input_tokens || 0; USAGE.cache_w += data.usage.cache_creation_input_tokens || 0; }
  const txt = (data.content.find((b) => b.type === "text") || {}).text || "";
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("JSON ei leitud: " + txt.slice(0, 150));
  return JSON.parse(m[0]);
}

const result = {}; // l2id -> ordered [{id,role,grupp}]
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  try {
    const r = await judge(batch);
    for (const l2 of batch) {
      const ord = r[l2.id];
      if (!ord) { console.error(`  ⚠️ ${l2.id} puudub vastuses`); continue; }
      // valideeri: kõik L3 id-d olemas, ükski ei kadunud
      const inIds = new Set(l2.l3.map((x) => x.id)), outIds = new Set(ord.map((x) => x.id));
      const missing = [...inIds].filter((x) => !outIds.has(x));
      const extra = ord.filter((x) => !inIds.has(x.id));
      if (missing.length || extra.length) console.error(`  ⚠️ ${l2.name}: kadunud ${missing.length}, võõras ${extra.length} — lisan kadunud lõppu`);
      const clean = ord.filter((x) => inIds.has(x.id));
      for (const mid of missing) clean.push({ id: mid, role: "üksik", grupp: "" });
      result[l2.id] = clean;
    }
    console.error(`  [${Math.min(i + BATCH, todo.length)}/${todo.length}]`);
  } catch (e) { console.error(`  batch ${i} VIGA: ${e.message.slice(0, 90)}`); }
}

const cost = (USAGE.in / 1e6) * 5 + (USAGE.cache_r / 1e6) * 0.5 + (USAGE.cache_w / 1e6) * 6.25 + (USAGE.out / 1e6) * 25;
// cache
fs.writeFileSync(`/opt/eumotors-tasks/reports/l3-order-${OUT}.json`, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), model: MODEL, result }, null, 1));
// raport
const nameById = {}; for (const l2 of l2rows) for (const x of l2.l3) nameById[x.id] = { name: x.name, n: x.n };
const roleTag = { juht: "🔹JUHT", tarvik: "  ↳tarvik", üksik: "•üksik", lopp: "▾lõpp" };
const L = [`# L3-ORDER PILOOT — seotud grupid kõrvuti (${MAINS.length} maini)\n`,
  `**${new Date().toISOString().slice(0, 10)} · ${MODEL} · algoritm: reports/l3-order-reegel.md** · 💰 ~$${cost.toFixed(2)}\n`,
  `Ettepanek (EI teostatud). Iga L2: L3-d uues järjekorras + roll. Kontrolli: seade+tarvik kõrvuti?\n`];
let grouped = 0;
for (const l2 of l2rows) {
  if (!result[l2.id]) { if (l2.l3.length === 1) L.push(`\n### ${l2.name} — 1 L3 (järjestus N/A)`); continue; }
  L.push(`\n### ${l2.name}  *(${l2.main})*`);
  const ord = result[l2.id];
  const groups = new Set(ord.filter((x) => x.grupp).map((x) => x.grupp));
  grouped += groups.size;
  ord.forEach((x, i) => { const meta = nameById[x.id] || { name: x.id, n: "?" }; L.push(`${i + 1}. ${roleTag[x.role] || x.role} **${meta.name}** (${meta.n}t)${x.grupp ? ` — grupp: _${x.grupp}_` : ""}`); });
}
fs.writeFileSync(`/opt/eumotors-tasks/reports/l3-order-${OUT}.md`, L.join("\n") + "\n");
console.log(`\n🟢 järjestatud ${Object.keys(result).length} L2 · ~${grouped} gruppi · raport: reports/l3-order-${OUT}.md`);
console.log(`💰 input ${USAGE.in} · cache_r ${USAGE.cache_r} · cache_w ${USAGE.cache_w} · output ${USAGE.out} · ~$${cost.toFixed(4)}`);
