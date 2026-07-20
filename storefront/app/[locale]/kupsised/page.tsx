import type { Metadata } from "next"
import Link from "@/components/SafeLink"
import { CmsMarkdown } from "@/components/CmsMarkdown"
import { getLegalPage } from "@/lib/cms"
import fallback from "@/lib/cms-fallback/legal-cookies.json"

export const metadata: Metadata = {
  title: "Cookie Policy — XLMARKET",
  description: "XLMARKET cookie policy. What cookies we use and how you can manage your preferences.",
}

export default async function CookiePolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale
  const page = (await getLegalPage("cookies", locale)) ?? (fallback as unknown as typeof fallback)

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="hover:text-[#0b7d79] transition-colors">{locale === "et" ? "Avaleht" : "Home"}</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">{page.title}</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1a1a2e] mb-[8px]">
        {page.title}
      </h1>
      <p className="text-[13px] text-[#64748B] mb-[32px] font-[family-name:var(--font-dm-sans)]">
        Effective from: {page.effective_date}
      </p>

      <CmsMarkdown body={page.body_md} />
    </div>
  )
}
