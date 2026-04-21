import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPages } from "../../../modules/cms/db"

// GET /store/cms — list all published page keys + update timestamps (no content)
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const pages = await listPages()
  res.json({
    pages: pages.map((p) => ({ key: p.page_key, updated_at: p.updated_at })),
  })
}
