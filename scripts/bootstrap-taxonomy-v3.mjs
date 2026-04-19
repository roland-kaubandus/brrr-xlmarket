#!/usr/bin/env node
/**
 * bootstrap-taxonomy-v3.mjs — user 2026-04-19 morning revision
 *
 * Muudatused v2 -> v3:
 *   - Backyard + Farm kokku    -> backyard-landscaping-farm
 *   - Woodworking L1 kaob      -> Tools > Woodworking → hand-power-tools
 *   - Metalworks L1 kaob       -> Tools > Welding + Machining → hand-power-tools
 *   - Printing L1 kaob         -> crafts-sewing alla
 *   - Educational & Lab kaob   -> lab → health-medical-supply, educational toys → kids-playgrounds
 *   - Safety, Security & Workwear eraldi L1 välja Construction alt
 *   - Appliances > Crafts & Sewing (415) liigub HoReCa alt → crafts-sewing
 *
 * Kokku: 18 L1.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"
import pg from "pg"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const REPORTS_DIR = resolve(ROOT, "reports")

const PG_CONFIG = {
  host: "localhost", port: 5435, user: "xlmarket",
  password: process.env.PGPASSWORD, database: "xlmarket",
}

const NEW_L1 = [
  { slug: "horeca-food-service",                name_en: "HoReCa & Food Service" },
  { slug: "renewable-energy-batteries",         name_en: "Renewable Energy & Batteries" },
  { slug: "automotive-workshop",                name_en: "Automotive & Workshop" },
  { slug: "cleaning-janitorial",                name_en: "Cleaning & Janitorial" },
  { slug: "crafts-sewing-printing",             name_en: "Crafts, Sewing & Printing" },
  { slug: "salon-spa-wellness",                 name_en: "Salon, Spa & Wellness" },
  { slug: "health-medical-supply",              name_en: "Health & Medical Supply" },
  { slug: "fitness-sports-games",               name_en: "Fitness, Sports & Games" },
  { slug: "boating-camping-outdoor",            name_en: "Boating, Camping & Outdoor Adventure" },
  { slug: "music-entertainment",                name_en: "Music & Entertainment" },
  { slug: "pets-wildlife-clinic",               name_en: "Pets, Wildlife, Veterinary & Kennels" },
  { slug: "kids-playgrounds",                   name_en: "Kids & Playgrounds" },
  { slug: "backyard-landscaping-farm",          name_en: "Backyard, Landscaping & Farm" },
  { slug: "construction-building",              name_en: "Construction & Building" },
  { slug: "safety-security-workwear",           name_en: "Safety, Security & Workwear" },
  { slug: "hand-power-tools",                   name_en: "Hand, Power & Specialty Tools" },
  { slug: "warehousing-material-handling",      name_en: "Warehousing & Material Handling" },
  { slug: "office-commercial-interiors",        name_en: "Office & Commercial Interiors" },
]

// ===========================================================================
// Routing: VEVOR L1|L2 → our L1 slug
// ===========================================================================

const ROUTING = {
  // HoReCa (without crafts & sewing — those moved to crafts-sewing-printing)
  "Appliances | *":                                       "horeca-food-service",
  "Appliances | Crafts & Sewing":                         "crafts-sewing-printing",  // <-- moved
  "Appliances | Floor Care":                              "cleaning-janitorial",
  "Appliances | Vacuum Cleaners":                         "cleaning-janitorial",
  "Appliances | Washers & Dryers":                        "cleaning-janitorial",
  "Kitchen | *":                                          "horeca-food-service",
  "Restaurant & Food Service | *":                        "horeca-food-service",
  "Restaurant & Food Service | Fishery Aquaculture":      "backyard-landscaping-farm",

  // Renewable Energy & Batteries
  "Alternative & Renewable Energy | *":                   "renewable-energy-batteries",
  "Electrical | Renewable Energy":                        "renewable-energy-batteries",
  "Electrical | Inverters":                               "renewable-energy-batteries",
  "Electrical | Solar Power":                             "renewable-energy-batteries",
  "Electrical | Batteries":                               "renewable-energy-batteries",
  "Electrical | Batteries & Chargers & Accessories":      "renewable-energy-batteries",
  "Electrical | Wind Power":                              "renewable-energy-batteries",

  // Electrical (rest) → Construction
  "Electrical | *":                                       "construction-building",
  "Electrical | Electronics":                             "office-commercial-interiors",
  "Electrical | Camera & Photo":                          "crafts-sewing-printing",
  "Electrical | Home Audio":                              "music-entertainment",
  "Electrical | Musical Instrument Accessories":          "music-entertainment",
  "Electrical | Stage Lighting & Effects":                "music-entertainment",
  "Electrical | Video Games":                             "kids-playgrounds",
  "Electrical | PlayStation 5":                           "kids-playgrounds",

  // Automotive
  "Automotive | *":                                       "automotive-workshop",
  "Automotive | Boat Parts & Accessories":                "boating-camping-outdoor",
  "Engines & Motors | *":                                 "automotive-workshop",

  // Cleaning
  "Cleaning | *":                                         "cleaning-janitorial",
  "Cleaning & Janitorial Supplies | *":                   "cleaning-janitorial",

  // Crafts, Sewing & Printing (combined: crafts + sewing + printmaking + engraving + jewelry + paper + leather + ceramics + speciality + painting)
  "Arts & Crafts & Sewing | *":                           "crafts-sewing-printing",
  "Painting | *":                                         "crafts-sewing-printing",
  "Paint | *":                                            "construction-building",

  // Tools → all to hand-power-tools (woodwork, welding, metalwork all consolidated)
  "Tools | *":                                            "hand-power-tools",
  "Tools | Lab & Scientific Products":                    "health-medical-supply",  // lab → health
  "Hand Tools | *":                                       "hand-power-tools",
  "Power Tools | *":                                      "hand-power-tools",
  "Air Tools & Compressors | *":                          "hand-power-tools",
  "Tool Storage & Organization | *":                      "hand-power-tools",
  "Welding | *":                                          "hand-power-tools",
  "Machining | *":                                        "hand-power-tools",

  // Hardware → Construction/Office split
  "Hardware | *":                                         "construction-building",
  "Hardware | Cabinet Hardware":                          "office-commercial-interiors",
  "Hardware | Drawer & Cabinet Hardware":                 "office-commercial-interiors",
  "Hardware | Furniture Hardware":                        "office-commercial-interiors",
  "Hardware | Door Hardware":                             "construction-building",
  "Hardware | Door Hardware & Locks":                     "construction-building",
  "Hardware | Decking & Fencing":                         "construction-building",
  "Hardware | Fasteners":                                 "construction-building",
  "Hardware | Weather Stripping":                         "construction-building",
  "Hardware | Mailboxes":                                 "construction-building",
  "Hardware | Chains & Ropes":                            "hand-power-tools",
  "Hardware | Tie-Down Straps":                           "automotive-workshop",

  // Lumber → Construction
  "Lumber & Composites | *":                              "construction-building",

  // Construction / Building Materials
  "Building Materials | *":                               "construction-building",
  "Building & Construction | *":                          "construction-building",
  "Building & Construction | Footwear":                   "safety-security-workwear",
  "Building & Construction | Heavy Equipment Accessories": "automotive-workshop",
  "Doors & Windows | *":                                  "construction-building",
  "Flooring | *":                                         "construction-building",
  "Flooring | Gym Flooring":                              "fitness-sports-games",
  "Flooring | Garage Flooring":                           "automotive-workshop",
  "Flooring | Rugs":                                      "office-commercial-interiors",
  "Flooring | Carpet":                                    "office-commercial-interiors",

  // Plumbing / HVAC → Construction
  "Plumbing | *":                                         "construction-building",
  "Pumps | *":                                            "construction-building",
  "Heating, Venting & Cooling | *":                       "construction-building",
  "Heating & Cooling | *":                                "construction-building",

  // Outdoors → Backyard + Landscaping + Farm
  "Outdoors | Garden Center":                             "backyard-landscaping-farm",
  "Outdoors | Patio Furniture":                           "backyard-landscaping-farm",
  "Outdoors | Outdoor Heating":                           "backyard-landscaping-farm",
  "Outdoors | Outdoor Cooking":                           "backyard-landscaping-farm",
  "Outdoors | Pools":                                     "salon-spa-wellness",
  "Outdoors | Home Spas":                                 "salon-spa-wellness",
  "Outdoors | Outdoor Power Equipment":                   "backyard-landscaping-farm",
  "Outdoors | Pet Supplies & Wildlife":                   "pets-wildlife-clinic",
  "Outdoors | Pet Supplies":                              "pets-wildlife-clinic",
  "Outdoors | Landscaping & Shade":                       "backyard-landscaping-farm",
  "Outdoors | Outdoor Hand Tools":                        "backyard-landscaping-farm",
  "Outdoors | Outdoor Decoration":                        "backyard-landscaping-farm",
  "Outdoors | Pools & Spas":                              "salon-spa-wellness",
  "Outdoors | Equipment Parts & Accessories":             "backyard-landscaping-farm",
  "Outdoors | Snow & Ice Removal Equipment":              "backyard-landscaping-farm",
  "Outdoors | Livestock & Poultry Supplies":              "backyard-landscaping-farm",
  "Outdoors | Patio Furniture & Accessories":             "backyard-landscaping-farm",
  "Outdoors | *":                                         "backyard-landscaping-farm",

  "Lawn & Garden | *":                                    "backyard-landscaping-farm",
  "Agriculture & Forestry Equipment | *":                 "backyard-landscaping-farm",
  "Agriculture & Forestry Equipment | Pet Supplies":      "pets-wildlife-clinic",

  // Sports & Outdoors — split
  "Sports & Outdoors | Exercise Equipment":               "fitness-sports-games",
  "Sports & Outdoors | Outdoor Sports":                   "fitness-sports-games",
  "Sports & Outdoors | Games":                            "fitness-sports-games",
  "Sports & Outdoors | Kids Toys":                        "kids-playgrounds",
  "Sports & Outdoors | Yoga Equipment":                   "fitness-sports-games",
  "Sports & Outdoors | Dance Equipment":                  "fitness-sports-games",
  "Sports & Outdoors | Trampolines":                      "kids-playgrounds",
  "Sports & Outdoors | Gymnastics Equipment":             "fitness-sports-games",
  "Sports & Outdoors | Boxing Equipment":                 "fitness-sports-games",
  "Sports & Outdoors | Sports Protective Gear":           "fitness-sports-games",
  "Sports & Outdoors | Cycling Gear":                     "fitness-sports-games",
  "Sports & Outdoors | Field Equipment":                  "fitness-sports-games",
  "Sports & Outdoors | Commercial Playground Equipment":  "kids-playgrounds",
  "Sports & Outdoors | Recreational Vehicles":            "automotive-workshop",
  "Sports & Outdoors | Camping Gear":                     "boating-camping-outdoor",
  "Sports & Outdoors | Tailgating Gear":                  "boating-camping-outdoor",
  "Sports & Outdoors | Hunting Gear":                     "boating-camping-outdoor",
  "Sports & Outdoors | Fishing Gear":                     "boating-camping-outdoor",
  "Sports & Outdoors | Boating":                          "boating-camping-outdoor",
  "Sports & Outdoors | Water Sports":                     "boating-camping-outdoor",
  "Sports & Outdoors | Water Recreation Equipment":       "boating-camping-outdoor",
  "Sports & Outdoors | Outdoor Recreation":               "boating-camping-outdoor",
  "Sports & Outdoors | Outdoor Hobbies":                  "boating-camping-outdoor",
  "Sports & Outdoors | *":                                "fitness-sports-games",

  "Sports & Recreation | Toys & Games":                   "kids-playgrounds",
  "Sports & Recreation | Exercise & Fitness":             "fitness-sports-games",
  "Sports & Recreation | Golf Equipment":                 "fitness-sports-games",
  "Sports & Recreation | Outdoor Sports":                 "fitness-sports-games",
  "Sports & Recreation | Games":                          "fitness-sports-games",
  "Sports & Recreation | Water Sports":                   "boating-camping-outdoor",
  "Sports & Recreation | Backpacking Equipment":          "boating-camping-outdoor",
  "Sports & Recreation | Fishing Equipment":              "boating-camping-outdoor",
  "Sports & Recreation | Leisure Sports":                 "boating-camping-outdoor",
  "Sports & Recreation | Hunting Gear":                   "boating-camping-outdoor",
  "Sports & Recreation | Cycling Gear":                   "fitness-sports-games",
  "Sports & Recreation | Sports & Outdoor Recreation Accessories": "fitness-sports-games",

  "Playground Sets | *":                                  "kids-playgrounds",

  // Safety, Security & Workwear → own L1
  "Safety | *":                                           "safety-security-workwear",
  "Safety Equipment | *":                                 "safety-security-workwear",
  "Security | *":                                         "safety-security-workwear",
  "Workwear | *":                                         "safety-security-workwear",

  // Health & Medical (+ Lab)
  "Health And Wellness | *":                              "health-medical-supply",
  "Health & Wellness | *":                                "health-medical-supply",
  "Health And Wellness | Skin Care":                      "salon-spa-wellness",
  "Health And Wellness | Beauty & Personal Care":         "salon-spa-wellness",

  // Lab → health (was educational-lab)
  "Industrial & Scientific | *":                          "hand-power-tools",  // industrial → tools
  "Lab | *":                                              "health-medical-supply",

  // Musical Instruments
  "Musical Instruments | *":                              "music-entertainment",

  // Furniture & Office Interiors
  "Furniture | *":                                        "office-commercial-interiors",
  "Furniture | Kids Furniture":                           "kids-playgrounds",
  "Furniture | Salon & Spa Equipment":                    "salon-spa-wellness",
  "Furniture | Bar Furniture":                            "horeca-food-service",
  "Furniture | Kitchen & Dining Room Furniture":          "horeca-food-service",
  "Home Decor | *":                                       "office-commercial-interiors",
  "Office Supplies | *":                                  "office-commercial-interiors",
  "Office Supplies | Salon & Spa Equipment":              "salon-spa-wellness",
  "Office Supplies | Toys & Games":                       "kids-playgrounds",
  "Office Supplies | Exercise & Fitness":                 "fitness-sports-games",
  "Office Supplies | Sports":                             "fitness-sports-games",
  "Window Treatments | *":                                "office-commercial-interiors",
  "Bath | *":                                             "construction-building",
  "Lighting | *":                                         "construction-building",
  "Holiday Decorations | *":                              "office-commercial-interiors",

  // Storage / Warehousing
  "Storage & Organization | *":                           "warehousing-material-handling",
  "Storage & Organization | Office Supplies":             "office-commercial-interiors",
  "Storage & Organization | Office Storage & Organization": "office-commercial-interiors",
  "Storage & Organization | Closet Organizers":           "office-commercial-interiors",
  "Storage & Organization | Shoe Storage":                "office-commercial-interiors",
  "Storage & Organization | Laundry Room Storage":        "cleaning-janitorial",
  "Storage & Organization | Craft Storage":               "crafts-sewing-printing",
  "Storage & Organization | Folding Furniture":           "office-commercial-interiors",
  "Material Handling | *":                                "warehousing-material-handling",

  // Hydraulics → Automotive
  "Hydraulics | *":                                       "automotive-workshop",
  "Smart Home | *":                                       "office-commercial-interiors",

  // Other → review
  "Other | *":                                            null,
}

const POST_ROUTE_PREFIX = [
  { prefix: "Outdoors > Pet Supplies & Wildlife > Farm Animal Supplies",        target: "backyard-landscaping-farm" },
  { prefix: "Outdoors > Pet Supplies & Wildlife > Bird & Wildlife Supplies",    target: "backyard-landscaping-farm" },
  { prefix: "Outdoors > Pet Supplies & Wildlife > Livestock Scratch Brushes",   target: "backyard-landscaping-farm" },
  { prefix: "Outdoors > Pet Supplies & Wildlife > Small Animal Supplies > Chicken Coop Door Opener", target: "backyard-landscaping-farm" },
  // Learning & Education from Tools → kids
  { prefix: "Tools > Learning & Education",                                     target: "kids-playgrounds" },
  // But medical teaching model → health
  { prefix: "Tools > Learning & Education > Medical Teaching Model",            target: "health-medical-supply" },
]

const RESERVED_PREFIXES = new Set(["alustajale", "hooldus", "arikliendile", "toode", "haru"])

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

function applyPostRoute(path, currentTarget) {
  for (const rule of POST_ROUTE_PREFIX) {
    if (path === rule.prefix || path.startsWith(rule.prefix + " > ")) return rule.target
  }
  return currentTarget
}

function routeProduct(vevorPath) {
  const segs = vevorPath.split(" > ").map((s) => s.trim()).filter(Boolean)
  if (segs.length < 1) return null
  const l1 = segs[0]
  const l2 = segs[1] || ""
  const specificKey = `${l1} | ${l2}`
  let target = null
  if (ROUTING[specificKey] !== undefined) target = ROUTING[specificKey]
  else {
    const fallbackKey = `${l1} | *`
    if (ROUTING[fallbackKey] !== undefined) target = ROUTING[fallbackKey]
  }
  if (target === null && !(ROUTING[specificKey] === null || ROUTING[`${l1} | *`] === null)) {
    return null
  }
  return applyPostRoute(vevorPath, target)
}

async function loadProducts() {
  const c = new pg.Client(PG_CONFIG)
  await c.connect()
  const r = await c.query(
    "SELECT metadata->>'vevor_product_type' AS path, COUNT(*) AS n " +
    "FROM product WHERE deleted_at IS NULL AND status = 'published' " +
    "AND metadata->>'vevor_product_type' IS NOT NULL GROUP BY 1 ORDER BY 2 DESC"
  )
  await c.end()
  return r.rows.map((row) => ({
    path: row.path,
    count: parseInt(row.n, 10),
    segments: row.path.split(" > ").map((s) => s.trim()).filter(Boolean),
  }))
}

function buildSubtree(productsWithSegments, startFromLevel) {
  const root = { name_en: "__root__", slug: "__root__", product_count: 0, children: new Map() }
  for (const { segments, count } of productsWithSegments) {
    const subSegs = segments.slice(startFromLevel - 1)
    if (subSegs.length === 0) { root.product_count += count; continue }
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

function countSubtree(node) {
  let c = node.product_count || 0
  for (const sub of node.children.values()) c += countSubtree(sub)
  return c
}

function treeToArray(node) {
  const total = countSubtree(node)
  if (node.children.size === 0) return { slug: node.slug, name_en: node.name_en, product_count: total }
  const subs = [...node.children.values()]
    .sort((a, b) => countSubtree(b) - countSubtree(a) || a.slug.localeCompare(b.slug))
    .map(treeToArray)
  return { slug: node.slug, name_en: node.name_en, product_count: total, subs }
}

function disambiguateSlugs(l1Slug, node, usedGlobal) {
  for (const sub of node.subs || []) {
    if (usedGlobal.has(sub.slug)) {
      const parentSlug = node.slug === "__root__" ? l1Slug : node.slug
      const newSlug = `${parentSlug}-${sub.slug}`.slice(0, 64)
      sub.slug = usedGlobal.has(newSlug) ? `${newSlug}-${Math.random().toString(36).slice(2, 6)}` : newSlug
    }
    usedGlobal.add(sub.slug)
    disambiguateSlugs(l1Slug, sub, usedGlobal)
  }
}

function buildPathToLeafMap(l1Slug, productsForL1, finalL1) {
  const map = {}
  for (const { path, segments } of productsForL1) {
    const subSegs = segments.slice(1)
    if (subSegs.length === 0) { map[path] = l1Slug; continue }
    let cursor = { subs: finalL1.subs || [] }
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

function maxDepth(node, cur = 1) {
  if (!node.subs || node.subs.length === 0) return cur
  return Math.max(...node.subs.map((s) => maxDepth(s, cur + 1)))
}

function flatCount(node) {
  let c = 1
  for (const s of node.subs || []) c += flatCount(s)
  return c
}

function outlineLine(node, prefix, lines) {
  const count = node.product_count != null ? ` (${node.product_count})` : ""
  lines.push(`${prefix} ${node.name_en || node.slug}${count}`)
  const subs = node.subs || []
  for (let i = 0; i < subs.length; i++) outlineLine(subs[i], `${prefix}.${i + 1}`, lines)
}

async function main() {
  console.log("=== bootstrap-taxonomy-v3.mjs ===\n")
  const products = await loadProducts()
  const totalProducts = products.reduce((a, p) => a + p.count, 0)
  console.log(`Loaded ${products.length} VEVOR paths, ${totalProducts} products, ${NEW_L1.length} new L1\n`)

  const byL1 = new Map()
  const reviewBucket = []
  const unmatchedKeys = new Map()
  for (const p of products) {
    const target = routeProduct(p.path)
    if (!target) {
      reviewBucket.push(p)
      const key = `${p.segments[0]} | ${p.segments[1] || "(none)"}`
      unmatchedKeys.set(key, (unmatchedKeys.get(key) || 0) + p.count)
      continue
    }
    if (!byL1.has(target)) byL1.set(target, [])
    byL1.get(target).push(p)
  }

  const usedSlugs = new Set(NEW_L1.map((l) => l.slug))
  const newL1s = []
  const stats = []
  const vevorPathToLeaf = {}
  for (const l1def of NEW_L1) {
    const bucket = byL1.get(l1def.slug) || []
    const root = buildSubtree(bucket, 2)
    const asArray = treeToArray(root)
    disambiguateSlugs(l1def.slug, asArray, usedSlugs)
    const newL1 = { ...l1def, subs: asArray.subs || [] }
    newL1s.push(newL1)
    Object.assign(vevorPathToLeaf, buildPathToLeafMap(l1def.slug, bucket, newL1))
    const productCount = bucket.reduce((a, p) => a + p.count, 0)
    stats.push({
      l1: l1def.slug, products: productCount,
      unique_paths: bucket.length, sub_nodes: flatCount(asArray) - 1,
      l2_count: (asArray.subs || []).length, max_depth: maxDepth(asArray, 1),
    })
  }

  console.log("L1                                       | Products | Paths | Sub | L2 | Depth")
  console.log("-".repeat(95))
  for (const s of stats) {
    console.log(
      (s.l1 + " ".repeat(40)).slice(0, 40) + " | " +
      (s.products + "      ").slice(0, 8) + " | " +
      (s.unique_paths + "     ").slice(0, 5) + " | " +
      (s.sub_nodes + "    ").slice(0, 4) + "| " +
      (s.l2_count + "   ").slice(0, 3) + "| L" + s.max_depth
    )
  }
  const totalSub = stats.reduce((a, s) => a + s.sub_nodes, 0)
  console.log("-".repeat(95))
  console.log(`Total sub-nodes: ${totalSub}`)
  console.log(`Review bucket: ${reviewBucket.length} paths, ${reviewBucket.reduce((a,p)=>a+p.count,0)} products\n`)

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const outDir = resolve(REPORTS_DIR, `bootstrap-v3-${timestamp}`)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  const newTaxonomy = { version: 3, updated: new Date().toISOString().slice(0, 10), source: "bootstrap-v3 — 18 L1 user revision", l1: newL1s }
  writeFileSync(resolve(outDir, "taxonomy.yaml.draft"), yaml.dump(newTaxonomy, { lineWidth: -1, noRefs: true, sortKeys: false }), "utf8")
  writeFileSync(resolve(outDir, "vevor-path-to-leaf.json.draft"), JSON.stringify({
    _doc: "VEVOR path → leaf slug (v3)",
    _generated_at: new Date().toISOString(),
    _total_entries: Object.keys(vevorPathToLeaf).length,
    mappings: vevorPathToLeaf,
  }, null, 2), "utf8")
  const lines = []
  for (let i = 0; i < newL1s.length; i++) outlineLine(newL1s[i], `${i + 1}`, lines)
  writeFileSync(resolve(outDir, "taxonomy.outline.txt"), lines.join("\n") + "\n", "utf8")

  let review = `# Review report v3 (${timestamp})\n\n## L1 stats\n\n| L1 | Products | Paths | Sub-nodes | L2 | Max depth |\n|---|---:|---:|---:|---:|---:|\n`
  for (const s of stats) review += `| \`${s.l1}\` | ${s.products} | ${s.unique_paths} | ${s.sub_nodes} | ${s.l2_count} | L${s.max_depth} |\n`
  review += `\n**Total:** ${totalSub} sub-nodes\n\n## Review bucket\n\n`
  if (unmatchedKeys.size === 0) review += "All paths mapped.\n"
  else {
    review += `| VEVOR L1 \\| L2 | Products |\n|---|---:|\n`
    for (const [k, n] of [...unmatchedKeys.entries()].sort((a,b)=>b[1]-a[1])) review += `| \`${k}\` | ${n} |\n`
  }
  writeFileSync(resolve(outDir, "review-report.md"), review, "utf8")

  console.log(`Output: ${outDir}/`)
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1) })
