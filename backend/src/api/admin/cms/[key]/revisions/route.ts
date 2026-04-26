import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getRevisions, rollbackToRevision } from "../../../../../modules/cms/db"
import { PAGE_REGISTRY } from "../../../../../modules/cms/schemas"

function readLocale(req: MedusaRequest): string {
  const fromQuery = (req.query as Record<string, string | undefined>).locale
  const fromBody = (req.body as { locale?: string } | undefined)?.locale
  const candidate = typeof fromQuery === "string" ? fromQuery : fromBody
  return typeof candidate === "string" && /^[a-z]{2}$/.test(candidate) ? candidate : "en"
}

// GET /admin/cms/:key/revisions?locale= — list last 20 revisions for a locale
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const key = (req.params as Record<string, string>).key
  if (!PAGE_REGISTRY[key]) {
    res.status(404).json({ message: `Unknown page key: ${key}` })
    return
  }

  const locale = readLocale(req)
  const revisions = await getRevisions(key, 20, locale)
  res.json({ revisions, locale })
}

// POST /admin/cms/:key/revisions — rollback a locale row to a specific revision
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId: string | undefined = (req as unknown as { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!actorId) {
    res.status(401).json({ message: "Authentication required" })
    return
  }

  const key = (req.params as Record<string, string>).key
  if (!PAGE_REGISTRY[key]) {
    res.status(404).json({ message: `Unknown page key: ${key}` })
    return
  }

  const body = req.body as { revision_id?: number; locale?: string }
  if (!body?.revision_id) {
    res.status(400).json({ message: "Missing revision_id" })
    return
  }

  const locale = readLocale(req)
  const page = await rollbackToRevision(key, body.revision_id, actorId, locale)
  if (!page) {
    res.status(404).json({ message: `Revision ${body.revision_id} not found for page "${key}" (locale=${locale})` })
    return
  }

  res.json({
    key,
    locale: page.locale,
    content: page.content,
    updated_at: page.updated_at,
    updated_by: page.updated_by,
  })
}
