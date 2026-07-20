"use client"

import Link from "@/components/SafeLink"
import { usePathname } from "next/navigation"
import { translateLocalePath, type Locale } from "@/lib/i18n"

function switchLocale(pathname: string, target: Locale) {
  return translateLocalePath(pathname, target)
}

export default function LocaleSwitcher({ locale, variant = "light" }: { locale: string; variant?: "light" | "dark" }) {
  const pathname = usePathname() || `/${locale}`
  const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : ""
  const withQuery = (href: string) => (query ? `${href}?${query}` : href)
  const etHref = withQuery(switchLocale(pathname, "et"))
  const enHref = withQuery(switchLocale(pathname, "en"))

  const isDark = variant === "dark"
  const inactiveClass = isDark
    ? "text-white/50 hover:text-white"
    : "text-[#94A3B8] hover:text-[#1a1a2e]"
  const dividerClass = isDark ? "text-white/20" : "text-[#CBD5E1]"

  return (
    <div className="flex items-center gap-0 text-[11px] md:text-[13px] font-semibold tracking-wide">
      <Link
        href={etHref}
        className={`px-1.5 py-1 rounded-l transition-colors ${
          locale === "et" ? "text-[#0b7d79]" : inactiveClass
        }`}
        aria-current={locale === "et" ? "page" : undefined}
        aria-label="Switch to Estonian"
      >
        ET
      </Link>
      <span className={dividerClass}>|</span>
      <Link
        href={enHref}
        className={`px-1.5 py-1 rounded-r transition-colors ${
          locale === "en" ? "text-[#0b7d79]" : inactiveClass
        }`}
        aria-current={locale === "en" ? "page" : undefined}
        aria-label="Switch to English"
      >
        EN
      </Link>
    </div>
  )
}
