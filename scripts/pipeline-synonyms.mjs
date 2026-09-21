#!/usr/bin/env node
/**
 * pipeline-synonyms.mjs — SÜNONÜÜMI-HOOK samm [6.6] (HOST-run, k33g) HOOK.
 *
 * HARD RULE #5: ÜKS transform (scripts/lib/synonym-gen.mjs) + ÜKS write (scripts/lib/synonym-write.mjs),
 *   KAKS kutsujat:
 *     - HOOK [6.6] : SEE fail, --skus /tmp/classify-skus.txt  (öine DELTA, ~100 SKU — import-pipeline.sh)
 *     - BACKFILL   : scripts/synonym-gen-run.mjs --all --batch (kogu korpus, ühekordne)
 *   Sama generateSynonyms + sama writeSynonyms → backfill ja hook EI lahkne.
 *
 * ASUKOHT: peale [6.5] sisu-gen (title_et olemas → parem sünonüüm), ENNE [7] reindeks.
 *   Meili sync toimub [7.5] sync-synonyms PÄRAST reindeksit (reindeks KUSTUTAB synonyms — kriitiline).
 * DELTA-PEAL: AINULT äsja-imporditud SKU-de peal (vevor_sku join), MITTE 18k uuesti.
 * MULTI-FEED: synonym-gen loeb toote OMA ET/EN sisu + deriveBrandSlug — bränd-agnostiline.
 * PROPOSE-NOT-CREATE: auto ≥0.85 → product_synonym; alla → synonym_review (INIMENE).
 *
 * FAIL-LOUD (HARD RULE #5):
 *   - SÜSTEEMNE (API täiesti maas / DB kaos / >50% chunke kukub) → exit 1 → pipeline Telegram.
 *   - KREDIIT-tõrge (≥80% kukkumistest = krediit) → exit 3 (DEGRADE: sünonüümid OOTAVAD, reindeks JÄTKUB).
 *   - ÜKSIK chunk kukub → SKIP + count, EI peata.
 *
 * Kasutus:
 *   node scripts/pipeline-synonyms.mjs --skus /tmp/classify-skus.txt --dry
 *   node scripts/pipeline-synonyms.mjs --skus /tmp/classify-skus.txt --execute
 *
 * Väljund (orchestraatorile): AUTO=<n> REVIEW=<n> SKIPPED=<n> FAILED=<n>
 */

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { generateSynonyms, buildRows, brandOf, DEFAULT_MODEL } from "./lib/synonym-gen.mjs";
import { writeSynonyms } from "./lib/synonym-write.mjs";
import { isCreditError } from "./lib/credit-guard.mjs";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : ""; };
const EXECUTE = has("--execute");
const SKUS_FILE = val("--skus");
const CHUNK = parseInt(val("--chunk") || "10", 10);
const CONC = parseInt(val("--conc") || "4", 10);
const MODEL = val("--model") || DEFAULT_MODEL;
const FAIL_RATIO = 0.5;      // >50% chunke kukub → süsteemne → exit 1
const CREDIT_DOMINANT = 0.8; // ≥80% kukkumistest = krediit → DEGRADE (exit 3)

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a) — SÜSTEEMNE"); process.exit(1); }
if (!SKUS_FILE) { console.error("❌ vaja --skus <fail> (delta)"); process.exit(2); }
if (!fs.existsSync(SKUS_FILE)) { console.error(`❌ --skus fail puudub: ${SKUS_FILE}`); process.exit(1); }

let DB;
try {
  const names = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  DB = names.split("\n").find((n) => n.startsWith("db-k33g")).trim();
} catch { console.error("❌ db-k33g konteinerit ei leitud — SÜSTEEMNE"); process.exit(1); }

function psqlJSON(sql) {
  let out;
  try {
    out = execFileSync("docker", ["exec", "-i", DB, "psql", "-U", "xlmarket", "-d", "xlmarket",
      "-tA", "-v", "ON_ERROR_STOP=1", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch (e) { throw new Error(`psql nurjus (SÜSTEEMNE): ${String(e.stderr || e.message).slice(0, 300)}`); }
  return out.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
async function runPool(items, worker, conc) {
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (true) { const i = idx++; if (i >= items.length) break; await worker(items[i], i); }
  }));
}

async function main() {
  const skus = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
  console.log(`=== SÜNONÜÜMID [6.6] (${EXECUTE ? "EXECUTE" : "DRY"}) · DELTA --skus · db=${DB} ===`);
  console.log(`  delta: ${skus.length} SKU (${SKUS_FILE})`);
  if (!skus.length) { console.log("  0 SKU → vahele\nAUTO=0\nREVIEW=0\nSKIPPED=0\nFAILED=0"); return; }

  const catSub = `(SELECT pc.name FROM product_category_product pcp JOIN product_category pc ON pc.id=pcp.product_category_id WHERE pcp.product_id=p.id LIMIT 1)`;
  const rows = psqlJSON(
    `SELECT row_to_json(t) FROM (
       SELECT p.id, p.metadata->>'vevor_sku' AS sku, p.title AS title_en,
              p.metadata->>'title_et' AS title_et, p.metadata AS metadata, ${catSub} AS category
       FROM product p
       JOIN (SELECT jsonb_array_elements_text($JSON$${JSON.stringify(skus)}$JSON$::jsonb) AS sku) s
         ON s.sku = p.metadata->>'vevor_sku'
       WHERE p.deleted_at IS NULL AND p.status='published' AND p.title IS NOT NULL
     ) t;`
  );
  console.log(`  sihtread DB-st: ${rows.length}`);
  if (!rows.length) { console.log("AUTO=0\nREVIEW=0\nSKIPPED=0\nFAILED=0"); return; }

  const byId = Object.fromEntries(rows.map((p) => [p.id, p]));
  const items = rows.map((p) => ({ id: p.id, title_en: p.title_en, title_et: p.title_et, category: p.category, brand: brandOf(p) }));
  const batches = chunk(items, CHUNK);

  const allResults = [];
  const failed = [];
  let done = 0;
  await runPool(batches, async (b, bi) => {
    const r = await generateSynonyms(b, { apiKey: KEY, model: MODEL });
    done++;
    if (r.ok) allResults.push(...r.results);
    else failed.push({ chunk: bi, err: r.error });
    if (done % 5 === 0 || done === batches.length) console.log(`  [${done}/${batches.length}] ok=${allResults.length} fail=${failed.length}`);
  }, CONC);

  // ── kukkumis-analüüs (KREDIIT vs MUU süsteemne) ──
  const failRatio = batches.length ? failed.length / batches.length : 0;
  const creditFails = failed.filter((f) => isCreditError(f.err)).length;
  const creditDegrade = creditFails > 0 && creditFails >= failed.length * CREDIT_DOMINANT;
  if (failRatio > FAIL_RATIO && !creditDegrade) {
    console.error(`❌ SÜSTEEMNE: ${failed.length}/${batches.length} chunki (${Math.round(failRatio * 100)}%) kukkus — API maas?`);
    for (const f of failed.slice(0, 5)) console.error(`   ⛔ chunk ${f.chunk}: ${f.err}`);
    process.exit(1);
  }
  if (creditDegrade) {
    console.error(`⚠️ KREDIIT-DEGRADE: ${creditFails}/${batches.length} krediidi-veaga — sünonüümid OOTAVAD, reindeks JÄTKUB.`);
  } else if (failed.length) {
    console.log(`  ⚠️ ${failed.length} chunki kukkus → SKIP, EI peata:`);
    for (const f of failed.slice(0, 5)) console.log(`     ⏭  chunk ${f.chunk}: ${f.err}`);
  }

  // ── buildRows + kirjuta ──
  const records = [];
  let autoT = 0, reviewT = 0;
  for (const res of allResults) {
    if (!byId[res.product_id]) continue;
    const { auto, review } = buildRows(res.terms || []);
    autoT += auto.length; reviewT += review.length;
    if (auto.length || review.length) records.push({ product_id: res.product_id, auto, review });
  }

  let w = { autoWritten: 0, reviewWritten: 0, products: 0 };
  if (!EXECUTE) {
    console.log(`  [DRY] ei kirjuta (--execute kirjutaks ${autoT} auto + ${reviewT} review)`);
  } else if (records.length) {
    try { w = writeSynonyms(records, { execute: true }); }
    catch (e) { console.error(`❌ writeSynonyms nurjus (SÜSTEEMNE): ${String(e.message).slice(0, 300)}`); process.exit(1); }
    console.log(`  ✅ DB: auto=${w.autoWritten} review=${w.reviewWritten} tooteid=${w.products}`);
  }

  console.log(`AUTO=${EXECUTE ? w.autoWritten : autoT}`);
  console.log(`REVIEW=${EXECUTE ? w.reviewWritten : reviewT}`);
  console.log(`SKIPPED=${failed.length}`);
  console.log(`FAILED=${failed.length}`);
  console.log(`CREDIT_PENDING=${creditFails}`);
  if (creditDegrade) { console.log(`CREDIT_DEGRADE=1`); process.exit(3); }
}

main().catch((e) => { console.error(`❌ FATAL (SÜSTEEMNE): ${e.stack || e}`); process.exit(1); });
