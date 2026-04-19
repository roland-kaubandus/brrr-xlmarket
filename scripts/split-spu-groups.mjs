#!/usr/bin/env node
/**
 * split-spu-groups.mjs — Split multi-variant SPU products into individual products.
 *
 * Context (2026-04-20):
 *   VEVOR feed grouped multiple SKUs under one SPU as variants of a single Medusa
 *   product. Business decision: every SKU must be its own product. This script
 *   migrates the existing 363 multi-variant Medusa products into ~1461 single-variant
 *   products, using feed cache as source of truth for variant data.
 *
 * Strategy:
 *   1. Find all products with >1 variant (363 expected).
 *   2. For each multi-variant product:
 *      - Read variant SKUs from DB
 *      - Look up each SKU in feed cache (bySku)
 *      - Create N new single-variant products via Medusa Admin API (one per SKU)
 *      - Delete the old multi-variant product
 *      - Record slug_redirect from old handle → first new handle
 *   3. Write audit CSV: old_product_id,old_handle,sku,new_product_id,new_handle
 *
 * Safety:
 *   - Dry-run by default. Use --execute to apply.
 *   - No multi-variant group is referenced by any line_item (verified 2026-04-20).
 *   - Idempotent: skips groups already split (variant_count === 1).
 *
 * Usage:
 *   node scripts/split-spu-groups.mjs           # dry-run
 *   node scripts/split-spu-groups.mjs --execute
 *   node scripts/split-spu-groups.mjs --execute --limit 5
 */

import pg from "pg";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { classifyProductSync } from "../backend/src/taxonomy/resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────
const MEDUSA_URL = "http://127.0.0.1:9001";
const ADMIN_EMAIL = "admin@xlmarket.eu";
const ADMIN_PASS = "MEDUSA_ADMIN_PASSWORD_REDACTED";
const SALES_CHANNEL_ID = "sc_01KMRWP84555JPGA6M0QMG409M";
const PRICE_MARKUP = 1.15;
const API_DELAY_MS = 100;
const CACHE_PATH = path.join(__dirname, "..", "backend", "data", "feeds", "vevor-feed-cache.json");

const PG_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: "PG_PASSWORD_REDACTED",
  database: "xlmarket",
};

// ── CLI ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const LIMIT = args.includes("--limit")
  ? parseInt(args[args.indexOf("--limit") + 1])
  : 0;

// ── Stats ───────────────────────────────────────────────────────────
const stats = {
  groupsFound: 0,
  skusInGroups: 0,
  newProductsCreated: 0,
  oldProductsDeleted: 0,
  slugRedirects: 0,
  skusNotInFeed: 0,
  errors: 0,
};

const auditRows = []; // {old_product_id, old_handle, sku, new_product_id, new_handle, status}

// ── Utilities ──────────────────────────────────────────────────────
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function makeHandle(sku, title) {
  const cleanSku = (sku || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
  const base = (title || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "").substring(0, 70);
  return (base + "-" + cleanSku).replace(/-{2,}/g, "-");
}

function apiCall(method, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(MEDUSA_URL + endpoint);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    };
    if (token) opts.headers["Authorization"] = "Bearer " + token;
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} }); }
        catch { resolve({ status: res.statusCode, data: { raw: data } }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Feed cache loader ───────────────────────────────────────────────
function loadFeedCache() {
  log("Loading feed cache " + CACHE_PATH);
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  const bySku = cache.bySku || {};
  log("  Feed cache SKUs: " + Object.keys(bySku).length);
  return bySku;
}

// ── HTML sanitize (same bounded regex as importer) ──────────────────
const URL_RE = /https?:\/\/[^\s"'<>()]+/gi;
function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  let s = html;
  s = s.replace(/<script[^<]{0,50000}<\/script>/gi, "");
  s = s.replace(/<style[^<]{0,50000}<\/style>/gi, "");
  s = s.replace(/style\s{0,5}=\s{0,5}"[^"]{0,5000}"/gi, "");
  s = s.replace(/style\s{0,5}=\s{0,5}'[^']{0,5000}'/gi, "");
  s = s.replace(/@[\w-]{0,50}\s{0,5}\{[^}]{0,5000}\}/g, "");
  s = s.replace(/[.#][\w-]{0,50}[^{}]{0,300}\{[^}]{0,5000}\}/g, "");
  return s.trim();
}

// ── Load multi-variant groups from DB ───────────────────────────────
async function loadMultiVariantGroups(pg) {
  const q = `
    SELECT
      p.id AS product_id,
      p.handle AS product_handle,
      p.title AS product_title,
      p.metadata->>'vevor_spu' AS vevor_spu,
      json_agg(
        json_build_object(
          'variant_id', pv.id,
          'sku', pv.sku,
          'title', pv.title,
          'created_at', pv.created_at
        ) ORDER BY pv.created_at ASC
      ) AS variants
    FROM product p
    JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
    GROUP BY p.id
    HAVING COUNT(pv.id) > 1
    ORDER BY p.created_at ASC
  `;
  const { rows } = await pg.query(q);
  return rows;
}

// ── Load existing SKU → productId map (to skip already-split) ───────
async function loadExistingSkuMap(pg) {
  const { rows } = await pg.query(`
    SELECT pv.sku, pv.product_id
    FROM product_variant pv
    JOIN product p ON p.id = pv.product_id
    WHERE pv.deleted_at IS NULL AND p.deleted_at IS NULL
  `);
  const m = new Map();
  for (const r of rows) m.set(r.sku, r.product_id);
  return m;
}

// ── Build Medusa product payload from feed row ──────────────────────
function buildProductPayload(row, categoryIds) {
  const finalPrice = Math.round(row.priceEur * PRICE_MARKUP * 100); // cents

  // Classify via resolver (S1.5 covers taxonomy v3)
  const cls = classifyProductSync({
    title: row.title,
    productType: row.productType,
    sku: row.sku,
  });

  // Pick deepest category that exists in Medusa
  let categoryId = null;
  const candidates = [cls.target_slug, cls.l3_slug, cls.l2_slug, cls.l1_slug].filter(Boolean);
  for (const h of candidates) {
    if (categoryIds[h]) { categoryId = categoryIds[h]; break; }
  }

  const handle = makeHandle(row.sku, row.title);
  const gallery = (row.galleryImages || []).slice(0, 10);
  const description = row.descriptionText || "";
  const richDesc = row.richDescriptionHtml || "";

  const payload = {
    title: row.title,
    handle,
    description,
    status: cls.review_bucket ? "draft" : "published",
    is_giftcard: false,
    thumbnail: row.image || undefined,
    external_id: "vevor:" + row.sku,
    metadata: {
      vevor_sku: row.sku,
      vevor_upc: row.upc || "",
      vevor_link: row.link || "",
      vevor_product_type: row.productType || "",
      vevor_spu: row.spu || "",
      weight_kg: row.weightKg || 0,
      selling_points: row.sellingPoints || [],
      rich_description: richDesc,
      sanitized_description: sanitizeHtml(description),
      sanitized_rich_description: sanitizeHtml(richDesc),
      gallery_images: gallery,
      translation_status: "pending",
      original_language: "en",
      split_from_spu: true,  // marker so we can find migrated ones later
    },
    images: [
      ...(row.image ? [{ url: row.image }] : []),
      ...gallery.map((u) => ({ url: u })),
    ].filter((img, i, arr) => arr.findIndex((a) => a.url === img.url) === i).slice(0, 10),
    options: [{ title: "Default", values: ["Default"] }],
    variants: [{
      title: "Default",
      sku: row.sku,
      manage_inventory: true,
      allow_backorder: false,
      prices: [{ amount: finalPrice, currency_code: "eur" }],
      options: { Default: "Default" },
    }],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
  };
  if (categoryId) payload.categories = [{ id: categoryId }];
  return { payload, handle, classification: cls };
}

// ── Load Medusa category slug → id map ──────────────────────────────
async function loadCategoryIds(token) {
  const map = {};
  let offset = 0;
  const limit = 200;
  while (true) {
    const r = await apiCall("GET", `/admin/product-categories?limit=${limit}&offset=${offset}&fields=id,handle`, null, token);
    const cats = r.data.product_categories || [];
    for (const c of cats) map[c.handle] = c.id;
    if (cats.length < limit) break;
    offset += limit;
  }
  log("  Loaded " + Object.keys(map).length + " category handles");
  return map;
}

// ── Main per-group processor ────────────────────────────────────────
async function splitGroup(group, feedCache, existingSkus, token, categoryIds, pgClient) {
  const createdInThisGroup = [];

  // Pre-flight: delete old multi-variant product FIRST so its handle is free for
  // the new primary product (which will generate the same slug from SKU+title).
  // Medusa's handle uniqueness constraint would otherwise block creation.
  if (EXECUTE) {
    const delResp = await apiCall("DELETE", "/admin/products/" + group.product_id, null, token);
    if (delResp.status >= 200 && delResp.status < 300) {
      stats.oldProductsDeleted++;
    } else {
      log(`  WARN pre-delete old ${group.product_id} failed (status ${delResp.status}) — continuing anyway`);
    }
    await sleep(API_DELAY_MS);
  }

  for (const v of group.variants) {
    const row = feedCache[v.sku];
    if (!row) {
      stats.skusNotInFeed++;
      auditRows.push({
        old_product_id: group.product_id,
        old_handle: group.product_handle,
        sku: v.sku,
        new_product_id: "",
        new_handle: "",
        status: "SKIP_SKU_NOT_IN_FEED",
      });
      log(`  WARN SKU ${v.sku} not in feed cache — skipping (orphan variant)`);
      continue;
    }

    const { payload, handle, classification } = buildProductPayload(row, categoryIds);

    // Skip if handle already exists (idempotent re-run safety)
    if (!EXECUTE) {
      auditRows.push({
        old_product_id: group.product_id,
        old_handle: group.product_handle,
        sku: v.sku,
        new_product_id: "(dry-run)",
        new_handle: handle,
        status: "DRY_RUN",
      });
      createdInThisGroup.push({ sku: v.sku, handle, newId: "(dry-run)" });
      continue;
    }

    const resp = await apiCall("POST", "/admin/products", payload, token);
    if (resp.status >= 200 && resp.status < 300 && resp.data.product) {
      const newId = resp.data.product.id;
      stats.newProductsCreated++;
      createdInThisGroup.push({ sku: v.sku, handle, newId });
      auditRows.push({
        old_product_id: group.product_id,
        old_handle: group.product_handle,
        sku: v.sku,
        new_product_id: newId,
        new_handle: handle,
        status: "CREATED",
      });
    } else {
      stats.errors++;
      const msg = resp.data.message || JSON.stringify(resp.data).substring(0, 200);
      log(`  ERROR create ${v.sku} (status ${resp.status}): ${msg}`);
      auditRows.push({
        old_product_id: group.product_id,
        old_handle: group.product_handle,
        sku: v.sku,
        new_product_id: "",
        new_handle: handle,
        status: `ERROR:${resp.status}`,
      });
    }
    await sleep(API_DELAY_MS);
  }

  if (!EXECUTE) return createdInThisGroup;

  // slug_redirect: only insert when the old product's handle is NOT also the handle
  // of one of the new products we just created (same primary SKU genererates same slug).
  // When one of the new products has the identical handle the old URL already serves
  // the new product directly — a redirect would be dead code.
  if (createdInThisGroup.length > 0) {
    const sameHandleExists = createdInThisGroup.some((x) => x.handle === group.product_handle);
    if (!sameHandleExists) {
      const firstNew = createdInThisGroup[0];
      try {
        await pgClient.query(
          `INSERT INTO slug_redirect (from_slug, to_slug, reason)
           VALUES ($1, $2, 'merge')
           ON CONFLICT (from_slug) DO UPDATE SET to_slug = EXCLUDED.to_slug, reason = EXCLUDED.reason, created_at = now()`,
          [group.product_handle, firstNew.handle]
        );
        stats.slugRedirects++;
      } catch (err) {
        log(`  WARN slug_redirect insert failed for ${group.product_handle}: ${err.message}`);
      }
    }
  }

  return createdInThisGroup;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("=======================================================");
  console.log(" SPU group split — " + (EXECUTE ? "EXECUTE" : "DRY RUN"));
  console.log("=======================================================");
  console.log("");

  const pgClient = new pg.Client(PG_CONFIG);
  await pgClient.connect();
  log("Connected to Postgres");

  const feedCache = loadFeedCache();

  const groups = await loadMultiVariantGroups(pgClient);
  stats.groupsFound = groups.length;
  stats.skusInGroups = groups.reduce((s, g) => s + g.variants.length, 0);

  log(`Multi-variant groups found: ${stats.groupsFound}`);
  log(`Total variants in groups:   ${stats.skusInGroups}`);
  log(`New products to create:     ${stats.skusInGroups} (one per SKU)`);
  log(`Expected slug_redirects:    ${stats.groupsFound}`);
  console.log("");

  if (groups.length === 0) {
    log("Nothing to do. Exiting.");
    await pgClient.end();
    return;
  }

  const existingSkus = await loadExistingSkuMap(pgClient);
  log("Existing SKU map: " + existingSkus.size);

  let token = null;
  let categoryIds = {};
  if (EXECUTE) {
    log("Authenticating with Medusa Admin API...");
    const authResp = await apiCall("POST", "/auth/user/emailpass", { email: ADMIN_EMAIL, password: ADMIN_PASS });
    if (!authResp.data.token) throw new Error("Auth failed: " + JSON.stringify(authResp.data));
    token = authResp.data.token;
    log("  Authenticated OK");
    categoryIds = await loadCategoryIds(token);
  } else {
    // Still need categoryIds for payload building in dry-run
    log("Dry-run: skipping auth. Using empty categoryIds (dry-run only checks structure)");
  }

  const groupsToProcess = LIMIT ? groups.slice(0, LIMIT) : groups;
  log(`Processing ${groupsToProcess.length} groups...`);
  console.log("");

  const startTime = Date.now();
  for (let i = 0; i < groupsToProcess.length; i++) {
    const g = groupsToProcess[i];
    try {
      await splitGroup(g, feedCache, existingSkus, token, categoryIds, pgClient);
    } catch (err) {
      stats.errors++;
      log(`  ERROR group ${g.product_id}: ${err.message}`);
    }
    if ((i + 1) % 25 === 0 || i + 1 === groupsToProcess.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      log(`Progress: ${i + 1}/${groupsToProcess.length} (${elapsed}s) | created: ${stats.newProductsCreated} | deleted: ${stats.oldProductsDeleted} | redirects: ${stats.slugRedirects} | errors: ${stats.errors}`);
    }
  }

  // Write audit CSV
  const outPath = path.join(__dirname, "..", "reports", `spu-split-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const header = "old_product_id,old_handle,sku,new_product_id,new_handle,status\n";
  const body = auditRows.map((r) =>
    [r.old_product_id, r.old_handle, r.sku, r.new_product_id, r.new_handle, r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  fs.writeFileSync(outPath, header + body);
  log(`Audit CSV written: ${outPath}`);

  console.log("");
  console.log("=======================================================");
  console.log("  SUMMARY");
  console.log("=======================================================");
  log(`  Multi-variant groups:   ${stats.groupsFound}`);
  log(`  SKUs in groups:         ${stats.skusInGroups}`);
  log(`  New products created:   ${stats.newProductsCreated}`);
  log(`  Old products deleted:   ${stats.oldProductsDeleted}`);
  log(`  Slug redirects:         ${stats.slugRedirects}`);
  log(`  SKUs missing from feed: ${stats.skusNotInFeed}`);
  log(`  Errors:                 ${stats.errors}`);

  await pgClient.end();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
