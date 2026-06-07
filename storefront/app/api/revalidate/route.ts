import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

// Browse-cache invalidatsioon (samm 2a). Feed-sync kutsub seda peale hinna/
// laoseisu/toote-muutust → ISR-cache (revalidate=3600) puhastatakse KOHE
// mõjutatud lehtedele (muidu ootaks kuni 1h aknani).
//
// Auth: REVALIDATE_SECRET env (Bearer või ?secret=). Ilma env'ita → 503
// (endpoint passiivne, ei saa kuritarvitada).
//
// Kasutus feed-sync'ist:
//   curl -X POST "$STOREFRONT_URL/api/revalidate" -H "Authorization: Bearer $REVALIDATE_SECRET" \
//     -H "Content-Type: application/json" -d '{"handles":["vevor-...","vevor-..."]}'
//   VÕI {"all":true} → kogu browse-kataloog (listing + avaleht).
//
// NB: see puhastab Next ISR-cache'i. CDN-edge (Cloudflare, Faas 2) vajab eraldi
// purge-API kutset — lisatakse CDN-sammus.

const LOCALES = ["et", "en"]

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({ error: "revalidate disabled (no secret configured)" }, { status: 503 })
  }
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const qsSecret = request.nextUrl.searchParams.get("secret")
  if (auth !== secret && qsSecret !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { handles?: string[]; all?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    // tühi body lubatud (all=false, handles=[])
  }

  const revalidated: string[] = []

  if (body.all) {
    // Kogu browse-kataloog: avaleht + listing/otsing (toote-lehed jäävad ISR-aknale).
    for (const loc of LOCALES) {
      revalidatePath(`/${loc}`)
      revalidatePath(`/${loc}/otsing`)
      revalidatePath(`/${loc}/kategooriad`, "layout")
    }
    revalidated.push("all:home+listing+categories")
  }

  for (const handle of body.handles ?? []) {
    if (typeof handle !== "string" || !handle) continue
    for (const loc of LOCALES) {
      revalidatePath(`/${loc}/toode/${handle}`)
    }
    revalidated.push(handle)
  }

  return NextResponse.json(
    { revalidated: revalidated.length, items: revalidated.slice(0, 50) },
    { headers: { "Cache-Control": "no-store" } }
  )
}
