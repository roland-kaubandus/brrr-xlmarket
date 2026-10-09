#!/usr/bin/env node
/**
 * apply-granularity-gate.mjs — rakenda SUHTELINE granulaarsus-värav (spets §4 gate #8) ETAPP3 45 kandidaadile.
 *
 * Tarmo 2026-10-09 (BUG-parandus): üle-fragmenteerimise värav ei olnud kunagi mootoris → õhukesed L3-d (variandid
 * olemas-õest) läbisid. See skript rakendab parandatud värava (granularity-gate.mjs) KÕIGILE 45-le:
 *   • distinct → jääb plaani (luuakse execute-faasis),
 *   • variant/unclear → EI looda, tooted jäävad koju (currentL3), signaal shadow-ledgerisse (koguneb öösel).
 *
 * READ-ONLY sisu-tabelitele. Kirjutab: reports/ETAPP3-plaan.json (survivors), reports/etapp3-granularity-dropped.json,
 * reports/ETAPP3-plaan.md (regen), reports/etapp3-kuluhinnang.md (regen). Shadow-signaal → classifier_shadow_ledger (--write-shadow, vaikimisi ON).
 *
 * Käsk: set -a; . /opt/eumotors-tasks/.env; set +a; node scripts/apply-granularity-gate.mjs [--no-shadow] [--dry]
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { makeCaller } from "/opt/xlmarket-github/scripts/lib/l3-desc.mjs";
import { granularityGate } from "/opt/xlmarket-github/scripts/lib/granularity-gate.mjs";
import { ensureShadowSchema, recordShadowProposal } from "/opt/xlmarket-github/scripts/lib/shadow-ledger.mjs";

const REPO = "/opt/xlmarket-github";
const OUT_JSON = `${REPO}/reports/ETAPP3-plaan.json`;
const OUT_MD = `${REPO}/reports/ETAPP3-plaan.md`;
const DROPPED_JSON = `${REPO}/reports/etapp3-granularity-dropped.json`;
const COST_MD = `${REPO}/reports/etapp3-kuluhinnang.md`;
const argv = process.argv.slice(2);
const WRITE_SHADOW = !argv.includes("--no-shadow");
const DRY = argv.includes("--dry");

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub"); process.exit(2); }

const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8"));
const NODES = tree.nodes;
const nodeName = (h) => NODES[h]?.name_et || NODES[h]?.name_en || h;

// olemas-õed (L3 selle L2 all) — nimed (puu ei sisalda description'it)
function siblingsOf(l2) {
  const node = NODES[l2];
  if (!node) return [];
  return (node.child_handles || [])
    .map((ch) => NODES[ch])
    .filter((n) => n && n.level === 3)
    .map((n) => ({ handle: n.handle, name_et: n.name_et || n.name_en, name_en: n.name_en }));
}

const plan = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
const candidates = plan.plans.map((pl) => ({
  ck: pl.ck,
  name_et: pl.name_et,
  name_en: pl.name_en || pl.assets?.name_en,
  parentL2: pl.parentL2,
  parentL2_name: pl.parentL2_name,
  currentL3: pl.currentL3,
  n: pl.n,
  titles: (pl.products || []).map((p) => p.title).filter(Boolean),
}));

// usage-arvesti (Anthropic-ämber)
let inTok = 0, outTok = 0;
const RATES = { "claude-opus-4-8": [5, 25] };
const caller = makeCaller({
  apiKey: API_KEY,
  onUsage: (model, usage) => { inTok += usage?.input_tokens || 0; outTok += usage?.output_tokens || 0; },
  timeoutMs: 120000,
});

// kohalik short-circuit: 0 olemas-õde → ei saa olla variant (pole millest) → distinct ilma API-ta
const localPass = new Map();
const needJudge = [];
for (const c of candidates) {
  const sibs = siblingsOf(c.parentL2);
  if (sibs.length === 0) {
    localPass.set(c.ck, { ck: c.ck, pass: true, verdict: "distinct", nearest: null, reason: "0 olemas-õde selle L2 all → ei saa olla variant (kohalik, 0 API)" });
  } else {
    needJudge.push(c);
  }
}

console.log(`\n🔎 Granulaarsus-värav: ${candidates.length} kandidaati`);
console.log(`   • ${localPass.size} kohalik-distinct (0 õde, 0 API)`);
console.log(`   • ${needJudge.length} vajab LLM-otsust (Opus, per-L2 partii)`);
const l2count = new Set(needJudge.map((c) => c.parentL2)).size;
console.log(`   • ~${l2count} API-kutset (per-L2 grupeeritud)\n`);

const { results, apiCalls } = DRY
  ? { results: new Map(needJudge.map((c) => [c.ck, { ck: c.ck, pass: c.n >= 3, verdict: c.n >= 3 ? "distinct" : "variant", nearest: null, reason: "DRY-platshoider" }])), apiCalls: 0 }
  : await granularityGate({
      candidates: needJudge,
      siblingsOf,
      caller,
      onL2: (l2, cands, verdicts) => {
        const nm = cands[0].parentL2_name || l2;
        for (const v of verdicts) {
          const c = cands.find((x) => x.ck === v.ck);
          console.log(`   [${nm}] «${c.name_et}» (${c.n}) → ${v.verdict === "distinct" ? "✅ distinct" : "⛔ " + v.verdict}${v.nearest ? ` (lähim: ${v.nearest})` : ""}`);
          if (v.verdict !== "distinct") console.log(`        └ ${v.reason}`);
        }
      },
    });

for (const [ck, v] of localPass) results.set(ck, v);

const survivors = [], dropped = [];
for (const pl of plan.plans) {
  const v = results.get(pl.ck);
  if (v?.pass) survivors.push(pl);
  else dropped.push({ ...pl, _granularity: v });
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ SURVIVORS (distinct → luuakse): ${survivors.length}`);
console.log(`⛔ DROPPED (variant/unclear → jäävad koju + shadow): ${dropped.length}`);
console.log(`💵 Anthropic (Opus) värav: ${inTok} in / ${outTok} out → $${((inTok/1e6)*RATES["claude-opus-4-8"][0] + (outTok/1e6)*RATES["claude-opus-4-8"][1]).toFixed(3)} · ${apiCalls} kutset`);

// --- shadow-signaal dropped'ile (koguneb öösel) ---
let shadowWritten = 0, shadowErr = null;
const dropRows = dropped.map((d) => ({
  batch_id: "e3-granularity-drop-" + new Date().toISOString().replace(/[:.]/g, "").slice(0, 15),
  cluster_key: d.ck,
  proposed_name: d.name_et,
  parent_l2_handle: d.parentL2,
  origin: d._granularity?.verdict === "unclear" ? "granularity-unclear" : "granularity-variant",
  n_products: d.n,
  all_gates_pass: false,
  gates: { granularity: { pass: false, verdict: d._granularity?.verdict, nearest: d._granularity?.nearest, reason: d._granularity?.reason }, note: "üle-fragmenteerimise värav: variant olemas-õest / ebaselge → EI loodud, tooted jäävad currentL3-s" },
}));

if (WRITE_SHADOW && !DRY && dropRows.length) {
  try {
    const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
    let DB = getDB();
    if (!DB) throw new Error("db-k33g konteinerit ei leitud");
    const esc = (s) => String(s == null ? "" : s).replace(/'/g, "''");
    const q = (sql, tuplesOnly = true) => {
      DB = getDB();
      return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket ${tuplesOnly ? "-tA" : "-A"} -v ON_ERROR_STOP=1 -f -`,
        { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
    };
    ensureShadowSchema(q);
    for (const r of dropRows) { recordShadowProposal(q, r); shadowWritten++; }
    console.log(`📥 shadow-ledger: ${shadowWritten} signaali kirjutatud (classifier_shadow_ledger)`);
  } catch (e) {
    shadowErr = String(e.message).slice(0, 200);
    console.log(`⚠ shadow-ledger kirjutus vahele (${shadowErr}) — signaalid salvestatud ${DROPPED_JSON}, saab hiljem kirjutada`);
  }
}

// --- kirjuta failid ---
fs.writeFileSync(DROPPED_JSON, JSON.stringify({ generated_at: new Date().toISOString(), dropped_count: dropped.length, shadow_written: shadowWritten, shadow_err: shadowErr, rows: dropRows, detail: dropped.map((d) => ({ ck: d.ck, name_et: d.name_et, parentL2_name: d.parentL2_name, n: d.n, verdict: d._granularity?.verdict, nearest: d._granularity?.nearest, reason: d._granularity?.reason })) }, null, 2));

if (!DRY) {
  plan.plans = survivors;
  plan.granularity_gate = {
    applied_at: new Date().toISOString(),
    total_before: candidates.length,
    survivors: survivors.length,
    dropped: dropped.length,
    local_pass: localPass.size,
    api_calls: apiCalls,
    anthropic_cost_usd: +(((inTok/1e6)*RATES["claude-opus-4-8"][0] + (outTok/1e6)*RATES["claude-opus-4-8"][1]).toFixed(3)),
    shadow_written: shadowWritten,
  };
  plan.refreshStats = { ...(plan.refreshStats || {}), distinct: survivors.length, granularity_dropped: dropped.length };
  fs.writeFileSync(OUT_JSON, JSON.stringify(plan, null, 2));
}

// --- regen plaan .md ---
if (!DRY) {
  const totProd = survivors.reduce((s, x) => s + x.n, 0);
  let md = `# ETAPP 3 — LÕPLIK PLAAN (granulaarsus-värava järel)\n\n`;
  md += `> Genereeritud ${plan.generated_at} · granulaarsus-värav ${new Date().toISOString().slice(0,16)} · \`scripts/apply-granularity-gate.mjs\`\n`;
  md += `> **REŽIIM: PLAAN — DB/staging sisu puutumata.** Loomismootor = \`scripts/lib/l3-create-engine.mjs\` (SAMA kui öine auto-create, HARD RULE #5).\n\n`;
  md += `## Lehter\n\n`;
  md += `- audit new_l3 **52** → KEEP **51** (−1 MOOT) → fold exact-name **48** → near-dup merge **45** → **granulaarsus-värav → ${survivors.length} distinct L3** (−${dropped.length} variant/ebaselge)\n\n`;
  md += `### ⛔ Granulaarsus-värav eemaldas (variant olemas-õest / ebaselge → EI looda, tooted jäävad koju + shadow)\n\n`;
  md += `| L3 (kandidaat) | tooteid | L2 | verdikt | lähim olemas-õde | põhjus |\n|---|---:|---|---|---|---|\n`;
  for (const d of dropped) md += `| «${d.name_et}» | ${d.n} | ${d.parentL2_name} | ${d._granularity?.verdict} | ${d._granularity?.nearest || "—"} | ${(d._granularity?.reason||"").replace(/\|/g,"/")} |\n`;
  md += `\n---\n\n`;
  for (const pl of survivors) {
    const a = pl.assets || {};
    md += `## «${pl.name_et}»  (×${pl.n} toodet)${(pl.foldedCks||[]).length>1?` [fold ${pl.foldedCks.join("+")}]`:""}\n\n`;
    md += `| väli | väärtus |\n|---|---|\n`;
    md += `| EN nimi | ${a.name_en || pl.name_en || "—"} |\n| handle | \`${pl.handle}\` |\n`;
    md += `| L2-vanem | ${pl.parentL2_name} (\`${pl.parentL2}\`) |\n| senine L3 | \`${pl.currentL3}\` → reparent |\n`;
    md += `| granulaarsus | ✅ ${(results.get(pl.ck)?.reason||"distinct").replace(/\|/g,"/")} |\n`;
    md += `| tagline ET | ${a.tagline_et || "—"} |\n\n**SEO (ET):** ${a.description_et || "—"}\n\n---\n\n`;
  }
  md += `## KOKKUVÕTE\n\n- **${survivors.length} uut L3**, **${totProd} toodet** (reparent).\n- Granulaarsus-värav: −${dropped.length} (shadow: ${shadowWritten} kirjutatud${shadowErr?`, viga: ${shadowErr}`:""}).\n`;
  fs.writeFileSync(OUT_MD, md);
}

console.log(`\n💾 ${OUT_JSON}\n💾 ${OUT_MD}\n💾 ${DROPPED_JSON}`);
console.log(`\nSURVIVORS nimekiri:`);
for (const pl of survivors) console.log(`  ✅ «${pl.name_et}» (${pl.n}) → ${pl.parentL2_name}`);
