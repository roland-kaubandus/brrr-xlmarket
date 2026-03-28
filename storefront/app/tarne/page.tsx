import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Tarneinfo — XLMARKET",
  description: "XLMARKET tarnetingimused. Tarneaeg 5–15 tööpäeva, tarne üle Eesti.",
}

export default function ShippingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-brand-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Tarneinfo</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Tarneinfo</h1>

      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
        <h2 className="text-xl font-bold mt-8 mb-3">Tarneviisid</h2>
        <div className="border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Tarneviis</th>
                <th className="px-4 py-3 font-medium">Tarneaeg</th>
                <th className="px-4 py-3 font-medium">Hind</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3">Tavaline tarne</td>
                <td className="px-4 py-3">5–15 tööpäeva</td>
                <td className="px-4 py-3">4,99 &euro;</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold mt-8 mb-3">Tarnepiirkond</h2>
        <p>
          Tarname kaupu üle Eesti. Kõik tellimused saadetakse Eesti-sisesele aadressile.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">Tarneaeg</h2>
        <p>
          Tavaline tarneaeg on 5–15 tööpäeva alates makse laekumisest. Tarneaeg võib varieeruda
          sõltuvalt toote saadavusest ja asukohast. Suuremõõtmeliste kaupade tarneaeg võib olla pikem.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">Tellimuse jälgimine</h2>
        <p>
          Saadame teile e-kirjaga jälgimisnumbri, kui kaup on teele pandud. Jälgimisnumbriga
          saate kontrollida oma paki asukohta.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">Probleemid tarnega</h2>
        <p>
          Kui kaup ei ole saabunud 20 tööpäeva jooksul, palun võtke meiega ühendust:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-brand-600 hover:text-brand-700 underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
