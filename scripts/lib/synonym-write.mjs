#!/usr/bin/env node
/**
 * synonym-write.mjs — SÜNONÜÜMI-KIRJUTUSE SSoT (HARD RULE #5: sama write backfill + hook).
 *
 * Kirjutab buildRows väljundi:
 *   - AUTO (conf ≥ 0.85 & !review) → product_synonym (word/synonyms/variants/lang/gen_version/confidence).
 *     Reader (backend/scripts/sync-synonyms.mjs) sünkib need Meili synonyms'i.
 *   - REVIEW (alla lävi)           → synonym_review (status='pending', propose-not-create → INIMENE).
 *
 * TURVALISUS:
 *   - BACKUP: synonym_gen_backup (vanad product_synonym read jsonb, ON CONFLICT DO NOTHING) enne DELETE.
 *   - PER-PRODUCT REPLACE: DELETE product_synonym WHERE product_id IN (...) AND lang='et' → INSERT.
 *     Puhas asendus (vana juuni-kvaliteet maha), topelt-read võimatud.
 *   - Üks transaktsioon partii kohta (BEGIN/COMMIT, DRY → ROLLBACK).
 *
 * SCHEMA-migratsioon (ensureSchema, idempotentne): product_synonym ADD variants/gen_version/confidence;
 *   CREATE synonym_review; CREATE synonym_gen_backup.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SG_VERSION } from "./synonym-gen.mjs";

export const REVIEW_TABLE = "synonym_review";
export const BACKUP_TABLE = "synonym_gen_backup";

// ── DB-konteiner (dünaamiline) ────────────────────────────────────────────────
export function dbContainer() {
  const names = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  const c = names.split("\n").find((n) => n.startsWith("db-k33g"));
  if (!c) throw new Error("db-k33g konteinerit ei leitud");
  return c.trim();
}
function runSqlFile(sqlText) {
  const c = dbContainer();
  const host = path.join(os.tmpdir(), `sg-write-${process.pid}-${Date.now()}.sql`);
  fs.writeFileSync(host, sqlText);
  try {
    execFileSync("docker", ["cp", host, `${c}:/tmp/sg-write.sql`], { stdio: "pipe" });
    return execFileSync("docker", ["exec", "-i", c, "psql", "-U", "xlmarket", "-d", "xlmarket",
      "-v", "ON_ERROR_STOP=1", "-f", "/tmp/sg-write.sql"], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
  } finally { try { fs.unlinkSync(host); } catch {} }
}
export function psqlJSON(sql) {
  const c = dbContainer();
  const out = execFileSync("docker", ["exec", "-i", c, "psql", "-U", "xlmarket", "-d", "xlmarket",
    "-tA", "-v", "ON_ERROR_STOP=1", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  return out.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

// ── SQL-literalid (standard_conforming_strings=on → ainult ' vajab doublimist) ──
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => `ARRAY[${(a || []).map(q).join(",")}]::text[]`;

// ── Schema (idempotentne) ─────────────────────────────────────────────────────
export function ensureSchema() {
  runSqlFile(`
ALTER TABLE product_synonym ADD COLUMN IF NOT EXISTS variants    text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE product_synonym ADD COLUMN IF NOT EXISTS gen_version text;
ALTER TABLE product_synonym ADD COLUMN IF NOT EXISTS confidence  numeric;

CREATE TABLE IF NOT EXISTS ${REVIEW_TABLE} (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  text NOT NULL,
  word        text NOT NULL,
  synonyms    text[] NOT NULL DEFAULT '{}'::text[],
  variants    text[] NOT NULL DEFAULT '{}'::text[],
  confidence  numeric,
  reason      text,
  lang        text NOT NULL DEFAULT 'et',
  status      text NOT NULL DEFAULT 'pending',
  gen_version text,
  created_at  timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ${REVIEW_TABLE}_uniq ON ${REVIEW_TABLE} (product_id, word, lang);

CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} (
  product_id text PRIMARY KEY,
  old_rows   jsonb,
  backed_at  timestamptz DEFAULT now()
);`);
}

/**
 * writeSynonyms — kirjuta partii read. records: [{ product_id, auto:[...], review:[...] }].
 *   execute=false → DRY (ROLLBACK). Tagastab { autoWritten, reviewWritten, products, dry }.
 */
export function writeSynonyms(records, { execute = false } = {}) {
  const withRows = records.filter((r) => (r.auto && r.auto.length) || (r.review && r.review.length));
  if (!withRows.length) return { autoWritten: 0, reviewWritten: 0, products: 0, dry: !execute };
  ensureSchema();

  const pids = [...new Set(withRows.map((r) => r.product_id))];

  const autoValues = [];
  const reviewValues = [];
  for (const r of withRows) {
    for (const a of (r.auto || [])) {
      autoValues.push(`(${q(r.product_id)}, ${q(a.word)}, ${arr(a.synonyms)}, ${arr(a.variants)}, 'et', ${q(SG_VERSION)}, ${a.confidence == null ? "NULL" : a.confidence})`);
    }
    for (const rv of (r.review || [])) {
      reviewValues.push(`(${q(r.product_id)}, ${q(rv.word)}, ${arr(rv.synonyms)}, ${arr(rv.variants)}, ${rv.confidence == null ? "NULL" : rv.confidence}, ${q(rv.reason || "")}, 'et', 'pending', ${q(SG_VERSION)})`);
    }
  }

  // product_synonym'il POLE unique-indeksit → EI kasuta ON CONFLICT. Per-product DELETE (samm 2)
  // eemaldas selle toote read ENNE → plain INSERT on konflikti-vaba (buildRows dedup'ib sõnad).
  const autoInsert = autoValues.length ? `
INSERT INTO product_synonym (product_id, word, synonyms, variants, lang, gen_version, confidence)
VALUES
    ${autoValues.join(",\n    ")};` : "-- (auto-ridu pole)";

  const reviewInsert = reviewValues.length ? `
INSERT INTO ${REVIEW_TABLE} (product_id, word, synonyms, variants, confidence, reason, lang, status, gen_version)
VALUES
    ${reviewValues.join(",\n    ")}
ON CONFLICT (product_id, word, lang) DO UPDATE
  SET synonyms = EXCLUDED.synonyms, variants = EXCLUDED.variants,
      confidence = EXCLUDED.confidence, reason = EXCLUDED.reason,
      status = 'pending', gen_version = EXCLUDED.gen_version;` : `-- (review-ridu pole)`;

  const sql = `
BEGIN;
-- 1) BACKUP vanad product_synonym read (per toode, ainult esimest korda)
INSERT INTO ${BACKUP_TABLE} (product_id, old_rows)
SELECT product_id, jsonb_agg(to_jsonb(ps) ORDER BY word)
FROM product_synonym ps
WHERE product_id IN (${pids.map(q).join(",")})
GROUP BY product_id
ON CONFLICT (product_id) DO NOTHING;

-- 2) PER-PRODUCT REPLACE: kustuta selle toote ET-read (puhas asendus)
DELETE FROM product_synonym WHERE product_id IN (${pids.map(q).join(",")}) AND lang = 'et';

-- 3) AUTO read → product_synonym (→ Meili)
${autoInsert}

-- 4) REVIEW read → synonym_review (propose-not-create)
${reviewInsert}

${execute ? "COMMIT;" : "ROLLBACK;  -- DRY"}
`;
  runSqlFile(sql);
  return { autoWritten: autoValues.length, reviewWritten: reviewValues.length, products: pids.length, dry: !execute };
}
