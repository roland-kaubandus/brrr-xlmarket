#!/usr/bin/env node
/**
 * en-master-rangefix.mjs — DETERMINISTLIK parandus (EI LLM) osalise vahemiku-teisenduse ebasidususele,
 *   mille addMetric vana versioon tekitas (nt "28–81.3 cm (32 inch)", "34.8 to 123 cm (48.4 inches)",
 *   "23 to 7.32 m (24 feet)"). Rekonstrueerib originaal-imperiaal-vahemiku "A sep C Uimp" (A = paljas
 *   imperiaal-madal, C = sulu imperiaal-kõrge) ja laseb läbi SSoT addMetric (uus aatomne vahemiku-loogika,
 *   üks mehhanism — rule #5). Iga parandus VERIFITSEERITAKSE: tulemus peab läbima rangeCoherenceGate
 *   (sidus) JA mõlemad imperiaal-otsad peavad olema allikas numbritena (allika-tõestus) — muidu EI kirjuta.
 *
 * Režiimid:  --dry (vaikimisi)  |  --execute (kirjutab DB + undo-ledger)
 * Undo:      reports/en-master-rangefix-undo-<ts>.json (rule #6/#8) → node scripts/en-master-rangefix-undo.mjs <fail>
 * Ohutus:    AINULT staging db-k33g (nime-kontroll); stack-lukk (rule #9); keeldub vaikuse-aknas 02:45–04:30 EET.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import {
  addMetric, rangeCoherenceOffenders, rangeCoherenceGate, sourceCorpus, numSet,
} from "./lib/en-master-clean.mjs";
import { acquireStackLock } from "./lib/stack-lock.mjs";

const EXECUTE = process.argv.includes("--execute");

// ── DB: AINULT staging k33g (ei tohi kunagi puutuda prod uo28) ──
const DB = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB || !DB.startsWith("db-k33g")) { console.error(`❌ staging db-k33g konteinerit ei leitud (sain: '${DB}')`); process.exit(1); }
const psql = (sql, input) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At`, {
  input: input ?? sql, encoding: "utf8", maxBuffer: 1 << 29,
}).trim();

// ── vaikuse-akna kontroll (Tarmo: väljaspool 02:45–04:30 EET) ──
function inQuietWindow() {
  const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Tallinn" }));
  const mins = h.getHours() * 60 + h.getMinutes();
  return mins >= (2 * 60 + 45) && mins < (4 * 60 + 30);
}
if (EXECUTE && inQuietWindow()) { console.error("❌ vaikuse-aken 02:45–04:30 EET — DB-kirjutus keelatud (stack-lukk)"); process.exit(1); }

// ── rekonstruktsioon: ebasidus "A SEP B (cm/mm/m) (…üksik imperiaal…)" → originaal "A SEP C Uimp" ──
const NUM = `\\d+(?:[.,]\\d+)?`;
const SEP = `(?:\\s*[-–—]\\s*|\\s+to\\s+)`;
const INCO = new RegExp(`(${NUM})(${SEP})(${NUM})\\s*(?:cm|mm|m)\\b\\s*\\(([^)]*)\\)`, "gi");
const countNums = (s) => (s.match(/\d+(?:[.,]\d+)?/g) || []).length;
const normNumCmp = (x) => String(Number(String(x).replace(",", ".")));

function reconstruct(text) {
  return String(text).replace(INCO, (full, A, sepRaw, _B, paren) => {
    const parenImp = /inch|inches|\bin\b|ft|feet|foot|["″]/i.test(paren);
    if (!parenImp || countNums(paren) !== 1) return full; // mitte osalise-teisenduse muster → jäta
    const C = (paren.match(/\d+(?:[.,]\d+)?/) || [])[0];
    const U = (paren.match(/inches|inch|feet|foot|ft|in|″|"/i) || [])[0];
    if (!C || !U) return full;
    const sep = /[-–—]/.test(sepRaw) ? sepRaw.match(/[-–—]/)[0] : " to ";
    return `${A}${sep}${C} ${U}`;
  });
}
// kogu kandidaadi imperiaal-otsad (A & C) allika-tõestuseks
function imperialEnds(text) {
  const ends = []; let m; INCO.lastIndex = 0;
  while ((m = INCO.exec(String(text)))) {
    const paren = m[4];
    if (!(/inch|inches|\bin\b|ft|feet|foot|["″]/i.test(paren) && countNums(paren) === 1)) continue;
    const C = (paren.match(/\d+(?:[.,]\d+)?/) || [])[0];
    ends.push(m[1], C);
  }
  return ends;
}

// ── kandidaadid: kõik clean-tooted, kus mõni väli SISALDAB osalise-teisenduse jääki (lai SQL-eelfilter) ──
const PREFILTER = `p.metadata->>'title_en_clean' ~ '[0-9]\\s*(-|–|—| to )\\s*[0-9.]+\\s*(cm|mm|m)\\s*\\('
  OR p.metadata->>'description_en_clean' ~ '[0-9]\\s*(-|–|—| to )\\s*[0-9.]+\\s*(cm|mm|m)\\s*\\('`;
const rows = JSON.parse(psql(`SELECT coalesce(json_agg(obj),'[]') FROM (
  SELECT json_build_object('id',p.id,'tc',p.metadata->>'title_en_clean','dc',p.metadata->>'description_en_clean',
    'title',p.title,'description',p.description,'selling_points',p.metadata->'selling_points',
    'specs',p.metadata->'specs','dimensions',p.metadata->'dimensions') AS obj
  FROM product p
  WHERE p.metadata->>'title_en_clean' IS NOT NULL AND (${PREFILTER})
) s;`));

const changes = []; const unsafe = [];
for (const r of rows) {
  const srcNums = numSet(sourceCorpus({ title: r.title, description: r.description, selling_points: r.selling_points, specs: r.specs, dimensions: r.dimensions }));
  const out = { id: r.id };
  let touched = false, bad = null;
  for (const [field, key] of [["tc", "title_en_clean"], ["dc", "description_en_clean"]]) {
    const orig = r[field];
    if (orig == null) continue;
    if (rangeCoherenceOffenders(orig).length === 0) continue; // see väli pole ebasidus → jäta
    // 1) allika-tõestus: kõik imperiaal-otsad peavad olema allikas
    for (const e of imperialEnds(orig)) { if (!srcNums.has(normNumCmp(e))) { bad = `${field}: imperiaal-ots '${e}' POLE allikas`; break; } }
    if (bad) break;
    // 2) rekonstrueeri + SSoT addMetric
    const fixed = addMetric(reconstruct(orig), new Set());
    // 3) verifitseeri sidusus
    if (rangeCoherenceOffenders(fixed).length !== 0) { bad = `${field}: JÄÄB ebasidusaks peale paranduse`; break; }
    out[`${field}_old`] = orig; out[`${field}_new`] = fixed; out[`${field}_changed`] = true; touched = true;
  }
  if (bad) { unsafe.push({ id: r.id, reason: bad }); continue; }
  if (touched) changes.push(out);
}

const fields = changes.reduce((n, c) => n + (c.tc_changed ? 1 : 0) + (c.dc_changed ? 1 : 0), 0);
console.log(`🔎 eelfilter: ${rows.length} kandidaati · parandatav: ${changes.length} toodet / ${fields} välja · OHUTU-SKIP (allika-tõestus kukkus): ${unsafe.length}`);
for (const c of changes.slice(0, 10)) {
  if (c.tc_changed) console.log(`  [${c.id}] TITLE\n    - ${c.tc_old}\n    + ${c.tc_new}`);
  if (c.dc_changed) { const seg = (s) => { const m = s.match(INCO); return m ? m[0] : s.slice(0, 120); };
    console.log(`  [${c.id}] DESC  …${seg(c.dc_old)}…  →  (parandatud)`); }
}
if (changes.length > 10) console.log(`  … +${changes.length - 10} veel`);
if (unsafe.length) { console.log("\n⚠️ OHUTU-SKIP (EI parandata — vajab käsitsi/LLM-i):"); for (const u of unsafe.slice(0, 20)) console.log(`  [${u.id}] ${u.reason}`); }

if (!EXECUTE) { console.log(`\n🟡 DRY — ei kirjutanud. Käivita: node scripts/en-master-rangefix.mjs --execute`); process.exit(0); }
if (!changes.length) { console.log("\n✓ midagi parandada pole."); process.exit(0); }

// ── EXECUTE: stack-lukk + undo-ledger enne kirjutust ──
const release = acquireStackLock({ holder: "en-master-rangefix", waitMs: 60_000 });
try {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const undoPath = `/opt/xlmarket-github/reports/en-master-rangefix-undo-${ts}.json`;
  fs.writeFileSync(undoPath, JSON.stringify({ ts, db: DB, count: changes.length,
    items: changes.map((c) => ({ id: c.id, tc_old: c.tc_old ?? null, dc_old: c.dc_old ?? null })) }, null, 2));
  console.log(`\n💾 undo-ledger: ${undoPath}`);

  let done = 0;
  for (const c of changes) {
    let expr = "p.metadata";
    if (c.tc_changed) expr = `jsonb_set(${expr}, '{title_en_clean}', to_jsonb($$${c.tc_new}$$::text))`;
    if (c.dc_changed) expr = `jsonb_set(${expr}, '{description_en_clean}', to_jsonb($$${c.dc_new}$$::text))`;
    psql("", `UPDATE product p SET metadata = ${expr}, updated_at = NOW() WHERE p.id = '${c.id}';`);
    done++;
  }
  console.log(`✅ parandatud: ${done} toodet / ${fields} välja. Undo: node scripts/en-master-rangefix-undo.mjs ${undoPath}`);
} finally { release(); }
