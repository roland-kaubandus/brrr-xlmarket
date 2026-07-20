"use client"

import Link from "@/components/SafeLink"
import { usePathname } from "next/navigation"
import SearchBar from "@/components/SearchBar"

const CATS = [
  { h: "v4-tooriistad-ja-tarvikud", et: "Tööriistad ja tarvikud", en: "Tools & Accessories" },
  { h: "v4-suurkoogiseadmed", et: "Suurköögiseadmed", en: "Kitchen Equipment" },
  { h: "v4-aed-ja-aiatehnika", et: "Aed ja aiatehnika", en: "Garden" },
  { h: "v4-sport-ja-vaba-aeg", et: "Sport ja vaba aeg", en: "Sports & Leisure" },
  { h: "v4-moobel-ja-sisustus", et: "Mööbel ja sisustus", en: "Furniture" },
]

export default function NotFound() {
  const pathname = usePathname() ?? "/et"
  const locale = pathname.startsWith("/en") ? "en" : "et"
  const t = (et: string, en: string) => (locale === "et" ? et : en)

  return (
    <div className="min-h-[72vh] bg-[#f0fdf9] flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Logo → avaleht */}
      <Link href={`/${locale}`} aria-label="XLmarket — avalehele" className="mb-8">
        <img src="/logos/xlmarket-wordmark.svg" alt="XLmarket" className="h-[32px] sm:h-[38px] w-auto" />
      </Link>

      {/* Suur 404 — brändi-stiil (italic, fw900, teal) */}
      <p
        className="text-[110px] sm:text-[168px] font-[900] italic text-[#0ea5a0] leading-none tracking-[-4px] mb-1 select-none"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        404
      </p>

      <h1 className="text-[24px] sm:text-[30px] font-[800] text-[#1a1a2e] mb-2.5">
        {t("Oih! Seda lehte pole", "Oops! Page not found")}
      </h1>
      <p className="text-[15px] text-[#64748B] max-w-[440px] mb-8 leading-relaxed">
        {t(
          "Otsitud lehte ei eksisteeri või on liikunud. Proovi otsingut või vali kategooria allpool.",
          "The page you're looking for doesn't exist or has moved. Try a search or pick a category below.",
        )}
      </p>

      {/* Otsing (kasutaja saab kohe otsida) */}
      <div className="w-full max-w-[520px] mb-6">
        <SearchBar locale={locale} variant="light" />
      </div>

      {/* Tagasi avalehele */}
      <Link
        href={`/${locale}`}
        className="inline-flex items-center gap-2 bg-[#0ea5a0] hover:bg-[#0b7d79] text-white px-6 py-3 rounded-full text-[15px] font-semibold transition-colors mb-12"
      >
        {t("Tagasi avalehele", "Back to homepage")}
      </Link>

      {/* Populaarsed kategooriad (tagasi-teed) */}
      <div className="w-full max-w-[760px]">
        <p className="text-[12px] font-bold text-[#64748B] uppercase tracking-[1.5px] mb-3.5">
          {t("Populaarsed kategooriad", "Popular categories")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {CATS.map((c) => (
            <Link
              key={c.h}
              href={`/${locale}/kategooriad/${c.h}`}
              className="px-4 py-2 rounded-full bg-white border border-[#e2e8f0] text-[#1a1a2e] text-[14px] font-medium hover:border-[#0ea5a0] hover:text-[#0b7d79] transition-colors"
            >
              {t(c.et, c.en)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
