import { NextRequest, NextResponse } from 'next/server'

const locales = ['et', 'en']
const defaultLocale = 'et'

// Paths that should NOT be locale-prefixed
const PUBLIC_FILE = /\.(.*)$/
const EXCLUDED = ['/api/', '/_next/', '/favicon', '/images/', '/media/', '/og-image', '/robots', '/sitemap']

function getLocaleFromHeaders(request: NextRequest): string {
  const acceptLang = request.headers.get('accept-language') || ''
  const langs = acceptLang.split(',').map(l => {
    const [lang, q] = l.trim().split(';q=')
    return { lang: lang.split('-')[0].toLowerCase(), q: q ? parseFloat(q) : 1 }
  })
  langs.sort((a, b) => b.q - a.q)

  for (const { lang } of langs) {
    if (locales.includes(lang)) return lang
  }
  return defaultLocale
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

  // Determine locale: cookie > accept-language > default
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  const locale = (cookieLocale && locales.includes(cookieLocale))
    ? cookieLocale
    : getLocaleFromHeaders(request)

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
