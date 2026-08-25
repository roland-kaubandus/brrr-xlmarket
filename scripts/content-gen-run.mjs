#!/usr/bin/env node
// content-gen-run.mjs — SISU-GENERAATORI kutsuja (HARD RULE #5 backfill-runner).
//
// SELEKTSIOON (üks nendest):
//   --pilot N        : vali N mitmekesist toodet (raport, EI kirjuta DB-d vaikimisi)
//   --skus FILE      : id- või vevor_sku-nimekiri (delta — hook kasutab sama teed)
//   --all            : backfill kogu korpus (published)
// GENEREERIMINE:
//   (vaikimisi realtime pool)     --conc 4
//   --batch [--chunk 2000]        : Anthropic Batch API (−50%), osade kaupa
// KIRJUTUS:
//   --write          : kirjuta DB-sse (backup + idempotent hash-guard, content-write.mjs SSoT)
//   (ilma --write → ainult raport reports/*.md, DB puutumata)
// MUU: --model X  --vision  --out LABEL  --carbon K (seed carbon-steel)
//
// HARD RULE #5: SAMA transform (content-gen.mjs) + SAMA write (content-write.mjs) kutsutakse
// nii siit (backfill) kui pipeline-content-gen.mjs-st (öine hook). Ei lahkne kunagi.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadGlossary, buildGlossaryAssets, generateContent, buildRequestBody, parseMessage, detectSourceMode, DEFAULT_MODEL } from './lib/content-gen.mjs';
import { filterNeedsGen, writeRecords, dbContainer, psqlJSON } from './lib/content-write.mjs';
import { submitBatch, pollBatch, retrieveResults, chunk as chunkArr } from './lib/content-batch.mjs';

const ROOT = '/opt/xlmarket-github';
const GLOSSARY = path.join(ROOT, 'backend/src/data/glossary.yaml');
const OUT_DIR = path.join(ROOT, 'reports');

const args = process.argv.slice(2);
const getFlag = (name) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] || true) : null; };
const pilotN = getFlag('--pilot') ? parseInt(getFlag('--pilot'), 10) : null;
const skusFile = getFlag('--skus');
const doAll = args.includes('--all');
const doWrite = args.includes('--write');
const useBatch = args.includes('--batch');
const chunkSize = parseInt(getFlag('--chunk') || '2000', 10);
const model = getFlag('--model') || DEFAULT_MODEL;
const useVision = args.includes('--vision');
const CONCURRENCY = parseInt(getFlag('--conc') || '4', 10);
const OUT_LABEL = getFlag('--out') || 'content-pilot-latest';
const carbonN = args.includes('--carbon') ? Math.max(1, parseInt(getFlag('--carbon') !== true ? getFlag('--carbon') : '2', 10)) : 0;

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error('ERR: ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)'); process.exit(1); }

// ---- Toote-veerud (üks SSoT SELECT-fragment) ----
const COLS = `json_build_object(
  'id', p.id, 'sku', p.metadata->>'vevor_sku', 'title', p.title,
  'description', p.description, 'ptype', p.metadata->>'vevor_product_type',
  'specs', p.metadata->'specs', 'sanitized_description', p.metadata->>'sanitized_description',
  'sanitized_rich_description', p.metadata->>'sanitized_rich_description',
  'thumbnail', p.thumbnail )`;

// ---- Seed: garanteeri carbon-steel toode (Fix-1 kontroll) ----
function selectCarbon(k) {
  return psqlJSON(`SELECT ${COLS} FROM product p
    WHERE p.status='published'
      AND (p.title ILIKE '%carbon steel%' OR p.metadata->>'sanitized_rich_description' ILIKE '%carbon steel%' OR p.description ILIKE '%carbon steel%')
      AND LENGTH(COALESCE(p.metadata->>'sanitized_rich_description','')) BETWEEN 200 AND 8000
    ORDER BY md5(p.id) LIMIT ${k};`);
}

function selectPilot(n) {
  const richN = Math.max(1, Math.round(n * 0.7));
  const composedN = n - richN;
  const richRows = psqlJSON(`SELECT ${COLS} FROM (
      SELECT DISTINCT ON (p.metadata->>'vevor_product_type') p.*
      FROM product p
      WHERE p.status='published' AND LENGTH(COALESCE(p.metadata->>'sanitized_rich_description','')) BETWEEN 400 AND 8000
      ORDER BY p.metadata->>'vevor_product_type', md5(p.id)
    ) p LIMIT ${richN};`);
  const composedRows = psqlJSON(`SELECT ${COLS} FROM product p
    WHERE p.status='published' AND LENGTH(COALESCE(p.metadata->>'sanitized_rich_description','')) < 40
      AND p.thumbnail IS NOT NULL
    ORDER BY md5(p.id) LIMIT ${composedN};`);
  return [...richRows, ...composedRows];
}

function selectBySkus(file) {
  const raw = fs.readFileSync(file, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  if (!raw.length) return [];
  const q = (s) => `'${s.replace(/'/g, "''")}'`;
  const list = raw.map(q).join(',');
  // toeta nii product.id kui vevor_sku
  return psqlJSON(`SELECT ${COLS} FROM product p
    WHERE p.status='published' AND (p.id IN (${list}) OR p.metadata->>'vevor_sku' IN (${list}));`);
}

function selectAll() {
  return psqlJSON(`SELECT ${COLS} FROM product p WHERE p.status='published';`);
}

function dedupById(arr) {
  const seen = new Set(); return arr.filter(p => !seen.has(p.id) && seen.add(p.id));
}

// ---- Realtime pool ----
async function runPool(items, worker, conc) {
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (true) { const i = idx++; if (i >= items.length) break; await worker(items[i], i); }
  }));
}

// ---- Markdown-raport (kõik 4 välja) ----
function renderMd(records, meta) {
  const L = [];
  L.push(`# Sisu-generaator — ${meta.label} (${records.length} toodet)\n`);
  L.push(`- Mudel: **${meta.model}** · vision: ${meta.useVision ? 'jah' : 'ei'} · batch: ${meta.useBatch ? 'jah' : 'ei'} · write: ${meta.doWrite ? 'JAH' : 'ei'}`);
  L.push(`- Režiimid: rich=${meta.modeRich}, composed=${meta.modeComposed}`);
  if (meta.doWrite) L.push(`- **DB: kirjutatud ${meta.applied}, backup ${meta.backedUp}, idempotent-skip ${meta.idemSkip}**`);
  L.push(`- Kulu: in=${meta.inTok} tok, out=${meta.outTok} tok, cache_read=${meta.cacheRead} → **~$${meta.costUsd.toFixed(3)}**`);
  L.push(`- Ekstrapoleeritud täis (${meta.corpusN}): ~$${meta.costFull.toFixed(0)} (Batch −50% ~$${(meta.costFull / 2).toFixed(0)})\n---\n`);
  records.forEach((r, i) => {
    L.push(`## ${i + 1}. ${(r.product.title || '').slice(0, 80)}`);
    L.push(`\`${r.product.sku || r.product.id}\` · tüüp: ${r.product.ptype || '—'} · režiim: **${r.mode}**${r.ok ? '' : ' · **VIGA**'}`);
    if (!r.ok) { L.push(`\n> ⛔ ${r.error || r.parseErr}\n`); return; }
    const c = r.content;
    L.push(`\n**title_et:** ${c.title_et}`);
    L.push(`\n**description_et:** ${c.description_et}`);
    L.push(`\n**selling_points_et:**`);
    (c.selling_points_et || []).forEach(sp => L.push(`- ${sp}`));
    L.push(`\n**sanitized_rich_description_et:**\n\n\`\`\`html\n${c.sanitized_rich_description_et}\n\`\`\``);
    if (c.qc_notes && c.qc_notes.length) L.push(`\n_qc_notes:_ ${c.qc_notes.join(' · ')}`);
    L.push(`\n---\n`);
  });
  return L.join('\n');
}

async function main() {
  if (!pilotN && !skusFile && !doAll) { console.error('Kasuta üks: --pilot N | --skus FILE | --all'); process.exit(1); }

  console.log(`[glossary] laadin ${GLOSSARY}`);
  const entries = loadGlossary(GLOSSARY);
  const { termBlock, matchList, lockedCount } = buildGlossaryAssets(entries);
  console.log(`[glossary] ${entries.length} kirjet, ${lockedCount} locked → term-blokk ${termBlock.length} ch, match ${matchList.length}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ndjsonPath = path.join(OUT_DIR, `${OUT_LABEL}.ndjson`);
  fs.writeFileSync(path.join(OUT_DIR, `${OUT_LABEL}.matchlist.json`), JSON.stringify(matchList));

  // RESUME
  const records = [];
  const doneIds = new Set();
  if (fs.existsSync(ndjsonPath)) {
    for (const line of fs.readFileSync(ndjsonPath, 'utf8').trim().split('\n').filter(Boolean)) {
      try { const rec = JSON.parse(line); records.push(rec); doneIds.add(rec.product.id); } catch {}
    }
    console.log(`[resume] ${doneIds.size} juba tehtud`);
  }

  // SELEKTSIOON
  let picked;
  if (doAll) picked = selectAll();
  else if (skusFile) picked = selectBySkus(skusFile);
  else {
    picked = carbonN > 0 ? [...selectCarbon(carbonN), ...selectPilot(pilotN - carbonN)] : selectPilot(pilotN);
  }
  picked = dedupById(picked);
  console.log(`[valik] ${picked.length} toodet`);

  // IDEMPOTENT SKIP (ainult write-režiimis: jäta juba-genereeritud vahele)
  let idemSkip = 0;
  if (doWrite) {
    const f = filterNeedsGen(picked);
    idemSkip = f.skipped;
    picked = f.toWrite;
    console.log(`[idempotent] ${idemSkip} juba genereeritud (hash sama) → vahele; ${picked.length} genereerida`);
  }
  let products = picked.filter(p => !doneIds.has(p.id));

  let done = 0;
  const pushRec = (rec) => { records.push(rec); fs.appendFileSync(ndjsonPath, JSON.stringify(rec) + '\n'); };

  if (useBatch) {
    // ---- BATCH API: submit KÕIK chunkid ette (Anthropic töötleb paralleelselt server-pool),
    //      SIIS poll+write igaüks kui valmis. State-fail → resume (dies → juba-esitatud batchid loetakse). ----
    const statePath = path.join(OUT_DIR, `${OUT_LABEL}.batches.json`);
    const byIdAll = new Map(products.map(p => [p.id, p]));
    let submitted = [];
    if (fs.existsSync(statePath)) {
      try { submitted = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
      if (submitted.length) console.log(`[batch] resume: ${submitted.length} juba-esitatud batchi (${statePath})`);
    }
    if (!submitted.length) {
      const chunks = chunkArr(products, chunkSize);
      console.log(`[batch] ${products.length} toodet → ${chunks.length} chunk(i) × ~${chunkSize} — esitan KÕIK…`);
      for (let ci = 0; ci < chunks.length; ci++) {
        const part = chunks[ci];
        const reqs = part.map(p => ({ custom_id: p.id, params: buildRequestBody(p, { model, termBlock, useVision }).body }));
        const batch = await submitBatch(reqs, KEY);
        submitted.push({ ci, batchId: batch.id, ids: part.map(p => p.id) });
        fs.writeFileSync(statePath, JSON.stringify(submitted));  // persist iga submit järel
        console.log(`  [submit ${ci + 1}/${chunks.length}] batch=${batch.id} n=${reqs.length}`);
      }
      console.log(`[batch] KÕIK ${submitted.length} batchi esitatud → poll+write`);
    }
    let batchApplied = 0, batchBacked = 0;
    const doneChunks = new Set(records.length ? [] : []); // records/ndjson kannab juba-tehtut (resume dedup allpool)
    for (const s of submitted) {
      const already = records.some(r => s.ids.includes(r.product.id));
      if (already) { console.log(`  [poll ${s.ci + 1}] juba töödeldud (ndjson) → vahele`); continue; }
      console.log(`  [poll ${s.ci + 1}/${submitted.length}] batch=${s.batchId}…`);
      const ended = await pollBatch(s.batchId, KEY, {
        onTick: (st) => process.stdout.write(`\r    ${s.batchId} ${JSON.stringify(st.request_counts || {})}   `),
      });
      process.stdout.write('\n');
      const results = await retrieveResults(ended, KEY);
      const chunkRecs = [];
      for (const r of results) {
        const p = byIdAll.get(r.custom_id); if (!p) continue;
        const mode = detectSourceMode(p.sanitized_rich_description);
        if (!r.ok) { pushRec({ product: p, mode, ok: false, error: `batch ${r.errorType}: ${r.error}`, usage: {} }); continue; }
        const { parsed, parseErr } = parseMessage(r.message);
        const rec = { product: p, mode, ok: !!parsed, parseErr, content: parsed, usage: r.message.usage || {} };
        pushRec(rec); if (rec.ok) chunkRecs.push(rec);
      }
      if (doWrite && chunkRecs.length) {
        const w = writeRecords(chunkRecs, { execute: true });
        batchApplied += w.applied; batchBacked += w.backedUp;
        console.log(`  [poll ${s.ci + 1}] valmis (${JSON.stringify(ended.request_counts || {})}) · DB applied=${w.applied} backup=${w.backedUp} (kumulatiiv applied=${batchApplied})`);
      } else {
        console.log(`  [poll ${s.ci + 1}] valmis (${JSON.stringify(ended.request_counts || {})})`);
      }
    }
    if (doWrite) main._w = { applied: batchApplied, backedUp: batchBacked, considered: records.filter(r => r.ok).length };
  } else {
    // ---- REALTIME pool ----
    await runPool(products, async (p) => {
      const r = await generateContent(p, { apiKey: KEY, model, termBlock, useVision });
      const u = r.usage || {};
      pushRec({ product: p, mode: r.mode, ms: r.ms, ok: r.ok, error: r.error, parseErr: r.parseErr, content: r.content, usage: u });
      done++;
      console.log(`  [${done}/${products.length}] ${p.sku || p.id} mode=${r.mode} ok=${r.ok} ${r.ms}ms in=${u.input_tokens} out=${u.output_tokens} cr=${u.cache_read_input_tokens || 0}${r.ok ? '' : ' ERR=' + (r.error || r.parseErr)}`);
    }, CONCURRENCY);
    if (doWrite) {
      const okRecs = records.filter(r => r.ok && r.content);
      const w = writeRecords(okRecs, { execute: true });
      console.log(`[write] DB: applied=${w.applied} backup=${w.backedUp} considered=${w.considered}`);
      main._w = w;
    }
  }

  // agregeeri
  let inTok = 0, outTok = 0, cacheRead = 0, modeRich = 0, modeComposed = 0;
  for (const rec of records) {
    const u = rec.usage || {};
    inTok += u.input_tokens || 0; outTok += u.output_tokens || 0; cacheRead += u.cache_read_input_tokens || 0;
    if (rec.mode === 'rich') modeRich++; else modeComposed++;
  }
  const IN = 2 / 1e6, OUT = 10 / 1e6, CR = 0.2 / 1e6;
  const costUsd = inTok * IN + outTok * OUT + cacheRead * CR;
  const corpusN = 18745;
  const costFull = (costUsd / Math.max(1, records.length)) * corpusN;
  const w = main._w || {};

  const mdPath = path.join(OUT_DIR, `${OUT_LABEL}.md`);
  fs.writeFileSync(mdPath, renderMd(records, {
    label: doAll ? 'BACKFILL' : (skusFile ? 'DELTA' : 'PILOOT'), model, useVision, useBatch, doWrite,
    inTok, outTok, cacheRead, modeRich, modeComposed, costUsd, costFull, corpusN,
    applied: w.applied || 0, backedUp: w.backedUp || 0, idemSkip,
  }));

  console.log(`\n✅ VALMIS · ok=${records.filter(r => r.ok).length}/${records.length} · rich=${modeRich} composed=${modeComposed}`);
  console.log(`   Raport: ${mdPath}`);
  console.log(`   Kulu: ~$${costUsd.toFixed(3)} · täis ~$${costFull.toFixed(0)} (Batch ~$${(costFull / 2).toFixed(0)})`);
  if (doWrite) console.log(`   DB: applied=${w.applied || 0} backup=${w.backedUp || 0} idempotent-skip=${idemSkip}`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
