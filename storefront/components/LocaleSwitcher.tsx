"use client"

import Link from "@/components/SafeLink"
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
    <div className="flex items-center gap-0 text-[11px] font-semibold tracking-wide">
      <Link
        href={etHref}
        className={`px-1.5 py-1 rounded-l transition-colors ${
          locale === "et"
            ? "text-[#D97706]"
            : "text-white/50 hover:text-white"
        }`}
        aria-current={locale === "et" ? "page" : undefined}
        aria-label="Switch to Estonian"
      >
        ET
      </Link>
      <span className="text-white/25">|</span>
      <Link
        href={enHref}
        className={`px-1.5 py-1 rounded-r transition-colors ${
          locale === "en"
            ? "text-[#D97706]"
            : "text-white/50 hover:text-white"
        }`}
        aria-current={locale === "en" ? "page" : undefined}
        aria-label="Switch to English"
      >
        EN
      </Link>
    </div>
  )
}
