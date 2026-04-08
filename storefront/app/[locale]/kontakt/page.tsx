import type { Metadata } from "next"
import Link from "next/link"
import { Mail, Clock, RefreshCcw } from "lucide-react"

export const metadata: Metadata = {
  title: "Kontakt — XLMARKET",
  description: "XLMARKET kontaktandmed. Kirjutage meile ja vastame esimesel võimalusel.",
}

export default async function KontaktPage({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav
        className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]"
        aria-label="Leheasukoht"
      >
        <Link href={`/${(await params).locale}`} className="hover:text-[#D97706] transition-colors">
          Avaleht
        </Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Kontakt</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[8px]">
        Kontakt
      </h1>
      <p className="text-[14px] text-[#999999] font-[family-name:var(--font-dm-sans)] mb-[40px]">
        Vastame kõikidele päringutele 1–2 tööpäeva jooksul.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[32px] lg:gap-[48px]">
        {/* Left: info */}
        <div className="flex flex-col gap-[24px]">
          {/* Company info */}
          <div className="border border-[#E8E8E8] p-[24px] sm:p-[28px]">
            <h2 className="text-[16px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[16px]">
              Ettevõtte andmed
            </h2>
            <div className="flex flex-col gap-[10px] text-[14px] font-[family-name:var(--font-dm-sans)]">
              <p className="font-[600] text-[#1E293B]">Roland Kaubandus OÜ</p>
              <p className="text-[#555555]">
                E-post:{" "}
                <a
                  href="mailto:info@xlmarket.eu"
                  className="text-[#E8650A] hover:underline"
                >
                  info@xlmarket.eu
                </a>
              </p>
              <p className="text-[#555555]">Veebileht: xlmarket.eu</p>
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
                  Klienditoe tööaeg
                </p>
                <p className="text-[13px] text-[#777777] font-[family-name:var(--font-dm-sans)]">
                  Esmaspäev–Reede · 9:00–17:00
                </p>
                <p className="text-[12px] text-[#999999] font-[family-name:var(--font-dm-sans)] mt-[2px]">
                  Vastame e-kirjadele 1–2 tööpäeva jooksul
                </p>
              </div>
            </div>

            <div className="flex items-start gap-[14px] p-[18px] border border-[#E8E8E8]">
              <div className="w-[36px] h-[36px] bg-[#FFFBEB] flex items-center justify-center shrink-0">
                <RefreshCcw size={16} strokeWidth={1.5} className="text-[#E8650A]" />
              </div>
              <div>
                <p className="text-[13px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[2px]">
                  Tagastamine ja pretensioonid
                </p>
                <p className="text-[13px] text-[#777777] font-[family-name:var(--font-dm-sans)]">
                  Kirjutage{" "}
                  <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:underline">
                    info@xlmarket.eu
                  </a>
                  , märkige tellimuse number.
                </p>
                <Link
                  href={`/${(await params).locale}/tagastamine`}
                  className="text-[12px] text-[#E8650A] hover:underline font-[family-name:var(--font-dm-sans)] mt-[4px] inline-block"
                >
                  Tagastamise tingimused →
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
              Saatke meile sõnum
            </h2>
            <p className="text-[14px] text-[#777777] font-[family-name:var(--font-dm-sans)] leading-relaxed mb-[28px]">
              Küsimused toote, tellimuse või tarne kohta? Kirjutage meile — vastame
              esimesel võimalusel.
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
