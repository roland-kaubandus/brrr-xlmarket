#!/usr/bin/env node
/**
 * kiht2-folk-sync.mjs — KIHT 2 rahvakeelse sõnavara LIVE-SYNK (folk → product_synonym → Meili).
 *
 * MUDEL (Tarmo 2026-11-18, "sõnavara võib minna live'i kohe"):
 *   folk_consensus (mõlemad mudelid NÕUS) per L3 → Meili synonyms, nii et kliendi otsingusõna
 *   (nt "generaatorikate") laieneb kategooria NIMELE → toob kategooria tooted esile.
 *   folk_candidate (ainult üks mudel) EI lähe — madalam kindlus, v1 skoobist väljas.
 *
 * MEHHANISM: sync-synonyms.mjs (kanooniline) ehitab per-rida TÄIS-ÜHENDATUD kahesuunalise grupi
 *   [word, ...synonyms, ...variants]. Lingime iga folk-termini kategooria NIMELE (Meili's otsitav,
 *   kinnitatud) → termini otsing laieneb nimele → leiab L3 tooted.
 *
 * ⚠️ PÜSIKANAL: lang='et-kiht2' (MITTE 'et'). Põhjus: synonym-gen per-product-replace teeb
 *   DELETE product_synonym ... AND lang='et' → kustutaks 'et' kategooria-read iga toote-regeni ajal
 *   (soojendi manuaalne fix lang='et' on seetõttu HABRAS). sync-synonyms loeb KÕIK keeled → 'et-kiht2'
 *   jõuab Meili'sse, kuid per-product regen ei puutu. gen_version='kiht2-folk-v1'.
 *
 * IDEMPOTENTNE TÄIS-ASENDUS (= delta, HARD RULE #5): iga jooks DELETE kogu kanal → INSERT jsonist.
 *   Backfill ja öine hook kutsuvad SAMA skripti; täis-asendus reconcilib json'i → ei teki triivi
 *   (uued konsensus-terminid ilmuvad, kustutatud kaovad). Öine hook: node kiht2-folk-sync.mjs --execute.
 *
 * TÄIELIKULT TAGASIVÕETAV: node kiht2-folk-sync.mjs --undo  (kustutab kanali + re-sync Meili).
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/kiht2-folk-sync.mjs --dry                 # vaikimisi: loendid + 10 näidist + net-uus (Meili), EI kirjuta
 *   node scripts/kiht2-folk-sync.mjs --execute             # kirjuta kanal + kanooniline Meili-sync (stack-lukk)
 *   node scripts/kiht2-folk-sync.mjs --execute --no-sync   # ainult DB, jäta Meili-sync vahele
 *   node scripts/kiht2-folk-sync.mjs --undo                # eemalda kanal + re-sync
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv;
const EXECUTE = argv.includes("--execute");
const UNDO = argv.includes("--undo");
const NO_SYNC = argv.includes("--no-sync");
const DRY = !EXECUTE && !UNDO;

const LANG = "et-kiht2";
const GENV = "kiht2-folk-v1";
const VJSON = path.join(ROOT, "reports", "kiht2-sonavara-dry.json");
const BACKUP_TABLE = "kiht2_folk_backup";

// ── konteinerid ───────────────────────────────────────────────────────────────
const dbC = () => execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" })
  .split("\n").find((n) => n.startsWith("db-k33g"))?.trim() || (() => { throw new Error("db-k33g puudub"); })();
const medC = () => execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" })
  .split("\n").find((n) => n.startsWith("medusa-k33g") && !n.includes("worker"))?.trim()
  || (() => { throw new Error("medusa-k33g puudub"); })();

function psql(sql) {
  return execFileSync("docker", ["exec", "-i", dbC(), "psql", "-U", "xlmarket", "-d", "xlmarket",
    "-tA", "-v", "ON_ERROR_STOP=1", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
}
function psqlFile(sqlText) {
  const host = path.join("/tmp", `kiht2-folk-${process.pid}-${Date.now()}.sql`);
  fs.writeFileSync(host, sqlText);
  try {
    execFileSync("docker", ["cp", host, `${dbC()}:/tmp/kiht2-folk.sql`], { stdio: "pipe" });
    return execFileSync("docker", ["exec", "-i", dbC(), "psql", "-U", "xlmarket", "-d", "xlmarket",
      "-v", "ON_ERROR_STOP=1", "-f", "/tmp/kiht2-folk.sql"], { encoding: "utf8", maxBuffer: 1 << 28 });
  } finally { try { fs.unlinkSync(host); } catch {} }
}
const sqlStr = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const sqlArr = (a) => "ARRAY[" + (a.length ? a.map(sqlStr).join(",") : "") + "]::text[]";
const norm = (s) => String(s || "").trim();
const uniq = (a) => [...new Set(a.filter(Boolean))];

// ── Meili bulk hits (net-uus mõõtmiseks DRY's) ──────────────────────────────────
function meiliHits(terms) {
  const script = `const H=(process.env.MEILISEARCH_HOST||"http://127.0.0.1:7700").replace(/\\/$/,""),K=process.env.MEILISEARCH_KEY||process.env.MEILISEARCH_API_KEY;
(async()=>{const terms=JSON.parse(Buffer.from(process.env.TERMS_B64,"base64").toString("utf8"));const out={};
for(const t of terms){try{const r=await(await fetch(H+"/indexes/products/search",{method:"POST",headers:{Authorization:"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify({q:t,limit:0})})).json();out[t]=r.estimatedTotalHits??-1;}catch(e){out[t]=-1;}}
process.stdout.write(JSON.stringify(out));})();`;
  const tB64 = Buffer.from(JSON.stringify(terms), "utf8").toString("base64");
  const scB64 = Buffer.from(script, "utf8").toString("base64");
  const res = execFileSync("docker", ["exec", "-e", `TERMS_B64=${tB64}`, "-e", `SC_B64=${scB64}`, medC(),
    "sh", "-c", 'printf %s "$SC_B64" | base64 -d > /tmp/kh.cjs && node /tmp/kh.cjs'],
    { encoding: "utf8", maxBuffer: 1 << 27 });
  return JSON.parse(res);
}

// ── 1) loe json + DB anchor/nimi per L3 ─────────────────────────────────────────
const j = JSON.parse(fs.readFileSync(VJSON, "utf8"));
const l3s = j.l3.filter((x) => Array.isArray(x.folk_consensus) && x.folk_consensus.length);

// anchor (stabiilne: MIN(product_id)) + elus-L3 kontroll
const anchorRows = psql(`
SELECT json_build_object('cid', pc.id, 'name', pc.name, 'anchor', MIN(pcp.product_id)) AS j
FROM product_category pc
JOIN product_category_product pcp ON pcp.product_category_id = pc.id
WHERE pc.deleted_at IS NULL AND pc.mpath ~ '^[^.]+\\.[^.]+\\.[^.]+$'
GROUP BY pc.id, pc.name;
`).trim().split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
const anchorMap = new Map(anchorRows.map((r) => [r.cid, r]));

// ── 2) ehita read ───────────────────────────────────────────────────────────────
const rows = [];
let skippedNoAnchor = 0;
for (const l3 of l3s) {
  const a = anchorMap.get(l3.id);
  if (!a || !a.anchor) { skippedNoAnchor++; continue; }
  const catName = norm(a.name);
  for (const e of l3.folk_consensus) {
    const term = norm(e.term);
    if (!term) continue;
    const variants = uniq((e.variants || []).map(norm));
    // synonyms = kategooria-nimi (link → tooted) + termini variandid (v.a. term ise)
    const synonyms = uniq([catName, ...variants.filter((v) => v !== term)]);
    rows.push({ product_id: a.anchor, word: term, synonyms, variants, cid: l3.id, name: catName });
  }
}

console.error(`[kiht2-folk-sync] ${DRY ? "DRY" : UNDO ? "UNDO" : "EXECUTE"} · lang=${LANG} gen=${GENV}`);
console.error(`  L3 konsensusega: ${l3s.length} · anchor puudu (jäetud): ${skippedNoAnchor} · read: ${rows.length}`);

// ── UNDO ──────────────────────────────────────────────────────────────────────
if (UNDO) {
  const { acquireStackLock } = await import("./lib/stack-lock.mjs");
  try { acquireStackLock({ holder: "kiht2-folk-sync-undo", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 }); }
  catch (e) { console.error(`🔒 stack-lukk (deploy käib?): ${e.message}`); process.exit(1); }
  const before = psql(`SELECT count(*) FROM product_synonym WHERE lang=${sqlStr(LANG)} AND gen_version=${sqlStr(GENV)};`).trim();
  psqlFile(`\\set ON_ERROR_STOP on\nBEGIN;\nDELETE FROM product_synonym WHERE lang=${sqlStr(LANG)} AND gen_version=${sqlStr(GENV)};\nCOMMIT;\n`);
  console.error(`  eemaldatud ${before} rida (lang=${LANG}).`);
  if (!NO_SYNC) { console.error("  → kanooniline Meili-sync..."); execFileSync("docker", ["exec", medC(), "node", "scripts/sync-synonyms.mjs"], { stdio: "inherit" }); }
  console.log(`KIHT2_FOLK_UNDO_OK removed=${before}`);
  process.exit(0);
}

// ── DRY: loendid + net-uus + näidised, EI kirjuta ───────────────────────────────
if (DRY) {
  const terms = rows.map((r) => r.word);
  const sampleTerms = terms.length > 1200 ? terms.slice(0, 1200) : terms; // net-uus hinnang valimilt
  let netNew = 0, covered = 0, hitsMap = {};
  try {
    hitsMap = meiliHits(sampleTerms);
    for (const t of sampleTerms) { const h = hitsMap[t]; if (h >= 0 && h < 3) netNew++; else if (h >= 3) covered++; }
  } catch (e) { console.error("  (Meili net-uus vahele: " + e.message + ")"); }
  console.error(`  net-uus hinnang (valim ${sampleTerms.length}): <3 praegu = ${netNew} · ≥3 juba kaetud = ${covered}`);
  console.error(`\n  10 näidist (termin → synonyms[link kategooriale]):`);
  for (const r of rows.slice(0, 10)) {
    console.error(`   • "${r.word}"  →  [${r.synonyms.join(", ")}]   (${r.name})`);
  }
  const out = path.join(ROOT, "reports", "kiht2-folk-sync-dry.json");
  fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), lang: LANG, gen_version: GENV,
    l3_with_consensus: l3s.length, skipped_no_anchor: skippedNoAnchor, rows: rows.length,
    net_new_estimate: netNew, already_covered: covered, sample: rows.slice(0, 30) }, null, 2));
  console.error(`\n  DRY JSON: ${out}  (EI kirjutatud DB-sse)`);
  process.exit(0);
}

// ── EXECUTE: backup + täis-asendus + Meili-sync ─────────────────────────────────
const { acquireStackLock } = await import("./lib/stack-lock.mjs");
try { acquireStackLock({ holder: "kiht2-folk-sync", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 }); }
catch (e) { console.error(`🔒 stack-lukk (deploy käib?): ${e.message}`); process.exit(1); }

const values = rows.map((r) =>
  `(gen_random_uuid(), ${sqlStr(r.product_id)}, ${sqlStr(r.word)}, ${sqlArr(r.synonyms)}, ARRAY[]::text[], ${sqlArr(r.variants)}, ${sqlStr(LANG)}, ${sqlStr(GENV)}, 1.0, NOW())`
).join(",\n");

const sql = `\\set ON_ERROR_STOP on
BEGIN;
-- backup olemasolev kanal (tagasivõtu jaoks)
CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} (LIKE product_synonym INCLUDING ALL, backed_up_at timestamptz DEFAULT NOW());
DELETE FROM ${BACKUP_TABLE};
INSERT INTO ${BACKUP_TABLE} SELECT *, NOW() FROM product_synonym WHERE lang=${sqlStr(LANG)} AND gen_version=${sqlStr(GENV)};
-- TÄIS-ASENDUS (idempotentne = delta)
DELETE FROM product_synonym WHERE lang=${sqlStr(LANG)} AND gen_version=${sqlStr(GENV)};
INSERT INTO product_synonym (id, product_id, word, synonyms, inflections, variants, lang, gen_version, confidence, created_at) VALUES
${values};
-- POST-GUARD: ridade arv vastab
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM product_synonym WHERE lang=${sqlStr(LANG)} AND gen_version=${sqlStr(GENV)};
  IF n <> ${rows.length} THEN RAISE EXCEPTION 'KIHT2-FOLK: oodatud ${rows.length} rida, DB-s %', n; END IF;
  RAISE NOTICE 'KIHT2-FOLK OK: % rida (lang=${LANG})', n;
END $$;
COMMIT;
`;
const res = psqlFile(sql);
process.stderr.write(res);
if (!NO_SYNC) {
  console.error("  → kanooniline Meili-sync (sync-synonyms.mjs)...");
  execFileSync("docker", ["exec", medC(), "node", "scripts/sync-synonyms.mjs"], { stdio: "inherit" });
}
console.log(`KIHT2_FOLK_SYNC_OK rows=${rows.length} lang=${LANG} gen=${GENV}`);
