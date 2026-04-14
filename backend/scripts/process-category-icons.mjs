#!/usr/bin/env node
/**
 * process-category-icons.mjs
 * Downloads approved category images and resizes to 80x80 + 400x400 WebP.
 *
 * Usage: node backend/scripts/process-category-icons.mjs
 */

import { createWriteStream, mkdirSync, existsSync, statSync, readdirSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Paths
const REVIEW_RESULTS = resolve(__dirname, '../../data/category-icons/review-results.json');
const OUT_80  = resolve(__dirname, '../../storefront/public/cat-icons/80');
const OUT_400 = resolve(__dirname, '../../storefront/public/cat-icons/400');
const MANIFEST = resolve(__dirname, '../../storefront/public/cat-icons/manifest.json');
const SHARP_PATH = resolve(__dirname, '../../storefront/node_modules/sharp');

const BATCH_SIZE = 5;
const DOWNLOAD_TIMEOUT_MS = 10_000;

// Load sharp from storefront node_modules
const sharp = require(SHARP_PATH);

// Create output dirs
mkdirSync(OUT_80,  { recursive: true });
mkdirSync(OUT_400, { recursive: true });

/**
 * Download a URL into a Buffer with timeout.
 */
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    }, DOWNLOAD_TIMEOUT_MS);

    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timer);
        req.destroy();
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        clearTimeout(timer);
        req.destroy();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks));
      });
      res.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Process a single entry: download + resize to 400 and 80.
 */
async function processEntry(entry) {
  const { handle, imageUrl } = entry;
  const out400 = `${OUT_400}/${handle}.webp`;
  const out80  = `${OUT_80}/${handle}.webp`;

  // Skip if both already exist
  if (existsSync(out400) && existsSync(out80)) {
    return { handle, skipped: true };
  }

  const buf = await downloadBuffer(imageUrl);

  const whiteBg = { r: 255, g: 255, b: 255, alpha: 1 };

  // 400x400
  await sharp(buf)
    .resize(400, 400, { fit: 'contain', background: whiteBg })
    .flatten({ background: whiteBg })
    .webp({ quality: 85 })
    .toFile(out400);

  // 80x80
  await sharp(buf)
    .resize(80, 80, { fit: 'contain', background: whiteBg })
    .flatten({ background: whiteBg })
    .webp({ quality: 80 })
    .toFile(out80);

  return { handle, skipped: false };
}

/**
 * Run an array of async tasks in batches.
 */
async function runBatched(items, batchSize, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

async function main() {
  console.log('Reading review results…');
  const raw = await readFile(REVIEW_RESULTS, 'utf-8');
  const allEntries = JSON.parse(raw);

  // Filter: pass or pending_recheck, and must have imageUrl
  const entries = allEntries.filter(
    (e) => (e.reviewStatus === 'pass' || e.reviewStatus === 'pending_recheck') && e.imageUrl
  );

  console.log(`Entries to process: ${entries.length} (${allEntries.filter(e => e.reviewStatus === 'pass').length} pass, ${allEntries.filter(e => e.reviewStatus === 'pending_recheck').length} pending_recheck)`);
  console.log(`Output dirs: ${OUT_80}  |  ${OUT_400}`);
  console.log(`Batch size: ${BATCH_SIZE}, timeout: ${DOWNLOAD_TIMEOUT_MS}ms\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const errorList = [];

  // Process in batches, logging every 100
  const results = await runBatched(entries, BATCH_SIZE, async (entry) => {
    const result = await processEntry(entry);
    processed++;
    if (result.skipped) skipped++;
    if (processed % 100 === 0) {
      console.log(`Progress: ${processed}/${entries.length} (errors: ${errors}, skipped: ${skipped})`);
    }
    return result;
  });

  // Count errors from allSettled
  processed = 0;
  skipped = 0;
  errors = 0;
  const manifest = {};

  for (let i = 0; i < results.length; i++) {
    const entry = entries[i];
    const r = results[i];
    if (r.status === 'fulfilled') {
      if (r.value.skipped) {
        skipped++;
      } else {
        processed++;
      }
      // Add to manifest regardless (skipped means file exists)
      manifest[entry.handle] = {
        sm: `/cat-icons/80/${entry.handle}.webp`,
        md: `/cat-icons/400/${entry.handle}.webp`,
      };
    } else {
      errors++;
      errorList.push({ handle: entry.handle, error: r.reason?.message });
    }
  }

  // Sort manifest by key
  const sortedManifest = Object.fromEntries(
    Object.keys(manifest).sort().map((k) => [k, manifest[k]])
  );

  console.log('\nWriting manifest…');
  writeFileSync(MANIFEST, JSON.stringify(sortedManifest, null, 2));

  // Stats
  console.log('\n=== DONE ===');
  console.log(`Processed (downloaded+resized): ${processed}`);
  console.log(`Skipped (already existed):      ${skipped}`);
  console.log(`Errors:                         ${errors}`);
  console.log(`Manifest entries:               ${Object.keys(sortedManifest).length}`);

  if (errorList.length > 0) {
    console.log('\nFirst 20 errors:');
    errorList.slice(0, 20).forEach((e) => console.log(`  ${e.handle}: ${e.error}`));
  }

  // File size stats
  function dirStats(dir) {
    if (!existsSync(dir)) return { count: 0, totalBytes: 0, avgBytes: 0 };
    const files = readdirSync(dir).filter((f) => f.endsWith('.webp'));
    if (files.length === 0) return { count: 0, totalBytes: 0, avgBytes: 0 };
    const totalBytes = files.reduce((sum, f) => sum + statSync(`${dir}/${f}`).size, 0);
    return {
      count: files.length,
      totalBytes,
      avgBytes: Math.round(totalBytes / files.length),
    };
  }

  const stats80  = dirStats(OUT_80);
  const stats400 = dirStats(OUT_400);

  console.log('\n=== FILE SIZE STATS ===');
  console.log(`80x80  dir: ${stats80.count} files, avg ${(stats80.avgBytes / 1024).toFixed(1)} KB, total ${(stats80.totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`400x400 dir: ${stats400.count} files, avg ${(stats400.avgBytes / 1024).toFixed(1)} KB, total ${(stats400.totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Total disk: ${((stats80.totalBytes + stats400.totalBytes) / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
