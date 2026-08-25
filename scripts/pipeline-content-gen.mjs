#!/usr/bin/env node
/**
 * pipeline-content-gen.mjs — SISU-GENERAATOR samm [6.5] (HOST-run, k33g) HOOK.
 *
 * HARD RULE #5: ÜKS transform (scripts/lib/content-gen.mjs) + ÜKS write (scripts/lib/content-write.mjs),
 *   KAKS kutsujat:
 *     - HOOK [6.5] : SEE fail, --skus /tmp/pl-new-skus.txt  (öine DELTA, ~100 SKU — import-pipeline.sh)
 *     - BACKFILL   : scripts/content-gen-run.mjs --all       (kogu korpus, ühekordne + Batch)
 *   Sama generateContent + sama writeRecords → backfill ja hook EI lahkne.
 *
 * ASUKOHT: peale [6] spec-extract (spec olemas → parem sisu), ENNE [7] reindeks (Meili loeb ET-sisu).
 * DELTA-PEAL: töötab AINULT äsja-imporditud SKU-de peal (variant.sku join), MITTE 18k uuesti.
 * MULTI-FEED: content-gen loeb toote OMA EN-allikat (title/description/rich/specs) — bränd-agnostiline
 *   loomu poolest (ei VEVOR-hardcode). Powermat/BlackTools/KraftDele läbivad sama masina.
 * IDEMPOTENT + BACKUP: writeRecords → content_gen_backup + content_gen_hash guard (topelt-kirjutus võimatu).
 *
 * FAIL-LOUD (HARD RULE #5):
 *   - SÜSTEEMNE (API täiesti maas / DB kättesaamatu / kogu partii kukub) → exit 1 → pipeline Telegram.
 *   - ÜKSIK toode (parse-viga / API-timeout ühel) → SKIP + count, EI peata (transform-tasandil).
 *     Süsteemse vea lävi: kui >50% partiist kukub → käsitle süsteemsena (exit 1).
 *
 * Kasutus:
 *   node scripts/pipeline-content-gen.mjs --skus /tmp/pl-new-skus.txt --dry       # delta DRY
 *   node scripts/pipeline-content-gen.mjs --skus /tmp/pl-new-skus.txt --execute   # delta LIVE (hook)
 *
 * Väljund (orchestraatorile): GENERATED=<n> SKIPPED=<n> FAILED=<n> IDEMPOTENT=<n>
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadGlossary, buildGlossaryAssets, generateContent, DEFAULT_MODEL } from "./lib/content-gen.mjs";
import { filterNeedsGen, writeRecords, dbContainer } from "./lib/content-write.mjs";

const ROOT = "/opt/xlmarket-github";
const GLOSSARY = path.join(ROOT, "backend/src/data/glossary.yaml");

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : ""; };
const EXECUTE = has("--execute");
const SKUS_FILE = val("--skus");
const CONC = parseInt(val("--conc") || "4", 10);
const MODEL = val("--model") || DEFAULT_MODEL;
const FAIL_RATIO = 0.5; // >50% partiist kukub → süsteemne → exit 1
const CREDIT_DOMINANT = 0.8; // ≥80% kukkumistest = krediit → DEGRADE (exit 3), mitte API-maas (exit 1)

// Krediidi-/arve-tõrge (HTTP 400/402 "credit balance too low") ≠ API maas. DEGRADE, ära blokeeri laoseisu.
// (400/402 EI retry'ta content-gen'is → tuleb otse r.error stringina.)
function isCreditError(err) {
  return /credit balance|credit_balance|billing|insufficient.?(?:quota|funds|credit)|HTTP 402|Plans & Billing/i.test(String(err || ""));
}

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a) — SÜSTEEMNE"); process.exit(1); }
if (!SKUS_FILE) { console.error("❌ vaja --skus <fail> (delta)"); process.exit(2); }
if (!fs.existsSync(SKUS_FILE)) { console.error(`❌ --skus fail puudub: ${SKUS_FILE}`); process.exit(1); }

// ── DB-konteiner (dünaamiline) ────────────────────────────────────────────────
let DB_NAME;
try { DB_NAME = dbContainer(); } catch (e) { console.error(`❌ ${e.message} — SÜSTEEMNE`); process.exit(1); }

function psqlRows(sql) {
  let out;
  try {
    out = execFileSync("docker", ["exec", "-i", DB_NAME, "psql", "-U", "xlmarket", "-d", "xlmarket",
      "-tA", "-v", "ON_ERROR_STOP=1", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch (e) {
    throw new Error(`psql nurjus (SÜSTEEMNE): ${String(e.stderr || e.message).slice(0, 300)}`);
  }
  return out.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
}

// ── pool ──
async function runPool(items, worker, conc) {
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (true) { const i = idx++; if (i >= items.length) break; await worker(items[i], i); }
  }));
}

async function main() {
  const skus = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
  console.log(`=== SISU-GEN [6.5] (${EXECUTE ? "EXECUTE" : "DRY-RUN"}) · DELTA --skus · db=${DB_NAME} ===`);
  console.log(`  delta: ${skus.length} SKU (${SKUS_FILE})`);
  if (skus.length === 0) { console.log("  0 SKU deltas → sisu-gen vahele\nGENERATED=0\nSKIPPED=0\nFAILED=0\nIDEMPOTENT=0"); return; }

  // ── sihtread: metadata->>'vevor_sku' (SAMA võti kui [6] spec-extract + classify-skus.txt) ──
  const jsonArr = JSON.stringify(skus);
  const rows = psqlRows(
    `SELECT row_to_json(t) FROM (
       SELECT DISTINCT p.id, p.metadata->>'vevor_sku' AS sku, p.title, p.description,
         p.metadata->>'vevor_product_type' AS ptype, p.metadata->'specs' AS specs,
         p.metadata->>'sanitized_description' AS sanitized_description,
         p.metadata->>'sanitized_rich_description' AS sanitized_rich_description, p.thumbnail
       FROM product p
       JOIN (SELECT jsonb_array_elements_text($JSON$${jsonArr}$JSON$::jsonb) AS sku) s
         ON s.sku = p.metadata->>'vevor_sku'
       WHERE p.deleted_at IS NULL AND p.status = 'published'
     ) t;`
  );
  console.log(`  sihtread DB-st: ${rows.length}`);
  if (rows.length === 0) { console.log("GENERATED=0\nSKIPPED=0\nFAILED=0\nIDEMPOTENT=0"); return; }

  // ── idempotent: jäta juba-genereeritud (hash sama) vahele ──
  const { toWrite, skipped: idempotent } = filterNeedsGen(rows);
  console.log(`  idempotent (hash sama): ${idempotent} vahele · genereerida: ${toWrite.length}`);
  if (toWrite.length === 0) { console.log(`GENERATED=0\nSKIPPED=0\nFAILED=0\nIDEMPOTENT=${idempotent}`); return; }

  // ── glossary (SSoT prompt-blokk) ──
  const entries = loadGlossary(GLOSSARY);
  const { termBlock, lockedCount } = buildGlossaryAssets(entries);
  console.log(`  glossary: ${entries.length} kirjet (${lockedCount} locked)`);

  // ── genereeri (realtime pool) — üksik-fail = skip+count ──
  const records = [];
  const failedItems = [];
  let done = 0;
  await runPool(toWrite, async (p) => {
    try {
      const r = await generateContent(p, { apiKey: KEY, model: MODEL, termBlock });
      done++;
      if (r.ok && r.content) records.push({ product: p, content: r.content });
      else { failedItems.push({ id: p.id, sku: p.sku, err: r.error || r.parseErr }); }
      if (done % 10 === 0 || done === toWrite.length) console.log(`  [${done}/${toWrite.length}] ok=${records.length} fail=${failedItems.length}`);
    } catch (e) {
      done++; failedItems.push({ id: p.id, sku: p.sku, err: String(e.message || e).slice(0, 120) });
    }
  }, CONC);

  // ── kukkumis-analüüs: KREDIIT (degrade) vs MUU süsteemne (API maas → peata) ──
  const failRatio = failedItems.length / toWrite.length;
  const creditFails = failedItems.filter((f) => isCreditError(f.err)).length;
  // enamik kukkumisi = krediit → DEGRADE (skip sisu, lase reindeks joosta), MITTE API-maas.
  const creditDegrade = creditFails > 0 && creditFails >= failedItems.length * CREDIT_DOMINANT;

  // MUU SÜSTEEMNE (API täiesti maas / DB kaos, EI krediit) → exit 1 (peata, Telegram punane).
  if (failRatio > FAIL_RATIO && !creditDegrade) {
    console.error(`❌ SÜSTEEMNE: ${failedItems.length}/${toWrite.length} (${Math.round(failRatio * 100)}%) kukkus — API maas? Näited:`);
    for (const f of failedItems.slice(0, 5)) console.error(`   ⛔ ${f.sku || f.id}: ${f.err}`);
    process.exit(1);
  }

  // KREDIIT-DEGRADE: krediidi-tõrge ≠ API-maas. Sisu OOTAB, aga laoseis/hind/spec/reindeks JÄTKUB.
  //   (Sama muster kui B-fix: üksik/mitte-kriitiline tõrge ei peata kogu pipeline'i. Sisu re-run'iga hiljem.)
  if (creditDegrade) {
    console.error(`⚠️ KREDIIT-DEGRADE: ${creditFails}/${toWrite.length} kukkus krediidi-veaga (${Math.round(failRatio * 100)}% kokku) — sisu OOTAB, laoseis/reindeks JÄTKUB. Näide:`);
    const ex = failedItems.find((f) => isCreditError(f.err));
    if (ex) console.error(`   💳 ${ex.sku || ex.id}: ${ex.err}`);
  } else if (failedItems.length) {
    console.log(`  ⚠️ ${failedItems.length} üksik-toodet kukkus → SKIP (review), EI peata:`);
    for (const f of failedItems.slice(0, 8)) console.log(`     ⏭  ${f.sku || f.id}: ${f.err}`);
  }

  // ── kirjuta õnnestunud (ka DEGRADE'i puhul — mis JÕUDIS enne krediidi-lõppu läbi) ──
  let applied = 0;
  if (!EXECUTE) {
    console.log(`  [DRY] EI kirjuta. (--execute kirjutaks ${records.length} toodet)`);
  } else if (records.length) {
    let w;
    try { w = writeRecords(records, { execute: true }); }
    catch (e) { console.error(`❌ writeRecords nurjus (SÜSTEEMNE): ${String(e.message).slice(0, 300)}`); process.exit(1); }
    applied = w.applied;
    console.log(`  ✅ DB: applied=${w.applied} backup=${w.backedUp} considered=${w.considered}`);
  }

  console.log(`GENERATED=${EXECUTE ? applied : records.length}`);
  console.log(`SKIPPED=${failedItems.length}`);
  console.log(`FAILED=${failedItems.length}`);
  console.log(`IDEMPOTENT=${idempotent}`);
  console.log(`CREDIT_PENDING=${creditFails}`);
  // exit 3 = KREDIIT-DEGRADE signaal orkestraatorile (import-pipeline.sh [6.5]): ära fail(), lase [7] joosta.
  if (creditDegrade) { console.log(`CREDIT_DEGRADE=1`); process.exit(3); }
}

main().catch((e) => { console.error(`❌ FATAL (SÜSTEEMNE): ${e.stack || e}`); process.exit(1); });
