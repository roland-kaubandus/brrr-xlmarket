#!/usr/bin/env node
/**
 * export-slug-redirects.mjs — dump slug_redirect (+ product_redirect) tabelid faili
 * storefront/lib/slug-redirects.generated.json, et edge-middleware saaks 301-d serveerida
 * sõltuvuseta in-memory lookup'iga.
 *
 * KAKS DB-režiimi (HARD RULE #5 — üks skript, mõlemad kutsujad):
 *   - pg-klient (vaikimisi): host-pg localhost:5435 + PGPASSWORD (vana VPS / feed-sync.sh).
 *   - --via-docker <konteiner> (k33g deploy): `docker exec <konteiner> psql` — PAROOLI-VABA
 *     (k33g hostil pole PGPASSWORD-i). coolify-deploy.sh kasutab seda regen-sammus.
 *
 * Jookseb AUTOMAATSELT deploy'l (coolify-deploy.sh), MITTE käsitsi. Rebuild+redeploy võtab muudatuse.
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "storefront/lib/slug-redirects.generated.json");

const argv = process.argv.slice(2);
const dockerIdx = argv.indexOf("--via-docker");
const DOCKER_CONTAINER = dockerIdx !== -1 ? argv[dockerIdx + 1] : null;

const CAT_SQL =
  "SELECT from_slug, to_slug FROM slug_redirect WHERE expires_at IS NULL OR expires_at > NOW() ORDER BY from_slug";
const PROD_SQL = "SELECT from_handle, to_category_handle FROM product_redirect ORDER BY from_handle";

// ── DB-režiim: docker exec psql (parooli-vaba) ──
function queryViaDocker(sql) {
  const out = execFileSync(
    "docker",
    ["exec", DOCKER_CONTAINER, "psql", "-U", "xlmarket", "-d", "xlmarket", "-tA", "-F", "\t", "-c", sql],
    { encoding: "utf8" },
  );
  return out.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("\t"));
}

async function fetchAll() {
  if (DOCKER_CONTAINER) {
    const catRows = queryViaDocker(CAT_SQL).map(([from_slug, to_slug]) => ({ from_slug, to_slug }));
    let prodRows = [];
    try {
      prodRows = queryViaDocker(PROD_SQL).map(([from_handle, to_category_handle]) => ({ from_handle, to_category_handle }));
    } catch (err) {
      if (/relation .*product_redirect.* does not exist|42P01/.test(String(err.stderr || err.message))) {
        console.warn("product_redirect tabel puudub → productRedirects tühi.");
      } else throw err;
    }
    return { catRows, prodRows };
  }

  // pg-klient (PGPASSWORD)
  const pg = (await import("pg")).default;
  const client = new pg.Client({
    host: "localhost",
    port: 5435,
    user: "xlmarket",
    password: process.env.PGPASSWORD,
    database: "xlmarket",
  });
  await client.connect();
  try {
    const { rows: catRows } = await client.query(CAT_SQL);
    let prodRows = [];
    try {
      const res = await client.query(PROD_SQL);
      prodRows = res.rows;
    } catch (err) {
      if (err.code === "42P01") {
        console.warn("product_redirect tabel puudub (migratsioon 003 pole jooksnud) → productRedirects tühi.");
      } else throw err;
    }
    return { catRows, prodRows };
  } finally {
    await client.end();
  }
}

const { catRows, prodRows } = await fetchAll();

const map = {};
for (const row of catRows) map[row.from_slug] = row.to_slug;
const productMap = {};
for (const row of prodRows) productMap[row.from_handle] = row.to_category_handle;

const payload = {
  generatedAt: new Date().toISOString(),
  count: catRows.length,
  productCount: prodRows.length,
  redirects: map,
  productRedirects: productMap,
};

writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
console.log(`Wrote ${catRows.length} category + ${prodRows.length} product redirects to ${OUT}`);
