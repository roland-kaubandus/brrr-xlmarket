import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privaatsuspoliitika — XLMARKET",
  description: "XLMARKET privaatsuspoliitika. Kuidas me kogume, kasutame ja kaitseme teie isikuandmeid.",
}

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-brand-600">Avaleht</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Privaatsuspoliitika</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">Privaatsuspoliitika</h1>

      <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
        <p>Kehtib alates: 28.03.2026</p>

        <h2 className="text-xl font-bold mt-8 mb-3">1. Vastutav töötleja</h2>
        <p>
          Roland Kaubandus OÜ<br />
          E-post: info@xlmarket.eu<br />
          Veebileht: xlmarket.eu
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">2. Milliseid isikuandmeid me kogume</h2>
        <p>Kogume tellimuse töötlemiseks vajalikke andmeid:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Ees- ja perekonnanimi</li>
          <li>E-posti aadress</li>
          <li>Telefoninumber</li>
          <li>Tarneaadress (tänav, linn, postiindeks)</li>
          <li>Makseteave (töödeldakse turvalise makseteenuse pakkuja Montonio kaudu)</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">3. Andmete kogumise eesmärk</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Tellimuste vastuvõtmine ja täitmine</li>
          <li>Kaupade kohaletoimetamine</li>
          <li>Kliendiga suhtlemine tellimuse küsimustes</li>
          <li>Raamatupidamise nõuete täitmine</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">4. Andmete säilitamine</h2>
        <p>
          Isikuandmeid säilitame tellimuse täitmiseks vajaliku aja ning seejärel vastavalt
          raamatupidamise seadusele (7 aastat). Pärast säilitamistähtaja lõppu andmed kustutatakse.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">5. Andmete jagamine</h2>
        <p>Jagame teie andmeid ainult:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Kullerteenuse pakkujatega (kauba tarnimine)</li>
          <li>Makseteenuse pakkujaga (Montonio)</li>
          <li>Raamatupidamisteenuse osutajaga</li>
        </ul>
        <p>Me ei müü ega jaga teie andmeid kolmandatele osapooltele turunduslikel eesmärkidel.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">6. Küpsised</h2>
        <p>
          Kasutame vajalikke küpsiseid ostukorvi ja sessiooni haldamiseks. Analüütikaküpsiseid
          kasutame ainult teie nõusolekul. Täpsem info:{" "}
          <Link href="/kupsised" className="text-brand-600 hover:text-brand-700 underline">
            Küpsiste poliitika
          </Link>
          .
        </p>

        <h2 className="text-xl font-bold mt-8 mb-3">7. Teie õigused</h2>
        <p>Teil on õigus:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Saada teavet oma isikuandmete töötlemise kohta</li>
          <li>Nõuda ebaõigete andmete parandamist</li>
          <li>Nõuda andmete kustutamist (kui puudub seaduslik alus säilitamiseks)</li>
          <li>Esitada kaebus Andmekaitse Inspektsioonile (aki.ee)</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">8. Kontakt</h2>
        <p>
          Privaatsusega seotud küsimuste korral kirjutage:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-brand-600 hover:text-brand-700 underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
