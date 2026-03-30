import type { Metadata } from "next"
import Link from "next/link"
import { Truck, Clock, MapPin, Package } from "lucide-react"

export const metadata: Metadata = {
  title: "Tarneinfo — XLMARKET",
  description: "XLMARKET tarnetingimused. Tarneaeg 5–15 tööpäeva, tarne üle Eesti.",
}

export default function ShippingPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav
        className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] mb-[32px]"
        aria-label="Leheasukoht"
      >
        <Link href="/" className="hover:text-[#E8650A] transition-colors">
          Avaleht
        </Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Tarneinfo</span>
      </nav>

      <div className="max-w-[720px]">
        <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[8px]">
          Tarneinfo
        </h1>
        <p className="text-[14px] text-[#999999] font-[family-name:var(--font-inter)] mb-[40px]">
          Tarname kaupu üle Eesti. Kiire ja turvaline tarne.
        </p>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mb-[40px]">
          {[
            { icon: Truck, title: "Tasuta tarne alates €50", desc: "Tellimustele üle 50 € on tarne tasuta." },
            { icon: Clock, title: "Tarneaeg 5–15 tööpäeva", desc: "Alates makse laekumisest." },
            { icon: MapPin, title: "Tarne üle Eesti", desc: "Kõik tellimused saadetakse Eesti aadressile." },
            { icon: Package, title: "Jälgimisnumber", desc: "Saadame jälgimisnumbri e-kirjaga." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-[14px] p-[18px] border border-[#E8E8E8]">
              <div className="w-[36px] h-[36px] bg-[#FFF5EE] flex items-center justify-center shrink-0">
                <Icon size={16} strokeWidth={1.5} className="text-[#E8650A]" />
              </div>
              <div>
                <p className="text-[13px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[2px]">
                  {title}
                </p>
                <p className="text-[13px] text-[#777777] font-[family-name:var(--font-inter)]">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing table */}
        <div className="mb-[40px]">
          <h2 className="text-[18px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[16px]">
            Tarnehinnad
          </h2>
          <div className="border border-[#E8E8E8] overflow-hidden">
            <div className="grid grid-cols-3 bg-[#F7F7F7] px-[16px] py-[10px] border-b border-[#E8E8E8]">
              <span className="text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#777777] uppercase tracking-wide">
                Tarneviis
              </span>
              <span className="text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#777777] uppercase tracking-wide">
                Tarneaeg
              </span>
              <span className="text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#777777] uppercase tracking-wide">
                Hind
              </span>
            </div>
            <div className="grid grid-cols-3 px-[16px] py-[14px] border-b border-[#F0F0F0]">
              <span className="text-[14px] text-[#1A1A1A] font-[family-name:var(--font-inter)]">Standardtarne</span>
              <span className="text-[14px] text-[#555555] font-[family-name:var(--font-inter)]">5–15 tööpäeva</span>
              <span className="text-[14px] text-[#555555] font-[family-name:var(--font-inter)]">4,99 €</span>
            </div>
            <div className="grid grid-cols-3 px-[16px] py-[14px]">
              <span className="text-[14px] text-[#1A1A1A] font-[family-name:var(--font-inter)]">Alates 50 €</span>
              <span className="text-[14px] text-[#555555] font-[family-name:var(--font-inter)]">5–15 tööpäeva</span>
              <span className="text-[14px] font-[600] text-[#2E7D32] font-[family-name:var(--font-inter)]">Tasuta</span>
            </div>
          </div>
        </div>

        {/* FAQ sections */}
        <div className="flex flex-col gap-[24px]">
          {[
            {
              title: "Tarneaeg",
              text: "Tavaline tarneaeg on 5–15 tööpäeva alates makse laekumisest. Tarneaeg võib varieeruda sõltuvalt toote saadavusest ja asukohast. Suuremõõtmeliste kaupade tarneaeg võib olla pikem.",
            },
            {
              title: "Tellimuse jälgimine",
              text: "Saadame teile e-kirjaga jälgimisnumbri, kui kaup on teele pandud. Jälgimisnumbriga saate kontrollida oma paki asukohta.",
            },
            {
              title: "Probleemid tarnega",
              text: "Kui kaup ei ole saabunud 20 tööpäeva jooksul, palun võtke meiega ühendust.",
              link: { href: "mailto:info@xlmarket.eu", text: "info@xlmarket.eu" },
            },
          ].map((section) => (
            <div key={section.title}>
              <h2 className="text-[16px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[8px]">
                {section.title}
              </h2>
              <p className="text-[14px] text-[#555555] font-[family-name:var(--font-inter)] leading-relaxed">
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
