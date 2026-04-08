import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Müügitingimused — XLMARKET",
  description: "XLMARKET müügi- ja kasutustingimused. Tellimise, makse, tarne ja tagastamise kord.",
}

export default async function TingimusedPage({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]" aria-label="Leheasukoht">
        <Link href={`/${(await params).locale}`} className="hover:text-[#D97706] transition-colors">Avaleht</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Müügitingimused</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[32px]">Müügitingimused</h1>

      <div className="max-w-[720px] text-[14px] font-[family-name:var(--font-dm-sans)] text-[#555555] leading-relaxed space-y-[16px]">
        <p>Kehtib alates: 28.03.2026</p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">1. Üldtingimused</h2>
        <p>
          E-poe xlmarket.eu omanik ja müüja on Roland Kaubandus OÜ (edaspidi &quot;Müüja&quot;).
          Tingimused kehtivad kõigile xlmarket.eu kaudu sooritatavatele ostudele.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">2. Hinnad</h2>
        <p>
          Kõik hinnad sisaldavad käibemaksu (22%). Hinnad on eurodes (EUR). Müüjal on õigus
          muuta hindu igal ajal ilma ette teatamata. Tellimuse hetkel kehtiv hind on siduv.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">3. Tellimine</h2>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Lisage soovitud tooted ostukorvi</li>
          <li>Sisestage tarneaadress ja kontaktandmed</li>
          <li>Valige tarneviis</li>
          <li>Viige läbi makse</li>
          <li>Tellimuse kinnitus saadetakse e-postile</li>
        </ul>
        <p>
          Müügileping loetakse sõlmituks makse laekumisel.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">4. Makse</h2>
        <p>
          Maksmine toimub Montonio makseteenuse kaudu. Toetatud makseviisid: Swedbank, SEB,
          LHV, Luminor, Coop pangalink ning kaardimaksed (Visa, Mastercard).
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">5. Tarne</h2>
        <p>
          Tarneaeg on 5–15 tööpäeva. Tarne toimub üle Eesti. Täpsem tarneinfo:{" "}
          <Link href={`/${(await params).locale}/tarne`} className="text-[#E8650A] hover:text-[#CF5A08] underline">
            Tarneinfo
          </Link>
          .
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">6. Taganemisõigus</h2>
        <p>
          Tarbijal on õigus kaup tagastada 14 päeva jooksul alates kauba kättesaamisest ilma
          põhjust nimetamata. Täpsem info:{" "}
          <Link href={`/${(await params).locale}/tagastamine`} className="text-[#E8650A] hover:text-[#CF5A08] underline">
            Tagastamine
          </Link>
          .
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">7. Garantii</h2>
        <p>
          Müüja vastutab müüdud kauba lepingutingimustele vastavuse eest. Tarbijal on õigus esitada
          kaebusi 2 aasta jooksul alates kauba üleandmisest.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">8. Vaidluste lahendamine</h2>
        <p>
          Kaebused palume saata aadressile info@xlmarket.eu. Lahendame kaebused 15 päeva jooksul.
          Vaidluse korral on tarbijal õigus pöörduda Tarbijakaitse ja Tehnilise Järelevalve Ameti
          (TTJA) poole: <a href="https://ttja.ee" target="_blank" rel="noopener noreferrer" className="text-[#E8650A] hover:text-[#CF5A08] underline">ttja.ee</a>.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">9. Kontakt</h2>
        <p>
          Roland Kaubandus OÜ<br />
          E-post:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
