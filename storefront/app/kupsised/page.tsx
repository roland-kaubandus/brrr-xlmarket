import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Küpsiste poliitika — XLMARKET",
  description: "XLMARKET küpsiste poliitika. Milliseid küpsiseid kasutame ja kuidas saate oma eelistusi hallata.",
}

export default function CookiePolicyPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] mb-[32px]" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-[#E8650A] transition-colors">Avaleht</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Küpsiste poliitika</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[32px]">Küpsiste poliitika</h1>

      <div className="max-w-[720px] text-[14px] font-[family-name:var(--font-inter)] text-[#555555] leading-relaxed space-y-[16px]">
        <p>Kehtib alates: 28.03.2026</p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mt-[32px] mb-[12px]">Mis on küpsised?</h2>
        <p>
          Küpsised on väikesed tekstifailid, mida veebileht salvestab teie seadmesse. Need
          aitavad meil pakkuda paremat kasutajakogemust.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mt-[32px] mb-[12px]">Vajalikud küpsised</h2>
        <p>
          Need küpsised on e-poe toimimiseks hädavajalikud. Ilma nendeta ei tööta ostukorv
          ega tellimise protsess.
        </p>
        <div className="border border-[#E8E8E8] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#F7F7F7]">
              <tr>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#777777] uppercase tracking-wide">Küpsis</th>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#777777] uppercase tracking-wide">Eesmärk</th>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#777777] uppercase tracking-wide">Kehtivus</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#E8E8E8]">
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">xlmarket_cart_id</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">Ostukorvi hoidmine</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">Sessiooni lõpuni</td>
              </tr>
              <tr className="border-t border-[#E8E8E8]">
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">xlmarket_cookie_consent</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">Küpsiste nõusoleku meelespidamine</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">1 aasta</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mt-[32px] mb-[12px]">Analüütikaküpsised</h2>
        <p>
          Analüütikaküpsiseid kasutatakse ainult teie nõusolekul. Need aitavad meil mõista,
          kuidas külastajad meie veebilehte kasutavad.
        </p>
        <div className="border border-[#E8E8E8] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#F7F7F7]">
              <tr>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#777777] uppercase tracking-wide">Küpsis</th>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#777777] uppercase tracking-wide">Eesmärk</th>
                <th className="px-[16px] py-[10px] text-[12px] font-[600] font-[family-name:var(--font-poppins)] text-[#777777] uppercase tracking-wide">Kehtivus</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#E8E8E8]">
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">_fbp</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">Meta Pixel — külastajate analüüs</td>
                <td className="px-[16px] py-[10px] text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">3 kuud</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mt-[32px] mb-[12px]">Kuidas küpsiseid hallata</h2>
        <p>
          Saate küpsiseid hallata oma veebibrauseri seadetest. Küpsiste blokeerimine võib
          piirata mõningaid e-poe funktsioone (nt ostukorv).
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mt-[32px] mb-[12px]">Kontakt</h2>
        <p>
          Küsimuste korral kirjutage:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
