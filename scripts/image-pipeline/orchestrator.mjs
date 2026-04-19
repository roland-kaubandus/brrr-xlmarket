#!/usr/bin/env node
/**
 * Orchestrator — 3-strike pipeline per handle:
 *   Strike 1: Scout VEVOR candidate #1  → Gatekeeper
 *   Strike 2: Scout VEVOR candidate #2  → Gatekeeper
 *   Strike 3: Generator nano-banana #1  → Gatekeeper
 *   Strike 4: Generator nano-banana #2  → Gatekeeper (reason-adjusted prompt)
 *   FAIL    → review-queue.json
 *
 * Usage:
 *   node orchestrator.mjs --limit N --level L --only <handle>
 *     --limit   max handles this run (default all remaining)
 *     --level   only handles at this level (1-7)
 *     --only    single handle override
 *     --dry-run don't actually run (report plan)
 *     --concurrency N (default 3)
 *
 * State persisted in reports/image-gen-2026-04-19/state.json (resume-safe).
 */
import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORTS = '/home/brrr/brrr-xlmarket/reports/image-gen-2026-04-19';
const CAT_THUMBS = '/home/brrr/brrr-xlmarket/storefront/public/cat-thumbs';
const ALIAS_YAML = '/home/brrr/brrr-xlmarket/backend/src/data/taxonomy-image-aliases.yaml';
const SCRIPT_DIR = '/home/brrr/brrr-xlmarket/scripts/image-pipeline';
const STATE_FILE = join(REPORTS, 'state.json');
const REJECTIONS = join(REPORTS, 'rejections.jsonl');
const REVIEW_QUEUE = join(REPORTS, 'review-queue.json');
const SUMMARY = join(REPORTS, 'summary.md');
const MISSING = join(REPORTS, 'missing-handles.json');
const L1_SEEDS = join(SCRIPT_DIR, 'l1-seeds.json');
const l1Seeds = existsSync(L1_SEEDS) ? JSON.parse(readFileSync(L1_SEEDS, 'utf8')) : {};

const args = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  const o = { limit: Infinity, level: null, only: null, dryRun: false, concurrency: 3 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') o.limit = parseInt(argv[++i], 10);
    else if (a === '--level') o.level = parseInt(argv[++i], 10);
    else if (a === '--only') o.only = argv[++i];
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--concurrency') o.concurrency = parseInt(argv[++i], 10);
  }
  return o;
}

function ensureDirs() {
  for (const d of [REPORTS, join(REPORTS, 'candidates'), join(REPORTS, 'accepted'), CAT_THUMBS]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

function loadState() {
  if (!existsSync(STATE_FILE)) return { done: {}, failed: {} };
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function nowIso() { return new Date().toISOString(); }

function logRejection(entry) {
  appendFileSync(REJECTIONS, JSON.stringify({ ...entry, ts: nowIso() }) + '\n');
}

function runScout(handle) {
  const r = spawnSync('node', [join(SCRIPT_DIR, 'scout.mjs'), handle], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isRateLimit(res) {
  const s = `${res.reason || ''}`;
  return s.includes('429') || s.includes('RESOURCE_EXHAUSTED') || s.includes('503') || s.includes('UNAVAILABLE');
}

async function runGatekeeperUrl(handle, nameEn, url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = spawnSync('uv', ['run', '--quiet', join(SCRIPT_DIR, 'gatekeeper.py'),
      '--handle', handle, '--name-en', nameEn, '--image-url', url
    ], { encoding: 'utf8', env: { ...process.env }, timeout: 120_000 });
    let res;
    try { res = JSON.parse((r.stdout || '').trim().split('\n').pop()); }
    catch { res = { pass: false, reason: `gatekeeper parse fail: ${r.stderr?.slice(0, 200)}` }; }
    if (!isRateLimit(res)) return res;
    const wait = [15_000, 45_000, 120_000, 300_000][attempt] || 300_000;
    process.stderr.write(`  (rate-limit, sleep ${wait/1000}s) `);
    await sleep(wait);
  }
  return { pass: false, reason: 'gatekeeper rate-limited 4x' };
}

async function runGatekeeperFile(handle, nameEn, path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = spawnSync('uv', ['run', '--quiet', join(SCRIPT_DIR, 'gatekeeper.py'),
      '--handle', handle, '--name-en', nameEn, '--image', path
    ], { encoding: 'utf8', env: { ...process.env }, timeout: 120_000 });
    let res;
    try { res = JSON.parse((r.stdout || '').trim().split('\n').pop()); }
    catch { res = { pass: false, reason: `gatekeeper parse fail: ${r.stderr?.slice(0, 200)}` }; }
    if (!isRateLimit(res)) return res;
    const wait = [15_000, 45_000, 120_000, 300_000][attempt] || 300_000;
    process.stderr.write(`  (rate-limit, sleep ${wait/1000}s) `);
    await sleep(wait);
  }
  return { pass: false, reason: 'gatekeeper rate-limited 4x' };
}

async function runGenerator(handle, outputPath, prompt) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = spawnSync('bash', [join(SCRIPT_DIR, 'generator.sh'), handle, outputPath, prompt],
      { encoding: 'utf8', env: { ...process.env }, timeout: 180_000 });
    const ok = r.status === 0 && existsSync(outputPath) && statSync(outputPath).size > 1000;
    if (ok) return true;
    const err = `${r.stderr || ''}${r.stdout || ''}`;
    if (!/429|RESOURCE_EXHAUSTED|503|UNAVAILABLE/.test(err)) return false;
    const wait = [20_000, 60_000, 180_000, 360_000][attempt] || 360_000;
    process.stderr.write(`  (gen rate-limit, sleep ${wait/1000}s) `);
    await sleep(wait);
  }
  return false;
}

function buildPrompt(seed, nameEn, reasonHint) {
  const subject = seed.primary_product || nameEn.toLowerCase();
  const base = `Professional product photograph of a ${subject}, ${seed.detail_hint || 'commercial grade'}, pure white seamless background (#FFFFFF), soft even studio lighting, centered composition, commercial catalog style, high detail, sharp focus, no text, no logos, no people, no watermarks, no accessories, square crop.`;
  let extra = '';
  if (reasonHint) {
    const r = reasonHint.toLowerCase();
    if (r.includes('background') || r.includes('lifestyle')) extra += ' STRICTLY pure white #FFFFFF background. No shadows, no gradients, no scenery.';
    if (r.includes('multiple') || r.includes('accessor') || r.includes('drink')) extra += ' Single isolated product only, no props, no accessories, no other items.';
    if (r.includes('recogniz') || r.includes('not') && r.includes('machine')) extra += ` Clearly shows a ${nameEn}, viewed from the front at a slight 3/4 angle.`;
    if (r.includes('text') || r.includes('logo') || r.includes('watermark')) extra += ' No text, no logos, no labels visible on product.';
  }
  return base + extra;
}

function convertToWebp150(pngPath, webpPath) {
  const r = spawnSync('python3', ['-c',
    `from PIL import Image; im=Image.open('${pngPath}'); im=im.convert('RGB'); im.thumbnail((1200,1200), Image.LANCZOS); bg=Image.new('RGB',(1200,1200),(255,255,255)); bg.paste(im,((1200-im.size[0])//2,(1200-im.size[1])//2)); bg.resize((150,150), Image.LANCZOS).save('${webpPath}','webp', quality=88, method=6)`
  ], { encoding: 'utf8' });
  return r.status === 0 && existsSync(webpPath);
}

function appendAlias(handle, legacySlug) {
  const line = `${handle}: ${legacySlug}\n`;
  // Don't actually append to YAML file automatically; log for manual review
  appendFileSync(join(REPORTS, 'alias-appends.txt'), line);
}

async function processHandle(handle, node, state) {
  const nameEn = node.name_en;
  const label = `[L${node.level}] ${handle}`;

  const scout = runScout(handle);
  if (!scout) {
    console.error(`${label}  scout failed`);
    return { status: 'fail', reason: 'scout failed', strikes: 0 };
  }

  let reasonHint = '';

  // Strikes 1-3: VEVOR candidates (3 candidates, take best match first)
  const vevorTries = Math.min(3, scout.candidates.length);
  for (let s = 0; s < vevorTries; s++) {
    const cand = scout.candidates[s];
    process.stderr.write(`${label}  strike ${s+1} VEVOR ${cand.url.slice(-50)}... `);
    const verdict = await runGatekeeperUrl(handle, nameEn, cand.url);
    if (verdict.pass) {
      process.stderr.write('PASS\n');
      // Download and save as webp
      const tmpPng = join(REPORTS, 'candidates', handle, `try-${s+1}.png`);
      mkdirSync(dirname(tmpPng), { recursive: true });
      const dlR = spawnSync('curl', ['-sL', '-o', tmpPng, cand.url], { timeout: 30_000 });
      if (dlR.status === 0 && existsSync(tmpPng) && statSync(tmpPng).size > 1000) {
        const webpOut = join(CAT_THUMBS, `${handle}.webp`);
        if (convertToWebp150(tmpPng, webpOut)) {
          return { status: 'pass', source: 'vevor', strike: s+1, detected: verdict.detected_subject, webp: webpOut };
        }
      }
      process.stderr.write(`${label}  convert failed, continuing\n`);
    } else {
      process.stderr.write(`FAIL (${verdict.reason?.slice(0,60) || 'no reason'})\n`);
    }
    logRejection({ handle, strike: s+1, source: 'vevor', candidate_url: cand.url, ...verdict });
    reasonHint = verdict.reason || reasonHint;
  }

  // Strikes 4 & 5: nano-banana pro
  // Use curated L1 seed if available, else scout-derived seed
  const genSeed = (node.level === 1 && l1Seeds[handle]) ? l1Seeds[handle] : scout.seed;
  for (let g = 0; g < 2; g++) {
    const strike = vevorTries + 1 + g;
    const outPng = join(REPORTS, 'candidates', handle, `try-${strike}.png`);
    mkdirSync(dirname(outPng), { recursive: true });
    const prompt = buildPrompt(genSeed, nameEn, g === 0 ? '' : reasonHint);
    process.stderr.write(`${label}  strike ${strike} nano-banana... `);
    if (!(await runGenerator(handle, outPng, prompt))) {
      process.stderr.write('GEN FAIL\n');
      logRejection({ handle, strike, source: 'nano-banana', reason: 'generator failed' });
      continue;
    }
    const verdict = await runGatekeeperFile(handle, nameEn, outPng);
    if (verdict.pass) {
      process.stderr.write('PASS\n');
      const acceptedPng = join(REPORTS, 'accepted', `${handle}.png`);
      copyFileSync(outPng, acceptedPng);
      const webpOut = join(CAT_THUMBS, `${handle}.webp`);
      if (convertToWebp150(outPng, webpOut)) {
        return { status: 'pass', source: 'nano-banana', strike, detected: verdict.detected_subject, webp: webpOut, prompt };
      }
      process.stderr.write(`${label}  convert failed\n`);
    } else {
      process.stderr.write(`FAIL (${verdict.reason?.slice(0,60) || 'no reason'})\n`);
    }
    logRejection({ handle, strike, source: 'nano-banana', prompt, ...verdict });
    reasonHint = verdict.reason || reasonHint;
  }

  return { status: 'fail', reason: reasonHint || 'exhausted 4 strikes', strikes: 4 };
}

async function main() {
  ensureDirs();
  const state = loadState();
  const missing = JSON.parse(readFileSync(MISSING, 'utf8'));

  let queue = missing.filter(m => {
    if (state.done[m.handle]) return false;
    if (args.only) return m.handle === args.only;
    if (args.level !== null && m.level !== args.level) return false;
    return true;
  });

  queue = queue.slice(0, args.limit);

  console.error(`pipeline: ${queue.length} handles to process, concurrency=${args.concurrency}`);
  if (args.dryRun) {
    for (const h of queue.slice(0, 10)) console.error(`  would process: L${h.level} ${h.handle}`);
    if (queue.length > 10) console.error(`  ... +${queue.length - 10} more`);
    process.exit(0);
  }

  const tree = JSON.parse(readFileSync('/home/brrr/brrr-xlmarket/storefront/lib/category-tree.generated.json', 'utf8'));

  // Simple concurrency via chunk processing
  const conc = Math.max(1, args.concurrency);
  let idx = 0;
  let processed = 0;
  const workers = Array.from({ length: conc }, async () => {
    while (true) {
      const myIdx = idx++;
      if (myIdx >= queue.length) break;
      const item = queue[myIdx];
      const node = tree.nodes[item.handle];
      if (!node) continue;
      const result = await processHandle(item.handle, node, state);
      if (result.status === 'pass') {
        state.done[item.handle] = { source: result.source, strike: result.strike, detected: result.detected, ts: nowIso() };
      } else {
        state.failed[item.handle] = { reason: result.reason, strikes: result.strikes, ts: nowIso() };
      }
      processed++;
      if (processed % 5 === 0) saveState(state);
    }
  });
  await Promise.all(workers);
  saveState(state);

  // Write review queue
  const failed = Object.entries(state.failed).map(([handle, info]) => ({ handle, ...info }));
  writeFileSync(REVIEW_QUEUE, JSON.stringify(failed, null, 2));

  const doneCount = Object.keys(state.done).length;
  const failCount = Object.keys(state.failed).length;
  console.error(`\n=== Pipeline complete: ${doneCount} done, ${failCount} review-queue ===`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
