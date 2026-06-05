#!/usr/bin/env node
/**
 * VEVOR XLSX Feed Importer for XL Market v2.0
 *
 * Reads vevor-latest.xlsx, compares against PostgreSQL,
 * creates new products via Medusa Admin API, syncs MeiliSearch.
 *
 * Usage:
 *   node import-vevor-feed.mjs                   # DRY RUN (default)
 *   node import-vevor-feed.mjs --execute          # actual import
 *   node import-vevor-feed.mjs --execute --limit 50
 *   node import-vevor-feed.mjs --refresh          # download fresh feed first
 *   node import-vevor-feed.mjs --execute --update  # also update existing
 */

import XLSX from "xlsx";
import pg from "pg";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadV3Map, resolveV3Slug } from "../backend/src/scripts/resolve-v3-category.mjs";
import { classifyProductSync, loadRules } from "../backend/src/taxonomy/resolver.mjs";

// Rollback switch (spec §10 rollback) — set USE_LEGACY_RESOLVER=1 to fall back
// to the v1 map-based resolver. Defaults to v2 (resolver-v2 pipeline).
const USE_LEGACY_RESOLVER = process.env.USE_LEGACY_RESOLVER === "1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────
const FEED_PATH = path.join(__dirname, "..", "backend", "data", "feeds", "vevor-571.xlsx");
const FEED_URL = "https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/571/vevor-571.xlsx";

const MEDUSA_URL = "http://127.0.0.1:9001";
const ADMIN_EMAIL = "admin@xlmarket.eu";
const ADMIN_PASS = process.env.MEDUSA_ADMIN_PASS;

const PG_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD,
  database: "xlmarket",
};

const MEILI_HOST = "http://127.0.0.1:7700";
const MEILI_KEY = process.env.MEILISEARCH_ADMIN_KEY;
const MEILI_INDEX = "products";

const PRICE_MARKUP = 1.15;
const BATCH_SIZE = 50;
const API_DELAY_MS = 100;
const SALES_CHANNEL_ID = "sc_01KMRWP84555JPGA6M0QMG409M";

// ── CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const REFRESH = args.includes("--refresh");
const UPDATE_EXISTING = args.includes("--update");
const LIMIT = args.includes("--limit")
  ? parseInt(args[args.indexOf("--limit") + 1])
  : 0;

// ── Stats ───────────────────────────────────────────────────────────
const stats = {
  feedRows: 0,
  existingInDb: 0,
  newProducts: 0,
  toUpdate: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  unmappedCategories: new Set(),
  // Resolver-v2 telemetry (F3.4)
  classifyMethods: {},       // S1_sku_override: N, S2_path_contains: N, ...
  classifyBuckets: 0,        // products landing in needs-review-bucket (S8)
  classifyNeedsReview: 0,    // 0.60 ≤ conf < 0.85
  classifyAuto: 0,           // conf ≥ 0.85
  unmappedPaths: new Map(),  // raw_path → count (review-bucket paths)
};

// ── Helpers ─────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log("[" + ts + "] " + msg);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          return reject(new Error("HTTP " + response.statusCode));
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

function apiCall(method, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, MEDUSA_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    };
    if (token) {
      options.headers["Authorization"] = "Bearer " + token;
    }
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error("Request timeout"));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function parsePrice(priceStr) {
  if (!priceStr) return null;
  const match = String(priceStr).match(/([\d,.]+)/);
  if (!match) return null;
  return parseFloat(match[1].replace(",", ""));
}

function makeHandle(sku, title) {
  const cleanSku = (sku || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  const base = (title || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 70);
  return (base + "-" + cleanSku).replace(/-{2,}/g, "-");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Feed parsing ────────────────────────────────────────────────────

function readFeed() {
  log("Reading XLSX feed...");
  const wb = XLSX.readFile(FEED_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws);

  log("  Sheet: " + wb.SheetNames[0] + ", raw rows: " + raw.length);
  log("  Columns: " + Object.keys(raw[0]).join(", "));

  const rows = [];
  for (const r of raw) {
    const sku = String(r["SKU"] || "").trim();
    if (!sku) continue;
    const price = parsePrice(r["Price"]);
    if (!price) continue;

    // Parse selling points
    const sellingPoints = [];
    for (let i = 1; i <= 5; i++) {
      const sp = String(r["Selling point " + i] || "").trim();
      if (sp) sellingPoints.push(sp);
    }

    // Parse image galleries
    const originalImages = String(r["goods_original_picture"] || "").split(",").map(u => u.trim()).filter(Boolean);
    const galleryImages = String(r["image_link1"] || "").split(",").map(u => u.trim()).filter(Boolean);

    rows.push({
      sku,
      title: String(r["Product title"] || "").trim(),
      description: String(r["Product description"] || "").trim(),
      richDescriptionHtml: String(r["description_html"] || "").trim() || null,
      link: String(r["Product link"] || "").trim(),
      upc: String(r["UPC"] || "").trim(),
      price,
      availability: String(r["Availability"] || "").trim().toLowerCase(),
      inventory: parseInt(r["Inventory quantity"]) || 0,
      weight: parseFloat(r["Product weight(KG)"]) || 0,
      image: String(r["Image link"] || "").trim(),
      originalImages,
      galleryImages,
      mainOriginalImage: String(r["goods_main_original_picture"] || "").trim() || null,
      brand: String(r["Brand"] || "").trim(),
      productType: String(r["Product type"] || "").trim(),
      sellingPoints,
      dimensionHigh: parseFloat(r["High"]) || null,
      dimensionWide: parseFloat(r["Wide"]) || null,
      dimensionLong: parseFloat(r["Long"]) || null,
      dimensionUnit: String(r["goods_size_unit"] || "cm").trim(),
      spu: String(r["goods_spu"] || "").trim() || null,
    });
  }

  log("  Valid products: " + rows.length);
  stats.feedRows = rows.length;
  return rows;
}

// ── PostgreSQL dedup ────────────────────────────────────────────────

async function loadExistingSkus() {
  log("Querying PostgreSQL for existing products...");
  const client = new pg.Client(PG_CONFIG);
  await client.connect();

  const result = await client.query(
    "SELECT metadata->>'vevor_sku' AS sku, id, metadata FROM product WHERE metadata->>'vevor_sku' IS NOT NULL AND deleted_at IS NULL"
  );

  // sku → { id, metadata }. Metadata vaja, et update säilitaks tõlked
  // (title_et jne) + austaks category_override't (FAAS 0, 2026-06-05).
  const map = new Map();
  for (const row of result.rows) {
    if (row.sku) map.set(row.sku, { id: row.id, metadata: row.metadata || {} });
  }

  await client.end();
  log("  Found " + map.size + " existing VEVOR products in DB");
  stats.existingInDb = map.size;
  return map;
}

// ── Category mapping (v3 taxonomy via shared resolver) ─────────────

function loadCategoryMap() {
  // Returns the full v3 map object. Consumers use resolveV3Slug() to map
  // a productType → taxonomy-v3 L1 slug.
  try {
    return loadV3Map();
  } catch (e) {
    log("  WARNING: vevor-to-v3.json not loadable (" + e.message + "), categories will be skipped");
    return null;
  }
}

async function loadCategoryIds(token) {
  // Fetch ALL active category handles → id map (includes L1 + L2 + L3 + review bucket).
  // Resolver v2 may emit L2 handles; we look up the deepest available category that
  // exists in Medusa and attach the product to it.
  const resp = await apiCall("GET", "/admin/product-categories?limit=1000&include_descendants_tree=false", null, token);
  const map = {};
  for (const cat of resp.data.product_categories || []) {
    map[cat.handle] = cat.id;
  }
  log("  Loaded " + Object.keys(map).length + " category IDs from Medusa (incl. L2/L3 + review bucket)");
  return map;
}

// ── Resolver v2 integration (F3.4) ─────────────────────────────────
// Preload rules on import to fail fast if a rules file is malformed.
if (!USE_LEGACY_RESOLVER) {
  try { loadRules() } catch (e) {
    console.error("  FATAL: resolver-v2 rules failed to load: " + e.message)
    process.exit(1)
  }
}

/**
 * Run resolver-v2 on a VEVOR row and pick the best categoryId to attach.
 * Returns { classification, categoryId, categoryHandle }.
 *
 * categoryHandle preference order: L2 (if exists in DB) > L1 > review-bucket.
 * We skip L3 for now because most L3 categories are not yet seeded.
 */
function classifyRow(row, catIds) {
  if (USE_LEGACY_RESOLVER) {
    const legacyL1 = resolveV3Slug(row.productType || "", loadCategoryMap())
    return {
      classification: {
        l1_slug: legacyL1,
        l2_slug: null,
        l3_slug: null,
        confidence: legacyL1 ? 0.85 : 0,
        method: legacyL1 ? "legacy_v1" : "legacy_unmapped",
        needs_review: !legacyL1,
        review_bucket: !legacyL1,
        raw_path: row.productType || "",
      },
      categoryId: legacyL1 ? (catIds[legacyL1] || null) : null,
      categoryHandle: legacyL1 || null,
    }
  }

  const c = classifyProductSync(row)

  // Telemetry
  stats.classifyMethods[c.method] = (stats.classifyMethods[c.method] || 0) + 1
  if (c.review_bucket) stats.classifyBuckets++
  else if (c.needs_review) stats.classifyNeedsReview++
  else stats.classifyAuto++
  if (c.review_bucket && c.raw_path) {
    stats.unmappedPaths.set(c.raw_path, (stats.unmappedPaths.get(c.raw_path) || 0) + 1)
  }
  if (c.review_bucket && row.productType) {
    stats.unmappedCategories.add(row.productType.split(">")[0].trim())
  }

  // Pick deepest category that actually exists in Medusa.
  // target_slug on resolver'i kõige täpsem leaf (S1.5 annab L4..L7), seega
  // eelistame seda enne L3/L2/L1 ancestor'eid. Ilma selle eelistuseta pani
  // iga 4h feed sync tooted tagasi L2/L3 peale (INV-32 CRIT, 80% drift).
  let chosenHandle = null
  if (c.review_bucket) {
    chosenHandle = "needs-review-bucket"
  } else if (c.target_slug && catIds[c.target_slug]) {
    chosenHandle = c.target_slug
  } else if (c.l3_slug && catIds[c.l3_slug]) {
    chosenHandle = c.l3_slug
  } else if (c.l2_slug && catIds[c.l2_slug]) {
    chosenHandle = c.l2_slug
  } else if (c.l1_slug && catIds[c.l1_slug]) {
    chosenHandle = c.l1_slug
  }

  return {
    classification: c,
    categoryId: chosenHandle ? (catIds[chosenHandle] || null) : null,
    categoryHandle: chosenHandle,
  }
}

/**
 * Persist a resolver classification to category_classification_audit.
 * Best-effort: failures are logged and do not block product creation.
 */
async function writeAuditRow(pgClient, productId, cls) {
  try {
    await pgClient.query(
      `INSERT INTO category_classification_audit
         (product_id, action, method, confidence, l1_slug, l2_slug, l3_slug,
          raw_path, needs_review, reason)
       VALUES ($1, 'resolver_classified', $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        productId,
        cls.method,
        cls.confidence,
        cls.l1_slug,
        cls.l2_slug,
        cls.l3_slug,
        cls.raw_path || null,
        cls.needs_review === true,
        cls.method,
      ]
    )
  } catch (e) {
    log("  WARN: audit write failed for " + productId + ": " + e.message)
  }
}

// ── HTML sanitization (pre-computed at import time) ─────────────────

const ALLOWED_TAGS = new Set([
  "br", "p", "strong", "em", "b", "i", "ul", "ol", "li", "h1", "h2", "h3",
  "h4", "h5", "h6", "span", "div", "table", "tr", "td", "th", "thead",
  "tbody", "a", "img",
])
const ALLOWED_ATTRS = {
  a: new Set(["href"]),
  img: new Set(["src", "alt", "width", "height"]),
}

function sanitizeHtml(html) {
  if (!html) return ""
  return html
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\.[a-z][\w-]{0,50}[^{}]{0,300}\{[^}]{0,5000}\}/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(iframe|object|embed|form|input|textarea|select)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|select|label)[^>]*\/?>/gi, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/gi, (match, tag, attrs) => {
      const tagLower = tag.toLowerCase()
      if (!ALLOWED_TAGS.has(tagLower)) return ""
      const isClosing = match.startsWith("</")
      if (isClosing) return `</${tagLower}>`
      const allowedAttrs = ALLOWED_ATTRS[tagLower]
      if (!allowedAttrs) return `<${tagLower}>`
      const safeAttrs = []
      const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
      let attrMatch
      while ((attrMatch = attrRegex.exec(attrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase()
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ""
        if (!allowedAttrs.has(attrName)) continue
        if ((attrName === "href" || attrName === "src") && /^\s*javascript:/i.test(attrValue)) continue
        safeAttrs.push(`${attrName}="${attrValue.replace(/"/g, "&quot;")}"`)
      }
      if (tagLower === "a") {
        safeAttrs.push('rel="noopener noreferrer nofollow"', 'target="_blank"')
      }
      const attrStr = safeAttrs.length ? " " + safeAttrs.join(" ") : ""
      return `<${tagLower}${attrStr}>`
    })
}

// ── Image & rich description cleanup ────────────────────────────────

function normalizeImageUrl(url) {
  if (!url) return ""
  return decodeURIComponent(url.trim()).replace(/^https?:\/\//, "").replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase()
}

function upgradeToOriginalImg(url) {
  // VEVOR goods_img are thumbnails; original_img are full resolution
  return url.replace(/\/goods_img-/, "/original_img-")
}

function cleanRichDescription(html, galleryUrls) {
  if (!html) return null

  // Normalize gallery URLs for comparison
  const gallerySet = new Set((galleryUrls || []).map(normalizeImageUrl))

  let cleaned = html
    // Remove mobile section entirely (<!-- h5 --> to end)
    .replace(/<!--\s*h5\s*-->[\s\S]*$/gi, "")
    // Remove m-banner divs (mobile duplicates)
    .replace(/<div[^>]*class="m-banner"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "")
    // Remove VEVOR boutique banner images
    .replace(/<img[^>]*src=["'][^"']*vevor-bmp-prm[^"']*["'][^>]*\/?>/gi, "")
    .replace(/<img[^>]*src=["'][^"']*boutique-banner[^"']*["'][^>]*\/?>/gi, "")
    // Remove mobile image variants (-m.jpg suffix)
    .replace(/<img[^>]*src=["'][^"']*-m\.[^"']*["'][^>]*\/?>/gi, "")
    // Remove VEVOR company boilerplate text
    .replace(/VEVOR is a leading brand[\s\S]*?global members\./gi, "")
    .replace(/Along with thousands[\s\S]*?global members\./gi, "")
    // Remove raw CSS (outside <style> tags)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\.[a-z][\w-]{0,50}[^{}]{0,300}\{[^}]{0,5000}\}/gi, "")
    // Remove style/script/input tags
    .replace(/<style[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(input|label|iframe|object|embed|form|textarea|select)[^>]*\/?>/gi, "")

  // Deduplicate images by URL + remove images that are already in gallery
  const seenUrls = new Set()
  cleaned = cleaned.replace(/<img[^>]*src=["']([^"'>]+)["'][^>]*\/?>/gi, (match, src) => {
    const norm = normalizeImageUrl(src)
    if (seenUrls.has(norm) || gallerySet.has(norm)) return "" // duplicate or in gallery
    seenUrls.add(norm)
    return match
  })

  // Trim empty whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n").trim()

  return cleaned.length > 50 ? cleaned : null
}

// ── SPU Grouping & Variant Extraction (WO-107) ─────────────────────

function groupBySpu(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = row.spu || `__solo_${row.sku}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return groups
}

function extractOption(rows) {
  if (rows.length === 1) return { name: "Default", values: [{ label: "Default", row: rows[0] }] }

  const titles = rows.map(r => r.title)

  // Find common prefix
  let prefix = titles[0]
  for (const t of titles.slice(1)) {
    while (prefix.length > 0 && !t.startsWith(prefix)) prefix = prefix.slice(0, -1)
  }
  prefix = prefix.replace(/[\s\-,]+$/, "") // trim trailing separators

  // Extract suffix as variant value
  const values = rows.map(row => {
    let label = row.title.slice(prefix.length).trim()
    // Clean common prefix patterns like ", " or " - "
    label = label.replace(/^[\s,\-–—|]+/, "").trim()
    return { label: label || "Standard", row }
  })

  // Detect option name from values
  const labels = values.map(v => v.label)
  const optionName = detectOptionName(labels)

  return { name: optionName, values }
}

function detectOptionName(labels) {
  // Color patterns
  const colorWords = ["red", "blue", "green", "black", "white", "grey", "gray", "silver", "gold", "brown", "orange", "yellow", "pink", "purple", "beige", "dark", "light"]
  const colorCount = labels.filter(l => colorWords.some(c => l.toLowerCase().includes(c))).length
  if (colorCount >= labels.length * 0.5) return "Color"

  // Size patterns (measurements, dimensions)
  const sizePatterns = /\d+\s*(x|×|mm|cm|m|in|inch|ft|l|gal|qt|oz)\b/i
  const sizeCount = labels.filter(l => sizePatterns.test(l)).length
  if (sizeCount >= labels.length * 0.5) return "Size"

  // Quantity/piece patterns
  const qtyPatterns = /\d+\s*(pcs?|pieces?|pack|set)/i
  const qtyCount = labels.filter(l => qtyPatterns.test(l)).length
  if (qtyCount >= labels.length * 0.5) return "Kit Size"

  // Power/capacity
  const powerPatterns = /\d+\s*(w|kw|hp|v|a|ah|kwh|btu)\b/i
  const powerCount = labels.filter(l => powerPatterns.test(l)).length
  if (powerCount >= labels.length * 0.5) return "Capacity"

  // Weight
  const weightPatterns = /\d+\s*(kg|lbs?|ton)\b/i
  const weightCount = labels.filter(l => weightPatterns.test(l)).length
  if (weightCount >= labels.length * 0.5) return "Weight"

  return "Variant"
}

// ── Product creation (multi-variant) ────────────────────────────────

async function createProductFromGroup(spuGroup, token, catMap, catIds, pgClient) {
  const option = extractOption(spuGroup)
  const primaryRow = spuGroup[0] // Use first row for shared product data
  const anyInStock = spuGroup.some(r => r.availability === "in stock")
  const handle = makeHandle(primaryRow.sku, primaryRow.title)

  // Resolver v2 — classify the primary row (spec §F3.4)
  const { classification, categoryId, categoryHandle } = classifyRow(primaryRow, catIds)

  // Collect all unique gallery images from all variants
  const allGalleryImages = []
  const seenGallery = new Set()
  for (const row of spuGroup) {
    const imgs = row.originalImages.length > 0 ? row.originalImages : row.galleryImages
    for (const url of imgs) {
      const upgraded = upgradeToOriginalImg(url)
      if (!seenGallery.has(upgraded)) {
        seenGallery.add(upgraded)
        allGalleryImages.push(upgraded)
      }
    }
  }

  // Build variants array
  const variants = option.values.map(v => ({
    title: v.label,
    sku: v.row.sku,
    manage_inventory: true,
    allow_backorder: false,
    prices: [{ amount: Math.round(v.row.price * PRICE_MARKUP * 100), currency_code: "eur" }],
    options: { [option.name]: v.label },
  }))

  // Pre-compute sanitized HTML (avoids CPU-bound regex at request time)
  const cleanedRich = cleanRichDescription(primaryRow.richDescriptionHtml, allGalleryImages)

  const productData = {
    title: primaryRow.title,
    handle,
    description: primaryRow.description || "",
    status: "published",
    is_giftcard: false,
    thumbnail: primaryRow.image || undefined,
    external_id: "vevor:" + primaryRow.sku,
    metadata: {
      vevor_sku: primaryRow.sku,
      vevor_upc: primaryRow.upc || "",
      vevor_link: primaryRow.link || "",
      vevor_product_type: primaryRow.productType || "",
      vevor_spu: primaryRow.spu || "",
      weight_kg: primaryRow.weight || 0,
      selling_points: primaryRow.sellingPoints || [],
      rich_description: cleanedRich,
      sanitized_description: sanitizeHtml(primaryRow.description || ""),
      sanitized_rich_description: cleanedRich ? sanitizeHtml(cleanedRich) : "",
      dimensions: (primaryRow.dimensionHigh || primaryRow.dimensionWide || primaryRow.dimensionLong)
        ? { high: primaryRow.dimensionHigh, wide: primaryRow.dimensionWide, long: primaryRow.dimensionLong, unit: primaryRow.dimensionUnit }
        : null,
      gallery_images: allGalleryImages.slice(0, 20),
      translation_status: "pending",
      original_language: "en",
      variant_skus: spuGroup.map(r => r.sku), // all SKUs for this SPU group
    },
    images: [
      ...(primaryRow.mainOriginalImage ? [{ url: primaryRow.mainOriginalImage }] : primaryRow.image ? [{ url: primaryRow.image }] : []),
      ...allGalleryImages.slice(0, 10).map(url => ({ url })),
    ].filter((img, i, arr) => arr.findIndex(a => a.url === img.url) === i).slice(0, 10),
    options: [{ title: option.name, values: option.values.map(v => v.label) }],
    variants,
    sales_channels: [{ id: SALES_CHANNEL_ID }],
  }

  if (categoryId) {
    productData.categories = [{ id: categoryId }]
  }

  // If review bucket, force status=draft so the product is never publicly visible
  // (spec §5.3 — conf <0.60 must not appear on storefront).
  if (classification.review_bucket) {
    productData.status = "draft"
  }

  const resp = await apiCall("POST", "/admin/products", productData, token)
  if (resp.status >= 200 && resp.status < 300 && resp.data.product) {
    stats.created++
    if (spuGroup.length > 1) stats.variantGroupsCreated = (stats.variantGroupsCreated || 0) + 1
    if (pgClient) await writeAuditRow(pgClient, resp.data.product.id, classification)
    return resp.data.product.id
  } else {
    const msg = resp.data.message || JSON.stringify(resp.data).substring(0, 200)
    log("  SKIP reason [" + primaryRow.sku + "]: status=" + resp.status + " msg=" + msg)
    if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("unique")) {
      stats.skipped++
    } else {
      stats.errors++
      if (stats.errors <= 20) log("  ERROR [" + primaryRow.sku + "]: " + msg)
    }
    return null
  }
}

// Legacy single-product creation (backwards compat)
async function createProduct(row, token, catMap, catIds, pgClient) {
  const finalPrice = Math.round(row.price * PRICE_MARKUP * 100); // cents
  const handle = makeHandle(row.sku, row.title);
  const isInStock = row.availability === "in stock";

  // Resolver v2 — classify the row (spec §F3.4)
  const { classification, categoryId, categoryHandle } = classifyRow(row, catIds);

  // Pre-compute sanitized HTML (avoids CPU-bound regex at request time)
  const galleryImgsForClean = row.originalImages.length > 0 ? row.originalImages : row.galleryImages;
  const cleanedRichLegacy = cleanRichDescription(row.richDescriptionHtml, galleryImgsForClean);

  const productData = {
    title: row.title,
    handle: handle,
    description: row.description || "",
    status: "published",
    is_giftcard: false,
    thumbnail: row.image || undefined,
    external_id: "vevor:" + row.sku,
    metadata: {
      vevor_sku: row.sku,
      vevor_upc: row.upc || "",
      vevor_link: row.link || "",
      vevor_product_type: row.productType || "",
      vevor_spu: row.spu || "",
      weight_kg: row.weight || 0,
      selling_points: row.sellingPoints || [],
      rich_description: cleanedRichLegacy,
      sanitized_description: sanitizeHtml(row.description || ""),
      sanitized_rich_description: cleanedRichLegacy ? sanitizeHtml(cleanedRichLegacy) : "",
      dimensions: (row.dimensionHigh || row.dimensionWide || row.dimensionLong)
        ? { high: row.dimensionHigh, wide: row.dimensionWide, long: row.dimensionLong, unit: row.dimensionUnit }
        : null,
      gallery_images: (row.originalImages.length > 0 ? row.originalImages : row.galleryImages)
        .map(upgradeToOriginalImg),
      translation_status: "pending",
      original_language: "en",
    },
    images: [
      ...(row.mainOriginalImage ? [{ url: row.mainOriginalImage }] : row.image ? [{ url: row.image }] : []),
      ...row.originalImages.slice(0, 10).map(url => ({ url })),
    ].filter((img, i, arr) => arr.findIndex(a => a.url === img.url) === i).slice(0, 10),
    options: [{ title: "Default", values: ["Default"] }],
    variants: [
      {
        title: "Default",
        sku: row.sku,
        barcode: undefined, // UPC stored in metadata to avoid barcode conflicts
        manage_inventory: true,
        allow_backorder: false,
        prices: [{ amount: finalPrice, currency_code: "eur" }],
        options: { Default: "Default" },
      },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
  };

  if (categoryId) {
    productData.categories = [{ id: categoryId }];
  }

  // Force draft for review-bucket products
  if (classification.review_bucket) {
    productData.status = "draft";
  }

  const resp = await apiCall("POST", "/admin/products", productData, token);

  if (resp.status >= 200 && resp.status < 300 && resp.data.product) {
    stats.created++;
    if (pgClient) await writeAuditRow(pgClient, resp.data.product.id, classification);
    return resp.data.product.id;
  } else {
    const msg = resp.data.message || JSON.stringify(resp.data).substring(0, 200);
    log("  SKIP reason [" + row.sku + "]: status=" + resp.status + " msg=" + msg);
      if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("unique")) {
      stats.skipped++;
    } else {
      stats.errors++;
      if (stats.errors <= 20) {
        log("  ERROR [" + row.sku + "]: " + msg);
      }
    }
    return null;
  }
}

async function updateProduct(productId, row, token, catIds, auditPg, existingMeta) {
  const finalPrice = Math.round(row.price * PRICE_MARKUP * 100);
  const isInStock = row.availability === "in stock";
  existingMeta = existingMeta || {};

  // Reclassify on every sync so productType / SKU drifts re-bind to the
  // correct deepest leaf (L3 > L2 > L1). Without this, existing products
  // stay on whatever node they were first bound to even if VEVOR changes
  // the path or rules evolve.
  const { classification, categoryId } = classifyRow(row, catIds || {});

  // FAAS 0 (2026-06-05) — category_override: kui toode on käsitsi mitmesse
  // kategooriasse pandud (kat-halduse tööriist salvestab metadata.category_override
  // = handle-massiiv), siis JÄTA resolver vahele ja kasuta override't. Nii et
  // käsitsi-määrang elab feed-sync'i üle. Toetab MITUT kategooriat.
  const overrideHandles = Array.isArray(existingMeta.category_override)
    ? existingMeta.category_override.filter((h) => h && catIds[h])
    : [];

  try {
    // Update product status, metadata, and images
    const galleryImgs = row.originalImages.length > 0 ? row.originalImages : row.galleryImages;
    // Pre-compute sanitized HTML (avoids CPU-bound regex at request time)
    const cleanedRichUpdate = cleanRichDescription(row.richDescriptionHtml, galleryImgs);
    const updateData = {
      status: "published",
      thumbnail: row.mainOriginalImage || row.image || undefined,
      metadata: {
        // FAAS 0: säilita olemasolev metadata (Medusa ASENDAB metadata täielikult
        // → ilma selleta kustuks title_et tõlked + category_override iga feed-sync'il).
        // Feed-väljad kirjutatakse alla üle; tõlked/override/source jäävad alles.
        ...existingMeta,
        vevor_sku: row.sku,
        vevor_upc: row.upc || "",
        vevor_link: row.link || "",
        vevor_product_type: row.productType || "",
        vevor_spu: row.spu || "",
        weight_kg: row.weight || 0,
        selling_points: row.sellingPoints || [],
        rich_description: cleanedRichUpdate,
        sanitized_description: sanitizeHtml(row.description || ""),
        sanitized_rich_description: cleanedRichUpdate ? sanitizeHtml(cleanedRichUpdate) : "",
        dimensions: (row.dimensionHigh || row.dimensionWide || row.dimensionLong)
          ? { high: row.dimensionHigh, wide: row.dimensionWide, long: row.dimensionLong, unit: row.dimensionUnit }
          : null,
        gallery_images: galleryImgs,
        translation_status: "pending",
        original_language: "en",
      },
      images: [
        ...(row.mainOriginalImage ? [{ url: row.mainOriginalImage }] : row.image ? [{ url: row.image }] : []),
        ...row.originalImages.slice(0, 10).map(url => ({ url })),
      ].filter((img, i, arr) => arr.findIndex(a => a.url === img.url) === i).slice(0, 10),
    };
    if (overrideHandles.length > 0) {
      // FAAS 0: käsitsi-määratud kategooriad (mitu lubatud) — resolver vahele jäetud.
      updateData.categories = overrideHandles.map((h) => ({ id: catIds[h] }));
    } else if (categoryId) {
      // Replace category bindings with the deepest leaf. Medusa treats
      // `categories` as the full set, so this keeps the product on exactly
      // one v3 node per sync.
      updateData.categories = [{ id: categoryId }];
    }
    await apiCall("POST", "/admin/products/" + productId, updateData, token);

    if (auditPg && classification) {
      await writeAuditRow(auditPg, productId, classification);
    }

    // Get variant ID to update price
    const prodResp = await apiCall(
      "GET",
      "/admin/products/" + productId + "?fields=id,variants.id",
      null,
      token
    );
    const variantId = prodResp.data.product?.variants?.[0]?.id;
    if (variantId) {
      await apiCall(
        "POST",
        "/admin/products/" + productId + "/variants/" + variantId,
        { prices: [{ amount: finalPrice, currency_code: "eur" }] },
        token
      );
    }

    stats.updated++;
  } catch (err) {
    stats.errors++;
    if (stats.errors <= 20) {
      log("  ERROR updating [" + row.sku + "]: " + err.message);
    }
  }
}

// ── MeiliSearch sync ────────────────────────────────────────────────

async function triggerMeiliSync() {
  log("Checking MeiliSearch status...");

  try {
    const url = new URL("/indexes/" + MEILI_INDEX + "/stats", MEILI_HOST);
    const resp = await new Promise((resolve, reject) => {
      http
        .get(
          {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            headers: { Authorization: "Bearer " + MEILI_KEY },
          },
          (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve(JSON.parse(data)));
          }
        )
        .on("error", reject);
    });

    log("  MeiliSearch index: " + resp.numberOfDocuments + " documents");
    log("  NOTE: MeiliSearch sync runs on its own schedule.");
    log("  If new products are missing from search, check the sync timer/cron.");
  } catch (err) {
    log("  WARNING: Could not reach MeiliSearch: " + err.message);
  }
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("");
  console.log("=======================================================");
  console.log("  XL Market -- VEVOR Feed Importer v2.0");
  console.log("=======================================================");
  console.log("");

  const mode = EXECUTE ? "EXECUTE" : "DRY RUN";
  log("Mode: " + mode + (UPDATE_EXISTING ? " + UPDATE" : ""));
  if (LIMIT) log("Limit: " + LIMIT + " products");
  console.log("");

  // ── Step 0: Optionally refresh feed ──
  if (REFRESH) {
    log("Downloading fresh feed from S3...");
    await downloadFile(FEED_URL, FEED_PATH);
    const size = (fs.statSync(FEED_PATH).size / 1024 / 1024).toFixed(1);
    log("  Downloaded: " + size + " MB");
  }

  // ── Step 1: Read XLSX ──
  const feedRows = readFeed();

  // ── Step 2: Group by SPU ──
  const spuGroups = groupBySpu(feedRows);
  const multiVariantGroups = [...spuGroups.values()].filter(g => g.length > 1);
  log("SPU grouping:");
  log("  Total SPU groups:    " + spuGroups.size);
  log("  Multi-variant groups:" + multiVariantGroups.length);
  log("  Products in groups:  " + multiVariantGroups.reduce((s, g) => s + g.length, 0));
  console.log("");

  // ── Step 3: Compare with DB ──
  const existingSkus = await loadExistingSkus();

  const newRows = [];
  const updateRows = [];

  // 1 feed row = 1 Medusa product. Check each SKU individually (no SPU grouping).
  for (const row of feedRows) {
    const existing = existingSkus.get(row.sku);
    if (existing) {
      updateRows.push(Object.assign({}, row, { productId: existing.id, existingMeta: existing.metadata || {} }));
    } else {
      newRows.push(row);
    }
  }

  stats.newProducts = newRows.length;
  stats.toUpdate = updateRows.length;

  console.log("");
  log("=== Analysis ===");
  log("  Feed total:          " + stats.feedRows);
  log("  Already in DB:       " + stats.existingInDb);
  log("  New to import:       " + stats.newProducts);
  log("  Existing (updatable):" + stats.toUpdate);
  console.log("");

  // Show category distribution for new products
  // Resolver v2: deepest-available slug per product; legacy: L1 only.
  const categoryMap = loadCategoryMap();
  const catCounts = {};
  const methodCounts = {};
  for (const row of newRows) {
    if (USE_LEGACY_RESOLVER) {
      const mapped = resolveV3Slug(row.productType || "", categoryMap) || "UNMAPPED";
      catCounts[mapped] = (catCounts[mapped] || 0) + 1;
    } else {
      const c = classifyProductSync(row);
      const key = c.review_bucket
        ? "needs-review-bucket"
        : (c.l2_slug ? c.l1_slug + "/" + c.l2_slug : c.l1_slug || "UNKNOWN");
      catCounts[key] = (catCounts[key] || 0) + 1;
      methodCounts[c.method] = (methodCounts[c.method] || 0) + 1;
    }
  }

  if (!USE_LEGACY_RESOLVER && Object.keys(methodCounts).length > 0) {
    log("Resolver v2 methods (new products):");
    for (const [m, n] of Object.entries(methodCounts).sort((a, b) => b[1] - a[1])) {
      log("  " + m.padEnd(32) + " " + n);
    }
    console.log("");
  }

  if (Object.keys(catCounts).length > 0) {
    log("Category distribution (new products):");
    for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
      log("  " + cat + ": " + count);
    }
    console.log("");
  }

  // Price stats for new products
  if (newRows.length > 0) {
    const prices = newRows.map((r) => r.price * PRICE_MARKUP);
    log("Price stats (new, after markup):");
    log("  Min: EUR " + Math.min(...prices).toFixed(2));
    log("  Max: EUR " + Math.max(...prices).toFixed(2));
    log("  Avg: EUR " + (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2));
    const inStock = newRows.filter((r) => r.availability === "in stock").length;
    log("  In stock: " + inStock + "/" + newRows.length + " (" + ((inStock / newRows.length) * 100).toFixed(1) + "%)");
    console.log("");
  }

  // ── DRY RUN stops here ──
  if (!EXECUTE) {
    console.log("=======================================================");
    console.log("  DRY RUN complete. No changes made.");
    console.log("  Run with --execute to import products.");
    console.log("=======================================================");
    return;
  }

  // ── Step 3: Authenticate ──
  log("Authenticating with Medusa Admin API...");
  const authResp = await apiCall("POST", "/auth/user/emailpass", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  if (!authResp.data.token) {
    throw new Error("Auth failed: " + JSON.stringify(authResp.data));
  }
  const token = authResp.data.token;
  log("  Authenticated OK");

  // Load category IDs
  const categoryIds = await loadCategoryIds(token);

  // Shared pg client for audit log writes
  const auditPg = new pg.Client(PG_CONFIG);
  await auditPg.connect();
  log("  Resolver: " + (USE_LEGACY_RESOLVER ? "LEGACY v1 (USE_LEGACY_RESOLVER=1)" : "v2 (8-stage pipeline)"));

  // ── Step 4: Create new products (one product per SKU, no SPU grouping) ──
  // SPU grouping removed 2026-04-20: every VEVOR SKU becomes its own Medusa product.
  // SPU ID stays on metadata.vevor_spu for future "related products" widgets.
  const rowsToCreate = LIMIT ? newRows.slice(0, LIMIT) : newRows;
  if (rowsToCreate.length > 0) {
    log("Creating " + rowsToCreate.length + " products (1 product per SKU, batch delay: " + API_DELAY_MS + "ms)...");
    const startTime = Date.now();

    for (let i = 0; i < rowsToCreate.length; i++) {
      const row = rowsToCreate[i];
      try {
        await createProduct(row, token, categoryMap, categoryIds, auditPg);
      } catch (err) {
        stats.errors++;
        if (stats.errors <= 20) {
          log("  ERROR [" + row.sku + " SPU=" + row.spu + "]: " + err.message);
        }
      }
      await sleep(API_DELAY_MS);

      if ((i + 1) % 50 === 0 || i + 1 === rowsToCreate.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        log("  Progress: " + (i + 1) + "/" + rowsToCreate.length + " (" + elapsed + "s) | created: " + stats.created + " errors: " + stats.errors);
      }
    }
  }

  // ── Step 5: Update existing products (if --update) ──
  if (UPDATE_EXISTING && updateRows.length > 0) {
    const toUpdate = LIMIT ? updateRows.slice(0, LIMIT) : updateRows;
    log("Updating " + toUpdate.length + " existing products...");
    const startTime = Date.now();

    for (let i = 0; i < toUpdate.length; i++) {
      const row = toUpdate[i];
      try {
        await updateProduct(row.productId, row, token, categoryIds, auditPg, row.existingMeta);
      } catch (err) {
        stats.errors++;
      }
      await sleep(API_DELAY_MS);

      if ((i + 1) % 100 === 0 || i + 1 === toUpdate.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        log("  Update progress: " + (i + 1) + "/" + toUpdate.length + " (" + elapsed + "s) | updated: " + stats.updated + " errors: " + stats.errors);
      }
    }
  }

  // ── Step 6: MeiliSearch sync check ──
  await triggerMeiliSync();

  // ── Summary ──
  console.log("");
  console.log("=======================================================");
  console.log("  IMPORT COMPLETE");
  console.log("=======================================================");
  log("  Feed rows:     " + stats.feedRows);
  log("  Already in DB: " + stats.existingInDb);
  log("  New created:   " + stats.created);
  log("  Updated:       " + stats.updated);
  log("  Skipped:       " + stats.skipped);
  log("  Errors:        " + stats.errors);

  if (stats.unmappedCategories.size > 0) {
    console.log("");
    log("Unmapped L1 categories:");
    for (const cat of stats.unmappedCategories) {
      log("  - " + cat);
    }
  }

  // Resolver v2 classification summary
  if (!USE_LEGACY_RESOLVER && (stats.classifyAuto + stats.classifyNeedsReview + stats.classifyBuckets) > 0) {
    console.log("");
    log("Resolver v2 classification:");
    log("  auto-assigned (conf>=0.85):    " + stats.classifyAuto);
    log("  needs review (0.60-0.84):       " + stats.classifyNeedsReview);
    log("  review bucket (<0.60):          " + stats.classifyBuckets);
    log("  by method:");
    const entries = Object.entries(stats.classifyMethods).sort((a, b) => b[1] - a[1]);
    for (const [m, n] of entries) log("    " + m.padEnd(32) + " " + n);
    if (stats.unmappedPaths.size > 0) {
      log("  top unmapped paths (review bucket):");
      const paths = [...stats.unmappedPaths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      for (const [p, n] of paths) log("    [" + n + "] " + p);
    }
  }

  try { await auditPg.end(); } catch {}
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
