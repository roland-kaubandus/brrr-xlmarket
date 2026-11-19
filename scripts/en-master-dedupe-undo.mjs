#!/usr/bin/env node
/**
 * en-master-dedupe-undo.mjs — taasta en-master-dedupe-dualunit.mjs --execute originaalväärtused.
 * Kasutus: node scripts/en-master-dedupe-undo.mjs reports/en-master-dedupe-undo-<ts>.json
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const auditPath = process.argv[2];
if (!auditPath || !fs.existsSync(auditPath)) { console.error("❌ anna undo-audit JSON tee"); process.exit(1); }
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const DB = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("❌ db-k33g konteinerit ei leitud"); process.exit(1); }
const psql = (input) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At`, { input, encoding: "utf8", maxBuffer: 1 << 29 }).trim();

let done = 0;
for (const it of audit.items) {
  let expr = "p.metadata";
  if (it.tc_old != null) expr = `jsonb_set(${expr}, '{title_en_clean}', to_jsonb($$${it.tc_old}$$::text))`;
  if (it.dc_old != null) expr = `jsonb_set(${expr}, '{description_en_clean}', to_jsonb($$${it.dc_old}$$::text))`;
  psql(`UPDATE product p SET metadata = ${expr} WHERE p.id = '${it.id}';`);
  done++;
}
console.log(`↩️  taastatud ${done}/${audit.items.length} toodet (audit ${auditPath})`);
