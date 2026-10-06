#!/usr/bin/env node
/**
 * synonym-backfill-undo.mjs — võta tagasi synonym-backfill --execute partii (A4, täielik tagasivõetavus).
 *
 * Kasutus: node scripts/synonym-backfill-undo.mjs <batch_id>
 *   - kustutab product_synonym read, mis see partii lisas (gen_version='auto-judge-consensus',
 *     ainult affected.consensus_ok (product_id,word) paarid → ei puutu varem-olnud/muid ridu)
 *   - taastab synonym_review.status='pending' kõigil partii puudutatud kirjetel
 *   - märgib review_decision_log rea undone_at=now, undone_by='auto-judge', status='undone'
 */
import { execSync } from "node:child_process";

const BATCH_ID = process.argv[2];
if (!BATCH_ID) { console.error("Kasutus: node scripts/synonym-backfill-undo.mjs <batch_id>"); process.exit(2); }

const db = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const q = (sql) => execSync(`docker exec -i ${db} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
const sqlLit = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const rows = q(`SELECT affected::text FROM review_decision_log
  WHERE channel='pipeline' AND bucket_type='synonym' AND concept_key=${sqlLit(BATCH_ID)} AND status='applied'
  ORDER BY id DESC LIMIT 1;`).trim();
if (!rows) { console.error(`Partiid ei leitud (või juba tagasivõetud): ${BATCH_ID}`); process.exit(1); }
const aff = JSON.parse(rows.split("\n").find((l) => l.startsWith("{")));
const ok = aff.consensus_ok || [];
const allIds = [...ok.map((r) => r.synonym_review_id), ...(aff.rejected || []), ...(aff.safe_default || [])];

// product_synonym kustutus: ainult need (product_id,word) paarid, mida partii lisas, gen_version-filtriga
const delPairs = ok.map((r) => `(product_id=${sqlLit(r.product_id)} AND word=${sqlLit(r.word)})`).join(" OR ");
const delSql = ok.length ? `DELETE FROM product_synonym WHERE gen_version='auto-judge-consensus' AND lang='et' AND (${delPairs});` : "-- (lisatud ridu polnud)";
const revertSql = allIds.length ? `UPDATE synonym_review SET status='pending' WHERE id IN (${allIds.map(sqlLit).join(",")});` : "";

const out = q(`BEGIN;
${delSql}
${revertSql}
UPDATE review_decision_log SET undone_at=now(), undone_by='auto-judge', status='undone'
  WHERE channel='pipeline' AND bucket_type='synonym' AND concept_key=${sqlLit(BATCH_ID)} AND status='applied';
SELECT 'deleted_synonyms', (SELECT count(*) FROM product_synonym WHERE gen_version='auto-judge-consensus' AND lang='et' AND ${ok.length ? `(${delPairs})` : "false"});
COMMIT;`);
console.log(`✅ Tagasivõetud batch_id=${BATCH_ID}: product_synonym -${ok.length} (max) · synonym_review→pending ${allIds.length} · log→undone`);
console.log(out.trim());
console.log(`⚠️ Meili: jooksuta sync-synonyms uuesti, et otsing kajastaks tagasivõttu.`);
