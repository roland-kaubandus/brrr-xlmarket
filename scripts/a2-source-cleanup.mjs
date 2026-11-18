#!/usr/bin/env node
/**
 * a2-source-cleanup.mjs — A2 FAAS 2: tühjaks jäänud allika-L3-de puhastus + Plekikääride pumbad.
 *
 * JOOKSEB PÄRAST faas 1 (scripts/a2-create.mjs --execute), mis lõi 52 uut L3 ja liigutas tooted.
 *
 * TEEB (üks transaktsioon + üks struktuuri-deploy):
 *  A) TÜHJAKS jäänud allika-L3-d (0 toote-linki ÜLDSE) → soft-delete + 301 (reason='merge') suurimasse
 *     loodud uude L3-sse (A2-plaan.json-ist, ainult PÄRISELT loodud handle). Residuaal-linkidega allikas
 *     → JÄETAKSE vahele + raport (ei forsseeri). set_config('xl.redirect_target',...) enne iga soft-delete'i.
 *  B) Plekikääride 5 vaadipumpa (pcat_t3f_6_2 misfitid) → pcat_ag2_2x4_1 (Kütuse ülepumpamispumbad).
 *     EI redirecti (allikas jääb elus, 13 kääri alles). set_config tühjendatakse enne (muidu päriks A-sihi).
 *
 * SSoT + deploy: genyM → taxonomy.yaml → gen-category-tree → commit (EKSPLIITSED pathid, HARD RULE #10)
 *     push mõlemad harud (HARD RULE #4) → coolify-deploy.sh (regen+commit slug-redirects.generated.json ise).
 * Meili reindeks + sync-synonyms ENNE deploy'd (luku all). Stack-lukk (#9). Undo-sidecar.
 *
 * KÄSK:  set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/a2-source-cleanup.mjs --dry       # arvuta + näita SQL, EI kirjuta
 *   node scripts/a2-source-cleanup.mjs --execute    # DB + Meili + 4-sammu deploy
 *   node scripts/a2-source-cleanup.mjs --undo reports/backups/a2-cleanup-undo-<batch>.json --execute
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { acquireStackLock } from "./lib/stack-lock.mjs";
import { carryRenamedThumbs, parseRenameRows } from "./lib/carry-renamed-thumbs.mjs";

const REPO = "/opt/xlmarket-github";
const SP = process.env.SP || "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry") || !argv.includes("--execute");
const UNDO = argv.includes("--undo") ? argv[argv.indexOf("--undo") + 1] : null;
const BATCH_ID = process.env.BATCH_ID || ("a2cl-" + new Date().toISOString().replace(/[:.]/g, "").replace(/(T\d{6}).*/, "$1"));
const PLAN = `${REPO}/reports/A2-plaan.json`;

// Plekikäärid: 5 vaadipumpa → pcat_ag2_2x4_1 (allikas pcat_t3f_6_2 jääb elus)
const PLEKI_SRC = "pcat_t3f_6_2";
const PLEKI_DST = "pcat_ag2_2x4_1";
const PLEKI_PUMPS = [
  "prod_01M5K4MPP69ET158T86T36B2NV", "prod_01M5K4MPP65DYJ9M55PYEKV124", "prod_01M5K4MPP6JHRZR02YWED43DPY",
  "prod_01M5K4MPP6YQZ2ZHAJ3WWCH60F", "prod_01M5K4MPP6RPC4GDFQY2APTVJF",
];

const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: "inherit" });
const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const MEDUSA = execSync("docker ps --format '{{.Names}}' | grep '^medusa-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }
const S = (s) => `'${String(s).replace(/'/g, "''")}'`;
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -F $'\\t' -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 }).trim();
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });

function reindex() {
  if (!MEDUSA) { console.error("⚠️ medusa-k33g puudub → Meili reindeks VAHELE"); return false; }
  try { sh(`docker exec ${MEDUSA} sh -c 'cd /app && node scripts/index-meilisearch.mjs'`); } catch { console.error("⚠️ Meili reindeks FAIL"); return false; }
  try { sh(`docker exec ${MEDUSA} sh -c 'cd /app && node scripts/sync-synonyms.mjs'`); }
  catch (e) { console.error("🛑 sync-synonyms KUKKUS: " + String(e.message).slice(0, 160)); process.exit(1); }
  return true;
}

const GIT_PATHS = ["backend/src/data/taxonomy.yaml", "storefront/lib/category-tree.generated.json",
  "scripts/a2-source-cleanup.mjs", "reports/A2-FAAS2-cleanup.md"];
function deploy(commitMsg) {
  sh(`node ${REPO}/scripts/genyM.mjs`);
  sh(`cp /opt/eumotors-tasks/v4-staging/taxonomy-music.yaml ${REPO}/backend/src/data/taxonomy.yaml`);
  sh(`node ${REPO}/scripts/gen-category-tree.mjs`);
  // HARD RULE #5 — pilt liigub handle-muutusega kaasa (FS-pool, analoog migration 010 DB-triggerile).
  // Kaitse-reconcile: kui mõni rename (A1 / naaber / käsitsi) jättis webp'i orvuks, kanna see siin uue handle alla.
  try {
    const CAT_THUMBS = `${REPO}/storefront/public/cat-thumbs`;
    const renames = parseRenameRows(q(`SELECT from_slug, to_slug FROM slug_redirect WHERE reason='rename'`));
    const { carried } = carryRenamedThumbs(renames, CAT_THUMBS, (from, to) => {
      try { sh(`cd ${REPO} && git add -A -- storefront/public/cat-thumbs/${from}.webp storefront/public/cat-thumbs/${to}.webp`); } catch {}
      if (!GIT_PATHS.includes(`storefront/public/cat-thumbs/${to}.webp`)) GIT_PATHS.push(`storefront/public/cat-thumbs/${to}.webp`);
    });
    if (carried.length) console.log(`  🖼  pilt-kaaskandmine (rename→handle): ${carried.length} — ${carried.slice(0, 6).join(" · ")}${carried.length > 6 ? " …" : ""}`);
  } catch (e) { console.log(`  ⚠️ pilt-kaaskandmine vahele (ei blokeeri): ${String(e.message).slice(0, 120)}`); }
  try {
    sh(`cd ${REPO} && git add -- ${GIT_PATHS.join(" ")}`);
    sh(`cd ${REPO} && git commit -m ${JSON.stringify(commitMsg + "\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>")}`);
    sh(`cd ${REPO} && git push origin taxonomy-v4`);
    try {
      const sha = execSync(`cd ${REPO} && git rev-parse HEAD`, { encoding: "utf8" }).trim();
      const wt = `/tmp/xl-a2cl-main-${BATCH_ID}`;
      sh(`cd ${REPO} && git fetch -q origin main`);
      sh(`cd ${REPO} && git worktree add --force ${wt} origin/main 2>&1 | tail -1 || true`);
      try { sh(`cd ${wt} && git cherry-pick -x ${sha} && git push origin HEAD:main`); console.log("  main-sünk: ✓"); }
      catch { try { sh(`cd ${wt} && git cherry-pick --abort`); } catch {} console.log("  main-sünk: ⚠️ konflikt — käsitsi"); }
      try { sh(`cd ${REPO} && git worktree remove --force ${wt}`); } catch {}
      try { sh(`cd ${REPO} && git worktree prune`); } catch {}
    } catch (e) { console.log("  main-sünk: ⚠️ " + String(e.message).slice(0, 100)); }
  } catch (e) { console.log("ℹ️ git: " + String(e.message).slice(0, 140)); }
  sh(`bash ${REPO}/scripts/coolify-deploy.sh`);
  console.log("✓ 4-sammu deploy: genyM + yaml + gen-tree + push mõlemad + coolify (slug-redirects auto-regen)");
}

function tg(msg) { try { sh(`node ${REPO}/scripts/notify-telegram.mjs ${JSON.stringify(msg)} 2>/dev/null || true`); } catch {} }

// ───────────────────────── UNDO ─────────────────────────
function runUndo() {
  if (!fs.existsSync(UNDO)) { console.error(`🔴 undo-fail puudub: ${UNDO}`); process.exit(1); }
  const u = JSON.parse(fs.readFileSync(UNDO, "utf8"));
  console.log(`🧯 UNDO batch=${u.batch_id} · ${u.deleted.length} allikat taasta · pumbad=${u.pumps?.length || 0}${DRY ? " [DRY]" : ""}`);
  let sql = "BEGIN;\n";
  // A taasta: allikad elule + kustuta merge-redirect read
  for (const d of u.deleted) sql += `UPDATE product_category SET deleted_at=NULL, is_active=true, updated_at=now() WHERE id=${S(d.id)};\n`;
  const fromSlugs = u.deleted.map(d => d.handle).filter(Boolean);
  if (fromSlugs.length) sql += `DELETE FROM slug_redirect WHERE from_slug IN (${fromSlugs.map(S).join(",")}) AND reason='merge';\n`;
  // B Plekikäärid tagasi: detach sihist + reattach allikasse
  if (u.pumps?.length) {
    sql += `DELETE FROM product_category_product WHERE product_id IN (${u.pumps.map(S).join(",")}) AND product_category_id=${S(PLEKI_DST)};\n`;
    sql += `INSERT INTO product_category_product (product_id, product_category_id) SELECT x, ${S(PLEKI_SRC)} FROM unnest(ARRAY[${u.pumps.map(S).join(",")}]) x ON CONFLICT DO NOTHING;\n`;
  }
  sql += "COMMIT;\n";
  if (DRY) { console.log(sql); process.exit(0); }
  let rel = null;
  try { rel = acquireStackLock({ holder: "a2-cleanup-undo", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 }); }
  catch (e) { console.error(`🔴 ${e.message}`); process.exit(3); }
  psqlTx(sql); console.log("✓ UNDO DB taastatud"); reindex(); if (rel) rel();
  deploy(`revert(taxonomy): A2 FAAS2 UNDO ${u.batch_id} — ${u.deleted.length} allikat elule + ${u.pumps?.length || 0} pumpa tagasi`);
  console.log(`\n✅ UNDO valmis — ${u.batch_id}`); process.exit(0);
}
if (UNDO) runUndo();

// ───────────────────────── PLAN ─────────────────────────
if (!fs.existsSync(PLAN)) { console.error(`🔴 ${PLAN} puudub — jooksuta enne faas 1`); process.exit(1); }
const plan = JSON.parse(fs.readFileSync(PLAN, "utf8")).plans;
// srcId → loodud L3-d (handle, name_et, n), kahanevalt n järgi
const bySrc = {};
for (const p of plan) (bySrc[p.srcId] ||= []).push({ handle: p.handle, name_et: p.name_et, n: p.n });
for (const k in bySrc) bySrc[k].sort((a, b) => b.n - a.n);

// Live DB: iga allika KÕIK toote-lingid (mitte ainult published) + kas loodud L3 päriselt olemas
const srcIds = Object.keys(bySrc);
const linkRows = q(`SELECT pc.id, pc.handle, pc.name, pc.deleted_at IS NULL AS alive,
    (SELECT count(*) FROM product_category_product x WHERE x.product_category_id=pc.id) AS links
  FROM product_category pc WHERE pc.id IN (${srcIds.map(S).join(",")});`).split("\n").filter(Boolean);
const srcInfo = {}; for (const r of linkRows) { const [id, handle, name, alive, links] = r.split("\t"); srcInfo[id] = { handle, name, alive: alive === "t", links: +links }; }

// loodud L3 handled, mis DB-s päriselt olemas (granulaarsus-värav võib mõne shadow'sse jätta)
const allNewHandles = [...new Set(plan.map(p => p.handle))];
const liveNew = new Set((q(`SELECT handle FROM product_category WHERE handle IN (${allNewHandles.map(S).join(",")}) AND deleted_at IS NULL;`) || "").split("\n").filter(Boolean));

const toDelete = [], skipped = [];
for (const id of srcIds) {
  const info = srcInfo[id]; if (!info) { skipped.push({ id, reason: "DB-s puudub" }); continue; }
  if (!info.alive) { skipped.push({ id, name: info.name, reason: "juba kustutatud" }); continue; }
  if (info.links > 0) { skipped.push({ id, name: info.name, reason: `${info.links} residuaal-linki → EI kustuta` }); continue; }
  // 301-siht = suurim PÄRISELT loodud uus L3 selle allika alt
  const target = (bySrc[id] || []).find(l => liveNew.has(l.handle));
  if (!target) { skipped.push({ id, name: info.name, reason: "ükski loodud L3 ei ela (kõik shadow?) → EI kustuta" }); continue; }
  toDelete.push({ id, handle: info.handle, name: info.name, target: target.handle, targetName: target.name_et });
}

// Plekikäärid: millised 5 pumpa on PÄRISELT veel allikas?
const pumpsIn = (q(`SELECT product_id FROM product_category_product WHERE product_category_id=${S(PLEKI_SRC)} AND product_id IN (${PLEKI_PUMPS.map(S).join(",")});`) || "").split("\n").filter(Boolean);
const dstAlive = (q(`SELECT 1 FROM product_category WHERE id=${S(PLEKI_DST)} AND deleted_at IS NULL;`) || "").trim() === "1";

// ───────────────────────── RAPORT ─────────────────────────
let md = `# A2 FAAS 2 — allika-puhastus + Plekikäärid\n\n> ${new Date().toISOString()} · batch ${BATCH_ID}\n\n`;
md += `## A) Soft-delete + 301 (${toDelete.length})\n` + toDelete.map(d => `- \`${d.id}\` «${d.name}» → 301 → «${d.targetName}» (\`${d.target}\`)`).join("\n") + "\n\n";
if (skipped.length) md += `## ⏸️ Vahele jäetud (${skipped.length})\n` + skipped.map(s => `- \`${s.id}\` ${s.name || ""}: ${s.reason}`).join("\n") + "\n\n";
md += `## B) Plekikäärid 5 pumpa → \`${PLEKI_DST}\`\n- allikas veel: ${pumpsIn.length}/5 · siht elus: ${dstAlive ? "jah" : "EI"}\n`;
fs.writeFileSync(`${REPO}/reports/A2-FAAS2-cleanup.md`, md);
console.log(`\nA) soft-delete+301: ${toDelete.length} · ⏸ vahele: ${skipped.length} · B) pumbad allikas: ${pumpsIn.length}/5 (siht ${dstAlive ? "elus" : "PUUDU"})`);
for (const d of toDelete) console.log(`  🗑  ${d.id} «${d.name}» → 301 ${d.target}`);
for (const s of skipped) console.log(`  ⏸  ${s.id} ${s.name || ""}: ${s.reason}`);

// ───────────────────────── SQL ─────────────────────────
let sql = "BEGIN;\n";
for (const d of toDelete) {
  sql += `SELECT set_config('xl.redirect_target', ${S(d.target)}, true);\n`;
  sql += `UPDATE product_category SET deleted_at=now(), is_active=false, updated_at=now() WHERE id=${S(d.id)} AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM product_category_product x WHERE x.product_category_id=${S(d.id)});\n`;
}
if (pumpsIn.length && dstAlive) {
  sql += `SELECT set_config('xl.redirect_target', '', true);\n`; // pumbad: EI redirecti
  sql += `DELETE FROM product_category_product WHERE product_id IN (${pumpsIn.map(S).join(",")}) AND product_category_id IN (SELECT id FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL);\n`;
  sql += `INSERT INTO product_category_product (product_id, product_category_id) SELECT x, ${S(PLEKI_DST)} FROM unnest(ARRAY[${pumpsIn.map(S).join(",")}]) x ON CONFLICT DO NOTHING;\n`;
}
sql += "COMMIT;\n";

if (DRY) { console.log("\n--- SQL (DRY) ---\n" + sql + "\n→ käivita: node scripts/a2-source-cleanup.mjs --execute"); process.exit(0); }
if (!toDelete.length && !(pumpsIn.length && dstAlive)) { console.log("\n✅ Midagi teha pole (0 tühja + pumbad liigutatud)."); process.exit(0); }

// undo-sidecar ENNE kirjutust
const undoFile = `${REPO}/reports/backups/a2-cleanup-undo-${BATCH_ID}.json`;
fs.mkdirSync(`${REPO}/reports/backups`, { recursive: true });
fs.writeFileSync(undoFile, JSON.stringify({ batch_id: BATCH_ID, deleted: toDelete, pumps: (pumpsIn.length && dstAlive) ? pumpsIn : [] }, null, 2));
console.log(`💾 undo: node scripts/a2-source-cleanup.mjs --undo ${undoFile.replace(REPO + "/", "")} --execute`);

let rel = null;
try { rel = acquireStackLock({ holder: "a2-cleanup", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 }); }
catch (e) { console.error(`🔴 ${e.message}\n   → deploy käib? proovi uuesti.`); process.exit(3); }
const baseL3 = () => +q(`SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;`);
const b4 = baseL3();
psqlTx(sql);
const af = baseL3();
console.log(`✓ DB: L3 ${b4}→${af} (−${b4 - af}) · 301 read ${toDelete.length} · pumbad ${pumpsIn.length}`);
reindex();
if (rel) rel();
deploy(`feat(a2-faas2): ${toDelete.length} tühja allika-L3 soft-delete+301 + ${pumpsIn.length} Plekikäärid-pumpa → ${PLEKI_DST}`);
tg(`✅ XL A2 FAAS2 — ${toDelete.length} allikat soft-delete+301, ${pumpsIn.length} pumpa liigutatud, L3 ${b4}→${af}. Undo: a2-cleanup-undo-${BATCH_ID}.json`);
console.log(`\n✅ A2 FAAS 2 valmis — batch ${BATCH_ID}`);
