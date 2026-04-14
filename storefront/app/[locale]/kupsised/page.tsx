import type { Metadata } from "next"
import Link from "@/components/SafeLink"

export const metadata: Metadata = {
  title: "Cookie Policy — XLMARKET",
  description: "XLMARKET cookie policy. What cookies we use and how you can manage your preferences.",
}

export default async function CookiePolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">Home</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Cookie Policy</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[32px]">Cookie Policy</h1>

      <div className="max-w-[720px] text-[14px] font-[family-name:var(--font-dm-sans)] text-[#555555] leading-relaxed space-y-[16px]">
        <p>Effective from: 28 March 2026</p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">What Are Cookies?</h2>
        <p>
          Cookies are small text files that a website stores on your device. They help us
          provide a better user experience.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Essential Cookies</h2>
        <p>
          These cookies are necessary for the online store to function. Without them, the
          shopping cart and checkout process will not work.
        </p>
        <div className="border border-[#E8E8E8] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#F7F7F7]">
              <tr>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#777777] uppercase tracking-wide">Cookie</th>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#777777] uppercase tracking-wide">Purpose</th>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#777777] uppercase tracking-wide">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#E8E8E8]">
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">xlmarket_cart_id</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">Cart storage</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">End of session</td>
              </tr>
              <tr className="border-t border-[#E8E8E8]">
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">xlmarket_cookie_consent</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">Cookie consent preference</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">1 year</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Analytics Cookies</h2>
        <p>
          Analytics cookies are used only with your consent. They help us understand
          how visitors use our website.
        </p>
        <div className="border border-[#E8E8E8] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#F7F7F7]">
              <tr>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#777777] uppercase tracking-wide">Cookie</th>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#777777] uppercase tracking-wide">Purpose</th>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#777777] uppercase tracking-wide">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#E8E8E8]">
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">_fbp</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">Meta Pixel — visitor analytics</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">3 months</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">How to Manage Cookies</h2>
        <p>
          You can manage cookies through your web browser settings. Blocking cookies may
          limit some store features (e.g. the shopping cart).
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Contact</h2>
        <p>
          For questions, write to:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
