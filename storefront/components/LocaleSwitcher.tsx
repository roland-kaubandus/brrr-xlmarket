"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { translateLocalePath, type Locale } from "@/lib/i18n"

function switchLocale(pathname: string, target: Locale) {
  return translateLocalePath(pathname, target)
}

export default function LocaleSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname() || `/${locale}`
  const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : ""
  const withQuery = (href: string) => (query ? `${href}?${query}` : href)
  const etHref = withQuery(switchLocale(pathname, "et"))
  const enHref = withQuery(switchLocale(pathname, "en"))

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 text-[12px] font-semibold">
      <Link
        href={etHref}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          locale === "et"
            ? "bg-white text-[#1E293B] shadow-sm"
            : "text-white/75 hover:text-white hover:bg-white/10"
        }`}
        aria-current={locale === "et" ? "page" : undefined}
        aria-label="Switch to Estonian"
      >
        Eesti
      </Link>
      <Link
        href={enHref}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          locale === "en"
            ? "bg-white text-[#1E293B] shadow-sm"
            : "text-white/75 hover:text-white hover:bg-white/10"
        }`}
        aria-current={locale === "en" ? "page" : undefined}
        aria-label="Switch to English"
      >
        English
      </Link>
    </div>
  )
}
