import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Tagastamine — XLMARKET",
  description: "XLMARKET tagastamise ja taganemise tingimused. 14-päevane taganemisõigus.",
}

export default async function TagastaminePage({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]" aria-label="Leheasukoht">
        <Link href={`/${(await params).locale}`} className="hover:text-[#D97706] transition-colors">Avaleht</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Tagastamine</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[32px]">Tagastamine ja taganemisõigus</h1>

      <div className="max-w-[720px] text-[14px] font-[family-name:var(--font-dm-sans)] text-[#555555] leading-relaxed space-y-[16px]">
        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">14-päevane taganemisõigus</h2>
        <p>
          Vastavalt Eesti Vabariigi tarbijakaitseseadusele on teil õigus e-poest ostetud kaubast
          taganeda 14 päeva jooksul alates kauba kättesaamisest ilma põhjust nimetamata.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Tagastamise tingimused</h2>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Kaup peab olema kasutamata ja originaalpakendis</li>
          <li>Toote pakend ei tohi olla kahjustatud (v.a pakendi avamine tutvumise eesmärgil)</li>
          <li>Tagastatav kaup peab olema komplektne</li>
          <li>Kauba tagastamise kulud kannab ostja</li>
        </ul>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Kuidas tagastada</h2>
        <ol className="list-decimal pl-[20px] space-y-[10px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>
            Saatke taganemisavaldus e-postile{" "}
            <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
              info@xlmarket.eu
            </a>{" "}
            hiljemalt 14 päeva jooksul alates kauba kättesaamisest.
          </li>
          <li>Märkige avalduses tellimuse number ja tagastatavad tooted.</li>
          <li>Saadame teile tagastamisjuhised ja aadressi.</li>
          <li>Saatke kaup tagasi 14 päeva jooksul alates taganemisavalduse esitamisest.</li>
        </ol>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Raha tagastamine</h2>
        <p>
          Tagastame kauba eest tasutud summa (sh tarnekulud) 14 päeva jooksul alates kauba
          tagasijõudmisest meieni. Raha tagastatakse sama makseviisiga, mida kasutasite ostu
          sooritamisel.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Pretensiooni esitamine</h2>
        <p>
          Kui kaup ei vasta lepingutingimustele (defektne, vigane), on teil õigus esitada
          pretensioon 2 aasta jooksul alates kauba kättesaamisest. Kirjutage aadressile{" "}
          <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
            info@xlmarket.eu
          </a>{" "}
          koos tellimuse numbri ja probleemi kirjeldusega.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">Erandid</h2>
        <p>Taganemisõigus ei kehti:</p>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Toodetele, mis on valmistatud tarbija erinõuete kohaselt</li>
          <li>Kiirestirikneva kauba puhul</li>
          <li>Suletud pakendiga toodetele, mis ei sobi tagastamiseks tervisekaitse tõttu</li>
        </ul>
      </div>
    </div>
  )
}
