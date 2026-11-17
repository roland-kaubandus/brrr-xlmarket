#!/usr/bin/env node
/*
 * merge-judge.mjs — MERGE-DETEKTOR (4. kontroll-tüüp, LLM-semantiline).
 *
 * Split-detektor (grab-bag-judge) leiab HETEROGEENSUSE ("L3 = 2 tüüpi → split").
 * MERGE-detektor leiab ÜLE-FRAGMENTEERIMISE: kaks KÕRVUTI-L3 (sama L2) on TEGELIKULT
 * SAMA TÜÜP (VARIANT) → peaks olema üks L3. Jooksuta pärast iga split-lukku + nime-faasis.
 *   VARIANT (→ MERGE): sama funktsioon, erineb vorm/kinnitus/suurus/materjal.
 *   ERI TÜÜP (→ jäta lahku): funktsioon erineb.
 *
 * KASUTUS: ANTHROPIC_API_KEY=... node scripts/merge-judge.mjs [--main <L1-id>] [--l2 id1,id2] [--estimate]
 * EI muuda DB-d (ainult SELECT). Väljund: reports/merge-kandidaadid.md + reports/merge-verdiktid.json
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const MAIN = args.includes("--main") ? args[args.indexOf("--main") + 1] : null;
const L2S = args.includes("--l2") ? args[args.indexOf("--l2") + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
const ESTIMATE = args.includes("--estimate");
const MODEL = "claude-opus-4-8";
const SAMPLE = 15;

let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

// L2-d + nende L3-d
let l2filter = "";
if (MAIN) l2filter = `AND split_part(l2.mpath,'.',1)='${MAIN.replace(/[^a-zA-Z0-9_]/g, "")}'`;
if (L2S) l2filter = `AND l2.id IN (${L2S.map((i) => `'${i.replace(/[^a-zA-Z0-9_]/g, "")}'`).join(",")})`;
const l2rows = q(`SELECT l2.id, l2.name FROM product_category l2 WHERE l2.mpath LIKE 'pcat_v4_l%' AND l2.deleted_at IS NULL
  AND (char_length(l2.mpath)-char_length(replace(l2.mpath,'.','')))=1 ${l2filter} ORDER BY l2.name;`).split("\n").filter(Boolean).map((r) => { const [id, name] = r.split("\t"); return { id, name }; });

const l2s = [];
for (const l2 of l2rows) {
  const l3s = q(`SELECT l3.id, l3.name, (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
    FROM product_category l3 WHERE l3.parent_category_id='${l2.id}' AND l3.deleted_at IS NULL ORDER BY l3.name;`).split("\n").filter(Boolean).map((r) => { const [id, name, n] = r.split("\t"); return { id, name, n: +n }; });
  if (l3s.length >= 2) l2s.push({ ...l2, l3s });
}
const estCost = (l2s.reduce((s, x) => s + x.l3s.length, 0) * SAMPLE * 12 / 1e6) * 5 + (l2s.length * 500 / 1e6) * 25;
console.error(`L2-sid ≥2 L3-ga: ${l2s.length} · L3 kokku: ${l2s.reduce((s, x) => s + x.l3s.length, 0)} · ~$${estCost.toFixed(2)}`);
if (ESTIMATE) { console.log("(--estimate)"); process.exit(0); }

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub."); process.exit(2); }
const USAGE = { in: 0, out: 0 };

async function judgeL2(l2) {
  const blocks = l2.l3s.map((l3) => {
    const prods = q(`SELECT left(p.title,70) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
      WHERE pcp.product_category_id='${l3.id}' ORDER BY p.title LIMIT ${SAMPLE};`).split("\n").filter(Boolean);
    return `### ${l3.id} = "${l3.name}" (${l3.n} toodet)\n${prods.join("\n")}`;
  }).join("\n\n");
  const prompt = `L2 "${l2.name}" sisaldab neid kõrvuti-L3-sid. Kas mõni PAAR on TEGELIKULT SAMA TÜÜP (VARIANT), mis peaks olema ÜKS L3 (üle-fragmenteerimine)?
- VARIANT (→ MERGE): sama FUNKTSIOON, erineb ainult vorm/kinnitus/suurus/materjal/energiaallikas. Nt lae- vs seinaventilaator (mõlemad liigutavad õhku) · tornventilaator vs põrandaventilaator (mõlemad õhuvool) · päikese- vs võrguventilaator · pitsakivi vs pitsateras (mõlemad küpsetuspind).
- ERI TÜÜP (→ jäta lahku, ÄRA soovita): funktsioon VÕI VÄLJUND erineb. Nt helbejäämasin vs kuubikjäämasin (helbejää kala katteks; kuubik jookidesse — EI vahetatav) · õhuniisuti (niiskus) vs jahuti (temp) · pott (keetmine) vs küpsetusvorm (ahi) · kaminatööriist (hooldus) vs tuhaämber (jäätmed).
- 🎯 VÄLJUND-TEST: "kas toode A saab asendada toote B, sama tulemus?" JAH → variant (merge). EI → eri tüüp (jäta lahku).
Loe title_en SISU, mitte nime. Ole KONSERVATIIVNE — soovita merge AINULT kui päriselt sama funktsioon.

${blocks}

Vasta AINULT JSON-massiiviga (tühi [] kui merge-paare pole):
[{"l3_a":"pcat_...","l3_b":"pcat_...","confidence":"korge"|"kesk","reason":"miks sama tüüp"}]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, thinking: { type: "adaptive" }, output_config: { effort: "low" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  if (data.usage) { USAGE.in += data.usage.input_tokens || 0; USAGE.out += data.usage.output_tokens || 0; }
  const txt = (data.content.find((b) => b.type === "text") || {}).text || "";
  const m = txt.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("JSON puudub: " + txt.slice(0, 120));
  return JSON.parse(m[0]);
}

// WHITELIST — kinnitatud EI-MERGE paarid (WARN ei kordu). Võti: sorteeritud id-paar.
let WL = new Set();
try { const w = JSON.parse(fs.readFileSync(resolve(HERE, "merge-whitelist.json"), "utf8")); (w.pairs || []).forEach((p) => WL.add([p.a, p.b].sort().join("|"))); } catch {}

const nm = {}; l2s.forEach((l2) => l2.l3s.forEach((l3) => { nm[l3.id] = l3.name; }));
const cands = [];
let wlSkipped = 0;
for (let i = 0; i < l2s.length; i++) {
  try {
    const r = await judgeL2(l2s[i]);
    for (const p of r) if (p.l3_a && p.l3_b) {
      if (WL.has([p.l3_a, p.l3_b].sort().join("|"))) { wlSkipped++; continue; } // whitelistitud → vahele
      cands.push({ ...p, l2: l2s[i].name, a_name: nm[p.l3_a] || p.l3_a, b_name: nm[p.l3_b] || p.l3_b });
    }
    console.error(`  [${i + 1}/${l2s.length}] ${l2s[i].name} → ${r.length} merge`);
  } catch (e) { console.error(`  ${l2s[i].name} VIGA: ${e.message}`); }
}

const stamp = new Date().toISOString().slice(0, 10);
fs.writeFileSync("/opt/eumotors-tasks/reports/merge-verdiktid.json", JSON.stringify({ generated: stamp, model: MODEL, candidates: cands }, null, 1));
const conf = (c) => ({ korge: "🔴 kõrge", kesk: "🟠 kesk" }[c] || c);
const L = ["# MERGE-KANDIDAADID — üle-fragmenteerimise detektor\n", `**${stamp} · ${MODEL}** · merge-paare: **${cands.length}**\n`,
  cands.length ? "| L2 | L3 A + L3 B | kindlus | põhjendus |\n|---|---|---|---|" : "_Ei leidnud merge-kandidaate — L3-d on eri tüüpi (õigesti splititud)._",
  ...cands.sort((a, b) => (a.confidence === "korge" ? -1 : 1) - (b.confidence === "korge" ? -1 : 1)).map((c) => `| ${c.l2} | ${c.a_name} + ${c.b_name} | ${conf(c.confidence)} | ${(c.reason || "").slice(0, 60)} |`)];
fs.writeFileSync("/opt/eumotors-tasks/reports/merge-kandidaadid.md", L.join("\n"));
const cost = (USAGE.in / 1e6) * 5 + (USAGE.out / 1e6) * 25;
console.log(`\n🔀 MERGE-kandidaate: ${cands.length}${wlSkipped ? ` (+${wlSkipped} whitelistitud vahele)` : ""}. Raport: reports/merge-kandidaadid.md`);
console.log(`💰 input ${USAGE.in} · output ${USAGE.out} · ~$${cost.toFixed(4)}`);
