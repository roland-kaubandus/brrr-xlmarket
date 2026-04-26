/**
 * CMS client — fetches page content from Medusa /store/cms/:key with ISR caching.
 * Falls back to static JSON snapshots (storefront/lib/cms-fallback/) if Medusa is down.
 *
 * Types here mirror backend/src/modules/cms/schemas.ts — keep in sync.
 */

export type CmsSlide = {
  badge: string
  title: string
  text: string
  cta: string
  ctaHref: string
  bg: string
}

export type CmsPromo = {
  tag: string
  tagTone: "amber" | "red" | "green" | "navy"
  title: string
  sub: string
  image?: string
  bg?: string
  href: string
}

export type HomepageContent = {
  slides: CmsSlide[]
  promos: CmsPromo[]
  nav_short_names: Record<string, string>
}

export type CmsKit = {
  slug: string
  name: string
  priceFrom: number
  icon: string
  tagline: string
  includes: string[]
  image: string
}

export type StarterKitsContent = {
  kits: CmsKit[]
}

export type LegalPageContent = {
  title: string
  effective_date: string
  body_md: string
}

export type PlainPageContent = {
  title: string
  body_md: string
}

export type GlobalContent = {
  company_name: string
  reg_number: string
  vat_number: string
  email_info: string
  email_b2b: string
  phone: string
  address: string
  domain: string
  slogan: string
}

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "http://127.0.0.1:9001"
const MEDUSA_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY || ""

async function fetchCmsPage<T>(key: string, locale: string, revalidate = 60): Promise<T | null> {
  try {
    const url = `${MEDUSA_URL}/store/cms/${key}?locale=${encodeURIComponent(locale)}`
    const res = await fetch(url, {
      next: { revalidate, tags: [`cms:${key}:${locale}`, `cms:${key}`] },
      headers: MEDUSA_KEY ? { "x-publishable-api-key": MEDUSA_KEY } : {},
    })
    if (!res.ok) return null
    const data = (await res.json()) as { content: T }
    return data.content
  } catch {
    return null
  }
}

async function loadFallback<T>(key: string): Promise<T | null> {
  try {
    const mod = await import(`./cms-fallback/${key}.json`)
    return mod.default as T
  } catch {
    return null
  }
}

async function getPage<T>(key: string, locale: string = "en"): Promise<T | null> {
  const live = await fetchCmsPage<T>(key, locale)
  if (live !== null) return live
  return loadFallback<T>(key)
}

export async function getHomepageCms(locale: string = "en"): Promise<HomepageContent | null> {
  return getPage<HomepageContent>("homepage", locale)
}

export async function getStarterKitsCms(locale: string = "en"): Promise<StarterKitsContent | null> {
  return getPage<StarterKitsContent>("starter-kits", locale)
}

export async function getLegalPage(
  slug: "terms" | "privacy" | "shipping" | "returns" | "cookies",
  locale: string = "en"
): Promise<LegalPageContent | null> {
  return getPage<LegalPageContent>(`legal-${slug}`, locale)
}

export async function getPlainPage(
  slug: "about" | "contact",
  locale: string = "en"
): Promise<PlainPageContent | null> {
  return getPage<PlainPageContent>(slug, locale)
}

export async function getGlobalCms(locale: string = "en"): Promise<GlobalContent | null> {
  return getPage<GlobalContent>("global", locale)
}
