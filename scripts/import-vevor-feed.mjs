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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────
const FEED_PATH = path.join(__dirname, "..", "backend", "data", "feeds", "vevor-571.xlsx");
const FEED_URL = "https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/571/vevor-571.xlsx";
const CATEGORY_MAP_PATH = path.join(__dirname, "..", "backend", "src", "scripts", "category-map.json");

const MEDUSA_URL = "http://127.0.0.1:9001";
const ADMIN_EMAIL = "admin@xlmarket.eu";
const ADMIN_PASS = "MEDUSA_ADMIN_PASSWORD_REDACTED";

const PG_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: "PG_PASSWORD_REDACTED",
  database: "xlmarket",
};

const MEILI_HOST = "http://127.0.0.1:7700";
const MEILI_KEY = "MEILI_MASTER_KEY_REDACTED";
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
    "SELECT metadata->>'vevor_sku' AS sku, id FROM product WHERE metadata->>'vevor_sku' IS NOT NULL AND deleted_at IS NULL"
  );

  const map = new Map();
  for (const row of result.rows) {
    if (row.sku) map.set(row.sku, row.id);
  }

  await client.end();
  log("  Found " + map.size + " existing VEVOR products in DB");
  stats.existingInDb = map.size;
  return map;
}

// ── Category mapping ────────────────────────────────────────────────

function loadCategoryMap() {
  try {
    return JSON.parse(fs.readFileSync(CATEGORY_MAP_PATH, "utf-8"));
  } catch {
    log("  WARNING: category-map.json not found, categories will be skipped");
    return {};
  }
}

async function loadCategoryIds(token) {
  const resp = await apiCall("GET", "/admin/product-categories?limit=100", null, token);
  const map = {};
  for (const cat of resp.data.product_categories || []) {
    map[cat.handle] = cat.id;
  }
  log("  Loaded " + Object.keys(map).length + " category IDs from Medusa");
  return map;
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
    .replace(/\.[a-z][\w-]*(?:\s+[\w.#:\[\]=~^|*>,+\s-]*)*\s*\{[^}]*\}/gi, "")
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

async function createProductFromGroup(spuGroup, token, catMap, catIds) {
  const option = extractOption(spuGroup)
  const primaryRow = spuGroup[0] // Use first row for shared product data
  const anyInStock = spuGroup.some(r => r.availability === "in stock")
  const handle = makeHandle(primaryRow.sku, primaryRow.title)

  // Map category from primary row
  const l1 = (primaryRow.productType || "").split(">")[0].trim()
  const categoryHandle = catMap[l1] || null
  const categoryId = categoryHandle ? catIds[categoryHandle] : null
  if (!categoryHandle && l1) stats.unmappedCategories.add(l1)

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

  const productData = {
    title: primaryRow.title,
    handle,
    description: primaryRow.description || "",
    status: anyInStock ? "published" : "draft",
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
      rich_description: cleanRichDescription(primaryRow.richDescriptionHtml, allGalleryImages),
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

  const resp = await apiCall("POST", "/admin/products", productData, token)
  if (resp.status >= 200 && resp.status < 300 && resp.data.product) {
    stats.created++
    if (spuGroup.length > 1) stats.variantGroupsCreated = (stats.variantGroupsCreated || 0) + 1
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
async function createProduct(row, token, catMap, catIds) {
  const finalPrice = Math.round(row.price * PRICE_MARKUP * 100); // cents
  const handle = makeHandle(row.sku, row.title);
  const isInStock = row.availability === "in stock";

  // Map category
  const l1 = (row.productType || "").split(">")[0].trim();
  const categoryHandle = catMap[l1] || null;
  const categoryId = categoryHandle ? catIds[categoryHandle] : null;

  if (!categoryHandle && l1) {
    stats.unmappedCategories.add(l1);
  }

  const productData = {
    title: row.title,
    handle: handle,
    description: row.description || "",
    status: isInStock ? "published" : "draft",
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
      rich_description: cleanRichDescription(
        row.richDescriptionHtml,
        row.originalImages.length > 0 ? row.originalImages : row.galleryImages
      ),
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

  const resp = await apiCall("POST", "/admin/products", productData, token);

  if (resp.status >= 200 && resp.status < 300 && resp.data.product) {
    stats.created++;
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

async function updateProduct(productId, row, token) {
  const finalPrice = Math.round(row.price * PRICE_MARKUP * 100);
  const isInStock = row.availability === "in stock";

  try {
    // Update product status, metadata, and images
    const galleryImgs = row.originalImages.length > 0 ? row.originalImages : row.galleryImages;
    const updateData = {
      status: isInStock ? "published" : "draft",
      thumbnail: row.mainOriginalImage || row.image || undefined,
      metadata: {
        vevor_sku: row.sku,
        vevor_upc: row.upc || "",
        vevor_link: row.link || "",
        vevor_product_type: row.productType || "",
        vevor_spu: row.spu || "",
        weight_kg: row.weight || 0,
        selling_points: row.sellingPoints || [],
        rich_description: row.richDescriptionHtml ? row.richDescriptionHtml.substring(0, 15000) : null,
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
    await apiCall("POST", "/admin/products/" + productId, updateData, token);

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
  const newSpuGroups = [];

  for (const [spu, group] of spuGroups) {
    // Check if ANY SKU in the group already exists
    const existingIds = group.map(r => existingSkus.get(r.sku)).filter(Boolean);

    if (existingIds.length > 0) {
      // At least one variant exists — mark all as update
      for (const row of group) {
        const existingId = existingSkus.get(row.sku);
        if (existingId) {
          updateRows.push(Object.assign({}, row, { productId: existingId }));
        } else {
          // New variant for existing SPU group — treat as new for now
          newRows.push(row);
        }
      }
    } else {
      // Entirely new SPU group
      newSpuGroups.push(group);
      for (const row of group) newRows.push(row);
    }
  }

  stats.newProducts = newRows.length;
  stats.toUpdate = updateRows.length;

  console.log("");
  log("=== Analysis ===");
  log("  Feed total:          " + stats.feedRows);
  log("  Already in DB:       " + stats.existingInDb);
  log("  New to import:       " + stats.newProducts + " (in " + newSpuGroups.length + " SPU groups)");
  log("  Existing (updatable):" + stats.toUpdate);
  console.log("");

  // Show category distribution for new products
  const categoryMap = loadCategoryMap();
  const catCounts = {};
  for (const row of newRows) {
    const l1 = (row.productType || "").split(">")[0].trim();
    const mapped = categoryMap[l1] || "UNMAPPED";
    catCounts[mapped] = (catCounts[mapped] || 0) + 1;
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

  // ── Step 4: Create new products (SPU-grouped) ──
  const groupsToCreate = LIMIT ? newSpuGroups.slice(0, LIMIT) : newSpuGroups;
  if (groupsToCreate.length > 0) {
    const totalProducts = groupsToCreate.reduce((s, g) => s + g.length, 0);
    log("Creating " + groupsToCreate.length + " product groups (" + totalProducts + " variants, batch delay: " + API_DELAY_MS + "ms)...");
    const startTime = Date.now();

    for (let i = 0; i < groupsToCreate.length; i++) {
      const group = groupsToCreate[i];
      try {
        await createProductFromGroup(group, token, categoryMap, categoryIds);
      } catch (err) {
        stats.errors++;
        if (stats.errors <= 20) {
          log("  ERROR [" + group[0].sku + " SPU=" + group[0].spu + "]: " + err.message);
        }
      }
      await sleep(API_DELAY_MS);

      if ((i + 1) % 50 === 0 || i + 1 === groupsToCreate.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        log("  Progress: " + (i + 1) + "/" + groupsToCreate.length + " groups (" + elapsed + "s) | created: " + stats.created + " errors: " + stats.errors + " variant_groups: " + (stats.variantGroupsCreated || 0));
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
        await updateProduct(row.productId, row, token);
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
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
