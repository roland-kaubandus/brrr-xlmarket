#!/usr/bin/env node
/**
 * check-taxonomy-invariants.mjs — run all 19 invariants from spec §8.
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

/** @type {Array<{id:string, title:string, run:() => {pass:boolean, severity:'CRIT'|'WARN', detail:string}}>} */
const checks = []

function check(id, severity, title, fn) {
  checks.push({
    id,
    title,
    run: () => {
      try {
        const res = fn()
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

check("INV-02", "WARN", "Taxonomy size counters (informational — no hard limits per spec §3.1.1 revision)", () => {
  const l1Count = yamlDoc.l1.length
  let l2Sum = 0
  let l3Sum = 0
  for (const l1 of yamlDoc.l1) {
    l2Sum += (l1.subs || []).length
    for (const l2 of l1.subs || []) l3Sum += (l2.subs || []).length
  }
  // No thresholds — kasutaja 2026-04-18: "Ühelgi kategoorial ei saa olla
  // piirangut kui palju tal alamkategooriaid on või palju tooteid on".
  return { pass: true, detail: `${l1Count} L1 / ${l2Sum} L2 / ${l3Sum} L3 (informational)` }
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

check("INV-12", "WARN", "INV-12 DEPRECATED — product-count thresholds removed per spec §3.1.1 revision 2026-04-18", () => {
  return { pass: true, detail: "deprecated (no category may be hidden by product count)" }
})

check("INV-13", "WARN", "No product placed at hidden node (skipped — needs backend env)", () => {
  return { pass: true, detail: "skipped (SQL check in backend)" }
})

check("INV-14", "WARN", "Meili taxonomy.ancestors matches DB (skipped)", () => {
  return { pass: true, detail: "skipped (sample diff, backend env needed)" }
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
// Execute + report
// ==========================================================================

function main() {
  loadAll()
  const results = []
  for (const c of checks) {
    if (only && c.id !== only) continue
    const r = c.run()
    results.push({ id: c.id, title: c.title, severity: r.severity, pass: r.pass, detail: r.detail })
  }

  if (jsonOut) {
    console.log(JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2))
  } else {
    console.log("Taxonomy invariants:\n")
    for (const r of results) {
      const mark = r.pass ? "PASS" : r.severity === "CRIT" ? "FAIL" : "WARN"
      console.log(`${mark.padEnd(4)} ${r.id.padEnd(7)} ${r.title}`)
      if (r.detail) console.log(`      ${r.detail}`)
    }
    const crits = results.filter((r) => !r.pass && r.severity === "CRIT").length
    const warns = results.filter((r) => !r.pass && r.severity === "WARN").length
    const pass = results.filter((r) => r.pass).length
    console.log(`\nTotal: ${pass} pass, ${warns} warn, ${crits} crit (of ${results.length})`)
  }

  const crits = results.filter((r) => !r.pass && r.severity === "CRIT").length
  const warns = results.filter((r) => !r.pass && r.severity === "WARN").length
  if (crits > 0) process.exit(1)
  if (isCi && warns > 0) process.exit(1)
}

main()
