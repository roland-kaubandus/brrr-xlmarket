#!/usr/bin/env node
/**
 * classifier-undo.mjs — pööra tagasi auto-klassifikaatori partii (HARD RULE #6: iga auto-tegu = undo).
 *
 * Loeb sidecar-faili reports/etapp2-undo-<batch_id>.json (VÕI --file <path>) ja:
 *   1. lahutab kõik seotud tooted (product_category_product DELETE)
 *   2. kustutab loodud L3-d (taxonomy_node_meta + product_category DELETE)
 *   3. taastab toodete status='draft' + classification_review status='pending'
 *   4. jooksutab SSoT-regen + Meili reindeks + push mõlemad + Coolify redeploy (--deploy)
 *   5. logib review_decision_log (actor=claude-code-test, action=undo, HARD RULE #8)
 *
 * Käsk: node scripts/classifier-undo.mjs <batch_id> [--deploy] [--dry]
 *       node scripts/classifier-undo.mjs --file reports/etapp2-undo-<id>.json [--deploy]
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const REPO = "/opt/xlmarket-github";
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const DEPLOY = argv.includes("--deploy");
const fileArg = argv[argv.indexOf("--file") + 1];
const batchId = argv.find(a => !a.startsWith("--") && a !== fileArg);
const undoFile = (argv.includes("--file") && fileArg) ? fileArg : `${REPO}/reports/etapp2-undo-${batchId}.json`;
if (!fs.existsSync(undoFile)) { console.error(`🔴 undo-fail puudub: ${undoFile}`); process.exit(1); }
const u = JSON.parse(fs.readFileSync(undoFile, "utf8"));
console.log(`🧯 UNDO batch=${u.batch_id} · ${u.new_l3.length} L3 · ${u.product_ids.length} toodet${DRY ? " [DRY]" : ""}`);

const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: "inherit" });
const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const MEDUSA = execSync("docker ps --format '{{.Names}}' | grep '^medusa-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" });
const psql = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -f -`, { input: sql, encoding: "utf8" }).trim();
const S = (s) => `'${String(s).replace(/'/g, "''")}'`;

const nid = u.new_l3.map(l => S(l.id)).join(",");
const pid = u.product_ids.map(S).join(",");

// REPARENT-taaste (ETAPP3): tooted, millel oli ENNE partii vana v4-L3 kodu → taasta vana kodu + staatus,
// MITTE draft (muidu juba-avaldatud toode kaoks poest). Ülejäänud (kodutud, öine) → draft + pending (vana käitumine).
const reparent = Array.isArray(u.reparent) ? u.reparent.filter(r => (r.from_cat_ids || []).length) : [];
const reparentIds = new Set(reparent.map(r => r.product_id));
const homelessIds = u.product_ids.filter(id => !reparentIds.has(id));
const restorePairs = reparent.flatMap(r => r.from_cat_ids.map(cid => `(${S(r.product_id)}, ${S(cid)})`));
const pubRestore = reparent.filter(r => r.prev_status === "published").map(r => S(r.product_id));
const draftRestore = reparent.filter(r => r.prev_status && r.prev_status !== "published").map(r => S(r.product_id));

if (DRY) {
  console.log(`[DRY] kustutaks L3: ${u.new_l3.map(l => l.id).join(", ")}`);
  console.log(`[DRY] reparent-taaste (vana kodu + staatus): ${reparent.length} toodet`);
  console.log(`[DRY] kodutu → draft/pending: ${homelessIds.length} toodet`);
  process.exit(0);
}

psqlTx(`BEGIN;
  DELETE FROM product_category_product WHERE product_id IN (${pid});
  DELETE FROM taxonomy_node_meta WHERE node_id IN (${nid});
  DELETE FROM product_category WHERE id IN (${nid});
  ${restorePairs.length ? `INSERT INTO product_category_product (product_id, product_category_id) VALUES ${restorePairs.join(", ")} ON CONFLICT DO NOTHING;` : ""}
  ${pubRestore.length ? `UPDATE product SET status='published', updated_at=now() WHERE id IN (${pubRestore.join(",")});` : ""}
  ${draftRestore.length ? `UPDATE product SET status='draft', updated_at=now() WHERE id IN (${draftRestore.join(",")});` : ""}
  ${homelessIds.length ? `UPDATE product SET status='draft', updated_at=now() WHERE id IN (${homelessIds.map(S).join(",")});
  UPDATE classification_review SET status='pending', updated_at=now() WHERE product_id IN (${homelessIds.map(S).join(",")});` : ""}
  INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, status, affected, meta)
    VALUES ('claude-code-test','claude-code-test','api','auto-classifier','undo','applied',
      ${S(JSON.stringify(u.product_ids))}::jsonb, ${S(JSON.stringify({ batch_id: u.batch_id, undo_file: undoFile.replace(REPO + "/", ""), reparent_restored: reparent.length, homeless_drafted: homelessIds.length }))}::jsonb);
  COMMIT;`);
console.log(`✓ DB taastatud (L3 kustutatud · reparent-taaste ${reparent.length} · kodutu→draft ${homelessIds.length} · undo logitud)`);

try { execSync(`docker exec ${MEDUSA} node /app/scripts/index-meilisearch.mjs`, { stdio: "inherit" }); }
catch { sh(`cd ${REPO} && node backend/scripts/index-meilisearch.mjs`); }

// #0 (Tarmo 2026-10-09): reindeks ilma sync'ita jätab otsingu sünonüümideta → KANOONILINE sync FAIL-LOUD.
// Kehtib KÕIGILE reindeksi-kutsujatele (mootor, ETAPP2, öine pipeline, undo). Viga → exit!=0, MITTE skip.
try { sh(`docker exec ${MEDUSA} node /app/scripts/sync-synonyms.mjs`); }
catch (e) { console.error("🛑 sync-synonyms KUKKUS undo-reindeksi järel — Meili jääks ILMA sünonüümideta: " + String(e.message).slice(0, 180)); process.exit(1); }

if (DEPLOY) {
  sh(`node ${REPO}/scripts/genyM.mjs`);
  sh(`cp /opt/eumotors-tasks/v4-staging/taxonomy-music.yaml ${REPO}/backend/src/data/taxonomy.yaml`);
  sh(`node ${REPO}/scripts/gen-category-tree.mjs`);
  try {
    sh(`cd ${REPO} && git add -A && git commit -m ${JSON.stringify(`revert(taxonomy): undo klassifikaatori partii ${u.batch_id}\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)}`);
    sh(`cd ${REPO} && git push origin taxonomy-v4`);  // Coolify build-allikas
    // HARD RULE #4 — sama commit MÕLEMALE harule (main worktree cherry-pick, nagu mootor)
    try {
      const sha = execSync(`cd ${REPO} && git rev-parse HEAD`, { encoding: "utf8" }).trim();
      const wt = `/tmp/xl-undo-main-${u.batch_id}`;
      sh(`cd ${REPO} && git fetch -q origin main`);
      sh(`cd ${REPO} && git worktree add --force ${wt} origin/main 2>&1 | tail -1 || true`);
      try { sh(`cd ${wt} && git cherry-pick -x ${sha} && git push origin HEAD:main`); console.log("  main-sünk: ✓ (worktree cherry-pick)"); }
      catch { try { sh(`cd ${wt} && git cherry-pick --abort`); } catch {} console.log("  main-sünk: ⚠️ konflikt — käsitsi cherry-pick"); }
      try { sh(`cd ${REPO} && git worktree remove --force ${wt}`); } catch {}
    } catch (e) { console.log("  main-sünk: ⚠️ " + String(e.message).slice(0, 100)); }
  } catch (e) { console.log("ℹ️ git: " + String(e.message).slice(0, 120)); }
  sh(`bash ${REPO}/scripts/coolify-deploy.sh`);
  console.log("✓ SSoT regen + reindeks + sync + push mõlemad + redeploy");
} else {
  console.log("ℹ️ --deploy puudus: DB taastatud + reindeks tehtud, aga SSoT/nav/push/redeploy VAHELE. Lisa --deploy täis-taasteks.");
}
console.log(`\n✅ UNDO valmis — batch ${u.batch_id}`);
