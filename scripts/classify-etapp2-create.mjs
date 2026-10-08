#!/usr/bin/env node
/**
 * ETAPP 2 — AUTO-L3 LOOMINE (spec §4 + §4.5 täielikkus-värav).
 *
 * Loeb ETAPP 1 DRY-run väljundi (reports/classify-chain-dryrun-v2.json) new_l3-otsused
 * ja valmistab iga uue L3 jaoks ETTE KÕIK varad (§4.5 11-punkti täielikkus):
 *   handle · name_et (nimeväravast) · name_en (Fable) · parent-L2 · tooted ·
 *   pilt (kirjeldus + CDN/Gemini pipeline) · SEO (ET+EN kirjeldus + tagline, Fable).
 *
 * PLAAN-REŽIIM (vaikimisi): genereerib kõik varad MÄLLU, jooksutab täielikkus-
 * pre-checki, kirjutab plaani (reports/ETAPP2-plaan.md + .json). EI kirjuta DB-sse,
 * EI deploy'i. Näita Tarmole ENNE DB-kirjutust (DIRECTIVE 5 punkt 3).
 *
 * --execute (EI ole vaikimisi): DB-migratsioon + image-build + reindeks + 4-sammu
 * deploy + Telegram + undo (§4 gate #4–#10, §4b). Lisatakse hiljem, pärast plaani-OK.
 *
 * Võti: set -a; . /opt/eumotors-tasks/.env; set +a   (ANTHROPIC_API_KEY — EI logita)
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
// VARA-VÄRAVAD SSoT (HARD RULE #5 — sama kood siin JA öises shadow-hookis, ei lahkne)
import {
  norm, slug, slugId, deriveHandle, seoClaimGate, SEO_NUM_RE, SEO_CLAIM_RE,
  genAssetsGated, IMG_BRIGHT_MIN, brightCheckScript, completenessCheck,
} from "./lib/l3-gates.mjs";
// TÜÜBIPROFIIL-KIRJELDUS SSoT (HARD RULE #5 — SAMA transform kui backfill scripts/l3-desc-gen.mjs).
// Uus L3 sünnib `product_category.description` = tüübiprofiil (internal kohtuniku-väli), MITTE SEO description_et.
import { makeCaller, genValidatedDesc } from "./lib/l3-desc.mjs";

const REPO = "/opt/xlmarket-github";
const val = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d; };
const EXECUTE = process.argv.includes("--execute");
const DRYJSON = val("--in", `${REPO}/reports/classify-chain-dryrun-v2.json`);
const OUT_MD = val("--out", `${REPO}/reports/ETAPP2-plaan.md`);
const OUT_JSON = OUT_MD.replace(/\.md$/, ".json");
// --products <json>: öine shadow-hook annab prodsByCk OTSE (ck → [{id,title}]) ÜLE calib-classify.json.
// Kui antud → create-ONLY (hook teeb assignid ise LIVE); ASSIGNS jäetakse tühjaks. Vt Task 5 design.
const PRODUCTS_FILE = val("--products", null);
const FABLE = "claude-fable-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

// ---- andmed ----
const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8"));
const NODES = tree.nodes;
const dry = JSON.parse(fs.readFileSync(DRYJSON, "utf8"));

// tooted klastri kaupa (prod_id + title) — allikas: --products override VÕI calib-classify.json
const prodsByCk = {};
const SKIP_ASSIGNS = !!PRODUCTS_FILE;   // hook-create-only: assignid teeb hook ise, mitte see skript
if (PRODUCTS_FILE) {
  const provided = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
  for (const [ck, prods] of Object.entries(provided)) {
    prodsByCk[ck] = prods.map(p => ({ id: p.id, title: p.title }));
  }
} else {
  const classify = JSON.parse(fs.readFileSync(`${REPO}/storefront/public/xl-admin/calib-classify.json`, "utf8"));
  for (const d of classify.decisions) {
    (prodsByCk[d.cluster_key] ||= []).push({ id: d.id, title: d.title });
  }
}

// ---- helperid (norm/slug/deriveHandle/SEO/image/completeness → scripts/lib/l3-gates.mjs) ----
const nodeName = (h) => NODES[h]?.name_et || NODES[h]?.name_en || h;
const existingHandles = new Set(Object.keys(NODES));

// ---- Fable toor-kutse (callback l3-gates genAssetsGated jaoks) ----
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

// ---- tüübiprofiil-kirjelduse kutsuja (SAMA lib-transform kui backfill; kulu eraldi arvestuses) ----
const tpUsage = { "claude-opus-4-8": { in: 0, out: 0, cr: 0, cw: 0 }, "claude-sonnet-5": { in: 0, out: 0, cr: 0, cw: 0 }, "claude-fable-5": { in: 0, out: 0, cr: 0, cw: 0 } };
const callApiTP = makeCaller({ apiKey: API_KEY, onUsage: (model, u) => {
  if (!u || !tpUsage[model]) return;
  tpUsage[model].in += u.input_tokens || 0; tpUsage[model].out += u.output_tokens || 0;
  tpUsage[model].cr += u.cache_read_input_tokens || 0; tpUsage[model].cw += u.cache_creation_input_tokens || 0;
} });
// main (L1) nimi + naaber-L3 nimed parentL2 all (genValidatedDesc rea-kontekst)
function mainNameOf(h) { let cur = h; while (cur && NODES[cur]?.parent_handle) cur = NODES[cur].parent_handle; return nodeName(cur || h); }
function neighborNamesOf(parentL2) { return (NODES[parentL2]?.child_handles || []).map(ch => nodeName(ch)).filter(Boolean); }

// ---- main ----
// AINULT need, mis läbisid ETAPP 1 kõik väravad (dup/über-frag/nimi). decision="new_l3"
// üksi EI piisa — nt Mängulaud hääletas 3/3 new_l3, aga DUP-värav blokeeris → fallback assign.
const newL3 = dry.clusters.filter(c => c.decision === "new_l3" && c.gate && c.gate.allPass === true);
const blockedL3 = dry.clusters.filter(c => c.decision === "new_l3" && !(c.gate && c.gate.allPass === true));
if (blockedL3.length) console.log(`  (välja jäetud ${blockedL3.length} värav-blokeeritud: ${blockedL3.map(c => c.ck + " [" + (c.gate?.blocking || "?") + "]").join(", ")})`);
console.log(`\n🏗  ETAPP 2 ${EXECUTE ? "(--execute: DB+deploy)" : "(PLAAN — DB/deploy OOTAB)"} — ${newL3.length} uut L3\n`);

let plans;
if (EXECUTE && fs.existsSync(OUT_JSON)) {
  // --execute kasutab KINNITATUD plaani (reports/ETAPP2-plaan.json) — EI regenereeri SEO-d:
  // Fable on mittedeterministlik, regen tooks DB-sse teise teksti kui kinnitatud. Plaan on SSoT.
  const approved = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
  plans = approved.plans;
  console.log(`  📋 --execute: laen KINNITATUD plaani (${plans.length} L3) failist ${OUT_JSON.replace(REPO + "/", "")} — EI regenereeri SEO-d (determinism).`);
} else {
  // PLAAN-režiim: genereeri varad Fable'iga + kirjuta plaani-raport.
  plans = [];
  for (const c of newL3) {
    const parentL2 = c.parentL2;
    const name_et = c.finalName || c.newName;
    const { handle, collision } = deriveHandle(parentL2, name_et, existingHandles);
    const prods = prodsByCk[c.ck] || [];
    const titles = c.titles || prods.map(p => p.title);
    process.stdout.write(`  • «${name_et}» (${c.n}) → ${nodeName(parentL2)} … Fable SEO`);
    let assets;
    try { assets = await genAssetsGated(fableRaw, name_et, nodeName(parentL2), titles); process.stdout.write(assets._seoGate?.pass ? ` ✓ (SEO ${assets._seoGate.attempts}×)\n` : ` ⚠ SEO-värav kukub\n`); }
    catch (e) { process.stdout.write(` ✗ ${e.message}\n`); assets = { error: e.message }; }
    // TÜÜBIPROFIIL (SAMA lib-transform kui backfill): uus L3 sünnib internal kohtuniku-kirjeldusega.
    // Üksik-kukk EI blokeeri (HARD RULE #5) — fallback tühi, backfill täidab hiljem; EI kirjuta SEO-teksti kohtuniku-välja.
    let type_profile = null;
    try {
      const r = { id: slugId(assets.name_en || name_et), name: name_et, main: mainNameOf(parentL2), l2: nodeName(parentL2), n: c.n, naabrid: neighborNamesOf(parentL2), titles };
      const tp = await genValidatedDesc(callApiTP, r, { regenMax: 2 });
      type_profile = { description: tp.description, ok: tp.ok, consensus: tp.consensus, attempts: tp.attempts };
      process.stdout.write(`    tüübiprofiil: ${tp.ok ? "OK" : "⚠ " + tp.consensus} (${tp.attempts}×)\n`);
    } catch (e) { type_profile = { description: "", ok: false, consensus: "ERROR", error: e.message }; process.stdout.write(`    tüübiprofiil ✗ ${e.message}\n`); }
    const plan = {
      ck: c.ck, name_et, name_en: assets.name_en || null, handle, handleCollisionResolved: collision,
      parentL2, parentL2_name: nodeName(parentL2), n: c.n, origin: c.newOrigin, path: c.path,
      products: prods.map(p => ({ id: p.id, title: p.title })), assets, type_profile,
    };
    plan.completeness = completenessCheck(plan, { NODES, existingHandles });
    plans.push(plan);
  }

  // ---- plaani-raport ----
  const nowIso = new Date().toISOString();
  let md = `# ETAPP 2 — LÕPLIK PLAAN (ENNE DB-kirjutust)\n\n`;
  md += `> Genereeritud ${nowIso} · \`scripts/classify-etapp2-create.mjs\` · allikas \`${DRYJSON.replace(REPO + "/", "")}\`\n`;
  md += `> **REŽIIM: PLAAN AINULT — DB-s/stagingus EI muudetud midagi.** Spec §4 + §4.5 täielikkus-värav.\n`;
  md += `> Fable kutseid: ${usage.calls} (in ${usage.input} / out ${usage.output} tok, ~$${((usage.input / 1e6) * 10 + (usage.output / 1e6) * 50).toFixed(4)})\n\n---\n\n`;
  for (const p of plans) {
    const a = p.assets || {};
    md += `## «${p.name_et}»  (×${p.n} toodet)\n\n`;
    md += `| väli | väärtus |\n|---|---|\n`;
    md += `| **ET nimi** | ${p.name_et} |\n`;
    md += `| **EN nimi** | ${a.name_en || "—"} |\n`;
    md += `| **handle/slug** | \`${p.handle}\`${p.handleCollisionResolved ? " (kollisioon → disambig)" : ""} |\n`;
    md += `| **L2-vanem** | ${p.parentL2_name} (\`${p.parentL2}\`) |\n`;
    md += `| **päritolu** | ${p.path} |\n`;
    md += `| **tagline ET** | ${a.tagline_et || "—"} |\n`;
    md += `| **tagline EN** | ${a.tagline_en || "—"} |\n`;
    md += `\n**SEO kirjeldus (ET):** ${a.description_et || "—"}\n\n`;
    md += `**SEO kirjeldus (EN):** ${a.description_en || "—"}\n\n`;
    md += `**Pilt (hele valge taust):** ${a.image_desc_et || "—"}  \n`;
    md += `_Pipeline: primaar \`build-cat-thumbs-l3.mjs\` (top-toote pilt Meili/VEVOR CDN → webp 400×400 valge taust); fallback Gemini \`image-pipeline/orchestrator.mjs\` (#FFFFFF seamless)._\n\n`;
    md += `**Tooted (${p.products.length}):**\n`;
    for (const pr of p.products.slice(0, 12)) md += `- \`${pr.id}\` ${pr.title}\n`;
    md += `\n**§4.5 täielikkus-värav:** ${p.completeness.pass ? "✅ KÕIK 11 vara resolvitav" : "🛑 PUUDU: " + p.completeness.fails.map(f => f.n).join(", ")}\n\n`;
    for (const ch of p.completeness.checks) md += `  - ${ch.pass ? "✓" : "✗"} ${ch.n} — ${ch.note}\n`;
    md += `\n---\n\n`;
  }
  const allPass = plans.every(p => p.completeness.pass);
  md += `## KOKKUVÕTE\n\n`;
  md += `- **${plans.length} uut L3**, kokku **${plans.reduce((s, p) => s + p.n, 0)} toodet**.\n`;
  md += `- Täielikkus-värav: ${allPass ? "✅ kõik läbivad (kõik 11 vara olemas)" : "🛑 mõni L3 kukub — EI loodaks"}.\n`;
  md += `- **PLAAN — DB/staging puutumata.** Päris-loomine: \`--execute\`.\n`;
  fs.writeFileSync(OUT_MD, md);
  fs.writeFileSync(OUT_JSON, JSON.stringify({ generated_at: nowIso, mode: "plan", usage, plans }, null, 2));
  console.log(`\n${allPass ? "✅" : "🛑"} Täielikkus: ${plans.filter(p => p.completeness.pass).length}/${plans.length} läbivad`);
  console.log(`💾 ${OUT_MD.replace(REPO + "/", "")}  +  ${OUT_JSON.replace(REPO + "/", "")}`);
  console.log(`Fable: ${usage.calls} kutset (~$${((usage.input / 1e6) * 10 + (usage.output / 1e6) * 50).toFixed(4)})`);
}

if (!EXECUTE) process.exit(0);

// ============================================================
// --execute ORKESTRAATOR (DIRECTIVE task 3) — DB + deploy, väravad + undo + Telegram
// Järjekord (tehniline sõltuvus > direktiivi sõnastus; intent 100% säilib):
//   DB-txn → reindeks → pildid(+heledus) → SSoT-regen → INV+harness
//   → push MÕLEMAD → redeploy → tervisekontroll(kukub→rollback) → log+undo → Telegram
// • reindeks ENNE pilte: build-cat-thumbs valib pildi Meili category_handles-filtriga;
//   uus L3 handle on Meilis alles pärast reindeksit (publish+bind).
// • SSoT-regen PÄRAST pilte: gen-category-tree omistab image_path=direct AINULT kui
//   <handle>.webp on kettal → muidu INV-20/26 FAIL.
// ============================================================
console.log(`\n${"█".repeat(60)}\n🚀 --execute: DB + deploy (${plans.length} L3) — väravad + undo + Telegram\n${"█".repeat(60)}`);

// ---- 0. PRE: kinnitatud plaan peab olema terviklik (SEO-värav + täielikkus) ----
const badPlan = plans.filter(p => !(p.completeness?.pass && p.assets?._seoGate?.pass));
if (badPlan.length) {
  console.error(`🛑 ABORT: ${badPlan.length} L3 ei läbi plaani-väravat (completeness/SEO) — EI loo. ${badPlan.map(p => p.name_et).join(", ")}`);
  process.exit(1);
}

// ---- infra-helperid (konteineri-sisene auth, kood EI loe saladusi) ----
const sh = (cmd, opts = {}) => execSync(cmd, { encoding: "utf8", stdio: opts.capture ? "pipe" : "inherit", ...opts });
const DB = sh("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { capture: true }).trim();
const MEILI = sh("docker ps --format '{{.Names}}' | grep '^meili-k33g' | head -1", { capture: true }).trim();
const MEDUSA = sh("docker ps --format '{{.Names}}' | grep '^medusa-k33g' | head -1", { capture: true }).trim();
const SF = sh("docker ps --format '{{.Names}}' | grep '^storefront-k33g' | head -1", { capture: true }).trim();
if (!DB || !MEILI || !MEDUSA || !SF) { console.error(`🛑 Konteiner puudu: db=${!!DB} meili=${!!MEILI} medusa=${!!MEDUSA} sf=${!!SF}`); process.exit(2); }
const psql = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" }).trim();
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" });
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
const NOTIFY = `${REPO}/scripts/lib/notify-telegram.sh`;
function telegram(msg) { try { execSync(`${NOTIFY}`, { input: msg, encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] }); } catch {} console.log(`📨 Telegram:\n${msg}`); }

// ---- id/handle resolutsioon (slug/slugId → scripts/lib/l3-gates.mjs) ----
// ASSIGNS tuletatakse OTSE dry-run'ist (SSoT, mitte käsitsi fail): 8 otse-assign + 1 värav-blokk-fallback
// (spu:16937 Mängulauad: decision=new_l3 aga DUP-värav blokeeris → decisionFinal=assign lauamangud).
// SKIP_ASSIGNS (--products / shadow-hook-create-only) → hook teeb assignid ise LIVE → siin tühi.
const parseAssign = (s) => s.slice(7).replace(/\s*\(.*$/, "").trim(); // "assign:<handle> (märkus)" → handle
const ASSIGNS = SKIP_ASSIGNS ? [] : dry.clusters
  .map(c => {
    const dec = (c.decision || "").startsWith("assign:") ? c.decision
      : (c.decision === "new_l3" && !(c.gate && c.gate.allPass === true) && c.decisionFinal) ? c.decisionFinal : null;
    if (!dec || !dec.startsWith("assign:")) return null;
    return { handle: parseAssign(dec), ids: (prodsByCk[c.ck] || []).map(p => p.id), ck: c.ck };
  })
  .filter(Boolean);
console.log(`  assign-klastreid: ${ASSIGNS.length} (${ASSIGNS.reduce((s, a) => s + a.ids.length, 0)} toodet olemas-L3-desse)`);
const parentIdOf = {};
for (const p of plans) {
  if (parentIdOf[p.parentL2]) continue;
  const id = psql(`SELECT id FROM product_category WHERE handle=${sqlStr(p.parentL2)} AND deleted_at IS NULL;`);
  if (!id) { console.error(`🛑 Vanem-L2 '${p.parentL2}' puudub DB-s`); process.exit(2); }
  parentIdOf[p.parentL2] = id;
}
const assignIdOf = {};
for (const a of ASSIGNS) {
  const id = psql(`SELECT id FROM product_category WHERE handle=${sqlStr(a.handle)} AND deleted_at IS NULL;`);
  if (!id) { console.error(`🛑 Assign-siht '${a.handle}' puudub DB-s`); process.exit(2); }
  assignIdOf[a.handle] = id;
}
// uute L3 defs (id, name, description=TÜÜBIPROFIIL [internal kohtuniku-väli], handle, parent_id)
// description = tüübiprofiil (SAMA väli, mida backfill + öine kohtunik loevad), MITTE SEO description_et.
// tüübiprofiil-kukk → tühi (backfill täidab hiljem); EI kirjuta SEO-teksti kohtuniku-välja (vale-numbrid eksitaks kohtunikku).
const defs = plans.map(p => ({
  id: slugId(p.name_en || p.name_et), name: p.name_et,
  description: (p.type_profile && p.type_profile.ok && p.type_profile.description) ? p.type_profile.description : "",
  handle: p.handle,
  parent_id: parentIdOf[p.parentL2], rank: 900,
}));
const newIdByCk = {}; plans.forEach((p, i) => { newIdByCk[p.ck] = defs[i].id; });
const newL3Attach = plans.flatMap((p, i) => p.products.map(pr => ({ product_id: pr.id, cat_id: defs[i].id })));
const assignAttach = ASSIGNS.flatMap(a => a.ids.map(id => ({ product_id: id, cat_id: assignIdOf[a.handle] })));
const allAttach = [...newL3Attach, ...assignAttach];
const allProductIds = [...new Set(allAttach.map(x => x.product_id))];
console.log(`  defs: ${defs.length} uut L3 (${defs.map(d => d.id).join(", ")})`);
console.log(`  sidumisi: ${newL3Attach.length} uut + ${assignAttach.length} assign = ${allAttach.length} (distinct tooteid ${allProductIds.length})`);

// ---- undo batch + sidecar (HARD RULE #6) ----
const BATCH = `e2-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;
const UNDO_FILE = `${REPO}/reports/etapp2-undo-${BATCH}.json`;
const undoPayload = {
  batch_id: BATCH, created_at: new Date().toISOString(), actor: "claude-code-test",
  new_l3: defs.map(d => ({ id: d.id, handle: d.handle, name: d.name, parent_id: d.parent_id })),
  attach: allAttach, product_ids: allProductIds,
};
fs.writeFileSync(UNDO_FILE, JSON.stringify(undoPayload, null, 2));
console.log(`  🧯 undo batch_id = ${BATCH} → ${UNDO_FILE.replace(REPO + "/", "")}`);

// ---- baseline (lock-harness post jaoks) ----
const baseDistinct = +psql("SELECT count(DISTINCT product_id) FROM product_category_product;");
const baseL3 = +psql("SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;");
// kodutuid = mitu allProductIds ei ole veel üheski kategoorias (iga seotakse → +1 distinct)
const homedNow = +psql(`SELECT count(DISTINCT product_id) FROM product_category_product WHERE product_id IN (${allProductIds.map(sqlStr).join(",")});`);
const newlyHomed = allProductIds.length - homedNow;
const expectDistinct = baseDistinct + newlyHomed; // iga kodutu toode seotakse ühte kategooriasse → +1 distinct
console.log(`  baseline: distinct=${baseDistinct} l3=${baseL3} | kodutuid=${newlyHomed} → oodatud distinct=${expectDistinct} l3=${baseL3 + defs.length}`);

// ---- ROLLBACK (täielik eel-seisu taaste: DB + regen + reindeks + push + redeploy) ----
let dbApplied = false, deployed = false;
function rollback(reason) {
  console.error(`\n🔁 ROLLBACK — ${reason}`);
  const nid = defs.map(d => sqlStr(d.id)).join(",");
  const pid = allProductIds.map(sqlStr).join(",");
  try {
    psqlTx(`BEGIN;
      DELETE FROM product_category_product WHERE product_id IN (${pid});
      DELETE FROM taxonomy_node_meta WHERE node_id IN (${nid});
      DELETE FROM product_category WHERE id IN (${nid});
      UPDATE product SET status='draft', updated_at=now() WHERE id IN (${pid});
      UPDATE classification_review SET status='pending', updated_at=now() WHERE product_id IN (${pid});
      COMMIT;`);
    console.error("  ✓ DB taastatud (L3 kustutatud, tooted draft, review pending)");
  } catch (e) { console.error("  🔴 DB-rollback viga: " + String(e.message).slice(0, 200)); }
  try { sh(`cd ${REPO} && docker exec ${MEDUSA} node /app/scripts/index-meilisearch.mjs 2>/dev/null || node ${REPO}/backend/scripts/index-meilisearch.mjs`); } catch {}
  if (deployed) {
    try {
      regenSSoT(); gitCommitPush(`revert: ETAPP2 rollback ${BATCH} (${reason})`);
      sh(`bash ${REPO}/scripts/coolify-deploy.sh`);
    } catch (e) { console.error("  🔴 deploy-rollback viga: " + String(e.message).slice(0, 150)); }
  }
  telegram(`🔁 XL ETAPP2 ROLLBACK (${BATCH})\nPõhjus: ${reason}\nDB taastatud eel-seisu (4 L3 kustutatud, ${allProductIds.length} toodet draft, review pending).${deployed ? " Staging redeploy'tud." : ""}\nUndo-fail: reports/etapp2-undo-${BATCH}.json`);
  process.exit(1);
}

// ---- SSoT regen (genyM → cp → gen-category-tree) ----
function regenSSoT() {
  console.log("  → SSoT regen (genyM → taxonomy.yaml → gen-category-tree)");
  sh(`node ${REPO}/scripts/genyM.mjs`);
  sh(`cp /opt/eumotors-tasks/v4-staging/taxonomy-music.yaml ${REPO}/backend/src/data/taxonomy.yaml`);
  sh(`node ${REPO}/scripts/gen-category-tree.mjs`);
}

// ---- git commit + push MÕLEMAD harud (HARD RULE #4) ----
function gitCommitPush(msg) {
  const paths = [
    "scripts/classify-etapp2-create.mjs", "scripts/create-l3.mjs", "scripts/lock-harness.mjs",
    "scripts/genyM.mjs", "scripts/classifier-undo.mjs", "scripts/import-pipeline.sh",
    "reports/b-klassifikaator-taisautomaatika-spets.md", "reports/ETAPP2-plaan.md", "reports/ETAPP2-plaan.json",
    `reports/etapp2-undo-${BATCH}.json`, "CLAUDE.md", "backend/src/data/taxonomy.yaml",
    "storefront/lib/category-tree.generated.json", "storefront/lib/outlet-labels.generated.json",
    "memory/sessions/2026-10-06-xl.md",
    ...defs.map(d => `storefront/public/cat-thumbs/${d.handle}.webp`),
  ];
  for (const p of paths) { try { if (fs.existsSync(`${REPO}/${p}`)) sh(`cd ${REPO} && git add -- ${p}`); } catch {} }
  try { sh(`cd ${REPO} && git commit -m ${JSON.stringify(msg + "\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>")}`); }
  catch (e) { console.log("  ℹ️ git commit: midagi ei muutunud või viga — " + String(e.message).slice(0, 120)); }
  sh(`cd ${REPO} && git push origin taxonomy-v4`);  // ← Coolify build-allikas (kriitiline)
  // main sünk (HARD RULE #4) WORKTREE-s — EI puuduta põhi-töö-puud (see on määrdunud, checkout kukuks).
  // Konflikt/viga → best-effort, raporteeri; ÄRA katkesta deploy'd (taxonomy-v4 on juba pushitud).
  try {
    const sha = sh(`cd ${REPO} && git rev-parse HEAD`, { capture: true }).trim();
    const wt = `/tmp/xl-main-sync-${BATCH}`;
    sh(`cd ${REPO} && git fetch -q origin main`);
    sh(`cd ${REPO} && git worktree add --force ${wt} origin/main 2>&1 | tail -1 || true`);
    try {
      sh(`cd ${wt} && git cherry-pick -x ${sha} && git push origin HEAD:main`);
      mainSync = "✓ (worktree cherry-pick)";
    } catch { try { sh(`cd ${wt} && git cherry-pick --abort`); } catch {} mainSync = "⚠️ konflikt — käsitsi cherry-pick main-i"; }
    try { sh(`cd ${REPO} && git worktree remove --force ${wt}`); } catch {}
  } catch (e) { mainSync = "⚠️ " + String(e.message).slice(0, 80); }
}
let mainSync = "—";

try {
  // ====== 1. DB: create-l3 (atomaarne) ======
  console.log("\n[1/8] DB — create-l3 (4 L3 + meta, transaktsioonis)");
  const defsFile = `/tmp/etapp2-defs-${BATCH}.json`;
  fs.writeFileSync(defsFile, JSON.stringify(defs, null, 2));
  sh(`node ${REPO}/scripts/create-l3.mjs --defs ${defsFile}`);

  // ====== 1b. DB: sidumine + publish + review-resolve (üks transaktsioon) ======
  console.log("[1b/8] DB — seo 40 toodet + publish + review resolve (transaktsioon)");
  const attachVals = allAttach.map(x => `(${sqlStr(x.product_id)}, ${sqlStr(x.cat_id)})`).join(",\n    ");
  const pidList = allProductIds.map(sqlStr).join(",");
  psqlTx(`BEGIN;
    INSERT INTO product_category_product (product_id, product_category_id) VALUES
    ${attachVals}
    ON CONFLICT DO NOTHING;
    UPDATE product SET status='published', updated_at=now() WHERE id IN (${pidList}) AND status='draft' AND deleted_at IS NULL;
    UPDATE classification_review SET status='resolved', updated_at=now() WHERE product_id IN (${pidList}) AND status='pending';
    COMMIT;`);
  dbApplied = true;
  const nowDistinct = +psql("SELECT count(DISTINCT product_id) FROM product_category_product;");
  const nowPending = +psql(`SELECT count(*) FROM classification_review WHERE product_id IN (${pidList}) AND status='pending';`);
  const nowPub = +psql(`SELECT count(*) FROM product WHERE id IN (${pidList}) AND status='published';`);
  console.log(`    distinct ${baseDistinct}→${nowDistinct} (oodatud ${expectDistinct}) · published=${nowPub}/40 · pending=${nowPending} (oodatud 0)`);
  if (nowDistinct !== expectDistinct || nowPub !== 40 || nowPending !== 0) rollback(`DB post-kontroll: distinct=${nowDistinct}≠${expectDistinct} või published=${nowPub}≠40 või pending=${nowPending}≠0`);

  // ====== 2. Meili reindeks (uus handle + published tooted indeksisse) ======
  console.log("[2/8] Meili reindeks (medusa-konteineris)");
  try { sh(`docker exec ${MEDUSA} node /app/scripts/index-meilisearch.mjs`); }
  catch { sh(`cd ${REPO} && node backend/scripts/index-meilisearch.mjs`); }
  try { sh(`cd ${REPO} && node scripts/sync-existing-synonyms.mjs`); } catch (e) { console.log("    ℹ️ sync-synonyms vahele: " + String(e.message).slice(0, 80)); }

  // ====== 3. Pildid: build-cat-thumbs (konteineris, Meili-env) + heledus-värav ======
  console.log("[3/8] Pildid — build-cat-thumbs-l3 (storefront-konteineris) + heledus-kontroll");
  const miniTree = { nodes: Object.fromEntries(defs.map(d => [d.handle, { handle: d.handle, name_et: d.name, name_en: plans.find(p => p.handle === d.handle)?.name_en || d.name, level: 3 }])) };
  const miniFile = `/tmp/etapp2-minitree-${BATCH}.json`;
  fs.writeFileSync(miniFile, JSON.stringify(miniTree));
  // KRIITILINE: skript PEAB jooksma /app-st (mitte /tmp), muidu ESM ei resolvi 'sharp'-i (/app/node_modules).
  sh(`docker cp ${REPO}/scripts/build-cat-thumbs-l3.mjs ${SF}:/app/bct-e2.mjs`);
  sh(`docker cp ${miniFile} ${SF}:/app/minitree-e2.json`);
  const onlyArg = defs.map(d => d.handle).join(",");
  // cwd=/app → sharp resolvib; MEILISEARCH_HOST tuleb konteineri env-ist, KEY fallback MEILI_MASTER_KEY-le
  sh(`docker exec ${SF} sh -c 'cd /app && MEILISEARCH_KEY="\${MEILISEARCH_KEY:-$MEILI_MASTER_KEY}" node bct-e2.mjs --tree /app/minitree-e2.json --out /app/public/cat-thumbs --only ${onlyArg}'`);
  // heledus-värav konteineris (host-il pole sharp) — serva-luma iga webp kohta, lävi 225. Samuti /app-st (require sharp).
  // brightCheckScript SSoT (scripts/lib/l3-gates.mjs) → SAMA lävi/loogika shadow-hookiga.
  const brightScript = brightCheckScript(defs.map(d => d.handle));
  const brightFile = `/tmp/etapp2-bright-${BATCH}.cjs`;
  fs.writeFileSync(brightFile, brightScript);
  sh(`docker cp ${brightFile} ${SF}:/app/bright-e2.cjs`);
  const brightOut = JSON.parse(sh(`docker exec ${SF} node /app/bright-e2.cjs`, { capture: true }).trim());
  console.log("    heledus: " + brightOut.map(b => b.missing ? `${b.h}:PUUDU` : `${b.h}:${b.luma}`).join(" · "));
  const imgBad = brightOut.filter(b => b.missing || b.luma < IMG_BRIGHT_MIN);
  if (imgBad.length) rollback(`pildi-värav: ${imgBad.map(b => b.missing ? b.h + " puudub" : b.h + " luma=" + b.luma + "<" + IMG_BRIGHT_MIN).join(", ")}`);
  // kopeeri webp host-repo-sse (redeploy bakes them)
  for (const d of defs) sh(`docker cp ${SF}:/app/public/cat-thumbs/${d.handle}.webp ${REPO}/storefront/public/cat-thumbs/${d.handle}.webp`);

  // ====== 4. SSoT regen (nüüd cat-thumbs-is 4 webp → image_path=direct) ======
  console.log("[4/8] SSoT regen");
  regenSSoT();

  // ====== 5. INV + lock-harness post ======
  console.log("[5/8] INV + lock-harness post");
  try { sh(`cd ${REPO} && node scripts/check-taxonomy-invariants.mjs --ci`); }
  catch (e) { rollback("INV FAIL (check-taxonomy-invariants --ci)"); }
  const migrateEvidence = `/tmp/etapp2-migrate-${BATCH}.sql`;
  fs.writeFileSync(migrateEvidence, allProductIds.join("\n")); // harness skip evidence (pre-only)
  try { sh(`cd ${REPO} && node scripts/lock-harness.mjs post ${migrateEvidence} ${expectDistinct} ${baseL3}`); }
  catch (e) { rollback("lock-harness post FAIL"); }

  // ====== 6. git commit + push MÕLEMAD ======
  console.log("[6/8] git commit + push (taxonomy-v4 + main)");
  gitCommitPush(`feat(taxonomy): ETAPP2 auto-L3 — ${defs.length} uut L3 (${allProductIds.length} toodet), batch ${BATCH}`);

  // ====== 7. Coolify redeploy ======
  console.log("[7/8] Coolify staging redeploy");
  sh(`bash ${REPO}/scripts/coolify-deploy.sh`);
  deployed = true;

  // ====== 8. Tervisekontroll (4 L3 URL — Coolify rebuild võtab minuteid) ======
  // Coolify redeploy = täis Next.js rebuild (mitu minutit); vana build serveerib vahepeal.
  // Ootame heldelt (kuni ~12 min): 000/502/503 = "veel ehitab, oota"; püsiv mitte-200 = FAIL.
  console.log("[8/8] Tervisekontroll — 4 L3 nähtavus stagingus (helde oote-aken, rebuild võtab minuteid)");
  const BASE = "https://xlmarket.ee";
  const curlCode = (url) => { try { return +sh(`curl -k -s -o /dev/null -w '%{http_code}' --max-time 15 ${JSON.stringify(url)}`, { capture: true }).trim() || 0; } catch { return 0; } };
  await new Promise(r => setTimeout(r, 30000)); // redeploy settle enne esimest proovi
  const urls = plans.map(p => ({ handle: p.handle, name: p.name_et, url: `${BASE}/et/kategooriad/${p.handle}`, code: 0, ok: false }));
  const MAX_WAIT_MS = 12 * 60 * 1000, STEP = 20000; const t0 = Date.now();
  while (Date.now() - t0 < MAX_WAIT_MS) {
    for (const h of urls) { if (!h.ok) { h.code = curlCode(h.url); if (h.code === 200) h.ok = true; } }
    const done = urls.filter(h => h.ok).length;
    console.log(`    ${Math.round((Date.now() - t0) / 1000)}s: ${done}/${urls.length} 200 · ${urls.map(h => h.handle.split("-").slice(-1)[0] + ":" + h.code).join(" ")}`);
    if (done === urls.length) break;
    await new Promise(r => setTimeout(r, STEP));
  }
  const health = urls;
  const unhealthy = health.filter(h => !h.ok);
  console.log("    " + health.map(h => `${h.ok ? "✓" : "🔴"} ${h.handle} (${h.code})`).join("\n    "));
  if (unhealthy.length) rollback(`tervisekontroll (${Math.round(MAX_WAIT_MS / 60000)}min aegus): ${unhealthy.map(h => h.handle + " HTTP " + h.code).join(", ")}`);

  // ====== review_decision_log (audit, actor=claude-code-test — HARD RULE #8) ======
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i], p = plans[i];
    psqlTx(`INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, target_handle, target_l2, new_l3_name, status, affected, meta)
      VALUES ('claude-code-test','claude-code-test','api','auto-classifier','create_l3',${sqlStr(d.handle)},${sqlStr(p.parentL2)},${sqlStr(d.name)},'applied',
        ${sqlStr(JSON.stringify(p.products.map(x => x.id)))}::jsonb, ${sqlStr(JSON.stringify({ batch_id: BATCH, l3_id: d.id, undo_file: `reports/etapp2-undo-${BATCH}.json` }))}::jsonb);`);
  }
  for (const a of ASSIGNS) {
    psqlTx(`INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, target_handle, status, affected, meta)
      VALUES ('claude-code-test','claude-code-test','api','auto-classifier','assign_existing',${sqlStr(a.handle)},'applied',
        ${sqlStr(JSON.stringify(a.ids))}::jsonb, ${sqlStr(JSON.stringify({ batch_id: BATCH }))}::jsonb);`);
  }

  // ====== Telegram edu ======
  const counts = plans.map(p => `${p.name_et}: ${p.n}`).join(" · ");
  telegram(`✅ XL ETAPP2 VALMIS (${BATCH})\n${defs.length} uut L3 loodud + ${allProductIds.length} toodet avaldatud, review pending=0.\n${counts}\nAssign olemas-L3: ${assignAttach.length} toodet (${ASSIGNS.length} sihti).\nStaging nähtav: ${health.filter(h => h.ok).length}/${health.length} L3 (HTTP 200).\nmain-sünk: ${mainSync}\nUndo: node scripts/classifier-undo.mjs ${BATCH}`);
  console.log(`\n${"█".repeat(60)}\n✅ ETAPP2 EXECUTE VALMIS — batch ${BATCH}\n${"█".repeat(60)}`);
  console.log(`   health: ${JSON.stringify(health.map(h => ({ [h.handle]: h.code })))}`);
  process.exit(0);
} catch (e) {
  console.error("🛑 EXECUTE FATAAL: " + String(e.stack || e.message));
  if (dbApplied) rollback("ootamatu viga: " + String(e.message).slice(0, 150));
  telegram(`🛑 XL ETAPP2 FATAAL (${BATCH}) enne DB-muudatust: ${String(e.message).slice(0, 200)}`);
  process.exit(1);
}
