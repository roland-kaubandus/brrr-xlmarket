import { NextRequest, NextResponse } from "next/server"

const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700"
const MEILI_KEY = process.env.MEILISEARCH_KEY || "MEILI_LEGACY_KEY_REDACTED"
const INDEX = "products"

const branchMap: Record<string, string> = {
  "suurköök": "suurkoogiseadmed",
  "suurkook": "suurkoogiseadmed",
  "köök": "suurkoogiseadmed",
  "kook": "suurkoogiseadmed",
  "mere": "merevarustus",
  "meri": "merevarustus",
  "ehitus": "ehitus-ja-remont",
  "remont": "ehitus-ja-remont",
  "garaaz": "garaaz-ja-auto",
  "garaaž": "garaaz-ja-auto",
  "auto": "garaaz-ja-auto",
  "aed": "aed-ja-maastik",
  "maastik": "aed-ja-maastik",
  "sport": "spordiklubi",
  "spordiklubi": "spordiklubi",
  "tööstus": "toostus",
  "toostus": "toostus",
  "tervis": "tervis",
  "kontor": "kontor",
  "puhastus": "puhastus",
  "käsitöö": "kasitoo",
  "kasitoo": "kasitoo",
  "toitlustus": "toitlustus",
}

function detectNavigation(query: string): { action: string; to: string } | null {
  const q = query.toLowerCase().trim()

  if (/^(mine\s+)?avaleht(ele)?$/.test(q) || q === "/") {
    return { action: "navigate", to: "/" }
  }

  if (/^(mine\s+)?(kategooria|kategooriad)(tesse)?$/.test(q)) {
    return { action: "navigate", to: "/kategooriad" }
  }

  const showMatch = q.match(/^(näita|mine|ava|vaata)\s+(.+)$/)
  if (showMatch) {
    const term = showMatch[2].replace(/seadm.*$/, "").trim()
    for (const [key, slug] of Object.entries(branchMap)) {
      if (term.includes(key)) {
        return { action: "navigate", to: "/haru/" + slug }
      }
    }
  }

  for (const [key, slug] of Object.entries(branchMap)) {
    if (q === key) {
      return { action: "navigate", to: "/haru/" + slug }
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, filters } = body as { query: string; filters?: { sort?: string } }

    if (!query || !query.trim()) {
      return NextResponse.json({ hits: [], totalHits: 0 })
    }

    const nav = detectNavigation(query)
    if (nav) {
      return NextResponse.json(nav)
    }

    const sortRules: string[] = []
    if (filters?.sort === "price_asc") sortRules.push("price:asc")
    else if (filters?.sort === "price_desc") sortRules.push("price:desc")

    const meiliBody: Record<string, unknown> = {
      q: query.trim(),
      limit: 6,
      attributesToRetrieve: ["id", "title", "handle", "thumbnail", "price"],
    }
    if (sortRules.length) meiliBody.sort = sortRules

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    let res: Response
    try {
      res = await fetch(MEILI_HOST + "/indexes/" + INDEX + "/search", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + MEILI_KEY,
        },
        body: JSON.stringify(meiliBody),
      })
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      console.error("MeiliSearch error", res.status, await res.text())
      return NextResponse.json(
        { hits: [], totalHits: 0, error: "Search failed" },
        { status: 500 }
      )
    }

    const data = await res.json()

    return NextResponse.json({
      hits: data.hits || [],
      totalHits: data.estimatedTotalHits || data.totalHits || 0,
      query: data.query,
    })
  } catch (err) {
    console.error("Muuja API error:", err)
    return NextResponse.json(
      { hits: [], totalHits: 0, error: "Viga otsingus" },
      { status: 500 }
    )
  }
}
