#!/usr/bin/env node
// content-gen-run.mjs — SISU-GENERAATORI kutsuja (HARD RULE #5).
//   --pilot N        : vali N mitmekesist toodet, genereeri, kirjuta raport (EI puuduta DB-d)
//   --skus a,b,c     : delta (öine hook) — genereeri nimekirjale  [pipeline-hook, hiljem]
//   --all            : backfill kogu korpus                       [backfill-runner, hiljem]
//   --write          : (mitte-pilot) kirjuta tulemused DB metadata'sse
//
// PILOOT EI KIRJUTA DB-sse — ainult reports/*.ndjson + reports/*.md ülevaatuseks.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadGlossary, buildGlossaryAssets, generateContent, detectSourceMode, DEFAULT_MODEL } from './lib/content-gen.mjs';

const ROOT = '/opt/xlmarket-github';
const GLOSSARY = path.join(ROOT, 'backend/src/data/glossary.yaml');
const OUT_DIR = path.join(ROOT, 'reports');

const args = process.argv.slice(2);
const getFlag = (name) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] || true) : null; };
const pilotN = getFlag('--pilot') ? parseInt(getFlag('--pilot'), 10) : null;
const model = getFlag('--model') || DEFAULT_MODEL;
const useVision = args.includes('--vision');

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error('ERR: ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)'); process.exit(1); }

// ---- DB helper (dünaamiline konteineri-nimi) ----
function dbContainer() {
  const names = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' });
  const c = names.split('\n').find(n => n.startsWith('db-k33g'));
  if (!c) throw new Error('db-k33g konteinerit ei leitud');
  return c.trim();
}
function psqlJSON(sql) {
  const c = dbContainer();
  const out = execFileSync('docker', ['exec', '-i', c, 'psql', '-U', 'xlmarket', '-d', 'xlmarket', '-t', '-A', '-c', sql], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return out.split('\n').filter(Boolean).map(l => JSON.parse(l));
}

// ---- Seed: garanteeri vähemalt üks "carbon steel" toode (Fix-1 kontroll) ----
function selectCarbon(k) {
  const cols = `json_build_object(
    'id', p.id, 'sku', p.metadata->>'vevor_sku', 'title', p.title,
    'description', p.description, 'ptype', p.metadata->>'vevor_product_type',
    'specs', p.metadata->'specs', 'sanitized_description', p.metadata->>'sanitized_description',
    'sanitized_rich_description', p.metadata->>'sanitized_rich_description',
    'thumbnail', p.thumbnail )`;
  return psqlJSON(`
    SELECT ${cols} FROM product p
    WHERE p.status='published'
      AND (p.title ILIKE '%carbon steel%'
        OR p.metadata->>'sanitized_rich_description' ILIKE '%carbon steel%'
        OR p.description ILIKE '%carbon steel%')
      AND LENGTH(COALESCE(p.metadata->>'sanitized_rich_description','')) BETWEEN 200 AND 8000
    ORDER BY md5(p.id) LIMIT ${k};`);
}

// ---- Piloodi valik: mitmekesised klastrid + junk-allikas + õhuke-tekst ----
function selectPilot(n) {
  // Jaotus: ~70% rich-olemas (mitmekesised tüübid), ~30% composed (rich puudub, sh õhuke → pilt)
  const richN = Math.max(1, Math.round(n * 0.7));
  const composedN = n - richN;
  const cols = `json_build_object(
    'id', p.id, 'sku', p.metadata->>'vevor_sku', 'title', p.title,
    'description', p.description, 'ptype', p.metadata->>'vevor_product_type',
    'specs', p.metadata->'specs', 'sanitized_description', p.metadata->>'sanitized_description',
    'sanitized_rich_description', p.metadata->>'sanitized_rich_description',
    'thumbnail', p.thumbnail )`;
  // rich-olemas: DISTINCT ON vevor_product_type → mitmekesisus
  const richRows = psqlJSON(`
    SELECT ${cols} FROM (
      SELECT DISTINCT ON (p.metadata->>'vevor_product_type') p.*
      FROM product p
      WHERE p.status='published'
        AND LENGTH(COALESCE(p.metadata->>'sanitized_rich_description','')) BETWEEN 400 AND 8000
      ORDER BY p.metadata->>'vevor_product_type', md5(p.id)
    ) p LIMIT ${richN};`);
  // composed: rich puudub (sh õhuke-tekst → pilt-kandidaat)
  const composedRows = psqlJSON(`
    SELECT ${cols} FROM product p
    WHERE p.status='published'
      AND LENGTH(COALESCE(p.metadata->>'sanitized_rich_description','')) < 40
      AND p.thumbnail IS NOT NULL
    ORDER BY md5(p.id) LIMIT ${composedN};`);
  return [...richRows, ...composedRows];
}

// ---- Markdown-raport (TÄIELIK, kõik 4 välja — kvaliteedi hindamiseks) ----
function renderMd(records, meta) {
  const L = [];
  L.push(`# Sisu-generaator — PILOOT (${records.length} toodet)\n`);
  L.push(`- Mudel: **${meta.model}** · vision: ${meta.useVision ? 'jah' : 'ei'} · ${meta.ts}`);
  L.push(`- Režiimid: rich=${meta.modeRich}, composed=${meta.modeComposed}`);
  L.push(`- Kulu: in=${meta.inTok} tok, out=${meta.outTok} tok, cache_read=${meta.cacheRead} → **~$${meta.costUsd.toFixed(3)}** (piloot)`);
  L.push(`- Ekstrapoleeritud täis-jooks (${meta.corpusN} toodet): **~$${meta.costFull.toFixed(0)}** (Batch API −50% → ~$${(meta.costFull/2).toFixed(0)})\n`);
  L.push(`---\n`);
  records.forEach((r, i) => {
    L.push(`## ${i + 1}. ${r.product.title.slice(0, 80)}${r.product.title.length > 80 ? '…' : ''}`);
    L.push(`\`${r.product.sku || r.product.id}\` · tüüp: ${r.product.ptype || '—'} · režiim: **${r.mode}** · ${r.ms}ms${r.ok ? '' : ' · **VIGA**'}`);
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

const CONCURRENCY = parseInt(getFlag('--conc') || '4', 10);
const OUT_LABEL = getFlag('--out') || 'content-pilot-latest';

async function runPool(items, worker, conc) {
  let idx = 0;
  const runners = Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

async function main() {
  if (!pilotN) { console.error('Kasuta: --pilot N [--model X] [--vision] [--conc 4]'); process.exit(1); }

  console.log(`[glossary] laadin ${GLOSSARY}`);
  const entries = loadGlossary(GLOSSARY);
  const { termBlock, matchList, lockedCount } = buildGlossaryAssets(entries);
  console.log(`[glossary] ${entries.length} kirjet, ${lockedCount} locked → term-blokk ${termBlock.length} tähemärki, match-nimekiri ${matchList.length}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ndjsonPath = path.join(OUT_DIR, `${OUT_LABEL}.ndjson`);
  fs.writeFileSync(path.join(OUT_DIR, `${OUT_LABEL}.matchlist.json`), JSON.stringify(matchList));

  // RESUME: loe olemasolev NDJSON, jäta juba-tehtud id-d vahele
  const records = [];
  const doneIds = new Set();
  if (fs.existsSync(ndjsonPath)) {
    for (const line of fs.readFileSync(ndjsonPath, 'utf8').trim().split('\n').filter(Boolean)) {
      try { const rec = JSON.parse(line); records.push(rec); doneIds.add(rec.product.id); } catch {}
    }
    console.log(`[resume] ${doneIds.size} juba tehtud (jätkan)`);
  }

  console.log(`[valik] piloot ${pilotN} toodet…`);
  const carbonN = args.includes('--carbon') ? Math.max(1, parseInt(getFlag('--carbon') !== true ? getFlag('--carbon') : '2', 10)) : 0;
  let picked = [];
  if (carbonN > 0) {
    const carbon = selectCarbon(carbonN);
    console.log(`[valik] +${carbon.length} carbon-steel seed`);
    picked = [...carbon, ...selectPilot(pilotN - carbon.length)];
    // dedup id
    const seen = new Set(); picked = picked.filter(p => !seen.has(p.id) && seen.add(p.id));
  } else {
    picked = selectPilot(pilotN);
  }
  const products = picked.filter(p => !doneIds.has(p.id));
  console.log(`[valik] ${products.length} genereerida (conc=${CONCURRENCY})`);

  let done = 0;
  await runPool(products, async (p) => {
    const r = await generateContent(p, { apiKey: KEY, model, termBlock, useVision });
    const u = r.usage || {};
    const rec = { product: p, mode: r.mode, ms: r.ms, ok: r.ok, error: r.error, parseErr: r.parseErr, content: r.content, usage: u };
    records.push(rec);
    fs.appendFileSync(ndjsonPath, JSON.stringify(rec) + '\n');   // CHECKPOINT per toode
    done++;
    console.log(`  [${done}/${products.length}] ${p.sku || p.id} mode=${r.mode} ok=${r.ok} ${r.ms}ms in=${u.input_tokens} out=${u.output_tokens} cr=${u.cache_read_input_tokens || 0}${r.ok ? '' : ' ERR=' + (r.error || r.parseErr)}`);
  }, CONCURRENCY);

  // agregeeri KÕIGIST (resume + uued)
  let inTok = 0, outTok = 0, cacheRead = 0, modeRich = 0, modeComposed = 0;
  for (const rec of records) {
    const u = rec.usage || {};
    inTok += u.input_tokens || 0; outTok += u.output_tokens || 0; cacheRead += u.cache_read_input_tokens || 0;
    if (rec.mode === 'rich') modeRich++; else modeComposed++;
  }
  const ts = OUT_LABEL;

  // Kulu (Sonnet 5 intro: $2/1M in, $10/1M out; cache_read 10% in-hinnast)
  const IN = 2 / 1e6, OUT = 10 / 1e6, CR = 0.2 / 1e6;
  const costUsd = inTok * IN + outTok * OUT + cacheRead * CR;
  const perProduct = costUsd / Math.max(1, records.length);
  const corpusN = 18745;
  const costFull = perProduct * corpusN;

  const mdPath = path.join(OUT_DIR, `${ts}.md`);
  fs.writeFileSync(mdPath, renderMd(records, { model, useVision, ts, inTok, outTok, cacheRead, modeRich, modeComposed, costUsd, costFull, corpusN }));

  console.log(`\n✅ PILOOT VALMIS`);
  console.log(`   NDJSON: ${ndjsonPath}`);
  console.log(`   Raport: ${mdPath}`);
  console.log(`   Kulu piloot: ~$${costUsd.toFixed(3)} · täis-jooks ~$${costFull.toFixed(0)} (Batch −50% ~$${(costFull/2).toFixed(0)})`);
  console.log(`   ok=${records.filter(r => r.ok).length}/${records.length} · rich=${modeRich} composed=${modeComposed}`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
