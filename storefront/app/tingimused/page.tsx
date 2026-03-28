import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Müügitingimused — XLMARKET",
  description: "XLMARKET müügi- ja kasutustingimused. Tellimise, makse, tarne ja tagastamise kord.",
}

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-amber-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Müügitingimused</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Müügitingimused</h1>

      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
        <p>Kehtib alates: 28.03.2026</p>

        <h2 className="text-xl font-bold mt-8 mb-3">1. Üldtingimused</h2>
        <p>
          E-poe xlmarket.eu omanik ja müüja on Roland Kaubandus OÜ (edaspidi &quot;Müüja&quot;).
          Tingimused kehtivad kõigile xlmarket.eu kaudu sooritatavatele ostudele.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">2. Hinnad</h2>
        <p>
          Kõik hinnad sisaldavad käibemaksu (22%). Hinnad on eurodes (EUR). Müüjal on õigus
          muuta hindu igal ajal ilma ette teatamata. Tellimuse hetkel kehtiv hind on siduv.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">3. Tellimine</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Lisage soovitud tooted ostukorvi</li>
          <li>Sisestage tarneaadress ja kontaktandmed</li>
          <li>Valige tarneviis</li>
          <li>Viige läbi makse</li>
          <li>Tellimuse kinnitus saadetakse e-postile</li>
        </ul>
        <p>
          Müügileping loetakse sõlmituks makse laekumisel.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">4. Makse</h2>
        <p>
          Maksmine toimub Montonio makseteenuse kaudu. Toetatud makseviisid: Swedbank, SEB,
          LHV, Luminor, Coop pangalink ning kaardimaksed (Visa, Mastercard).
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">5. Tarne</h2>
        <p>
          Tarneaeg on 5–15 tööpäeva. Tarne toimub üle Eesti. Täpsem tarneinfo:{" "}
          <Link href="/tarne" className="text-amber-600 hover:text-amber-700 underline">
            Tarneinfo
          </Link>
          .
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">6. Taganemisõigus</h2>
        <p>
          Tarbijal on õigus kaup tagastada 14 päeva jooksul alates kauba kättesaamisest ilma
          põhjust nimetamata. Täpsem info:{" "}
          <Link href="/tagastamine" className="text-amber-600 hover:text-amber-700 underline">
            Tagastamine
          </Link>
          .
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">7. Garantii</h2>
        <p>
          Müüja vastutab müüdud kauba lepingutingimustele vastavuse eest. Tarbijal on õigus esitada
          kaebusi 2 aasta jooksul alates kauba üleandmisest.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">8. Vaidluste lahendamine</h2>
        <p>
          Kaebused palume saata aadressile info@xlmarket.eu. Lahendame kaebused 15 päeva jooksul.
          Vaidluse korral on tarbijal õigus pöörduda Tarbijakaitse ja Tehnilise Järelevalve Ameti
          (TTJA) poole: <a href="https://ttja.ee" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 underline">ttja.ee</a>.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">9. Kontakt</h2>
        <p>
          Roland Kaubandus OÜ<br />
          E-post:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-amber-600 hover:text-amber-700 underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
