import type { Metadata } from "next"
import Link from "@/components/SafeLink"
import { Mail, Clock, RefreshCcw } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact — XLMARKET",
  description: "XLMARKET contact information. Reach out to us and we will respond within 1-2 business days.",
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav
        className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#64748B] mb-[32px] flex items-center"
        aria-label="Breadcrumb"
      >
        <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">
          Home
        </Link>
        <span className="mx-[8px] text-[#CBD5E1]">/</span>
        <span className="text-[#1E293B]">Contact</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[8px]">
        Contact
      </h1>
      <p className="text-[14px] text-[#999999] font-[family-name:var(--font-dm-sans)] mb-[40px]">
        We respond to all inquiries within 1-2 business days.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[32px] lg:gap-[48px]">
        {/* Left: info */}
        <div className="flex flex-col gap-[24px]">
          {/* Company info */}
          <div className="border border-[#E8E8E8] p-[24px] sm:p-[28px]">
            <h2 className="text-[16px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[16px]">
              Company Details
            </h2>
            <div className="flex flex-col gap-[10px] text-[14px] font-[family-name:var(--font-dm-sans)]">
              <p className="font-[600] text-[#1E293B]">Roland Kaubandus OU</p>
              <p className="text-[#555555]">
                Email:{" "}
                <a
                  href="mailto:info@xlmarket.eu"
                  className="text-[#E8650A] hover:underline"
                >
                  info@xlmarket.eu
                </a>
              </p>
              <p className="text-[#555555]">Website: xlmarket.eu</p>
            </div>
          </div>

          {/* Info cards */}
          <div className="flex flex-col gap-[12px]">
            <div className="flex items-start gap-[14px] p-[18px] border border-[#E8E8E8]">
              <div className="w-[36px] h-[36px] bg-[#FFFBEB] flex items-center justify-center shrink-0">
                <Clock size={16} strokeWidth={1.5} className="text-[#E8650A]" />
              </div>
              <div>
                <p className="text-[13px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[2px]">
                  Support Hours
                </p>
                <p className="text-[13px] text-[#777777] font-[family-name:var(--font-dm-sans)]">
                  Monday-Friday &middot; 9:00-17:00
                </p>
                <p className="text-[12px] text-[#999999] font-[family-name:var(--font-dm-sans)] mt-[2px]">
                  We respond to emails within 1-2 business days
                </p>
              </div>
            </div>

            <div className="flex items-start gap-[14px] p-[18px] border border-[#E8E8E8]">
              <div className="w-[36px] h-[36px] bg-[#FFFBEB] flex items-center justify-center shrink-0">
                <RefreshCcw size={16} strokeWidth={1.5} className="text-[#E8650A]" />
              </div>
              <div>
                <p className="text-[13px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[2px]">
                  Returns &amp; Complaints
                </p>
                <p className="text-[13px] text-[#777777] font-[family-name:var(--font-dm-sans)]">
                  Email{" "}
                  <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:underline">
                    info@xlmarket.eu
                  </a>
                  {" "}with your order number.
                </p>
                <Link
                  href={`/${locale}/tagastamine`}
                  className="text-[12px] text-[#E8650A] hover:underline font-[family-name:var(--font-dm-sans)] mt-[4px] inline-block"
                >
                  Return policy &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right: CTA card */}
        <div className="border border-[#E8E8E8] p-[28px] sm:p-[36px] flex flex-col justify-between">
          <div>
            <div className="w-[48px] h-[48px] bg-[#FFFBEB] flex items-center justify-center mb-[20px]">
              <Mail size={22} strokeWidth={1.5} className="text-[#E8650A]" />
            </div>
            <h2 className="text-[20px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[10px]">
              Send Us a Message
            </h2>
            <p className="text-[14px] text-[#777777] font-[family-name:var(--font-dm-sans)] leading-relaxed mb-[28px]">
              Questions about a product, order, or delivery? Drop us a line and
              we will get back to you as soon as possible.
            </p>
          </div>
          <a
            href="mailto:info@xlmarket.eu"
            className="inline-flex items-center justify-center gap-[8px] px-[24px] py-[13px] bg-[#E8650A] text-white text-[14px] font-[600] font-[family-name:var(--font-dm-sans)] hover:bg-[#CF5A08] active:scale-[0.98] transition-all"
          >
            <Mail size={16} strokeWidth={2} />
            info@xlmarket.eu
          </a>
        </div>
      </div>
    </div>
  )
}
