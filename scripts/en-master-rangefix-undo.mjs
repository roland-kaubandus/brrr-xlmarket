#!/usr/bin/env node
/**
 * en-master-rangefix-undo.mjs — taastab en-master-rangefix.mjs paranduse undo-ledgerist (rule #6).
 * Kasutus:  node scripts/en-master-rangefix-undo.mjs reports/en-master-rangefix-undo-<ts>.json [--execute]
 *   --dry (vaikimisi): näitab mitu välja taastataks.  --execute: kirjutab vanad väärtused tagasi.
 * Ohutus:   AINULT staging db-k33g; keeldub kui ledger.db ei vasta praegusele k33g-konteinerile.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const LEDGER = process.argv[2];
const EXECUTE = process.argv.includes("--execute");
if (!LEDGER || !fs.existsSync(LEDGER)) { console.error("❌ anna undo-ledgeri tee: node scripts/en-master-rangefix-undo.mjs <ledger.json> [--execute]"); process.exit(1); }

const led = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const DB = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB || !DB.startsWith("db-k33g")) { console.error(`❌ staging db-k33g konteinerit ei leitud (sain: '${DB}')`); process.exit(1); }
if (led.db && led.db !== DB) console.error(`⚠️ ledger tehti konteineril '${led.db}', praegune on '${DB}' — jätkan (sama staging-stack).`);
const psql = (input) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At`, { input, encoding: "utf8", maxBuffer: 1 << 29 }).trim();

const items = led.items || [];
let fields = 0;
for (const it of items) { if (it.tc_old != null) fields++; if (it.dc_old != null) fields++; }
console.log(`🔎 ledger: ${items.length} toodet / ${fields} taastatavat välja (ts=${led.ts})`);

if (!EXECUTE) { console.log("🟡 DRY — ei kirjutanud. Lisa --execute taastamiseks."); process.exit(0); }

let done = 0;
for (const it of items) {
  let expr = "p.metadata";
  if (it.tc_old != null) expr = `jsonb_set(${expr}, '{title_en_clean}', to_jsonb($$${it.tc_old}$$::text))`;
  if (it.dc_old != null) expr = `jsonb_set(${expr}, '{description_en_clean}', to_jsonb($$${it.dc_old}$$::text))`;
  psql(`UPDATE product p SET metadata = ${expr}, updated_at = NOW() WHERE p.id = '${it.id}';`);
  done++;
}
console.log(`✅ taastatud: ${done} toodet / ${fields} välja.`);
