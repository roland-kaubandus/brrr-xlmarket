#!/usr/bin/env node
/**
 * en-master-undo.mjs — pööra tagasi EN-master puhastuse backfill-partii (HARD RULE #6: iga auto-tegu = undo).
 *
 * Loeb reports/en-master-batches/<batch_id>.json (ledger.prev) ja taastab IGA puudutatud toote metadata:
 *   • prev.tc == null → EEMALDA metadata.title_en_clean       (väli ei olnud enne olemas)
 *     prev.tc != null → taasta endine title_en_clean
 *   • prev.dc samamoodi description_en_clean kohta.
 * Raw title/description POLNUD KUNAGI PUUDUTATUD → ei vaja taastamist.
 *
 * Stack-lukk (DB-write, HARD RULE #9), transaktsioon. --dry = näita, ära kirjuta.
 *
 * Käsk: node scripts/en-master-undo.mjs <batch_id> [--dry]
 *       node scripts/en-master-undo.mjs --file reports/en-master-batches/<id>.json [--dry]
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { acquireStackLock } from "./lib/stack-lock.mjs";

const REPO = "/opt/xlmarket-github";
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const fileIdx = argv.indexOf("--file");
const fileArg = fileIdx >= 0 ? argv[fileIdx + 1] : null;   // ainult kui --file ANTUD (muidu null, mitte argv[0])
const fileValIdx = fileIdx >= 0 ? fileIdx + 1 : -1;   // --file väärtuse indeks (või -1)
const batchId = argv.find((a, i) => !a.startsWith("--") && i !== fileValIdx);
const ledgerFile = fileArg ? fileArg : `${REPO}/reports/en-master-batches/${batchId}.json`;
if (!fs.existsSync(ledgerFile)) { console.error(`🔴 ledger puudub: ${ledgerFile}`); process.exit(1); }
const L = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
const prev = L.prev || {};
const ids = Object.keys(prev);
console.log(`🧯 EN-master UNDO batch=${L.batch_id} · ${ids.length} toodet${DRY ? " [DRY]" : ""}`);
if (!ids.length) { console.log("midagi tagasi pöörata (prev tühi — DRY-jooks?)"); process.exit(0); }

const DB = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const sq = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;

const stmts = [];
let rm = 0, rest = 0;
for (const id of ids) {
  const p = prev[id];
  // title_en_clean
  const tSet = (p.tc == null)
    ? `metadata = metadata - 'title_en_clean'`
    : `metadata = jsonb_set(metadata,'{title_en_clean}', to_jsonb(${sq(p.tc)}::text), true)`;
  // description_en_clean (ahelda järgmisele)
  const dSet = (p.dc == null)
    ? `metadata = metadata - 'description_en_clean'`
    : `metadata = jsonb_set(metadata,'{description_en_clean}', to_jsonb(${sq(p.dc)}::text), true)`;
  // kaks eraldi UPDATE-t (loetavus; sama transaktsioon)
  stmts.push(`UPDATE product SET ${tSet} WHERE id=${sq(id)};`);
  stmts.push(`UPDATE product SET ${dSet}, updated_at=NOW() WHERE id=${sq(id)};`);
  // base-väljad (Tarmo #1 arhitektuur) — ainult kui ledger neid kannab (vanad partiid ei kirjutanud base'i)
  if ("tb" in p) {
    const tbSet = (p.tb == null) ? `metadata = metadata - 'title_en_base'`
      : `metadata = jsonb_set(metadata,'{title_en_base}', to_jsonb(${sq(p.tb)}::text), true)`;
    const dbSet = (p.db == null) ? `metadata = metadata - 'description_en_base'`
      : `metadata = jsonb_set(metadata,'{description_en_base}', to_jsonb(${sq(p.db)}::text), true)`;
    stmts.push(`UPDATE product SET ${tbSet} WHERE id=${sq(id)};`);
    stmts.push(`UPDATE product SET ${dbSet}, updated_at=NOW() WHERE id=${sq(id)};`);
  }
  if (p.tc == null && p.dc == null) rm++; else rest++;
}
console.log(`  eemalda (väli puudus enne): ${rm} · taasta endine väärtus: ${rest}`);
if (DRY) { console.log("[DRY] ei kirjuta. Esimesed laused:\n" + stmts.slice(0, 4).join("\n")); process.exit(0); }

const release = acquireStackLock({ holder: "en-master-undo", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 120_000 });
try {
  execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -v ON_ERROR_STOP=1 --single-transaction`,
    { input: stmts.join("\n"), stdio: ["pipe", "inherit", "inherit"] });
  console.log(`✅ UNDO valmis (${stmts.length} lauset). NB: jooksuta Meili-reindeks, et otsing kajastaks.`);
} finally { release(); }
