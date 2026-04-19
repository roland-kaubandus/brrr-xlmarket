import Link from "@/components/SafeLink"

export default function VevorFooter({ locale = "et" }: { locale?: string }) {
  const isEt = locale === "et"
  return (
    <footer className="mt-20 bg-[#1B2438] text-[#CBD5E1]" style={{ fontFamily: "'Mulish', system-ui, sans-serif", padding: "64px 0 32px" }}>
      <div className="max-w-[1320px] mx-auto px-6">
        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr] gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href={`/${locale}`} className="inline-block mb-4" style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1 }}>
              <span className="text-[#E8920A]">XL</span><span className="text-white">Market</span>
            </Link>
            <p className="text-[14px] text-[#94A3B8] leading-relaxed max-w-[260px]">
              {isEt
                ? "Professionaalne varustus igale valdkonnale. Eesti juhtiv profiseadmete e-pood."
                : "Your trusted source for professional tools, equipment, and home improvement products across Europe."}
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-[12px] font-bold text-[#64748B] uppercase tracking-[1.5px] mb-4">
              {isEt ? "Pood" : "Shop"}
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href={`/${locale}/kategooriad`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Kõik kategooriad" : "All Categories"}</Link></li>
              <li><Link href={`/${locale}/otsing?sort=newest`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Uued tooted" : "New Arrivals"}</Link></li>
              <li><Link href={`/${locale}/otsing?tag=hot`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Bestsellerid" : "Best Sellers"}</Link></li>
              <li><Link href={`/${locale}/otsing?tag=deals`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Pakkumised" : "Deals"}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[12px] font-bold text-[#64748B] uppercase tracking-[1.5px] mb-4">
              {isEt ? "Tugi" : "Support"}
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href={`/${locale}/kontakt`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Kontakt" : "Contact Us"}</Link></li>
              <li><Link href={`/${locale}/tarne`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Tarne info" : "Shipping Info"}</Link></li>
              <li><Link href={`/${locale}/tagastamine`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Tagastamine" : "Returns"}</Link></li>
              <li><Link href={`/${locale}/kontakt`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "KKK" : "FAQ"}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[12px] font-bold text-[#64748B] uppercase tracking-[1.5px] mb-4">
              {isEt ? "Ettevõte" : "Company"}
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link href={`/${locale}/meist`} className="text-[14px] text-[#94A3B8] hover:text-white transition-colors">{isEt ? "Meist" : "About Us"}</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-[12px] font-bold text-[#64748B] uppercase tracking-[1.5px] mb-4">
              {isEt ? "Uudiskiri" : "Newsletter"}
            </h4>
            <p className="text-[13px] text-[#94A3B8] leading-relaxed mb-3.5">
              {isEt
                ? "Saa teada parimatest pakkumistest ja uutest toodetest."
                : "Stay updated with the best deals and new product launches."}
            </p>
            <form className="flex gap-2" action="#">
              <input
                type="email"
                placeholder={isEt ? "sinu@email.ee" : "your@email.com"}
                className="flex-1 px-4 py-2.5 rounded-full border border-[#334155] bg-[#0F172A] text-white text-[13px] outline-none placeholder:text-[#475569] focus:border-[#E8920A] min-w-0"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#E8920A] hover:bg-[#CF7F00] text-white text-[13px] font-semibold shrink-0 transition-colors"
              >
                {isEt ? "Telli" : "Subscribe"}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[.06] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[12px] text-[#475569]">
          <span>&copy; 2026 Roland Kaubandus OÜ. {isEt ? "Kõik õigused kaitstud." : "All rights reserved."}</span>
          <div className="flex gap-5">
            <Link href={`/${locale}/privaatsus`} className="text-[#64748B] hover:text-[#94A3B8] transition-colors">{isEt ? "Privaatsus" : "Privacy"}</Link>
            <Link href={`/${locale}/tingimused`} className="text-[#64748B] hover:text-[#94A3B8] transition-colors">{isEt ? "Tingimused" : "Terms"}</Link>
            <Link href={`/${locale}/kupsised`} className="text-[#64748B] hover:text-[#94A3B8] transition-colors">{isEt ? "Küpsised" : "Cookies"}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
