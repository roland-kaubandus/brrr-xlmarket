#!/usr/bin/env node
/**
 * purge-meili-orphans.mjs — Delete Meili docs whose product_id is no longer in DB.
 * Happens after split-spu-groups.mjs: old parent docs stay in Meili even after
 * Medusa DELETE, until next reindex touches them. This script purges them.
 */
import pg from "pg";

const PG = { host: "localhost", port: 5435, user: "xlmarket", password: "PG_PASSWORD_REDACTED", database: "xlmarket" };
const MEILI = "http://127.0.0.1:7700";
const KEY = "MEILI_LEGACY_KEY_REDACTED";

const pgc = new pg.Client(PG);
await pgc.connect();
const { rows } = await pgc.query(`SELECT id FROM product WHERE deleted_at IS NULL`);
const dbIds = new Set(rows.map((r) => r.id));
console.log("DB active products:", dbIds.size);

const meiliIds = new Set();
let offset = 0;
const limit = 1000;
while (true) {
  const r = await fetch(`${MEILI}/indexes/products/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ q: "", limit, offset, attributesToRetrieve: ["id"] }),
  });
  const j = await r.json();
  if (!j.hits || j.hits.length === 0) break;
  for (const h of j.hits) meiliIds.add(h.id);
  if (j.hits.length < limit) break;
  offset += limit;
}
console.log("Meili docs:", meiliIds.size);

const orphans = [...meiliIds].filter((id) => !dbIds.has(id));
console.log("Orphans:", orphans.length);

if (orphans.length > 0) {
  const r = await fetch(`${MEILI}/indexes/products/documents/delete-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(orphans),
  });
  console.log("Delete task:", r.status, await r.text());
}

await pgc.end();
