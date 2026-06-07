import { NextResponse } from "next/server"
import { getCategoriesCached } from "@/lib/category-cache"

export async function GET() {
  const categories = await getCategoriesCached()
  return NextResponse.json(
    {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        parent_category_id: c.parent_category_id,
      })),
    },
    // Browse-cache (2a): nav-kategooriad muutuvad harva → CDN-cache 1h + 1p SWR.
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  )
}
