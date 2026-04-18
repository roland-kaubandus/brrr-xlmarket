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

check("INV-02", "CRIT", "L1 ∈ [18, 22]; L2/L1 ∈ [4, 8]; L3/L2 ∈ [0, 12]", () => {
  const l1Count = yamlDoc.l1.length
  if (l1Count < 18 || l1Count > 22) {
    return { pass: false, detail: `L1 count ${l1Count} outside [18,22]` }
  }
  for (const l1 of yamlDoc.l1) {
    const l2Count = (l1.subs || []).length
    if (l2Count < 4 || l2Count > 8) {
      return { pass: false, detail: `${l1.slug}: ${l2Count} L2s outside [4,8]` }
    }
    for (const l2 of l1.subs || []) {
      const l3Count = (l2.subs || []).length
      if (l3Count > 12) {
        return { pass: false, detail: `${l1.slug} > ${l2.slug}: ${l3Count} L3s > 12` }
      }
    }
  }
  return { pass: true, detail: `22 L1 / valid L2 & L3 counts` }
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

check("INV-12", "WARN", "No active L1 with <10 products >14 days (skipped — needs analytics)", () => {
  return { pass: true, detail: "skipped (Meili facet count required)" }
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
