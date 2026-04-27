import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { readAdminSession } from "@/lib/admin-session"
import { medusaAdminFetch } from "@/lib/medusa-admin"

export const dynamic = "force-dynamic"

interface UpdateBody {
  locale?: string
  title?: string | null
  description?: string | null
  category_ids?: string[]
  handle?: string
}

interface MedusaProduct {
  id: string
  handle?: string
  title?: string
  description?: string | null
  metadata?: Record<string, unknown> | null
}

function isLocaleString(v: unknown): v is string {
  return typeof v === "string" && /^[a-z]{2}$/.test(v)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await readAdminSession()
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (!id || !id.startsWith("prod_")) {
    return NextResponse.json({ ok: false, error: "Invalid product id" }, { status: 400 })
  }

  let body: UpdateBody
  try {
    body = (await req.json()) as UpdateBody
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const locale = isLocaleString(body.locale) ? body.locale : "en"
  const isBaselineLocale = locale === "en"

  // Build the Medusa update payload. Title + description in EN write directly;
  // any other locale writes to metadata.title_<locale> / description_<locale>.
  // Collect metadata fields in one object so multiple non-EN edits in one POST
  // don't clobber each other.
  const payload: Record<string, unknown> = {}
  const metadataPatch: Record<string, unknown> = {}

  if (body.title !== undefined && body.title !== null) {
    const t = String(body.title).trim()
    if (!t) {
      return NextResponse.json({ ok: false, error: "Title cannot be empty" }, { status: 400 })
    }
    if (t.length > 600) {
      return NextResponse.json({ ok: false, error: "Title too long" }, { status: 400 })
    }
    if (isBaselineLocale) {
      payload.title = t
    } else {
      metadataPatch[`title_${locale}`] = t
    }
  }

  if (body.description !== undefined) {
    const d = body.description === null ? "" : String(body.description)
    if (d.length > 50000) {
      return NextResponse.json({ ok: false, error: "Description too long" }, { status: 400 })
    }
    if (isBaselineLocale) {
      payload.description = d
    } else {
      metadataPatch[`description_${locale}`] = d
    }
  }

  if (Object.keys(metadataPatch).length > 0) {
    payload.metadata = metadataPatch
  }

  if (Array.isArray(body.category_ids)) {
    const ids = body.category_ids
      .filter((v): v is string => typeof v === "string" && v.startsWith("pcat_"))
    payload.categories = ids.map((cat_id) => ({ id: cat_id }))
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ ok: false, error: "No editable fields in body" }, { status: 400 })
  }

  let updated: { product?: MedusaProduct }
  try {
    updated = await medusaAdminFetch<{ product?: MedusaProduct }>(
      `/admin/products/${id}`,
      { method: "POST", body: payload }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }

  // Bust caches for the affected product page (both locales).
  try {
    const handle = updated.product?.handle ?? body.handle
    if (handle) {
      revalidatePath(`/et/toode/${handle}`)
      revalidatePath(`/en/toode/${handle}`)
    }
  } catch {
    // revalidate failures are non-fatal — surface success anyway
  }

  return NextResponse.json({
    ok: true,
    actor: session.email,
    product: updated.product
      ? {
          id: updated.product.id,
          handle: updated.product.handle,
          title: updated.product.title,
        }
      : null,
  })
}
