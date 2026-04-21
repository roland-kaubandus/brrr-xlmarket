#!/usr/bin/env node
/**
 * gen-category-tree.mjs — generate storefront/lib/category-tree.generated.json
 * from taxonomy.yaml.
 *
 * The tree is the SSoT for:
 *   - category page layout (breadcrumb, sibling list, thumbnail row)
 *   - MegaMenu N-level drill
 *   - category image lookup (replaces category-images.json indirection)
 *   - JSON-LD CollectionPage + BreadcrumbList
 *
 * Each node:
 *   {
 *     handle, name_et, name_en,
 *     level (1|2|3),
 *     parent_handle,
 *     child_handles[],
 *     image_path: string | null,    // /cat-thumbs/<slug>.webp or null
 *     image_source: "direct" | "alias" | "fuzzy" | "none",
 *   }
 *
 * Image resolution priority (per §3.5 and the image coverage invariant):
 *   1. direct  — <handle>.webp exists in public/cat-thumbs/
 *   2. alias   — taxonomy.yaml node has `image_alias: <legacy-slug>` and that file exists
 *   3. fuzzy   — every >=4-char word of handle appears in some legacy key (single unambiguous hit)
 *   4. none    — frontend renders SVG fallback (Lucide icon of the L1 ancestor)
 *
 * Legacy category-images.json is still loaded for backward compat with
 * storefront/components/MegaMenu.tsx THUMB_OVERRIDES and HomeBentoGrid,
 * but the new autoritative pointer is node.image_path.
 *
 * Usage:
 *   node scripts/gen-category-tree.mjs
 *   node scripts/gen-category-tree.mjs --check      # exit 1 if drifts
 *   node scripts/gen-category-tree.mjs --report     # print coverage table
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const YAML_PATH = resolve(ROOT, "backend/src/data/taxonomy.yaml")
const ALIAS_PATH = resolve(ROOT, "backend/src/data/taxonomy-image-aliases.yaml")
const OUT_PATH = resolve(ROOT, "storefront/lib/category-tree.generated.json")
const LEGACY_IMG_PATH = resolve(ROOT, "storefront/lib/category-images.json")
const CAT_THUMBS_DIR = resolve(ROOT, "storefront/public/cat-thumbs")

function loadTaxonomy() {
  const doc = yaml.load(readFileSync(YAML_PATH, "utf8"))
  if (!doc?.l1 || !Array.isArray(doc.l1)) {
    throw new Error("taxonomy.yaml: missing or invalid `l1`")
  }
  return doc
}

function loadLegacyImageKeys() {
  if (!existsSync(LEGACY_IMG_PATH)) return new Set()
  const map = JSON.parse(readFileSync(LEGACY_IMG_PATH, "utf8"))
  return new Set(Object.keys(map))
}

function loadAliasMap() {
  if (!existsSync(ALIAS_PATH)) return {}
  const doc = yaml.load(readFileSync(ALIAS_PATH, "utf8")) || {}
  const map = {}
  for (const [k, v] of Object.entries(doc)) {
    if (typeof v === "string") map[k] = v
  }
  return map
}

function loadThumbFiles() {
  if (!existsSync(CAT_THUMBS_DIR)) return new Set()
  return new Set(
    readdirSync(CAT_THUMBS_DIR)
      .filter((f) => f.endsWith(".webp"))
      .map((f) => f.replace(/\.webp$/, ""))
  )
}

function pickImage(handle, aliasHint, legacyKeys, thumbFiles) {
  // Only accept keys that are BOTH in legacy map AND have a file on disk
  // (or just have a file on disk, if legacy map is absent). This prevents
  // pointers to non-existent files, which is what INV-21 catches.
  const exists = (key) => thumbFiles.has(key)

  // 1. direct match on disk
  if (exists(handle)) {
    return { image_path: `/cat-thumbs/${handle}.webp`, image_source: "direct" }
  }

  // 2. explicit alias from yaml
  if (aliasHint && exists(aliasHint)) {
    return { image_path: `/cat-thumbs/${aliasHint}.webp`, image_source: "alias" }
  }

  // 3. fuzzy single-hit match (only against files actually on disk)
  const words = handle.split("-").filter((w) => w.length >= 4)
  if (words.length > 0 && thumbFiles.size > 0) {
    const candidates = []
    for (const k of thumbFiles) {
      if (words.every((w) => k.includes(w))) candidates.push(k)
    }
    if (candidates.length === 1) {
      return { image_path: `/cat-thumbs/${candidates[0]}.webp`, image_source: "fuzzy" }
    }
  }

  // Suppress unused param lint
  void legacyKeys
  return { image_path: null, image_source: "none" }
}

function buildTree(doc) {
  const nodes = {}
  const order = []
  const legacyKeys = loadLegacyImageKeys()
  const thumbFiles = loadThumbFiles()
  const aliasMap = loadAliasMap()

  function add(handle, attrs) {
    if (nodes[handle]) return
    nodes[handle] = { handle, ...attrs }
    order.push(handle)
  }

  // Recursive walker — supports L1..Ln (bootstrap-v3 uses up to L7).
  // Each node in YAML is: { slug, name_en, name_et?, description_en?, description_et?,
  //                         tagline_en?, tagline_et?, image_alias?, subs?: [child...] }
  function walk(node, level, parentHandle) {
    const handle = typeof node === "string" ? node : node.slug
    if (!handle) return
    const isObj = typeof node === "object" && node !== null
    const nameEn = isObj
      ? (node.name_en || handle)
      : handle.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    const nameEt = isObj ? (node.name_et || nameEn) : nameEn
    const alias = (isObj ? node.image_alias : null) || aliasMap[handle]
    const img = pickImage(handle, alias, legacyKeys, thumbFiles)
    const subs = isObj ? (node.subs || []) : []
    const childHandles = subs.map((s) => (typeof s === "string" ? s : s.slug)).filter(Boolean)

    const attrs = {
      name_en: nameEn,
      name_et: nameEt,
      level,
      parent_handle: parentHandle,
      child_handles: childHandles,
      ...img,
    }
    if (isObj && node.description_en != null) attrs.description_en = node.description_en
    if (isObj && node.description_et != null) attrs.description_et = node.description_et
    if (isObj && node.tagline_en != null) attrs.tagline_en = node.tagline_en
    if (isObj && node.tagline_et != null) attrs.tagline_et = node.tagline_et
    add(handle, attrs)

    for (const child of subs) walk(child, level + 1, handle)
  }

  for (const l1 of doc.l1) walk(l1, 1, null)

  // Post-pass: inherit images from descendants (deep BFS) for parents that
  // ended up without their own image. Rationale: an L2 without a photo but
  // whose L3 children are all illustrated should borrow the first child's
  // image — same holds for L3 borrowing from L4, etc. Prevents the "some
  // tiles missing" look on category subcategory carousels.
  function firstDescendantImage(node) {
    const queue = [...(node.child_handles || [])]
    while (queue.length > 0) {
      const childHandle = queue.shift()
      const child = nodes[childHandle]
      if (!child) continue
      if (child.image_path) {
        return { image_path: child.image_path, donor: childHandle }
      }
      for (const grand of child.child_handles || []) queue.push(grand)
    }
    return null
  }

  for (const handle of order) {
    const n = nodes[handle]
    if (n.image_path) continue
    const inherit = firstDescendantImage(n)
    if (inherit) {
      n.image_path = inherit.image_path
      n.image_source = "inherited"
      n.image_donor = inherit.donor
    }
  }

  return {
    generated_at: new Date().toISOString(),
    nodes,
    order,
  }
}

function report(tree) {
  const nodes = Object.values(tree.nodes)
  const maxLvl = Math.max(...nodes.map((n) => n.level || 1))
  const rows = []
  for (let lvl = 1; lvl <= maxLvl; lvl++) {
    const ns = nodes.filter((n) => n.level === lvl)
    if (ns.length === 0) continue
    const bySrc = { direct: 0, alias: 0, fuzzy: 0, inherited: 0, none: 0 }
    for (const n of ns) bySrc[n.image_source] = (bySrc[n.image_source] || 0) + 1
    const covered = ns.length - bySrc.none
    rows.push({ lvl, total: ns.length, covered, ...bySrc })
  }
  console.log("Image coverage per level:")
  console.log("lvl | total | covered | direct | alias | fuzzy | inherited | none")
  for (const r of rows) {
    console.log(
      `L${r.lvl}  | ${String(r.total).padEnd(5)} | ${String(r.covered).padEnd(7)} | ${String(r.direct).padEnd(6)} | ${String(r.alias).padEnd(5)} | ${String(r.fuzzy).padEnd(5)} | ${String(r.inherited).padEnd(9)} | ${r.none}`
    )
  }
  const missing = nodes.filter((n) => n.image_source === "none").map((n) => n.handle)
  if (missing.length > 0) {
    console.log(`\n${missing.length} nodes with no image (will render SVG fallback)`)
  }
}

function main() {
  const doc = loadTaxonomy()
  const tree = buildTree(doc)
  const json = JSON.stringify(tree, null, 2) + "\n"

  if (process.argv.includes("--check")) {
    // Compare structural content only (ignore generated_at timestamp).
    const existingRaw = readFileSync(OUT_PATH, "utf8")
    const existing = JSON.parse(existingRaw)
    const { generated_at: _a, ...existingCore } = existing
    const { generated_at: _b, ...generatedCore } = tree
    if (JSON.stringify(existingCore) !== JSON.stringify(generatedCore)) {
      console.error("DRIFT: " + OUT_PATH + " out of sync with " + YAML_PATH)
      process.exit(1)
    }
    console.log("OK: " + OUT_PATH + " matches taxonomy.yaml")
    return
  }

  if (process.argv.includes("--report")) {
    report(tree)
    return
  }

  writeFileSync(OUT_PATH, json)
  console.log("Wrote " + Object.keys(tree.nodes).length + " nodes to " + OUT_PATH)
  report(tree)
}

main()
