#!/usr/bin/env node
/**
 * bootstrap-taxonomy-v2.mjs
 *
 * Asendab esmase bootstrap-skripti uue 22 L1 struktuuriga kasutaja 2026-04-19
 * otsuse põhjal. Sisaldab:
 *   - Uus 22 L1 nimekiri (Renewable Energy & Batteries; Pets = loomakliinik; Farm eraldi; jne)
 *   - VEVOR L1+L2 → meie uus L1 slug mapimine (ilma käsitsi `l1-defaults.json` muutmata)
 *   - L2-L7 puu säilib (VEVOR hierarhia) meie uue L1 all
 *   - Duplikaadid liidetakse (Crafts & Sewing, Woodworking Tools, Welding)
 *
 * Väljund: reports/bootstrap-v2-<timestamp>/
 *   - taxonomy.yaml.draft
 *   - vevor-path-to-leaf.json.draft
 *   - vevor-l1-l2-routing.md  (mapimise dokumentatsioon)
 *   - review-report.md        (kahtlased kohad inimesele)
 *   - taxonomy.outline.txt    (numbrite hierarhia)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"
import pg from "pg"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const REPORTS_DIR = resolve(ROOT, "reports")

const PG_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD,
  database: "xlmarket",
}

// ===========================================================================
// 22 new L1 categories (user decision 2026-04-19)
// ===========================================================================

const NEW_L1 = [
  { slug: "horeca-food-service",                name_en: "HoReCa & Food Service" },
  { slug: "renewable-energy-batteries",         name_en: "Renewable Energy & Batteries" },
  { slug: "automotive-workshop",                name_en: "Automotive & Workshop" },
  { slug: "cleaning-janitorial",                name_en: "Cleaning & Janitorial" },
  { slug: "crafts-sewing",                      name_en: "Crafts & Sewing" },
  { slug: "metalworks-welding",                 name_en: "Metalworks & Welding" },
  { slug: "woodworking-carpentry",              name_en: "Woodworking & Carpentry" },
  { slug: "printing-engraving-branding",        name_en: "Printing, Engraving & Custom Branding" },
  { slug: "salon-spa-wellness",                 name_en: "Salon, Spa & Wellness" },
  { slug: "educational-lab",                    name_en: "Educational & Lab" },
  { slug: "health-medical-supply",              name_en: "Health & Medical Supply" },
  { slug: "fitness-sports-games",               name_en: "Fitness, Sports & Games" },
  { slug: "boating-camping-outdoor",            name_en: "Boating, Camping & Outdoor Adventure" },
  { slug: "music-entertainment",                name_en: "Music & Entertainment" },
  { slug: "pets-wildlife-clinic",               name_en: "Pets, Wildlife, Veterinary & Kennels" },
  { slug: "farm-agriculture",                   name_en: "Farm & Agriculture" },
  { slug: "kids-playgrounds",                   name_en: "Kids & Playgrounds" },
  { slug: "backyard-landscaping",               name_en: "Backyard & Landscaping" },
  { slug: "construction-building",              name_en: "Construction & Building" },
  { slug: "hand-power-tools",                   name_en: "Hand & Power Tools" },
  { slug: "warehousing-material-handling",      name_en: "Warehousing & Material Handling" },
  { slug: "office-commercial-interiors",        name_en: "Office & Commercial Interiors" },
]

// ===========================================================================
// Routing map: VEVOR L1|L2 → our new L1 slug
// Rules (most specific wins):
//   - "VEVOR L1 | VEVOR L2"  exact match → specific override
//   - "VEVOR L1 | *"         fallback for that whole VEVOR L1
//   - Unmatched → review bucket
// ===========================================================================

const ROUTING = {
  // HoReCa — food service, kitchen appliances
  "Appliances | *":                                       "horeca-food-service",
  "Appliances | Crafts & Sewing":                         "crafts-sewing",
  "Kitchen | *":                                          "horeca-food-service",
  "Restaurant & Food Service | *":                        "horeca-food-service",
  "Restaurant & Food Service | Fishery Aquaculture":      "farm-agriculture",

  // Renewable Energy & Batteries — new L1
  "Alternative & Renewable Energy | *":                   "renewable-energy-batteries",
  "Electrical | Renewable Energy":                        "renewable-energy-batteries",
  "Electrical | Inverters":                               "renewable-energy-batteries",
  "Electrical | Solar Power":                             "renewable-energy-batteries",
  "Electrical | Batteries":                               "renewable-energy-batteries",
  "Electrical | Batteries & Chargers & Accessories":      "renewable-energy-batteries",
  "Electrical | Wind Power":                              "renewable-energy-batteries",

  // Electrical (rest) → Construction & Building (electrical sub-area)
  "Electrical | *":                                       "construction-building",
  "Electrical | Electronics":                             "office-commercial-interiors",
  "Electrical | Camera & Photo":                          "printing-engraving-branding",
  "Electrical | Home Audio":                              "music-entertainment",
  "Electrical | Musical Instrument Accessories":          "music-entertainment",
  "Electrical | Stage Lighting & Effects":                "music-entertainment",
  "Electrical | Video Games":                             "kids-playgrounds",
  "Electrical | PlayStation 5":                           "kids-playgrounds",

  // Automotive
  "Automotive | *":                                       "automotive-workshop",
  "Automotive | Boat Parts & Accessories":                "boating-camping-outdoor",
  "Automotive | Fuel Transfer & Lubrication":             "automotive-workshop",
  "Engines & Motors | *":                                 "automotive-workshop",

  // Cleaning
  "Cleaning | *":                                         "cleaning-janitorial",
  "Cleaning & Janitorial Supplies | *":                   "cleaning-janitorial",
  "Appliances | Floor Care":                              "cleaning-janitorial",
  "Appliances | Vacuum Cleaners":                         "cleaning-janitorial",
  "Appliances | Washers & Dryers":                        "cleaning-janitorial",

  // Crafts & Sewing (1.2 + 4.3 kokku)
  "Arts & Crafts & Sewing | Sewing":                      "crafts-sewing",
  "Arts & Crafts & Sewing | Leather Crafts":              "crafts-sewing",
  "Arts & Crafts & Sewing | Ceramics & Pottery Crafts":   "crafts-sewing",
  "Arts & Crafts & Sewing | Speciality Crafts & Hobbies": "crafts-sewing",

  // Printing, Engraving & Custom Branding (laser + print + vinyl + jewelry making)
  "Arts & Crafts & Sewing | Printmaking":                 "printing-engraving-branding",
  "Arts & Crafts & Sewing | Engraving":                   "printing-engraving-branding",
  "Arts & Crafts & Sewing | Jewelry Making & Repair":     "printing-engraving-branding",
  "Arts & Crafts & Sewing | Paper Crafts":                "printing-engraving-branding",
  "Painting | *":                                         "printing-engraving-branding",
  "Paint | *":                                            "construction-building",

  // Tools → split into specific L1s
  "Tools | Hand Tools":                                   "hand-power-tools",
  "Tools | Power Tools":                                  "hand-power-tools",
  "Tools | Power Tool Accessories":                       "hand-power-tools",
  "Tools | Air Compressor Tools":                         "hand-power-tools",
  "Tools | Tool Storage":                                 "hand-power-tools",
  "Tools | Flashlights":                                  "hand-power-tools",
  "Tools | Woodworking Tools":                            "woodworking-carpentry",
  "Tools | Welding & Soldering":                          "metalworks-welding",
  "Tools | Safety & Security":                            "hand-power-tools",
  "Hand Tools | *":                                       "hand-power-tools",
  "Power Tools | *":                                      "hand-power-tools",
  "Air Tools & Compressors | *":                          "hand-power-tools",
  "Tool Storage & Organization | *":                      "hand-power-tools",
  "Welding | *":                                          "metalworks-welding",
  "Machining | *":                                        "metalworks-welding",

  // Hardware → mostly Construction, some to Office Interiors (furniture hardware)
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

  // Woodworking
  "Lumber & Composites | *":                              "construction-building",

  // Construction / Building Materials
  "Building Materials | *":                               "construction-building",
  "Building & Construction | *":                          "construction-building",
  "Building & Construction | Footwear":                   "automotive-workshop",
  "Building & Construction | Heavy Equipment Accessories": "automotive-workshop",
  "Doors & Windows | *":                                  "construction-building",
  "Flooring | *":                                         "construction-building",
  "Flooring | Gym Flooring":                              "fitness-sports-games",
  "Flooring | Garage Flooring":                           "automotive-workshop",
  "Flooring | Rugs":                                      "office-commercial-interiors",
  "Flooring | Carpet":                                    "office-commercial-interiors",

  // Plumbing & Water
  "Plumbing | *":                                         "construction-building",
  "Pumps | *":                                            "construction-building",

  // HVAC
  "Heating, Venting & Cooling | *":                       "construction-building",
  "Heating & Cooling | *":                                "construction-building",

  // Outdoors (huge VEVOR L1 — split per L2)
  "Outdoors | Garden Center":                             "backyard-landscaping",
  "Outdoors | Patio Furniture":                           "backyard-landscaping",
  "Outdoors | Outdoor Heating":                           "backyard-landscaping",
  "Outdoors | Outdoor Cooking":                           "backyard-landscaping",
  "Outdoors | Pools":                                     "salon-spa-wellness",
  "Outdoors | Home Spas":                                 "salon-spa-wellness",
  "Outdoors | Outdoor Power Equipment":                   "backyard-landscaping",
  "Outdoors | Pet Supplies & Wildlife":                   "pets-wildlife-clinic",
  "Outdoors | Pet Supplies":                              "pets-wildlife-clinic",
  "Outdoors | Landscaping & Shade":                       "backyard-landscaping",
  "Outdoors | Outdoor Hand Tools":                        "backyard-landscaping",
  "Outdoors | Outdoor Decoration":                        "backyard-landscaping",
  "Outdoors | Pools & Spas":                              "salon-spa-wellness",
  "Outdoors | Equipment Parts & Accessories":             "backyard-landscaping",
  "Outdoors | Snow & Ice Removal Equipment":              "backyard-landscaping",
  "Outdoors | Livestock & Poultry Supplies":              "farm-agriculture",
  "Outdoors | Patio Furniture & Accessories":             "backyard-landscaping",
  "Outdoors | *":                                         "backyard-landscaping",

  "Lawn & Garden | *":                                    "backyard-landscaping",
  "Agriculture & Forestry Equipment | *":                 "farm-agriculture",
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

  // Playground Sets
  "Playground Sets | *":                                  "kids-playgrounds",

  // Safety & Workwear → split
  "Safety | *":                                           "construction-building",
  "Safety Equipment | *":                                 "construction-building",
  "Security | *":                                         "construction-building",
  "Workwear | *":                                         "construction-building",

  // Health & Wellness
  "Health And Wellness | *":                              "health-medical-supply",
  "Health & Wellness | *":                                "health-medical-supply",
  "Health And Wellness | Skin Care":                      "salon-spa-wellness",
  "Health And Wellness | Beauty & Personal Care":         "salon-spa-wellness",

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

  // Industrial & Lab
  "Industrial & Scientific | *":                          "educational-lab",
  "Lab | *":                                              "educational-lab",
  "Tools | Lab & Scientific Products":                    "educational-lab",

  // Storage / Warehousing
  "Storage & Organization | *":                           "warehousing-material-handling",
  "Storage & Organization | Office Supplies":             "office-commercial-interiors",
  "Storage & Organization | Office Storage & Organization": "office-commercial-interiors",
  "Storage & Organization | Closet Organizers":           "office-commercial-interiors",
  "Storage & Organization | Shoe Storage":                "office-commercial-interiors",
  "Storage & Organization | Laundry Room Storage":        "cleaning-janitorial",
  "Storage & Organization | Craft Storage":               "crafts-sewing",
  "Storage & Organization | Folding Furniture":           "office-commercial-interiors",
  "Material Handling | *":                                "warehousing-material-handling",

  // Hydraulics
  "Hydraulics | *":                                       "automotive-workshop",

  // Smart Home / misc
  "Smart Home | *":                                       "office-commercial-interiors",

  // Other → review bucket (unmapped)
  "Other | *":                                            null, // → review
}

// ===========================================================================
// Post-routing moves: VEVOR full-path prefix → new L1 (used AFTER ROUTING,
// before tree build). If a product's path starts with one of these prefixes,
// it overrides the ROUTING map. Order matters — first match wins.
// ===========================================================================

const POST_ROUTE_PREFIX = [
  // Farm animals extracted from "Outdoors > Pet Supplies & Wildlife"
  { prefix: "Outdoors > Pet Supplies & Wildlife > Farm Animal Supplies",        target: "farm-agriculture" },
  { prefix: "Outdoors > Pet Supplies & Wildlife > Bird & Wildlife Supplies",    target: "farm-agriculture" },
  { prefix: "Outdoors > Pet Supplies & Wildlife > Livestock Scratch Brushes",   target: "farm-agriculture" },
  { prefix: "Outdoors > Pet Supplies & Wildlife > Small Animal Supplies > Chicken Coop Door Opener", target: "farm-agriculture" },
]

function applyPostRoute(path, currentTarget) {
  for (const rule of POST_ROUTE_PREFIX) {
    if (path === rule.prefix || path.startsWith(rule.prefix + " > ")) return rule.target
  }
  return currentTarget
}

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

function routeProduct(vevorPath) {
  const segs = vevorPath.split(" > ").map((s) => s.trim()).filter(Boolean)
  if (segs.length < 1) return null
  const l1 = segs[0]
  const l2 = segs[1] || ""
  // Specific "L1 | L2" match first
  const specificKey = `${l1} | ${l2}`
  let target = null
  if (ROUTING[specificKey] !== undefined) target = ROUTING[specificKey]
  else {
    const fallbackKey = `${l1} | *`
    if (ROUTING[fallbackKey] !== undefined) target = ROUTING[fallbackKey]
  }
  if (target === null && ROUTING[specificKey] !== null && ROUTING[`${l1} | *`] !== null) {
    return null // unmapped → review
  }
  // Apply post-route prefix override
  return applyPostRoute(vevorPath, target)
}

async function loadProducts() {
  const c = new pg.Client(PG_CONFIG)
  await c.connect()
  const r = await c.query(
    "SELECT metadata->>'vevor_product_type' AS path, COUNT(*) AS n " +
    "FROM product WHERE deleted_at IS NULL AND status = 'published' " +
    "AND metadata->>'vevor_product_type' IS NOT NULL " +
    "GROUP BY 1 ORDER BY 2 DESC"
  )
  await c.end()
  return r.rows.map((row) => ({
    path: row.path,
    count: parseInt(row.n, 10),
    segments: row.path.split(" > ").map((s) => s.trim()).filter(Boolean),
  }))
}

function buildSubtree(productsWithSegments, startFromLevel) {
  // startFromLevel = 2 means drop VEVOR L1 only. startFromLevel = 3 means drop L1+L2.
  const root = { name_en: "__root__", slug: "__root__", product_count: 0, children: new Map() }
  for (const { segments, count } of productsWithSegments) {
    const subSegs = segments.slice(startFromLevel - 1)
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

function countSubtree(node) {
  let c = node.product_count || 0
  for (const sub of node.children.values()) c += countSubtree(sub)
  return c
}

function treeToArray(node) {
  const total = countSubtree(node)
  if (node.children.size === 0) {
    return { slug: node.slug, name_en: node.name_en, product_count: total }
  }
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
      sub.slug = usedGlobal.has(newSlug)
        ? `${newSlug}-${Math.random().toString(36).slice(2, 6)}`
        : newSlug
    }
    usedGlobal.add(sub.slug)
    disambiguateSlugs(l1Slug, sub, usedGlobal)
  }
}

function buildPathToLeafMap(l1Slug, productsForL1, finalL1) {
  const map = {}
  for (const { path, segments } of productsForL1) {
    // Drop VEVOR L1 (and possibly L2 if specific match was used — but we always drop just L1 in subtree)
    const subSegs = segments.slice(1)
    if (subSegs.length === 0) {
      map[path] = l1Slug
      continue
    }
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
  for (let i = 0; i < subs.length; i++) {
    outlineLine(subs[i], `${prefix}.${i + 1}`, lines)
  }
}

async function main() {
  console.log("=== bootstrap-taxonomy-v2.mjs ===\n")

  const products = await loadProducts()
  const totalProducts = products.reduce((a, p) => a + p.count, 0)
  console.log(`Loaded ${products.length} unique VEVOR paths covering ${totalProducts} products`)
  console.log(`New L1 count: ${NEW_L1.length}\n`)

  // Bucket products by new L1 (or review)
  const byL1 = new Map()
  const reviewBucket = []
  const unmatchedKeys = new Map()

  for (const p of products) {
    const targetL1 = routeProduct(p.path)
    if (!targetL1) {
      reviewBucket.push(p)
      const l1 = p.segments[0]
      const l2 = p.segments[1] || "(none)"
      const key = `${l1} | ${l2}`
      unmatchedKeys.set(key, (unmatchedKeys.get(key) || 0) + p.count)
      continue
    }
    if (!byL1.has(targetL1)) byL1.set(targetL1, [])
    byL1.get(targetL1).push(p)
  }

  // Build each L1 subtree
  const usedSlugs = new Set(NEW_L1.map((l) => l.slug))
  const newL1s = []
  const stats = []
  const vevorPathToLeaf = {}
  const routingDoc = [] // for docs

  for (const l1def of NEW_L1) {
    const bucket = byL1.get(l1def.slug) || []
    const root = buildSubtree(bucket, 2)
    const asArray = treeToArray(root)
    disambiguateSlugs(l1def.slug, asArray, usedSlugs)

    const newL1 = { ...l1def, subs: asArray.subs || [] }
    newL1s.push(newL1)

    const mapForL1 = buildPathToLeafMap(l1def.slug, bucket, newL1)
    Object.assign(vevorPathToLeaf, mapForL1)

    const productCount = bucket.reduce((a, p) => a + p.count, 0)
    stats.push({
      l1: l1def.slug,
      products: productCount,
      unique_paths: bucket.length,
      sub_nodes: flatCount(asArray) - 1,
      l2_count: (asArray.subs || []).length,
      max_depth: maxDepth(asArray, 1),
    })
  }

  // Stats table
  console.log("L1                                     | Products | Paths | Sub | L2 | Depth")
  console.log("-".repeat(95))
  for (const s of stats) {
    console.log(
      (s.l1 + " ".repeat(38)).slice(0, 38) + " | " +
      (s.products + "      ").slice(0, 8) + " | " +
      (s.unique_paths + "     ").slice(0, 5) + " | " +
      (s.sub_nodes + "    ").slice(0, 4) + "| " +
      (s.l2_count + "   ").slice(0, 3) + "| L" + s.max_depth
    )
  }
  const totalSubNodes = stats.reduce((a, s) => a + s.sub_nodes, 0)
  console.log("-".repeat(95))
  console.log(`Total sub-nodes: ${totalSubNodes}`)
  console.log(`Review bucket (unmapped): ${reviewBucket.length} paths, ${reviewBucket.reduce((a,p)=>a+p.count,0)} products`)
  console.log(`VEVOR path → leaf mappings: ${Object.keys(vevorPathToLeaf).length}\n`)

  // Outputs
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const outDir = resolve(REPORTS_DIR, `bootstrap-v2-${timestamp}`)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const newTaxonomy = {
    version: 2,
    updated: new Date().toISOString().slice(0, 10),
    source: "bootstrap-taxonomy-v2.mjs — user 2026-04-19 22-L1 structure",
    l1: newL1s,
  }
  writeFileSync(
    resolve(outDir, "taxonomy.yaml.draft"),
    yaml.dump(newTaxonomy, { lineWidth: -1, noRefs: true, sortKeys: false }),
    "utf8"
  )

  writeFileSync(
    resolve(outDir, "vevor-path-to-leaf.json.draft"),
    JSON.stringify({
      _doc: "Hardcoded VEVOR path → leaf slug. User reviews before commit.",
      _generated_at: new Date().toISOString(),
      _total_entries: Object.keys(vevorPathToLeaf).length,
      _review_bucket_count: reviewBucket.length,
      mappings: vevorPathToLeaf,
    }, null, 2),
    "utf8"
  )

  // Outline
  const lines = []
  for (let i = 0; i < newL1s.length; i++) {
    outlineLine(newL1s[i], `${i + 1}`, lines)
  }
  writeFileSync(resolve(outDir, "taxonomy.outline.txt"), lines.join("\n") + "\n", "utf8")

  // Review report
  let review = `# Review report — bootstrap v2 (${timestamp})\n\n`
  review += `## L1 stats\n\n| L1 | Products | Paths | Sub-nodes | L2 | Max depth |\n|---|---:|---:|---:|---:|---:|\n`
  for (const s of stats) {
    review += `| \`${s.l1}\` | ${s.products} | ${s.unique_paths} | ${s.sub_nodes} | ${s.l2_count} | L${s.max_depth} |\n`
  }
  review += `\n**Total sub-nodes:** ${totalSubNodes}\n\n`

  review += `## Empty L1s (no products routed here)\n\n`
  const empty = stats.filter((s) => s.products === 0)
  if (empty.length === 0) review += "None.\n\n"
  else {
    for (const s of empty) review += `- \`${s.l1}\`\n`
    review += `\n`
  }

  review += `## Review bucket — unmapped paths (need user decision)\n\n`
  if (unmatchedKeys.size === 0) {
    review += "All paths mapped.\n\n"
  } else {
    review += `| VEVOR L1 \\| L2 | Products |\n|---|---:|\n`
    for (const [k, n] of [...unmatchedKeys.entries()].sort((a, b) => b[1] - a[1])) {
      review += `| \`${k}\` | ${n} |\n`
    }
    review += `\nAction: add routing rule in \`bootstrap-taxonomy-v2.mjs\` ROUTING map, re-run.\n\n`
  }

  writeFileSync(resolve(outDir, "review-report.md"), review, "utf8")

  // Routing doc
  let routingMd = `# VEVOR L1|L2 → our L1 routing (v2)\n\nAll rules from \`ROUTING\` map (${Object.keys(ROUTING).length} entries).\n\n`
  routingMd += `Rule format: \`"VEVOR L1 | VEVOR L2"\` → our L1. \`| *\` = wildcard for whole VEVOR L1.\n\n`
  routingMd += `| Rule | Target L1 |\n|---|---|\n`
  for (const [k, v] of Object.entries(ROUTING)) {
    routingMd += `| \`${k}\` | ${v === null ? "**review**" : `\`${v}\``} |\n`
  }
  writeFileSync(resolve(outDir, "vevor-l1-l2-routing.md"), routingMd, "utf8")

  console.log(`Drafts written to: ${outDir}/`)
  console.log(`  - taxonomy.yaml.draft`)
  console.log(`  - vevor-path-to-leaf.json.draft`)
  console.log(`  - taxonomy.outline.txt`)
  console.log(`  - review-report.md`)
  console.log(`  - vevor-l1-l2-routing.md`)
}

main().catch((e) => { console.error("ERROR:", e); process.exit(1) })
