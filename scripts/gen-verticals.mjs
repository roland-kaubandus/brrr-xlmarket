#!/usr/bin/env node
/**
 * gen-verticals.mjs — compiles taxonomy.yaml verticals: section into a
 * static JSON that the storefront imports at build time.
 *
 * Output: storefront/lib/verticals.generated.json
 *
 * Run this after editing taxonomy.yaml verticals: (pre-deploy step).
 */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const YAML_PATH = resolve(ROOT, "backend/src/data/taxonomy.yaml")
const OUT_PATH = resolve(ROOT, "storefront/lib/verticals.generated.json")

const doc = yaml.load(readFileSync(YAML_PATH, "utf8"))
const verticals = (doc.verticals || []).map((v) => ({
  slug: v.slug,
  mode: v.mode,
  name_et: v.name_et,
  name_en: v.name_en,
  tagline_et: v.tagline_et,
  tagline_en: v.tagline_en,
  description_et: v.description_et,
  description_en: v.description_en,
  meta_title_et: v.meta_title_et,
  meta_description_et: v.meta_description_et,
  hero_img: v.hero_img || null,
  hero_gradient: v.hero_gradient || null,
  emtak_codes: v.emtak_codes || [],
  include_nodes: v.include_nodes || [],
  exclude_nodes: v.exclude_nodes || [],
  kits: (v.kits || []).map((k) => ({
    tier: k.tier,
    name_et: k.name_et,
    name_en: k.name_en,
    price_from: k.price_from,
    items: (k.items || []).map((item) => ({
      label_et: item.label_et,
      label_en: item.label_en,
      l2_slug: item.l2_slug || null,
      l3_slug: item.l3_slug || null,
    })),
  })),
  faq: (v.faq || []).map((f) => ({ q_et: f.q_et, a_et: f.a_et, q_en: f.q_en || null, a_en: f.a_en || null })),
  delivery_note_et: v.delivery_note_et || null,
  delivery_note_en: v.delivery_note_en || null,
  financing_note_et: v.financing_note_et || null,
  financing_note_en: v.financing_note_en || null,
}))

writeFileSync(OUT_PATH, JSON.stringify({ generated_at: new Date().toISOString(), verticals }, null, 2))
console.log(`Wrote ${verticals.length} verticals to ${OUT_PATH}`)
