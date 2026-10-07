#!/usr/bin/env node
/**
 * etapp1-move-execute.mjs — AUDITI PARANDUS ETAPP 1: ohutud toote-liigutused.
 *
 * Allikas: scratchpad/etapp1-moveset.json (0 API-kutset — ehitatud audit-decisions'ist).
 * Iga liigutus = puhas relink product_category_product (iga toode täpselt ÜHES kategoorias).
 *
 *   1. backup BEFORE-seis → reports/backups/etapp1-undo-<batch_id>.json (gitignore'is)
 *   2. üks batch_id, üks transaktsioon: UPDATE pcp (from→to, guard product_category_id=from)
 *   3. review_decision_log rida/klaster (actor_detail='auto-judge-audit', channel='pipeline', action='move')
 *   4. undo: node scripts/etapp1-move-undo.mjs <batch_id>
 *
 * Käsk: node scripts/etapp1-move-execute.mjs [--dry]
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const REPO = "/opt/xlmarket-github";
const SP = "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const DRY = process.argv.includes("--dry");
const MS = JSON.parse(fs.readFileSync(SP + "/etapp1-moveset.json", "utf8"));

const BATCH_ID = process.env.BATCH_ID || ("e1-" + new Date().toISOString().replace(/:/g, "").replace(/\..+/, "").replace("T", "T"));
const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }
const S = (s) => `'${String(s).replace(/'/g, "''")}'`;
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });

// ── 1. BACKUP (before-seis: pid → from_cat_id) + undo-fail ──
const undoMoves = [];
for (const cl of MS.moveset) for (const p of cl.products) undoMoves.push({ pid: p.pid, fromId: cl.fromId, toId: cl.toId });
const undoFile = `${REPO}/reports/backups/etapp1-undo-${BATCH_ID}.json`;
fs.mkdirSync(`${REPO}/reports/backups`, { recursive: true });
fs.writeFileSync(undoFile, JSON.stringify({ batch_id: BATCH_ID, generated_at: new Date().toISOString(),
  clusters: MS.moveset.length, products: undoMoves.length, moves: undoMoves }, null, 1));

// ── 2. MIGRATE SQL (üks transaktsioon) ──
let sql = "BEGIN;\n";
// liiguta (grupeeri from→to paari kaupa klastri sees)
for (const cl of MS.moveset) {
  const pids = cl.products.map((p) => S(p.pid)).join(",");
  sql += `UPDATE product_category_product SET product_category_id=${S(cl.toId)} WHERE product_id IN (${pids}) AND product_category_id=${S(cl.fromId)};\n`;
}
// log (rida/klaster)
for (const cl of MS.moveset) {
  const ids = cl.products.map((p) => p.pid);
  const meta = { batch_id: BATCH_ID, ck: cl.ck, from_handle: cl.from, to_handle: cl.to, rule: cl.rule,
    cross_main: cl.crossMain, resolved_by: cl.resolvedBy, moved: cl.moved };
  sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, target_handle, status, affected, meta)
    VALUES ('claude-code-test','auto-judge-audit','pipeline','audit-move','move',${S(cl.ck)},${S(cl.to)},'applied',
      ${S(JSON.stringify(ids))}::jsonb, ${S(JSON.stringify(meta))}::jsonb);\n`;
}
sql += "COMMIT;\n";
const migrateFile = `${SP}/etapp1-migrate-${BATCH_ID}.sql`;
fs.writeFileSync(migrateFile, sql);

console.log(`ETAPP 1 MOVE${DRY ? " [DRY]" : ""} · batch=${BATCH_ID}`);
console.log(`  klastreid: ${MS.moveset.length} · tooteid: ${undoMoves.length}`);
console.log(`  backup: ${undoFile.replace(REPO + "/", "")}`);
console.log(`  migrate: ${migrateFile}`);

if (DRY) { console.log(`\n[DRY] SQL kirjutatud, EI rakendatud. Esimesed read:\n` + sql.split("\n").slice(0, 4).join("\n")); process.exit(0); }

// ── 3. RAKENDA ──
psqlTx(sql);
console.log(`\n✅ RAKENDATUD: ${undoMoves.length} toodet liigutatud, ${MS.moveset.length} log-rida (batch ${BATCH_ID}).`);
console.log(`   undo: node scripts/etapp1-move-undo.mjs ${BATCH_ID}`);
// jäta batch_id faili järgmistele sammudele
fs.writeFileSync(SP + "/etapp1-last-batch.txt", BATCH_ID);
