#!/usr/bin/env node
/**
 * etapp3-regranularity-recheck.mjs — TAGASIULATUV üle-fragmenteerimise kontroll ETAPP3 39 loodud L3-le.
 *
 * TAUST (Tarmo 2026-10-09): ETAPP3 eel-filter (apply-granularity-gate) kasutas AINULT 1 kohtunikku (Opus).
 * Õhukesed klastrid (n≤2, neid 26/39) said üksiku "distinct" verdikti õhukese tõendi peal. Parandatud värav
 * (granularity-gate.mjs — §2c asümm-kindlus) nõuab õhukestele 2. SÕLTUMATU kohtunikku (Fable). See skript
 * rakendab parandatud värava TAGASIULATUVALT: distinct jääb alles, variant/kinnitamata → undo AINULT see L3
 * (tooted vanasse koju, L3 kustutatakse — pood pole avatud, URL-id pole indekseeritud) + shadow-signaal.
 *
 * DRY (vaikimisi): näitab nimekirja (L3, n, verdict, nearest, põhjus). --execute: undo + deploy.
 * Käsk: node scripts/etapp3-regranularity-recheck.mjs            (DRY)
 *       node scripts/etapp3-regranularity-recheck.mjs --execute   (undo kukkujad + 4-sammu deploy)
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { granularityGate } from "./lib/granularity-gate.mjs";
import { makeCaller } from "./lib/l3-desc.mjs";
import { ensureShadowSchema, recordShadowProposal } from "./lib/shadow-ledger.mjs";

const REPO = "/opt/xlmarket-github";
const EXECUTE = process.argv.includes("--execute");
const BATCHES = ["b1-2026-10-09T0706", "b2-2026-10-09T0805", "b3-2026-10-09T0907", "b4-2026-10-09T1018"];
const OUT_MD = `${REPO}/reports/etapp3-regranularity-recheck.md`;
const OUT_JSON = `${REPO}/reports/etapp3-regranularity-fail.json`;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error("🛑 ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a) — ohutu HOLD."); process.exit(1); }

// ---- 1) laadi 39 loodud L3 (undo-failid) + plaani-metaandmed (ck/titles/parentL2) ----
const plan = JSON.parse(fs.readFileSync(`${REPO}/reports/ETAPP3-plaan.json`, "utf8"));
const plans = plan.plans || plan.survivors || plan;
const planByHandle = new Map(plans.map((p) => [p.handle, p]));
const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8")).nodes;

const undos = BATCHES.map((b) => ({ b, u: JSON.parse(fs.readFileSync(`${REPO}/reports/etapp2-undo-e3-${b}.json`, "utf8")) }));
const attachCount = new Map(); // cat_id -> n
for (const { u } of undos) for (const a of u.attach) attachCount.set(a.cat_id, (attachCount.get(a.cat_id) || 0) + 1);

const created = []; // {handle, id, name_et, parentL2, ck, n, titles, batch}
for (const { b, u } of undos) {
  for (const l of u.new_l3) {
    const node = tree[l.handle];
    const pl = planByHandle.get(l.handle);
    const parentL2 = node?.parent_handle || pl?.parentL2;
    created.push({
      handle: l.handle, id: l.id, name_et: l.name || pl?.name_et, name_en: pl?.name_en,
      parentL2, parentL2_name: pl?.parentL2_name || tree[parentL2]?.name_et,
      ck: pl?.ck || `handle:${l.handle}`, n: attachCount.get(l.id) || pl?.n || 0,
      titles: (pl?.products || []).map((x) => x.title).filter(Boolean), batch: b,
    });
  }
}
console.log(`🔁 Re-check: ${created.length} loodud L3 (õhukesi n≤2: ${created.filter((c) => c.n <= 2).length})`);

// ---- 2) õed treebist (sama L2, VÄLJA ARVATUD kandidaat ise) ----
const siblingsByCk = new Map(created.map((c) => {
  const kids = (tree[c.parentL2]?.child_handles || []).map((h) => tree[h]).filter((n) => n && n.level === 3 && n.handle !== c.handle);
  return [c.ck, kids.map((n) => ({ handle: n.handle, name_et: n.name_et || n.name_en, name_en: n.name_en }))];
}));
// KRIITILINE: siht-L3-d on nüüd treebis → õdedest JÄTA VÄLJA KÕIK 39 loodut (sh kandidaat ise), et
// võrrelda AINULT EEL-EKSISTEERINUD taksonoomiaga — täpselt nagu eel-filter tegi ENNE loomist. Muidu iga
// kandidaat näeb iseennast "identse õena" → vale-positiivne "variant".
const createdHandles = new Set(created.map((c) => c.handle));
const siblingsOf = (l2) => {
  const kids = (tree[l2]?.child_handles || []).map((h) => tree[h]).filter((n) => n && n.level === 3 && !createdHandles.has(n.handle));
  return kids.map((n) => ({ handle: n.handle, name_et: n.name_et || n.name_en, name_en: n.name_en }));
};

// ---- 3) jooksuta PARANDATUD värav (õhuke distinct → 2. kohtunik Fable) ----
const candidates = created.map((c) => ({ ck: c.ck, name_et: c.name_et, name_en: c.name_en, parentL2: c.parentL2, parentL2_name: c.parentL2_name, n: c.n, titles: c.titles }));
// siblingsOf peab kandidaadi enda välja jätma — grupeerime per-ck kaudu allpool. granularityGate kasutab
// per-L2 õdesid; kandidaat ise on samas L2 õdede seas EI OLE (loodud L3 on treebis, aga me anname
// siblingsOf(l2) = KÕIK L3 selles L2-s, sh teised loodud). See on TAOTLETUD: avastab ka uute-vaheline dup.
const { results, apiCalls } = await granularityGate({ candidates, siblingsOf, caller: makeCaller({ apiKey }) });
console.log(`   kohtuniku-kutseid: ${apiCalls}`);

// ---- 4) koonda tulemus ----
const rows = created.map((c) => {
  const v = results.get(c.ck) || { verdict: "unclear", pass: false, reason: "värav ei tagastanud" };
  return { ...c, verdict: v.verdict, pass: v.pass !== false && v.verdict === "distinct", nearest: v.nearest || null, reason: v.reason || "", confirm: v.confirm || null };
});
rows.sort((a, b) => (a.pass === b.pass ? a.n - b.n : a.pass ? 1 : -1));
const fails = rows.filter((r) => !r.pass);

// ---- raport ----
let md = `# ETAPP3 tagasiulatuv granulaarsus-re-check (parandatud värav, §2c)\n\n`;
md += `Genereeritud: ${new Date().toISOString()} · kohtuniku-kutseid: ${apiCalls}\n\n`;
md += `**${created.length} loodud L3** → **${rows.length - fails.length} distinct (jäävad)** · **${fails.length} variant/kinnitamata (undo)**\n\n`;
md += `## ⛔ UNDO-kandidaadid (${fails.length})\n\n| L3 | n | verdict | lähim õde | põhjus |\n|---|---|---|---|---|\n`;
for (const r of fails) md += `| «${r.name_et}» | ${r.n} | ${r.verdict}${r.confirm ? ` (2.kohtunik: ${r.confirm.verdict})` : ""} | ${r.nearest || "—"} | ${(r.reason || "").replace(/\|/g, "/").slice(0, 160)} |\n`;
md += `\n## ✅ JÄÄVAD distinct (${rows.length - fails.length})\n\n| L3 | n | 2.kohtunik |\n|---|---|---|\n`;
for (const r of rows.filter((x) => x.pass)) md += `| «${r.name_et}» | ${r.n} | ${r.confirm ? r.confirm.verdict : (r.n <= 2 ? "?" : "—(jäme, ei vaja)")} |\n`;
fs.writeFileSync(OUT_MD, md);

const failHandles = fails.map((r) => ({ handle: r.handle, id: r.id, name_et: r.name_et, n: r.n, parentL2: r.parentL2, ck: r.ck, verdict: r.verdict, nearest: r.nearest, reason: r.reason, batch: r.batch }));
fs.writeFileSync(OUT_JSON, JSON.stringify({ generated_at: new Date().toISOString(), created: created.length, fail: fails.length, keep: rows.length - fails.length, rows: failHandles }, null, 2));

console.log(`\n⛔ UNDO (${fails.length}):`);
for (const r of fails) console.log(`   «${r.name_et}» n=${r.n} [${r.verdict}] → ${r.nearest || "?"} · ${(r.reason || "").slice(0, 90)}`);
console.log(`✅ JÄÄVAD: ${rows.length - fails.length}`);
console.log(`\n📄 ${OUT_MD.replace(REPO + "/", "")} · ${OUT_JSON.replace(REPO + "/", "")}`);

if (!EXECUTE) { console.log(`\n[DRY] midagi EI muudetud. --execute → undo ${fails.length} L3 + 4-sammu deploy.`); process.exit(0); }
if (!fails.length) { console.log(`\n✓ 0 kukkujat → undo pole vaja. Värav kinnitas kõik ${created.length} L3 distinct'iks.`); process.exit(0); }

// ---- 5) EXECUTE: ehita filtreeritud per-batch undo-failid (AINULT kukkuvad L3) ----
console.log(`\n🧯 EXECUTE: undo ${fails.length} L3 (AINULT kukkujad, per-L3 filter)\n`);
const failIdsByBatch = new Map();
for (const r of fails) { if (!failIdsByBatch.has(r.batch)) failIdsByBatch.set(r.batch, new Set()); failIdsByBatch.get(r.batch).add(r.id); }

const filteredFiles = [];
for (const { b, u } of undos) {
  const ids = failIdsByBatch.get(b);
  if (!ids || !ids.size) continue;
  const new_l3 = u.new_l3.filter((l) => ids.has(l.id));
  const attach = u.attach.filter((a) => ids.has(a.cat_id));
  const prodIds = new Set(attach.map((a) => a.product_id));
  const product_ids = u.product_ids.filter((p) => prodIds.has(p));
  const reparent = (u.reparent || []).filter((r) => prodIds.has(r.product_id));
  const fu = { batch_id: `${u.batch_id}-regran`, created_at: new Date().toISOString(), actor: "claude-code-test", label: `regran-undo ${b} (${new_l3.length} L3)`, new_l3, attach, product_ids, reparent };
  const fpath = `${REPO}/reports/etapp3-regran-undo-${b}.json`;
  fs.writeFileSync(fpath, JSON.stringify(fu, null, 2));
  filteredFiles.push(fpath);
  console.log(`   ${b}: ${new_l3.length} L3 · ${product_ids.length} toodet → ${fpath.replace(REPO + "/", "")}`);
}

// shadow-signaal (koguneb — origin granularity-thin-variant)
try {
  const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
  const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" });
  ensureShadowSchema(q);
  for (const r of fails) recordShadowProposal(q, { batch_id: `regran-${r.batch}`, cluster_key: r.ck, proposed_name: r.name_et, parent_l2_handle: r.parentL2, origin: r.verdict === "unclear" ? "granularity-unclear" : "granularity-thin-variant", n_products: r.n, all_gates_pass: false, gates: { regranularity: { verdict: r.verdict, nearest: r.nearest, reason: r.reason } } });
  console.log(`   shadow-signaal: ${fails.length} kirja (origin granularity-thin-variant)`);
} catch (e) { console.log(`   ⚠ shadow-kirjutus vahele: ${String(e.message).slice(0, 120)}`); }

// ---- 6) jooksuta undo iga filtreeritud faili peal (DB + reindeks + sync; deploy VIIMASES) ----
const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: "inherit" });
for (let i = 0; i < filteredFiles.length; i++) {
  const isLast = i === filteredFiles.length - 1;
  console.log(`\n── undo ${i + 1}/${filteredFiles.length}${isLast ? " (--deploy: SSoT+push mõlemad+redeploy)" : ""} ──`);
  sh(`node ${REPO}/scripts/classifier-undo.mjs --file ${filteredFiles[i]}${isLast ? " --deploy" : ""}`);
}
console.log(`\n✅ Regranularity-undo valmis: ${fails.length} L3 eemaldatud, tooted vanasse koju, shadow-signaal kogunenud.`);
