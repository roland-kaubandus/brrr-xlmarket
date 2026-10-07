/**
 * neighbor-core.mjs — NAABRITE ÜLEHINDAMISE jagatud transform (HARD RULE #5: üks transform, kaks kutsujat).
 *
 * Kutsujad:
 *   (a) scripts/neighbor-reeval.mjs       — backfill/DRY (kõik tühjad/äsja-sündinud L3 üle kataloogi)
 *   (b) scripts/pipeline-neighbor-chain.mjs — öine hook (DELTA: iga äsja-sündinud L3 import-pipeline.sh-s)
 *
 * Sama kood → backfill ja hook EI lahkne kunagi. Naabrus (spets §2.2):
 *   struktuurne = SAMA L2 PERE (kõik L3 sama otsese L2 all) — KÕIK klastrid, EI kärbita (deterministlik).
 *   semantiline = far-field top-K (trigram) — top-TOP_CL_SEM klastrit (kulu-bound).
 */
import { judgeClassifyClusters, rateClassifyReferenceClusters } from "./judge.mjs";
import { createChain } from "./classify-chain.mjs";

export function grams(s) {
  s = " " + String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9äöüõ ]/g, " ").replace(/\s+/g, " ").trim() + " ";
  const g = new Set(); for (let i = 0; i < s.length - 2; i++) g.add(s.slice(i, i + 3)); return g;
}
export function simSets(a, b) { if (!a.size || !b.size) return 0; let inter = 0; for (const x of a) if (b.has(x)) inter++; return inter / (a.size + b.size - inter); }

/** Ehita naabrus-kontekst klastritest + l3meta-st. clusters: [{ck,n,rep:{title,title_et,description,vpt},currentL3,titles}]. */
export function buildNeighborCtx({ clusters, l3meta }) {
  const L3META = l3meta;
  const L2SIBS = {}; for (const h of Object.keys(L3META)) { const p = L3META[h]?.l2; if (p) (L2SIBS[p] ||= []).push(h); }
  const L3GRAMS = {}; for (const h of Object.keys(L3META)) L3GRAMS[h] = grams(`${L3META[h].name} ${L3META[h].desc || ""}`);
  const CL_BY_L3 = new Map();
  for (const c of clusters) { if (!c.currentL3) continue; (CL_BY_L3.get(c.currentL3) || CL_BY_L3.set(c.currentL3, []).get(c.currentL3)).push(c); }
  return { L3META, L2SIBS, L3GRAMS, CL_BY_L3 };
}

/** neighborsOf(H) — struktuurne (sama L2, KÕIK) ∪ semantiline (top-K). */
export function neighborsOf(H, ctx, { K_SEM = 20 } = {}) {
  const l2 = ctx.L3META[H]?.l2 || null;
  const structural = new Set(ctx.L2SIBS[l2] || []); structural.delete(H);
  const hg = ctx.L3GRAMS[H] || grams(H);
  const semantic = Object.keys(ctx.L3META).filter((h) => h !== H)
    .map((h) => ({ h, s: simSets(hg, ctx.L3GRAMS[h]) }))
    .sort((a, b) => b.s - a.s).slice(0, K_SEM).map((x) => x.h);
  const neighbors = new Set([...structural, ...semantic]); neighbors.delete(H);
  return { structural, semantic, neighbors };
}

/** pickClusters — struktuurse pere KÕIK klastrid (kärpimata) + semantiliste far-field top-TOP_CL_SEM. */
export function pickClusters(H, { structural, semantic }, ctx, { TOP_CL_SEM = 40 } = {}) {
  const hg = ctx.L3GRAMS[H] || grams(H);
  const score = (c) => simSets(hg, grams(`${c.rep.title} ${c.rep.title_et || ""} ${c.rep.vpt || ""}`));
  const structCl = [];
  for (const nb of structural) for (const c of (ctx.CL_BY_L3.get(nb) || [])) structCl.push({ c, sim: score(c), tier: "S" });
  const semCand = [];
  for (const nb of semantic) { if (structural.has(nb)) continue; for (const c of (ctx.CL_BY_L3.get(nb) || [])) semCand.push({ c, sim: score(c), tier: "Q" }); }
  semCand.sort((a, b) => b.sim - a.sim);
  const semCl = semCand.slice(0, TOP_CL_SEM).filter((x) => x.sim > 0);
  const seen = new Set(structCl.map((x) => x.c.ck));
  return { picked: [...structCl, ...semCl.filter((x) => !seen.has(x.c.ck))], nStruct: structCl.length, nSem: semCl.length };
}

/** Kitsas kandidaat-list: {H} ∪ naabrid. */
export function narrowCands(H, neighbors, ctx) {
  const m = ctx.L3META[H] || {};
  return [{ handle: H, name: m.name || H, description: m.desc || "" },
    ...[...neighbors].map((h) => ({ handle: h, name: ctx.L3META[h]?.name || h, description: ctx.L3META[h]?.desc || "" }))];
}

const PRICE = { "claude-opus-4-8": { i: 5, o: 25 }, "claude-sonnet-5": { i: 3, o: 15 }, "claude-fable-5": { i: 10, o: 50 } };
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

/**
 * reevalClusters — jooksuta SAMA classify-chain ahel klastri-alamhulgal kitsa kandidaat-listiga.
 * Tagastab { decisions: Map ck→{decisionHandle,path,signal,failed}, costUsd, fableUsage }.
 * decisionHandle: "NEW" (ahel looks uue), siht-handle (assign), null (otsuseta/kohtunik-keep/viga).
 */
export async function reevalClusters(picked, cands, { nodes, apiKey, cap = 25, chunk = 20, onProgress } = {}) {
  const out = new Map();
  const cost = { usd: 0, fable: { input: 0, output: 0 } };
  const addUsage = (m, u) => { const p = PRICE[m]; if (p && u) cost.usd += ((u.input_tokens || 0) * p.i + (u.output_tokens || 0) * p.o) / 1e6; };
  const clusters = picked.map((x) => x.c);
  for (let i = 0; i < clusters.length; i += chunk) {
    if (cost.usd > cap) { out.set("__capped__", true); break; }
    const slice = clusters.slice(i, i + chunk);
    const jClusters = slice.map((c) => ({ cluster_key: c.ck, items: buildItems(c) }));
    const jr = await judgeClassifyClusters(jClusters, cands, { apiKey });
    if (jr.ok) addUsage("claude-opus-4-8", jr.usage);
    const rr = jr.ok ? await rateClassifyReferenceClusters(jClusters, cands, { apiKey }) : { ok: false };
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
    const chain = createChain({ nodes, apiKey, cache: { __v2: true }, fresh: true });
    for (const cc of chainClusters) {
      let r;
      try { [r] = await chain.resolveChain([cc]); }
      catch (e) { out.set(cc.ck, { decisionHandle: null, path: "VIGA:resolveChain(" + String(e.message || e).slice(0, 40) + ")", failed: true }); continue; }
      const finalDec = r.decisionFinal || r.decision;
      const isNew = finalDec === "new_l3" || (r.decision === "new_l3" && !r.decisionFinal);
      out.set(cc.ck, { decisionHandle: isNew ? "NEW" : parseAssignHandle(finalDec), path: r.path, signal: !!r.signal, rawDecision: finalDec });
    }
    cost.fable.input += chain.fableUsage.input; cost.fable.output += chain.fableUsage.output;
    addUsage("claude-fable-5", { input_tokens: chain.fableUsage.input, output_tokens: chain.fableUsage.output });
    if (onProgress) onProgress(Math.min(i + chunk, clusters.length), clusters.length, cost.usd);
  }
  return { decisions: out, costUsd: +cost.usd.toFixed(4), fableUsage: cost.fable };
}

/**
 * classifyNeighborMoves — koonda reevalClusters otsused liigutusteks (pull + other).
 * decisions: Map ck→decision. pickedByCk: Map ck→{c,sim}. H = sihitav (tühi/uus) L3 handle.
 * Tagastab { pull:[], other:[], tally:{stay,keep_nodec,new}, failed:[] }.
 */
export function classifyNeighborMoves(H, picked, decisions) {
  const pull = [], other = [], failed = [];
  const tally = { stay: 0, keep_nodec: 0, new: 0 };
  for (const x of picked) {
    const d = decisions.get(x.c.ck); if (!d) continue;
    if (d.failed) { failed.push(x.c.ck); continue; }
    if (d.decisionHandle === H) pull.push({ ck: x.c.ck, n: x.c.n, title: x.c.rep.title, from: x.c.currentL3, sim: +(+x.sim).toFixed(3), path: d.path });
    else if (d.decisionHandle === "NEW") tally.new++;
    else if (d.decisionHandle && d.decisionHandle !== x.c.currentL3)
      other.push({ ck: x.c.ck, n: x.c.n, title: x.c.rep.title, from: x.c.currentL3, to: d.decisionHandle, path: d.path });
    else if (d.decisionHandle === x.c.currentL3) tally.stay++;
    else tally.keep_nodec++;
  }
  return { pull, other, failed, tally };
}
