#!/usr/bin/env node
/**
 * en-master-dedupe-dualunit.mjs — DETERMINISTLIK tekst-pass (EI LLM) üle KÕIGI clean-toodete, mis
 *   kannavad duaalühiku-dubleerimist "M u (I)/M u" (addMetric vana jääk, 259+ toodet). Kasutab SSoT
 *   dedupeDualUnit (üks mehhanism, rule #5). Väärtus säilib — ohutu kosmeetika.
 *
 * Režiimid:  --dry (vaikimisi, ei kirjuta)   |   --execute (kirjutab DB + undo-audit)
 * Undo:      iga muudatuse ORIGINAAL salvestatakse reports/en-master-dedupe-undo-<ts>.json (rule #6/#8).
 * Stack-lukk (rule #9): ÄRA jooksuta re-cleani/backfilli ajal — mõlemad kirjutavad samu välju.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { dedupeDualUnit } from "./lib/en-master-clean.mjs";

const EXECUTE = process.argv.includes("--execute");
const DB = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("❌ db-k33g konteinerit ei leitud"); process.exit(1); }
const psql = (sql, input) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At`, {
  input: input ?? sql, encoding: "utf8", maxBuffer: 1 << 29,
}).trim();

// Kõik tooted, kus mõni clean-väli SISALDAB duaalühiku-jääki. Lai eelfilter SQL-is (kaldkriips + sulg),
// täpne tuvastus node-is (dedupeDualUnit muudab → erineb originaalist).
const PREFILTER = `p.metadata->>'title_en_clean' ~ '\\)\\s*/' OR p.metadata->>'description_en_clean' ~ '\\)\\s*/'
  OR p.metadata->>'title_en_clean' ~ '/\\s*[0-9].*\\(' OR p.metadata->>'description_en_clean' ~ '/\\s*[0-9].*\\('`;

const rows = JSON.parse(psql(`SELECT coalesce(json_agg(obj),'[]') FROM (
  SELECT json_build_object('id',p.id,'tc',p.metadata->>'title_en_clean','dc',p.metadata->>'description_en_clean') AS obj
  FROM product p
  WHERE p.metadata->>'title_en_clean' IS NOT NULL AND (${PREFILTER})
) s;`));

const changes = [];
for (const r of rows) {
  const tc2 = r.tc != null ? dedupeDualUnit(r.tc) : r.tc;
  const dc2 = r.dc != null ? dedupeDualUnit(r.dc) : r.dc;
  if (tc2 !== r.tc || dc2 !== r.dc) {
    changes.push({ id: r.id, tc_old: r.tc, tc_new: tc2, dc_old: r.dc, dc_new: dc2,
      tc_changed: tc2 !== r.tc, dc_changed: dc2 !== r.dc });
  }
}

console.log(`🔎 eelfilter: ${rows.length} kandidaati · tegelik dup-muutus: ${changes.length} toodet`);
for (const c of changes.slice(0, 8)) {
  if (c.tc_changed) console.log(`  [${c.id}] TITLE\n    - ${c.tc_old}\n    + ${c.tc_new}`);
  if (c.dc_changed) { const o = (c.dc_old||"").slice(0,180), n = (c.dc_new||"").slice(0,180);
    console.log(`  [${c.id}] DESC\n    - …${o}…\n    + …${n}…`); }
}
if (changes.length > 8) console.log(`  … +${changes.length - 8} veel`);

if (!EXECUTE) { console.log("\n🟡 DRY — ei kirjutanud. Käivita --execute'ga (väljaspool backfilli, quiet-aknas)."); process.exit(0); }

// --- EXECUTE: undo-audit enne kirjutust ---
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const undoPath = `/opt/xlmarket-github/reports/en-master-dedupe-undo-${ts}.json`;
fs.writeFileSync(undoPath, JSON.stringify({ ts, db: DB, count: changes.length,
  items: changes.map((c) => ({ id: c.id, tc_old: c.tc_old, dc_old: c.dc_old })) }, null, 2));
console.log(`\n💾 undo-audit: ${undoPath}`);

let done = 0;
for (const c of changes) {
  const sets = [];
  if (c.tc_changed) sets.push(`'{title_en_clean}', $$${c.tc_new}$$::jsonb`);
  if (c.dc_changed) sets.push(`'{description_en_clean}', $$${c.dc_new}$$::jsonb`);
  // jsonb_set ketis: tekst → jsonb string-väärtus (to_jsonb), mitte toor-jsonb
  let expr = "p.metadata";
  if (c.tc_changed) expr = `jsonb_set(${expr}, '{title_en_clean}', to_jsonb($$${c.tc_new}$$::text))`;
  if (c.dc_changed) expr = `jsonb_set(${expr}, '{description_en_clean}', to_jsonb($$${c.dc_new}$$::text))`;
  psql("", `UPDATE product p SET metadata = ${expr} WHERE p.id = '${c.id}';`);
  done++;
}
console.log(`✅ uuendatud: ${done} toodet. Undo: node scripts/en-master-dedupe-undo.mjs ${undoPath}`);
