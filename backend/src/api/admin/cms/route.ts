import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPages } from "../../../modules/cms/db"
import { PAGE_REGISTRY } from "../../../modules/cms/schemas"

// GET /admin/cms?locale= — list all manageable pages with seeded status per locale
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const localeRaw = (req.query as Record<string, string | undefined>).locale
  const locale = typeof localeRaw === "string" && /^[a-z]{2}$/.test(localeRaw) ? localeRaw : "en"

  const rows = await listPages(locale)

  const pages = Object.entries(PAGE_REGISTRY).map(([key, reg]) => {
    const row = rows.find((p) => p.page_key === key)
    return {
      key,
      title: reg.title,
      locale,
      seeded: !!row,
      updated_at: row?.updated_at ?? null,
      updated_by: row?.updated_by ?? null,
    }
  })

  res.json({ locale, pages })
}
