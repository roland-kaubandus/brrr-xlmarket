#!/usr/bin/env node
/**
 * synonym-gen-run.mjs — SÜNONÜÜMI BACKFILL-RUNNER (HARD RULE #5 kutsuja "backfill").
 *
 * Sama transform (scripts/lib/synonym-gen.mjs) + sama write (scripts/lib/synonym-write.mjs)
 * kui öine hook (pipeline-synonyms.mjs) — backfill ja hook EI lahkne.
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/synonym-gen-run.mjs --pilot 500 --write          # PILOT 500 (direct API), kirjuta DB
 *   node scripts/synonym-gen-run.mjs --pilot 500                  # PILOT DRY (ei kirjuta)
 *   node scripts/synonym-gen-run.mjs --all --batch --write        # KOGU korpus (Batch API −50%)
 *   node scripts/synonym-gen-run.mjs --skus /tmp/x.txt --write    # kindlad SKU-d
 *
 * NB: PILOT kirjutab AINULT DB (product_synonym + synonym_review). Meili sync EI toimu siin —
 *     read on live-saidile NÄHTAMATUD kuni [7.5] sync-synonyms jookseb. Tahtlik (näita enne sync'i).
 */

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { generateSynonyms, buildRows, brandOf, buildParams, parseBatchMessage, DEFAULT_MODEL, CONF_AUTO } from "./lib/synonym-gen.mjs";
import { writeSynonyms } from "./lib/synonym-write.mjs";
import { runChunk, chunk } from "./lib/content-batch.mjs";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : ""; };
const WRITE = has("--write");
const USE_BATCH = has("--batch");
const MODEL = val("--model") || DEFAULT_MODEL;
const CHUNK = parseInt(val("--chunk") || "10", 10);
const CONC = parseInt(val("--conc") || "4", 10);
const OUT = val("--out") || "";
const LIMIT_PILOT = has("--pilot") ? parseInt(val("--pilot") || "500", 10) : 0;
const SKUS_FILE = val("--skus");

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(1); }

let DB;
try {
  const names = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  DB = names.split("\n").find((n) => n.startsWith("db-k33g")).trim();
} catch (e) { console.error("❌ db-k33g konteinerit ei leitud"); process.exit(1); }

function psqlJSON(sql) {
  const out = execFileSync("docker", ["exec", "-i", DB, "psql", "-U", "xlmarket", "-d", "xlmarket",
    "-tA", "-v", "ON_ERROR_STOP=1", "-f", "-"], { input: sql, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  return out.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

function fetchProducts() {
  const catSub = `(SELECT pc.name FROM product_category_product pcp JOIN product_category pc ON pc.id=pcp.product_category_id WHERE pcp.product_id=p.id LIMIT 1)`;
  const cols = `SELECT row_to_json(t) FROM (
    SELECT p.id, p.metadata->>'vevor_sku' AS sku, p.title AS title_en,
           p.metadata->>'title_et' AS title_et, p.metadata AS metadata,
           ${catSub} AS category
    FROM product p`;
  let where = `WHERE p.deleted_at IS NULL AND p.status='published' AND p.metadata->>'title_et' IS NOT NULL AND p.title IS NOT NULL`;
  let tail = ` ORDER BY p.id`;
  if (SKUS_FILE) {
    const skus = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
    if (!skus.length) return [];
    where += ` AND p.metadata->>'vevor_sku' IN (SELECT jsonb_array_elements_text($JSON$${JSON.stringify(skus)}$JSON$::jsonb))`;
  } else if (LIMIT_PILOT) {
    tail += ` LIMIT ${LIMIT_PILOT}`;
  }
  return psqlJSON(`${cols} ${where}${tail}) t;`);
}

async function runPool(items, worker, conc) {
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (true) { const i = idx++; if (i >= items.length) break; await worker(items[i], i); }
  }));
}

function toBatchItem(p) {
  return { id: p.id, title_en: p.title_en, title_et: p.title_et, category: p.category, brand: brandOf(p) };
}

async function main() {
  const mode = SKUS_FILE ? `--skus ${SKUS_FILE}` : LIMIT_PILOT ? `--pilot ${LIMIT_PILOT}` : "--all";
  console.log(`=== SÜNONÜÜMI-GEN (${WRITE ? "WRITE" : "DRY"}) · ${mode} · ${USE_BATCH ? "Batch API" : "direct"} · db=${DB} ===`);
  const products = fetchProducts();
  console.log(`  tooteid: ${products.length}`);
  if (!products.length) { console.log("STATUS: 0 toodet\nAUTO=0\nREVIEW=0\nFAILED=0"); return; }

  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const batches = chunk(products.map(toBatchItem), CHUNK);
  const allResults = [];   // {product_id, terms}
  const failed = [];
  let done = 0;

  if (USE_BATCH) {
    // Batch API — chunk-kaupa submit→poll→retrieve (osaline progress säilib)
    const BATCH_GROUP = 200; // ~mitu chunki ühte batchi
    const groups = chunk(batches, BATCH_GROUP);
    for (let gi = 0; gi < groups.length; gi++) {
      const requests = groups[gi].map((b, i) => ({ custom_id: `g${gi}_c${i}`, params: buildParams(b, { model: MODEL }) }));
      process.stderr.write(`Batch-grupp ${gi + 1}/${groups.length} (${requests.length} chunki)...\n`);
      const { results } = await runChunk(requests, KEY, {
        onTick: (s) => process.stderr.write(`  ${s.processing_status} ${JSON.stringify(s.request_counts)}\r`),
      });
      const idx = Object.fromEntries(groups[gi].map((b, i) => [`g${gi}_c${i}`, b]));
      for (const r of results) {
        if (r.ok) { try { allResults.push(...parseBatchMessage(r.message)); } catch (e) { failed.push({ chunk: r.custom_id, err: String(e.message) }); } }
        else failed.push({ chunk: r.custom_id, err: r.error || r.errorType });
      }
    }
  } else {
    // Direct API (pilot/skus) — realtime pool
    await runPool(batches, async (b, bi) => {
      const r = await generateSynonyms(b, { apiKey: KEY, model: MODEL });
      done++;
      if (r.ok) allResults.push(...r.results);
      else failed.push({ chunk: bi, err: r.error });
      if (done % 5 === 0 || done === batches.length) console.log(`  [${done}/${batches.length}] tulemusi=${allResults.length} fail=${failed.length}`);
    }, CONC);
  }

  // ── buildRows: LLM-terms + deterministlikud variandid → auto/review ──
  const records = [];
  let autoT = 0, reviewT = 0, varT = 0;
  const sample = [];
  for (const res of allResults) {
    const p = byId[res.product_id];
    if (!p) continue;
    const { auto, review } = buildRows(res.terms || []);
    autoT += auto.length; reviewT += review.length;
    for (const a of auto) varT += a.variants.length;
    if (auto.length || review.length) records.push({ product_id: res.product_id, auto, review });
    if (sample.length < 20 && (auto.length || review.length)) sample.push({ sku: p.sku, title_et: p.title_et, auto, review });
  }

  console.log(`\n  LLM tulemusi: ${allResults.length} toodet · auto-terme: ${autoT} · review-terme: ${reviewT} · variante: ${varT} · fail-chunke: ${failed.length}`);

  // ── kirjuta DB (Meili sync EI toimu — read nähtamatud kuni [7.5]) ──
  let w = { autoWritten: 0, reviewWritten: 0, products: 0, dry: true };
  if (WRITE) {
    w = writeSynonyms(records, { execute: true });
    console.log(`  ✅ DB: auto=${w.autoWritten} review=${w.reviewWritten} tooteid=${w.products}`);
  } else {
    console.log(`  [DRY] ei kirjuta (--write kirjutaks ~${autoT} auto + ${reviewT} review)`);
  }

  // ── näidis-väljund (Tarmole ülevaatuseks) ──
  const report = {
    generated_at: new Date().toISOString(), mode, model: MODEL, write: WRITE,
    products: products.length, llm_ok: allResults.length, failed_chunks: failed.length,
    auto_terms: autoT, review_terms: reviewT, variants: varT,
    db: w, conf_auto: CONF_AUTO, sample,
  };
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(report, null, 2)); console.log(`  raport → ${OUT}`); }

  // ── masin-loetav STATUS + rc (backfill-wrapper loeb): 0=OK · 2=OSALINE · 1=SÜSTEEMNE ──
  const nChunks = batches.length;
  const ratio = nChunks ? failed.length / nChunks : 0;
  let rc = 0, status = "OK";
  if (failed.length > 0) { if (ratio > 0.5) { rc = 1; status = "SYSTEMIC"; } else { rc = 2; status = "PARTIAL"; } }
  console.log(`\nSTATUS=${status} ok=${nChunks - failed.length} errored=${failed.length} ratio=${ratio.toFixed(3)}`);
  console.log(`AUTO=${autoT}`);
  console.log(`REVIEW=${reviewT}`);
  console.log(`VARIANTS=${varT}`);
  console.log(`FAILED=${failed.length}`);
  if (failed.length) for (const f of failed.slice(0, 5)) console.log(`  ⛔ chunk ${f.chunk}: ${f.err}`);
  if (rc) process.exit(rc);
}

main().catch((e) => { console.error(`❌ FATAL: ${e.stack || e}`); process.exit(1); });
