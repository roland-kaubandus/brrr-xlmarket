import { NextRequest, NextResponse } from 'next/server'
import slugRedirectsData from './lib/slug-redirects.generated.json'

const locales = ['et', 'en']
const defaultLocale = 'et'

// Paths that should NOT be locale-prefixed
const PUBLIC_FILE = /\.(.*)$/
const EXCLUDED = ['/api/', '/_next/', '/favicon', '/images/', '/media/', '/og-image', '/robots', '/sitemap']

// Category URL segments where slug_redirect applies.
// Extend if new category URL prefixes are introduced.
const REDIRECT_PREFIXES = ['/kategooriad/', '/haru/']

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
    '/((?!api|_next/static|_next/image|favicon|images|media|og-image|robots|sitemap).*)',
  ],
}
