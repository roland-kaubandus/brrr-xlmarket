import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Küpsiste poliitika — XLMARKET",
  description: "XLMARKET küpsiste poliitika. Milliseid küpsiseid kasutame ja kuidas saate oma eelistusi hallata.",
}

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-brand-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Küpsiste poliitika</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Küpsiste poliitika</h1>

      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
        <p>Kehtib alates: 28.03.2026</p>

        <h2 className="text-xl font-bold mt-8 mb-3">Mis on küpsised?</h2>
        <p>
          Küpsised on väikesed tekstifailid, mida veebileht salvestab teie seadmesse. Need
          aitavad meil pakkuda paremat kasutajakogemust.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">Vajalikud küpsised</h2>
        <p>
          Need küpsised on e-poe toimimiseks hädavajalikud. Ilma nendeta ei tööta ostukorv
          ega tellimise protsess.
        </p>
        <div className="border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Küpsis</th>
                <th className="px-4 py-3 font-medium">Eesmärk</th>
                <th className="px-4 py-3 font-medium">Kehtivus</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3">xlmarket_cart_id</td>
                <td className="px-4 py-3">Ostukorvi hoidmine</td>
                <td className="px-4 py-3">Sessiooni lõpuni</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3">xlmarket_cookie_consent</td>
                <td className="px-4 py-3">Küpsiste nõusoleku meelespidamine</td>
                <td className="px-4 py-3">1 aasta</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold mt-8 mb-3">Analüütikaküpsised</h2>
        <p>
          Analüütikaküpsiseid kasutatakse ainult teie nõusolekul. Need aitavad meil mõista,
          kuidas külastajad meie veebilehte kasutavad.
        </p>
        <div className="border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Küpsis</th>
                <th className="px-4 py-3 font-medium">Eesmärk</th>
                <th className="px-4 py-3 font-medium">Kehtivus</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3">_fbp</td>
                <td className="px-4 py-3">Meta Pixel — külastajate analüüs</td>
                <td className="px-4 py-3">3 kuud</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold mt-8 mb-3">Kuidas küpsiseid hallata</h2>
        <p>
          Saate küpsiseid hallata oma veebibrauseri seadetest. Küpsiste blokeerimine võib
          piirata mõningaid e-poe funktsioone (nt ostukorv).
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">Kontakt</h2>
        <p>
          Küsimuste korral kirjutage:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-brand-600 hover:text-brand-700 underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
