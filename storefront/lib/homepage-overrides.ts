import "server-only"
import { promises as fs } from "node:fs"
import path from "node:path"

export interface HomepageOverridesDoc {
  overrides: Record<string, string[]>
}

function overridesFile(): string {
  // Path is computed lazily so Turbopack does not try to resolve it at build time.
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "homepage-overrides.json")
}

let cached: { mtimeMs: number; data: HomepageOverridesDoc } | null = null

export async function readHomepageOverrides(): Promise<HomepageOverridesDoc> {
  try {
    const file = overridesFile()
    const stat = await fs.stat(file)
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw) as Partial<HomepageOverridesDoc>
    const data: HomepageOverridesDoc = {
      overrides:
        parsed.overrides && typeof parsed.overrides === "object"
          ? parsed.overrides as Record<string, string[]>
          : {},
    }
    cached = { mtimeMs: stat.mtimeMs, data }
    return data
  } catch {
    return { overrides: {} }
  }
}

export async function writeHomepageOverrides(next: HomepageOverridesDoc): Promise<void> {
  const file = overridesFile()
  const payload = {
    _doc:
      "Admin-edited homepage L1 module overrides. Maps L1 handle → ordered list of up to 6 featured handles. Empty / missing key = use default BFS featured.",
    overrides: next.overrides,
  }
  await fs.writeFile(file, JSON.stringify(payload, null, 2) + "\n", "utf8")
  cached = null
}
