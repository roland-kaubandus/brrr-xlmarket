#!/usr/bin/env node
/**
 * catalog-audit.mjs — KATALOOGI KLASSIFIKATSIOONI-AUDIT (DRY, read-only).
 *
 * Direktiiv (Tarmo 2026-10-06, "kaheastmeline sõel, kalibreeritud", kulupiir $50):
 *   1. KULU-OPT (enne kõike): (a) prompt-caching kandidaat-L3-listil; (b) kandidaat-eelvalik
 *      (praegune L3 + ~30 lähimat). MÕÕDA token/kulu-vähendus.
 *   2. KALIBREERIMINE 150 klastril (fikseeritud seeme): täisahel (kohtunik→referents→Fable) = tõe-allikas;
 *      odav SÕEL samal 150-l. MÕÕDA recall (vahele-jäänud vead ≈ 0?) + tegelik lahkheli-%.
 *   3. Sõel läbib → täis-audit: sõel kõigil 5226 → täisahel AINULT kahtlastel. Kulu-valve $50.
 *      Sõel ei läbi → raporteeri + oota.
 *
 * AINULT DRY: EI kirjuta DB-sse. Väljund reports/ + JSON. Sünkroonsed kutsed (standard-hind) → kulu-valve live.
 *
 * Ahel-fidelity: kasutab SAMU funktsioone mis öine hook (judgeClassifyClusters / rateClassifyReferenceClusters /
 *   createChain.resolveChain) → auditi otsus = tootmis-otsus. Audit annab proposed_l3=null → ahel otsustab
 *   VÄRSKELT (nagu kodutu toode), siis võrdleme praeguse L3-ga = sõltumatu audit.
 */
import fs from "node:fs";
import { clusterize, judgeClassifyClusters, rateClassifyReferenceClusters,
  buildClusterJudgeBody, buildClusterRefBody, resolveJudgeBatch } from "./lib/judge.mjs";
import { createChain } from "./lib/classify-chain.mjs";
import { runChunk, chunk as chunkArr } from "./lib/content-batch.mjs";

const SP = "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const REPO = "/opt/xlmarket-github";
const KEY = process.env.ANTHROPIC_API_KEY;
const CAP = Number(process.env.AUDIT_CAP || 160.0);   // Tarmo 2026-10-07: täisaudit batch'ina, piir $160
const SEED = 20261007;
const STAGE = process.argv[2] || "calibrate";   // measure | calibrate | probe | full
const SIEVE_MODEL = process.argv.includes("--sonnet-sieve") ? "claude-sonnet-5" : "claude-haiku-4-5";
const SHORTLIST = process.argv.includes("--shortlist") || process.env.AUDIT_SHORTLIST === "1";

if (!KEY) { console.error("ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

const D = JSON.parse(fs.readFileSync(`${SP}/audit-clusters.json`, "utf8"));
const NODES = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8")).nodes;
const candidateL3s = D.candidateL3s;
const L3META = D.l3meta;
const _ALLCL = D.clusters.filter((c) => c.currentL3);     // audit ainult praeguse-L3-ga klastreid
const _LIMIT = Number(process.env.AUDIT_LIMIT || 0);       // smoke-test: piira klastrite arvu (0 = kõik)
const CLUSTERS = _LIMIT > 0 ? _ALLCL.slice(0, _LIMIT) : _ALLCL;

// ───────────────── KULU-ARVESTUS (standard-hind; cache-väljad arvesse) ─────────────────
const PRICE = { "claude-opus-4-8": { in: 5, out: 25 }, "claude-sonnet-5": { in: 3, out: 15 },
  "claude-fable-5": { in: 10, out: 50 }, "claude-haiku-4-5": { in: 1, out: 5 } };
const COST = { usd: 0, byModel: {}, calls: 0, cacheReadTok: 0, cacheWriteTok: 0 };
function addUsage(model, u) {
  if (!u) return 0;
  const p = PRICE[model] || { in: 5, out: 25 };
  const inTok = u.input_tokens || 0, outTok = u.output_tokens || 0;
  const cw = u.cache_creation_input_tokens || 0, cr = u.cache_read_input_tokens || 0;
  const c = (inTok * p.in + cw * p.in * 1.25 + cr * p.in * 0.1 + outTok * p.out) / 1e6;
  COST.usd += c; COST.calls++; COST.cacheReadTok += cr; COST.cacheWriteTok += cw;
  COST.byModel[model] = (COST.byModel[model] || 0) + c;
  return c;
}
function guard(stage) {
  if (COST.usd > CAP) { console.error(`🛑 KULUPIIR $${CAP} ÜLETATUD (${COST.usd.toFixed(2)}) @ ${stage} → STOPP`); throw new Error("COST_CAP"); }
}

// ───────────────── üldine Anthropic JSON-kutse (sieve + caching-mõõtmine) ─────────────────
const API = "https://api.anthropic.com/v1/messages";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function callJSON({ model, systemBlocks, userContent, schema, maxTokens = 4000, retries = 5 }) {
  const body = { model, max_tokens: maxTokens, system: systemBlocks, messages: [{ role: "user", content: userContent }],
    output_config: { format: { type: "json_schema", schema } } };
  for (let a = 1; a <= retries; a++) {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 120000);
    try {
      const r = await fetch(API, { method: "POST", signal: ctrl.signal,
        headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json",
          "anthropic-beta": "prompt-caching-2024-07-31" }, body: JSON.stringify(body) });
      if (!r.ok) { const t = await r.text(); clearTimeout(to);
        if ((r.status === 429 || r.status === 529 || r.status >= 500) && a < retries) { await sleep(Math.min(30000, 1000 * 2 ** a)); continue; }
        return { ok: false, error: `API ${r.status}: ${t.slice(0, 180)}` }; }
      const j = await r.json(); clearTimeout(to);
      const txt = (j.content.find((b) => b.type === "text") || {}).text || "{}";
      return { ok: true, parsed: JSON.parse(txt), usage: j.usage };
    } catch (e) { clearTimeout(to); if (a < retries) { await sleep(Math.min(30000, 1000 * 2 ** a)); continue; } return { ok: false, error: String(e.message || e).slice(0, 180) }; }
  }
  return { ok: false, error: "retries exhausted" };
}

// ───────────────── determ. seeme-valik (fikseeritud) ─────────────────
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function sample(arr, n, seed) {
  const rng = mulberry32(seed); const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

// ───────────────── TRIGRAM- eelvalik (pre-selection) ─────────────────
function grams(s) { s = " " + String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9äöüõ ]/g, " ").replace(/\s+/g, " ").trim() + " "; const g = new Set(); for (let i = 0; i < s.length - 2; i++) g.add(s.slice(i, i + 3)); return g; }
const L3GRAMS = {}; for (const h of Object.keys(L3META)) L3GRAMS[h] = grams(`${L3META[h].name} ${L3META[h].desc}`);
const parentL2of = (h) => L3META[h]?.l2 || null;
const L2SIBS = {}; // L2 → [L3...]
for (const h of Object.keys(L3META)) { const p = L3META[h].l2; if (p) (L2SIBS[p] ||= []).push(h); }
function shortlist(cluster, k = 30) {
  const cg = grams(`${cluster.rep.title} ${cluster.rep.title_et} ${cluster.rep.vpt || ""}`);
  const scored = [];
  for (const h of Object.keys(L3GRAMS)) {
    const g = L3GRAMS[h]; let inter = 0; const [sm, lg] = cg.size < g.size ? [cg, g] : [g, cg];
    for (const x of sm) if (lg.has(x)) inter++;
    if (inter) scored.push([h, inter / Math.sqrt(cg.size * g.size || 1)]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  const picked = new Set(scored.slice(0, k).map((x) => x[0]));
  picked.add(cluster.currentL3);                                   // praegune L3 ALATI
  for (const s of (L2SIBS[parentL2of(cluster.currentL3)] || [])) picked.add(s);  // + L2-õed
  return [...picked];
}

// ───────────────── main (L1) tuvastus NODES-ist (garden-jaotus + kattuvused) ─────────────────
const NBYH = NODES; // objekt handle → {handle, name_et, name_en, level, parent_handle}
function mainOf(handle) {
  let n = NBYH[handle], guard = 0;
  while (n && n.parent_handle && guard++ < 12) n = NBYH[n.parent_handle];
  return n ? n.handle : null;
}
function mainName(handle) { const m = mainOf(handle); return m ? (NBYH[m]?.name_et || NBYH[m]?.name_en || m) : "?"; }
const isGardenMain = (handle) => { const m = mainOf(handle); return !!m && /aed/.test(m); }; // v4-aed-* / v4-aed-ja-aiatehnika

// ───────────────── ahela-abi: ehita items + resolveChain-klastrid ─────────────────
function buildItems(c) {
  return (c.titles.length ? c.titles : [c.rep.title]).map((t, i) => ({
    id: `${c.ck}#${i}`, title: t,
    title_et: i === 0 ? c.rep.title_et : "", description: i === 0 ? c.rep.description : "",
    bucket: "audit", meta: { vevor_product_type: c.rep.vpt },
    // proposed_l3 = null → ahel otsustab VÄRSKELT (sõltumatu audit)
  }));
}
const parseAssignHandle = (dec) => {
  if (!dec) return null;
  if (dec.startsWith("assign:")) return dec.slice(7).replace(/\s*\(.*$/, "").trim();
  if (dec.startsWith("LCA-müügis:")) return dec.replace(/^LCA-müügis:\s*/, "").replace(/\s*\(L\d\)\s*$/, "").replace(/-muud$/, "").trim();
  return null;
};
// täisahel partiil → tagastab map ck → {decisionHandle|NEW, path, newName, parentL2}
async function runChain(clusterSubset, { chunk = 20 } = {}) {
  const out = new Map();
  for (let i = 0; i < clusterSubset.length; i += chunk) {
    const slice = clusterSubset.slice(i, i + chunk);
    await processChunk(slice, out, chunk);
    process.stderr.write(`  ahel ${Math.min(i + chunk, clusterSubset.length)}/${clusterSubset.length}  $${COST.usd.toFixed(2)}\r`);
  }
  return out;
}
async function processChunk(slice, out, size) {
  const jClusters = slice.map((c) => ({ cluster_key: c.ck, items: buildItems(c) }));
  let cands = candidateL3s;
  if (SHORTLIST) { const hs = new Set(); for (const c of slice) for (const h of shortlist(c, 40)) hs.add(h);
    cands = [...hs].map((h) => ({ handle: h, name: L3META[h]?.name || h })); }
  const jr = await judgeClassifyClusters(jClusters, cands, { apiKey: KEY });
  if (jr.ok) { addUsage("claude-opus-4-8", jr.usage); guard("judge"); }
  const rr = jr.ok ? await rateClassifyReferenceClusters(jClusters, cands, { apiKey: KEY }) : { ok: false };
  if (rr.ok) { addUsage("claude-sonnet-5", rr.usage); guard("ref"); }
  if (!jr.ok || !rr.ok) {
    if (slice.length > 4) { const h = Math.ceil(slice.length / 2); await processChunk(slice.slice(0, h), out, h); await processChunk(slice.slice(h), out, h); return; }
    for (const c of slice) out.set(c.ck, { decisionHandle: null, path: "VIGA:ahel-kukkus", nonChain: true, failed: true });
    process.stderr.write(`\n  ⚠ chunk kukkus (${slice.length}) — skip\n`); return;
  }
  {
    const jByKey = new Map((jr.results || []).map((r) => [r.cluster_key, r]));
    const rByKey = new Map((rr.results || []).map((r) => [r.cluster_key, r]));
    const CHAIN_ACTIONS = new Set(["assign_existing", "new_l3"]);
    const chainClusters = [];
    for (const c of slice) {
      const jv = jByKey.get(c.ck); const rv = rByKey.get(c.ck);
      if (!jv || !CHAIN_ACTIONS.has(jv.action)) { out.set(c.ck, { decisionHandle: null, path: jv ? `kohtunik=${jv.action}` : "otsuseta", nonChain: true }); continue; }
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
      catch (e) { out.set(cc.ck, { decisionHandle: null, path: "VIGA:resolveChain(" + String(e.message || e).slice(0, 40) + ")", nonChain: true, failed: true }); continue; }
      const finalDec = r.decisionFinal || r.decision;
      const isNew = finalDec === "new_l3" || (r.decision === "new_l3" && !r.decisionFinal);
      out.set(cc.ck, { decisionHandle: isNew ? "NEW" : parseAssignHandle(finalDec), path: r.path,
        newName: r.finalName || r.newName || null, parentL2: r.parentL2 || null, signal: !!r.signal,
        rawDecision: finalDec, gate: r.gate ? { allPass: r.gate.allPass, blocking: r.gate.blocking } : null });
    }
    addUsage("claude-fable-5", { input_tokens: chain.fableUsage.input, output_tokens: chain.fableUsage.output }); guard("fable");
  }
}

// ───────────────── SÕEL (odav: "kas praegune L3 õige?") ─────────────────
const SIEVE_SYSTEM = `Oled xlmarket.ee kataloogi KIIRKONTROLL. Sulle antakse tooteid, millel JUBA on kategooria (L3).
Sinu AINUS ülesanne: kas toode on OMA praeguses kategoorias ILMSELGELT ÕIGES kohas?

Vasta iga toote kohta:
- correct=true  AINULT kui toode kuulub selgelt sinna kategooriasse (tüüp + otstarve klapivad).
- correct=false kui on KAHTLUS — vale tüüp, vale domeen, liiga üldine/kitsas, või sa ei ole kindel.

⚠️ KALDU KAHTLUSE POOLE: kui kõhkled, pane correct=false. Parem üle-märkida (inimene/täisahel kontrollib)
   kui jätta vale paigutus märkamata. See on ODAV eelsõel — täpne otsus tuleb hiljem.

Otsusta toote SISUST (title/title_et/kirjeldus) — MITTE kategooria-nimest üksi.
suspect_area = kui correct=false, lühike vihje kuhu pigem kuuluks (1-4 sõna, eesti k), muidu "".
Vasta AINULT JSON-skeemis.`;
const SIEVE_SCHEMA = { type: "object", properties: { results: { type: "array", items: { type: "object", properties: {
  ck: { type: "string" }, correct: { type: "boolean" }, confidence: { type: "number" }, suspect_area: { type: "string" } },
  required: ["ck", "correct", "confidence"], additionalProperties: false } } }, required: ["results"], additionalProperties: false };
function sieveUser(batch) {
  return batch.map((c) => {
    const m = L3META[c.currentL3] || {};
    return `[${c.ck}]
  toode: ${c.rep.title || "?"}
  toode_et: ${c.rep.title_et || "-"}
  kirjeldus: ${(c.rep.description || "").slice(0, 220) || "(puudub)"}
  PRAEGUNE kategooria: «${m.name || c.currentL3}»${m.l2name ? ` (L2: ${m.l2name})` : ""}`;
  }).join("\n\n");
}
async function runSieve(clusterSubset, { chunk = 40 } = {}) {
  const verdicts = new Map();
  for (let i = 0; i < clusterSubset.length; i += chunk) {
    const slice = clusterSubset.slice(i, i + chunk);
    const res = await callJSON({ model: SIEVE_MODEL,
      systemBlocks: [{ type: "text", text: SIEVE_SYSTEM, cache_control: { type: "ephemeral" } }],
      userContent: `HINNATAVAD TOOTED (üks otsus toote/klastri kohta):\n\n${sieveUser(slice)}`,
      schema: SIEVE_SCHEMA, maxTokens: 6000 });
    if (!res.ok) throw new Error("sõel: " + res.error);
    addUsage(SIEVE_MODEL, res.usage); guard("sieve");
    for (const r of (res.parsed.results || [])) verdicts.set(r.ck, { correct: r.correct !== false, confidence: r.confidence ?? 0, suspect_area: r.suspect_area || "" });
    process.stderr.write(`  sõel ${Math.min(i + chunk, clusterSubset.length)}/${clusterSubset.length}  $${COST.usd.toFixed(2)}\r`);
  }
  return verdicts;
}

// ═══════════════════════ STAGE: measure (kulu-opt mõõtmine) ═══════════════════════
async function stageMeasure() {
  const r = { generated_at: new Date().toISOString() };
  // (b) pre-selection: token-vähendus
  const candChars = candidateL3s.map((c) => `  ${c.handle} — ${c.name}`).join("\n").length;
  const sampleCl = sample(CLUSTERS, 50, SEED);
  let slSizes = 0, slChars = 0;
  for (const c of sampleCl) { const sl = shortlist(c, 30); slSizes += sl.length; slChars += sl.map((h) => `  ${h} — ${L3META[h].name}`).join("\n").length; }
  const avgSlSize = slSizes / sampleCl.length, avgSlChars = slChars / sampleCl.length;
  r.preselection = { full_l3: candidateL3s.length, full_chars: candChars, full_tok: Math.round(candChars / 4),
    avg_shortlist_size: +avgSlSize.toFixed(1), avg_shortlist_chars: Math.round(avgSlChars), avg_shortlist_tok: Math.round(avgSlChars / 4),
    token_reduction_x: +(candChars / avgSlChars).toFixed(1) };
  // (a) caching: tegelik A/B — 2 kutset sama cache_control listiga, loe cache_read
  const cands = candidateL3s.map((c) => `  ${c.handle} — ${c.name}`).join("\n");
  const sys = [{ type: "text", text: "Loe kandidaat-list. Tagasta {\"n\":<arv L3 listis>}.", cache_control: { type: "ephemeral" } }];
  const probeSchema = { type: "object", properties: { n: { type: "number" } }, required: ["n"], additionalProperties: false };
  const uc = (q) => [{ type: "text", text: `KANDIDAAT-L3-LIST:\n${cands}`, cache_control: { type: "ephemeral" } }, { type: "text", text: `\n\nKÜSIMUS: ${q}` }];
  const a1 = await callJSON({ model: "claude-haiku-4-5", systemBlocks: sys, userContent: uc("loe 1"), schema: probeSchema, maxTokens: 50 });
  addUsage("claude-haiku-4-5", a1.usage);
  const a2 = await callJSON({ model: "claude-haiku-4-5", systemBlocks: sys, userContent: uc("loe 2"), schema: probeSchema, maxTokens: 50 });
  addUsage("claude-haiku-4-5", a2.usage);
  r.caching = { call1_usage: a1.usage, call2_usage: a2.usage,
    cache_hit: (a2.usage?.cache_read_input_tokens || 0) > 0,
    note: "call2 cache_read_input_tokens > 0 → listi-caching töötab; kordus-kutsel ~10% listi-hinda" };
  // projektsioon: judge+ref 131 kutset, list 37k tok
  const listTok = Math.round(candChars / 4);
  const perCallNoCache = listTok, perCallCache = listTok * 0.1; // read-hind
  r.caching.projection_131calls = {
    list_tok: listTok,
    judge_list_cost_nocache_opus: +((131 * perCallNoCache / 1e6) * 5).toFixed(2),
    judge_list_cost_cache_opus: +(((perCallNoCache * 1.25) + 130 * perCallCache) / 1e6 * 5).toFixed(2),
  };
  fs.writeFileSync(`${SP}/audit-measure.json`, JSON.stringify(r, null, 2));
  console.log("\n═══ KULU-OPT MÕÕTMINE ═══");
  console.log(`(b) eelvalik: täis-list ${r.preselection.full_l3} L3 (~${r.preselection.full_tok} tok) → shortlist ~${r.preselection.avg_shortlist_size} L3 (~${r.preselection.avg_shortlist_tok} tok) = ${r.preselection.token_reduction_x}× väiksem`);
  console.log(`(a) caching: cache_hit=${r.caching.cache_hit}  call2 cache_read=${a2.usage?.cache_read_input_tokens || 0} tok`);
  console.log(`    projektsioon 131 kohtunik-kutset: list-kulu ilma cache $${r.caching.projection_131calls.judge_list_cost_nocache_opus} → cache'iga $${r.caching.projection_131calls.judge_list_cost_cache_opus}`);
  console.log(`kulu seni: $${COST.usd.toFixed(3)}`);
  return r;
}

// ═══════════════════════ STAGE: calibrate (150 klastrit) ═══════════════════════
async function stageCalibrate(N = 150) {
  const cal = sample(CLUSTERS, N, SEED);
  console.log(`\n═══ KALIBREERIMINE — ${cal.length} klastrit (seeme ${SEED}), sõel=${SIEVE_MODEL} ═══`);
  // tõe-allikas (kallis) cache'itakse → sõela-eskaleerimisel ei jooksuta uuesti
  const TRUTH_CACHE = `${SP}/audit-truth-${N}-${SEED}.json`;
  let truth;
  if (fs.existsSync(TRUTH_CACHE)) {
    truth = new Map(Object.entries(JSON.parse(fs.readFileSync(TRUTH_CACHE, "utf8"))));
    console.log(`täisahel: laetud cache'ist (${truth.size} otsust) — $0`);
  } else {
    console.log("täisahel (tõe-allikas)…");
    truth = await runChain(cal);
    fs.writeFileSync(TRUTH_CACHE, JSON.stringify(Object.fromEntries(truth)));
    console.log(`\ntäisahel valmis  $${COST.usd.toFixed(2)}  → cache ${TRUTH_CACHE}`);
  }
  console.log("sõel…");
  const sieve = await runSieve(cal);
  console.log(`\nsõel valmis  $${COST.usd.toFixed(2)}`);

  // metrikad: "viga" = ahel otsustas MUU kui praegune L3 (assign muusse VÕI NEW)
  let errors = 0, flagged = 0, flaggedError = 0, chainNew = 0, nonChain = 0, slRecallHit = 0, slRecallDen = 0;
  const confusion = { tp: 0, fp: 0, tn: 0, fn: 0 };
  const errList = [];
  for (const c of cal) {
    const t = truth.get(c.ck); const s = sieve.get(c.ck);
    if (!t) continue;
    if (t.nonChain) { nonChain++; }
    const chainHome = t.decisionHandle;
    const isError = chainHome && chainHome !== "NEW" && chainHome !== c.currentL3;
    const isNew = chainHome === "NEW";
    if (isNew) chainNew++;
    // shortlist-recall: kas ahela assign-kodu on eelvaliku-listis?
    if (chainHome && chainHome !== "NEW") { slRecallDen++; const sl = shortlist(c, 30); if (sl.includes(chainHome)) slRecallHit++; }
    const sieveFlag = s ? s.correct === false : false;
    if (isError || isNew) errors++;                        // "muutus vajalik" = viga laiemas mõttes
    if (sieveFlag) flagged++;
    const realChange = isError || isNew;
    if (realChange && sieveFlag) { confusion.tp++; flaggedError++; }
    else if (realChange && !sieveFlag) confusion.fn++;
    else if (!realChange && sieveFlag) confusion.fp++;
    else confusion.tn++;
    if (realChange) errList.push({ ck: c.ck, title: c.rep.title, current: c.currentL3, currentName: L3META[c.currentL3]?.name,
      chain: isNew ? `NEW («${t.newName || "?"}»)` : chainHome, chainName: isNew ? null : L3META[chainHome]?.name,
      path: t.path, sieveFlagged: sieveFlag, sieveArea: s?.suspect_area || "" });
  }
  const recall = errors ? confusion.tp / errors : 1;
  const precision = flagged ? confusion.tp / flagged : 0;
  const disagreePct = +(100 * errors / cal.length).toFixed(1);
  const slRecall = slRecallDen ? +(100 * slRecallHit / slRecallDen).toFixed(1) : null;
  const PASS = recall >= 0.95;

  const out = { generated_at: new Date().toISOString(), seed: SEED, n: cal.length, sieve_model: SIEVE_MODEL,
    errors, chainNew, nonChain, flagged, confusion, recall: +recall.toFixed(3), precision: +precision.toFixed(3),
    disagreement_pct: disagreePct, shortlist_recall_pct: slRecall, pass: PASS, cost_usd: +COST.usd.toFixed(3),
    missed_errors: errList.filter((e) => !e.sieveFlagged), error_list: errList };
  fs.writeFileSync(`${SP}/audit-calibration.json`, JSON.stringify(out, null, 2));
  console.log(`\n── TULEMUS ──`);
  console.log(`lahkheli (ahel ≠ praegune): ${errors}/${cal.length} = ${disagreePct}%   (sh NEW: ${chainNew}, nonChain/keep: ${nonChain})`);
  console.log(`sõel märkis: ${flagged}  | TP=${confusion.tp} FP=${confusion.fp} FN=${confusion.fn} TN=${confusion.tn}`);
  console.log(`RECALL = ${(recall * 100).toFixed(1)}%  (vahele jäi ${confusion.fn} viga)   precision=${(precision * 100).toFixed(1)}%`);
  console.log(`shortlist-recall (eelvalik sisaldab õiget kodu): ${slRecall}%`);
  console.log(`VÄRAV recall≥95%: ${PASS ? "✅ LÄBIS" : "🛑 EI LÄBINUD"}`);
  console.log(`kulu: $${COST.usd.toFixed(3)}`);
  if (confusion.fn > 0) { console.log(`\nVAHELE JÄÄNUD (${confusion.fn}):`); for (const e of out.missed_errors.slice(0, 15)) console.log(`  • ${e.title?.slice(0, 50)} | ${e.currentName} → ${e.chainName || e.chain}`); }
  return out;
}

// ═══════════════════════ STAGE: probe (shortlist-ahel fidelity + kulu vs cache) ═══════════════════════
async function stageProbe(N = 60) {
  if (!SHORTLIST) { console.log("probe nõuab --shortlist"); return; }
  const TRUTH_CACHE = `${SP}/audit-truth-150-${SEED}.json`;
  if (!fs.existsSync(TRUTH_CACHE)) { console.log("puudub truth-cache — jooksuta enne calibrate"); return; }
  const truth = new Map(Object.entries(JSON.parse(fs.readFileSync(TRUTH_CACHE, "utf8"))));
  const cal = sample(CLUSTERS, 150, SEED).slice(0, N);   // sama fikseeritud valim, esimesed N
  console.log(`\n═══ PROBE — shortlist-ahel ${cal.length} klastril (võrdlus täis-list tõe-allikaga) ═══`);
  const c0 = COST.usd;
  const probe = await runChain(cal, { chunk: 20 });
  const costProbe = COST.usd - c0;
  let agree = 0, both = 0, tErr = 0, pErr = 0, tpErr = 0, falseMove = 0, considered = 0;
  const mismatch = [];
  for (const c of cal) {
    const t = truth.get(c.ck); const p = probe.get(c.ck);
    if (!t || !p || p.nonChain) continue;
    considered++;
    const tH = t.decisionHandle, pH = p.decisionHandle;
    if (tH === pH) agree++; else mismatch.push({ ck: c.ck, title: c.rep.title?.slice(0, 48), truth: tH, probe: pH });
    const tIsErr = tH && tH !== c.currentL3;       // tõe-allikas: viga
    const pIsErr = pH && pH !== c.currentL3;        // shortlist-ahel: viga
    if (tIsErr) tErr++; if (pIsErr) pErr++;
    if (tIsErr && pIsErr) tpErr++;
    if (!tIsErr && pIsErr) falseMove++;
  }
  const costPer = costProbe / Math.max(1, considered);
  const proj5226 = costPer * CLUSTERS.length;
  const out = { generated_at: new Date().toISOString(), n: considered, cost: +costProbe.toFixed(3), cost_per_cluster: +costPer.toFixed(4),
    projected_full_5226: +proj5226.toFixed(2), agreement_pct: +(100 * agree / considered).toFixed(1),
    truth_errors: tErr, probe_errors: pErr, probe_caught_truth_errors: tpErr,
    error_recall_pct: tErr ? +(100 * tpErr / tErr).toFixed(1) : null, false_moves: falseMove, mismatches: mismatch };
  fs.writeFileSync(`${SP}/audit-probe.json`, JSON.stringify(out, null, 2));
  console.log(`\n── PROBE TULEMUS ──`);
  console.log(`otsuste kokkulangevus shortlist vs täis-list: ${out.agreement_pct}% (${agree}/${considered})`);
  console.log(`tõe-vigu: ${tErr} | shortlist püüdis: ${tpErr} → viga-recall ${out.error_recall_pct}%  | vale-liigutusi: ${falseMove}`);
  console.log(`kulu/klaster (shortlist): $${out.cost_per_cluster}  → projektsioon 5226: $${out.projected_full_5226}`);
  console.log(`(täis-list kulu/klaster oli $0.0577 → projektsioon 5226 ~$301)`);
  if (mismatch.length) { console.log(`\nerinevused (${mismatch.length}):`); for (const m of mismatch.slice(0, 12)) console.log(`  • ${m.title} | täis=${m.truth} shortlist=${m.probe}`); }
  return out;
}

// ═══════════════════════ STAGE: full (kogu kataloog, TRUU täisahel, BATCH) ═══════════════════════
// Tarmo 2026-10-07: TRUU täisahel KÕIGIL klastritel (MITTE sõel, MITTE kitsendus). Batch (−50%) → ≤ $160.
//   Stage A (batch): kohtunik (Opus) + referents (Sonnet) KÕIGIL klastritel, chunk-kaupa batch-päringud.
//   Stage B (sünkr): resolveChain tarbib eel-täidetud kohtunik+referents → Fable AINULT lahkhelil (§2c).
// Sama prompt+caching mis öine hook (buildClusterJudgeBody/buildClusterRefBody) → HARD RULE #5.
// Batch EI jaga list-cache'i päringute vahel (paralleelne töötlus → iga päring kirjutab listi uuesti).
// → list-kirjutus (91585 tok × 1.25) DOMINEERIB → vähenda päringute arvu SUUREMA chunk'iga (vähem list-write'i).
const AUDIT_CHUNK = Number(process.env.AUDIT_CHUNK || 40);    // klastrit / batch-päring (amortiseeri list)
const AUDIT_MAXTOK = Number(process.env.AUDIT_MAXTOK || 14000); // output-cap (40×~290 tok + margin)

// batch-tulemuste parse: message → {results:[...]} (JSON text-blokist)
function parseBatchMessage(message) {
  const txt = (message?.content || []).find((b) => b.type === "text")?.text || "{}";
  try { return JSON.parse(txt).results || []; } catch { return []; }
}

async function stageFull() {
  console.log(`\n═══ TÄIS-AUDIT (TRUU täisahel, BATCH) — ${CLUSTERS.length} klastrit, chunk=${AUDIT_CHUNK}, piir $${CAP} ═══`);
  const groups = chunkArr(CLUSTERS, AUDIT_CHUNK);
  console.log(`${groups.length} chunk'i × ${AUDIT_CHUNK} → ${groups.length} kohtunik-päringut + ${groups.length} referents-päringut (batch)`);

  // ── PRE-FLIGHT kuluhinnang (MÕÕDETUD numbrid: output DOMINEERIB, mitte list) ──
  // Batch EI jaga list-cache'i → list kirjutatakse iga päring. Output ~1178 tok/kl judge, ~1065 ref (mõõdetud).
  const listTokJ = 91585, listTokR = 90372, outJ = 1178, outR = 1065, userPerCl = 350;
  const nReq = groups.length, nCl = CLUSTERS.length;
  const estJudge = (nReq * (listTokJ * 1.25 + AUDIT_CHUNK * userPerCl) * 5 + nCl * outJ * 25) / 1e6 * 0.5;
  const estRef = (nReq * (listTokR * 1.25 + AUDIT_CHUNK * userPerCl) * 3 + nCl * outR * 15) / 1e6 * 0.5;
  const fableEst = nCl * 0.075 * 0.045;  // ~7.5% lahkheli × ~$0.045 Fable/klaster (mõõdetud)
  const estTotal = estJudge + estRef + fableEst;
  console.log(`\n[PRE-FLIGHT] projektsioon (mõõdetud output-maht): judge $${estJudge.toFixed(0)} + ref $${estRef.toFixed(0)} + Fable ~$${fableEst.toFixed(0)} = ~$${estTotal.toFixed(0)}`);
  console.log(`  piir $${CAP}. Live-valve peatab kui ületab.`);
  if (estTotal > CAP) { console.error(`🛑 projektsioon $${estTotal.toFixed(0)} > piir $${CAP} → EI submit. Suurenda chunk'i (vähem list-write) VÕI tõsta AUDIT_CAP.`); throw new Error("COST_CAP"); }

  // VÕTME-VERIFITSEERITUD batch (judge.mjs SSoT, HARD RULE #5 — sama kontroll mis öine hook):
  //   iga chunk: väljundi võtmed == sisendi võtmed; võõras võti → visatakse + loendur; puuduv VÕI
  //   stop_reason=max_tokens → POOLITA chunk & korda (rekursiivne, max 3 taset), siis fail-loud (unresolved).
  const auditClusters = CLUSTERS.map((c) => ({ cluster_key: c.ck, items: buildItems(c) }));
  const mkLog = (nimi) => ({ usage: (m, u) => addUsage(m, u), log: (s) => console.error(`  ${s}`),
    tick: (s) => { const rc = s.request_counts || {}; process.stderr.write(`  ${nimi} batch ${s.processing_status}: done ${rc.succeeded || 0} err ${rc.errored || 0}\r`); } });

  // ── STAGE A.1 — KOHTUNIK batch (Opus) ──
  console.log(`\n[A.1] kohtunik-batch: ${groups.length} päringut submit…`);
  const jRes = await resolveJudgeBatch({ clusters: auditClusters, candidateL3s, apiKey: KEY, runChunk,
    chunkSize: AUDIT_CHUNK, maxTokens: AUDIT_MAXTOK, role: "judge", onLog: mkLog("kohtunik") });
  const jByKey = jRes.byKey;
  console.log(`\n[A.1] kohtunik valmis: ${jByKey.size} otsust | võõr ${jRes.foreign.length}, dup-konflikt ${jRes.duplicates.filter((d) => d.conflict).length}, LAHENDAMATA ${jRes.unresolved.length}, päring-viga ${jRes.reqFail} (poolitus-tasemeid ${jRes.levels})  → kulu $${COST.usd.toFixed(2)}`);
  guard("judge-batch");

  // ── STAGE A.2 — REFERENTS batch (Sonnet) ──
  console.log(`\n[A.2] referents-batch: ${groups.length} päringut submit…`);
  const rRes = await resolveJudgeBatch({ clusters: auditClusters, candidateL3s, apiKey: KEY, runChunk,
    chunkSize: AUDIT_CHUNK, maxTokens: AUDIT_MAXTOK, role: "ref", onLog: mkLog("referents") });
  const rByKey = rRes.byKey;   // ref id → cluster_key (ingestClusterResults loeb v.cluster_key ?? v.id)
  console.log(`\n[A.2] referents valmis: ${rByKey.size} otsust | võõr ${rRes.foreign.length}, dup-konflikt ${rRes.duplicates.filter((d) => d.conflict).length}, LAHENDAMATA ${rRes.unresolved.length}, päring-viga ${rRes.reqFail} (poolitus-tasemeid ${rRes.levels})  → kulu $${COST.usd.toFixed(2)}`);
  guard("ref-batch");
  const keyIntegrity = { judge: { foreign: jRes.foreign, duplicates: jRes.duplicates, unresolved: jRes.unresolved, reqFail: jRes.reqFail },
    ref: { foreign: rRes.foreign, duplicates: rRes.duplicates, unresolved: rRes.unresolved, reqFail: rRes.reqFail } };

  // ── STAGE B — resolveChain sünkr (Fable AINULT lahkhelil) ──
  // 🔒 DB-VAIKUSE AKEN (Europe/Tallinn 02:45–04:30): Stage B on TÄIELIKULT OFFLINE — loeb ainult
  //    audit-clusters.json dump'i + category-tree.generated.json, teeb LLM-kutseid, 0 DB-lugemist.
  //    Seega vaikuse-aken on automaatselt austatud (ahel ei puutu DB-d üldse).
  console.log(`\n[B] resolveChain ${CLUSTERS.length} klastril (Fable lahkhelil)… [offline, 0 DB-lugemist]`);
  const CHAIN_ACTIONS = new Set(["assign_existing", "new_l3"]);
  const chain = createChain({ nodes: NODES, apiKey: KEY, cache: { __v2: true }, fresh: true });
  const results = new Map();
  const decisions = [];   // TÄIELIK otsuse-provenance — execute saab taaskasutada ILMA uute API-kutseteta (nagu synonym --from)
  let done = 0, fableClusters = 0, nonChain = 0, chainErr = 0, stopped = false;
  for (const c of CLUSTERS) {
    const jv = jByKey.get(c.ck), rv = rByKey.get(c.ck);
    if (!jv || !CHAIN_ACTIONS.has(jv.action)) {
      results.set(c.ck, { nonChain: true, path: jv ? `kohtunik=${jv.action}` : "otsuseta" });
      decisions.push({ ck: c.ck, n: c.n, currentL3: c.currentL3, currentMain: mainOf(c.currentL3),
        currentName: L3META[c.currentL3]?.name, judge_raw: jv || null, ref_raw: rv || null, fable: null,
        path: jv ? `nonChain:${jv.action}` : "otsuseta", final_handle: c.currentL3,
        final_decision: `keep:${jv?.action || "none"}`, changed: false });
      nonChain++; continue;
    }
    const judgeTarget = jv.target_handle || null;
    const candidates = [...new Set([...(jv.considered_l3s || []), judgeTarget, rv?.target_handle].filter(Boolean))];
    const cc = { ck: c.ck, n: c.n, items: buildItems(c), titles: c.titles,
      judgeAction: jv.action, judgeTarget, refAction: rv?.action || "keep", refTarget: rv?.target_handle || null,
      refReason: rv?.reason || "", judgeNewL3Name: jv.new_l3_name || null, judgeParentL2: jv.parent_l2_handle || null, candidates };
    const fBefore = chain.fableUsage.calls;
    try {
      const [r] = await chain.resolveChain([cc]);
      if (chain.fableUsage.calls > fBefore) fableClusters++;
      const finalDec = r.decisionFinal || r.decision;
      const isNew = finalDec === "new_l3" || (r.decision === "new_l3" && !r.decisionFinal);
      const finalHandle = isNew ? "NEW" : parseAssignHandle(finalDec);
      results.set(c.ck, { decisionHandle: finalHandle, path: r.path,
        newName: r.finalName || r.newName || null, parentL2: r.parentL2 || null, signal: !!r.signal,
        gate: r.gate ? { allPass: r.gate.allPass, blocking: r.gate.blocking } : null });
      const { _cluster, ...rClean } = r;   // _cluster = sisend (buildItems jm) → ära dubleeri
      decisions.push({ ck: c.ck, n: c.n, currentL3: c.currentL3, currentMain: mainOf(c.currentL3),
        currentName: L3META[c.currentL3]?.name,
        judge_raw: jv, ref_raw: rv,
        fable: { kinnitus: cc.fableConf || null, viigimurdja: cc.fable || null, votes: r.fableVotes || [] },
        resolution: rClean,
        final_handle: finalHandle, final_decision: finalDec,
        newName: r.finalName || r.newName || null, parentL2: r.parentL2 || null,
        gate: r.gate || null, signal: !!r.signal,
        changed: finalHandle === "NEW" ? true : (!!finalHandle && finalHandle !== c.currentL3) });
    } catch (e) {
      results.set(c.ck, { nonChain: true, failed: true, path: "VIGA:" + String(e.message || e).slice(0, 50) });
      decisions.push({ ck: c.ck, n: c.n, currentL3: c.currentL3, judge_raw: jv, ref_raw: rv, failed: true,
        path: "VIGA:" + String(e.message || e).slice(0, 80), final_handle: c.currentL3, changed: false });
      chainErr++;
    }
    // Fable-kulu + live-valve inkrementaalselt — piir $CAP → PEATU + SALVESTA SEIS (mitte throw)
    addUsage("claude-fable-5", { input_tokens: chain.fableUsage.input, output_tokens: chain.fableUsage.output });
    chain.fableUsage.input = 0; chain.fableUsage.output = 0;   // ära topelt-loe
    done++;
    if (done % 200 === 0) process.stderr.write(`  resolveChain ${done}/${CLUSTERS.length}  Fable-klastreid ${fableClusters}  $${COST.usd.toFixed(2)}\r`);
    if (COST.usd > CAP) { console.error(`\n🛑 KULUPIIR $${CAP} ÜLETATUD ($${COST.usd.toFixed(2)}) @ resolveChain ${done}/${CLUSTERS.length} → STOPP + salvesta töödeldud seis`); stopped = true; break; }
  }
  console.log(`\n[B] ${stopped ? "PEATATUD (kulupiir)" : "valmis"}: töödeldud ${done}/${CLUSTERS.length}, Fable-klastreid ${fableClusters} (${(100 * fableClusters / Math.max(1, done)).toFixed(1)}%), nonChain/keep ${nonChain}, ahela-vigu ${chainErr}`);

  // ── LEIUD (ainult töödeldud klastrid; stop korral = osaline) ──
  const findings = [];
  for (const c of CLUSTERS) {
    const t = results.get(c.ck); if (!t || t.nonChain) continue;
    const home = t.decisionHandle;
    if (home === "NEW") findings.push({ type: "new_l3", ck: c.ck, title: c.rep.title, n: c.n,
      current: c.currentL3, currentName: L3META[c.currentL3]?.name, currentMain: mainName(c.currentL3),
      newName: t.newName, parentL2: t.parentL2, parentL2Name: L3META[t.parentL2]?.name || NBYH[t.parentL2]?.name_et,
      gate: t.gate, path: t.path, garden: isGardenMain(c.currentL3), skus: (c.skus || []).slice(0, 5) });
    else if (home && home !== c.currentL3) findings.push({ type: "move", ck: c.ck, title: c.rep.title, n: c.n,
      current: c.currentL3, currentName: L3META[c.currentL3]?.name, currentMain: mainName(c.currentL3),
      proposed: home, proposedName: L3META[home]?.name, proposedMain: mainName(home),
      crossMain: mainOf(c.currentL3) !== mainOf(home), path: t.path,
      garden: isGardenMain(c.currentL3) || isGardenMain(home), skus: (c.skus || []).slice(0, 5) });
  }
  const moves = findings.filter((f) => f.type === "move");
  const newL3 = findings.filter((f) => f.type === "new_l3");
  const prodMoves = moves.reduce((s, f) => s + (f.n || 1), 0);
  const prodNew = newL3.reduce((s, f) => s + (f.n || 1), 0);

  // kattuvused: cross-main liigutused grupeeritud (currentMain → proposedMain)
  const overlapMap = new Map();
  for (const f of moves.filter((m) => m.crossMain)) {
    const k = `${f.currentMain} → ${f.proposedMain}`;
    if (!overlapMap.has(k)) overlapMap.set(k, { pair: k, clusters: 0, products: 0, examples: [] });
    const o = overlapMap.get(k); o.clusters++; o.products += f.n || 1;
    if (o.examples.length < 4) o.examples.push({ title: (f.title || "").slice(0, 50), from: f.currentName, to: f.proposedName });
  }
  const overlaps = [...overlapMap.values()].sort((a, b) => b.products - a.products);

  // garden-jaotus
  const gardenFindings = findings.filter((f) => f.garden);
  const gardenProducts = gardenFindings.reduce((s, f) => s + (f.n || 1), 0);

  // ── PÜSIV OTSUSTE-FAIL (taaskasutuseks execute'is ILMA uute API-kutseteta) ──
  const DECISIONS_FILE = `${REPO}/reports/audit-full-decisions-2026-10-07.json`;
  fs.writeFileSync(DECISIONS_FILE, JSON.stringify({
    generated_at: new Date().toISOString(), mode: "full-chain-batch", dry_run: true,
    cap_usd: CAP, stopped, processed: done, n_clusters: CLUSTERS.length,
    key_integrity: keyIntegrity,
    note: "DRY audit. 'decisions[]' = täielik ahela-provenance per klaster (judge_raw + ref_raw + fable + resolution + final_handle). Execute: loe 'changed:true' read, rakenda final_handle/newName/parentL2 — ILMA uute LLM-kutseteta.",
    decisions,
  }, null, 2));

  const out = { generated_at: new Date().toISOString(), mode: "full-chain-batch", cap_usd: CAP,
    stopped, processed: done, coverage_pct: +(100 * done / CLUSTERS.length).toFixed(1),
    n_clusters: CLUSTERS.length, judge_ok: jByKey.size, ref_ok: rByKey.size,
    judge_fail: jRes.reqFail, ref_fail: rRes.reqFail,
    judge_unresolved: jRes.unresolved.length, ref_unresolved: rRes.unresolved.length,
    judge_foreign: jRes.foreign.length, ref_foreign: rRes.foreign.length,
    fable_clusters: fableClusters, nonchain_keep: nonChain, chain_errors: chainErr,
    n_findings: findings.length, moves: moves.length, moves_products: prodMoves,
    new_l3: newL3.length, new_l3_products: prodNew,
    cross_main_moves: moves.filter((m) => m.crossMain).length,
    garden_findings: gardenFindings.length, garden_products: gardenProducts,
    cost_usd: +COST.usd.toFixed(2), cost_by_model: Object.fromEntries(Object.entries(COST.byModel).map(([k, v]) => [k, +v.toFixed(2)])),
    cache_read_tok: COST.cacheReadTok, cache_write_tok: COST.cacheWriteTok, calls: COST.calls,
    key_integrity: keyIntegrity,
    decisions_file: DECISIONS_FILE, overlaps, findings };
  fs.writeFileSync(`${SP}/audit-full.json`, JSON.stringify(out, null, 2));
  console.log(`\n── TÄIS-AUDIT TULEMUS ${stopped ? "(PEATATUD — OSALINE)" : "(TÄIELIK)"} ──`);
  console.log(`kaetud: ${done}/${CLUSTERS.length} (${out.coverage_pct}%)`);
  console.log(`leide: ${out.n_findings}  (liiguta: ${moves.length} = ${prodMoves} toodet · uus-L3 shadow: ${newL3.length} = ${prodNew} toodet)`);
  console.log(`cross-main liigutusi: ${out.cross_main_moves} · garden-leide: ${gardenFindings.length} (${gardenProducts} toodet)`);
  console.log(`KULU KOKKU $${out.cost_usd}  (cache_read ${COST.cacheReadTok} tok, cache_write ${COST.cacheWriteTok} tok, kutseid ${COST.calls})`);
  console.log(`otsused salvestatud: ${DECISIONS_FILE} (${decisions.length} kirjet, taaskasutuseks execute'is)`);
  return out;
}

// ─────────────── MAIN ───────────────
(async () => {
  try {
    if (STAGE === "measure") await stageMeasure();
    else if (STAGE === "calibrate") { await stageMeasure(); await stageCalibrate(150); }
    else if (STAGE === "probe") { await stageProbe(60); }
    else if (STAGE === "full") { await stageFull(); }
    console.log(`\n✅ ${STAGE} valmis — KULU KOKKU $${COST.usd.toFixed(3)}  (kutseid ${COST.calls})`);
  } catch (e) {
    console.error(`\n🛑 STOPP (${e.message}) — kulu $${COST.usd.toFixed(3)}`);
    process.exit(e.message === "COST_CAP" ? 4 : 1);
  }
})();
