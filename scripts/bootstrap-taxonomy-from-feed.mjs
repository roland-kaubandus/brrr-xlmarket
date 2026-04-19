#!/usr/bin/env node
/**
 * bootstrap-taxonomy-from-feed.mjs
 *
 * EESMÄRK: genereerib **mustandid** (ei kirjuta taxonomy.yaml-i otse) mis
 * kasutaja seejärel läbi vaatab ja commit'ib.
 *
 * Filosoofia (kasutaja 2026-04-18):
 *   - Taksonoomia on HARDCODED — ei mingit automaatset feedist tulemist
 *   - Aga esmane mustand võib olla automaatselt genereeritud; inimene kinnitab
 *   - Pärast kinnitamist on taxonomy.yaml ainus tõeallikas, ei muutu ilma
 *     inimese sekkumiseta
 *
 * Sisend:
 *   - backend/src/data/taxonomy.yaml                      (olemasolev — L1 metadata säilib)
 *   - backend/src/taxonomy/rules/l1-defaults.json         (VEVOR L1 → meie L1 map)
 *   - product.metadata.vevor_product_type                 (kõigi toodete path-id)
 *
 * Väljund (kirjutatakse `reports/bootstrap-<timestamp>/`):
 *   - taxonomy.yaml.draft                                 (meie 22 L1 + VEVOR L2-L7 puu)
 *   - vevor-path-to-leaf.json.draft                       (2693 entry mapping)
 *   - bootstrap-report.md                                 (erijuhtumid, kollisioonid)
 *
 * Kasutaja vaatab mustandid läbi, parandab käsitsi, kopeerib õigeid kohtadesse:
 *   - taxonomy.yaml.draft → backend/src/data/taxonomy.yaml
 *   - vevor-path-to-leaf.json.draft → backend/src/taxonomy/rules/vevor-path-to-leaf.json
 *
 * Kasutus:
 *   node scripts/bootstrap-taxonomy-from-feed.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"
import pg from "pg"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const YAML_PATH = resolve(ROOT, "backend/src/data/taxonomy.yaml")
const L1_DEFAULTS_PATH = resolve(ROOT, "backend/src/taxonomy/rules/l1-defaults.json")
const L1_L2_OVERRIDES_PATH = resolve(ROOT, "backend/src/taxonomy/rules/l1-l2-overrides.json")
const REPORTS_DIR = resolve(ROOT, "reports")

const PG_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD,
  database: "xlmarket",
}

const RESERVED_PREFIXES = new Set(["alustajale", "hooldus", "arikliendile", "toode", "haru"])

/** Slugify a VEVOR segment to kebab-case, max 64 chars. */
function slugify(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 64) || "x"
}

async function loadProducts() {
  const c = new pg.Client(PG_CONFIG)
  await c.connect()
  const r = await c.query(
    "SELECT COUNT(*) AS total FROM product WHERE deleted_at IS NULL AND status = 'published' AND metadata->>'vevor_product_type' IS NOT NULL"
  )
  const r2 = await c.query(
    "SELECT metadata->>'vevor_product_type' AS path, COUNT(*) AS n " +
    "FROM product WHERE deleted_at IS NULL AND status = 'published' " +
    "AND metadata->>'vevor_product_type' IS NOT NULL " +
    "GROUP BY 1 ORDER BY 2 DESC"
  )
  await c.end()
  return {
    totalProducts: parseInt(r.rows[0].total, 10),
    pathCounts: r2.rows.map((row) => ({
      path: row.path,
      count: parseInt(row.n, 10),
      segments: row.path.split(" > ").map((s) => s.trim()).filter(Boolean),
    })).filter((r) => r.segments.length >= 1),
  }
}

function loadTaxonomy() {
  return yaml.load(readFileSync(YAML_PATH, "utf8"))
}

function loadL1Map() {
  const doc = JSON.parse(readFileSync(L1_DEFAULTS_PATH, "utf8"))
  return doc.defaults || {}
}

function loadL1L2Overrides() {
  const doc = JSON.parse(readFileSync(L1_L2_OVERRIDES_PATH, "utf8"))
  return doc.overrides || {}
}

/**
 * Build nested tree from product path-counts under one of our L1 slugs.
 * Each node: { slug, name_en, product_count, children: Map }
 */
function buildSubtree(pathCountsForL1) {
  const root = { name_en: "__root__", slug: "__root__", product_count: 0, children: new Map() }
  for (const { segments, count } of pathCountsForL1) {
    // VEVOR L1 segment is dropped (already mapped to our L1).
    const subSegs = segments.slice(1)
    if (subSegs.length === 0) {
      root.product_count += count
      continue
    }
    let cursor = root
    for (const segName of subSegs) {
      const slug = slugify(segName)
      if (!slug || RESERVED_PREFIXES.has(slug)) continue
      let child = cursor.children.get(slug)
      if (!child) {
        child = { slug, name_en: segName, product_count: 0, children: new Map() }
        cursor.children.set(slug, child)
      }
      cursor = child
    }
    cursor.product_count += count
  }
  return root
}

/** Convert Map-tree to array form for YAML, carrying product counts in comments. */
function treeToArray(node) {
  const subtreeCount = countSubtree(node)
  if (node.children.size === 0) {
    return { slug: node.slug, name_en: node.name_en, product_count: subtreeCount }
  }
  const subs = [...node.children.values()]
    .sort((a, b) => countSubtree(b) - countSubtree(a) || a.slug.localeCompare(b.slug))
    .map(treeToArray)
  return { slug: node.slug, name_en: node.name_en, product_count: subtreeCount, subs }
}

function countSubtree(node) {
  let c = node.product_count || 0
  for (const sub of node.children.values()) c += countSubtree(sub)
  return c
}

function maxDepth(node, cur = 1) {
  if (!node.subs || node.subs.length === 0) return cur
  return Math.max(...node.subs.map((s) => maxDepth(s, cur + 1)))
}

function flatCount(node) {
  let c = 1
  for (const s of node.subs || []) c += flatCount(s)
  return c
}

/** Disambiguate duplicate slugs: suffix with parent's slug. */
function disambiguateSlugs(l1Slug, node, usedGlobal, collisions) {
  for (const sub of node.subs || []) {
    if (usedGlobal.has(sub.slug)) {
      const parentSlug = node.slug === "__root__" ? l1Slug : node.slug
      const newSlug = `${parentSlug}-${sub.slug}`.slice(0, 64)
      collisions.push({
        original: sub.slug,
        renamed: newSlug,
        parent: parentSlug,
        name_en: sub.name_en,
        count: sub.product_count,
      })
      sub.slug = usedGlobal.has(newSlug)
        ? `${newSlug}-${Math.random().toString(36).slice(2, 6)}`
        : newSlug
    }
    usedGlobal.add(sub.slug)
    disambiguateSlugs(l1Slug, sub, usedGlobal, collisions)
  }
}

/** Build vevor-path-to-leaf mapping recursively. Each leaf = VEVOR full path → our deepest node slug. */
function buildPathToLeafMap(l1Slug, pathCountsForL1, finalNewL1) {
  const map = {}
  // For each unique VEVOR path, walk the finalNewL1 subtree to find the deepest matching slug.
  for (const { path, segments } of pathCountsForL1) {
    const subSegs = segments.slice(1) // drop VEVOR L1
    if (subSegs.length === 0) {
      map[path] = l1Slug
      continue
    }
    let cursor = { subs: finalNewL1.subs || [] }
    let deepestSlug = l1Slug
    for (const segName of subSegs) {
      const slug = slugify(segName)
      const child = (cursor.subs || []).find((s) => s.slug === slug || s.slug.endsWith(`-${slug}`))
      if (!child) break
      deepestSlug = child.slug
      cursor = child
    }
    map[path] = deepestSlug
  }
  return map
}

async function main() {
  console.log("=== bootstrap-taxonomy-from-feed.mjs ===\n")

  const [{ totalProducts, pathCounts }, taxonomy, l1Map] = await Promise.all([
    loadProducts(),
    Promise.resolve(loadTaxonomy()),
    Promise.resolve(loadL1Map()),
  ])
  console.log(`Loaded ${pathCounts.length} unique VEVOR paths covering ${totalProducts} products`)
  console.log(`Loaded ${taxonomy.l1.length} L1 from taxonomy.yaml`)
  console.log(`Loaded ${Object.keys(l1Map).length} VEVOR L1 → our L1 mappings\n`)

  // Group path-counts by our L1 (via VEVOR L1 → our L1 lookup)
  const byOurL1 = new Map()
  const unmappedVevorL1s = new Map()
  let unmappedCount = 0
  for (const pc of pathCounts) {
    const vevorL1 = pc.segments[0]
    const ourL1 = l1Map[vevorL1]
    if (!ourL1) {
      unmappedCount += pc.count
      unmappedVevorL1s.set(vevorL1, (unmappedVevorL1s.get(vevorL1) || 0) + pc.count)
      continue
    }
    if (!byOurL1.has(ourL1)) byOurL1.set(ourL1, [])
    byOurL1.get(ourL1).push(pc)
  }

  // Track ALL used slugs globally (L1 + all generated L2-L7)
  const usedSlugs = new Set(taxonomy.l1.map((l1) => l1.slug))
  const collisions = []

  // Build final taxonomy (keep L1 metadata, add generated subs)
  const newL1s = []
  const stats = []
  const vevorPathToLeaf = {}

  for (const origL1 of taxonomy.l1) {
    const bucket = byOurL1.get(origL1.slug) || []
    const root = buildSubtree(bucket)
    const asArray = treeToArray(root)

    disambiguateSlugs(origL1.slug, asArray, usedSlugs, collisions)

    // L1 metadata fully preserved; subs replaced
    const newL1 = { ...origL1, subs: asArray.subs || [] }
    newL1s.push(newL1)

    // Build VEVOR path → leaf mapping for this L1
    const l1Map = buildPathToLeafMap(origL1.slug, bucket, newL1)
    Object.assign(vevorPathToLeaf, l1Map)

    const productCount = bucket.reduce((a, pc) => a + pc.count, 0)
    stats.push({
      l1: origL1.slug,
      products: productCount,
      unique_paths: bucket.length,
      sub_nodes: flatCount(asArray) - 1,
      l2_count: (asArray.subs || []).length,
      max_depth: maxDepth(asArray, 1),
    })
  }

  console.log("L1                                    | Products | Paths | Sub-nodes | L2 | Max depth")
  console.log("-".repeat(95))
  for (const s of stats) {
    console.log(
      (s.l1 + " ".repeat(38)).slice(0, 38) + " | " +
      (s.products + "      ").slice(0, 8) + " | " +
      (s.unique_paths + "     ").slice(0, 5) + " | " +
      (s.sub_nodes + "      ").slice(0, 9) + " | " +
      (s.l2_count + "   ").slice(0, 3) + "| L" + s.max_depth
    )
  }
  const totalSubNodes = stats.reduce((a, s) => a + s.sub_nodes, 0)
  console.log("-".repeat(95))
  console.log(`Total sub-nodes across ${stats.length} L1s: ${totalSubNodes}`)
  console.log(`Unmapped products: ${unmappedCount} (across ${unmappedVevorL1s.size} VEVOR L1s)`)
  console.log(`Slug collisions auto-disambiguated: ${collisions.length}`)
  console.log(`VEVOR path → leaf mappings: ${Object.keys(vevorPathToLeaf).length}\n`)

  // Write drafts
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const outDir = resolve(REPORTS_DIR, `bootstrap-${timestamp}`)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  // Draft 1: taxonomy.yaml.draft
  const newTaxonomy = {
    ...taxonomy,
    l1: newL1s,
    updated: new Date().toISOString().slice(0, 10),
  }
  const yamlStr = yaml.dump(newTaxonomy, { lineWidth: -1, noRefs: true, sortKeys: false })
  writeFileSync(resolve(outDir, "taxonomy.yaml.draft"), yamlStr, "utf8")

  // Draft 2: vevor-path-to-leaf.json.draft
  const mapDoc = {
    _doc: "Hardcoded VEVOR full path → our taxonomy leaf slug. Generated by bootstrap-taxonomy-from-feed.mjs; inimene vaatab üle enne git commit'i.",
    _version: 1,
    _generated_at: new Date().toISOString(),
    _source: "VEVOR feed 2693 unique paths",
    _total_entries: Object.keys(vevorPathToLeaf).length,
    mappings: vevorPathToLeaf,
  }
  writeFileSync(
    resolve(outDir, "vevor-path-to-leaf.json.draft"),
    JSON.stringify(mapDoc, null, 2),
    "utf8"
  )

  // Draft 3: bootstrap-report.md
  let report = `# Bootstrap report — ${timestamp}\n\n`
  report += `Source: VEVOR feed, ${totalProducts} products, ${pathCounts.length} unique paths.\n\n`
  report += `## Per-L1 breakdown\n\n`
  report += `| L1 | Products | Unique paths | Sub-nodes | L2 | Max depth |\n`
  report += `|---|---:|---:|---:|---:|---:|\n`
  for (const s of stats) {
    report += `| \`${s.l1}\` | ${s.products} | ${s.unique_paths} | ${s.sub_nodes} | ${s.l2_count} | L${s.max_depth} |\n`
  }
  report += `\n**Total sub-nodes:** ${totalSubNodes}\n\n`

  report += `## Empty L1s (need l1-defaults.json entries)\n\n`
  const empties = stats.filter((s) => s.products === 0)
  if (empties.length === 0) {
    report += `None — every L1 has at least one product mapped.\n\n`
  } else {
    report += `These L1s have zero products mapped via l1-defaults.json:\n\n`
    for (const s of empties) report += `- \`${s.l1}\`\n`
    report += `\nAction: extend \`l1-defaults.json\` or \`l1-l2-overrides.json\` so products from relevant VEVOR L1 land here.\n\n`
  }

  report += `## Unmapped VEVOR L1s\n\n`
  if (unmappedVevorL1s.size === 0) {
    report += `None — every VEVOR L1 has a mapping.\n\n`
  } else {
    report += `These VEVOR L1 names have no entry in \`l1-defaults.json\` (${unmappedCount} products affected):\n\n`
    report += `| VEVOR L1 | Products |\n|---|---:|\n`
    for (const [vL1, n] of [...unmappedVevorL1s.entries()].sort((a, b) => b[1] - a[1])) {
      report += `| \`${vL1}\` | ${n} |\n`
    }
    report += `\n`
  }

  report += `## Slug collisions auto-disambiguated\n\n`
  if (collisions.length === 0) {
    report += `None.\n\n`
  } else {
    report += `${collisions.length} slugs were renamed to avoid global collisions:\n\n`
    report += `| Original | Renamed | Parent | Name | Products |\n|---|---|---|---|---:|\n`
    for (const c of collisions.slice(0, 50)) {
      report += `| \`${c.original}\` | \`${c.renamed}\` | \`${c.parent}\` | ${c.name_en} | ${c.count} |\n`
    }
    if (collisions.length > 50) report += `\n... and ${collisions.length - 50} more (full list in taxonomy.yaml.draft)\n`
    report += `\n`
  }

  report += `## Next steps\n\n`
  report += `1. **Review \`taxonomy.yaml.draft\`** — check slug names, remove junk categories, fix nesting errors.\n`
  report += `2. **Review \`vevor-path-to-leaf.json.draft\`** — spot-check mappings, especially in L1s with many paths.\n`
  report += `3. **Fix empty L1s** — if \`laser-cnc-digital-fabrication\`, \`woodworking-carpentry\`, \`salon-spa-wellness\`, \`boating-camping-outdoor\` should contain products, update \`l1-l2-overrides.json\` to redirect matching VEVOR subpaths.\n`
  report += `4. **Commit approved versions:**\n`
  report += `   - \`cp reports/bootstrap-${timestamp}/taxonomy.yaml.draft backend/src/data/taxonomy.yaml\`\n`
  report += `   - \`cp reports/bootstrap-${timestamp}/vevor-path-to-leaf.json.draft backend/src/taxonomy/rules/vevor-path-to-leaf.json\`\n`
  report += `5. **Run:** \`node scripts/gen-category-tree.mjs && node scripts/reassign-categories-to-leaves.mjs --execute\`\n`

  writeFileSync(resolve(outDir, "bootstrap-report.md"), report, "utf8")

  console.log(`Drafts written to: ${outDir}/`)
  console.log(`  - taxonomy.yaml.draft (${yamlStr.length} bytes)`)
  console.log(`  - vevor-path-to-leaf.json.draft (${Object.keys(vevorPathToLeaf).length} entries)`)
  console.log(`  - bootstrap-report.md (review notes)`)
  console.log(`\nNext: review the drafts, then copy them into place.`)
}

main().catch((e) => {
  console.error("ERROR:", e)
  process.exit(1)
})
