import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const dockerfile = fs.readFileSync(path.join(root, "Dockerfile"), "utf8")

const requiredSnippets = [
  "SKIP_MEILISEARCH_STARTUP_INDEXING=true",
  "Skipping product indexing on startup",
  "Skipping category indexing on startup",
  "start-period=300s",
  "retries=5",
]

const failures = requiredSnippets.filter((snippet) => !dockerfile.includes(snippet))

if (failures.length > 0) {
  console.error("Medusa startup indexing guard is incomplete:")
  for (const failure of failures) {
    console.error(`- missing ${failure}`)
  }
  process.exit(1)
}

console.log("Medusa startup indexing guard is present.")
