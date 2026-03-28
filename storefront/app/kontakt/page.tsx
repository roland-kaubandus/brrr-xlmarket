import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Kontakt — XLMARKET",
  description: "XLMARKET kontaktandmed. Kirjutage meile ja vastame esimesel võimalusel.",
}

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-brand-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Kontakt</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Kontakt</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-3">Ettevõtte andmed</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-medium text-gray-900">Roland Kaubandus OÜ</p>
              <p>E-post: <a href="mailto:info@xlmarket.eu" className="text-brand-600 hover:text-brand-700 underline">info@xlmarket.eu</a></p>
              <p>Veebileht: xlmarket.eu</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Klienditugi</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p>Vastame e-kirjadele 1–2 tööpäeva jooksul.</p>
              <p>Tööaeg: E–R 9:00–17:00</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Tagastamine ja pretensioonid</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                Tagastamissoovi või pretensiooni korral kirjutage{" "}
                <a href="mailto:info@xlmarket.eu" className="text-brand-600 hover:text-brand-700 underline">info@xlmarket.eu</a>,
                märkides tellimuse numbri.
              </p>
              <p>
                <Link href="/tagastamine" className="text-brand-600 hover:text-brand-700 underline">
                  Tagastamise tingimused
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Saatke meile sõnum</h2>
          <p className="text-sm text-gray-500 mb-6">
            Kirjutage meile e-kiri ja vastame esimesel võimalusel.
          </p>
          <a
            href="mailto:info@xlmarket.eu"
            className="inline-block bg-brand-500 text-white px-6 py-3 text-sm font-medium hover:bg-brand-600 transition"
          >
            Saada e-kiri
          </a>
        </div>
      </div>
    </div>
  )
}
