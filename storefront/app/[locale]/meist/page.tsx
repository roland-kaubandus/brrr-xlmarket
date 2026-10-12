import type { Metadata } from "next"
import Link from "@/components/SafeLink"
import { CmsMarkdown } from "@/components/CmsMarkdown"
import { CompanyInfoBlock } from "@/components/CompanyInfoBlock"
import { getPlainPage, getGlobalCms, type GlobalContent } from "@/lib/cms"
import fallback from "@/lib/cms-fallback/about.json"
import globalFallback from "@/lib/cms-fallback/global.json"

export const metadata: Metadata = {
  title: "Meist — XLMARKET",
  description: "XLmarket (Roland Kaubandus OÜ) — üle 25 aasta kogemust tööriistade ja seadmete vahendamisel Eesti klientidele.",
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale
  const [page, global] = await Promise.all([
    getPlainPage("about", locale).then((p) => p ?? (fallback as unknown as typeof fallback)),
    getGlobalCms(locale).then((g) => g ?? (globalFallback as GlobalContent)),
  ])

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="hover:text-[#0b7d79] transition-colors">{locale === "et" ? "Avaleht" : "Home"}</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">{page.title}</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1a1a2e] mb-[32px]">
        {page.title}
      </h1>

      <CmsMarkdown body={page.body_md} />
      <CompanyInfoBlock g={global} locale={locale} />
    </div>
  )
}
