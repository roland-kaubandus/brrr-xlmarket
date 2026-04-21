import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPages } from "../../../modules/cms/db"
import { PAGE_REGISTRY } from "../../../modules/cms/schemas"

// GET /admin/cms — list all manageable pages with seeded status + last edit info
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const rows = await listPages()

  const pages = Object.entries(PAGE_REGISTRY).map(([key, reg]) => {
    const row = rows.find((p) => p.page_key === key)
    return {
      key,
      title: reg.title,
      seeded: !!row,
      updated_at: row?.updated_at ?? null,
      updated_by: row?.updated_by ?? null,
    }
  })

  res.json({ pages })
}
