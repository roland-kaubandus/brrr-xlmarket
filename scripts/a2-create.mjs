#!/usr/bin/env node
/**
 * a2-create.mjs — A2 grab-bag JAGAMINE uuteks L3-deks (Tarmo 2026-11-18 "JAH 26").
 *
 * SAMA LOOMISMOOTOR kui ETAPP 3 (HARD RULE #5): scripts/lib/l3-create-engine.mjs (runL3Batches),
 *   varade-väravad l3-gates.mjs (genAssetsGated SEO + completenessCheck pilt/täielikkus) +
 *   l3-desc.mjs (genValidatedDesc tüübiprofiil/kirjeldus/piirireegel). Naabrite ülehindamine =
 *   runL3Batches granularity+neighbor väravad.
 *
 * JAGAMISE SEMANTIKA (Tarmo 2026-11-18, HARD RULE #5 — scripts/lib/split-semantics.mjs):
 *   PÕHISEADE/domineeriv kontseptsioon JÄÄB allika-L3-sse; AINULT eri alamkontseptsioonid (tarvikud/varuosad/
 *   eri tooteliik) saavad UUED L3-d. "Uus põhiseadme-L3" = allika duplikaat → EI looda. Allika ümbernimetus +
 *   301 + Plekikäärid teeb FAAS 2 (scripts/a2-source-cleanup.mjs), MITTE siin.
 *
 * SISEND: reports/A2-semantika.json (per-allikas subs = LAHKUVAD rühmad; core + jäägid jäävad allikasse) +
 *   reports/a2-assign.json (per-toode sihid + kindlus). Uus L3 = iga SUB (semantika), mille tooted (target==sub
 *   JA confidence≥0.7) ≥ THR. Core + KEEP + alla-THR + madal-kindlus → jäävad allikasse (reparent ei puuduta).
 *
 * detachV4L3=true → iga uude L3-sse pandav toode eemaldatakse allika-L3-st (liigutus, mitte koopia).
 *
 * KÄSK:  set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/a2-create.mjs                 # DRY plaan (varad+väravad) → reports/A2-plaan.{md,json}
 *   node scripts/a2-create.mjs --execute       # LIVE (kinnitatud plaanist, EI regen varad)
 *   valikud: --batch-size 60 (vaikimisi üks partii = üks deploy)  --force-window
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { norm, slugId, deriveHandle, genAssetsGated, completenessCheck } from "./lib/l3-gates.mjs";
import { makeCaller, genValidatedDesc } from "./lib/l3-desc.mjs";
import { runL3Batches, resolveContainers } from "./lib/l3-create-engine.mjs";

const REPO = "/opt/xlmarket-github";
const val = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d; };
const EXECUTE = process.argv.includes("--execute");
const FORCE_WINDOW = process.argv.includes("--force-window");
const BATCH_SIZE = +val("--batch-size", "60") || 60;
const ASSIGN = `${REPO}/reports/a2-assign.json`;
const SRCP = `/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad/src-parents.tsv`;
const OUT_MD = `${REPO}/reports/A2-plaan.md`;
const OUT_JSON = `${REPO}/reports/A2-plaan.json`;
const FABLE = "claude-fable-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

function inNightWindow() { const d = new Date(); const m = d.getHours() * 60 + d.getMinutes(); return m >= 165 && m <= 270; }
function assertNotNightWindow(what) { if (inNightWindow() && !FORCE_WINDOW) { console.error(`🌙 ÖÖ-AKEN — ${what} peatatud. --force-window möödaviiguks.`); process.exit(3); } }

const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }

const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8"));
const NODES = tree.nodes;
const nodeName = (h) => NODES[h]?.name_et || NODES[h]?.name_en || h;
const existingHandles = new Set(Object.keys(NODES));
const mainNameOf = (h) => { let c = h; while (c && NODES[c]?.parent_handle) c = NODES[c].parent_handle; return nodeName(c || h); };
const neighborNamesOf = (l2) => (NODES[l2]?.child_handles || []).map(ch => nodeName(ch)).filter(Boolean);

// ── allika → L2-vanem handle (src-parents.tsv: id handle l2id l2handle l2name) ──
const srcParent = new Map();
for (const line of fs.readFileSync(SRCP, "utf8").trim().split("\n").filter(Boolean)) {
  const [id, handle, l2id, l2handle, l2name] = line.split("\t");
  srcParent.set(id, { handle, l2id, l2handle, l2name });
}

// ── SAMM 1: kandidaadid — SEMANTIKA subs (A2-semantika.json) × a2-assign tooted ──
const SEMANTIKA = `${REPO}/reports/A2-semantika.json`;
if (!fs.existsSync(SEMANTIKA)) { console.error(`❌ ${SEMANTIKA} puudub — jooksuta enne: node scripts/a2-semantics.mjs`); process.exit(2); }
const sem = JSON.parse(fs.readFileSync(SEMANTIKA, "utf8"));
const subsOf = new Map();   // srcId → Set(sub-nimed, mis LAHKUVAD uute L3-dena)
for (const s of sem.results) if (!s.error && !s.cancel) subsOf.set(s.id, new Set(s.subs || []));

const j = JSON.parse(fs.readFileSync(ASSIGN, "utf8"));
const hold = j.results.filter(r => !r.error).map(r => ({ r, a: j.analysis.find(x => x.id === r.id) })).filter(x => x.a && x.a.splitHolds);

function buildCandidates() {
  const cands = [], warn = [];
  for (const { r, a } of hold) {
    const sp = srcParent.get(r.id);
    if (!sp) { warn.push(`${r.id}: L2-vanem puudub src-parents.tsv-st`); continue; }
    const THR = a.THR;
    const subs = subsOf.get(r.id);
    if (!subs || !subs.size) { warn.push(`${r.id} «${r.name}»: semantika CANCEL/0 subi → allikas jääb terveks (0 uut L3)`); continue; }
    // AINULT semantika subs lahkuvad; core + jäägid jäävad allikasse. Kaitse: sub PEAB olema a.viable seas.
    const viableNames = a.viable.map(v => v.newl3).filter(nm => subs.has(nm));
    for (const nm of viableNames) {
      const products = r.assign.filter(it => it.target === nm && it.confidence >= 0.7).map(it => ({ id: it.product_id, title: it.title }));
      if (products.length < THR) { warn.push(`${r.id} «${nm}»: ${products.length}<THR ${THR} pärast kindlus-filtrit → jäetakse (tooted allikasse)`); continue; }
      cands.push({
        ck: `a2:${r.id}:${slugId(nm)}`, name_et: nm, parentL2: sp.l2handle, parentL2_name: sp.l2name,
        currentL3: sp.handle, srcId: r.id, srcName: r.name, n: products.length, products,
        titles: products.map(p => p.title).filter(Boolean),
        cert: { mode: "a2-concept", detail: `kontseptsioonitest live-DB (${products.length}/${r.assign.length}), THR ${THR}` },
      });
    }
  }
  return { cands, warn };
}

// ── SAMM 2: varad (SEO + tüübiprofiil) + completeness — SAMA kui ETAPP3 buildPlans ──
let usage = { input: 0, output: 0, calls: 0 };
async function fableRaw(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: FABLE, max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Fable HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const jr = await res.json();
  if (jr.usage) { usage.input += jr.usage.input_tokens || 0; usage.output += jr.usage.output_tokens || 0; usage.calls++; }
  const raw = (jr.content || []).find(c => c.type === "text")?.text || "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Fable JSON puudub: ${raw.slice(0, 200)}`);
  return JSON.parse(m[0]);
}
const tpUsage = { "claude-opus-4-8": { in: 0, out: 0 }, "claude-sonnet-5": { in: 0, out: 0 }, "claude-fable-5": { in: 0, out: 0 } };
const callApiTP = makeCaller({ apiKey: API_KEY, onUsage: (model, u) => { if (u && tpUsage[model]) { tpUsage[model].in += u.input_tokens || 0; tpUsage[model].out += u.output_tokens || 0; } } });

async function buildPlans(cands) {
  const plans = [];
  for (const c of cands) {
    const { handle, collision } = deriveHandle(c.parentL2, c.name_et, existingHandles);
    const titles = c.titles;
    process.stdout.write(`  • «${c.name_et}» (${c.n}) → ${c.parentL2_name} … Fable SEO`);
    let assets;
    try { assets = await genAssetsGated(fableRaw, c.name_et, c.parentL2_name, titles); process.stdout.write(assets._seoGate?.pass ? ` ✓ (SEO ${assets._seoGate.attempts}×)` : ` ⚠ SEO-värav kukub`); }
    catch (e) { process.stdout.write(` ✗ ${e.message}`); assets = { error: e.message }; }
    let type_profile = null;
    try {
      const rr = { id: slugId(assets.name_en || c.name_et), name: c.name_et, main: mainNameOf(c.parentL2), l2: c.parentL2_name, n: c.n, naabrid: neighborNamesOf(c.parentL2), titles };
      const tp = await genValidatedDesc(callApiTP, rr, { regenMax: 2 });
      type_profile = { description: tp.description, ok: tp.ok, consensus: tp.consensus, attempts: tp.attempts };
      process.stdout.write(` · tüübiprofiil ${tp.ok ? "OK" : "⚠" + tp.consensus}\n`);
    } catch (e) { type_profile = { description: "", ok: false, consensus: "ERROR", error: e.message }; process.stdout.write(` · tüübiprofiil ✗\n`); }
    const plan = {
      ck: c.ck, foldedCks: [c.ck], name_et: c.name_et, name_en: assets.name_en || null, handle, handleCollisionResolved: collision,
      parentL2: c.parentL2, parentL2_name: c.parentL2_name, n: c.n, currentL3: c.currentL3, srcId: c.srcId, srcName: c.srcName,
      path: `${mainNameOf(c.parentL2)}/${c.parentL2_name}/${c.name_et}`, cert: c.cert,
      products: c.products.map(p => ({ id: p.id, title: p.title })), assets, type_profile,
    };
    plan.completeness = completenessCheck(plan, { NODES, existingHandles });
    existingHandles.add(handle);
    plans.push(plan);
  }
  return plans;
}

function writePlan(plans, warn) {
  const nowIso = new Date().toISOString();
  const totProd = plans.reduce((s, p) => s + p.n, 0);
  const allPass = plans.every(p => p.completeness.pass && p.assets?._seoGate?.pass);
  const bySrc = {}; for (const p of plans) { (bySrc[p.srcId] ||= { name: p.srcName, l3: [] }).l3.push(p); }
  let md = `# A2 GRAB-BAG JAGAMINE — PLAAN (uued L3, ENNE DB-kirjutust)\n\n`;
  md += `> ${nowIso} · \`scripts/a2-create.mjs\` · allikas \`reports/a2-assign.json\` (LIVE kontseptsioonitest)\n`;
  md += `> Mootor = \`scripts/lib/l3-create-engine.mjs\` (SAMA kui ETAPP3 + öine auto-create, HARD RULE #5).\n`;
  md += `> Fable SEO: ${usage.calls} kutset (~$${((usage.input / 1e6) * 10 + (usage.output / 1e6) * 50).toFixed(2)}) · tüübiprofiil ${JSON.stringify(Object.fromEntries(Object.entries(tpUsage).map(([k, v]) => [k, `${v.in}/${v.out}`])))}\n\n`;
  md += `**${Object.keys(bySrc).length} allikat → ${plans.length} uut L3 · ${totProd} toodet liigutatakse.** Täielikkus+SEO: ${allPass ? "✅ kõik" : "🛑 mõni kukub"}\n\n`;
  if (warn.length) md += `### ⚠️ Märkused (${warn.length})\n${warn.map(w => `- ${w}`).join("\n")}\n\n`;
  md += `---\n\n`;
  for (const srcId of Object.keys(bySrc)) {
    const g = bySrc[srcId];
    md += `## ${g.name} \`${srcId}\` → ${g.l3.length} uut L3\n\n`;
    for (const p of g.l3) {
      const a = p.assets || {};
      md += `### «${p.name_et}» (×${p.n})\n`;
      md += `- EN: ${a.name_en || "—"} · handle \`${p.handle}\`${p.handleCollisionResolved ? " (disambig)" : ""} · L2 ${p.parentL2_name} (\`${p.parentL2}\`)\n`;
      md += `- **SEO (ET):** ${a.description_et || "—"}\n`;
      md += `- tüübiprofiil/piir: ${p.type_profile?.description ? p.type_profile.description.slice(0, 160) : "—"}\n`;
      md += `- **Pilt:** ${a.image_desc_et || "—"} · täielikkus: ${p.completeness.pass ? "✅ 11/11" : "🛑 " + p.completeness.fails.map(f => f.n).join(",")} · SEO-värav ${a._seoGate?.pass ? "✓" : "🛑"}\n\n`;
    }
  }
  fs.writeFileSync(OUT_MD, md);
  fs.writeFileSync(OUT_JSON, JSON.stringify({ generated_at: nowIso, mode: "plan", batch_size: BATCH_SIZE, usage, tpUsage, warn, plans }, null, 2));
  console.log(`\n${allPass ? "✅" : "🛑"} täielikkus+SEO ${plans.filter(p => p.completeness.pass && p.assets?._seoGate?.pass).length}/${plans.length} · 💾 ${OUT_MD} + .json`);
  return allPass;
}

(async () => {
  let plans;
  if (EXECUTE && fs.existsSync(OUT_JSON)) {
    plans = JSON.parse(fs.readFileSync(OUT_JSON, "utf8")).plans;
    console.log(`📋 --execute: olemas plaan (${plans.length} L3) — EI regen SEO (determinism).`);
  } else {
    assertNotNightWindow("plaani varade-genereerimine");
    const { cands, warn } = buildCandidates();
    console.log(`\n🏗  A2 — ${hold.length} allikat, ${cands.length} uut L3 kandidaati · varade genereerimine:`);
    for (const w of warn) console.log(`  ⚠️ ${w}`);
    plans = await buildPlans(cands);
    const allPass = writePlan(plans, warn);
    if (!allPass) { console.error("🛑 Mõni L3 ei läbi täielikkus/SEO → EI jätka. Vaata A2-plaan üle."); process.exit(1); }
    if (!EXECUTE) {
      // Mootori DRY-eelvaade (struktuur: L2-vanemad kehtivad, handle'd, oodatav toodete/L3 arv).
      // NB: granulaarsus-/naabri-kontseptsioonivärav jookseb AINULT live (mootori disain) → siin EI eelvaadata.
      console.log(`\n🔎 Mootori DRY-eelvaade (struktuur-valideerimine) …`);
      const dry = await runL3Batches({
        allPlans: plans, assigns: [], batchSize: BATCH_SIZE, mode: "dry-first",
        batchPrefix: "a2", label: "A2-split", neighbor: { enabled: true, capPer: 3, topcl: 40 },
        granularity: { enabled: true }, extraGitPaths: [],
      });
      const d0 = dry[0] || {};
      if (!d0.ok) { console.error(`🛑 Mootori DRY kukkus: ${d0.reason}`); process.exit(1); }
      console.log(`  ✅ struktuur OK · uusi L3 ${d0.planned?.new_l3} · tooteid ${d0.planned?.distinct_products} · distinct ${d0.planned?.expect?.distinct} · L3 ${d0.planned?.expect?.l3}`);
      console.log(`\n→ Vaata ${OUT_MD} üle, siis: node scripts/a2-create.mjs --execute`);
      process.exit(0);
    }
  }

  assertNotNightWindow("A2 execute (DB + deploy)");
  const C = resolveContainers();
  if (!C.ok) { console.error("🔴 Konteiner puudu."); process.exit(2); }
  const totalBatches = Math.ceil(plans.length / BATCH_SIZE);
  console.log(`\n🧱 runL3Batches: ${plans.length} L3 · partii ${BATCH_SIZE} (${totalBatches} partii) · režiim=${EXECUTE ? "execute" : "dry-first"}`);
  const results = await runL3Batches({
    allPlans: plans, assigns: [], batchSize: BATCH_SIZE, mode: EXECUTE ? "execute" : "dry-first",
    batchPrefix: "a2", label: "A2-split", neighbor: { enabled: true, capPer: 3, topcl: 40 },
    granularity: { enabled: true },
    extraGitPaths: ["reports/A2-plaan.md", "reports/A2-plaan.json", "reports/A2-semantika.json", "reports/A2-semantika.md", "reports/a2-assign.json", "reports/a2-assign-REPORT.md", "scripts/a2-create.mjs", "scripts/a2-assign.mjs", "scripts/a2-semantics.mjs", "scripts/lib/split-semantics.mjs"],
  });
  const okB = results.filter(r => r.ok && !r.dryRun).length;
  const createdL3 = results.filter(r => r.ok && !r.dryRun).flatMap(r => (r.created || []).map(c => c.handle));
  const skippedL3 = [...new Set(results.flatMap(r => r.allSkipped || []))];
  console.log(`\n${"█".repeat(60)}\nA2 ${EXECUTE ? "execute" : "dry"}: ${okB} partii live · loodud ${createdL3.length}${skippedL3.length ? ` · pildi-skip ${skippedL3.length}` : ""}`);
  if (EXECUTE) {
    const undoBatches = results.filter(r => r.ok && !r.dryRun && r.batch_id).map(r => r.batch_id);
    console.log(`  Undo: ${undoBatches.map(b => `node scripts/classifier-undo.mjs --file reports/etapp2-undo-${b}.json`).join(" · ")}`);
    console.log(`  JÄRGMINE: faas 2 — node scripts/a2-source-cleanup.mjs (13 tühja allikat soft-delete+301 + Plekikäärid 5 pumpa)`);
  }
  process.exit(0);
})().catch(e => { console.error("🛑 FATAAL: " + String(e.stack || e.message)); process.exit(1); });
