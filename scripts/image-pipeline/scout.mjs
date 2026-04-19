#!/usr/bin/env node
/**
 * Scout v2 — for a handle, return ranked VEVOR CDN thumbnail candidates
 * plus a prompt-seed for nano-banana generation.
 *
 * v2 improvements:
 *  - Rank products by title relevance (handle tokens matching title)
 *  - Prefer `goods_img-v11` / `m100-1.2` URL variants (cleaner studio shots)
 *  - Return up to 10 candidates (vs previous 5)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const handle = process.argv[2];
if (!handle) { console.error('usage: scout.mjs <handle>'); process.exit(2); }

const tree = JSON.parse(readFileSync('/home/brrr/brrr-xlmarket/storefront/lib/category-tree.generated.json', 'utf8'));
const node = tree.nodes[handle];
if (!node) { console.error(`handle not in taxonomy: ${handle}`); process.exit(3); }

function psql(query) {
  const r = spawnSync('docker', ['exec', 'xlmarket-db', 'psql', '-U', 'xlmarket', '-d', 'xlmarket', '-t', '-A', '-F', '|', '-c', query], { encoding: 'utf8' });
  if (r.status !== 0) return [];
  return r.stdout.trim().split('\n').filter(Boolean).map(l => l.split('|'));
}

// Tokenize handle: "commercial-ice-maker" -> ["commercial","ice","maker"]
function tokens(s) {
  return (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3);
}

// Rank by how many handle tokens appear in title.
function relevanceScore(title, handleTokens, nameEnTokens) {
  const t = (title || '').toLowerCase();
  let score = 0;
  for (const tk of handleTokens) if (t.includes(tk)) score += 3;
  for (const tk of nameEnTokens) if (t.includes(tk)) score += 1;
  return score;
}

// Prefer clean URL variants:
//  goods_img-v11 > goods_img-v1 > original_img-*
//  m100-1.2 > m100-1.1 > m100-1.*
function urlCleanScore(url) {
  let s = 0;
  if (/goods_img-v1{2,}/.test(url)) s += 5;
  else if (/goods_img-v1/.test(url)) s += 3;
  if (/m100-1\.2\b/.test(url)) s += 3;
  else if (/m100-1\.1\b/.test(url)) s += 1;
  return s;
}

const handleTokens = tokens(handle);
const nameTokens = tokens(node.name_en);

const query = `
WITH RECURSIVE cat_tree AS (
  SELECT id, handle, parent_category_id, 0 AS depth
  FROM product_category
  WHERE handle = '${handle.replace(/'/g, "''")}' AND deleted_at IS NULL
  UNION ALL
  SELECT pc.id, pc.handle, pc.parent_category_id, ct.depth + 1
  FROM product_category pc
  JOIN cat_tree ct ON pc.parent_category_id = ct.id
  WHERE pc.deleted_at IS NULL AND ct.depth < 4
)
SELECT DISTINCT ON (p.thumbnail) p.thumbnail, p.title, p.metadata->>'images_all' AS images_all
FROM product p
JOIN product_category_product pcp ON pcp.product_id = p.id
JOIN cat_tree ct ON ct.id = pcp.product_category_id
WHERE p.thumbnail IS NOT NULL
  AND p.deleted_at IS NULL
  AND p.thumbnail LIKE '%vevor.com%'
LIMIT 40;
`;

const rows = psql(query);

// Build candidate list; for each product, extract main thumbnail AND try
// URL-variant substitutions.
const raw = rows.map(([url, title, imagesAll]) => ({ url: (url || '').trim(), title: (title || '').trim(), imagesAll: (imagesAll || '').trim() })).filter(c => c.url);

// Score + rank
const scored = raw.map(c => ({
  ...c,
  relevance: relevanceScore(c.title, handleTokens, nameTokens),
  urlScore: urlCleanScore(c.url),
})).sort((a, b) => (b.relevance - a.relevance) || (b.urlScore - a.urlScore));

// For each top-ranked product, prefer URL variant with higher score.
// Try substituting m100-1.1 -> m100-1.2 in URL.
function preferCleanVariant(url) {
  if (/m100-1\.1\b/.test(url)) return url.replace(/m100-1\.1\b/, 'm100-1.2');
  return url;
}

const candidates = scored.slice(0, 10).map(c => ({
  url: preferCleanVariant(c.url),
  product_title: c.title,
  relevance: c.relevance,
}));

const primary = candidates[0]?.product_title || node.name_en;
const seed = {
  primary_product: primary.replace(/^VEVOR\s+/i, '').toLowerCase().replace(/[^a-z0-9 -]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80),
  detail_hint: 'professional build quality, commercial grade',
};
if (!seed.primary_product) seed.primary_product = node.name_en.toLowerCase();

console.log(JSON.stringify({ handle, level: node.level, name_en: node.name_en, parent: node.parent_handle, candidates, seed }, null, 2));
