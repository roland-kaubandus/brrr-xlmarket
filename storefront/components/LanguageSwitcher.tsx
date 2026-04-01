"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

const localeList = ["et", "en"] as const

export default function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname()

  function getLocalePath(targetLocale: string) {
    const segments = pathname.split("/")
    if (segments[1] && localeList.includes(segments[1] as any)) {
      segments[1] = targetLocale
    }
    return segments.join("/")
  }

  return (
    <div className="flex items-center gap-0.5 text-[13px] font-[500] font-[family-name:var(--font-poppins)]">
      {localeList.map((loc, i) => (
        <span key={loc} className="flex items-center">
          {i > 0 && <span className="text-[#CCCCCC] mx-1">|</span>}
          <Link
            href={getLocalePath(loc)}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              locale === loc
                ? "text-[#E8650A] font-[600]"
                : "text-[#999999] hover:text-[#333333]"
            }`}
          >
            {loc.toUpperCase()}
          </Link>
        </span>
      ))}
    </div>
  )
}
