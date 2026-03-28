import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Meist — XLMARKET",
  description: "XLMARKET — kvaliteetsed tööriistad ja seadmed soodsa hinnaga. Suur valik, väike hind.",
}

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-amber-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Meist</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Meist</h1>

      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
        <p className="text-base">
          XLMARKET on Eesti e-pood, mis pakub kvaliteetseid tööriistu, seadmeid ja kodukaupa
          soodsa hinnaga. Meie eesmärk on muuta professionaalsed tööriistad kättesaadavaks igaühele.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">Mida me pakume</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Üle 10 000 toote 11 kategoorias</li>
          <li>Tööriistad ja seadmed professionaalile ja harrastajale</li>
          <li>Kodu- ja aiakaup</li>
          <li>Autovarustus ja garaaži tarvikud</li>
          <li>Spordi- ja vabaaja tarbed</li>
          <li>Elektroonika ja tööstusseadmed</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">Meie väärtused</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Soodne hind</strong> — otsetarnimine tootjalt hoiab hinnad madalana</li>
          <li><strong>Lai valik</strong> — tuhanded tooted ühes kohas</li>
          <li><strong>Usaldusväärne teenindus</strong> — 14-päevane taganemisõigus ja 2 aasta garantii</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">Ettevõte</h2>
        <p>
          XLMARKET on Roland Kaubandus OÜ kaubamärk.
        </p>
        <p>
          Küsimused?{" "}
          <Link href="/kontakt" className="text-amber-600 hover:text-amber-700 underline">
            Võtke meiega ühendust
          </Link>
        </p>
      </div>
    </div>
  )
}
