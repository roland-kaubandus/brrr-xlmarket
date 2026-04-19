#!/usr/bin/env node
/**
 * export-slug-redirects.mjs — dump slug_redirect table to
 * storefront/lib/slug-redirects.generated.json so the edge middleware can
 * serve 301s with a zero-dependency in-memory lookup.
 *
 * Run whenever slug_redirect changes; rebuild + redeploy storefront after.
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "storefront/lib/slug-redirects.generated.json");

const DB_CONFIG = {
  host: "localhost",
  port: 5435,
  user: "xlmarket",
  password: process.env.PGPASSWORD,
  database: "xlmarket",
};

const client = new pg.Client(DB_CONFIG);
await client.connect();

const { rows } = await client.query(
  `SELECT from_slug, to_slug, reason
   FROM slug_redirect
   WHERE expires_at IS NULL OR expires_at > NOW()
   ORDER BY from_slug`,
);
await client.end();

const map = {};
for (const row of rows) {
  map[row.from_slug] = row.to_slug;
}

const payload = {
  generatedAt: new Date().toISOString(),
  count: rows.length,
  redirects: map,
};

writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${rows.length} redirects to ${OUT}`);
