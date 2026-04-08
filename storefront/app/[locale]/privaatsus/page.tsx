import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privaatsuspoliitika — XLMARKET",
  description: "XLMARKET privaatsuspoliitika. Kuidas me kogume, kasutame ja kaitseme teie isikuandmeid.",
}

export default async function PrivaatsusPage({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      <nav className="text-[12px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[32px]" aria-label="Breadcrumb">
        <Link href={`/${(await params).locale}`} className="hover:text-[#D97706] transition-colors">Home</Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Privacy Policy</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[32px]">Privacy Policy</h1>

      <div className="max-w-[720px] text-[14px] font-[family-name:var(--font-dm-sans)] text-[#555555] leading-relaxed space-y-[16px]">
        <p>Kehtib alates: 28.03.2026</p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">1. Vastutav töötleja</h2>
        <p>
          Roland Kaubandus OÜ<br />
          E-post: info@xlmarket.eu<br />
          Veebileht: xlmarket.eu
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">2. Milliseid isikuandmeid me kogume</h2>
        <p>Kogume tellimuse töötlemiseks vajalikke andmeid:</p>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Ees- ja perekonnanimi</li>
          <li>E-posti aadress</li>
          <li>Telefoninumber</li>
          <li>Tarneaadress (tänav, linn, postiindeks)</li>
          <li>Makseteave (töödeldakse turvalise makseteenuse pakkuja Montonio kaudu)</li>
        </ul>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">3. Andmete kogumise eesmärk</h2>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Tellimuste vastuvõtmine ja täitmine</li>
          <li>Kaupade kohaletoimetamine</li>
          <li>Kliendiga suhtlemine tellimuse küsimustes</li>
          <li>Raamatupidamise nõuete täitmine</li>
        </ul>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">4. Andmete säilitamine</h2>
        <p>
          Isikuandmeid säilitame tellimuse täitmiseks vajaliku aja ning seejärel vastavalt
          raamatupidamise seadusele (7 aastat). Pärast säilitamistähtaja lõppu andmed kustutatakse.
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">5. Andmete jagamine</h2>
        <p>Jagame teie andmeid ainult:</p>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Kullerteenuse pakkujatega (kauba tarnimine)</li>
          <li>Makseteenuse pakkujaga (Montonio)</li>
          <li>Raamatupidamisteenuse osutajaga</li>
        </ul>
        <p>Me ei müü ega jaga teie andmeid kolmandatele osapooltele turunduslikel eesmärkidel.</p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">6. Küpsised</h2>
        <p>
          Kasutame vajalikke küpsiseid ostukorvi ja sessiooni haldamiseks. Analüütikaküpsiseid
          kasutame ainult teie nõusolekul. Täpsem info:{" "}
          <Link href={`/${(await params).locale}/kupsised`} className="text-[#E8650A] hover:text-[#CF5A08] underline">
            Küpsiste poliitika
          </Link>
          .
        </p>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">7. Teie õigused</h2>
        <p>Teil on õigus:</p>
        <ul className="list-disc pl-[20px] space-y-[6px] text-[14px] text-[#555555] font-[family-name:var(--font-dm-sans)]">
          <li>Saada teavet oma isikuandmete töötlemise kohta</li>
          <li>Nõuda ebaõigete andmete parandamist</li>
          <li>Nõuda andmete kustutamist (kui puudub seaduslik alus säilitamiseks)</li>
          <li>Esitada kaebus Andmekaitse Inspektsioonile (aki.ee)</li>
        </ul>

        <h2 className="text-[18px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mt-[32px] mb-[12px]">8. Kontakt</h2>
        <p>
          Privaatsusega seotud küsimuste korral kirjutage:{" "}
          <a href="mailto:info@xlmarket.eu" className="text-[#E8650A] hover:text-[#CF5A08] underline">
            info@xlmarket.eu
          </a>
        </p>
      </div>
    </div>
  )
}
