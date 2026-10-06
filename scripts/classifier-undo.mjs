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

if (DRY) {
  console.log(`[DRY] kustutaks L3: ${u.new_l3.map(l => l.id).join(", ")}`);
  console.log(`[DRY] lahutaks + draft/pending: ${u.product_ids.length} toodet`);
  process.exit(0);
}

psqlTx(`BEGIN;
  DELETE FROM product_category_product WHERE product_id IN (${pid});
  DELETE FROM taxonomy_node_meta WHERE node_id IN (${nid});
  DELETE FROM product_category WHERE id IN (${nid});
  UPDATE product SET status='draft', updated_at=now() WHERE id IN (${pid});
  UPDATE classification_review SET status='pending', updated_at=now() WHERE product_id IN (${pid});
  INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, status, affected, meta)
    VALUES ('claude-code-test','claude-code-test','api','auto-classifier','undo','applied',
      ${S(JSON.stringify(u.product_ids))}::jsonb, ${S(JSON.stringify({ batch_id: u.batch_id, undo_file: undoFile.replace(REPO + "/", "") }))}::jsonb);
  COMMIT;`);
console.log("✓ DB taastatud (L3 kustutatud, tooted draft, review pending, undo logitud)");

try { execSync(`docker exec ${MEDUSA} node /app/scripts/index-meilisearch.mjs`, { stdio: "inherit" }); }
catch { sh(`cd ${REPO} && node backend/scripts/index-meilisearch.mjs`); }

if (DEPLOY) {
  sh(`node ${REPO}/scripts/genyM.mjs`);
  sh(`cp /opt/eumotors-tasks/v4-staging/taxonomy-music.yaml ${REPO}/backend/src/data/taxonomy.yaml`);
  sh(`node ${REPO}/scripts/gen-category-tree.mjs`);
  try {
    sh(`cd ${REPO} && git add -A && git commit -m ${JSON.stringify(`revert(taxonomy): undo klassifikaatori partii ${u.batch_id}\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)}`);
    sh(`cd ${REPO} && git push origin taxonomy-v4`);
  } catch (e) { console.log("ℹ️ git: " + String(e.message).slice(0, 120)); }
  sh(`bash ${REPO}/scripts/coolify-deploy.sh`);
  console.log("✓ SSoT regen + reindeks + push + redeploy");
} else {
  console.log("ℹ️ --deploy puudus: DB taastatud + reindeks tehtud, aga SSoT/nav/push/redeploy VAHELE. Lisa --deploy täis-taasteks.");
}
console.log(`\n✅ UNDO valmis — batch ${u.batch_id}`);
