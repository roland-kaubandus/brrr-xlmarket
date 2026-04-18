#!/usr/bin/env node
/**
 * cleanup-legacy-categories.mjs — remove legacy L1s + their empty
 * descendants that are NOT in taxonomy_node_meta (the SSoT list).
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §F2.6
 *
 * What "legacy" means here: a product_category row whose id does NOT
 * appear in taxonomy_node_meta. The 22 v3 L1s + 134 L2s + 20 L3s are all
 * registered there, so everything else is legacy by definition.
 *
 * Actual DB state measured 2026-04-18 (post-F2.5):
 *   - 31 legacy L1 rows (parent IS NULL)
 *   - 3180 legacy descendants, ALL empty (0 products)
 *   - 0 dual-assignments (spec expected 3359 — already resolved)
 *   - 1 legacy-only product (prod_01KNXX7KAB3PBGY5MHSAZ1VPX7, handle
 *     'tool-kit-of-550w-variable-speed-milling-mill-machine-...'),
 *     assigned only to legacy L1 'other'. We reassign it to
 *     'hand-power-tools' before deleting the legacy L1.
 *
 * Default --dry-run; pass --execute to perform deletes.
 */

import pg from "pg";

const DB_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD || "PG_PASSWORD_REDACTED",
  database: "xlmarket",
};

const execute = process.argv.includes("--execute");

// Reassignment plan for products currently assigned only to legacy categories.
// Discovered from F2.6 pre-check query. One product, legacy handle 'other'.
const LEGACY_ONLY_REASSIGN = [
  {
    productId: "prod_01KNXX7KAB3PBGY5MHSAZ1VPX7",
    fromLegacyHandle: "other",
    toV3Handle: "hand-power-tools",
    reason: "milling mill machine -> hand-power-tools (manual pre-delete rescue)",
  },
];

async function main() {
  const client = new pg.Client(DB_CONFIG);
  await client.connect();

  try {
    // =========================================================================
    // PLANNING PHASE — read-only, builds exactly what we will delete/reassign.
    // =========================================================================

    const legacyL1 = (
      await client.query(
        `SELECT pc.id, pc.handle
         FROM product_category pc
         WHERE pc.deleted_at IS NULL
           AND pc.parent_category_id IS NULL
           AND NOT EXISTS (SELECT 1 FROM taxonomy_node_meta WHERE node_id = pc.id)
         ORDER BY pc.handle`,
      )
    ).rows;

    const legacyDescendants = (
      await client.query(
        `SELECT pc.id, pc.handle, pc.parent_category_id
         FROM product_category pc
         WHERE pc.deleted_at IS NULL
           AND pc.parent_category_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM taxonomy_node_meta WHERE node_id = pc.id)
         ORDER BY pc.handle`,
      )
    ).rows;

    // Safety check: descendants with products
    const descWithProducts = (
      await client.query(
        `SELECT pc.id, pc.handle,
                (SELECT count(*) FROM product_category_product pcp
                  WHERE pcp.product_category_id = pc.id) AS prod_count
         FROM product_category pc
         WHERE pc.deleted_at IS NULL
           AND pc.parent_category_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM taxonomy_node_meta WHERE node_id = pc.id)
           AND EXISTS (SELECT 1 FROM product_category_product pcp
                        WHERE pcp.product_category_id = pc.id)
         ORDER BY pc.handle`,
      )
    ).rows;

    // L1s with products (should equal LEGACY_ONLY_REASSIGN mapping or be empty)
    const l1WithProducts = (
      await client.query(
        `SELECT pc.id, pc.handle,
                (SELECT count(*) FROM product_category_product pcp
                  WHERE pcp.product_category_id = pc.id) AS prod_count
         FROM product_category pc
         WHERE pc.deleted_at IS NULL
           AND pc.parent_category_id IS NULL
           AND NOT EXISTS (SELECT 1 FROM taxonomy_node_meta WHERE node_id = pc.id)
           AND EXISTS (SELECT 1 FROM product_category_product pcp
                        WHERE pcp.product_category_id = pc.id)
         ORDER BY pc.handle`,
      )
    ).rows;

    // =========================================================================
    // PRINT PLAN
    // =========================================================================

    console.log("=== PLAN ===");
    console.log(`Legacy L1 to soft-delete:          ${legacyL1.length}`);
    console.log(`Legacy descendants to soft-delete: ${legacyDescendants.length}`);
    console.log(`Descendants with products:         ${descWithProducts.length} (blocker if > 0)`);
    console.log(`L1 with products:                  ${l1WithProducts.length}`);
    console.log(`Manual reassignments:              ${LEGACY_ONLY_REASSIGN.length}`);
    console.log("");

    if (descWithProducts.length > 0) {
      console.error("ABORT: legacy descendants still hold products:");
      for (const r of descWithProducts) {
        console.error(`  ${r.handle} (${r.id}) - ${r.prod_count} products`);
      }
      process.exit(1);
    }

    console.log("Legacy L1 handles:");
    for (const r of legacyL1) console.log(`  ${r.handle}`);
    console.log("");

    if (l1WithProducts.length > 0) {
      console.log("L1 still holding products after reassignment planning:");
      for (const r of l1WithProducts)
        console.log(`  ${r.handle} - ${r.prod_count} products`);
      // Verify every such L1 is covered by LEGACY_ONLY_REASSIGN
      const covered = new Set(LEGACY_ONLY_REASSIGN.map((r) => r.fromLegacyHandle));
      const uncovered = l1WithProducts.filter((r) => !covered.has(r.handle));
      if (uncovered.length > 0) {
        console.error("ABORT: legacy L1 with products but no reassign plan:");
        for (const r of uncovered)
          console.error(`  ${r.handle} - ${r.prod_count} products`);
        process.exit(1);
      }
    }

    console.log("Manual reassignments to perform:");
    for (const r of LEGACY_ONLY_REASSIGN) {
      console.log(
        `  ${r.productId}: ${r.fromLegacyHandle} -> ${r.toV3Handle} (${r.reason})`,
      );
    }
    console.log("");

    if (!execute) {
      console.log("DRY RUN — no changes. Re-run with --execute.");
      return;
    }

    // =========================================================================
    // EXECUTION — single transaction.
    // =========================================================================

    console.log("=== EXECUTING ===");
    await client.query("BEGIN");

    try {
      // 1. Reassign LEGACY_ONLY products to v3 categories.
      for (const r of LEGACY_ONLY_REASSIGN) {
        // Resolve ids
        const legacyRow = await client.query(
          `SELECT id FROM product_category
           WHERE handle = $1 AND deleted_at IS NULL LIMIT 1`,
          [r.fromLegacyHandle],
        );
        const v3Row = await client.query(
          `SELECT id FROM product_category
           WHERE handle = $1 AND deleted_at IS NULL LIMIT 1`,
          [r.toV3Handle],
        );
        if (legacyRow.rows.length === 0 || v3Row.rows.length === 0) {
          throw new Error(
            `Reassign failed: legacy=${r.fromLegacyHandle} or v3=${r.toV3Handle} not found`,
          );
        }
        const legacyId = legacyRow.rows[0].id;
        const v3Id = v3Row.rows[0].id;

        // Add v3 assignment (idempotent via NOT EXISTS guard)
        await client.query(
          `INSERT INTO product_category_product (product_id, product_category_id)
           SELECT $1, $2
           WHERE NOT EXISTS (
             SELECT 1 FROM product_category_product
             WHERE product_id = $1 AND product_category_id = $2
           )`,
          [r.productId, v3Id],
        );

        await client.query(
          `INSERT INTO category_classification_audit
             (product_id, action, before_category_id, after_category_id, reason)
           VALUES ($1, 'product_reassigned', $2, $3, $4)`,
          [r.productId, legacyId, v3Id, r.reason],
        );
        console.log(`  reassigned ${r.productId} -> ${r.toV3Handle}`);
      }

      // 2. Remove any product_category_product rows pointing at legacy categories.
      //    After step 1, every affected product also has a v3 assignment, so this
      //    is safe. (Descendants already have 0 rows per the guard above.)
      const legacyIds = [
        ...legacyL1.map((r) => r.id),
        ...legacyDescendants.map((r) => r.id),
      ];
      const pcpDelete = await client.query(
        `DELETE FROM product_category_product
         WHERE product_category_id = ANY($1::text[])
         RETURNING product_id, product_category_id`,
        [legacyIds],
      );
      for (const row of pcpDelete.rows) {
        await client.query(
          `INSERT INTO category_classification_audit
             (product_id, action, before_category_id, reason)
           VALUES ($1, 'dual_assignment_removed', $2, 'legacy category cleanup')`,
          [row.product_id, row.product_category_id],
        );
      }
      console.log(
        `  removed ${pcpDelete.rows.length} product_category_product rows (legacy side)`,
      );

      // 3. Soft-delete legacy descendants FIRST (FK constraint safety).
      const descDelete = await client.query(
        `UPDATE product_category
         SET deleted_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING id, handle`,
        [legacyDescendants.map((r) => r.id)],
      );
      for (const row of descDelete.rows) {
        await client.query(
          `INSERT INTO category_classification_audit
             (action, before_category_id, reason)
           VALUES ('legacy_shell_deleted', $1, $2)`,
          [row.id, `empty legacy descendant: ${row.handle}`],
        );
      }
      console.log(`  soft-deleted ${descDelete.rows.length} legacy descendants`);

      // 4. Soft-delete legacy L1s.
      const l1Delete = await client.query(
        `UPDATE product_category
         SET deleted_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING id, handle`,
        [legacyL1.map((r) => r.id)],
      );
      for (const row of l1Delete.rows) {
        await client.query(
          `INSERT INTO category_classification_audit
             (action, before_category_id, reason)
           VALUES ('legacy_l1_deleted', $1, $2)`,
          [row.id, `legacy L1: ${row.handle}`],
        );
      }
      console.log(`  soft-deleted ${l1Delete.rows.length} legacy L1s`);

      // 5. Final invariant check: still exactly 22 active L1s
      const finalL1 = await client.query(
        `SELECT count(*) FROM product_category
         WHERE deleted_at IS NULL AND parent_category_id IS NULL`,
      );
      const finalL1Count = parseInt(finalL1.rows[0].count, 10);
      if (finalL1Count !== 22) {
        throw new Error(
          `Post-cleanup invariant failed: expected 22 active L1s, got ${finalL1Count}`,
        );
      }
      console.log(`  final L1 count: ${finalL1Count} (INV-10 OK)`);

      await client.query("COMMIT");
      console.log("COMMIT.");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("ROLLBACK:", e.message);
      throw e;
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
