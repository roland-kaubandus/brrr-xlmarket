import { NextRequest, NextResponse } from "next/server"
import { searchProducts } from "@/lib/meilisearch"
import { execFileSync } from "child_process"
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

function isIntentQuery(q: string): boolean {
  const words = q.trim().split(/\s+/)
  if (words.length < 3) return false
  const signals = [
    "vaja", "vajan", "tahan", "soovin", "otsin", "sobib", "soovita",
    "need", "want", "looking", "find", "recommend", "project", "setup",
    "millega", "kuidas", "mis", "kus", "mida", "organiseerida", "seadistada",
    "ehitada", "parandada", "remontida", "sisustada",
  ]
  return signals.some((s) => q.toLowerCase().includes(s)) || words.length >= 5
}

type DecomposedIntent = {
  keywords: string[]
  filters: string[]
  explanation: string
}

async function decomposeIntent(query: string): Promise<DecomposedIntent> {
  const systemPrompt = [
    "Sa oled e-poe otsinguassistent. Kasutaja kirjeldab vajadust loomulikus keeles.",
    "E-pood muueb VEVOR braendi tooteid: tooriistad, seadmed, kodukaup, garaaz, kook, sport.",
    "Kategooriad: Ehitus ja remont, Toostus ja seadmed, Kodu ja aed, Auto ja garaaz,",
    "Sport ja vaba aeg, Toitlustus ja kook, Elektroonika, Kontor ja ladustamine,",
    "Kunst ja kasitoo, Meditsiin ja tervishoid, Lemmikloomad",
    "",
    "Kasutaja paring: " + query,
    "",
    "Vasta AINULT kehtiva JSON objektiga:",
    '{"keywords":["sona1","sona2"],"filters":[],"explanation":"Selgitus"}',
    "keywords: 3-6 otsingusona (eesti JA inglise keeles), mis leiaksid sobivaid tooteid",
    "explanation: 1 lause kasutajale",
  ].join("\n")

  const tmpIn = join(tmpdir(), "xlm-ai-" + Date.now() + ".txt")
  const tmpOut = join(tmpdir(), "xlm-ai-out-" + Date.now() + ".txt")

  try {
    writeFileSync(tmpIn, systemPrompt)
    execFileSync("claude", [
      "--dangerously-skip-permissions",
      "-p",
      "Loe fail " + tmpIn + " ja kirjuta vastus (ainult JSON objekt) faili " + tmpOut,
      "--max-turns",
      "3",
    ], {
      timeout: 30000,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: "/home/brrr",
    })

    if (!existsSync(tmpOut)) throw new Error("No output file")
    const raw = readFileSync(tmpOut, "utf8")
    const match = raw.match(/\{[\s\S]*?\}/)
    if (!match) throw new Error("No JSON found in output")
    return JSON.parse(match[0])
  } catch {
    // Fallback: split query into keywords
    return {
      keywords: query.split(/\s+/).filter((w) => w.length > 2),
      filters: [],
      explanation: "",
    }
  } finally {
    try { unlinkSync(tmpIn) } catch {}
    try { unlinkSync(tmpOut) } catch {}
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const q = params.get("q") || ""
  const limit = Math.min(parseInt(params.get("limit") || "12"), 50)

  if (!q.trim()) {
    return NextResponse.json({ hits: [], totalHits: 0, query: "", isIntent: false })
  }

  const intent = isIntentQuery(q)

  if (!intent) {
    // Short keyword query — use regular MeiliSearch
    const result = await searchProducts({ q, limit })
    return NextResponse.json({
      hits: result.hits.map((h) => ({
        id: h.id,
        title: h.title,
        handle: h.handle,
        thumbnail: h.thumbnail,
        price: h.price,
        categories: h.categories,
      })),
      totalHits: result.totalHits || result.estimatedTotalHits || 0,
      query: q,
      isIntent: false,
      processingTimeMs: result.processingTimeMs,
    })
  }

  // Intent query: LLM decomposes, then multi-query MeiliSearch
  const decomposed = await decomposeIntent(q)

  // Run multiple searches with decomposed keywords (parallel)
  const searches = await Promise.all(
    decomposed.keywords.map((kw) =>
      searchProducts({
        q: kw,
        limit: Math.ceil(limit * 1.5),
        filter: decomposed.filters.length ? decomposed.filters : undefined,
      }).catch(() => ({
        hits: [] as any[],
        totalHits: 0,
        estimatedTotalHits: 0,
        query: kw,
        processingTimeMs: 0,
      }))
    )
  )

  // Deduplicate and rank — products appearing in multiple searches rank higher
  const scoreMap = new Map<string, { hit: any; score: number }>()
  for (const search of searches) {
    for (const [i, hit] of (search.hits || []).entries()) {
      const existing = scoreMap.get(hit.id)
      const positionScore = 1 / (i + 1)
      if (existing) {
        existing.score += positionScore
      } else {
        scoreMap.set(hit.id, { hit, score: positionScore })
      }
    }
  }

  const ranked = Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hit }) => ({
      id: hit.id,
      title: hit.title,
      handle: hit.handle,
      thumbnail: hit.thumbnail,
      price: hit.price,
      categories: hit.categories,
    }))

  return NextResponse.json({
    hits: ranked,
    totalHits: ranked.length,
    query: q,
    isIntent: true,
    keywords: decomposed.keywords,
    explanation: decomposed.explanation,
  })
}
