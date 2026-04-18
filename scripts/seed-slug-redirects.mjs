#!/usr/bin/env node
/**
 * seed-slug-redirects.mjs — seed slug_redirect table from the
 * CATEGORY_V3_REDIRECTS map that used to live in storefront/next.config.ts.
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §7.1, F2.4.
 *
 * Default --dry-run; pass --execute to write.
 *
 * The table is the new SSoT for redirects — middleware.ts reads it (via
 * Redis cache) and emits 301s. next.config.ts redirect block is removed
 * in the same commit.
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

// Frozen copy of CATEGORY_V3_REDIRECTS from storefront/next.config.ts
// (commit before this script existed). All legacy handles that need to
// 301 to a v3 L1 slug. Reason='legacy' for the pre-v3 rename, 'rename'
// was the historical category; keeping single bucket is fine.
const REDIRECTS = [
  // English legacy handles
  ["appliances", "horeca-food-service"],
  ["automotive", "automotive-workshop"],
  ["bath", "plumbing-water-systems"],
  ["building-materials", "construction-building"],
  ["cleaning", "cleaning-janitorial"],
  ["doors-windows", "construction-building"],
  ["electrical", "electrical-energy"],
  ["flooring", "construction-building"],
  ["furniture", "office-commercial-interiors"],
  ["hardware", "hand-power-tools"],
  ["health-and-wellness", "health-medical-supply"],
  ["heating-venting-cooling", "hvac-climate-control"],
  ["holiday-decorations", "office-commercial-interiors"],
  ["home-decor", "office-commercial-interiors"],
  ["industrial-scientific", "hand-power-tools"],
  ["kitchen", "horeca-food-service"],
  ["lighting", "electrical-energy"],
  ["lumber-composites", "construction-building"],
  ["musical-instruments", "music-entertainment"],
  ["outdoors", "outdoor-power-landscaping"],
  ["paint", "construction-building"],
  // NB: playground-sets intentionally NOT here — it is a v3 subSlug now.
  ["plumbing", "plumbing-water-systems"],
  ["safety-equipment", "safety-security-workwear"],
  ["smart-home", "electrical-energy"],
  ["sports-outdoors", "fitness-sports-recreation"],
  ["storage-organization", "warehousing-material-handling"],
  ["tools", "hand-power-tools"],
  ["window-treatments", "office-commercial-interiors"],
  ["workwear", "safety-security-workwear"],
  // Legacy L1 handles deleted in F2.6 cleanup (2026-04-18).
  ["other", "hand-power-tools"],
  ["playground-sets", "fitness-sports-recreation"],
  // Estonian legacy handles (pre-English rename)
  ["elektroonika", "electrical-energy"],
  ["kodu-ja-aed", "outdoor-power-landscaping"],
  ["kunst-ja-kasitoo", "printing-packaging-signage"],
  ["toitlustus-ja-kook", "horeca-food-service"],
  ["ehitus-ja-remont", "construction-building"],
  ["auto-ja-garaaz", "automotive-workshop"],
  ["toostus-ja-seadmed", "hand-power-tools"],
  ["kontor-ja-ladustamine", "office-commercial-interiors"],
  ["sport-ja-vaba-aeg", "fitness-sports-recreation"],
  ["lemmikloomad", "health-medical-supply"],
  ["meditsiin-ja-tervishoid", "health-medical-supply"],
];

async function run() {
  console.log(`Plan: upsert ${REDIRECTS.length} redirects into slug_redirect.`);

  // Sanity: duplicate from_slug?
  const seen = new Set();
  for (const [from] of REDIRECTS) {
    if (seen.has(from)) throw new Error(`Duplicate from_slug: ${from}`);
    seen.add(from);
  }

  // Sanity: no from_slug == to_slug
  for (const [from, to] of REDIRECTS) {
    if (from === to) throw new Error(`Self-redirect: ${from}`);
  }

  if (!execute) {
    console.log(`\nFirst 5 entries:`);
    for (const [from, to] of REDIRECTS.slice(0, 5)) {
      console.log(`  ${from}  ->  ${to}`);
    }
    console.log(`\nDRY RUN — re-run with --execute.`);
    return;
  }

  const client = new pg.Client(DB_CONFIG);
  await client.connect();
  try {
    await client.query("BEGIN");
    let n = 0;
    for (const [from, to] of REDIRECTS) {
      await client.query(
        `INSERT INTO slug_redirect (from_slug, to_slug, reason)
         VALUES ($1, $2, 'legacy')
         ON CONFLICT (from_slug) DO UPDATE SET
           to_slug = EXCLUDED.to_slug,
           reason = EXCLUDED.reason`,
        [from, to],
      );
      n++;
    }
    await client.query("COMMIT");
    console.log(`Upserted ${n} redirects.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
