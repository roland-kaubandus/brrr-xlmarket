import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About Us — XLMARKET",
  description: "XLMARKET — quality tools, equipment, and home goods at affordable prices. Operated by Roland Kaubandus OU.",
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav
        className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]"
        aria-label="Breadcrumb"
      >
        <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">
          Home
        </Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">About Us</span>
      </nav>

      <div className="max-w-[720px]">
        <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[16px]">
          About Us
        </h1>
        <p className="text-[16px] text-[#555555] font-[family-name:var(--font-dm-sans)] leading-relaxed mb-[40px]">
          XLMARKET is an Estonian online store offering quality tools, equipment, and home goods
          at affordable prices. Our goal is to make professional-grade products accessible to everyone —
          whether you are a seasoned tradesperson or tackling your first weekend project.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] mb-[48px]">
          {[
            { num: "10,000+", label: "Products in catalog" },
            { num: "11", label: "Product categories" },
            { num: "2yr", label: "Warranty on all products" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-[#E8E8E8] p-[20px] text-center"
            >
              <p className="text-[28px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#E8650A] mb-[4px]">
                {stat.num}
              </p>
              <p className="text-[13px] text-[#777777] font-[family-name:var(--font-dm-sans)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-[32px]">
          <div>
            <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[12px]">
              What We Offer
            </h2>
            <ul className="flex flex-col gap-[8px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
              {[
                "Over 10,000 products across 11 categories",
                "Tools and equipment for professionals and hobbyists",
                "Home and garden supplies",
                "Automotive accessories and garage equipment",
                "Sports, leisure, and outdoor gear",
                "Electronics and industrial equipment",
              ].map((item) => (
                <li key={item} className="flex items-start gap-[8px]">
                  <span className="text-[#E8650A] shrink-0 mt-[1px]">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[12px]">
              Our Values
            </h2>
            <div className="flex flex-col gap-[12px]">
              {[
                { title: "Affordable prices", desc: "Direct sourcing from manufacturers keeps our prices competitive." },
                { title: "Wide selection", desc: "Thousands of products in one place — no need to shop around." },
                { title: "Reliable service", desc: "14-day return policy and a full 2-year warranty on every product." },
              ].map((v) => (
                <div key={v.title} className="border border-[#E8E8E8] p-[16px]">
                  <p className="text-[14px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[4px]">
                    {v.title}
                  </p>
                  <p className="text-[13px] text-[#777777] font-[family-name:var(--font-dm-sans)]">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[12px]">
              Company
            </h2>
            <p className="text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)] mb-[4px]">
              XLMARKET is a brand of Roland Kaubandus OU, registered in Estonia.
            </p>
            <p className="text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)] mb-[8px]">
              We ship to Estonia and are expanding our delivery reach.
            </p>
            <Link
              href={`/${locale}/kontakt`}
              className="text-[14px] text-[#E8650A] hover:underline font-[family-name:var(--font-dm-sans)]"
            >
              Get in touch &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
