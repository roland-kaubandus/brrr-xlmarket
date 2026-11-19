#!/usr/bin/env node
/**
 * en-master-remetric.mjs — DETERMINISTLIK addMetric ümberjooks salvestatud LLM-BAASILT (Tarmo 2026-11-19 #1).
 *
 * Arhitektuur: backfill salvestab `metadata.title_en_base` / `description_en_base` = LLM-tekst ENNE addMetric-it.
 *   addMetric on PUHAS funktsioon baas → clean. Kui addMetric-it parandatakse (uus ühiku-reegel, värava-parandus),
 *   EI ole vaja LLM-i uuesti kutsuda — jooksuta see skript: võtab base, rakendab UUE addMetric, kirjutab clean.
 *
 * Iga tulemus läbib metricGate (ebasidus → EI kirjuta + Telegram-signaal). Muudab AINULT *_en_clean; base ja
 * raw title/description JÄÄVAD. --dry (vaikimisi) näitab; --execute kirjutab + undo-ledger (rule #6/#8).
 * Ohutus: AINULT staging db-k33g; stack-lukk (#9); keeldub vaikuse-aknas 02:45–04:30 EET.
 *
 * Käsk:  node scripts/en-master-remetric.mjs [--execute] [--limit N] [--ids a,b,c]
 * Undo:  node scripts/en-master-undo.mjs --file <remetric-undo-ledger> ... (vt väljund)
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { addMetric, metricGate } from "./lib/en-master-clean.mjs";
import { acquireStackLock } from "./lib/stack-lock.mjs";
import { sendTelegram } from "./lib/spend-guard.mjs";

const REPO = "/opt/xlmarket-github";
const argv = process.argv.slice(2);
const EXECUTE = argv.includes("--execute");
const limIdx = argv.indexOf("--limit");
const LIMIT = limIdx >= 0 ? parseInt(argv[limIdx + 1], 10) : 0;
const idsIdx = argv.indexOf("--ids");
const ONLY_IDS = idsIdx >= 0 ? argv[idsIdx + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;

// ── DB: AINULT staging k33g (ei tohi kunagi puutuda prod uo28) ──
const DB = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB || !DB.startsWith("db-k33g")) { console.error(`❌ staging db-k33g konteinerit ei leitud (sain: '${DB}')`); process.exit(1); }
const psql = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At`, { input: sql, encoding: "utf8", maxBuffer: 1 << 29 }).trim();
const sq = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;

// ── vaikuse-akna kontroll (Tarmo: väljaspool 02:45–04:30 EET) ──
function inQuietWindow() {
  const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Tallinn" }));
  const mins = h.getHours() * 60 + h.getMinutes();
  return mins >= (2 * 60 + 45) && mins < (4 * 60 + 30);
}
if (EXECUTE && inQuietWindow()) { console.error("❌ vaikuse-aken 02:45–04:30 EET — DB-kirjutus keelatud (stack-lukk)"); process.exit(1); }

// ── kandidaadid: base olemas (vähemalt üks väli) ──
const idFilter = ONLY_IDS ? `AND p.id = ANY(string_to_array(${sq(ONLY_IDS.join(","))},','))` : "";
const limSql = LIMIT > 0 ? `LIMIT ${LIMIT}` : "";
const rows = JSON.parse(psql(`SELECT coalesce(json_agg(obj),'[]') FROM (
  SELECT json_build_object('id',p.id,
    'tb',p.metadata->>'title_en_base','db',p.metadata->>'description_en_base',
    'tc',p.metadata->>'title_en_clean','dc',p.metadata->>'description_en_clean') AS obj
  FROM product p
  WHERE (p.metadata->>'title_en_base' IS NOT NULL OR p.metadata->>'description_en_base' IS NOT NULL) ${idFilter}
  ${limSql}
) s;`));

const changes = []; const gated = [];
for (const r of rows) {
  // UUS addMetric puhtalt baasilt (ILMA LLM-ita)
  const nc = {
    title_en_clean: r.tb != null ? addMetric(r.tb, new Set()) : r.tc,
    description_en_clean: r.db != null ? addMetric(r.db, new Set()) : r.dc,
  };
  // VÄRAV tulemusel — ebasidus → EI kirjuta
  const g = metricGate(nc);
  if (!g.pass) { gated.push({ id: r.id, offenders: g.offenders.slice(0, 3) }); continue; }
  const tChanged = r.tb != null && nc.title_en_clean !== (r.tc ?? "");
  const dChanged = r.db != null && nc.description_en_clean !== (r.dc ?? "");
  if (!tChanged && !dChanged) continue; // juba ajakohane → jäta
  changes.push({ id: r.id, tc_old: r.tc ?? null, dc_old: r.dc ?? null,
    tc_new: tChanged ? nc.title_en_clean : null, dc_new: dChanged ? nc.description_en_clean : null });
}

const fields = changes.reduce((n, c) => n + (c.tc_new != null ? 1 : 0) + (c.dc_new != null ? 1 : 0), 0);
console.log(`🔎 base-kandidaadid: ${rows.length} · ümberjooks muudab: ${changes.length} toodet / ${fields} välja · VÄRAV skip (ebasidus): ${gated.length}`);
for (const c of changes.slice(0, 8)) {
  if (c.tc_new != null) console.log(`  [${c.id}] TITLE\n    - ${c.tc_old}\n    + ${c.tc_new}`);
  if (c.dc_new != null) console.log(`  [${c.id}] DESC (muudetud)`);
}
if (changes.length > 8) console.log(`  … +${changes.length - 8} veel`);
if (gated.length) { console.log("\n⚠️ VÄRAV skip (EI kirjutata — ebasidus peale ümberjooksu, vajab käsitsi/LLM):");
  for (const x of gated.slice(0, 20)) console.log(`  [${x.id}] ${x.offenders[0]}`); }

if (!EXECUTE) { console.log(`\n🟡 DRY — ei kirjutanud. Käivita: node scripts/en-master-remetric.mjs --execute`); process.exit(0); }
if (!changes.length) { console.log("\n✓ midagi uuendada pole (kõik clean juba = uus addMetric(base))."); process.exit(0); }

// ── EXECUTE: stack-lukk + undo-ledger enne kirjutust ──
const release = acquireStackLock({ holder: "en-master-remetric", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 120_000 });
try {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const undoPath = `${REPO}/reports/en-master-remetric-undo-${ts}.json`;
  // undo-ledger en-master-undo formaadis (prev.tc/dc); base EI muutu → tb/db väljajäetud (undo ei puutu base'i)
  const prev = {};
  for (const c of changes) prev[c.id] = { tc: c.tc_old, dc: c.dc_old };
  fs.writeFileSync(undoPath, JSON.stringify({ batch_id: `remetric-${ts}`, db: DB, count: changes.length, prev }, null, 2));
  console.log(`\n💾 undo-ledger: ${undoPath}`);

  const stmts = [];
  for (const c of changes) {
    let expr = "metadata";
    if (c.tc_new != null) expr = `jsonb_set(${expr},'{title_en_clean}', to_jsonb(${sq(c.tc_new)}::text), true)`;
    if (c.dc_new != null) expr = `jsonb_set(${expr},'{description_en_clean}', to_jsonb(${sq(c.dc_new)}::text), true)`;
    stmts.push(`UPDATE product SET metadata = ${expr}, updated_at = NOW() WHERE id = ${sq(c.id)};`);
  }
  execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -v ON_ERROR_STOP=1 --single-transaction`,
    { input: stmts.join("\n"), stdio: ["pipe", "inherit", "inherit"] });
  const msg = `✅ EN-master remetric · ${changes.length} toodet / ${fields} välja (deterministlik, base→addMetric). Undo: node scripts/en-master-undo.mjs --file ${undoPath}`;
  console.log(msg);
  if (gated.length) { const gm = `⚠️ EN-master remetric: ${gated.length} toodet VÄRAV-skip (ebasidus peale ümberjooksu)`; console.error(gm); sendTelegram(gm); }
  console.log("NB: jooksuta Meili-reindeks, et EN-otsing kajastaks.");
} finally { release(); }
