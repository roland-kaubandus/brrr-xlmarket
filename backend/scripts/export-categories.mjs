/**
 * export-categories.mjs
 * Fetches ALL categories from Medusa API, computes hierarchy levels,
 * saves grouped-by-level JSON and 5 search queue parts.
 */

const API_URL = 'http://127.0.0.1:9001/store/product-categories';
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY;
const LIMIT = 500;

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../../data/category-icons');

async function fetchAllCategories() {
  const all = [];
  let offset = 0;

  while (true) {
    const url = `${API_URL}?limit=${LIMIT}&offset=${offset}&fields=id,name,handle,parent_category_id`;
    console.log(`Fetching offset=${offset}...`);

    const res = await fetch(url, {
      headers: { 'x-publishable-api-key': API_KEY },
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const categories = data.product_categories;

    if (!categories || categories.length === 0) break;

    all.push(...categories);
    console.log(`  Got ${categories.length} (total: ${all.length})`);

    if (categories.length < LIMIT) break;
    offset += LIMIT;
  }

  return all;
}

function computeLevels(categories) {
  const byId = new Map();
  for (const cat of categories) {
    byId.set(cat.id, cat);
  }

  function getLevel(cat) {
    if (!cat.parent_category_id) return 1;
    const parent = byId.get(cat.parent_category_id);
    if (!parent) return 1; // orphan — treat as L1
    return getLevel(parent) + 1;
  }

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    handle: cat.handle,
    parent_category_id: cat.parent_category_id,
    level: getLevel(cat),
  }));
}

function main() {
  return fetchAllCategories().then((raw) => {
    console.log(`\nTotal categories fetched: ${raw.length}`);

    const withLevels = computeLevels(raw);

    // Group by level
    const byLevel = {};
    for (const cat of withLevels) {
      const key = `L${cat.level}`;
      if (!byLevel[key]) byLevel[key] = [];
      byLevel[key].push(cat);
    }

    // Print counts
    const sortedKeys = Object.keys(byLevel).sort(
      (a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))
    );
    console.log('\nCategories by level:');
    for (const key of sortedKeys) {
      console.log(`  ${key}: ${byLevel[key].length}`);
    }

    // Ensure output dir
    mkdirSync(OUT_DIR, { recursive: true });

    // Save by-level
    const byLevelPath = join(OUT_DIR, 'categories-by-level.json');
    writeFileSync(byLevelPath, JSON.stringify(byLevel, null, 2));
    console.log(`\nSaved: ${byLevelPath}`);

    // Split into 5 equal parts
    const partSize = Math.ceil(withLevels.length / 5);
    for (let i = 0; i < 5; i++) {
      const part = withLevels.slice(i * partSize, (i + 1) * partSize);
      const partPath = join(OUT_DIR, `search-queue-part-${i + 1}.json`);
      writeFileSync(partPath, JSON.stringify(part, null, 2));
      console.log(`Saved: ${partPath} (${part.length} categories)`);
    }

    console.log('\nDone.');
  });
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
