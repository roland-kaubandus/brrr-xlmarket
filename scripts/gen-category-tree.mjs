#!/usr/bin/env node
/**
 * gen-category-tree.mjs — generate storefront/lib/category-tree.generated.json
 * from taxonomy.yaml.
 *
 * The tree is the SSoT for the category page layout: breadcrumb (parent chain),
 * sibling list, and L3 thumbnail row. /kategooriad/[handle]/page.tsx requires
 * this file; never edit the JSON by hand.
 *
 * Each node:
 *   { handle, name_et, name_en, level (1|2|3), parent_handle, child_handles[] }
 *
 * Usage:
 *   node scripts/gen-category-tree.mjs
 *   node scripts/gen-category-tree.mjs --check  # exit 1 if drifts
 */

import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const YAML_PATH = resolve(ROOT, "backend/src/data/taxonomy.yaml")
const OUT_PATH = resolve(ROOT, "storefront/lib/category-tree.generated.json")

function loadTaxonomy() {
  const doc = yaml.load(readFileSync(YAML_PATH, "utf8"))
  if (!doc?.l1 || !Array.isArray(doc.l1)) {
    throw new Error("taxonomy.yaml: missing or invalid `l1`")
  }
  return doc
}

function buildTree(doc) {
  const nodes = {}
  const order = []

  function add(handle, attrs) {
    if (nodes[handle]) {
      // Allow merging: the same L3 may appear in multiple L2 (rare); keep first.
      return
    }
    nodes[handle] = { handle, ...attrs }
    order.push(handle)
  }

  for (const l1 of doc.l1) {
    const l1Handle = l1.slug
    const l2Handles = []

    for (const l2 of (l1.subs || [])) {
      const l2Handle = l2.slug
      l2Handles.push(l2Handle)
      const l3Handles = (l2.subs || []).map(s => typeof s === "string" ? s : s.slug)

      add(l2Handle, {
        name_en: l2.name_en || l2.slug,
        name_et: l2.name_et || l2.name_en || l2.slug,
        level: 2,
        parent_handle: l1Handle,
        child_handles: l3Handles,
      })

      for (const l3 of (l2.subs || [])) {
        const l3Handle = typeof l3 === "string" ? l3 : l3.slug
        const l3NameEn = typeof l3 === "string"
          ? l3.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
          : (l3.name_en || l3.slug)
        const l3NameEt = typeof l3 === "string"
          ? l3NameEn
          : (l3.name_et || l3.name_en || l3.slug)
        add(l3Handle, {
          name_en: l3NameEn,
          name_et: l3NameEt,
          level: 3,
          parent_handle: l2Handle,
          child_handles: [],
        })
      }
    }

    add(l1Handle, {
      name_en: l1.name_en || l1.slug,
      name_et: l1.name_et || l1.name_en || l1.slug,
      level: 1,
      parent_handle: null,
      child_handles: l2Handles,
    })
  }

  return {
    generated_at: new Date().toISOString(),
    nodes,
    order,
  }
}

function main() {
  const doc = loadTaxonomy()
  const tree = buildTree(doc)
  const json = JSON.stringify(tree, null, 2) + "\n"

  if (process.argv.includes("--check")) {
    const existing = readFileSync(OUT_PATH, "utf8")
    if (existing !== json) {
      console.error("DRIFT: " + OUT_PATH + " out of sync with " + YAML_PATH)
      process.exit(1)
    }
    console.log("OK: " + OUT_PATH + " matches taxonomy.yaml")
    return
  }

  writeFileSync(OUT_PATH, json)
  console.log("Wrote " + Object.keys(tree.nodes).length + " nodes to " + OUT_PATH)
}

main()
