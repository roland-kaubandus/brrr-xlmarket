#!/usr/bin/env node
/**
 * neighbor-reeval.mjs — NAABRITE ÜLEHINDAMINE uue L3 sünnil (spets: reports/naabrite-ulehindamine-spets.md).
 *
 * Idee: kui L3 H sünnib (või on äsja-tühi), hinda üle NAABER-L3-de tooted — kas mõni kuulub H-sse
 * PARIMAKS koduks (move, mitte dual-home). Sama classify-chain.mjs ahel, kitsas kandidaat-list {H} ∪ naabrid.
 *
 * ESIMENE TESTJUHTUM: 9 tühja standalone L3 (ETAPP 2 audit) = "äsja-sündinud tühi kodu".
 *
 * DRY vaikimisi (--execute lülitab päris-liigutuse, PRAEGU EI ole implementeeritud → ainult DRY+shadow-logi).
 * Käsk:  set -a; . /opt/eumotors-tasks/.env; set +a; node scripts/neighbor-reeval.mjs [--k 20] [--topcl 30] [--cap 20]
 *
 * Sisend: scratchpad/audit-clusters.json (D.clusters/.candidateL3s/.l3meta) + category-tree.generated.json (NODES).
 * Väljund: reports/naabrite-ulehindamine-dry.md + scratchpad/neighbor-reeval.json.
 */
import fs from "node:fs";
import { judgeClassifyClusters, rateClassifyReferenceClusters } from "./lib/judge.mjs";
import { createChain } from "./lib/classify-chain.mjs";

const REPO = "/opt/xlmarket-github";
const SP = process.env.SP || "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? +process.argv[i + 1] : d; };
const K_SEM = arg("--k", 20);          // semantilisi naaber-L3
const TOP_CL = arg("--topcl", 30);     // kui palju kõige-lähedasemaid klastreid per tühi-L3 ahelasse
const CAP = arg("--cap", 25);          // kulu-lagi $
const CHUNK = 20;

const D = JSON.parse(fs.readFileSync(`${SP}/audit-clusters.json`, "utf8"));
const NODES = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8")).nodes;
const R = JSON.parse(fs.readFileSync(`${SP}/etapp2-results.json`, "utf8"));
const LIMIT = arg("--limit", 99);
const EMPTY = R.emptyRes.filter((e) => e.decision === "standalone").map((e) => e.handle).slice(0, LIMIT);

const L3META = D.l3meta;                       // handle → {name, desc, l2, l2name}
const CL_BY_L3 = new Map();                    // currentL3 → [clusters]
for (const c of D.clusters) { if (!c.currentL3) continue; (CL_BY_L3.get(c.currentL3) || CL_BY_L3.set(c.currentL3, []).get(c.currentL3)).push(c); }

// ── naabrus-helperid ──
const parentL2of = (h) => L3META[h]?.l2 || null;
const L2SIBS = {}; for (const h of Object.keys(L3META)) { const p = L3META[h].l2; if (p) (L2SIBS[p] ||= []).push(h); }
// L2 → L1 (NODES: handle → {parent_handle, level})
const l1ofL2 = (l2h) => NODES[l2h]?.parent_handle || null;
const L2_BY_L1 = {}; for (const h of Object.keys(NODES)) { const n = NODES[h]; if (n.level === 2) (L2_BY_L1[n.parent_handle] ||= []).push(h); }

function grams(s) {
  s = " " + String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9äöüõ ]/g, " ").replace(/\s+/g, " ").trim() + " ";
  const g = new Set(); for (let i = 0; i < s.length - 2; i++) g.add(s.slice(i, i + 3)); return g;
}
const L3GRAMS = {}; for (const h of Object.keys(L3META)) L3GRAMS[h] = grams(`${L3META[h].name} ${L3META[h].desc || ""}`);
function simSets(a, b) { if (!a.size || !b.size) return 0; let inter = 0; for (const x of a) if (b.has(x)) inter++; return inter / (a.size + b.size - inter); }

// struktuurne naabrus: sama L2 + sama L1 all õe-L2-de L3-d
function structuralNeighbors(H) {
  const l2 = parentL2of(H); const set = new Set();
  for (const h of (L2SIBS[l2] || [])) set.add(h);
  const l1 = l1ofL2(l2);
  for (const sibL2 of (L2_BY_L1[l1] || [])) for (const h of (L2SIBS[sibL2] || [])) set.add(h);
  set.delete(H); return set;
}
// semantiline naabrus: top-K L3 H-profiili trigram-lähedusel
function semanticNeighbors(H, k) {
  const hg = L3GRAMS[H];
  return Object.keys(L3META).filter((h) => h !== H)
    .map((h) => ({ h, s: simSets(hg, L3GRAMS[h]) }))
    .sort((a, b) => b.s - a.s).slice(0, k).map((x) => x.h);
}

// ── ahela-abi (sama muster kui catalog-audit.mjs) ──
function buildItems(c) {
  return (c.titles?.length ? c.titles : [c.rep.title]).map((t, i) => ({
    id: `${c.ck}#${i}`, title: t,
    title_et: i === 0 ? c.rep.title_et : "", description: i === 0 ? c.rep.description : "",
    bucket: "nbr", meta: { vevor_product_type: c.rep.vpt },
  }));
}
const parseAssignHandle = (dec) => {
  if (!dec) return null;
  if (dec.startsWith("assign:")) return dec.slice(7).replace(/\s*\(.*$/, "").trim();
  if (dec.startsWith("LCA-müügis:")) return dec.replace(/^LCA-müügis:\s*/, "").replace(/\s*\(L\d\)\s*$/, "").replace(/-muud$/, "").trim();
  return null;
};

const COST = { usd: 0 };
const PRICE = { "claude-opus-4-8": { i: 5, o: 25 }, "claude-sonnet-5": { i: 3, o: 15 }, "claude-fable-5": { i: 10, o: 50 } };
const addUsage = (m, u) => { const p = PRICE[m]; if (p && u) COST.usd += ((u.input_tokens || 0) * p.i + (u.output_tokens || 0) * p.o) / 1e6; };

// Jooksuta ahel klastri-alamhulgal kitsa kandidaat-listiga; tagasta map ck → {decisionHandle, path, signal}
async function runChainNarrow(clusters, cands) {
  const out = new Map();
  for (let i = 0; i < clusters.length; i += CHUNK) {
    if (COST.usd > CAP) { console.error(`🛑 KULU-LAGI $${CAP} ületatud ($${COST.usd.toFixed(2)})`); break; }
    const slice = clusters.slice(i, i + CHUNK);
    const jClusters = slice.map((c) => ({ cluster_key: c.ck, items: buildItems(c) }));
    const jr = await judgeClassifyClusters(jClusters, cands, { apiKey: KEY });
    if (jr.ok) addUsage("claude-opus-4-8", jr.usage);
    const rr = jr.ok ? await rateClassifyReferenceClusters(jClusters, cands, { apiKey: KEY }) : { ok: false };
    if (rr.ok) addUsage("claude-sonnet-5", rr.usage);
    if (!jr.ok || !rr.ok) { for (const c of slice) out.set(c.ck, { decisionHandle: null, path: "VIGA:ahel-kukkus", failed: true }); continue; }
    const jByKey = new Map((jr.results || []).map((r) => [r.cluster_key, r]));
    const rByKey = new Map((rr.results || []).map((r) => [r.cluster_key, r]));
    const CHAIN_ACTIONS = new Set(["assign_existing", "new_l3"]);
    const chainClusters = [];
    for (const c of slice) {
      const jv = jByKey.get(c.ck); const rv = rByKey.get(c.ck);
      if (!jv || !CHAIN_ACTIONS.has(jv.action)) { out.set(c.ck, { decisionHandle: null, path: jv ? `kohtunik=${jv.action}` : "otsuseta" }); continue; }
      const judgeTarget = jv.target_handle || null;
      const candidates = [...new Set([...(jv.considered_l3s || []), judgeTarget, rv?.target_handle].filter(Boolean))];
      chainClusters.push({ ck: c.ck, n: c.n, items: buildItems(c), titles: c.titles,
        judgeAction: jv.action, judgeTarget, refAction: rv?.action || "keep", refTarget: rv?.target_handle || null,
        refReason: rv?.reason || "", judgeNewL3Name: jv.new_l3_name || null, judgeParentL2: jv.parent_l2_handle || null, candidates });
    }
    const chain = createChain({ nodes: NODES, apiKey: KEY, cache: { __v2: true }, fresh: true });
    for (const cc of chainClusters) {
      let r;
      try { [r] = await chain.resolveChain([cc]); }
      catch (e) { out.set(cc.ck, { decisionHandle: null, path: "VIGA:resolveChain(" + String(e.message || e).slice(0, 40) + ")", failed: true }); continue; }
      const finalDec = r.decisionFinal || r.decision;
      const isNew = finalDec === "new_l3" || (r.decision === "new_l3" && !r.decisionFinal);
      out.set(cc.ck, { decisionHandle: isNew ? "NEW" : parseAssignHandle(finalDec), path: r.path, signal: !!r.signal, rawDecision: finalDec });
    }
    addUsage("claude-fable-5", { input_tokens: chain.fableUsage.input, output_tokens: chain.fableUsage.output });
    process.stderr.write(`  ahel ${Math.min(i + CHUNK, clusters.length)}/${clusters.length}  $${COST.usd.toFixed(2)}\r`);
  }
  return out;
}

// ─────────────────────────── MAIN ───────────────────────────
console.log(`═══ NAABRITE ÜLEHINDAMINE (DRY) — ${EMPTY.length} tühja standalone L3 | K_sem=${K_SEM} topCl=${TOP_CL} cap=$${CAP} ═══\n`);
const report = [];
for (const H of EMPTY) {
  if (COST.usd > CAP) { console.log(`🛑 kulu-lagi — katkestan ${H} juures`); break; }
  const m = L3META[H];
  const structural = structuralNeighbors(H);
  const semantic = semanticNeighbors(H, K_SEM);
  const neighbors = new Set([...structural, ...semantic]); neighbors.delete(H);
  // kõik naaber-klastrid, skooritud H-profiili lähedusel → top-TOP_CL (kulu-kontroll, "misfit kobardub H ümber")
  const hg = L3GRAMS[H];
  const cand = [];
  for (const nb of neighbors) for (const c of (CL_BY_L3.get(nb) || [])) {
    const cg = grams(`${c.rep.title} ${c.rep.title_et || ""} ${c.rep.vpt || ""}`);
    cand.push({ c, sim: simSets(hg, cg) });
  }
  cand.sort((a, b) => b.sim - a.sim);
  const picked = cand.slice(0, TOP_CL).filter((x) => x.sim > 0);
  const cands = [{ handle: H, name: m.name, description: m.desc || "" },
    ...[...neighbors].map((h) => ({ handle: h, name: L3META[h]?.name || h, description: L3META[h]?.desc || "" }))];
  console.log(`\n▸ «${m.name}» (${H})\n  naabrid: ${structural.size} struktuurne + ${semantic.length} semantiline = ${neighbors.size} uniq | klastreid skoorit ${cand.length} → ahelasse top-${picked.length}`);
  if (!picked.length) { console.log("  (0 lähedast klastrit — jätan vahele)"); report.push({ handle: H, name: m.name, neighbors: neighbors.size, evaluated: 0, pull: [], other: [] }); continue; }
  const dec = await runChainNarrow(picked.map((x) => x.c), cands);
  const pull = [], other = [], failed = [];
  const tally = { stay: 0, keep_nodec: 0, new: 0 };
  for (const x of picked) {
    const d = dec.get(x.c.ck); if (!d) continue;
    if (d.failed) { failed.push(x.c.ck); continue; }
    if (d.decisionHandle === H) pull.push({ ck: x.c.ck, n: x.c.n, title: x.c.rep.title, from: x.c.currentL3, fromName: L3META[x.c.currentL3]?.name, sim: +x.sim.toFixed(3), path: d.path });
    else if (d.decisionHandle === "NEW") tally.new++;
    else if (d.decisionHandle && d.decisionHandle !== x.c.currentL3)
      other.push({ ck: x.c.ck, n: x.c.n, title: x.c.rep.title, from: x.c.currentL3, to: d.decisionHandle, toName: L3META[d.decisionHandle]?.name, path: d.path });
    else if (d.decisionHandle === x.c.currentL3) tally.stay++;
    else tally.keep_nodec++;
  }
  console.log(`  → PULL H-sse: ${pull.length} klastrit (${pull.reduce((s, p) => s + p.n, 0)} toodet) | move_to_other: ${other.length} | jääb-kohale: ${tally.stay} | kohtunik-keep/otsuseta: ${tally.keep_nodec} | new_l3: ${tally.new} | kukkus: ${failed.length}`);
  for (const p of pull.slice(0, 8)) console.log(`     ⤷ «${(p.title || "").slice(0, 55)}» ← ${p.fromName} (sim=${p.sim})`);
  report.push({ handle: H, name: m.name, neighbors: neighbors.size, evaluated: picked.length, pull, other, failed: failed.length, tally });
  // inkrementaalne salvestus — osaline progress säilib ka kui protsess tapetakse
  fs.writeFileSync(`${SP}/neighbor-reeval.json`, JSON.stringify({ cost: +COST.usd.toFixed(2), params: { K_SEM, TOP_CL }, done: report.length, total: EMPTY.length, report }, null, 1));
}

// ── RAPORT ──
fs.writeFileSync(`${SP}/neighbor-reeval.json`, JSON.stringify({ cost: +COST.usd.toFixed(2), params: { K_SEM, TOP_CL }, report }, null, 1));
const L = [];
L.push("# NAABRITE ÜLEHINDAMINE — DRY (9 tühja standalone L3)");
L.push("");
L.push(`> Spets: reports/naabrite-ulehindamine-spets.md · ESIMENE testjuhtum · DRY (0 DB-muudatust) · 2026-10-07`);
L.push(`> Sisend: audit-clusters.json (${D.clusters.length} klastrit, ETAPP2-eelne seis) · K_sem=${K_SEM} · topCl=${TOP_CL} · kulu $${COST.usd.toFixed(2)}`);
L.push("");
L.push("Iga tühja L3 kohta: naaber-L3-de (struktuurne ∪ semantiline) kõige-lähedasemad klastrid läbi SAMA classify-chain ahela (kitsas kandidaat-list {H} ∪ naabrid). **PULL** = ahel paigutaks toote tühja L3-sse (lõksus-toode leitud). **move_to_other** = bonus-leid kolmandasse naabrisse.");
L.push("");
L.push("| Tühi L3 | naabreid | hinnatud klastrit | PULL (klastrit/toodet) | move_to_other |");
L.push("|---|---|---|---|---|");
for (const r of report) L.push(`| «${r.name}» | ${r.neighbors} | ${r.evaluated} | **${r.pull.length}** / ${r.pull.reduce((s, p) => s + p.n, 0)} | ${r.other.length} |`);
L.push("");
for (const r of report) {
  if (!r.pull.length && !r.other.length) continue;
  L.push(`## «${r.name}» — \`${r.handle}\``);
  if (r.pull.length) {
    L.push("");
    L.push("**PULL (liiguks tühja L3-sse primaarkoduna):**");
    L.push("");
    L.push("| ck | n | toode | praegune kodu | sim |");
    L.push("|---|---|---|---|---|");
    for (const p of r.pull) L.push(`| \`${p.ck}\` | ${p.n} | ${(p.title || "").slice(0, 60)} | ${p.fromName || p.from} | ${p.sim} |`);
    L.push("");
  }
  if (r.other.length) {
    L.push("**move_to_other (bonus — kolmas naaber):**");
    L.push("");
    for (const o of r.other) L.push(`- \`${o.ck}\` (${o.n}) «${(o.title || "").slice(0, 50)}» ${o.from} → ${o.toName || o.to}`);
    L.push("");
  }
}
L.push("---");
L.push("");
L.push("## Tõlgendus");
L.push("");
const totPull = report.reduce((s, r) => s + r.pull.length, 0), totPullN = report.reduce((s, r) => s + r.pull.reduce((a, p) => a + p.n, 0), 0);
const totOther = report.reduce((s, r) => s + r.other.length, 0);
L.push(`- Kokku **${totPull} klastrit / ${totPullN} toodet** pulliks tühjadesse L3-desse (lõksus-tooted, mis tekkisid enne kodu olemasolu).`);
L.push(`- **${totOther} move_to_other** bonus-leidu (naaber-reeval parandab ka kolmandaid valesid).`);
L.push(`- **DRY** — midagi EI liigutatud. Päris-liigutus = eraldi execute (väravad: transaktsioon + undo + inv + lock-harness + Meili, spets §4).`);
L.push(`- **Staleness-märge:** audit-clusters.json on ETAPP2-eelne (63/18910 toodet liikus vahepeal) — mehhanismi-tõestuseks tühine; päris-hookis loetakse LIVE DB.`);
fs.writeFileSync(`${REPO}/reports/naabrite-ulehindamine-dry.md`, L.join("\n") + "\n");
console.log(`\n\n✅ DRY VALMIS. PULL ${totPull} klastrit / ${totPullN} toodet | other ${totOther} | kulu $${COST.usd.toFixed(2)}`);
console.log(`Raport: reports/naabrite-ulehindamine-dry.md · JSON: scratchpad/neighbor-reeval.json`);
