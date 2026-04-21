#!/usr/bin/env node
/**
 * One-time migration: create cms_page and cms_page_revision tables.
 * Safe to re-run (IF NOT EXISTS).
 *
 * Usage: node scripts/migrate-cms-tables.mjs
 */
import { execSync } from "child_process"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

// Load root .env
try {
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
} catch { /* rely on environment */ }

const SQL = `
CREATE TABLE IF NOT EXISTS cms_page (
  id           TEXT PRIMARY KEY,
  page_key     TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  schema_ver   INTEGER NOT NULL DEFAULT 1,
  content      JSONB NOT NULL DEFAULT '{}',
  updated_at   TIMESTAMPTZ,
  updated_by   TEXT
);
CREATE TABLE IF NOT EXISTS cms_page_revision (
  id           SERIAL PRIMARY KEY,
  page_id      TEXT NOT NULL REFERENCES cms_page(id) ON DELETE CASCADE,
  content      JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   TEXT,
  note         TEXT
);
CREATE INDEX IF NOT EXISTS cms_page_revision_page_id_idx
  ON cms_page_revision (page_id, created_at DESC);
`

const env = {
  ...process.env,
  PGPASSWORD: process.env.PGPASSWORD,
  PGHOST: process.env.PGHOST || "localhost",
  PGPORT: process.env.PGPORT || "5435",
  PGUSER: process.env.PGUSER || "xlmarket",
  PGDATABASE: process.env.PGDATABASE || "xlmarket",
}

execSync(`psql -h ${env.PGHOST} -p ${env.PGPORT} -U ${env.PGUSER} -d ${env.PGDATABASE} -c "${SQL.replace(/\n/g, " ").replace(/"/g, '\\"')}"`, {
  env,
  stdio: "inherit",
})
console.log("✓ cms_page and cms_page_revision tables ready")
