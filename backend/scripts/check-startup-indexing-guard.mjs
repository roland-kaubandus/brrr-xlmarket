import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const repoRoot = path.resolve(root, "..")
const dockerfile = fs.readFileSync(path.join(root, "Dockerfile"), "utf8")
const compose = fs.readFileSync(path.join(repoRoot, "docker-compose.yml"), "utf8")
const vevorJob = fs.readFileSync(path.join(root, "src/jobs/sync-vevor-feed.ts"), "utf8")

const requiredSnippets = [
  "SKIP_MEILISEARCH_STARTUP_INDEXING=true",
  "Skipping product indexing on startup",
  "Skipping category indexing on startup",
  "scripts/index-meilisearch.mjs",
  "src/data/filter-profiles.yaml",
  "start-period=300s",
  "retries=5",
]

const failures = requiredSnippets.filter((snippet) => !dockerfile.includes(snippet))

if (vevorJob.includes('schedule: "0 0 1 1 *"')) {
  failures.push("sync-vevor-feed must not use a yearly placeholder schedule that overflows Node timers")
}

if (!vevorJob.includes('schedule: "0 0 * * *"')) {
  failures.push("sync-vevor-feed no-op job should use the daily placeholder schedule")
}

if (!compose.includes("SKIP_MEILISEARCH_STARTUP_INDEXING: ${SKIP_MEILISEARCH_STARTUP_INDEXING:-true}")) {
  failures.push("docker-compose.yml must pass SKIP_MEILISEARCH_STARTUP_INDEXING=true by default")
}

if (!compose.includes("condition: service_started")) {
  failures.push("storefront should wait for Medusa to start, not for slow Medusa health readiness")
}

if (!compose.includes("http://127.0.0.1:3030/api/health")) {
  failures.push("docker-compose.yml storefront healthcheck must use /api/health")
}

if (failures.length > 0) {
  console.error("Medusa startup indexing guard is incomplete:")
  for (const failure of failures) {
    console.error(`- missing ${failure}`)
  }
  process.exit(1)
}

console.log("Medusa startup indexing guard is present.")
