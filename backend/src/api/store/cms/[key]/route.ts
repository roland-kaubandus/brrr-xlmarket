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

  const page = await getPage(key)
  if (!page) {
    res.status(404).json({ message: `Page "${key}" not found` })
    return
  }

  // Allow CDN/Next.js ISR to cache — 60s stale, 5m stale-while-revalidate
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
  res.json({ key, content: page.content, updated_at: page.updated_at })
}
