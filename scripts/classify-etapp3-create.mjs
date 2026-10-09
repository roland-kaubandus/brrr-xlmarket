#!/usr/bin/env node
/**
 * ETAPP 3 — UUTE L3 LOOMINE 2026-10-07 TÄISAUDITI new_l3-OTSUSTEST (Variant B).
 *
 * Jagab LOOMISMOOTORIT `scripts/lib/l3-create-engine.mjs` öise auto-create'iga (HARD RULE #5:
 * üks mootor, kaks kutsujat). Varade-väravad (SEO/tüübiprofiil/pilt/täielikkus) = scripts/lib/l3-gates.mjs +
 * scripts/lib/l3-desc.mjs (SAMA kood kui ETAPP2 + öine shadow-hook).
 *
 * VOOG (Variant B 5 sammu):
 *   1. Loe audit (reports/audit-full-decisions-2026-10-07.json) → final_decision=new_l3 + gate.allPass.
 *   2. VÄRSKENDA live-DB vastu (0 API): ck→tooted, verdikt KEEP/DUP/MOOT; fold exact-name+L2 kollisioonid.
 *   3. ASÜMM-KINDLUS: consensus (judge+ref mõlemad new_l3) → fable.kinnitus=new_l3; tie → viigimurdja
 *      3× hääletus, enamus (≥2/3) new_l3. Mitte-vastav → DROP (spec §2c).
 *   4. Genereeri varad (genAssetsGated SEO + genValidatedDesc tüübiprofiil) + completenessCheck.
 *   5. runL3Batches: DRY esimene partii → raport → (kinnitusel) --execute kõik partiid live.
 *
 * KÄSK:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/classify-etapp3-create.mjs                 # PLAAN + DRY partii 1 → raport (vaikimisi)
 *   node scripts/classify-etapp3-create.mjs --execute       # kõik partiid LIVE (kinnitatud plaanist)
 *   valikud: --batch-size 10  --cap-per 3  --force-window (öö-akna eiramine, AINULT erandina)
 *
 * ⚠️ ÖÖ-AKEN 02:45–04:30 (host CEST) — import-pipeline prioriteet. DB-koormav töö (execute) peatatakse
 *    automaatselt, kui pole --force-window. Plaani-genereerimine (API, DB-vaba) lubatud alati.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import {
  norm, slug, slugId, deriveHandle, genAssetsGated, completenessCheck,
} from "./lib/l3-gates.mjs";
import { makeCaller, genValidatedDesc } from "./lib/l3-desc.mjs";
import { runL3Batches, resolveContainers } from "./lib/l3-create-engine.mjs";

const REPO = "/opt/xlmarket-github";
const val = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d; };
const EXECUTE = process.argv.includes("--execute");
const DRY_FROM_PLAN = process.argv.includes("--dry-from-plan"); // DRY olemas-plaanist (foldi järel), ilma regeneratsioonita
const FORCE_WINDOW = process.argv.includes("--force-window");
const BATCH_SIZE = +val("--batch-size", "10") || 10;
const CAP_PER = parseFloat(val("--cap-per", "3")) || 3;
const ONLY = parseInt(val("--only-batch", "0"), 10) || 0; // --only-batch N → AINULT partii N (execute), kella-kontrolliks ükshaaval
const AUDIT = val("--audit", `${REPO}/reports/audit-full-decisions-2026-10-07.json`);
const OUT_MD = `${REPO}/reports/ETAPP3-plaan.md`;
const OUT_JSON = `${REPO}/reports/ETAPP3-plaan.json`;
const FABLE = "claude-fable-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

// ---- ÖÖ-AKNA VÄRAV (02:45–04:30 host-aeg; DB-koormav töö peatub) ----
function inNightWindow() {
  const d = new Date(); const m = d.getHours() * 60 + d.getMinutes();
  return m >= (2 * 60 + 45) && m <= (4 * 60 + 30);
}
function assertNotNightWindow(what) {
  if (inNightWindow() && !FORCE_WINDOW) {
    console.error(`🌙 ÖÖ-AKEN (02:45–04:30 host) — ${what} peatatud (import-pipeline prioriteet). Oota akna lõppu või --force-window.`);
    process.exit(3);
  }
}

const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g konteiner puudub"); process.exit(2); }
const psql = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -F '\t' -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" }).trim();
const qlist = (a) => a.map(x => `'${String(x).replace(/'/g, "''")}'`).join(",");

const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8"));
const NODES = tree.nodes;
const nodeName = (h) => NODES[h]?.name_et || NODES[h]?.name_en || h;
const existingHandles = new Set(Object.keys(NODES));
const mainNameOf = (h) => { let c = h; while (c && NODES[c]?.parent_handle) c = NODES[c].parent_handle; return nodeName(c || h); };
const neighborNamesOf = (l2) => (NODES[l2]?.child_handles || []).map(ch => nodeName(ch)).filter(Boolean);

// ============================================================
// SAMM 1 — audit new_l3 + gate.allPass
// ============================================================
const audit = JSON.parse(fs.readFileSync(AUDIT, "utf8"));
const rawNewL3 = (audit.decisions || []).filter(c => c.final_decision === "new_l3");
const gated = rawNewL3.filter(c => c.gate && c.gate.allPass === true);
const gateBlocked = rawNewL3.filter(c => !(c.gate && c.gate.allPass === true));
console.log(`\n🏗  ETAPP 3 — audit new_l3: ${rawNewL3.length} · gate.allPass: ${gated.length}${gateBlocked.length ? ` (välja ${gateBlocked.length} värav-blokeeritud)` : ""}`);

// kandidaadi nimi + parent (gate.name.finalName on nime-väravast kinnitatud)
const candName = (c) => c.gate?.gates?.name?.finalName || c.newName || c.fable?.kinnitus?.new_l3_name || c.fable?.viigimurdja?.new_l3_name;
const candParent = (c) => c.parentL2 || c.fable?.kinnitus?.parent_l2_handle || c.fable?.viigimurdja?.parent_l2_handle;

// ============================================================
// SAMM 3 — ASÜMMEETRILINE KINDLUS (spec §2c)
// ============================================================
const isNew = (a) => a === "new_l3";
// hääl salvestatud stringina votes[].v (nt "new_l3 («Nimi») — põhjendus"); tegevus = esimene sõna
const voteAction = (vote) => String(vote?.v ?? vote?.action ?? vote?.decision ?? "").trim().split(/[\s(]/)[0];
function certaintyOf(c) {
  const j = c.judge_raw?.action, r = c.ref_raw?.action;
  const consensus = isNew(j) && isNew(r);
  if (consensus) {
    const k = c.fable?.kinnitus;
    const pass = !!(k && isNew(k.action));
    return { mode: "consensus", pass, detail: pass ? "kinnitus=new_l3" : `kinnitus=${k?.action || "puudub"}` };
  }
  // tie → viigimurdja 3× hääletus (votes), enamus ≥2/3 new_l3
  const votes = c.fable?.votes || [];
  const acts = votes.map(voteAction).filter(Boolean);
  const nNew = acts.filter(isNew).length;
  const pass = acts.length >= 3 && nNew >= 2;
  return { mode: "tie", pass, detail: `hääli ${acts.length}, new_l3 ${nNew} → ${pass ? "enamus" : "pole enamust"}` };
}

// ============================================================
// SAMM 2 — VÄRSKENDUS live-DB vastu (0 API) — ck→tooted, verdikt
// ============================================================
function resolveProducts(cands) {
  const keyed = cands.map(c => ({ c, spu: c.ck.startsWith("spu:") ? c.ck.slice(4) : null, vpt: c.ck.startsWith("vpt:") ? c.ck.slice(4) : null }));
  const spus = [...new Set(keyed.filter(k => k.spu).map(k => k.spu))];
  const vpts = [...new Set(keyed.filter(k => k.vpt).map(k => k.vpt))];
  const where = [];
  if (spus.length) where.push(`p.metadata->>'vevor_spu' IN (${qlist(spus)})`);
  if (vpts.length) where.push(`p.metadata->>'vevor_product_type' IN (${qlist(vpts)})`);
  if (!where.length) return { bySpu: new Map(), byVpt: new Map() };
  const rows = psql(`
    SELECT p.id, p.status, p.title, p.metadata->>'vevor_spu' AS spu, p.metadata->>'vevor_product_type' AS vpt,
      COALESCE(string_agg(DISTINCT pc.handle, '|') FILTER (WHERE pc.handle IS NOT NULL AND pc.mpath LIKE 'pcat_v4_l%' AND pc.deleted_at IS NULL), '') AS l3s
    FROM product p
    LEFT JOIN product_category_product pcp ON pcp.product_id=p.id
    LEFT JOIN product_category pc ON pc.id=pcp.product_category_id
    WHERE p.deleted_at IS NULL AND (${where.join(" OR ")})
    GROUP BY p.id, p.status, p.title, p.metadata->>'vevor_spu', p.metadata->>'vevor_product_type';
  `).split("\n").filter(Boolean).map(l => {
    const [id, status, title, spu, vpt, l3s] = l.split("\t");
    return { id, status, title: title || "", spu, vpt, l3s: l3s ? l3s.split("|") : [] };
  });
  const bySpu = new Map(), byVpt = new Map();
  for (const r of rows) {
    if (r.spu) { if (!bySpu.has(r.spu)) bySpu.set(r.spu, []); bySpu.get(r.spu).push(r); }
    if (r.vpt) { if (!byVpt.has(r.vpt)) byVpt.set(r.vpt, []); byVpt.get(r.vpt).push(r); }
  }
  return { bySpu, byVpt };
}

function refreshAndCertainty(cands) {
  const { bySpu, byVpt } = resolveProducts(cands);
  const keep = [], dropped = [];
  for (const c of cands) {
    const name_et = candName(c), parentL2 = candParent(c);
    const spu = c.ck.startsWith("spu:") ? c.ck.slice(4) : null;
    const vpt = c.ck.startsWith("vpt:") ? c.ck.slice(4) : null;
    const prods = spu ? (bySpu.get(spu) || []) : vpt ? (byVpt.get(vpt) || []) : [];
    const inCurrent = prods.filter(p => p.l3s.includes(c.currentL3)).length;
    const homedElsewhere = prods.filter(p => p.l3s.length && !p.l3s.includes(c.currentL3)).length;
    // attach = tooted, mis on endiselt currentL3-s VÕI kodutud (mujale-liigutatuid EI tiri tagasi — naaber-samm teeb hiljem)
    const attach = prods.filter(p => p.l3s.includes(c.currentL3) || p.l3s.length === 0);
    // DUP: exact-name sibling parentL2 all VÕI global exact-name L3
    const nn = norm(name_et);
    const siblings = NODES[parentL2]?.child_handles || [];
    const dupHit = siblings.find(h => norm(nodeName(h)) === nn);
    const globalDup = Object.values(NODES).find(nd => nd.level === 3 && norm(nd.name_et || nd.name_en) === nn && !siblings.includes(nd.handle) && nd.handle !== c.final_handle);
    const parentOk = !!(NODES[parentL2] && NODES[parentL2].level === 2);
    const cert = certaintyOf(c);

    let verdict = "KEEP", reason = "";
    if (!name_et || !parentL2) { verdict = "DROP_META"; reason = "nimi/parent puudub"; }
    else if (!parentOk) { verdict = "DROP_NO_PARENT"; reason = `parent-L2 '${parentL2}' puudub/pole L2`; }
    else if (dupHit) { verdict = "DROP_DUP"; reason = `DUP sibling '${dupHit}'`; }
    else if (globalDup) { verdict = "DROP_DUP"; reason = `DUP global '${globalDup.handle}'`; }
    else if (attach.length === 0 && inCurrent === 0 && homedElsewhere > 0) { verdict = "DROP_MOOT_LIIGUTATUD"; reason = "kõik tooted vahepeal mujale liigutatud"; }
    else if (attach.length === 0) { verdict = "DROP_MOOT_0"; reason = "0 toodet live-DB-s"; }
    else if (!cert.pass) { verdict = "DROP_KINDLUS"; reason = `asümm-kindlus (${cert.mode}): ${cert.detail}`; }

    const rec = { ck: c.ck, name_et, parentL2, parentL2_name: nodeName(parentL2), currentL3: c.currentL3,
      auditN: c.n, liveN: prods.length, inCurrent, homedElsewhere, attachN: attach.length,
      cert, verdict, reason, products: attach.map(p => ({ id: p.id, title: p.title })),
      titles: attach.map(p => p.title).filter(Boolean), path: c.path || `${c.currentMain}/${c.currentName}` };
    if (verdict === "KEEP") keep.push(rec); else dropped.push(rec);
  }
  return { keep, dropped };
}

// ============================================================
// SAMM 2b — FOLD exact-name + parentL2 kollisioonid (üks L3, tooted liidetakse)
// ============================================================
function foldCollisions(keep) {
  const byKey = new Map();
  for (const r of keep) {
    const key = `${norm(r.name_et)}|${r.parentL2}`;
    if (!byKey.has(key)) { byKey.set(key, { ...r, foldedCks: [r.ck] }); }
    else {
      const t = byKey.get(key);
      const seen = new Set(t.products.map(p => p.id));
      for (const p of r.products) if (!seen.has(p.id)) { t.products.push(p); seen.add(p.id); }
      t.titles = [...t.titles, ...r.titles];
      t.foldedCks.push(r.ck);
      t.attachN = t.products.length;
      t.auditN += r.auditN;
    }
  }
  return [...byKey.values()].map(r => ({ ...r, n: r.products.length }));
}

// ============================================================
// SAMM 4 — varade genereerimine (SEO + tüübiprofiil) + completeness
// ============================================================
let usage = { input: 0, output: 0, calls: 0 };
async function fableRaw(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: FABLE, max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Fable HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  if (j.usage) { usage.input += j.usage.input_tokens || 0; usage.output += j.usage.output_tokens || 0; usage.calls++; }
  const raw = (j.content || []).find(c => c.type === "text")?.text || "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Fable JSON puudub: ${raw.slice(0, 200)}`);
  return JSON.parse(m[0]);
}
const tpUsage = { "claude-opus-4-8": { in: 0, out: 0 }, "claude-sonnet-5": { in: 0, out: 0 }, "claude-fable-5": { in: 0, out: 0 } };
const callApiTP = makeCaller({ apiKey: API_KEY, onUsage: (model, u) => { if (u && tpUsage[model]) { tpUsage[model].in += u.input_tokens || 0; tpUsage[model].out += u.output_tokens || 0; } } });

async function buildPlans(cands) {
  const plans = [];
  for (const c of cands) {
    const name_et = c.name_et, parentL2 = c.parentL2;
    const { handle, collision } = deriveHandle(parentL2, name_et, existingHandles);
    const titles = c.titles.length ? c.titles : c.products.map(p => p.title);
    process.stdout.write(`  • «${name_et}» (${c.n}) → ${nodeName(parentL2)} … Fable SEO`);
    let assets;
    try { assets = await genAssetsGated(fableRaw, name_et, nodeName(parentL2), titles); process.stdout.write(assets._seoGate?.pass ? ` ✓ (SEO ${assets._seoGate.attempts}×)` : ` ⚠ SEO-värav kukub`); }
    catch (e) { process.stdout.write(` ✗ ${e.message}`); assets = { error: e.message }; }
    let type_profile = null;
    try {
      const r = { id: slugId(assets.name_en || name_et), name: name_et, main: mainNameOf(parentL2), l2: nodeName(parentL2), n: c.n, naabrid: neighborNamesOf(parentL2), titles };
      const tp = await genValidatedDesc(callApiTP, r, { regenMax: 2 });
      type_profile = { description: tp.description, ok: tp.ok, consensus: tp.consensus, attempts: tp.attempts };
      process.stdout.write(` · tüübiprofiil ${tp.ok ? "OK" : "⚠" + tp.consensus}\n`);
    } catch (e) { type_profile = { description: "", ok: false, consensus: "ERROR", error: e.message }; process.stdout.write(` · tüübiprofiil ✗\n`); }
    const plan = {
      ck: c.ck, foldedCks: c.foldedCks, name_et, name_en: assets.name_en || null, handle, handleCollisionResolved: collision,
      parentL2, parentL2_name: nodeName(parentL2), n: c.n, currentL3: c.currentL3, path: c.path, cert: c.cert,
      products: c.products.map(p => ({ id: p.id, title: p.title })), assets, type_profile,
    };
    plan.completeness = completenessCheck(plan, { NODES, existingHandles });
    existingHandles.add(handle); // alles NÜÜD → väldi partii-sisest handle-kollisiooni järgmistel
    plans.push(plan);
  }
  return plans;
}

function writePlan(plans, refreshStats) {
  const nowIso = new Date().toISOString();
  const totProd = plans.reduce((s, p) => s + p.n, 0);
  const allPass = plans.every(p => p.completeness.pass && p.assets?._seoGate?.pass);
  let md = `# ETAPP 3 — LÕPLIK PLAAN (uued L3 täisauditist, ENNE DB-kirjutust)\n\n`;
  md += `> Genereeritud ${nowIso} · \`scripts/classify-etapp3-create.mjs\` · allikas \`${AUDIT.replace(REPO + "/", "")}\`\n`;
  md += `> **REŽIIM: PLAAN — DB/staging puutumata.** Loomismootor = \`scripts/lib/l3-create-engine.mjs\` (SAMA kui öine auto-create, HARD RULE #5).\n`;
  md += `> Fable SEO-kutseid: ${usage.calls} (~$${((usage.input / 1e6) * 10 + (usage.output / 1e6) * 50).toFixed(2)}) · tüübiprofiil: ${JSON.stringify(Object.fromEntries(Object.entries(tpUsage).map(([k, v]) => [k, v.in + v.out ? `${v.in}/${v.out}` : "0"])))}\n\n`;
  md += `## Värskendus (SAMM 1–3)\n\n`;
  md += `- audit new_l3: **${refreshStats.auditNewL3}** → gate.allPass: **${refreshStats.gated}**\n`;
  md += `- live-DB KEEP: **${refreshStats.keptRaw}** · DROP: ${refreshStats.dropped} (${refreshStats.dropBreakdown})\n`;
  md += `- fold exact-name+L2: ${refreshStats.keptRaw} → **${plans.length} distinct L3**\n`;
  md += `- asümm-kindlus: kõik ${plans.length} vastavad (consensus+kinnitus VÕI viigimurdja-enamus)\n\n---\n\n`;
  for (const p of plans) {
    const a = p.assets || {};
    md += `## «${p.name_et}»  (×${p.n} toodet)${p.foldedCks.length > 1 ? ` [fold ${p.foldedCks.join("+")}]` : ""}\n\n`;
    md += `| väli | väärtus |\n|---|---|\n`;
    md += `| EN nimi | ${a.name_en || "—"} |\n| handle | \`${p.handle}\`${p.handleCollisionResolved ? " (disambig)" : ""} |\n`;
    md += `| L2-vanem | ${p.parentL2_name} (\`${p.parentL2}\`) |\n| senine L3 | \`${p.currentL3}\` → reparent |\n`;
    md += `| kindlus | ${p.cert.mode}: ${p.cert.detail} |\n| tagline ET | ${a.tagline_et || "—"} |\n`;
    md += `\n**SEO (ET):** ${a.description_et || "—"}\n\n**Pilt:** ${a.image_desc_et || "—"}\n\n`;
    md += `**§4.5 täielikkus:** ${p.completeness.pass ? "✅ 11/11" : "🛑 PUUDU: " + p.completeness.fails.map(f => f.n).join(", ")} · SEO-värav: ${a._seoGate?.pass ? "✓" : "🛑"}\n\n---\n\n`;
  }
  md += `## KOKKUVÕTE\n\n- **${plans.length} uut L3**, **${totProd} toodet** (reparent senistest L3-dest).\n`;
  md += `- Täielikkus + SEO-värav: ${allPass ? "✅ kõik läbivad" : "🛑 mõni kukub — EI loodaks"}.\n`;
  md += `- Partii-suurus: ${BATCH_SIZE} L3 · naaber cap-per: $${CAP_PER}.\n`;
  fs.writeFileSync(OUT_MD, md);
  fs.writeFileSync(OUT_JSON, JSON.stringify({ generated_at: nowIso, mode: "plan", batch_size: BATCH_SIZE, cap_per: CAP_PER, usage, tpUsage, refreshStats, plans }, null, 2));
  console.log(`\n${allPass ? "✅" : "🛑"} täielikkus+SEO: ${plans.filter(p => p.completeness.pass && p.assets?._seoGate?.pass).length}/${plans.length} · 💾 ${OUT_MD.replace(REPO + "/", "")} + .json`);
  return allPass;
}

// ============================================================
// MAIN
// ============================================================
(async () => {
  let plans;
  if ((EXECUTE || DRY_FROM_PLAN) && fs.existsSync(OUT_JSON)) {
    const approved = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
    plans = approved.plans;
    console.log(`📋 ${EXECUTE ? "--execute" : "--dry-from-plan"}: olemas plaan (${plans.length} L3) failist ${OUT_JSON.replace(REPO + "/", "")} — EI regenereeri SEO-d (determinism).`);
  } else {
    // SAMM 2–3: värskendus + kindlus (DB-read — kerge, aga öö-akna väravaga)
    assertNotNightWindow("plaani DB-värskendus");
    const cands = gated.map(c => ({ ...c })); // audit-kirjed
    const { keep, dropped } = refreshAndCertainty(cands);
    const dropBreak = Object.entries(dropped.reduce((m, r) => { m[r.verdict] = (m[r.verdict] || 0) + 1; return m; }, {})).map(([k, v]) => `${k}:${v}`).join(" ");
    console.log(`\n  värskendus: KEEP ${keep.length} · DROP ${dropped.length} (${dropBreak || "—"})`);
    for (const d of dropped) console.log(`    ✗ ${d.ck} «${d.name_et}» — ${d.reason}`);
    const folded = foldCollisions(keep);
    console.log(`  fold exact-name+L2: ${keep.length} → ${folded.length} distinct L3`);
    // SAMM 4: varad
    console.log(`\n  varade genereerimine (${folded.length} L3):`);
    plans = await buildPlans(folded);
    const refreshStats = { auditNewL3: rawNewL3.length, gated: gated.length, keptRaw: keep.length, dropped: dropped.length, dropBreakdown: dropBreak, distinct: plans.length };
    const allPass = writePlan(plans, refreshStats);
    if (!allPass) { console.error("🛑 Mõni L3 ei läbi täielikkus/SEO-väravat → EI jätka. Vaata plaani üle."); process.exit(1); }
  }

  // SAMM 5: runL3Batches (või --only-batch N → üks partii, execute, kella-kontrolliks)
  const totalBatches = Math.ceil(plans.length / BATCH_SIZE);
  let batchPlans = plans, batchPrefix = "e3", mode = EXECUTE ? "execute" : "dry-first", label = "ETAPP3";
  if (ONLY) {
    if (ONLY < 1 || ONLY > totalBatches) { console.error(`🔴 --only-batch ${ONLY} väljaspool vahemikku 1..${totalBatches}`); process.exit(2); }
    batchPlans = plans.slice((ONLY - 1) * BATCH_SIZE, ONLY * BATCH_SIZE);
    batchPrefix = `e3-p${ONLY}`; // eristuv undo batch_id per partii (e3-p3-b1 jne)
    mode = "execute"; // --only-batch alati live (ei ole DRY)
    label = `ETAPP3 partii ${ONLY}/${totalBatches}`;
    console.log(`\n🎯 --only-batch ${ONLY}/${totalBatches}: ${batchPlans.length} L3 (plaani-indeksid ${(ONLY-1)*BATCH_SIZE}..${ONLY*BATCH_SIZE-1})`);
  }
  if (mode === "execute") assertNotNightWindow(`${label} execute (DB + deploy)`);
  const C = resolveContainers();
  if (!C.ok) { console.error("🔴 Konteiner puudu — EI saa jätkata."); process.exit(2); }
  console.log(`\n🧱 runL3Batches: ${batchPlans.length} L3 · partii ${BATCH_SIZE} · režiim=${mode}`);
  const results = await runL3Batches({
    allPlans: batchPlans, assigns: [], batchSize: BATCH_SIZE, mode,
    batchPrefix, label, neighbor: { enabled: true, capPer: CAP_PER, topcl: 40 },
    granularity: { enabled: false }, // eel-filtreeritud SAMA mooduliga: scripts/apply-granularity-gate.mjs (40 alles, 5 variant drop)
    extraGitPaths: ["reports/ETAPP3-plaan.md", "reports/ETAPP3-plaan.json", "reports/etapp3-kuluhinnang.md", "reports/etapp3-granularity-dropped.json"],
  });
  const okB = results.filter(r => r.ok && !r.dryRun).length;
  const dryB = results.filter(r => r.dryRun).length;
  const skippedL3 = [...new Set(results.flatMap(r => r.allSkipped || []))];
  const createdL3 = results.filter(r => r.ok && !r.dryRun).flatMap(r => (r.created || []).map(c => c.handle)).filter(h => !skippedL3.includes(h));
  console.log(`\n${"█".repeat(60)}\nETAPP3 ${mode}: ${okB} partii live · ${dryB} DRY · ${results.length} kokku`);
  if (mode === "execute") {
    console.log(`  Loodud L3: ${createdL3.length}${skippedL3.length ? ` · pildi-skip (tume taust → shadow): ${skippedL3.length} (${skippedL3.join(", ")})` : ""}`);
    const undoBatches = results.filter(r => r.ok && !r.dryRun && r.batch_id).map(r => r.batch_id);
    if (undoBatches.length) console.log(`  Undo: ${undoBatches.map(b => `node scripts/classifier-undo.mjs --file reports/etapp2-undo-${b}.json`).join(" · ")}`);
  }
  if (mode === "dry-first") {
    const d = results[0];
    console.log(`\n⏸ DRY partii 1 (${d?.created?.length || 0} L3): ${JSON.stringify(d?.planned || {}, null, 1)}`);
    console.log(`→ Vaata üle, siis: node scripts/classify-etapp3-create.mjs --execute`);
  }
  process.exit(0);
})().catch(e => { console.error("🛑 FATAAL: " + String(e.stack || e.message)); process.exit(1); });
