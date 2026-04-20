/**
 * /api/category-children?handle=X
 *
 * Returns direct children of a category node as MenuNode[].
 * Used by MegaMenu for lazy L3+ drill-down — avoids shipping the full 1.5MB
 * category tree to the client.
 *
 * Cache: 1 hour (ISR-style). The category tree changes only on deploy.
 *
 * Spec: PERF-C1 (2026-04-20).
 */

import { NextRequest, NextResponse } from "next/server"
import { getMenuChildren } from "@/lib/menu-data"

export const revalidate = 3600

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle")
  if (!handle || typeof handle !== "string") {
    return NextResponse.json({ children: [] })
  }
  // Basic safety: only allow valid handle tokens.
  if (!/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(handle)) {
    return NextResponse.json({ children: [] }, { status: 400 })
  }

  const children = getMenuChildren(handle)
  return NextResponse.json(
    { children },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  )
}
