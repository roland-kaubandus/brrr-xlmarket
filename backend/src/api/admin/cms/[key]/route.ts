import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPage, upsertPage } from "../../../../modules/cms/db"
import { PAGE_REGISTRY, validateContent } from "../../../../modules/cms/schemas"

function readLocale(req: MedusaRequest): string {
  const fromQuery = (req.query as Record<string, string | undefined>).locale
  const fromBody = (req.body as { locale?: string } | undefined)?.locale
  const candidate = typeof fromQuery === "string" ? fromQuery : fromBody
  return typeof candidate === "string" && /^[a-z]{2}$/.test(candidate) ? candidate : "en"
}

// GET /admin/cms/:key?locale=en|et|... — fetch current content for a locale
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const key = (req.params as Record<string, string>).key
  if (!PAGE_REGISTRY[key]) {
    res.status(404).json({ message: `Unknown page key: ${key}` })
    return
  }

  const locale = readLocale(req)
  const page = await getPage(key, locale)
  if (!page) {
    res.status(404).json({ message: `Page "${key}" not seeded yet` })
    return
  }

  res.json({
    key,
    locale: page.locale,
    title: page.title,
    content: page.content,
    updated_at: page.updated_at,
    updated_by: page.updated_by,
  })
}

// PUT /admin/cms/:key — save content (validates schema, writes revision).
// Body or ?locale= selects which locale row to upsert. Defaults to 'en'.
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId: string | undefined = (req as unknown as { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!actorId) {
    res.status(401).json({ message: "Authentication required" })
    return
  }

  const key = (req.params as Record<string, string>).key
  const reg = PAGE_REGISTRY[key]
  if (!reg) {
    res.status(404).json({ message: `Unknown page key: ${key}` })
    return
  }

  const body = req.body as { content?: unknown; locale?: string }
  if (!body?.content) {
    res.status(400).json({ message: "Missing content in request body" })
    return
  }

  const validation = validateContent(key, body.content)
  if (!validation.ok) {
    res.status(400).json({ message: `Schema validation failed: ${validation.error}` })
    return
  }

  const locale = readLocale(req)
  const page = await upsertPage(
    key,
    reg.title,
    body.content as Record<string, unknown>,
    actorId,
    locale,
  )
  res.json({
    key,
    locale: page.locale,
    content: page.content,
    updated_at: page.updated_at,
    updated_by: page.updated_by,
  })
}
