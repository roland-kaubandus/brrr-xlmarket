#!/usr/bin/env node
/**
 * dump-taxonomy-outline.mjs
 *
 * Reads a taxonomy.yaml (or .draft) and prints an outline:
 *   1 L1 Name (N products)
 *     1.1 L2 Name (N)
 *       1.1.1 L3 Name (N)
 *         1.1.1.1 L4 Name (N)
 *
 * Usage:
 *   node scripts/dump-taxonomy-outline.mjs <input.yaml> [output.txt]
 */

import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import yaml from "js-yaml"

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error("Usage: node scripts/dump-taxonomy-outline.mjs <input.yaml> [output.txt]")
  process.exit(1)
}
const INPUT = resolve(args[0])
const OUTPUT = args[1] ? resolve(args[1]) : null

const doc = yaml.load(readFileSync(INPUT, "utf8"))
const lines = []

function displayName(node) {
  // English is the single source of truth for taxonomy (user decision 2026-04-18).
  // Other locales are derived from English via separate translation step.
  return node.name_en || node.name_et || node.slug
}

function walk(node, prefix, depth) {
  const count = node.product_count != null ? ` (${node.product_count})` : ""
  lines.push(`${prefix} ${displayName(node)}${count}`)
  const subs = node.subs || []
  for (let i = 0; i < subs.length; i++) {
    walk(subs[i], `${prefix}.${i + 1}`, depth + 1)
  }
}

for (let i = 0; i < doc.l1.length; i++) {
  walk(doc.l1[i], `${i + 1}`, 1)
}

const output = lines.join("\n") + "\n"

if (OUTPUT) {
  writeFileSync(OUTPUT, output, "utf8")
  console.log(`Wrote ${lines.length} lines to ${OUTPUT}`)
} else {
  process.stdout.write(output)
}
