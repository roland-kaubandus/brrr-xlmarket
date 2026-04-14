/**
 * review-category-icons.mjs
 *
 * Validates category icon image quality from search-results-merged.json.
 * Downloads each image, analyzes with sharp, scores on 5 criteria,
 * and splits results into pass/retry queues.
 *
 * Usage: node backend/scripts/review-category-icons.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('/home/brrr/brrr-xlmarket/storefront/node_modules/sharp');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../../data/category-icons');

const BATCH_SIZE = 10;
const DOWNLOAD_TIMEOUT = 8000;

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

async function downloadImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Image analysis
// ---------------------------------------------------------------------------

async function analyzeImage(buf) {
  const meta = await sharp(buf).metadata();
  const { width, height } = meta;
  const largeEnough = width >= 200 && height >= 200;

  // Corner pixel check (10x10 resize, check 4 corners)
  const small = await sharp(buf)
    .resize(10, 10, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();

  // Pixels are [r,g,b, r,g,b, ...] — 10*10*3 = 300 bytes
  const isWhitePixel = (offset) =>
    small[offset] > 230 && small[offset + 1] > 230 && small[offset + 2] > 230;

  const corners = [
    0,                    // top-left (0,0)
    (10 - 1) * 3,        // top-right (9,0)
    (10 * (10 - 1)) * 3, // bottom-left (0,9)
    (10 * 10 - 1) * 3,   // bottom-right (9,9)
  ];
  const whiteCorners = corners.filter(o => isWhitePixel(o)).length;

  // Background ratio (50x50 resize)
  const medium = await sharp(buf)
    .resize(50, 50, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();

  const totalPixels = 50 * 50;
  let whitePixels = 0;
  for (let i = 0; i < medium.length; i += 3) {
    if (medium[i] > 230 && medium[i + 1] > 230 && medium[i + 2] > 230) {
      whitePixels++;
    }
  }
  const bgRatio = whitePixels / totalPixels;

  return { width, height, largeEnough, whiteCorners, bgRatio };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreImage(analysis) {
  const { width, whiteCorners, bgRatio } = analysis;

  // 1. White background (0-10)
  let whiteBg = whiteCorners * 2.5;
  if (bgRatio > 0.3) whiteBg = Math.min(10, whiteBg + 2);

  // 2. Single object (0-10)
  let singleObj;
  if (bgRatio >= 0.2 && bgRatio <= 0.7) singleObj = 8;
  else if (bgRatio > 0.7) singleObj = 5;
  else singleObj = 3;

  // 3. Recognizable at 80px (0-10)
  let recognizable;
  if (width >= 400) recognizable = 9;
  else if (width >= 200) recognizable = 6;
  else recognizable = 3;

  // 4. Representative (neutral — can't auto-judge)
  const representative = 6;

  // 5. Lighting (0-10)
  let lighting;
  if (whiteCorners >= 3) lighting = 8;
  else if (whiteCorners >= 2) lighting = 5;
  else lighting = 3;

  const scores = { whiteBg, singleObj, recognizable, representative, lighting };
  const avg = (whiteBg + singleObj + recognizable + representative + lighting) / 5;

  return { scores, avg };
}

// ---------------------------------------------------------------------------
// Process a single entry
// ---------------------------------------------------------------------------

async function processEntry(entry) {
  const result = { ...entry, reviewStatus: null, reviewScores: null, reviewAvg: null, reviewError: null };

  if (entry.reason !== 'found' || !entry.imageUrl) {
    result.reviewStatus = 'no_image';
    return result;
  }

  try {
    const buf = await downloadImage(entry.imageUrl);
    const analysis = await analyzeImage(buf);

    if (!analysis.largeEnough) {
      result.reviewStatus = 'too_small';
      result.reviewError = `${analysis.width}x${analysis.height}`;
      return result;
    }

    const { scores, avg } = scoreImage(analysis);
    result.reviewScores = scores;
    result.reviewAvg = Math.round(avg * 100) / 100;

    if (avg >= 6) {
      result.reviewStatus = 'pass';
    } else if (entry.runnerUp?.imageUrl) {
      // Try runner-up
      try {
        const buf2 = await downloadImage(entry.runnerUp.imageUrl);
        const analysis2 = await analyzeImage(buf2);
        if (analysis2.largeEnough) {
          const score2 = scoreImage(analysis2);
          if (score2.avg >= 6) {
            result.imageUrl = entry.runnerUp.imageUrl;
            result.reviewScores = score2.scores;
            result.reviewAvg = Math.round(score2.avg * 100) / 100;
            result.reviewStatus = 'pending_recheck';
            result.promotedRunnerUp = true;
            return result;
          }
        }
      } catch {
        // runner-up download failed, fall through to fail
      }
      result.reviewStatus = 'fail';
    } else {
      result.reviewStatus = 'fail';
    }
  } catch (err) {
    result.reviewStatus = 'download_error';
    result.reviewError = err.message;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const inputPath = join(DATA_DIR, 'search-results-merged.json');
  const entries = JSON.parse(await readFile(inputPath, 'utf-8'));
  console.log(`Loaded ${entries.length} entries`);

  const results = [];
  let processed = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(e => processEntry(e)));
    results.push(...batchResults);
    processed += batch.length;

    if (processed % 100 === 0 || processed === entries.length) {
      const counts = {};
      results.forEach(r => { counts[r.reviewStatus] = (counts[r.reviewStatus] || 0) + 1; });
      console.log(`Progress: ${processed}/${entries.length} — ${JSON.stringify(counts)}`);
    }
  }

  // Split into pass/retry
  const passed = results.filter(r => r.reviewStatus === 'pass' || r.reviewStatus === 'pending_recheck');
  const retry = results.filter(r => r.reviewStatus !== 'pass' && r.reviewStatus !== 'pending_recheck');

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'review-results.json'), JSON.stringify(passed, null, 2));
  await writeFile(join(DATA_DIR, 'retry-queue.json'), JSON.stringify(retry, null, 2));

  // Summary
  const statusCounts = {};
  results.forEach(r => { statusCounts[r.reviewStatus] = (statusCounts[r.reviewStatus] || 0) + 1; });
  console.log('\n=== REVIEW COMPLETE ===');
  console.log(`Total: ${results.length}`);
  console.log('Status breakdown:', statusCounts);
  console.log(`review-results.json: ${passed.length} entries`);
  console.log(`retry-queue.json: ${retry.length} entries`);

  // L1 status
  const l1 = results.filter(r => r.level === 1);
  const l1pass = l1.filter(r => r.reviewStatus === 'pass' || r.reviewStatus === 'pending_recheck');
  const l1fail = l1.filter(r => r.reviewStatus !== 'pass' && r.reviewStatus !== 'pending_recheck');
  console.log(`\nL1 categories: ${l1.length} total, ${l1pass.length} pass, ${l1fail.length} fail/retry`);
  if (l1fail.length > 0) {
    console.log('L1 failures:');
    l1fail.forEach(r => console.log(`  - ${r.handle} (${r.name}): ${r.reviewStatus} ${r.reviewError || ''}`));
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
