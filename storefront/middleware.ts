import { NextRequest, NextResponse } from 'next/server'
import slugRedirectsData from './lib/slug-redirects.generated.json'

const locales = ['et', 'en']
const defaultLocale = 'et'

// Paths that should NOT be locale-prefixed
const PUBLIC_FILE = /\.(.*)$/
const EXCLUDED = ['/api/', '/hooks/', '/meili/', '/_next/', '/favicon', '/images/', '/media/', '/og-image', '/robots', '/sitemap', '/xl-admin', '/admin-login']

// Category URL segments where slug_redirect applies.
// Extend if new category URL prefixes are introduced.
const REDIRECT_PREFIXES = ['/kategooriad/', '/haru/']
const LEGACY_SEARCH_SEGMENT = '/search'
const SEARCH_SEGMENT = '/otsing'

// KRIITILINE (browse-cache samm 2a): user-spetsiifilised lehed mida CDN/cache
// EI TOHI KUNAGI cache'ida (muidu serveerid ühe kliendi cart'i/konto teisele).
// Need on "use client" (shell ei sisalda SSR user-data) AGA no-store = defense-
// in-depth + CDN-ohutus. Browse-lehed (toode/kategooriad/otsing) cache'itakse
// ISR'iga (revalidate=3600) — neid SIIN ei puudutata.
const NO_STORE_SEGMENTS = ['ostukorv', 'account', 'tellimus', 'login', 'register', 'vordlus']
function isDynamicUserPath(pathname: string): boolean {
  // /{locale}/{segment}...
  const parts = pathname.split('/').filter(Boolean) // ['et','ostukorv',...]
  return parts.length >= 2 && NO_STORE_SEGMENTS.includes(parts[1])
}

const SLUG_REDIRECTS: Record<string, string> = (slugRedirectsData as {
  redirects: Record<string, string>
}).redirects

/**
 * If `pathname` points to a category URL whose handle has been renamed,
 * return the rewritten pathname; otherwise return null.
 *
 * Input examples:
 *   /et/kategooriad/appliances          -> /et/kategooriad/horeca-food-service
 *   /en/haru/outdoors                   -> /en/haru/outdoor-power-landscaping
 *   /et/kategooriad/horeca-food-service -> null (already v3 slug)
 */
function categorySlugRedirect(pathname: string): string | null {
  // Match /{locale}{prefix}{handle}[/{rest}]
  for (const locale of locales) {
    for (const prefix of REDIRECT_PREFIXES) {
      const base = `/${locale}${prefix}`
      if (!pathname.startsWith(base)) continue

      const after = pathname.slice(base.length)
      const slashIdx = after.indexOf('/')
      const handle = slashIdx === -1 ? after : after.slice(0, slashIdx)
      const rest = slashIdx === -1 ? '' : after.slice(slashIdx)

      const target = SLUG_REDIRECTS[handle]
      if (!target) return null

      return `${base}${target}${rest}`
    }
  }
  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public files and API routes
  if (
    PUBLIC_FILE.test(pathname) ||
    EXCLUDED.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  // Category slug 301s (runs before locale detection because URL is already locale-prefixed).
  const rewritten = categorySlugRedirect(pathname)
  if (rewritten) {
    const url = request.nextUrl.clone()
    url.pathname = rewritten
    return NextResponse.redirect(url, 301)
  }

  // Legacy English search URLs should keep working after the Estonian route rename.
  if (pathname === LEGACY_SEARCH_SEGMENT || pathname.startsWith(`${LEGACY_SEARCH_SEGMENT}/`)) {
    const url = request.nextUrl.clone()
    url.pathname = `${SEARCH_SEGMENT}${pathname.slice(LEGACY_SEARCH_SEGMENT.length)}`
    return NextResponse.redirect(url, 301)
  }

  for (const locale of locales) {
    const localizedLegacySearch = `/${locale}${LEGACY_SEARCH_SEGMENT}`
    if (pathname === localizedLegacySearch || pathname.startsWith(`${localizedLegacySearch}/`)) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}${SEARCH_SEGMENT}${pathname.slice(localizedLegacySearch.length)}`
      return NextResponse.redirect(url, 301)
    }
  }

  // Spec F4.8 — /haru/ is a duplicate of /kategooriad/. Permanently redirect.
  for (const locale of locales) {
    const haruPrefix = `/${locale}/haru/`
    if (pathname.startsWith(haruPrefix) || pathname === `/${locale}/haru`) {
      const url = request.nextUrl.clone()
      url.pathname = pathname.replace(`/${locale}/haru`, `/${locale}/kategooriad`)
      return NextResponse.redirect(url, 301)
    }
  }

  // Check if pathname already has a locale
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1]
    const response = NextResponse.next()
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    })
    // User-spetsiifilised lehed: keela igasugune cache (CDN + brauser).
    if (isDynamicUserPath(pathname)) {
      response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    }
    return response
  }

  // Determine locale: cookie > default
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  const locale = (cookieLocale && locales.includes(cookieLocale))
    ? cookieLocale
    : defaultLocale

  // Redirect to locale-prefixed path
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname}`

  const response = NextResponse.redirect(url)
  response.cookies.set('NEXT_LOCALE', locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  })
  return response
}

export const config = {
  matcher: [
    '/((?!api|hooks|meili|_next/static|_next/image|favicon|images|media|og-image|robots|sitemap).*)',
  ],
}
