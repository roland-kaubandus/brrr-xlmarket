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

  for (const l1 of doc.l1) {
    const l1Handle = l1.slug
    const l2Handles = []

    for (const l2 of l1.subs || []) {
      const l2Handle = l2.slug
      l2Handles.push(l2Handle)
      const l3Handles = (l2.subs || []).map((s) => (typeof s === "string" ? s : s.slug))

      const l2Img = pickImage(l2Handle, l2.image_alias || aliasMap[l2Handle], legacyKeys, thumbFiles)
      add(l2Handle, {
        name_en: l2.name_en || l2.slug,
        name_et: l2.name_et || l2.name_en || l2.slug,
        level: 2,
        parent_handle: l1Handle,
        child_handles: l3Handles,
        description_et: l2.description_et || null,
        description_en: l2.description_en || null,
        ...l2Img,
      })

      for (const l3 of l2.subs || []) {
        const l3Handle = typeof l3 === "string" ? l3 : l3.slug
        const l3NameEn =
          typeof l3 === "string"
            ? l3.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
            : l3.name_en || l3.slug
        const l3NameEt =
          typeof l3 === "string" ? l3NameEn : l3.name_et || l3.name_en || l3.slug
        const l3Alias = (typeof l3 === "string" ? undefined : l3.image_alias) || aliasMap[l3Handle]
        const l3Img = pickImage(l3Handle, l3Alias, legacyKeys, thumbFiles)
        add(l3Handle, {
          name_en: l3NameEn,
          name_et: l3NameEt,
          level: 3,
          parent_handle: l2Handle,
          child_handles: [],
          ...l3Img,
        })
      }
    }

    const l1Img = pickImage(l1Handle, l1.image_alias || aliasMap[l1Handle], legacyKeys, thumbFiles)
    add(l1Handle, {
      name_en: l1.name_en || l1.slug,
      name_et: l1.name_et || l1.name_en || l1.slug,
      level: 1,
      parent_handle: null,
      child_handles: l2Handles,
      description_et: l1.description_et || null,
      description_en: l1.description_en || null,
      tagline_et: l1.tagline_et || null,
      tagline_en: l1.tagline_en || null,
      ...l1Img,
    })
  }

  return {
    generated_at: new Date().toISOString(),
    nodes,
    order,
  }
}

function report(tree) {
  const nodes = Object.values(tree.nodes)
  const rows = [[1], [2], [3]].map(([lvl]) => {
    const ns = nodes.filter((n) => n.level === lvl)
    const bySrc = { direct: 0, alias: 0, fuzzy: 0, none: 0 }
    for (const n of ns) bySrc[n.image_source]++
    const covered = ns.length - bySrc.none
    return { lvl, total: ns.length, covered, ...bySrc }
  })
  console.log("Image coverage per level:")
  console.log("lvl | total | covered | direct | alias | fuzzy | none")
  for (const r of rows) {
    console.log(
      `L${r.lvl}  | ${String(r.total).padEnd(5)} | ${String(r.covered).padEnd(7)} | ${String(r.direct).padEnd(6)} | ${String(r.alias).padEnd(5)} | ${String(r.fuzzy).padEnd(5)} | ${r.none}`
    )
  }
  const missing = nodes.filter((n) => n.image_source === "none").map((n) => n.handle)
  if (missing.length > 0) {
    console.log(`\n${missing.length} nodes with no image (will render SVG fallback):`)
    missing.forEach((h) => console.log("  " + h))
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
