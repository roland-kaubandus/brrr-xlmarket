import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { readAdminSession } from "@/lib/admin-session"
import { readHomepageOverrides, writeHomepageOverrides } from "@/lib/homepage-overrides"
import { getNode } from "@/lib/category-tree"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{0,80}$/

interface PutBody {
  l1: unknown
  featured_handles: unknown
}

// GET — read current overrides
export async function GET() {
  const session = await readAdminSession()
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const doc = await readHomepageOverrides()
  return NextResponse.json({ ok: true, overrides: doc.overrides })
}

// PUT — set or clear featured handles for one L1
export async function PUT(req: NextRequest) {
  const session = await readAdminSession()
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: PutBody
  try {
    body = (await req.json()) as PutBody
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  if (typeof body.l1 !== "string" || !HANDLE_RE.test(body.l1)) {
    return NextResponse.json({ ok: false, error: "Invalid l1 handle" }, { status: 400 })
  }
  const l1Node = getNode(body.l1)
  if (!l1Node || l1Node.level !== 1) {
    return NextResponse.json({ ok: false, error: "l1 must be a Level 1 category" }, { status: 400 })
  }

  if (!Array.isArray(body.featured_handles)) {
    return NextResponse.json({ ok: false, error: "featured_handles must be an array" }, { status: 400 })
  }
  if (body.featured_handles.length > 6) {
    return NextResponse.json({ ok: false, error: "Max 6 featured handles" }, { status: 400 })
  }

  // Validate every handle: must exist, must be a descendant of l1Node, must
  // not be the L1 itself (featured cards point to deeper categories).
  const cleaned: string[] = []
  for (const raw of body.featured_handles) {
    if (typeof raw !== "string" || !HANDLE_RE.test(raw)) {
      return NextResponse.json({ ok: false, error: `Invalid handle: ${String(raw).slice(0, 40)}` }, { status: 400 })
    }
    if (raw === body.l1) {
      return NextResponse.json({ ok: false, error: "Featured handle cannot be the L1 itself" }, { status: 400 })
    }
    const node = getNode(raw)
    if (!node) {
      return NextResponse.json({ ok: false, error: `Unknown handle: ${raw}` }, { status: 400 })
    }
    // climb ancestors to confirm it descends from this L1
    let cur = node
    let isDescendant = false
    while (cur.parent_handle) {
      const parent = getNode(cur.parent_handle)
      if (!parent) break
      if (parent.handle === body.l1) {
        isDescendant = true
        break
      }
      cur = parent
    }
    if (!isDescendant) {
      return NextResponse.json(
        { ok: false, error: `Handle "${raw}" is not a descendant of "${body.l1}"` },
        { status: 400 }
      )
    }
    cleaned.push(raw)
  }

  const doc = await readHomepageOverrides()
  if (cleaned.length === 0) {
    delete doc.overrides[body.l1]
  } else {
    doc.overrides[body.l1] = cleaned
  }
  await writeHomepageOverrides(doc)

  // Bust homepage cache for both locales.
  try {
    revalidatePath("/et")
    revalidatePath("/en")
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    ok: true,
    actor: session.email,
    l1: body.l1,
    featured_handles: cleaned,
  })
}
