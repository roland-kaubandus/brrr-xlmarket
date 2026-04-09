import Link from "next/link"

export default function VevorFooter({ locale = "et" }: { locale?: string }) {
  return (
    <footer>
      {/* Trust / Benefits bar */}
      <div className="bg-[#334155]">
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D97706]/10 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold">Free Shipping</p>
                <p className="text-white/50 text-[12px]">Orders over 99 EUR</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D97706]/10 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold">30-Day Returns</p>
                <p className="text-white/50 text-[12px]">Hassle-free returns</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D97706]/10 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold">2-Year Warranty</p>
                <p className="text-white/50 text-[12px]">Quality guaranteed</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D97706]/10 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold">24/7 Support</p>
                <p className="text-white/50 text-[12px]">Always here to help</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-[#1E293B]">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <Link href={`/${locale}`} className="inline-flex items-baseline gap-[2px] mb-4">
                <span className="text-[22px] font-extrabold text-[#D97706] leading-none">XL</span>
                <span className="text-[22px] font-normal text-white leading-none">Market</span>
              </Link>
              <p className="text-white/40 text-[13px] leading-relaxed max-w-[240px]">
                Your trusted source for tools, equipment, and home improvement products.
              </p>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-4">Customer Service</h4>
              <div className="space-y-2.5">
                <Link href={`/${locale}/kontakt`} className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">Contact Us</Link>
                <Link href={`/${locale}/tarne`} className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">Shipping Info</Link>
                <Link href={`/${locale}/tagastamine`} className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">Returns &amp; Refunds</Link>
                <Link href={`/${locale}/kontakt`} className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">FAQ</Link>
              </div>
            </div>

            {/* About */}
            <div>
              <h4 className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-4">About</h4>
              <div className="space-y-2.5">
                <Link href={`/${locale}/meist`} className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">About XL Market</Link>
                <Link href={`/${locale}/kategooriad`} className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">All Categories</Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-4">Legal</h4>
              <div className="space-y-2.5">
                <Link href={`/${locale}/privaatsus`} className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">Privacy Policy</Link>
                <Link href={`/${locale}/tingimused`} className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">Terms &amp; Conditions</Link>
                <Link href={`/${locale}/kupsised`} className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">Cookie Policy</Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-4">Contact</h4>
              <div className="space-y-2.5">
                <a href="mailto:info@xlmarket.eu" className="block text-[13px] text-white/60 hover:text-[#D97706] transition-colors">info@xlmarket.eu</a>
                <span className="block text-[13px] text-white/60">+372 5123 4567</span>
                <span className="block text-[13px] text-white/60">Mon-Fri 9:00-17:00</span>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <span className="text-[12px] text-white/30">
              &copy; 2026 XL Market. All rights reserved. Roland Kaubandus OU
            </span>
            <div className="flex items-center gap-2">
              <div className="h-[28px] px-3 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-white/50">VISA</div>
              <div className="h-[28px] px-3 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-white/50">MC</div>
              <div className="h-[28px] px-3 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-white/50">SEB</div>
              <div className="h-[28px] px-3 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-white/50">LHV</div>
              <div className="h-[28px] px-3 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-white/50">SWED</div>
              <div className="h-[28px] px-3 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold text-white/50">LUM</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
