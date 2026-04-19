#!/usr/bin/env node
/**
 * seed-taxonomy-from-yaml.mjs — seed product_category + taxonomy_node_meta +
 * taxonomy_node_translation from backend/src/data/taxonomy.yaml (SSoT).
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §F2.3.
 *
 * Default mode is --dry-run (prints a plan, touches nothing).
 * Pass --execute to write to DB.
 *
 * What this script does:
 *   - For every L1/L2/L3 in taxonomy.yaml:
 *       * If a product_category row with matching `handle` exists, reuse its id
 *         and reparent it under the YAML parent (if needed).
 *       * If it does not exist, INSERT product_category with a fresh ULID id
 *         and computed mpath (parent.mpath + '.' + id, or self-id at L1).
 *     Then UPSERT taxonomy_node_meta (level, class, show_in_mega_menu, status)
 *     and taxonomy_node_translation (et, en).
 *   - Legacy rows outside the YAML tree are left alone — F2.6 cleanup handles
 *     the 31 tripled L1s, 382 empty shells, and dual-assignments.
 *
 * Prereqs:
 *   - scripts/migrations/001-taxonomy-node-meta.sql has been applied.
 *   - scripts/node_modules has pg + js-yaml.
 *   - backend/node_modules has ulid.
 *
 * DB creds (from memory project_next_session_faas2.md line 37):
 *   - user xlmarket / pass via PGPASSWORD env / db xlmarket
 *   - localhost:5435 (Docker exposed port)
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import pg from "pg";
import yaml from "js-yaml";

const require = createRequire(import.meta.url);
const ulidMod = require("/home/brrr/brrr-xlmarket/backend/node_modules/ulid");
const { ulid } = ulidMod;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const YAML_PATH = resolve(ROOT, "backend/src/data/taxonomy.yaml");

const DB_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD,
  database: "xlmarket",
};

const execute = process.argv.includes("--execute");
const verbose = process.argv.includes("--verbose");

function log(...args) {
  console.log(...args);
}
function vlog(...args) {
  if (verbose) console.log(...args);
}

/**
 * Flatten YAML tree into an ordered array of nodes:
 *   [ { level, slug, name_et, name_en, parent_slug, class, show_in_mega_menu, research_priority, meili_query }, ... ]
 * Order is L1 -> L2 -> L3, parents before children. This is the seed order.
 */
function flattenTaxonomy(doc) {
  const out = [];
  for (const l1 of doc.l1) {
    out.push({
      level: 1,
      slug: l1.slug,
      name_et: l1.name_et,
      name_en: l1.name_en,
      parent_slug: null,
      class: l1.class || null,
      show_in_mega_menu: l1.show_in_mega_menu !== false,
      research_priority: l1.research_priority ?? null,
      meili_query: l1.meili_query ?? null,
    });

    if (!l1.subs) continue;
    for (const l2 of l1.subs) {
      out.push({
        level: 2,
        slug: l2.slug,
        name_et: l2.name_et ?? l2.slug,
        name_en: l2.name_en ?? l2.slug,
        parent_slug: l1.slug,
        class: null,
        show_in_mega_menu: true,
        research_priority: null,
        meili_query: null,
      });

      if (!l2.subs || !Array.isArray(l2.subs)) continue;
      for (const l3 of l2.subs) {
        // L3 entries are either strings (shorthand) or objects with .slug
        const slug = typeof l3 === "string" ? l3 : l3.slug;
        const name_et = typeof l3 === "string" ? slug : (l3.name_et ?? slug);
        const name_en = typeof l3 === "string" ? slug : (l3.name_en ?? slug);
        out.push({
          level: 3,
          slug,
          name_et,
          name_en,
          parent_slug: l2.slug,
          class: null,
          show_in_mega_menu: true,
          research_priority: null,
          meili_query: null,
        });
      }
    }
  }
  return out;
}

function newPcatId() {
  return `pcat_${ulid()}`;
}

/** Strip a handle of any accidental leading slash / whitespace. */
function normSlug(s) {
  return String(s).trim().replace(/^\/+/, "").toLowerCase();
}

async function loadExistingByHandle(client) {
  const res = await client.query(
    `SELECT id, handle, parent_category_id, mpath
     FROM product_category
     WHERE deleted_at IS NULL`,
  );
  // handle is NOT globally unique across the broken DB state (dupes exist).
  // Keep the FIRST row for each handle and stash collisions for the report.
  const primary = new Map();
  const collisions = new Map();
  for (const row of res.rows) {
    const key = normSlug(row.handle);
    if (!primary.has(key)) {
      primary.set(key, row);
    } else {
      if (!collisions.has(key)) collisions.set(key, [primary.get(key)]);
      collisions.get(key).push(row);
    }
  }
  return { primary, collisions };
}

async function run() {
  const doc = yaml.load(readFileSync(YAML_PATH, "utf8"));
  const nodes = flattenTaxonomy(doc);
  log(
    `Loaded ${nodes.length} nodes from YAML ` +
      `(L1=${nodes.filter((n) => n.level === 1).length}, ` +
      `L2=${nodes.filter((n) => n.level === 2).length}, ` +
      `L3=${nodes.filter((n) => n.level === 3).length}).`,
  );

  const client = new pg.Client(DB_CONFIG);
  await client.connect();

  try {
    const { primary: existing, collisions } = await loadExistingByHandle(client);
    log(
      `DB has ${existing.size} unique-handle rows ` +
        `(+ ${collisions.size} duplicate handles — legacy cleanup target).`,
    );

    // Plan each node
    const plan = {
      create: [],
      reuse: [],
      reparent: [],
    };

    // slug -> id (resolved or to-be). Filled as we walk parents-first.
    const slugToId = new Map();

    for (const node of nodes) {
      const row = existing.get(normSlug(node.slug));
      let id;
      let mpath;

      if (row) {
        id = row.id;
        plan.reuse.push({ node, id });
        if (node.parent_slug) {
          const parentId = slugToId.get(node.parent_slug);
          if (!parentId) {
            throw new Error(
              `Planner: missing parent id for ${node.slug} -> ${node.parent_slug}. ` +
                `Parent must appear earlier in YAML.`,
            );
          }
          if (row.parent_category_id !== parentId) {
            plan.reparent.push({
              id,
              slug: node.slug,
              from: row.parent_category_id,
              to: parentId,
            });
          }
        }
      } else {
        id = newPcatId();
        plan.create.push({ node, id });
      }

      // Compute mpath
      if (node.parent_slug) {
        const parentRow = existing.get(normSlug(node.parent_slug));
        const parentMpath = slugToMpath.get(node.parent_slug);
        if (!parentMpath) {
          throw new Error(
            `Planner: missing parent mpath for ${node.slug} -> ${node.parent_slug}.`,
          );
        }
        mpath = `${parentMpath}.${id}`;
      } else {
        mpath = id;
      }

      slugToId.set(node.slug, id);
      slugToMpath.set(node.slug, mpath);
    }

    log("");
    log("=== PLAN ===");
    log(`CREATE new product_category rows:   ${plan.create.length}`);
    log(`REUSE existing rows (by handle):    ${plan.reuse.length}`);
    log(`REPARENT existing rows:             ${plan.reparent.length}`);
    log(`DUPLICATE-handle rows (F2.6 target): ${collisions.size}`);
    log("");

    if (verbose || plan.create.length > 0) {
      log("Sample CREATEs (first 10):");
      for (const p of plan.create.slice(0, 10)) {
        log(
          `  L${p.node.level} ${p.node.slug}  id=${p.id}  parent=${p.node.parent_slug ?? "<root>"}`,
        );
      }
      if (plan.create.length > 10) log(`  ... +${plan.create.length - 10} more`);
    }

    if (plan.reparent.length > 0) {
      log("");
      log("REPARENTs (first 10):");
      for (const r of plan.reparent.slice(0, 10)) {
        log(`  ${r.slug}: ${r.from ?? "<root>"} -> ${r.to}`);
      }
      if (plan.reparent.length > 10)
        log(`  ... +${plan.reparent.length - 10} more`);
    }

    if (!execute) {
      log("");
      log("DRY RUN — no DB changes. Re-run with --execute to apply.");
      await client.end();
      return;
    }

    // ===== EXECUTION =====
    log("");
    log("=== EXECUTING ===");
    await client.query("BEGIN");

    let created = 0;
    let reparented = 0;
    let metaUpserts = 0;
    let translationUpserts = 0;

    try {
      // 1. CREATE new product_category rows (parents-first order preserved)
      for (const p of plan.create) {
        const mpath = computeMpathForExec(p.node, slugToId, execState);
        const parentId = p.node.parent_slug
          ? slugToId.get(p.node.parent_slug)
          : null;
        await client.query(
          `INSERT INTO product_category
             (id, name, description, handle, mpath, is_active, is_internal, rank, parent_category_id, metadata)
           VALUES ($1, $2, '', $3, $4, TRUE, FALSE, 0, $5, '{}'::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [p.id, p.node.name_et, p.node.slug, mpath, parentId],
        );
        created++;
      }

      // 2. REPARENT existing rows
      for (const r of plan.reparent) {
        const node = nodes.find((n) => n.slug === r.slug);
        const newMpath = computeMpathForExec(node, slugToId, execState);
        await client.query(
          `UPDATE product_category
             SET parent_category_id = $2, mpath = $3, updated_at = NOW()
           WHERE id = $1`,
          [r.id, r.to, newMpath],
        );
        reparented++;
      }

      // 3. UPSERT taxonomy_node_meta + translations for every node
      for (const node of nodes) {
        const id = slugToId.get(node.slug);
        await client.query(
          `INSERT INTO taxonomy_node_meta
             (node_id, level, class, source, show_in_mega_menu, research_priority, meili_query, status)
           VALUES ($1, $2, $3, 'ssot', $4, $5, $6, 'active')
           ON CONFLICT (node_id) DO UPDATE SET
             level = EXCLUDED.level,
             class = EXCLUDED.class,
             source = 'ssot',
             show_in_mega_menu = EXCLUDED.show_in_mega_menu,
             research_priority = EXCLUDED.research_priority,
             meili_query = EXCLUDED.meili_query,
             status = EXCLUDED.status,
             updated_at = NOW()`,
          [
            id,
            node.level,
            node.class,
            node.show_in_mega_menu,
            node.research_priority,
            node.meili_query,
          ],
        );
        metaUpserts++;

        for (const [locale, name] of [
          ["et", node.name_et],
          ["en", node.name_en],
        ]) {
          await client.query(
            `INSERT INTO taxonomy_node_translation (node_id, locale, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (node_id, locale) DO UPDATE SET
               name = EXCLUDED.name, updated_at = NOW()`,
            [id, locale, name],
          );
          translationUpserts++;
        }
      }

      await client.query("COMMIT");
      log(`CREATE: ${created}`);
      log(`REPARENT: ${reparented}`);
      log(`META upserts: ${metaUpserts}`);
      log(`TRANSLATION upserts: ${translationUpserts}`);
      log("COMMIT.");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  } finally {
    await client.end();
  }
}

// Helpers that close over runtime maps (populated during planning)
const slugToMpath = new Map();
const execState = { slugToMpath };

function computeMpathForExec(node, slugToId, _state) {
  if (!node.parent_slug) {
    return slugToId.get(node.slug);
  }
  const parentMpath = slugToMpath.get(node.parent_slug);
  if (!parentMpath) {
    throw new Error(
      `computeMpathForExec: missing parent mpath for ${node.slug}`,
    );
  }
  return `${parentMpath}.${slugToId.get(node.slug)}`;
}

run().catch((e) => {
  console.error("FATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
