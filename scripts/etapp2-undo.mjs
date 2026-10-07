#!/usr/bin/env node
/**
 * etapp2-undo.mjs — tagasipööramine ETAPP 2 batch'ile (nii l3meta kirjeldused KUI pcp-liigutused).
 * Käivita:  node scripts/etapp2-undo.mjs <batch_id>
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const REPO = "/opt/xlmarket-github";
const batch = process.argv[2];
if (!batch) { console.error("Kasutus: node scripts/etapp2-undo.mjs <batch_id>"); process.exit(2); }
const undoFile = `${REPO}/reports/backups/etapp2-undo-${batch}.json`;
if (!fs.existsSync(undoFile)) { console.error(`🔴 undo-fail puudub: ${undoFile}`); process.exit(2); }
const U = JSON.parse(fs.readFileSync(undoFile, "utf8"));

const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }
const S = (s) => `'${String(s).replace(/'/g, "''")}'`;
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });

let sql = "BEGIN;\n";
// 1. kirjeldused tagasi (NULL kui oli tühi)
for (const d of U.descriptions || []) {
  sql += d.oldDescription && d.oldDescription.length
    ? `UPDATE product_category SET description=${S(d.oldDescription)} WHERE id=${S(d.id)};\n`
    : `UPDATE product_category SET description=NULL WHERE id=${S(d.id)};\n`;
}
// 2. liigutused tagasi (toode → from)
for (const m of U.moves || []) {
  sql += `UPDATE product_category_product SET product_category_id=${S(m.fromId)} WHERE product_id=${S(m.pid)} AND product_category_id=${S(m.toId)};\n`;
}
// 3. logi undo
sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, status, affected, meta)
  VALUES ('claude-code-test','auto-judge-audit','pipeline','audit-undo','undo',${S(batch)},'applied',${S(JSON.stringify((U.moves || []).map((m) => m.pid)))}::jsonb,${S(JSON.stringify({ batch_id: batch, undo_descriptions: (U.descriptions || []).length, undo_moves: (U.moves || []).length }))}::jsonb);\n`;
sql += "COMMIT;\n";

console.log(`⏳ undo batch=${batch}: ${(U.descriptions || []).length} kirjeldust + ${(U.moves || []).length} toodet tagasi…`);
psqlTx(sql);
console.log(`✅ TAGASI PÖÖRATUD. Meili reindeks + nav-regen vajadusel käsitsi.`);
