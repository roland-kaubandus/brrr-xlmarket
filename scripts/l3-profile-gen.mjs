#!/usr/bin/env node
/*
 * l3-profile-gen.mjs — L3 TÜÜBI-PROFIILIDE generaator (feed-mapping SSoT, Claude Messages API).
 *
 * MIKS: feed-import (Powermat/BlackTools/KraftDele) mapib toote L3-le tüübi-profiili järgi, MITTE nime.
 * Profiil = domeen + INCLUDE (mis kuulub, eesti+inglise/poola märksõnad) + EXCLUDE (nime-lõksud+naabrid)
 * + naaber-piirid + väljundi-test. Genereerib metadata (EI muuda tooteid).
 *
 * KASUTUS:  ANTHROPIC_API_KEY=sk-... node scripts/l3-profile-gen.mjs [--ids id1,id2] [--min N] [--limit M] [--out SUFFIX]
 *   (võti .env-st: `set -a; . /path/.env; set +a; node ...`)
 *   --ids ...  : AINULT loetletud L3-id
 *   --out X    : väljund reports/l3-profiilid-X.{md,json} (vaikimisi 'piloot')
 * Väljund: reports/l3-profiilid-<suffix>.md + .json. EI muuda DB-d.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub."); process.exit(2); }
const MODEL = "claude-opus-4-8";
const args = process.argv.slice(2);
const IDS = args.includes("--ids") ? args[args.indexOf("--ids") + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
const MIN = args.includes("--min") ? +(args[args.indexOf("--min") + 1]) : 3;
const LIMIT = args.includes("--limit") ? +(args[args.indexOf("--limit") + 1]) : 0;
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : "piloot";
const BATCH = 6;
const SAMPLE = 7;

let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

let rows = q(`SELECT l3.id, l3.name, (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) main,
  l3.parent_category_id l2id, (SELECT name FROM product_category WHERE id=l3.parent_category_id) l2,
  (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
FROM product_category l3 WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
  AND ${IDS ? `l3.id IN (${IDS.map((i) => `'${i.replace(/[^a-zA-Z0-9_]/g, "")}'`).join(",")})` : `(SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) >= ${MIN}`}
ORDER BY main, l2, l3.name;`).split("\n").filter(Boolean).map((r) => { const [id, name, main, l2id, l2, n] = r.split("\t"); return { id, name, main, l2id, l2, n: +n }; });
if (LIMIT) rows = rows.slice(0, LIMIT);
console.error(`Profiile: ${rows.length} L3, ${Math.ceil(rows.length / BATCH)} API-kutset.`);

// näidised + naaber-L3 nimed (sama L2)
for (const r of rows) {
  r.titles = q(`SELECT left(p.title,95) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id WHERE pcp.product_category_id='${r.id}' ORDER BY p.title LIMIT ${SAMPLE};`).split("\n").filter(Boolean);
  r.naabrid = q(`SELECT name FROM product_category WHERE parent_category_id='${r.l2id}' AND deleted_at IS NULL AND id<>'${r.id}' ORDER BY name;`).split("\n").filter(Boolean);
}

const USAGE = { in: 0, out: 0, cache_r: 0, cache_w: 0 };
const STATIC = `Oled taksonoomia tüübi-profiili generaator. Iga L3 (leht-kategooria) jaoks genereeri FEED-MAPPING profiil: mille alusel tulevane feed-import (uus toode) sellesse L3-sse mappida, TÜÜBI (mitte nime) järgi.

REEGLID:
- **NIME-LÕKS:** L3-nimi ja toote-pealkiri võivad petta. Profiil kirjeldab TÜÜPI sisu/funktsiooni/väljundi järgi. Nt "Water Alcohol Distiller" = alkohol-destill (EI vee-destill); "Telescope Case" = optika-tarvik (EI foto).
- **DOMEENI-KODU:** kus OSTJA seda tüüpi otsib (otstarve+väljund).
- **VÄLJUNDI-TEST:** mis eristab seda naaber-L3-st — "kas toode A asendab B, sama tulem?" EI → eri tüüp (kirjelda piir).
- **INCLUDE:** loetle mis TÜÜBID kuuluvad — eesti tüüp + inglise JA (kui asjakohane) poola feed-märksõnad. Formaat: "eesti tüüp / english keyword / polski".
- **EXCLUDE:** nime-lõksud + naaber-tüübid mis EI kuulu — suuna õigesse L3-sse (kasuta naaber-nimekirja). Formaat: "tüüp / keyword → Õige-L3-nimi".
- **UMBRELLA:** kui L3 on TEADLIK umbrella (mitu alamtüüpi koos, nt 'Arkaadimängud'=skeeball+korvpall+claw), märgi domeen-lauses "[UMBRELLA — feed mapib siia kõik alamtüübid, ÄRA oota splitti]".
- **SEOTUD-TÜÜBID-KOOS:** kui seade+tarvik/kulumaterjal koos teadlikult, märgi include's.

Vasta AINULT JSON-massiiviga, üks objekt per L3, järjekorras:
[{"l3_id":"...","domeen":"funktsionaalne domeen + väljund, 1 lause eesti (märgi [UMBRELLA] kui on)","include":["eesti / english / polski", ...],"exclude":["tüüp / keyword → Õige-L3", ...],"naaber_piirid":["piiripealse suunamine", ...],"valjundi_test":"1 lause: mis eristab naabrist"}]`;

async function genBatch(batch) {
  const blocks = batch.map((r) => `### L3 id=${r.id} — nimi="${r.name}" — main="${r.main}" — L2="${r.l2}" (${r.n} toodet)\nNAABER-L3-d samas L2: ${r.naabrid.join(", ") || "(pole)"}\nNäidistooted:\n${r.titles.join("\n")}`).join("\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, thinking: { type: "adaptive" }, output_config: { effort: "low" },
      messages: [{ role: "user", content: [
        { type: "text", text: STATIC, cache_control: { type: "ephemeral" } },
        { type: "text", text: "\n\nGENEREERI PROFIILID:\n\n" + blocks },
      ] }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.usage) { USAGE.in += data.usage.input_tokens || 0; USAGE.out += data.usage.output_tokens || 0; USAGE.cache_r += data.usage.cache_read_input_tokens || 0; USAGE.cache_w += data.usage.cache_creation_input_tokens || 0; }
  const txt = (data.content.find((b) => b.type === "text") || {}).text || "";
  const m = txt.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("JSON ei leitud: " + txt.slice(0, 200));
  return JSON.parse(m[0]);
}

const out = [];
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  try {
    const profs = await genBatch(batch);
    for (const p of profs) { const r = rows.find((x) => x.id === p.l3_id) || batch[profs.indexOf(p)]; out.push({ l3_id: r.id, l3_nimi: r.name, main: r.main, l2: r.l2, n: r.n, ...p, l3_id: r.id }); }
    console.error(`  [${Math.min(i + BATCH, rows.length)}/${rows.length}]`);
  } catch (e) { console.error(`  batch ${i} VIGA: ${e.message}`); batch.forEach((r) => out.push({ l3_id: r.id, l3_nimi: r.name, main: r.main, l2: r.l2, n: r.n, domeen: "ERROR: " + e.message.slice(0, 80), include: [], exclude: [], naaber_piirid: [], valjundi_test: "" })); }
}

fs.writeFileSync(`/opt/eumotors-tasks/reports/l3-profiilid-${OUT}.json`, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), model: MODEL, count: out.length, profiles: out }, null, 1));
const md = [`# L3 TÜÜBI-PROFIILID — ${OUT}\n`, `**${new Date().toISOString().slice(0, 10)} · ${MODEL} · ${out.length} L3**\n`];
for (const p of out) {
  md.push(`## ${p.l3_nimi}  \`${p.l3_id}\`  (${p.main} / ${p.l2}, ${p.n} toodet)`);
  md.push(`**Domeen:** ${p.domeen}`);
  md.push(`**Väljundi-test:** ${p.valjundi_test}`);
  md.push(`**INCLUDE:**\n${(p.include || []).map((x) => `- ${x}`).join("\n")}`);
  md.push(`**EXCLUDE:**\n${(p.exclude || []).map((x) => `- ${x}`).join("\n")}`);
  if ((p.naaber_piirid || []).length) md.push(`**Naaber-piirid:**\n${p.naaber_piirid.map((x) => `- ${x}`).join("\n")}`);
  md.push("");
}
fs.writeFileSync(`/opt/eumotors-tasks/reports/l3-profiilid-${OUT}.md`, md.join("\n"));
const cost = (USAGE.in / 1e6) * 5 + (USAGE.cache_r / 1e6) * 0.5 + (USAGE.cache_w / 1e6) * 6.25 + (USAGE.out / 1e6) * 25;
console.log(`\n🟢 ${out.length} profiili · raport: reports/l3-profiilid-${OUT}.{md,json}`);
console.log(`💰 in ${USAGE.in} · cache_r ${USAGE.cache_r} · cache_w ${USAGE.cache_w} · out ${USAGE.out} · ~$${cost.toFixed(4)}`);
