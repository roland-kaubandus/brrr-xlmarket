#!/usr/bin/env node
/**
 * a2-assign.mjs — A2 toote-tasandi ASSIGNMENT + KONTSEPTSIOONITEST (Tarmo 2026-11-18).
 *
 * a2-revised.json annab per L3 pakutud uued L3-nimed (loendid = HINNANG). SEE skript teeb PÄRIS
 * assignmendi: iga allika-L3 iga toode → täpselt üks siht:
 *   - üks "kept" uus L3-nimi (toode sobib selle kontseptsiooniga), VÕI
 *   - "__DEVICE__" (väike tarvik → sulatatakse põhi-seadme L3-sse), VÕI
 *   - "__KEEP__" (ei sobi ühegi uue L3 nimega → jääb vanemasse allika-L3-sse).
 *
 * KONTSEPTSIOONITEST = assignment ise: mudel paneb toote uude L3-sse AINULT kui toode sobib selle
 *   NIMEGA. __KEEP__ = kõrvalekalle (toode ei sobinud). Madal kindlus (<0.7) = lipp.
 *
 * PÄRIS-LOENDURITEL re-rakendab läve: kui "kept" uus L3 saab reaalselt < THR toodet → see ei ole
 *   elujõuline (selle tooted → __KEEP__). Kui < 2 elujõulist uut L3 jääb → KOGU jagamine KUKUB (report).
 *
 * READ-ONLY: loeb DB (tooted) + kutsub API. EI kirjuta DB-sse. Väljund: reports/a2-assign.json + -REPORT.md.
 *
 * Kasutus: set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/a2-assign.mjs [--only pcat_xxx,pcat_yyy] [--conc 6]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const ONLY = (arg("--only", "") || "").split(",").map(s => s.trim()).filter(Boolean);
const CONC = parseInt(arg("--conc", "6"), 10);
const EXCLUDE = new Set(["pcat_t3f_6_2"]); // Plekikäärid — Tarmo: välja (misfitid eraldi)

const REVISED = path.join(ROOT, "reports", "a2-revised.json");
const OUT = path.join(ROOT, "reports", "a2-assign.json");
const REPORT = path.join(ROOT, "reports", "a2-assign-REPORT.md");

const API_URL = "https://api.anthropic.com/v1/messages";
const API_KEY = (() => {
  try { return fs.readFileSync("/opt/eumotors-tasks/.env", "utf8").split("\n").find(l => l.startsWith("ANTHROPIC_API_KEY="))?.split("=").slice(1).join("=").replace(/^["']|["']$/g, "").trim(); }
  catch { return process.env.ANTHROPIC_API_KEY; }
})();
const MODEL = "claude-opus-4-8";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const dbC = () => execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" })
  .split("\n").find((n) => n.startsWith("db-k33g")).trim();
function psqlRows(sql) {
  return execFileSync("docker", ["exec", "-i", dbC(), "psql", "-U", "xlmarket", "-d", "xlmarket",
    "-tA", "-F", "\t", "-v", "ON_ERROR_STOP=1", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 1 << 28 })
    .trim().split("\n").filter(Boolean).map(l => l.split("\t"));
}

const SYSTEM = `Oled eesti e-kaubanduse tootekategoriseerija xlmarket.ee jaoks.
Sulle antakse ÜHE allika-kategooria (L3) tooted ja NIMEKIRI uutest L3-nimedest, milleks see kategooria jagatakse.

Sinu ülesanne: paiguta IGA toode TÄPSELT ühte sihti:
  - üks etteantud uutest L3-nimedest — AINULT kui toode selgelt SOBIB selle nime kontseptsiooniga;
  - "__DEVICE__" — kui toode on väike VARUOSA/TARVIK põhi-seadmele (antakse device-nimi);
  - "__KEEP__" — kui toode EI sobi ühegi pakutud uue L3 nimega (jääb vanemasse kategooriasse).

RANGE KONTSEPTSIOONITEST: pane toode uue L3 alla AINULT kui toote ENDA tüüp vastab selle L3 nimele.
Ära venita nime, et toodet mahutada. Kahtluse korral → "__KEEP__". Misfit (hoopis teine tootetüüp) → "__KEEP__".
confidence 0..1 = kui kindel oled sihis.

Vasta AINULT JSON-skeemis. Iga sisend-product_id peab tulema väljundisse täpselt üks kord.`;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          target: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["product_id", "target", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

function userMsg(rec, products) {
  const targets = rec.kept.map(k => `  - "${k.newl3}"`).join("\n");
  const devLine = rec.device ? `\nPÕHI-SEADE (tarvikute sulatus-siht, kasuta "__DEVICE__"): "${rec.device}"` : "";
  const lines = products.map(p => `- product_id=${p.id} | "${String(p.title).slice(0, 150)}"`).join("\n");
  return `Allika-L3: "${rec.name}" (${rec.n} toodet).
Uued L3-nimed (sihid):
${targets}${devLine}

Tooted (paiguta igaüks):
${lines}`;
}

async function callModel(rec, products) {
  const body = {
    model: MODEL, max_tokens: 8000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg(rec, products) }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  };
  for (let attempt = 1; attempt <= 5; attempt++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 180000);
    try {
      const r = await fetch(API_URL, {
        method: "POST", signal: ctrl.signal,
        headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        if ((r.status === 429 || r.status === 529 || r.status >= 500) && attempt < 5) { clearTimeout(to); await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue; }
        clearTimeout(to); throw new Error(`API ${r.status}: ${t.slice(0, 200)}`);
      }
      const j = await r.json();
      clearTimeout(to);
      const txt = (j.content.find(b => b.type === "text") || {}).text || "{}";
      return { parsed: JSON.parse(txt), usage: j.usage };
    } catch (e) {
      clearTimeout(to);
      if (attempt < 5) { await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue; }
      throw e;
    }
  }
  throw new Error("retries exhausted");
}

async function runPool(thunks, n) {
  const out = new Array(thunks.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, thunks.length) }, async () => {
    while (i < thunks.length) { const idx = i++; out[idx] = await thunks[idx](); }
  }));
  return out;
}

async function main() {
  let recs = JSON.parse(fs.readFileSync(REVISED, "utf8")).filter(r => !EXCLUDE.has(r.id));
  if (ONLY.length) recs = recs.filter(r => ONLY.includes(r.id));
  console.error(`[a2-assign] ${recs.length} allika-L3 (Plekikäärid välja), mudel ${MODEL}, conc ${CONC}`);

  // tooted per L3
  const ids = recs.map(r => `'${r.id}'`).join(",");
  const prodRows = psqlRows(`
    SELECT pcp.product_category_id, p.id, p.title
    FROM product_category_product pcp
    JOIN product p ON p.id=pcp.product_id
    WHERE pcp.product_category_id IN (${ids}) AND p.status='published' AND p.deleted_at IS NULL
    ORDER BY pcp.product_category_id, p.title;`);
  const byL3 = new Map();
  for (const [cid, pid, title] of prodRows) { if (!byL3.has(cid)) byL3.set(cid, []); byL3.get(cid).push({ id: pid, title }); }

  let totSpendIn = 0, totSpendOut = 0;
  const thunks = recs.map(rec => async () => {
    const products = byL3.get(rec.id) || [];
    if (!products.length) return { rec, products: [], assign: [], error: "0 toodet DB-s" };
    try {
      const { parsed, usage } = await callModel(rec, products);
      totSpendIn += usage?.input_tokens || 0; totSpendOut += usage?.output_tokens || 0;
      const map = new Map(parsed.items.map(it => [it.product_id, it]));
      const assign = products.map(p => {
        const it = map.get(p.id);
        return { product_id: p.id, title: p.title, target: it?.target || "__KEEP__", confidence: it?.confidence ?? 0 };
      });
      return { rec, products, assign };
    } catch (e) { return { rec, products, assign: [], error: e.message }; }
  });
  const results = await runPool(thunks, CONC);

  // analüüs: päris-loendid, läve re-rakendus, kõrvalekalded
  const validTargets = (rec) => new Set(rec.kept.map(k => k.newl3));
  const analysis = results.map(res => {
    const { rec, assign, error } = res;
    if (error) return { id: rec.id, name: rec.name, error };
    const vset = validTargets(rec);
    const counts = {}; // newl3 → n
    let keepN = 0, deviceN = 0, lowConf = 0, invalidTarget = 0;
    const lowConfItems = [], keepItems = [];
    for (const a of assign) {
      if (a.confidence < 0.7) { lowConf++; lowConfItems.push(a); }
      if (a.target === "__KEEP__") { keepN++; keepItems.push(a); continue; }
      if (a.target === "__DEVICE__") { deviceN++; continue; }
      if (!vset.has(a.target)) { invalidTarget++; keepN++; keepItems.push({ ...a, note: "tundmatu-siht→KEEP" }); continue; }
      counts[a.target] = (counts[a.target] || 0) + 1;
    }
    // elujõulised uued L3 (päris ≥ THR)
    const viable = Object.entries(counts).filter(([, n]) => n >= rec.THR).map(([newl3, n]) => ({ newl3, n }));
    const belowThr = Object.entries(counts).filter(([, n]) => n < rec.THR).map(([newl3, n]) => ({ newl3, n }));
    const splitHolds = viable.length >= 2;
    return {
      id: rec.id, name: rec.name, l2id: rec.l2id, THR: rec.THR, device: rec.device,
      total: assign.length, counts, viable, belowThr, keepN, deviceN, lowConf, invalidTarget,
      splitHolds, keepItems, lowConfItems,
    };
  });

  fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), model: MODEL,
    spend: { in: totSpendIn, out: totSpendOut }, results: results.map(r => ({ id: r.rec.id, name: r.rec.name,
      l2id: r.rec.l2id, THR: r.rec.THR, device: r.rec.device, kept: r.rec.kept, error: r.error || null,
      assign: r.assign })), analysis }, null, 2));

  // REPORT.md
  const L = [`# A2 ASSIGNMENT + KONTSEPTSIOONITEST\n`,
    `**${new Date().toISOString().slice(0, 10)} · ${MODEL} · ~$${((totSpendIn * 5 + totSpendOut * 25) / 1e6).toFixed(2)} · READ-ONLY**\n`,
    `> Iga toode → kept uus L3 / __DEVICE__ (tarvik→põhiseade) / __KEEP__ (ei sobi, jääb vanemasse).`,
    `> Jagamine KEHTIB kui ≥2 uut L3 saavad päriselt ≥ THR toodet. Kõrvalekalded = __KEEP__ + madal-kindlus + tundmatu-siht.\n`];
  const holds = analysis.filter(a => !a.error && a.splitHolds);
  const broke = analysis.filter(a => !a.error && !a.splitHolds);
  const errs = analysis.filter(a => a.error);
  L.push(`## ✅ JAGAMINE KEHTIB päris-loenduril: ${holds.length}\n`);
  for (const a of holds) {
    L.push(`### ${a.name} \`${a.id}\` · ${a.total}t · THR ${a.THR}`);
    L.push(`- **Uued L3 (päris):** ${a.viable.map(v => `${v.newl3} (${v.n})`).join(" + ")}`);
    if (a.belowThr.length) L.push(`- ⚠️ alla THR (→ jäävad vanemasse): ${a.belowThr.map(v => `${v.newl3} (${v.n})`).join(", ")}`);
    if (a.deviceN) L.push(`- tarvikud→põhiseade (${a.device}): ${a.deviceN}`);
    if (a.keepN) L.push(`- 🚩 __KEEP__ (ei sobinud, jääb vanemasse): ${a.keepN}${a.invalidTarget ? ` (sh ${a.invalidTarget} tundmatu-siht)` : ""}`);
    if (a.lowConf) L.push(`- 🟠 madal kindlus (<0.7): ${a.lowConf}`);
    L.push("");
  }
  if (broke.length) {
    L.push(`\n## ❌ JAGAMINE KUKUB (päris-loendur < 2 elujõulist uut L3): ${broke.length}\n`);
    for (const a of broke) L.push(`- **${a.name}** \`${a.id}\`: elujõulisi ${a.viable.length} (${a.viable.map(v => `${v.newl3}:${v.n}`).join(", ") || "—"}); KEEP ${a.keepN}, alla-THR ${a.belowThr.map(v => `${v.newl3}:${v.n}`).join(",") || "—"}`);
  }
  if (errs.length) { L.push(`\n## ⚠️ VEAD: ${errs.length}\n`); for (const a of errs) L.push(`- ${a.name} \`${a.id}\`: ${a.error}`); }
  fs.writeFileSync(REPORT, L.join("\n"));

  console.error(`✅ kehtib ${holds.length} · kukub ${broke.length} · vead ${errs.length}`);
  console.error(`   kõrvalekalded kokku: KEEP ${analysis.reduce((s, a) => s + (a.keepN || 0), 0)} · madal-kindlus ${analysis.reduce((s, a) => s + (a.lowConf || 0), 0)}`);
  console.error(`   → ${OUT}\n   → ${REPORT}`);
  console.error(`   kulu ~$${((totSpendIn * 5 + totSpendOut * 25) / 1e6).toFixed(2)} (in ${totSpendIn}, out ${totSpendOut})`);
}
main();
