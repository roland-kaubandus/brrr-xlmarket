#!/usr/bin/env node
// content-write.mjs — SISU-KIRJUTUSE SSoT (HARD RULE #5: sama write backfill + hook).
//
// Kirjutab generaatori väljundi product.metadata'sse TURVALISELT:
//   - BACKUP: jagatud tabel content_gen_backup_20260825 (vanad ET-väljad, ON CONFLICT DO NOTHING).
//   - IDEMPOTENT: content_gen_hash = hash(EN-allikas + generaatori-versioon). Re-run jätab
//     muutumatu-hash tooted vahele (WHERE hash IS DISTINCT FROM). Topelt-kirjutus võimatu.
//   - SELLING-POINT MAPPING: massiiv selling_points_et → selling_point_1_et..N_et (reader ootab
//     nummerdatud võtmeid, [route.ts]). Üle jäävad slotid (N+1..5) KUSTUTATAKSE (vana tõlke jääk maha).
//   - Kirjutab: title_et, description_et, selling_point_N_et, sanitized_rich_description_et.
//     EN baseline (product.title/description) EI muutu — jääb fallback'iks.

import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const GEN_VERSION = 'cg-v1';          // tõsta kui prompt/skeem oluliselt muutub → regen
export const BACKUP_TABLE = 'content_gen_backup_20260825';
const MAX_SP = 5;                             // reader loeb selling_point_1..5_et
const SP_KEYS = Array.from({ length: MAX_SP }, (_, i) => `selling_point_${i + 1}_et`);

// ---- DB helpers (dünaamiline konteineri-nimi) ----
export function dbContainer() {
  const names = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' });
  const c = names.split('\n').find(n => n.startsWith('db-k33g'));
  if (!c) throw new Error('db-k33g konteinerit ei leitud');
  return c.trim();
}
function runSqlFile(sqlText) {
  const c = dbContainer();
  const host = path.join(os.tmpdir(), `cg-write-${process.pid}-${Date.now()}.sql`);
  fs.writeFileSync(host, sqlText);
  try {
    execFileSync('docker', ['cp', host, `${c}:/tmp/cg-write.sql`], { stdio: 'pipe' });
    const out = execFileSync('docker', ['exec', '-i', c, 'psql', '-U', 'xlmarket', '-d', 'xlmarket',
      '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/cg-write.sql'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return out;
  } finally { try { fs.unlinkSync(host); } catch {} }
}
export function psqlJSON(sql) {
  // SQL stdin-ist (-f -) — väldib MAX_ARG_STRLEN (128KB) piiri suurte IN-loendite juures (18745 id).
  const c = dbContainer();
  const out = execFileSync('docker', ['exec', '-i', c, 'psql', '-U', 'xlmarket', '-d', 'xlmarket',
    '-tA', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { input: sql, encoding: 'utf8', maxBuffer: 768 * 1024 * 1024 });
  return out.split('\n').filter(Boolean).map(l => JSON.parse(l));
}

// ---- Allikas-hash (idempotentsus + stale-detection) ----
// EN-lähte-väljad, mille põhjal sisu genereeriti. Muutub allikas → hash muutub → regen.
export function sourceHash(product) {
  const parts = [
    product.title || '', product.description || '',
    product.sanitized_rich_description || '',
    typeof product.specs === 'string' ? product.specs : JSON.stringify(product.specs || ''),
    GEN_VERSION,
  ].join('');
  return crypto.createHash('sha256').update(parts).digest('hex').slice(0, 16);
}

// ---- Backup-tabel ----
export function ensureBackupTable() {
  runSqlFile(`CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} (
    id text PRIMARY KEY,
    old_title_et text,
    old_description_et text,
    old_selling_points jsonb,
    old_rich_et text,
    old_content_gen_hash text,
    backed_at timestamptz DEFAULT now()
  );`);
}

// ---- SQL-literal (standard_conforming_strings=on → ainult ' vajab doublimist) ----
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qJson = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'`;

// ---- content → metadata patch ----
export function buildPatch(product, content) {
  const patch = {
    title_et: content.title_et || '',
    description_et: content.description_et || '',
    sanitized_rich_description_et: content.sanitized_rich_description_et || '',
    content_gen_hash: sourceHash(product),
    content_gen_version: GEN_VERSION,
  };
  const sp = Array.isArray(content.selling_points_et) ? content.selling_points_et.slice(0, MAX_SP) : [];
  sp.forEach((s, i) => { patch[`selling_point_${i + 1}_et`] = String(s); });
  // slotid, mida uus sisu EI kata → kustuta (vana juuni-tõlke jääk maha)
  const delKeys = SP_KEYS.slice(sp.length);
  return { patch, delKeys };
}

// ---- Filtreeri: ainult tooted, mille hash on muutunud (idempotent skip) ----
// Sisend: [{id,...}]. Väljund: {toWrite:[...], skipped:n}. Loeb DB-st praeguse content_gen_hash.
export function filterNeedsGen(products) {
  if (!products.length) return { toWrite: [], skipped: 0 };
  const ids = products.map(p => p.id);
  const rows = psqlJSON(`SELECT json_build_object('id', id, 'h', metadata->>'content_gen_hash')
    FROM product WHERE id IN (${ids.map(q).join(',')});`);
  const cur = new Map(rows.map(r => [r.id, r.h]));
  const toWrite = [], seen = [];
  for (const p of products) {
    if (cur.get(p.id) === sourceHash(p)) seen.push(p); else toWrite.push(p);
  }
  return { toWrite, skipped: seen.length };
}

// ---- Kirjuta partii (üks transaktsioon: backup + idempotent UPDATE) ----
// records: [{product, content}]. execute=false → DRY (loe, ära kirjuta).
export function writeRecords(records, { execute = false } = {}) {
  const valid = records.filter(r => r.content && r.content.title_et);
  if (!valid.length) return { applied: 0, backedUp: 0, considered: 0 };
  ensureBackupTable();

  const ids = valid.map(r => r.product.id);
  const spArr = `ARRAY[${SP_KEYS.map(q).join(',')}]`;

  // VALUES-read: (id, patch_json, del_keys_json)
  const valuesRows = valid.map(r => {
    const { patch, delKeys } = buildPatch(r.product, r.content);
    return `(${q(r.product.id)}, ${qJson(patch)}::jsonb, ${qJson(delKeys)}::jsonb)`;
  }).join(',\n    ');

  const sql = `
BEGIN;
-- 1) BACKUP vanad ET-väljad (ainult read, mida veel EI ole backupitud)
INSERT INTO ${BACKUP_TABLE} (id, old_title_et, old_description_et, old_selling_points, old_rich_et, old_content_gen_hash)
SELECT p.id,
       p.metadata->>'title_et',
       p.metadata->>'description_et',
       (SELECT jsonb_object_agg(k, p.metadata->k) FROM unnest(${spArr}) AS k WHERE p.metadata ? k),
       p.metadata->>'sanitized_rich_description_et',
       p.metadata->>'content_gen_hash'
FROM product p WHERE p.id IN (${ids.map(q).join(',')})
ON CONFLICT (id) DO NOTHING;

-- 2) UPDATE: merge patch, kustuta üle-jäävad SP-slotid, idempotent hash-guard
WITH d(id, patch, del_keys) AS (VALUES
    ${valuesRows}
)
UPDATE product p
SET metadata = (
      (p.metadata || d.patch)
      - (SELECT COALESCE(array_agg(x), ARRAY[]::text[]) FROM jsonb_array_elements_text(d.del_keys) AS x)
    ),
    updated_at = now()
FROM d
WHERE p.id = d.id
  AND (p.metadata->>'content_gen_hash') IS DISTINCT FROM (d.patch->>'content_gen_hash');

${execute ? 'COMMIT;' : 'ROLLBACK;  -- DRY'}
`;
  const out = runSqlFile(sql);
  // psql väljastab "UPDATE N" rea
  const m = out.match(/UPDATE (\d+)/);
  const applied = m ? parseInt(m[1], 10) : 0;
  const bm = out.match(/INSERT 0 (\d+)/);
  return { applied, backedUp: bm ? parseInt(bm[1], 10) : 0, considered: valid.length, dry: !execute };
}
