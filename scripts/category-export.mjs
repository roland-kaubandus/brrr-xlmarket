#!/usr/bin/env node
/**
 * category-export.mjs — ekspordib kõik kategooriad CSV-na (big-picture + bulk-edit).
 * Allikas: category-tree.generated.json + category-counts.generated.json (snapshot).
 *
 * Kasutus:
 *   node scripts/category-export.mjs > outputs/categories.csv
 *
 * Veerud: handle, level, parent_handle, name_en, name_et, product_count, l1
 * Vt kat-halduse plaan: outputs/kategooria-halduse-tooriist-plaan-2026-06-04.md
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const tree = JSON.parse(readFileSync(resolve(ROOT, "storefront/lib/category-tree.generated.json"), "utf8"))
const counts = (JSON.parse(readFileSync(resolve(ROOT, "storefront/lib/category-counts.generated.json"), "utf8")).counts) || {}

let nodes = tree.nodes
if (!Array.isArray(nodes)) nodes = Object.values(nodes)
const byH = {}
for (const n of nodes) if (n.handle) byH[n.handle] = n

function l1Of(n) {
  let cur = n
  while (cur && cur.level > 1 && cur.parent_handle) cur = byH[cur.parent_handle] || null
  return cur ? cur.handle : n.handle
}
const csv = (v) => {
  const s = String(v == null ? "" : v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

process.stdout.write("handle,level,parent_handle,name_en,name_et,product_count,l1\n")
const sorted = nodes
  .filter((n) => typeof n.level !== "undefined")
  .sort((a, b) => (counts[b.handle] || 0) - (counts[a.handle] || 0))
for (const n of sorted) {
  process.stdout.write([
    csv(n.handle), n.level, csv(n.parent_handle || ""),
    csv(n.name_en || ""), csv(n.name_et || ""),
    counts[n.handle] || 0, csv(l1Of(n)),
  ].join(",") + "\n")
}
