#!/usr/bin/env node
/**
 * etapp1-move-undo.mjs — pööra tagasi ETAPP 1 toote-liigutuste partii (HARD RULE #6: iga auto-tegu = undo).
 *
 * Loeb reports/backups/etapp1-undo-<batch_id>.json ja taastab iga toote ALGSE kategooria
 * (relink to→from, guard product_category_id=to), logib undo (actor=claude-code-test, HARD RULE #8),
 * jooksutab Meili reindeksi. Struktuuri EI muuda (ainult toote-lingid) → SSoT/push/redeploy pole vaja.
 *
 * Käsk: node scripts/etapp1-move-undo.mjs <batch_id> [--dry]
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const REPO = "/opt/xlmarket-github";
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const batchId = argv.find((a) => !a.startsWith("--"));
const undoFile = `${REPO}/reports/backups/etapp1-undo-${batchId}.json`;
if (!batchId || !fs.existsSync(undoFile)) { console.error(`🔴 undo-fail puudub: ${undoFile}`); process.exit(1); }
const u = JSON.parse(fs.readFileSync(undoFile, "utf8"));

const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const MEDUSA = execSync("docker ps --format '{{.Names}}' | grep '^medusa-k33g' | head -1", { encoding: "utf8" }).trim();
const S = (s) => `'${String(s).replace(/'/g, "''")}'`;
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });

console.log(`🧯 UNDO ETAPP 1 batch=${u.batch_id} · ${u.products} toodet${DRY ? " [DRY]" : ""}`);
if (DRY) { console.log(`[DRY] taastaks ${u.moves.length} toote algse kategooria (to→from).`); process.exit(0); }

let sql = "BEGIN;\n";
for (const m of u.moves) sql += `UPDATE product_category_product SET product_category_id=${S(m.fromId)} WHERE product_id=${S(m.pid)} AND product_category_id=${S(m.toId)};\n`;
sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, status, affected, meta)
  VALUES ('claude-code-test','auto-judge-audit','pipeline','audit-move','undo','applied',
    ${S(JSON.stringify(u.moves.map((m) => m.pid)))}::jsonb, ${S(JSON.stringify({ batch_id: u.batch_id }))}::jsonb);\n`;
sql += "COMMIT;\n";
psqlTx(sql);
console.log(`✓ DB taastatud (${u.products} toodet algkategooriasse, undo logitud).`);

try { execSync(`docker exec ${MEDUSA} node /app/scripts/index-meilisearch.mjs`, { stdio: "inherit" }); }
catch (e) { console.log("ℹ️ Meili reindeks käsitsi: " + String(e.message).slice(0, 100)); }
console.log(`\n✅ UNDO valmis — batch ${u.batch_id}`);
