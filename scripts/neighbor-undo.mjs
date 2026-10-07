#!/usr/bin/env node
/**
 * neighbor-undo.mjs — tagasipööramine NAABRITE ÜLEHINDAMISE batch'ile (ainult pcp-liigutused).
 * Erineb classifier-undo'st: EI kustuta tooteid ega L3-sid — pöörab liigutused tagasi (toode → from-kodu).
 * Käivita:  node scripts/neighbor-undo.mjs <batch_id> [--reindex]
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const REPO = "/opt/xlmarket-github";
const batch = process.argv[2];
const REINDEX = process.argv.includes("--reindex");
if (!batch || batch.startsWith("--")) { console.error("Kasutus: node scripts/neighbor-undo.mjs <batch_id> [--reindex]"); process.exit(2); }
const undoFile = `${REPO}/reports/backups/neighbor-undo-${batch}.json`;
if (!fs.existsSync(undoFile)) { console.error(`🔴 undo-fail puudub: ${undoFile}`); process.exit(2); }
const U = JSON.parse(fs.readFileSync(undoFile, "utf8"));

const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const MEDUSA = execSync("docker ps --format '{{.Names}}' | grep '^medusa-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }
const S = (s) => `'${String(s).replace(/'/g, "''")}'`;
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });

let sql = "BEGIN;\n";
for (const m of U.moves || []) {
  sql += `UPDATE product_category_product SET product_category_id=${S(m.fromId)} WHERE product_id=${S(m.pid)} AND product_category_id=${S(m.toId)};\n`;
}
sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, status, affected, meta)
  VALUES ('claude-code-test','auto-judge-audit','pipeline','neighbor-undo','undo',${S(batch)},'applied',${S(JSON.stringify((U.moves || []).map((m) => m.pid)))}::jsonb,${S(JSON.stringify({ batch_id: batch, undo_moves: (U.moves || []).length }))}::jsonb);\n`;
sql += "COMMIT;\n";

console.log(`⏳ undo batch=${batch}: ${(U.moves || []).length} toodet tagasi from-kodusse…`);
psqlTx(sql);
console.log("✅ TAGASI PÖÖRATUD.");
if (REINDEX && MEDUSA) { console.log("⏳ Meili reindeks…"); execSync(`docker exec ${MEDUSA} sh -c 'cd /app && node scripts/index-meilisearch.mjs'`, { stdio: "inherit" }); }
else console.log("ℹ️ Meili reindeks VAHELE (lisa --reindex). Liigutused = ainult toote-lingid → kerge tee.");
