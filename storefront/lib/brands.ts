/**
 * brands.ts — esilehe brändi-carousel'i config'i lugeja (server-only).
 *
 * Allikas: storefront/cms/brands.yaml (SSoT). Loetakse runtime'is, mtime-cache
 * (nagu lib/homepage-overrides.ts). Brändi lisamine/peitmine = YAML muudatus,
 * koodi ei pea puutuma. Jõustub järgmisel redeploy'l.
 */
import "server-only"
import { promises as fs } from "node:fs"
import path from "node:path"
import { parse as parseYaml } from "yaml"

export interface Brand {
  name: string
  slug: string
  logo: string
  /** Otsingu filter-token, nt "brand:vevor". Link: /{locale}/otsing?filters=<filter> */
  filter: string
  enabled: boolean
  order: number
}

function brandsFile(): string {
  // Lazy path — Turbopack ei prooviks build-ajal resolvida.
  return path.join(/* turbopackIgnore: true */ process.cwd(), "cms", "brands.yaml")
}

let cached: { mtimeMs: number; data: Brand[] } | null = null

function normalize(raw: unknown): Brand[] {
  const doc = raw as { brands?: unknown }
  const list = Array.isArray(doc?.brands) ? doc.brands : []
  const out: Brand[] = []
  for (const item of list) {
    const b = item as Record<string, unknown>
    const name = typeof b.name === "string" ? b.name.trim() : ""
    const slug = typeof b.slug === "string" ? b.slug.trim() : ""
    const logo = typeof b.logo === "string" ? b.logo.trim() : ""
    if (!name || !slug || !logo) continue
    if (b.enabled === false) continue
    out.push({
      name,
      slug,
      logo,
      filter: typeof b.filter === "string" ? b.filter.trim() : "",
      enabled: true,
      order: typeof b.order === "number" ? b.order : 999,
    })
  }
  out.sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name))
  return out
}

/** Loe lubatud brändid (enabled), järjestatud order'i järgi. Viga / puuduv fail → []. */
export async function getBrands(): Promise<Brand[]> {
  try {
    const file = brandsFile()
    const stat = await fs.stat(file)
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data
    const raw = await fs.readFile(file, "utf8")
    const data = normalize(parseYaml(raw))
    cached = { mtimeMs: stat.mtimeMs, data }
    return data
  } catch {
    return []
  }
}
