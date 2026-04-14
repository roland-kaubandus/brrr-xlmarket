import type { Metadata } from "next"
import Link from "@/components/SafeLink"
import { Truck, Clock, MapPin, Package } from "lucide-react"

export const metadata: Metadata = {
  title: "Shipping Info — XLMARKET",
  description: "XLMARKET shipping terms. Delivery 5-15 business days, shipping across Estonia.",
}

export default async function TarnePage({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav
        className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#64748B] mb-[32px] flex items-center"
        aria-label="Breadcrumb"
      >
        <Link href={`/${(await params).locale}`} className="text-[#64748B] hover:text-[#D97706] transition-colors">
          Home
        </Link>
        <span className="mx-[8px] text-[#CBD5E1]">/</span>
        <span className="text-[#1E293B]">Shipping Info</span>
      </nav>

      <div className="max-w-[720px]">
        <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[8px]">
          Shipping Info
        </h1>
        <p className="text-[14px] text-[#999999] font-[family-name:var(--font-dm-sans)] mb-[40px]">
          We deliver across Estonia. Fast and secure shipping.
        </p>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mb-[40px]">
          {[
            { icon: Truck, title: "Free shipping from 50 EUR", desc: "Orders over 50 EUR ship for free." },
            { icon: Clock, title: "Delivery 5-15 business days", desc: "From the date of payment." },
            { icon: MapPin, title: "Shipping across Estonia", desc: "All orders are delivered to Estonian addresses." },
            { icon: Package, title: "Tracking number", desc: "We send you a tracking number via email." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-[14px] p-[18px] border border-[#E8E8E8]">
              <div className="w-[36px] h-[36px] bg-[#FFFBEB] flex items-center justify-center shrink-0">
                <Icon size={16} strokeWidth={1.5} className="text-[#E8650A]" />
              </div>
              <div>
                <p className="text-[13px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[2px]">
                  {title}
                </p>
                <p className="text-[13px] text-[#777777] font-[family-name:var(--font-dm-sans)]">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing table */}
        <div className="mb-[40px]">
          <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[16px]">
            Shipping Rates
          </h2>
          <div className="border border-[#E8E8E8] overflow-hidden">
            <div className="grid grid-cols-3 bg-[#F7F7F7] px-[16px] py-[10px] border-b border-[#E8E8E8]">
              <span className="text-[12px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#777777] uppercase tracking-wide">
                Method
              </span>
              <span className="text-[12px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#777777] uppercase tracking-wide">
                Delivery Time
              </span>
              <span className="text-[12px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#777777] uppercase tracking-wide">
                Price
              </span>
            </div>
            <div className="grid grid-cols-3 px-[16px] py-[14px] border-b border-[#E2E8F0]">
              <span className="text-[14px] text-[#1E293B] font-[family-name:var(--font-dm-sans)]">Standard shipping</span>
              <span className="text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">5-15 business days</span>
              <span className="text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">4.99 EUR</span>
            </div>
            <div className="grid grid-cols-3 px-[16px] py-[14px]">
              <span className="text-[14px] text-[#1E293B] font-[family-name:var(--font-dm-sans)]">Orders from 50 EUR</span>
              <span className="text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">5-15 business days</span>
              <span className="text-[14px] font-[600] text-[#2E7D32] font-[family-name:var(--font-dm-sans)]">Free</span>
            </div>
          </div>
        </div>

        {/* FAQ sections */}
        <div className="flex flex-col gap-[24px]">
          {[
            {
              title: "Delivery Time",
              text: "Standard delivery time is 5-15 business days from the date of payment. Delivery time may vary depending on product availability and location. Oversized items may take longer.",
            },
            {
              title: "Order Tracking",
              text: "We will send you a tracking number via email once your order has been shipped. You can use the tracking number to check your package location.",
            },
            {
              title: "Delivery Issues",
              text: "If your order has not arrived within 20 business days, please contact us.",
              link: { href: "mailto:info@xlmarket.eu", text: "info@xlmarket.eu" },
            },
          ].map((section) => (
            <div key={section.title}>
              <h2 className="text-[16px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[8px]">
                {section.title}
              </h2>
              <p className="text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)] leading-relaxed">
                {section.text}{" "}
                {section.link && (
                  <a href={section.link.href} className="text-[#E8650A] hover:underline">
                    {section.link.text}
                  </a>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
