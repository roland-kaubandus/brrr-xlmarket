#!/usr/bin/env node
/**
 * classify-chain-dryrun.mjs — B-klassifikaatori otsustusahela ETAPP 1 DRY-run.
 *
 * Spec: reports/b-klassifikaator-taisautomaatika-spets.md §2c + §4 + §10 (ETAPP 1 AINULT).
 * EI kirjuta DB-sse, EI deploy'i, EI loo päris L3-sid. Ainult simulatsioon + raport.
 *
 * Ahela-loogika elab nüüd SSoT-moodulis `scripts/lib/classify-chain.mjs` (createChain).
 * See skript = õhuke kutsuja: laeb CACHED judge+ref verdiktid, ehitab klastrid, kutsub resolveChain.
 * Sama moodulit kutsub öine hook `pipeline-classify-chain.mjs` (live judge+ref). HARD RULE #5.
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a   # ANTHROPIC_API_KEY (väärtust EI logi)
 *   node scripts/classify-chain-dryrun.mjs --out reports/classify-chain-dryrun-v2.json [--fresh]
 */
import fs from "node:fs";
import { createChain } from "./lib/classify-chain.mjs";

const REPO = "/opt/xlmarket-github";
const SCRATCH = "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const val = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d; };
const FRESH = process.argv.includes("--fresh");
const OUT = val("--out", `${REPO}/reports/classify-chain-dryrun-v2.json`);
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

// ---- andmed ----
const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8"));
const NODES = tree.nodes;
const rows = JSON.parse(fs.readFileSync(`${SCRATCH}/calib-rows.json`, "utf8"));           // judge+ref verdiktid (40)
const classify = JSON.parse(fs.readFileSync(`${REPO}/storefront/public/xl-admin/calib-classify.json`, "utf8")); // kohtuniku täisotsus + considered_l3s

const judgeByCk = {};
for (const d of classify.decisions) { if (!judgeByCk[d.cluster_key]) judgeByCk[d.cluster_key] = d.judge; }

// ---- klastrite koostamine (cached judge+ref verdiktidest) ----
const clustersMap = {};
for (const r of rows) (clustersMap[r.ck] ||= []).push(r);
const clusters = Object.entries(clustersMap).map(([ck, items]) => {
  const j = judgeByCk[ck] || {};
  const judgeTarget = items[0].jt || j.target_handle || null;
  const refTarget = items[0].rt || null;
  const candidates = (j.considered_l3s || []).slice();
  if (judgeTarget && !candidates.includes(judgeTarget)) candidates.unshift(judgeTarget);
  if (refTarget && !candidates.includes(refTarget)) candidates.push(refTarget);
  return {
    ck, n: items.length, items, titles: items.map(i => i.title),
    judgeAction: items[0].judge, judgeTarget, refAction: items[0].ref, refTarget,
    refReason: items.find(i => i.rr)?.rr || "",
    judgeNewL3Name: j.new_l3_name || null, judgeParentL2: j.parent_l2_handle || null, candidates,
  };
});

// ---- vahemälu (dryrun: faili-põhine) ----
const CACHE = `${REPO}/reports/classify-chain-fable-cache.json`;
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch {}
if (!cache.__v2) {   // migratsioon: vana skeem {ck: verdict} → vote:ck:0
  const mig = { __v2: true };
  for (const [k, v] of Object.entries(cache)) if (v && v.action) mig[`vote:${k}:0`] = v;
  cache = mig;
}
const saveCache = (c) => fs.writeFileSync(CACHE, JSON.stringify(c, null, 2));

// ---- ahel (SSoT-moodul) ----
const chain = createChain({ nodes: NODES, apiKey: API_KEY, cache, fresh: FRESH, onCacheSave: saveCache });
const results = await chain.resolveChain(clusters);
const fableUsage = chain.fableUsage;

// ---- müügis vs nähtamatu ----
let muugis = 0, nahtamatu = 0;
for (const r of results) {
  const dec = r.decisionFinal || r.decision;
  if (dec && dec.startsWith("NÄHTAMATU")) nahtamatu += r.n; else muugis += r.n;
}

// ---- väljund ----
const newl3Final = results.filter(r => (r.decisionFinal || r.decision) === "new_l3");
const summary = {
  generated_at: new Date().toISOString(), dry: true,
  clusters: results.length, products: rows.length,
  fable_calls: fableUsage.calls, fable_usage: fableUsage,
  fable_cost_usd: +((fableUsage.input / 1e6) * 10 + (fableUsage.output / 1e6) * 50).toFixed(4),
  muugis, nahtamatu,
  new_l3_created: newl3Final.length,
  new_l3_names: newl3Final.map(r => ({ ck: r.ck, name: r.finalName || r.newName, parentL2: r.parentL2, n: r.n, origin: r.newOrigin })),
};
const clean = results.map(({ _cluster, ...r }) => r);
fs.writeFileSync(OUT, JSON.stringify({ summary, clusters: clean }, null, 2));

// ---- konsool ----
console.log("\n═══ ETAPP 1 DRY-RUN v2 — asümmeetriline kindlus + nimevärav ═══\n");
for (const r of clean) {
  console.log(`▸ ${r.ck}  ×${r.n}  [${r.path}]`);
  console.log(`   "${r.titles[0].slice(0, 58)}"`);
  console.log(`   kohtunik: ${r.judge}   referents: ${r.ref}`);
  for (const fv of r.fableVotes) console.log(`   Fable[${fv.role}]: ${fv.v}`);
  if (r.vote3) console.log(`   3×-hääletus: ${r.vote3}`);
  console.log(`   → OTSUS: ${r.decisionFinal || r.decision}`);
  if (r.signal) console.log(`   ⚑ signaal kogub (§5)${r.fallbackReason ? " — " + r.fallbackReason : ""}`);
  if (r.gate) {
    console.log(`   VÄRAV: ${r.gate.allPass ? "✅ KÕIK OK" : "🛑 BLOKK: " + r.gate.blocking.join(", ")}  ${Object.entries(r.gate.gates).map(([k, g]) => `${k}=${g.pass === null ? "—" : g.pass ? "✓" : "✗"}`).join(" ")}`);
    if (r.gate.gates.name?.attempts?.length) for (const a of r.gate.gates.name.attempts) console.log(`      nimi «${a.name}» → ${a.ok ? "✓ selge" : "✗ " + (a.reason || "")}${a.proposed ? "  ⇒ pakub «" + a.proposed + "»" : ""}`);
  }
  console.log("");
}
console.log("─────────────────────────────────────────────");
console.log(`Fable kutseid: ${summary.fable_calls}  (in ${fableUsage.input} / out ${fableUsage.output} tok, ~$${summary.fable_cost_usd})`);
console.log(`UUS L3 loodaks: ${summary.new_l3_created}`);
for (const n of summary.new_l3_names) console.log(`   • «${n.name}» (${n.origin}) ×${n.n} → ${n.parentL2}`);
console.log(`MÜÜGIS: ${muugis}   NÄHTAMATU: ${nahtamatu}  (kokku ${rows.length})`);
console.log(`💾 ${OUT}`);
