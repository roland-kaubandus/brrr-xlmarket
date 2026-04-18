#!/usr/bin/env node
/**
 * reassign-3d-printers.mjs — move every product whose vevor_product_type
 * string now resolves to `laser-cnc-digital-fabrication` but that is
 * currently only linked to `printing-packaging-signage`.
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §F2.7
 *
 * We do not call the full migrate-categories-to-v3 script because that
 * legacy script REPLACES product.categories with a single L1, destroying
 * any L2/L3 assignments set up elsewhere. This script only touches
 * product_category_product rows pointing at printing-packaging-signage
 * for products whose resolver now returns laser-cnc-digital-fabrication.
 *
 * Default --dry-run; pass --execute to write.
 */

import pg from "pg";
import { loadV3Map, resolveV3Slug } from "../backend/src/scripts/resolve-v3-category.mjs";

const DB_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD || "xlmarket_pg_2026_secure",
  database: "xlmarket",
};

const execute = process.argv.includes("--execute");

async function main() {
  const map = loadV3Map();
  const client = new pg.Client(DB_CONFIG);
  await client.connect();

  try {
    const printingL1 = (
      await client.query(
        `SELECT id FROM product_category
         WHERE handle = 'printing-packaging-signage' AND deleted_at IS NULL
         LIMIT 1`,
      )
    ).rows[0];
    const laserCncL1 = (
      await client.query(
        `SELECT id FROM product_category
         WHERE handle = 'laser-cnc-digital-fabrication' AND deleted_at IS NULL
         LIMIT 1`,
      )
    ).rows[0];
    if (!printingL1 || !laserCncL1) {
      throw new Error("L1 categories missing from DB");
    }

    // Find every product linked to printing-packaging-signage whose
    // vevor_product_type now resolves to laser-cnc-digital-fabrication.
    const candidates = (
      await client.query(
        `SELECT p.id, p.handle, p.metadata->>'vevor_product_type' AS vevor_type
         FROM product p
         JOIN product_category_product pcp ON pcp.product_id = p.id
         WHERE pcp.product_category_id = $1
           AND p.deleted_at IS NULL
           AND p.metadata ? 'vevor_product_type'`,
        [printingL1.id],
      )
    ).rows;

    const toMove = [];
    for (const row of candidates) {
      const slug = resolveV3Slug(row.vevor_type, map);
      if (slug === "laser-cnc-digital-fabrication") {
        toMove.push({
          id: row.id,
          handle: row.handle,
          vevorType: row.vevor_type,
        });
      }
    }

    console.log(`Printing-packaging-signage products: ${candidates.length}`);
    console.log(`Would move to laser-cnc-digital-fabrication: ${toMove.length}`);

    if (toMove.length > 0) {
      console.log("\nSample (first 10):");
      for (const p of toMove.slice(0, 10)) {
        console.log(`  ${p.handle}  [${p.vevorType}]`);
      }
    }

    if (!execute) {
      console.log("\nDRY RUN — re-run with --execute.");
      return;
    }

    await client.query("BEGIN");
    try {
      let added = 0;
      let removed = 0;
      for (const p of toMove) {
        // Add link to laser-cnc-digital-fabrication (idempotent)
        const addRes = await client.query(
          `INSERT INTO product_category_product (product_id, product_category_id)
           SELECT $1, $2
           WHERE NOT EXISTS (
             SELECT 1 FROM product_category_product
             WHERE product_id = $1 AND product_category_id = $2
           )
           RETURNING product_id`,
          [p.id, laserCncL1.id],
        );
        if (addRes.rows.length > 0) added++;

        // Remove link from printing-packaging-signage
        const delRes = await client.query(
          `DELETE FROM product_category_product
           WHERE product_id = $1 AND product_category_id = $2
           RETURNING product_id`,
          [p.id, printingL1.id],
        );
        if (delRes.rows.length > 0) removed++;

        await client.query(
          `INSERT INTO category_classification_audit
             (product_id, action, before_category_id, after_category_id, reason)
           VALUES ($1, 'product_reassigned', $2, $3, $4)`,
          [
            p.id,
            printingL1.id,
            laserCncL1.id,
            `F2.7 3D printer fix: VEVOR type "${p.vevorType}" -> laser-cnc`,
          ],
        );
      }
      await client.query("COMMIT");
      console.log(`\nLinks added: ${added}, removed: ${removed}`);

      // Final counts
      const finalPrint = await client.query(
        `SELECT count(DISTINCT product_id) AS n FROM product_category_product WHERE product_category_id = $1`,
        [printingL1.id],
      );
      const finalLaser = await client.query(
        `SELECT count(DISTINCT product_id) AS n FROM product_category_product WHERE product_category_id = $1`,
        [laserCncL1.id],
      );
      console.log(
        `printing-packaging-signage: ${finalPrint.rows[0].n}, laser-cnc-digital-fabrication: ${finalLaser.rows[0].n}`,
      );
    } catch (e) {
      await client.query("ROLLBACK");
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
