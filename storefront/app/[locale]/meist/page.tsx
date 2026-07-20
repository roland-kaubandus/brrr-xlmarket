import type { Metadata } from "next"
import Link from "@/components/SafeLink"
import { CmsMarkdown } from "@/components/CmsMarkdown"
import { getPlainPage } from "@/lib/cms"
import fallback from "@/lib/cms-fallback/about.json"

export const metadata: Metadata = {
  title: "About Us — XLMARKET",
  description: "XLMARKET — quality tools, equipment, and home goods at affordable prices. Operated by Roland Kaubandus OÜ.",
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale
  const page = (await getPlainPage("about", locale)) ?? (fallback as unknown as typeof fallback)

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
    </div>
  )
}
