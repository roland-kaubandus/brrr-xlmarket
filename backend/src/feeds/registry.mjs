/**
 * registry.mjs — laeb feeds.yaml registri.
 * Vt backend/src/data/feeds.yaml + backend/src/feeds/README.md
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import yaml from "js-yaml"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
const FEEDS_PATH = resolve(ROOT, "backend/src/data/feeds.yaml")

export function loadFeedsConfig() {
  const doc = yaml.load(readFileSync(FEEDS_PATH, "utf8"))
  if (!doc || !Array.isArray(doc.feeds)) {
    throw new Error("feeds.yaml: puudub või vigane `feeds`")
  }
  const defaults = doc.defaults || {}
  // Rakenda defaultid igale feedile (feed võib üle kirjutada)
  const feeds = doc.feeds.map((f) => ({
    markup: defaults.markup,
    currency: defaults.currency,
    status_on_import: defaults.status_on_import,
    ...f,
  }))
  return { version: doc.version, defaults, feeds }
}

export function getEnabledFeeds() {
  return loadFeedsConfig().feeds.filter((f) => f.enabled)
}

/** Lae adapter dünaamiliselt feed.adapter nime järgi. */
export async function loadAdapter(feed) {
  const mod = await import(`./adapters/${feed.adapter}.mjs`)
  if (typeof mod.parse !== "function") {
    throw new Error(`adapter '${feed.adapter}': puudub export parse()`)
  }
  return mod
}
