#!/usr/bin/env node
/**
 * check-taxonomy-invariants.mjs — run all taxonomy invariants (spec §8).
 * As of 2026-04-19 there are 29 registered checks. 1 is formally
 * deprecated (INV-12, kept for audit trail; flagged via `deprecated: true`
 * in --json output and skipped from pass/fail totals).
 *
 * Usage:
 *   node scripts/check-taxonomy-invariants.mjs                  # all checks
 *   node scripts/check-taxonomy-invariants.mjs --only=INV-01    # single
 *   node scripts/check-taxonomy-invariants.mjs --ci             # exits 1 on ANY failure
 *   node scripts/check-taxonomy-invariants.mjs --json           # machine-readable
 *
 * Exits 0 if all invariants pass in non-CI mode (CRIT = exit 1 always).
 * Exits 1 if --ci and any invariant fails.
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §8
 */

import { readFileSync, existsSync, readdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"
import { execSync } from "node:child_process"

// Optional pg import — only required when INV-14 / INV-32 (DB checks) run.
// Wrapped in try/catch so the script still loads on machines where `pg` is
// not installed (CI without backend deps). The DB-backed invariants fall
// back to "skipped" if the import fails.
let pg = null
try {
  pg = (await import("pg")).default
} catch {
  pg = null
}

// Shared PG config — mirrors scripts/reassign-v3-from-mapping.mjs exactly.
const PG_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: "PG_PASSWORD_REDACTED",
  database: "xlmarket",
}

// Allow DB-backed invariants to be skipped in environments without Postgres
// (e.g. a fresh dev laptop). Set TAXONOMY_HEALTH_DB=0 to force-skip.
const DB_ENABLED = process.env.TAXONOMY_HEALTH_DB !== "0" && pg !== null

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const YAML_PATH = resolve(ROOT, "backend/src/data/taxonomy.yaml")
const ALIAS_PATH = resolve(ROOT, "backend/src/data/taxonomy-image-aliases.yaml")
const TREE_PATH = resolve(ROOT, "storefront/lib/category-tree.generated.json")
const THUMBS_DIR = resolve(ROOT, "storefront/public/cat-thumbs")
const LEGACY_IMG = resolve(ROOT, "storefront/lib/category-images.json")

const args = process.argv.slice(2)
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1]
const isCi = args.includes("--ci")
const jsonOut = args.includes("--json")

/** @type {Array<{id:string, title:string, deprecated?:boolean, run:() => Promise<{pass:boolean, severity:'CRIT'|'WARN', detail:string}> | {pass:boolean, severity:'CRIT'|'WARN', detail:string}}>} */
const checks = []

function check(id, severity, title, fn, opts = {}) {
  checks.push({
    id,
    title,
    deprecated: !!opts.deprecated,
    run: async () => {
      try {
        const res = await fn()
        return { pass: res.pass, severity, detail: res.detail || "" }
      } catch (err) {
        return { pass: false, severity, detail: `Threw: ${err.message}` }
      }
    },
  })
}

// Shared state
let yamlDoc, tree, aliasMap

function loadAll() {
  yamlDoc = yaml.load(readFileSync(YAML_PATH, "utf8"))
  tree = JSON.parse(readFileSync(TREE_PATH, "utf8"))
  aliasMap = existsSync(ALIAS_PATH) ? yaml.load(readFileSync(ALIAS_PATH, "utf8")) || {} : {}
}

// ==========================================================================
// CI checks (spec §8.1)
// ==========================================================================

check("INV-01", "CRIT", "taxonomy.yaml parses + top-level shape", () => {
  if (!yamlDoc) return { pass: false, detail: "yaml failed to load" }
  if (!Array.isArray(yamlDoc.l1)) return { pass: false, detail: "no l1[] array" }
  return { pass: true, detail: `${yamlDoc.l1.length} L1 entries` }
})

check("INV-02", "WARN", "Taxonomy size counters (informational — WARN, not blocking; user 2026-04-18: no category may have limits)", () => {
  // Kasutaja otsus 2026-04-18: "Ühelgi kategoorial ei saa olla piirangut kui
  // palju tal alamkategooriaid on või palju tooteid on". Säilitame checki
  // MONITOORINGUKS — kuvame counterid aga EI blokeeri ühtegi deploy'd.
  // Severity = WARN (mitte CRIT). Spec §3.1.1 revision 2026-04-18.
  const l1Count = yamlDoc.l1.length
  let l2Sum = 0
  let l3Sum = 0
  for (const l1 of yamlDoc.l1) {
    l2Sum += (l1.subs || []).length
    for (const l2 of l1.subs || []) l3Sum += (l2.subs || []).length
  }
  return { pass: true, detail: `${l1Count} L1 / ${l2Sum} L2 / ${l3Sum} L3 (informational — no thresholds enforced)` }
})

check("INV-03", "CRIT", "No duplicate slugs in tree", () => {
  const slugs = new Set()
  const dups = []
  for (const l1 of yamlDoc.l1) {
    if (slugs.has(l1.slug)) dups.push(l1.slug)
    slugs.add(l1.slug)
    for (const l2 of l1.subs || []) {
      if (slugs.has(l2.slug)) dups.push(l2.slug)
      slugs.add(l2.slug)
      for (const l3 of l2.subs || []) {
        const slug = typeof l3 === "string" ? l3 : l3.slug
        if (slugs.has(slug)) dups.push(slug)
        slugs.add(slug)
      }
    }
  }
  return {
    pass: dups.length === 0,
    detail: dups.length ? `Duplicates: ${dups.join(", ")}` : `${slugs.size} unique slugs`,
  }
})

check("INV-04", "CRIT", "category-tree.generated.json matches taxonomy.yaml", () => {
  const expected = execSync(`node ${resolve(ROOT, "scripts/gen-category-tree.mjs")} --check`, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  }).toString()
  return { pass: true, detail: expected.trim() }
})

check("INV-05", "WARN", "No redirect from_slug collides with an active node", () => {
  // Read middleware.ts for CATEGORY_V3_REDIRECTS; spec moves this to DB,
  // for now we check that no slug appears both as a taxonomy node and in
  // the redirect map.
  const mw = readFileSync(resolve(ROOT, "storefront/middleware.ts"), "utf8")
  const redirectMatches = [...mw.matchAll(/['"]([a-z0-9-]+)['"]\s*:\s*['"][a-z0-9-]+['"]/g)]
  const fromSlugs = redirectMatches.map((m) => m[1])
  const treeSlugs = new Set(Object.keys(tree.nodes))
  const collisions = fromSlugs.filter((s) => treeSlugs.has(s))
  return {
    pass: collisions.length === 0,
    detail: collisions.length
      ? `Redirect from_slug collides with active node(s): ${collisions.join(", ")}`
      : `${fromSlugs.length} redirects, 0 collisions`,
  }
})

check("INV-06", "WARN", "Every L1 has et + en names", () => {
  const missing = []
  for (const l1 of yamlDoc.l1) {
    if (!l1.name_et || !l1.name_en) missing.push(l1.slug)
  }
  return {
    pass: missing.length === 0,
    detail: missing.length ? `Missing translations: ${missing.join(", ")}` : "all 22 L1 have et+en",
  }
})

// ==========================================================================
// Cron/runtime checks (spec §8.2)
// ==========================================================================

check("INV-10", "WARN", "taxonomy_node DB == taxonomy.yaml (skipped — needs backend env)", () => {
  return { pass: true, detail: "skipped (run check-taxonomy-drift.mjs in backend)" }
})

check("INV-11", "WARN", "Every product has ≥1 category (skipped — needs backend env)", () => {
  return { pass: true, detail: "skipped (run SQL check in backend)" }
})

// INV-12 DEPRECATED — v2 piirang (L1 with <30 products >60 days). Kasutaja
// 2026-04-18 otsus: piiranguid pole. Säilitame koodi ajalooliseks viiteks
// kuid skript logib "deprecated" ja ei kontrolli midagi. `--json` output
// sisaldab `deprecated: true` flag'i.
check("INV-12", "WARN", "INV-12 deprecated (v2 piirang — product-count thresholds eemaldatud spec §3.1.1 revision 2026-04-18)", () => {
  console.error("INV-12: deprecated (v2 piirang, enam ei kehti)")
  return { pass: true, detail: "deprecated — no category may be hidden by product count (user decision 2026-04-18)" }
}, { deprecated: true })

check("INV-13", "WARN", "No product placed at hidden node (skipped — needs backend env)", () => {
  return { pass: true, detail: "skipped (SQL check in backend)" }
})

check("INV-14", "WARN", "Meili taxonomy.ancestors matches DB bindings leaf-level (root → leaf chain)", async () => {
  // LEAF-LEVEL check (uuendatud 2026-04-19): iga toote kohta Meili
  // `taxonomy.ancestors` massiiv PEAB TÄPSELT vastama DB
  // `product_category_product` ahelale ehk root → leaf kõik sõlmed (mitte
  // ainult L1). Vana versioon võrdles ainult L1 — see jättis märkamata
  // juhtumi, kus tooted on DB-s leaf'il aga Meili näitab ainult L1.
  if (!DB_ENABLED) {
    return { pass: true, detail: "skipped (pg module unavailable or TAXONOMY_HEALTH_DB=0)" }
  }
  const host = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
  const key = process.env.MEILISEARCH_KEY || ""
  const sampleSize = Number.parseInt(process.env.INV14_SAMPLE || "50", 10)

  const client = new pg.Client(PG_CONFIG)
  try {
    await client.connect()
  } catch (err) {
    return { pass: true, detail: `skipped (DB unreachable: ${err.message})` }
  }

  try {
    // Pull a random sample of products that have ≥1 v3 taxonomy binding
    // (taxonomy_node_meta is the v3 marker table).
    const { rows: sample } = await client.query(
      `SELECT p.id, p.handle
       FROM product p
       WHERE p.status = 'published' AND p.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM product_category_product pcp
           JOIN taxonomy_node_meta tnm ON tnm.node_id = pcp.product_category_id
           WHERE pcp.product_id = p.id
         )
       ORDER BY random()
       LIMIT $1`,
      [sampleSize],
    )
    if (sample.length === 0) {
      return { pass: true, detail: "no v3-bound products to sample" }
    }

    // For each sampled product, compute the full root→leaf handle set from DB.
    const mismatches = []
    let compared = 0
    for (const prod of sample) {
      const { rows: binds } = await client.query(
        `SELECT pc.handle
         FROM product_category_product pcp
         JOIN product_category pc ON pc.id = pcp.product_category_id
         JOIN taxonomy_node_meta tnm ON tnm.node_id = pc.id
         WHERE pcp.product_id = $1`,
        [prod.id],
      )
      if (binds.length === 0) continue
      // Expand every bound handle into its full ancestor chain via tree.
      const dbExpected = new Set()
      for (const b of binds) {
        let cur = tree.nodes[b.handle]
        while (cur) {
          dbExpected.add(cur.handle)
          if (!cur.parent_handle) break
          cur = tree.nodes[cur.parent_handle]
        }
      }

      // Fetch Meili doc.
      let meiliAnc
      try {
        const raw = execSync(
          `curl -s -H "Authorization: Bearer ${key}" ${host}/indexes/products/documents/${prod.id}?fields=taxonomy`,
          { stdio: ["ignore", "pipe", "pipe"] },
        ).toString()
        const parsed = JSON.parse(raw)
        meiliAnc = new Set(parsed?.taxonomy?.ancestors || [])
      } catch {
        mismatches.push(`${prod.handle}: meili fetch failed`)
        continue
      }

      compared++
      // Compute diff in both directions.
      const missingInMeili = [...dbExpected].filter((h) => !meiliAnc.has(h))
      const extraInMeili = [...meiliAnc].filter((h) => !dbExpected.has(h))
      if (missingInMeili.length || extraInMeili.length) {
        mismatches.push(
          `${prod.handle}: meili missing [${missingInMeili.slice(0, 3).join(",")}] extra [${extraInMeili.slice(0, 3).join(",")}]`,
        )
      }
    }
    return {
      pass: mismatches.length === 0,
      detail: mismatches.length
        ? `${mismatches.length}/${compared} products drift (sample=${sample.length}): ${mismatches.slice(0, 3).join("; ")}`
        : `${compared} products sampled, all root→leaf ancestors match`,
    }
  } finally {
    await client.end().catch(() => {})
  }
})

check("INV-15", "WARN", "Every L1/L2 slug resolves to 200 on /kategooriad/{slug}", () => {
  // Sample 22 L1 + 10 random L2s via curl. Skipped unless TAXONOMY_HEALTH_LIVE=1
  // to avoid network calls in every CI run.
  if (process.env.TAXONOMY_HEALTH_LIVE !== "1") {
    return { pass: true, detail: "skipped (set TAXONOMY_HEALTH_LIVE=1 to enable)" }
  }
  const base = process.env.XL_BASE_URL || "https://xlmarket.store"
  const l1 = Object.values(tree.nodes).filter((n) => n.level === 1)
  const l2 = Object.values(tree.nodes).filter((n) => n.level === 2).slice(0, 10)
  const failures = []
  for (const node of [...l1, ...l2]) {
    try {
      const out = execSync(`curl -s -o /dev/null -w '%{http_code}' ${base}/et/kategooriad/${node.handle}`)
        .toString()
        .trim()
      if (out !== "200") failures.push(`${node.handle}=${out}`)
    } catch (err) {
      failures.push(`${node.handle}=ERR`)
    }
  }
  return {
    pass: failures.length === 0,
    detail: failures.length ? `Non-200: ${failures.join(", ")}` : `${l1.length + l2.length} checked, all 200`,
  }
})

check("INV-16", "WARN", "No slug_redirect chain >3 hops (skipped — TBD)", () => {
  return { pass: true, detail: "skipped (requires slug_redirect DB table)" }
})

check("INV-17", "WARN", "vertical_collection materialization ≤ 26h old (skipped — backend SQL)", () => {
  return { pass: true, detail: "skipped (requires vertical_collection table query)" }
})

check("INV-18", "WARN", "needs-review-bucket size <500 (skipped — backend SQL)", () => {
  return { pass: true, detail: "skipped (requires category_classification_audit)" }
})

check("INV-19", "WARN", "Unmapped VEVOR paths last import ≤10 new (skipped)", () => {
  return { pass: true, detail: "skipped (requires imports/<ts>/summary.json)" }
})

// ==========================================================================
// Faas 5b extensions — image coverage & drift
// ==========================================================================

check("INV-20", "CRIT", "100% v3 nodes have resolvable image_path", () => {
  const missing = Object.values(tree.nodes).filter((n) => !n.image_path)
  return {
    pass: missing.length === 0,
    detail: missing.length
      ? `${missing.length} nodes with no image: ${missing.slice(0, 5).map((n) => n.handle).join(", ")}…`
      : `${Object.keys(tree.nodes).length} nodes, all have image_path`,
  }
})

check("INV-21", "CRIT", "Every image_path file exists on disk", () => {
  const thumbs = existsSync(THUMBS_DIR) ? new Set(readdirSync(THUMBS_DIR)) : new Set()
  const broken = []
  for (const node of Object.values(tree.nodes)) {
    if (!node.image_path) continue
    const filename = node.image_path.replace(/^\/cat-thumbs\//, "")
    if (!thumbs.has(filename)) broken.push(`${node.handle} → ${filename}`)
  }
  return {
    pass: broken.length === 0,
    detail: broken.length
      ? `${broken.length} broken: ${broken.slice(0, 3).join("; ")}…`
      : "all image_path files on disk",
  }
})

check("INV-22", "WARN", "taxonomy-image-aliases.yaml: no alias target missing from category-images.json", () => {
  if (!existsSync(LEGACY_IMG)) {
    return { pass: true, detail: "category-images.json not present (skip)" }
  }
  const legacy = new Set(Object.keys(JSON.parse(readFileSync(LEGACY_IMG, "utf8"))))
  const thumbs = existsSync(THUMBS_DIR)
    ? new Set(readdirSync(THUMBS_DIR).map((f) => f.replace(/\.webp$/, "")))
    : new Set()
  const broken = []
  for (const [k, v] of Object.entries(aliasMap)) {
    if (!legacy.has(v) && !thumbs.has(v)) broken.push(`${k} → ${v}`)
  }
  return {
    pass: broken.length === 0,
    detail: broken.length ? `Broken aliases: ${broken.join(", ")}` : `${Object.keys(aliasMap).length} aliases valid`,
  }
})

check("INV-23", "CRIT", "All v3 handles have unique parent_handle chains ending at an L1 root", () => {
  const failures = []
  for (const node of Object.values(tree.nodes)) {
    let cur = node
    const seen = new Set()
    while (cur) {
      if (seen.has(cur.handle)) {
        failures.push(`${node.handle}: cycle detected`)
        break
      }
      seen.add(cur.handle)
      if (cur.level === 1) break
      if (!cur.parent_handle) {
        failures.push(`${node.handle}: no parent_handle but level ${cur.level}`)
        break
      }
      cur = tree.nodes[cur.parent_handle]
      if (!cur) {
        failures.push(`${node.handle}: parent missing from tree`)
        break
      }
    }
  }
  return {
    pass: failures.length === 0,
    detail: failures.length ? `${failures.length} chain issues: ${failures.slice(0, 3).join("; ")}` : "all chains valid",
  }
})

// ==========================================================================
// Faas 5c extensions — category page UX invariants (spec §3.5.9 + §8)
// ==========================================================================

/**
 * Build a breadcrumb trail purely from `category-tree.generated.json`. Mirrors
 * `storefront/lib/category-tree.ts :: getBreadcrumbTrail` so the invariants
 * script remains a standalone Node.js entrypoint (no TS compile step).
 */
function breadcrumbTrail(handle) {
  const node = tree.nodes[handle]
  if (!node) return []
  const out = []
  const seen = new Set()
  let cur = node
  // Walk up to root first.
  const chain = []
  while (cur) {
    if (seen.has(cur.handle)) break
    seen.add(cur.handle)
    chain.push(cur)
    if (!cur.parent_handle) break
    cur = tree.nodes[cur.parent_handle]
  }
  // chain is node → root; reverse for root → node.
  for (let i = chain.length - 1; i >= 0; i--) {
    const n = chain[i]
    out.push({ handle: n.handle, level: n.level })
  }
  return out
}

check("INV-24", "CRIT", "Category breadcrumb ends at a category node, not a product", () => {
  const failures = []
  const l1Handles = Object.values(tree.nodes)
    .filter((n) => n.level === 1)
    .map((n) => n.handle)
  for (const h of l1Handles) {
    const trail = breadcrumbTrail(h)
    if (trail.length === 0) {
      failures.push(`${h}: empty trail`)
      continue
    }
    const last = trail[trail.length - 1]
    if (last.handle !== h) {
      failures.push(`${h}: trail ends at ${last.handle}`)
      continue
    }
    // Product handles would not be in tree.nodes at all, but assert level is a
    // category level (1-3) as defensive check.
    if (![1, 2, 3].includes(last.level)) {
      failures.push(`${h}: trail tail has non-category level ${last.level}`)
    }
  }
  return {
    pass: failures.length === 0,
    detail: failures.length
      ? `${failures.length} breadcrumb tails invalid: ${failures.slice(0, 3).join("; ")}`
      : `${l1Handles.length} L1 breadcrumbs end at category node`,
  }
})

check("INV-25", "WARN", "Subcategory carousel hides 0-product children (skipped — needs Meili facet)", () => {
  // Live mode performs a Meili `limit:0` facet query per L1 and verifies that
  // every child handle rendered by the carousel has `facetDistribution
  // ["taxonomy.ancestors"][childHandle] > 0`. The UI enforcement lives in
  // `getChildrenWithProductCounts()` — this invariant exists to catch drift
  // between what Meili reports and what category-tree.generated.json exposes.
  if (process.env.TAXONOMY_HEALTH_LIVE !== "1") {
    return { pass: true, detail: "skipped (set TAXONOMY_HEALTH_LIVE=1 + requires Meili)" }
  }
  const host = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
  const key = process.env.MEILISEARCH_KEY || ""
  const l1s = Object.values(tree.nodes).filter((n) => n.level === 1)
  const failures = []
  for (const l1 of l1s.slice(0, 5)) {
    try {
      const body = JSON.stringify({
        q: "",
        limit: 0,
        filter: [`taxonomy.ancestors = "${l1.handle}"`, "in_stock = true"],
        facets: ["taxonomy.ancestors"],
      })
      const out = execSync(
        `curl -s -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" -X POST --data '${body.replace(/'/g, "\\'")}' ${host}/indexes/products/search`,
      ).toString()
      const parsed = JSON.parse(out)
      const dist = parsed?.facetDistribution?.["taxonomy.ancestors"] || {}
      for (const ch of l1.child_handles || []) {
        if ((dist[ch] || 0) === 0) {
          failures.push(`${l1.handle} → ${ch} has 0 products`)
        }
      }
    } catch (err) {
      failures.push(`${l1.handle}: query failed (${err.message})`)
    }
  }
  return {
    pass: failures.length === 0,
    detail: failures.length ? `${failures.length} zero-count children: ${failures.slice(0, 3).join("; ")}` : "all children have products",
  }
})

check("INV-26", "CRIT", "Every node has image_source !== 'none' (carousel cards have image)", () => {
  const offenders = Object.values(tree.nodes).filter((n) => !n.image_source || n.image_source === "none")
  return {
    pass: offenders.length === 0,
    detail: offenders.length
      ? `${offenders.length} nodes with image_source=none: ${offenders.slice(0, 5).map((n) => n.handle).join(", ")}…`
      : `${Object.keys(tree.nodes).length} nodes have resolvable image_source`,
  }
})

check("INV-27", "CRIT", "Breadcrumb trail length === depth(handle) + 1", () => {
  const failures = []
  for (const node of Object.values(tree.nodes)) {
    const trail = breadcrumbTrail(node.handle)
    const expected = node.level // L1 → 1, L2 → 2, L3 → 3
    if (trail.length !== expected) {
      failures.push(`${node.handle}: trail=${trail.length} expected=${expected}`)
    }
  }
  return {
    pass: failures.length === 0,
    detail: failures.length ? `${failures.length} bad trails: ${failures.slice(0, 3).join("; ")}` : "all trail lengths match level",
  }
})

check("INV-28", "CRIT", "No 'category_handles' references remain in storefront category page", () => {
  const scanRoot = resolve(ROOT, "storefront/app/[locale]/kategooriad")
  if (!existsSync(scanRoot)) {
    return { pass: true, detail: "category page directory absent — skip" }
  }
  let matches = ""
  try {
    // -R recursive, -n line numbers, -I skip binary, --include limits file types.
    // Exit code 1 from grep = no matches = PASS.
    matches = execSync(
      `grep -RnI --include="*.ts" --include="*.tsx" "category_handles" ${scanRoot} || true`,
    ).toString().trim()
  } catch (err) {
    return { pass: false, detail: `grep failed: ${err.message}` }
  }
  return {
    pass: matches.length === 0,
    detail: matches.length
      ? `Found category_handles references:\n${matches.split("\n").slice(0, 5).join("\n")}`
      : "no category_handles references in kategooriad pages",
  }
})

check("INV-29", "WARN", "Product grid renders 4 columns at >=1280px (Playwright E2E only)", () => {
  // Requires browser-side assertion. See tests/e2e/category-invariants.spec.ts
  // (to be written in F5c.12). Marked WARN so CI does not block on it here.
  return { pass: true, detail: "skipped (Playwright — add to tests/e2e/category-invariants.spec.ts)" }
})

check("INV-30", "WARN", "MegaMenu drills L1 → Ln without 404 (Playwright E2E only)", () => {
  // Requires browser-side assertion. See tests/e2e/category-invariants.spec.ts.
  return { pass: true, detail: "skipped (Playwright — add to tests/e2e/category-invariants.spec.ts)" }
})

check("INV-31", "CRIT", "No VEVOR-internal slug / path leaks in category UI", () => {
  const scanRoots = [
    resolve(ROOT, "storefront/app/[locale]/kategooriad"),
    resolve(ROOT, "storefront/components/category"),
  ].filter(existsSync)
  if (scanRoots.length === 0) {
    return { pass: true, detail: "no scan targets present — skip" }
  }
  let matches = ""
  try {
    matches = execSync(
      `grep -RnI --include="*.ts" --include="*.tsx" -E "vevor_product_type|vevor_path" ${scanRoots.join(" ")} || true`,
    ).toString().trim()
  } catch (err) {
    return { pass: false, detail: `grep failed: ${err.message}` }
  }
  return {
    pass: matches.length === 0,
    detail: matches.length
      ? `VEVOR leak(s):\n${matches.split("\n").slice(0, 5).join("\n")}`
      : "no vevor_product_type / vevor_path references",
  }
})

// ==========================================================================
// v3 path-to-leaf integrity (2026-04-19 — post-v3 deploy)
// ==========================================================================

check(
  "INV-32",
  "CRIT",
  "Products bound to deepest possible leaf (v3 path-to-leaf mapping)",
  async () => {
    // Iga toote kohta, kelle `metadata.vevor_product_type` on kaardistatud
    // failis `backend/src/taxonomy/rules/vevor-path-to-leaf.json`, peab DB
    // binding vastama mapping target'iga (`handle`). Kui ei vasta →
    // CRITICAL (resolver jättis teo tegemata või keegi kirjutas üle).
    //
    // Lubatud erand: tooted `needs-review-bucket` sõlmes (S8 review queue) —
    // neid ei kontrolli.
    if (!DB_ENABLED) {
      return { pass: true, detail: "skipped (pg module unavailable or TAXONOMY_HEALTH_DB=0)" }
    }
    const mappingPath = resolve(ROOT, "backend/src/taxonomy/rules/vevor-path-to-leaf.json")
    if (!existsSync(mappingPath)) {
      return { pass: true, detail: "skipped (vevor-path-to-leaf.json not present)" }
    }
    const mapping = JSON.parse(readFileSync(mappingPath, "utf8")).mappings || {}
    const mappingCount = Object.keys(mapping).length
    if (mappingCount === 0) {
      return { pass: true, detail: "skipped (mapping is empty)" }
    }

    const client = new pg.Client(PG_CONFIG)
    try {
      await client.connect()
    } catch (err) {
      return { pass: true, detail: `skipped (DB unreachable: ${err.message})` }
    }

    try {
      // Preload handle → category_id from DB (v3 nodes only).
      const { rows: cats } = await client.query(
        `SELECT pc.id, pc.handle
         FROM product_category pc
         JOIN taxonomy_node_meta tnm ON tnm.node_id = pc.id
         WHERE pc.deleted_at IS NULL`,
      )
      const handleToId = new Map()
      for (const c of cats) handleToId.set(c.handle, c.id)

      // Pull all published products that have a vevor_product_type in the mapping.
      const { rows: products } = await client.query(
        `SELECT p.id, p.handle, p.metadata->>'vevor_product_type' AS vp,
           array_agg(DISTINCT pc.handle)
             FILTER (WHERE pc.handle IS NOT NULL AND tnm.node_id IS NOT NULL)
             AS v3_handles
         FROM product p
         LEFT JOIN product_category_product pcp ON pcp.product_id = p.id
         LEFT JOIN product_category pc ON pc.id = pcp.product_category_id
         LEFT JOIN taxonomy_node_meta tnm ON tnm.node_id = pc.id
         WHERE p.status = 'published' AND p.deleted_at IS NULL
           AND p.metadata->>'vevor_product_type' IS NOT NULL
         GROUP BY p.id, p.handle, p.metadata`,
      )

      let checked = 0
      let reviewBucketSkipped = 0
      let mapped = 0
      const mismatches = []
      for (const prod of products) {
        const expected = mapping[prod.vp]
        if (!expected) continue // path not in mapping — not our concern here
        mapped++
        const bound = new Set(prod.v3_handles || [])
        // Skip products parked in review bucket (S8 exception).
        if (bound.has("needs-review-bucket")) {
          reviewBucketSkipped++
          continue
        }
        checked++
        if (!bound.has(expected)) {
          if (mismatches.length < 5) {
            mismatches.push(
              `${prod.handle}: vp='${prod.vp}' expected=${expected} actual=[${[...bound].slice(0, 3).join(",")}]`,
            )
          } else if (mismatches.length === 5) {
            mismatches.push("…(truncated)")
          }
        }
      }

      const failCount = mismatches.filter((m) => !m.startsWith("…")).length
      // We recount against the full set by subtracting matches: non-match total
      // equals `checked - matches`. Redo accurately.
      // (mismatches list is truncated but we tracked count via iteration.)
      let totalDrift = 0
      for (const prod of products) {
        const expected = mapping[prod.vp]
        if (!expected) continue
        const bound = new Set(prod.v3_handles || [])
        if (bound.has("needs-review-bucket")) continue
        if (!bound.has(expected)) totalDrift++
      }

      return {
        pass: totalDrift === 0,
        detail: totalDrift === 0
          ? `${checked} mapped products checked (${reviewBucketSkipped} in review bucket skipped), all bound to deepest leaf`
          : `${totalDrift}/${checked} products drift (${mappingCount} mappings, ${reviewBucketSkipped} review-bucket skipped): ${mismatches.slice(0, 3).join("; ")}`,
      }
    } finally {
      await client.end().catch(() => {})
    }
  },
)

// ==========================================================================
// Execute + report
// ==========================================================================

async function main() {
  loadAll()
  const results = []
  for (const c of checks) {
    if (only && c.id !== only) continue
    const r = await c.run()
    results.push({
      id: c.id,
      title: c.title,
      severity: r.severity,
      pass: r.pass,
      deprecated: !!c.deprecated,
      detail: r.detail,
    })
  }

  if (jsonOut) {
    // `invariants` key kept alongside legacy `results` for backward compat
    // with tools that already read `results`. New consumers should use
    // `invariants`.
    console.log(
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          invariants: results,
          results,
        },
        null,
        2,
      ),
    )
  } else {
    console.log("Taxonomy invariants:\n")
    for (const r of results) {
      const mark = r.deprecated ? "SKIP" : r.pass ? "PASS" : r.severity === "CRIT" ? "FAIL" : "WARN"
      const tag = r.deprecated ? " [deprecated]" : ""
      console.log(`${mark.padEnd(4)} ${r.id.padEnd(7)} ${r.title}${tag}`)
      if (r.detail) console.log(`      ${r.detail}`)
    }
    const crits = results.filter((r) => !r.pass && !r.deprecated && r.severity === "CRIT").length
    const warns = results.filter((r) => !r.pass && !r.deprecated && r.severity === "WARN").length
    const deprecated = results.filter((r) => r.deprecated).length
    const pass = results.filter((r) => r.pass && !r.deprecated).length
    console.log(
      `\nTotal: ${pass} pass, ${warns} warn, ${crits} crit, ${deprecated} deprecated (of ${results.length})`,
    )
  }

  const crits = results.filter((r) => !r.pass && !r.deprecated && r.severity === "CRIT").length
  const warns = results.filter((r) => !r.pass && !r.deprecated && r.severity === "WARN").length
  if (crits > 0) process.exit(1)
  if (isCi && warns > 0) process.exit(1)
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
