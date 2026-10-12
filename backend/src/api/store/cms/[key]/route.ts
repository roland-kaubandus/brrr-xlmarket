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

  // Locale lugemine on tahtlikult robustne: Medusa store-pipeline VÕIB tundmatu
  // query-võtme (locale) req.query'st eemaldada (tõestatud k33g-staging'us: ?locale=et
  // jõudis handlerisse req.query'ta → fallback 'en' → ET-leht näitas EN-sisu). req.originalUrl
  // säilitab aga alati täis-URL-i query-stringiga → loeme locale esmalt sealt. (Express ise
  // edastab req.query korrektselt — seega see on Medusa-raamistiku eripära, mitte express-bug.)
  const qLocale = (req.query as Record<string, string | undefined>)?.locale
  let localeRaw: string | undefined =
    typeof qLocale === "string" ? qLocale : undefined
  if (!localeRaw) {
    const rawUrl = (req.originalUrl || req.url || "") as string
    const m = rawUrl.match(/[?&]locale=([a-zA-Z]{2})(?:&|$)/)
    if (m) localeRaw = m[1]
  }
  const locale = typeof localeRaw === "string" && /^[a-z]{2}$/.test(localeRaw)
    ? localeRaw.toLowerCase()
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
