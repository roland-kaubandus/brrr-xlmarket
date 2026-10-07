#!/usr/bin/env node
/**
 * neighbor-reeval.mjs — NAABRITE ÜLEHINDAMINE uue L3 sünnil (spets: reports/naabrite-ulehindamine-spets.md).
 *
 * Idee: kui L3 H sünnib (või on äsja-tühi), hinda üle NAABER-L3-de tooted — kas mõni kuulub H-sse
 * PARIMAKS koduks (move, mitte dual-home). Sama classify-chain.mjs ahel, kitsas kandidaat-list {H} ∪ naabrid.
 *
 * ESIMENE TESTJUHTUM: 9 tühja standalone L3 (ETAPP 2 audit) = "äsja-sündinud tühi kodu".
 *
 * HARD RULE #5 (üks transform, kaks kutsujat): kogu compute (neighborsOf + pickClusters + reevalClusters +
 * classifyNeighborMoves) elab scripts/lib/neighbor-core.mjs-is. SEE kutsuja = backfill/DRY (kogu kataloog,
 * ühekordne); teine kutsuja = scripts/pipeline-neighbor-chain.mjs (öine hook, DELTA uued L3-d). Tuum ei lahkne.
 *
 * DRY vaikimisi (liigutuste rakendamine = scripts/neighbor-execute.mjs, mis loeb selle JSON-i).
 * Käsk:  set -a; . /opt/eumotors-tasks/.env; set +a; node scripts/neighbor-reeval.mjs [--k 20] [--topcl 40] [--cap 25]
 *
 * NAABRUS (spets §2.2 r29/r81): struktuurne = SAMA L2 PERE, KÕIK klastrid hinnatakse (EI kärbita, deterministlik);
 *                               semantiline = far-field top-K, kulu-bound (--topcl). Kitsas list = spets §5 ökonoomsus.
 *
 * Sisend: scratchpad/audit-clusters.json (D.clusters/.candidateL3s/.l3meta) + category-tree.generated.json (NODES).
 * Väljund: reports/naabrite-ulehindamine-dry.md + scratchpad/neighbor-reeval.json.
 */
import fs from "node:fs";
import { buildNeighborCtx, neighborsOf, pickClusters, narrowCands, reevalClusters, classifyNeighborMoves } from "./lib/neighbor-core.mjs";

const REPO = "/opt/xlmarket-github";
const SP = process.env.SP || "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? +process.argv[i + 1] : d; };
const K_SEM = arg("--k", 20);            // semantilisi naaber-L3 (far-field)
const TOP_CL_SEM = arg("--topcl", 40);   // SEMANTILISTE (far-field) klastrite lagi — struktuursed (sama L2) EI kärbita
const CAP = arg("--cap", 25);            // kulu-lagi $ (GLOBAALNE üle kõigi L3-de)
const LIMIT = arg("--limit", 99);
const OUTJSON = process.env.OUTJSON || `${SP}/neighbor-reeval.json`;

const D = JSON.parse(fs.readFileSync(`${SP}/audit-clusters.json`, "utf8"));
const NODES = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8")).nodes;
const R = JSON.parse(fs.readFileSync(`${SP}/etapp2-results.json`, "utf8"));
const EMPTY = R.emptyRes.filter((e) => e.decision === "standalone").map((e) => e.handle).slice(0, LIMIT);

const L3META = D.l3meta;                       // handle → {name, desc, l2, l2name}
const ctx = buildNeighborCtx({ clusters: D.clusters, l3meta: L3META });   // tuum ehitab L2SIBS/L3GRAMS/CL_BY_L3

// ─────────────────────────── MAIN ───────────────────────────
console.log(`═══ NAABRITE ÜLEHINDAMINE (DRY) — ${EMPTY.length} tühja standalone L3 | K_sem=${K_SEM} topCl_sem=${TOP_CL_SEM} cap=$${CAP} (struktuurne=sama L2, KÕIK) ═══\n`);
const report = [];
let cumCost = 0;
for (const H of EMPTY) {
  if (cumCost > CAP) { console.log(`🛑 kulu-lagi — katkestan ${H} juures`); break; }
  const m = L3META[H];
  const { structural, semantic, neighbors } = neighborsOf(H, ctx, { K_SEM });
  const { picked, nStruct, nSem } = pickClusters(H, { structural, semantic }, ctx, { TOP_CL_SEM });
  const cands = narrowCands(H, neighbors, ctx);
  console.log(`\n▸ «${m.name}» (${H})\n  naabrid: ${structural.size} struktuurne (sama L2) + ${semantic.length} semantiline = ${neighbors.size} uniq | klastreid: ${nStruct} struktuurne (KÕIK) + ${nSem} semantiline = ${picked.length} ahelasse`);
  if (!picked.length) { console.log("  (0 klastrit — jätan vahele)"); report.push({ handle: H, name: m.name, neighbors: neighbors.size, evaluated: 0, structClusters: 0, semClusters: 0, pull: [], other: [] }); continue; }
  const { decisions, costUsd } = await reevalClusters(picked, cands, { nodes: NODES, apiKey: KEY, cap: CAP - cumCost, chunk: 20,
    onProgress: (d, t, usd) => process.stderr.write(`  ahel ${d}/${t}  $${(cumCost + usd).toFixed(2)}\r`) });
  cumCost += costUsd;
  const { pull, other, failed, tally } = classifyNeighborMoves(H, picked, decisions);
  // rikasta from/to nimedega (raport)
  for (const p of pull) p.fromName = L3META[p.from]?.name;
  for (const o of other) o.toName = L3META[o.to]?.name;
  console.log(`  → PULL H-sse: ${pull.length} klastrit (${pull.reduce((s, p) => s + p.n, 0)} toodet) | move_to_other: ${other.length} | jääb-kohale: ${tally.stay} | kohtunik-keep/otsuseta: ${tally.keep_nodec} | new_l3: ${tally.new} | kukkus: ${failed.length}`);
  for (const p of pull.slice(0, 8)) console.log(`     ⤷ «${(p.title || "").slice(0, 55)}» ← ${p.fromName} (sim=${p.sim})`);
  report.push({ handle: H, name: m.name, neighbors: neighbors.size, evaluated: picked.length, structClusters: nStruct, semClusters: nSem, pull, other, failed: failed.length, tally });
  // inkrementaalne salvestus — osaline progress säilib ka kui protsess tapetakse
  fs.writeFileSync(OUTJSON, JSON.stringify({ cost: +cumCost.toFixed(2), params: { K_SEM, TOP_CL_SEM }, done: report.length, total: EMPTY.length, report }, null, 1));
}

// ── RAPORT ──
fs.writeFileSync(OUTJSON, JSON.stringify({ cost: +cumCost.toFixed(2), params: { K_SEM, TOP_CL_SEM }, report }, null, 1));
const L = [];
L.push("# NAABRITE ÜLEHINDAMINE — DRY (9 tühja standalone L3)");
L.push("");
L.push(`> Spets: reports/naabrite-ulehindamine-spets.md · ESIMENE testjuhtum · DRY (0 DB-muudatust) · 2026-10-07`);
L.push(`> Sisend: audit-clusters.json (${D.clusters.length} klastrit, ETAPP2-eelne seis) · K_sem=${K_SEM} · topCl_sem=${TOP_CL_SEM} · kulu $${cumCost.toFixed(2)}`);
L.push("");
L.push("Naabrus (spets §2.2): **struktuurne = sama L2 pere, KÕIK klastrid kärpimata** (deterministlik) + **semantiline far-field top-K** (kulu-bound). Iga klaster läbi SAMA classify-chain ahela (kitsas kandidaat-list {H} ∪ naabrid). **PULL** = ahel paigutaks toote tühja L3-sse (lõksus-toode leitud). **move_to_other** = bonus-leid kolmandasse naabrisse.");
L.push("");
L.push("| Tühi L3 | naabreid | klastrid (strukt KÕIK + sem) | PULL (klastrit/toodet) | move_to_other |");
L.push("|---|---|---|---|---|");
for (const r of report) L.push(`| «${r.name}» | ${r.neighbors} | ${r.structClusters ?? "?"} + ${r.semClusters ?? "?"} = ${r.evaluated} | **${r.pull.length}** / ${r.pull.reduce((s, p) => s + p.n, 0)} | ${r.other.length} |`);
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
L.push(`- **DRY** — midagi EI liigutatud. Päris-liigutus = scripts/neighbor-execute.mjs (väravad: transaktsioon + undo + inv + lock-harness + Meili, spets §4).`);
L.push(`- **Staleness-märge:** audit-clusters.json on ETAPP2-eelne (63/18910 toodet liikus vahepeal) — mehhanismi-tõestuseks tühine; päris-hookis (pipeline-neighbor-chain.mjs) loetakse LIVE DB.`);
if (!process.env.NOMD) fs.writeFileSync(`${REPO}/reports/naabrite-ulehindamine-dry.md`, L.join("\n") + "\n");
console.log(`\n\n✅ DRY VALMIS. PULL ${totPull} klastrit / ${totPullN} toodet | other ${totOther} | kulu $${cumCost.toFixed(2)}`);
console.log(`Raport: reports/naabrite-ulehindamine-dry.md · JSON: ${OUTJSON}`);
