import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Tagastamine — XLMARKET",
  description: "XLMARKET tagastamise ja taganemise tingimused. 14-päevane taganemisõigus.",
}

export default function ReturnsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-amber-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Tagastamine</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Tagastamine ja taganemisõigus</h1>

      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
        <h2 className="text-xl font-bold mt-8 mb-3">14-päevane taganemisõigus</h2>
        <p>
          Vastavalt Eesti Vabariigi tarbijakaitseseadusele on teil õigus e-poest ostetud kaubast
          taganeda 14 päeva jooksul alates kauba kättesaamisest ilma põhjust nimetamata.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">Tagastamise tingimused</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Kaup peab olema kasutamata ja originaalpakendis</li>
          <li>Toote pakend ei tohi olla kahjustatud (v.a pakendi avamine tutvumise eesmärgil)</li>
          <li>Tagastatav kaup peab olema komplektne</li>
          <li>Kauba tagastamise kulud kannab ostja</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">Kuidas tagastada</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Saatke taganemisavaldus e-postile{" "}
            <a href="mailto:info@xlmarket.eu" className="text-amber-600 hover:text-amber-700 underline">
              info@xlmarket.eu
            </a>{" "}
            hiljemalt 14 päeva jooksul alates kauba kättesaamisest.
          </li>
          <li>Märkige avalduses tellimuse number ja tagastatavad tooted.</li>
          <li>Saadame teile tagastamisjuhised ja aadressi.</li>
          <li>Saatke kaup tagasi 14 päeva jooksul alates taganemisavalduse esitamisest.</li>
        </ol>

        <h2 className="text-xl font-bold mt-8 mb-3">Raha tagastamine</h2>
        <p>
          Tagastame kauba eest tasutud summa (sh tarnekulud) 14 päeva jooksul alates kauba
          tagasijõudmisest meieni. Raha tagastatakse sama makseviisiga, mida kasutasite ostu
          sooritamisel.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">Pretensiooni esitamine</h2>
        <p>
          Kui kaup ei vasta lepingutingimustele (defektne, vigane), on teil õigus esitada
          pretensioon 2 aasta jooksul alates kauba kättesaamisest. Kirjutage aadressile{" "}
          <a href="mailto:info@xlmarket.eu" className="text-amber-600 hover:text-amber-700 underline">
            info@xlmarket.eu
          </a>{" "}
          koos tellimuse numbri ja probleemi kirjeldusega.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">Erandid</h2>
        <p>Taganemisõigus ei kehti:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Toodetele, mis on valmistatud tarbija erinõuete kohaselt</li>
          <li>Kiirestirikneva kauba puhul</li>
          <li>Suletud pakendiga toodetele, mis ei sobi tagastamiseks tervisekaitse tõttu</li>
        </ul>
      </div>
    </div>
  )
}
