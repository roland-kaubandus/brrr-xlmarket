export default function TrustBadges({ locale = "et" }: { locale?: string }) {
  const et = locale === "et"
  return (
    <section className="bg-white py-10">
      <div className="max-w-[1360px] mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Badge
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            }
            title={et ? "Kiire tarne" : "Fast Delivery"}
            description={et ? "Tarne 3–7 tööpäevaga" : "Delivery in 3-7 business days"}
          />
          <Badge
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            }
            title={et ? "2-aastane garantii" : "2-Year Warranty"}
            description={et ? "Tehasegarantii kõigil toodetel" : "Factory warranty on all products"}
          />
          <Badge
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            }
            title={et ? "30-päevane tagastus" : "30-Day Returns"}
            description={et ? "Riskivaba ostlemine tagastusgarantiiga" : "Risk-free shopping with return guarantee"}
          />
          <Badge
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            }
            title={et ? "Klienditugi" : "Customer Support"}
            description={et ? "Kiire vastus e-posti teel" : "Quick response via email"}
          />
        </div>
      </div>
    </section>
  )
}

function Badge({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-4">
      <div className="w-14 h-14 bg-[#FFFBEB] rounded-full flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-sm text-[#1E293B] mb-1">{title}</h3>
      <p className="text-xs text-[#64748B] leading-relaxed">{description}</p>
    </div>
  )
}
