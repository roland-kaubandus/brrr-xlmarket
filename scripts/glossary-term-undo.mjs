#!/usr/bin/env node
/**
 * glossary-term-undo.mjs — tühista glossary-termini batch (backfill VÕI öine hook) — HARD RULE #6 (undo kohustuslik).
 *
 * KASUTUS: node scripts/glossary-term-undo.mjs <batch_id> [--dry]
 *   Eemaldab batch'i terminid glossary.yaml-ist (en-match) + märgib ledgeri read undone.
 *   --dry = näita, mida eemaldaks, muutmata.
 *
 * Stack-lock (--execute-tee kirjutab yaml + DB).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GLOSSARY = `${REPO}/backend/src/data/glossary.yaml`;
const batchId = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!batchId || batchId.startsWith("--")) { console.error("Kasutus: node scripts/glossary-term-undo.mjs <batch_id> [--dry]"); process.exit(2); }

const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
let DB = getDB();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(1); }
const q = (sql) => { DB = getDB(); return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 }); };
const esc = (s) => (s == null ? "" : String(s)).replace(/'/g, "''");

(async () => {
  // taga undone-veerg ENNE lugemist (vana ledger võib olla ilma)
  q(`ALTER TABLE glossary_term_ledger ADD COLUMN IF NOT EXISTS undone boolean DEFAULT false;`);
  const rows = q(`SELECT en FROM glossary_term_ledger WHERE batch_id='${esc(batchId)}' AND coalesce(undone,false)=false`).trim();
  const ens = rows ? rows.split("\n").map((s) => s.trim()).filter(Boolean) : [];
  if (!ens.length) { console.log(`batch '${batchId}': 0 aktiivset terminit (juba undone või tundmatu batch)`); process.exit(0); }
  console.log(`batch '${batchId}': ${ens.length} terminit eemaldada:\n  ${ens.join(", ")}`);
  if (DRY) { console.log("🟡 DRY — muutmata"); process.exit(0); }

  const { withStackLock } = await import("./lib/stack-lock.mjs");
  await withStackLock({ holder: "glossary-term-undo", waitMs: 60000 }, async () => {
    // eemalda yaml-ist (iga en-i kirje: '- en: "X"' ja selle järgnevad sissejoonetud väljad kuni järgmise '- ' või tühja)
    let yaml = fs.readFileSync(GLOSSARY, "utf8");
    const enSet = new Set(ens.map((e) => e.toLowerCase()));
    const lines = yaml.split("\n");
    const out = []; let skipping = false;
    for (const line of lines) {
      const mEn = line.match(/^\s*-\s+en:\s*"(.*)"\s*$/);
      if (mEn) { skipping = enSet.has(mEn[1].toLowerCase()); if (skipping) continue; out.push(line); continue; }
      if (skipping) { if (/^\s+\S/.test(line)) continue; else skipping = false; }  // jäta sissejoonetud väljad vahele
      out.push(line);
    }
    fs.writeFileSync(GLOSSARY, out.join("\n"));
    q(`UPDATE glossary_term_ledger SET undone=true WHERE batch_id='${esc(batchId)}';`);
    console.log(`🟢 undo: ${ens.length} terminit eemaldatud glossary.yaml-ist + ledger märgitud undone (batch ${batchId}).`);
  });
  process.exit(0);
})().catch((e) => { console.error(`🔴 undo viga: ${e.message}`); process.exit(1); });
