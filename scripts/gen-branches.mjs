#!/usr/bin/env node
/**
 * gen-branches.mjs — generate storefront/lib/branches.ts from taxonomy.yaml.
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §3 (SSoT), INV-04.
 *
 * Usage:
 *   node scripts/gen-branches.mjs           # writes storefront/lib/branches.ts
 *   node scripts/gen-branches.mjs --stdout  # prints to stdout (for CI diff)
 *   node scripts/gen-branches.mjs --check   # exits 1 if existing file drifts
 *
 * YAML source: backend/src/data/taxonomy.yaml (22 L1 with copywriting fields).
 * Output: storefront/lib/branches.ts (deterministic, byte-identical re-runs).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const YAML_PATH = resolve(ROOT, "backend/src/data/taxonomy.yaml");
const OUT_PATH = resolve(ROOT, "storefront/lib/branches.ts");

function loadTaxonomy() {
  const doc = yaml.load(readFileSync(YAML_PATH, "utf8"));
  if (!doc?.l1 || !Array.isArray(doc.l1)) {
    throw new Error("taxonomy.yaml: missing or invalid top-level `l1` list");
  }
  return doc;
}

/** Escape a string for embedding inside a TS double-quoted literal. */
function tsString(value) {
  if (value === null || value === undefined) return "null";
  const escaped = String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
  return `"${escaped}"`;
}

function requireField(entry, field) {
  const v = entry[field];
  if (v === undefined || v === null || v === "") {
    throw new Error(
      `taxonomy.yaml: L1 "${entry.slug}" missing required field \`${field}\``,
    );
  }
  return v;
}

function renderBranch(entry) {
  const shortSlug = requireField(entry, "short_slug");
  const name = requireField(entry, "name_et");
  const nameEn = requireField(entry, "name_en");
  const taglineEt = requireField(entry, "tagline_et");
  const taglineEn = requireField(entry, "tagline_en");
  const description = requireField(entry, "description_et");
  const heroImg = requireField(entry, "hero_img");
  const heroGradient = requireField(entry, "hero_gradient");
  const categoryHandle = requireField(entry, "slug");

  return [
    "  {",
    `    name: ${tsString(name)},`,
    `    nameEn: ${tsString(nameEn)},`,
    `    slug: ${tsString(shortSlug)},`,
    `    categoryHandle: ${tsString(categoryHandle)},`,
    `    tagline: ${tsString(taglineEt)},`,
    `    taglineEn: ${tsString(taglineEn)},`,
    `    description: ${tsString(description)},`,
    `    heroImg: ${tsString(heroImg)},`,
    `    heroGradient: ${tsString(heroGradient)},`,
    "  },",
  ].join("\n");
}

function render(doc) {
  const header = [
    "// AUTO-GENERATED — do not edit by hand.",
    "// Source: backend/src/data/taxonomy.yaml",
    "// Regenerate: node scripts/gen-branches.mjs",
    "",
    "export type BranchDef = {",
    "  name: string",
    "  nameEn: string",
    "  slug: string",
    "  categoryHandle: string | null",
    "  tagline: string",
    "  taglineEn: string",
    "  description: string",
    "  heroImg: string",
    "  heroGradient: string",
    "}",
    "",
    "export const BRANCHES: BranchDef[] = [",
  ].join("\n");

  const body = doc.l1.map(renderBranch).join("\n");

  const footer = [
    "]",
    "",
    "export function getBranchBySlug(slug: string) {",
    "  return BRANCHES.find(",
    "    (branch) => branch.slug === slug || branch.categoryHandle === slug,",
    "  )",
    "}",
    "",
  ].join("\n");

  return `${header}\n${body}\n${footer}`;
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes("--stdout")
    ? "stdout"
    : args.includes("--check")
      ? "check"
      : "write";

  const doc = loadTaxonomy();
  const generated = render(doc);

  if (mode === "stdout") {
    process.stdout.write(generated);
    return;
  }

  if (mode === "check") {
    const existing = readFileSync(OUT_PATH, "utf8");
    if (existing !== generated) {
      console.error(
        "DRIFT: storefront/lib/branches.ts differs from gen-branches.mjs output.",
      );
      console.error("Run: node scripts/gen-branches.mjs");
      process.exit(1);
    }
    console.log("OK: branches.ts matches generator output.");
    return;
  }

  writeFileSync(OUT_PATH, generated);
  console.log(`Wrote ${OUT_PATH} (${doc.l1.length} L1 branches).`);
}

main();
