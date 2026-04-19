#!/usr/bin/env node

/**
 * search-category-icons.mjs
 *
 * Searches MeiliSearch for the best iconic product image per category.
 * Usage: node backend/scripts/search-category-icons.mjs --part 1
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/category-icons');

const MEILI_URL = 'http://127.0.0.1:7700';
const MEILI_KEY = process.env.MEILISEARCH_KEY || 'MEILI_LEGACY_KEY_REDACTED';

const BATCH_SIZE = 5;
const LOG_EVERY = 50;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const partFlag = process.argv.indexOf('--part');
if (partFlag === -1 || !process.argv[partFlag + 1]) {
  console.error('Usage: node search-category-icons.mjs --part N  (1-5)');
  process.exit(1);
}
const PART = Number(process.argv[partFlag + 1]);
if (PART < 1 || PART > 5 || !Number.isInteger(PART)) {
  console.error('--part must be an integer 1-5');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// MeiliSearch query
// ---------------------------------------------------------------------------

async function searchProducts(categoryName, handle) {
  const body = {
    q: categoryName,
    limit: 20,
    filter: [`category_handles = "${handle}"`],
    attributesToRetrieve: [
      'id', 'title', 'handle', 'thumbnail', 'price', 'images', 'category_handles',
    ],
  };

  const res = await fetch(`${MEILI_URL}/indexes/products/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MEILI_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MeiliSearch error ${res.status}: ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const MULTIPACK_RE = /\b(pcs|pack|set of|pieces)\b/i;
const ACCESSORY_RE = /\b(replacement|accessory|part for|compatible)\b/i;
const KIT_RE = /\bkit\b/i;

function scoreHit(hit, rank, totalHits, prices) {
  let score = 0;
  const reasons = [];

  // 1. Relevance rank — top result gets 50, linearly decreasing
  const relevanceScore = Math.max(0, 50 - (rank / Math.max(totalHits - 1, 1)) * 50);
  score += relevanceScore;

  // 2. Must have thumbnail
  if (!hit.thumbnail) {
    return { score: -1, skip: true };
  }

  // 3. Price mid-range — bell curve peaking at 40th percentile, max 25 pts
  if (prices.length > 0 && hit.price != null) {
    const sorted = [...prices].sort((a, b) => a - b);
    const targetIdx = Math.floor(sorted.length * 0.4);
    const targetPrice = sorted[targetIdx];
    const maxPrice = sorted[sorted.length - 1];
    const minPrice = sorted[0];
    const range = maxPrice - minPrice;
    if (range > 0) {
      const distance = Math.abs(hit.price - targetPrice) / range;
      // Bell curve: e^(-distance^2 * 8) gives nice falloff
      const priceScore = 25 * Math.exp(-distance * distance * 8);
      score += priceScore;
    } else {
      // All same price — give full points
      score += 25;
    }
  }

  // 4. VEVOR CDN quality
  const thumb = hit.thumbnail || '';
  if (thumb.includes('original_img')) {
    score += 10;
    reasons.push('original_img');
  } else if (thumb.includes('m100-1.2')) {
    score += 5;
    reasons.push('m100-1.2');
  }

  // 5. Penalties
  const title = (hit.title || '').toLowerCase();
  if (MULTIPACK_RE.test(title)) {
    score -= 5;
    reasons.push('multipack_penalty');
  }
  if (ACCESSORY_RE.test(title)) {
    score -= 10;
    reasons.push('accessory_penalty');
  }
  if (KIT_RE.test(title)) {
    score -= 3;
    reasons.push('kit_penalty');
  }

  // 6. Gallery richness — min(imageCount, 5) * 2
  const imageCount = Array.isArray(hit.images) ? hit.images.length : 0;
  score += Math.min(imageCount, 5) * 2;

  return { score, skip: false, reasons };
}

// ---------------------------------------------------------------------------
// Process one category
// ---------------------------------------------------------------------------

async function processCategory(category) {
  const { handle, name, level } = category;

  let searchResult;
  try {
    searchResult = await searchProducts(name, handle);
  } catch (err) {
    console.error(`  [ERR] ${handle}: ${err.message}`);
    return {
      handle,
      name,
      level,
      imageUrl: null,
      productTitle: null,
      score: 0,
      reason: 'no_products',
      runnerUp: null,
    };
  }

  const hits = searchResult.hits || [];
  if (hits.length === 0) {
    return {
      handle,
      name,
      level,
      imageUrl: null,
      productTitle: null,
      score: 0,
      reason: 'no_products',
      runnerUp: null,
    };
  }

  // Collect prices for bell curve
  const prices = hits
    .map((h) => h.price)
    .filter((p) => p != null && typeof p === 'number');

  // Score all hits
  const scored = hits.map((hit, idx) => {
    const result = scoreHit(hit, idx, hits.length, prices);
    return { hit, ...result };
  });

  // Filter out skipped (no thumbnail) and sort descending
  const valid = scored
    .filter((s) => !s.skip)
    .sort((a, b) => b.score - a.score);

  if (valid.length === 0) {
    return {
      handle,
      name,
      level,
      imageUrl: null,
      productTitle: null,
      score: 0,
      reason: 'no_thumbnail',
      runnerUp: null,
    };
  }

  const best = valid[0];
  const runnerUp = valid.length > 1
    ? { imageUrl: valid[1].hit.thumbnail, score: Math.round(valid[1].score * 100) / 100 }
    : null;

  return {
    handle,
    name,
    level,
    imageUrl: best.hit.thumbnail,
    productTitle: best.hit.title,
    score: Math.round(best.score * 100) / 100,
    reason: 'found',
    runnerUp,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const inputPath = resolve(DATA_DIR, `search-queue-part-${PART}.json`);
  const outputPath = resolve(DATA_DIR, `search-results-part-${PART}.json`);

  console.log(`[search-category-icons] Part ${PART}`);
  console.log(`  Input:  ${inputPath}`);
  console.log(`  Output: ${outputPath}`);

  const raw = await readFile(inputPath, 'utf-8');
  const categories = JSON.parse(raw);
  console.log(`  Categories: ${categories.length}`);

  const results = [];
  let processed = 0;

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < categories.length; i += BATCH_SIZE) {
    const batch = categories.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processCategory));
    results.push(...batchResults);

    processed += batch.length;
    if (processed % LOG_EVERY === 0 || processed === categories.length) {
      const found = results.filter((r) => r.reason === 'found').length;
      console.log(`  Progress: ${processed}/${categories.length} (found: ${found})`);
    }
  }

  // Summary
  const found = results.filter((r) => r.reason === 'found').length;
  const noProducts = results.filter((r) => r.reason === 'no_products').length;
  const noThumb = results.filter((r) => r.reason === 'no_thumbnail').length;

  console.log(`\n  Done! found=${found}, no_products=${noProducts}, no_thumbnail=${noThumb}`);

  await writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`  Saved: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
