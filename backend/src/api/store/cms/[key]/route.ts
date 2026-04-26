import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPage } from "../../../../modules/cms/db"
import { PAGE_REGISTRY } from "../../../../modules/cms/schemas"

// GET /store/cms/:key — public read, no auth, cache-friendly
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const key = (req.params as Record<string, string>).key
  if (!PAGE_REGISTRY[key]) {
    res.status(404).json({ message: `Unknown page key: ${key}` })
    return
  }

  const localeRaw = (req.query as Record<string, string | undefined>).locale
  const locale = typeof localeRaw === "string" && /^[a-z]{2}$/.test(localeRaw)
    ? localeRaw
    : "en"

  const page = await getPage(key, locale)
  if (!page) {
    res.status(404).json({ message: `Page "${key}" not found` })
    return
  }

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
  res.json({
    key,
    locale: page.locale,
    content: page.content,
    updated_at: page.updated_at,
  })
}
