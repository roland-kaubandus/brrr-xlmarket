#!/usr/bin/env node
/**
 * a2-semantics.mjs — A2 jagamis-semantika klassifikaator (Tarmo 2026-11-18).
 *   Iga 26 splitHold-allika kohta otsustab: PÕHISEADE jääb allikasse (core + ümbernimetus) vs
 *   alamkontseptsioonid lahkuvad uute L3-dena (subs). Kasutab scripts/lib/split-semantics.mjs (HARD RULE #5).
 *   READ-ONLY (ei DB-kirjutust, ei lukku). Väljund: reports/A2-semantika.{json,md}.
 *
 * KÄSK: set -a; . /opt/eumotors-tasks/.env; set +a; node scripts/a2-semantics.mjs
 */
import fs from "node:fs";
import { classifySplitSemantics } from "./lib/split-semantics.mjs";

const REPO = "/opt/xlmarket-github";
const ASSIGN = `${REPO}/reports/a2-assign.json`;
const OUT_JSON = `${REPO}/reports/A2-semantika.json`;
const OUT_MD = `${REPO}/reports/A2-semantika.md`;
const MODEL = "claude-opus-4-8";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub"); process.exit(2); }

let usage = { in: 0, out: 0, calls: 0 };
async function caller(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const jr = await res.json();
  if (jr.usage) { usage.in += jr.usage.input_tokens || 0; usage.out += jr.usage.output_tokens || 0; usage.calls++; }
  const raw = (jr.content || []).find(c => c.type === "text")?.text || "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`JSON puudub: ${raw.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

const j = JSON.parse(fs.readFileSync(ASSIGN, "utf8"));
const holds = j.results.filter(r => !r.error).map(r => ({ r, a: j.analysis.find(x => x.id === r.id) })).filter(x => x.a && x.a.splitHolds);

function groupTitles(assign) {
  const g = {};
  for (const it of assign) (g[it.target] ||= []).push(it.title);
  return g;
}

(async () => {
  console.log(`🧩 A2 jagamis-semantika — ${holds.length} allikat (${MODEL}, read-only)\n`);
  const out = [];
  for (const { r, a } of holds) {
    const gt = groupTitles(r.assign);
    const keepSample = (r.assign.filter(it => it.target === "__KEEP__" || it.confidence < 0) || []).map(it => it.title);
    const input = {
      sourceId: r.id, sourceName: r.name, l2name: a.l2id, THR: a.THR,
      viable: a.viable, keepN: a.keepN || 0, keepSample, groupTitles: gt,
    };
    process.stdout.write(`  • «${r.name}» (${a.viable.length} rühma) … `);
    let res;
    try { res = await classifySplitSemantics(caller, input); }
    catch (e) { console.log(`✗ ${e.message}`); out.push({ id: r.id, name: r.name, error: e.message }); continue; }
    console.log(`core=${res.core ? "«" + res.core + "»" : "(allikas ise)"} · subs=${res.subs.length}${res.cancel ? " · CANCEL" : ""}${res.rename ? ` · rename→«${res.rename.name_et}»${res.rename.change_handle ? " [URL]" : ""}` : ""}`);
    out.push({ id: r.id, name: r.name, l2id: a.l2id, THR: a.THR, viable: a.viable, keepN: a.keepN || 0, ...res });
  }

  const nowIso = new Date().toISOString();
  fs.writeFileSync(OUT_JSON, JSON.stringify({ generated_at: nowIso, model: MODEL, usage, results: out }, null, 2));

  // --- MD ülevaade ---
  const cancels = out.filter(o => o.cancel && !o.error);
  const splits = out.filter(o => !o.cancel && !o.error);
  const renames = splits.filter(o => o.rename);
  let totSubs = 0;
  let md = `# A2 JAGAMIS-SEMANTIKA — PÕHISEADE JÄÄB / ALAMKONTSEPTSIOONID LAHKUVAD\n\n`;
  md += `> ${nowIso} · \`scripts/a2-semantics.mjs\` + \`scripts/lib/split-semantics.mjs\` · ${MODEL} · ~$${((usage.in / 1e6) * 5 + (usage.out / 1e6) * 25).toFixed(2)} · READ-ONLY\n\n`;
  md += `**Reegel:** põhiseade/domineeriv JÄÄB allika-L3-sse (vajadusel ümbernimetus → 301); AINULT tarvikud/varuosad/eri-tooteliik → uued L3-d allika kõrvale.\n\n`;
  md += `## ✅ JAGAMINE KEHTIB uue semantikaga: ${splits.length}\n\n`;
  md += `| Allikas (JÄÄB) | → ümbernimetus | Uued L3-d (LAHKUVAD) |\n|---|---|---|\n`;
  for (const o of splits) {
    totSubs += o.subs.length;
    const stays = o.core ? `jääb: «${o.core}» + muu` : `jääb: allika üldosa`;
    const rn = o.rename ? `«${o.rename.name_et}»${o.rename.change_handle ? " 🔗301" : ""}` : "—";
    md += `| **${o.name}** (${stays}) | ${rn} | ${o.subs.map(s => `«${s}»`).join(" + ")} |\n`;
  }
  md += `\n**Kokku: ${splits.length} allikat → ${totSubs} uut L3** (${renames.length} allikat ümbernimetatakse).\n\n`;
  if (cancels.length) {
    md += `## ⛔ JAGAMINE TÜHISTUB (ainult põhiseade, 0 lahkuvat alamkontseptsiooni) — allikas jääb terveks: ${cancels.length}\n\n`;
    for (const o of cancels) md += `- **${o.name}** \`${o.id}\` — ${o.reasoning}\n`;
    md += `\n`;
  }
  const errs = out.filter(o => o.error);
  if (errs.length) { md += `## 🛑 VEAD: ${errs.length}\n${errs.map(o => `- ${o.name}: ${o.error}`).join("\n")}\n\n`; }
  md += `## Põhjendused\n\n`;
  for (const o of splits) md += `- **${o.name}**: ${o.reasoning}\n`;
  fs.writeFileSync(OUT_MD, md);

  console.log(`\n${"█".repeat(50)}`);
  console.log(`✅ ${splits.length} jagamist (→ ${totSubs} uut L3) · ⛔ ${cancels.length} tühistub · ${renames.length} ümbernimetust`);
  console.log(`💾 ${OUT_JSON} + ${OUT_MD} · ~$${((usage.in / 1e6) * 5 + (usage.out / 1e6) * 25).toFixed(2)}`);
})().catch(e => { console.error("🛑 FATAAL: " + String(e.stack || e.message)); process.exit(1); });
