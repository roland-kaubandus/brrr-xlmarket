import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getRevisions, rollbackToRevision } from "../../../../../modules/cms/db"
import { PAGE_REGISTRY } from "../../../../../modules/cms/schemas"

// GET /admin/cms/:key/revisions — list last 20 revisions
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const key = (req.params as Record<string, string>).key
  if (!PAGE_REGISTRY[key]) {
    res.status(404).json({ message: `Unknown page key: ${key}` })
    return
  }

  const revisions = await getRevisions(key)
  res.json({ revisions })
}

// POST /admin/cms/:key/revisions — rollback to a specific revision
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

  const body = req.body as { revision_id?: number }
  if (!body?.revision_id) {
    res.status(400).json({ message: "Missing revision_id" })
    return
  }

  const page = await rollbackToRevision(key, body.revision_id, actorId)
  if (!page) {
    res.status(404).json({ message: `Revision ${body.revision_id} not found for page "${key}"` })
    return
  }

  res.json({ key, content: page.content, updated_at: page.updated_at, updated_by: page.updated_by })
}
