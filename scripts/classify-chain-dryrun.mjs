#!/usr/bin/env node
/**
 * classify-chain-dryrun.mjs — B-klassifikaatori otsustusahela ETAPP 1 DRY-run.
 *
 * Spec: reports/b-klassifikaator-taisautomaatika-spets.md §10 (ETAPP 1 AINULT).
 * EI kirjuta DB-sse, EI deploy'i, EI loo päris L3-sid. Ainult simulatsioon + raport.
 *
 * Ahel (§2 + §2b):
 *   KOHTUNIK (Opus-4.8, taaskasut. calib-classify.json)
 *     → REFERENTS (Sonnet-5, taaskasut. calibration_rating → calib-rows.json)
 *     → [lahkheli] VIIGIMURDJA Fable-5 (sama granulaarsuse-prompt §3)
 *     → 2/3 enamus
 *     → [kõik eri meelt] MADALAIM ÜHINE ÜLEM (LCA, §2b)
 *
 * Väravad (§4) DRY-run new_l3-lahenduse klastritel (DUP · über-frag · nime-reegel · merge/grab märge).
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a   # ANTHROPIC_API_KEY (väärtust EI logi)
 *   node scripts/classify-chain-dryrun.mjs --out reports/classify-chain-dryrun.json
 */
import fs from "node:fs";

const REPO = "/opt/xlmarket-github";
const SCRATCH = "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const val = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d; };
const OUT = val("--out", `${REPO}/reports/classify-chain-dryrun.json`);
const FABLE = "claude-fable-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

// ---- andmed ----
const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8"));
const NODES = tree.nodes;
const rows = JSON.parse(fs.readFileSync(`${SCRATCH}/calib-rows.json`, "utf8"));           // judge+ref verdiktid (40)
const classify = JSON.parse(fs.readFileSync(`${REPO}/storefront/public/xl-admin/calib-classify.json`, "utf8")); // kohtuniku täisotsus + considered_l3s

// cluster_key → kohtuniku rikas otsus (considered_l3s, parent_l2_handle, new_l3_name)
const judgeByCk = {};
for (const d of classify.decisions) {
  if (!judgeByCk[d.cluster_key]) judgeByCk[d.cluster_key] = d.judge;
}

// ---- puu-helperid (LCA) ----
function ancestors(handle) {
  // tagastab [handle, parent, ..., L1] (handle kaasa arvatud)
  const out = [];
  let h = handle;
  const seen = new Set();
  while (h && NODES[h] && !seen.has(h)) {
    seen.add(h);
    out.push(h);
    h = NODES[h].parent_handle || null;
  }
  return out;
}
function nodeLevel(h) { return NODES[h]?.level ?? null; }
function nodeName(h) { return NODES[h]?.name_et || NODES[h]?.name_en || h; }

function lca(anchors) {
  // anchors = handlete massiiv (L3 või L2). Tagastab {handle, level} sügavaima ühise ülema.
  const chains = anchors.filter(Boolean).map(ancestors);
  if (chains.length < 2) return null;
  // ühisosa, säilita 1. keti järjekord (juurest-alla pole; keti algus = sügavaim)
  let common = chains[0].filter(h => chains.every(c => c.includes(h)));
  if (!common.length) return null;
  // sügavaim ühine = suurim level
  common.sort((a, b) => (nodeLevel(b) || 0) - (nodeLevel(a) || 0));
  return { handle: common[0], level: nodeLevel(common[0]) };
}

// ---- Fable viigimurdja (§3 granulaarsus-prompt sõna-sõnalt) ----
const GRANULAR = `L3-GRANULAARSUS — millal toode väärib OMA uut L3 vs olemas-naaber-L3:

Küsi: kas see tüüp erineb LÄHIMAST olemas-L3-st OSTJA-otsingu ja
funktsiooni/VÄLJUNDI mõttes nii palju, et ostja otsiks seda eraldi?

• ERI TÜÜP (→ new_l3): funktsioon VÕI väljund (tulem) erineb — ostja EI SAA
  toodet B asendada tootega A sama tulemusega.
  Nt: konsool-puiduriiul (kandekäpad) ≠ seinariiul (tasandid);
      LiFePO4 energiasalvesti (tsükliline salvestus) ≠ sõidukiaku (käivitusvool);
      helbejäämasin ≠ kuubikjäämasin (väljund erineb).

• VARIANT (→ assign_existing): sama funktsioon+väljund, erineb ainult
  vorm / suurus / materjal / paigaldus / energiaallikas — ostja otsib SAMA
  asja teises vormis.
  Nt: lae- vs seinaventilaator; torn- vs põrandaventilaator; pitsakivi vs -teras.

• SUHTELINE, MITTE absoluutne: ÄRA loe tooteid ("N tükki → uus L3").
  Otsusta SEMANTILISE KAUGUSE järgi lähimast olemas-L3-st:
   – kui kaugus ≥ tüüpiline kaugus olemas-õdede-L3-de vahel (sama L2) → OMA L3;
   – kui kaugus < see → variant → mine olemasolevasse.

• ENNE new_l3 KOHUSTUSLIK: täida considered_l3s (2–5 lähimat olemas-L3 handle)
  + considered_reason (miks semantiline kaugus liiga suur). Tühi considered →
  pead valima assign_existing (DUP-värav, B2).

• EKSKLUSIIVSUS- ja HÜBRIID-reeglid kehtivad granulaarsuse EES:
  ainult-laps/ainult-kommerts → segment-kodu; päris-kaheti → primaar sisust.`;

async function fableTiebreak(cluster) {
  const cands = cluster.candidates.map(h => `  - ${h}  («${nodeName(h)}», L${nodeLevel(h) ?? "?"})`).join("\n");
  const titles = cluster.titles.slice(0, 4).map(t => `  • ${t}`).join("\n");
  const system = `Sa oled sõltumatu taksonoomia-viigimurdja XL e-poe tootekataloogis (VEVOR-tooted).
Kohtunik (Opus) ja referents (Sonnet) ei leppinud kokku, kuhu see tootetüüp kuulub.
Otsusta SÕLTUMATULT, kasutades identset granulaarsuse-reeglit:

${GRANULAR}

Tagasta AINULT JSON (ilma muu tekstita):
{"action":"assign_existing"|"new_l3","target_handle":"<olemas-L3-handle või null>","new_l3_name":"<eesti nimi või null>","parent_l2_handle":"<L2-handle uuele L3-le või null>","reason":"<1 lause>"}`;
  const user = `TOOTETÜÜP (klaster ${cluster.ck}, ${cluster.n} toodet):
${titles}

KOHTUNIK: ${cluster.judgeAction}${cluster.judgeTarget ? " → " + cluster.judgeTarget : ""}
REFERENTS: ${cluster.refAction}${cluster.refTarget ? " → " + cluster.refTarget : ""}
REFERENTSI PÕHJENDUS: ${cluster.refReason || "—"}

KAALUTAVAD OLEMAS-L3-d (DUP-värav — kas mõni sobib?):
${cands || "  (kohtunik ei pakkunud considered_l3s)"}

Otsusta: assign_existing (vali täpne target_handle ülalt) VÕI new_l3 (anna eesti nimi + parent_l2_handle).`;

  const body = {
    model: FABLE,
    max_tokens: 8000, // Fable: thinking always-on sööb eelarvet → anna ruumi, et JSON ei katkeks
    system,
    messages: [{ role: "user", content: user }],
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Fable HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const textBlock = (j.content || []).find(c => c.type === "text");
  const raw = textBlock?.text || "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Fable JSON puudub: ${raw.slice(0, 200)}`);
  const parsed = JSON.parse(m[0]);
  parsed._usage = j.usage;
  return parsed;
}

// ---- klastrite koostamine ----
const clustersMap = {};
for (const r of rows) {
  (clustersMap[r.ck] ||= []).push(r);
}
const clusters = Object.entries(clustersMap).map(([ck, items]) => {
  const j = judgeByCk[ck] || {};
  const judgeAction = items[0].judge;
  const judgeTarget = items[0].jt || j.target_handle || null;
  const refAction = items[0].ref;
  const refTarget = items[0].rt || null;
  const refReason = items.find(i => i.rr)?.rr || "";
  const candidates = (j.considered_l3s || []).slice();
  if (judgeTarget && !candidates.includes(judgeTarget)) candidates.unshift(judgeTarget);
  if (refTarget && !candidates.includes(refTarget)) candidates.push(refTarget);
  return {
    ck, n: items.length, items,
    titles: items.map(i => i.title),
    judgeAction, judgeTarget, refAction, refTarget, refReason,
    judgeNewL3Name: j.new_l3_name || null,
    judgeParentL2: j.parent_l2_handle || null,
    candidates,
  };
});

// ---- hääle-võti ----
function voteKey(action, target) {
  return action === "new_l3" ? "NEW" : `ASSIGN:${target || "?"}`;
}

// ---- über-frag + DUP + nime värava DRY simulatsioon (§4) ----
function gateDryRun(cluster, parentL2) {
  const gates = {};
  // DUP-värav: considered_l3s olemas?
  gates.dup = (cluster.candidates && cluster.candidates.length >= 2)
    ? { pass: true, note: `${cluster.candidates.length} kaalutud L3; ükski ei sobinud` }
    : { pass: false, note: "considered_l3s < 2 → DUP-väravat ei saa kinnitada → HOLD" };
  // über-frag-guard: kas parent-L2-l on juba ≥2 L3? (ei loo uut L2 ühe L3 jaoks)
  let siblingCount = null;
  if (parentL2 && NODES[parentL2]) {
    siblingCount = Object.values(NODES).filter(x => x.parent_handle === parentL2 && x.level === 3).length;
  }
  gates.uberfrag = parentL2
    ? { pass: siblingCount === null || siblingCount >= 1, note: `parent-L2 «${nodeName(parentL2)}» olemas, ${siblingCount ?? "?"} õde-L3 → L3 lisandub olemas-L2-le (uut L2 EI looda)` }
    : { pass: false, note: "parent_l2_handle puudub → über-frag kontroll ebaselge → HOLD" };
  // nime-reegel (NAME-01): nimi peab olema eestikeelne. DRY: inglise-sõna-blokilist
  // (prod = glossary/LLM semantiline kontroll). Eesti liitsõnad (Mängulauad) EI tohi lipituda.
  const EN = new Set(["rope","ropes","table","tables","battery","batteries","storage","rack","racks","game","games","gaming","dining","cart","carts","wagon","shelf","shelves","holder","solar","panel","panels","bag","bags","cord","board","lumber","wood","steel","for","with","and","the","kids","tier","foldable","wall","mobile","cutter","saw","tile"]);
  const nm = cluster.judgeNewL3Name || cluster.fable?.new_l3_name;
  const enHit = nm ? nm.toLowerCase().split(/[\s\-/]+/).filter(w => EN.has(w)) : [];
  gates.name = nm
    ? { pass: enHit.length === 0, note: enHit.length ? `nimi «${nm}» sisaldab ingliskeelseid sõnu (${enHit.join(", ")}) → nime-reegel FAIL` : `nimi: «${nm}»`, name: nm }
    : { pass: false, note: "eestikeelne L3-nimi puudub → nime-reegel FAIL → HOLD" };
  // merge/grab: DRY — ei jookse (API), ainult märge et jookseks peale loomist
  gates.merge_grab = { pass: null, note: "DRY: merge-judge + grab-bag jookseks PÄRAST loomist (ETAPP 2), siin ei käivitata" };
  const blocking = Object.entries(gates).filter(([k, g]) => g.pass === false).map(([k]) => k);
  return { gates, allPass: blocking.length === 0, blocking };
}

// ---- Fable vahemälu (DRY: ära kutsu API-t uuesti) ----
const CACHE = `${REPO}/reports/classify-chain-fable-cache.json`;
let fableCache = {};
try { fableCache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch {}

// ---- peamine ahel ----
const results = [];
let fableUsage = { input: 0, output: 0, calls: 0 };

for (const c of clusters) {
  const r = { ck: c.ck, n: c.n, titles: c.titles, judge: `${c.judgeAction}${c.judgeTarget ? " → " + c.judgeTarget : ""}`, ref: `${c.refAction}${c.refTarget ? " → " + c.refTarget : ""}` };
  const jKey = voteKey(c.judgeAction, c.judgeTarget);
  const rKey = voteKey(c.refAction, c.refTarget);

  if (jKey === rKey) {
    // KONSENSUS (2 mudelit nõus) — Fable pole vaja
    r.path = c.judgeAction === "new_l3" ? "konsensus→new_l3" : "konsensus→assign";
    r.decision = c.judgeAction === "new_l3" ? "new_l3" : `assign:${c.judgeTarget}`;
    r.fable = null;
  } else {
    // LAHKHELI → Fable viigimurdja (vahemälust kui olemas)
    let f;
    if (fableCache[c.ck]) {
      f = fableCache[c.ck];
    } else {
      f = await fableTiebreak(c);
      if (f._usage) { fableUsage.input += f._usage.input_tokens || 0; fableUsage.output += f._usage.output_tokens || 0; fableUsage.calls++; }
      fableCache[c.ck] = f;
      fs.writeFileSync(CACHE, JSON.stringify(fableCache, null, 2));
    }
    c.fable = f;
    const fKey = voteKey(f.action, f.target_handle);
    r.fable = `${f.action}${f.target_handle ? " → " + f.target_handle : f.new_l3_name ? " («" + f.new_l3_name + "»)" : ""} — ${f.reason}`;
    // 2/3 enamus
    const votes = [jKey, rKey, fKey];
    const tally = {};
    for (const v of votes) tally[v] = (tally[v] || 0) + 1;
    const win = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    if (win[1] >= 2) {
      r.path = `2-of-3 (${win[0]})`;
      if (win[0] === "NEW") { r.decision = "new_l3"; }
      else { r.decision = win[0].replace("ASSIGN:", "assign:"); }
    } else {
      // KÕIK ERI MEELT → LCA
      const anchorOf = (action, target, parentL2) => action === "new_l3" ? (parentL2 || null) : target;
      const anchors = [
        anchorOf(c.judgeAction, c.judgeTarget, c.judgeParentL2),
        anchorOf(c.refAction, c.refTarget, null),
        anchorOf(f.action, f.target_handle, f.parent_l2_handle),
      ].filter(Boolean);
      const common = lca(anchors);
      if (common && common.level === 2) {
        r.path = "ühine ülem (L2)";
        r.decision = `LCA-müügis: ${common.handle}-muud (holding-L3 «${nodeName(common.handle)} / muud»)`;
      } else if (common && common.level === 1) {
        r.path = "ühine ülem (L1)";
        r.decision = `LCA-müügis: ${common.handle}-muud (L1 «${nodeName(common.handle)}» muud)`;
      } else {
        r.path = "nähtamatu";
        r.decision = "NÄHTAMATU (ühist ülemat pole ka L1-s) → digest-trend";
      }
      r.lca_anchors = anchors;
    }
  }
  results.push({ ...r, _cluster: c });
}

// ---- väravad new_l3-lahenduse klastritel ----
const newl3Clusters = results.filter(r => r.decision === "new_l3");
for (const r of newl3Clusters) {
  const c = r._cluster;
  const parentL2 = c.judgeParentL2 || c.fable?.parent_l2_handle || null;
  r.gate = gateDryRun(c, parentL2);
}

// ---- müügis vs nähtamatu loendus (toote-tasemel) ----
let muugis = 0, nahtamatu = 0;
for (const r of results) {
  if (r.path === "nähtamatu") nahtamatu += r.n; else muugis += r.n;
}

// ---- väljund ----
const summary = {
  generated_at: new Date().toISOString(),
  dry: true,
  clusters: results.length,
  products: rows.length,
  fable_calls: fableUsage.calls,
  fable_usage: fableUsage,
  fable_cost_usd: +((fableUsage.input / 1e6) * 10 + (fableUsage.output / 1e6) * 50).toFixed(4),
  muugis, nahtamatu,
  new_l3_clusters: newl3Clusters.length,
};
const clean = results.map(({ _cluster, ...r }) => r);
fs.writeFileSync(OUT, JSON.stringify({ summary, clusters: clean }, null, 2));

// ---- konsool ----
console.log("\n═══ ETAPP 1 DRY-RUN — otsustusahel 40 toote peal (13 klastrit) ═══\n");
for (const r of clean) {
  console.log(`▸ ${r.ck}  ×${r.n}  [${r.path}]`);
  console.log(`   "${r.titles[0].slice(0, 60)}"`);
  console.log(`   kohtunik: ${r.judge}`);
  console.log(`   referents: ${r.ref}`);
  if (r.fable) console.log(`   Fable: ${r.fable}`);
  console.log(`   → OTSUS: ${r.decision}`);
  if (r.gate) console.log(`   VÄRAV: ${r.gate.allPass ? "✅ KÕIK OK" : "🛑 BLOKK: " + r.gate.blocking.join(", ")}  ${Object.entries(r.gate.gates).map(([k, g]) => `${k}=${g.pass === null ? "—" : g.pass ? "✓" : "✗"}`).join(" ")}`);
  console.log("");
}
console.log("─────────────────────────────────────────────");
console.log(`Fable kutseid: ${summary.fable_calls}  (in ${fableUsage.input} / out ${fableUsage.output} tok, ~$${summary.fable_cost_usd})`);
console.log(`new_l3-lahendusega klastreid: ${summary.new_l3_clusters}`);
console.log(`MÜÜGIS: ${muugis} toodet   NÄHTAMATU: ${nahtamatu} toodet  (kokku ${rows.length})`);
console.log(`💾 ${OUT}`);
