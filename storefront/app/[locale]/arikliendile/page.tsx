import type { Metadata } from "next"
import Link from "@/components/SafeLink"
import {
  UserCheck,
  Receipt,
  BarChart3,
  Truck,
  Wrench,
  ShieldCheck,
  ArrowRight,
  FileText,
  Mail,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Business Customers — Net-30, Volume Pricing, Dedicated Manager | XL Market",
  description: "B2B account management for Estonian and EU businesses. Net-30 terms, volume pricing from 3%, dedicated account manager, custom equipment bundles, priority shipping.",
}

const BENEFITS = [
  {
    icon: UserCheck,
    title_en: "Dedicated account manager",
    title_et: "Personaalne kliendihaldur",
    body_en: "One person who knows your order. No phone trees. Estonian or English, whichever you prefer.",
    body_et: "Üks inimene, kes tunneb sinu tellimust. Mingeid telefonimenüüsid. Eesti või inglise keeles, kumb sulle sobib.",
  },
  {
    icon: Receipt,
    title_en: "Net-30 invoicing",
    title_et: "Net-30 arveldus",
    body_en: "Approved businesses pay 30 days after delivery. No credit card surcharge on large orders.",
    body_et: "Kinnitatud ettevõtted maksavad 30 päeva pärast tarnet. Suurte tellimuste puhul puudub kaardimakse lisatasu.",
  },
  {
    icon: BarChart3,
    title_en: "Volume pricing",
    title_et: "Mahuhinnad",
    body_en: "5 units −3%, 10 units −7%, 20+ units we negotiate. Stacks with annual supply contracts.",
    body_et: "5 ühikut −3%, 10 ühikut −7%, 20+ ühikut räägime läbi. Liitub aastaste tarnelepingutega.",
  },
  {
    icon: Truck,
    title_en: "Priority shipping",
    title_et: "Eelistarne",
    body_en: "Business orders jump the queue. Usually two-to-three days faster than retail.",
    body_et: "Äritellimused liiguvad järjekorras ette. Tavaliselt kaks-kolm päeva kiiremini kui jaemüügis.",
  },
  {
    icon: Wrench,
    title_en: "Custom kit builder",
    title_et: "Kohandatud komplekti koostamine",
    body_en: "Standard starter kits don't fit? Tell us the shop, the space, the budget — we configure.",
    body_et: "Tavalised stardikomplektid ei sobi? Räägi meile ärist, ruumist, eelarvest — meie seadistame.",
  },
  {
    icon: ShieldCheck,
    title_en: "Two-year warranty included",
    title_et: "Kaheaastane garantii kaasas",
    body_en: "Every machine. Extendable to three or five years with a service agreement.",
    body_et: "Iga masin. Hoolduslepinguga pikendatav kolme või viie aastani.",
  },
]

const STEPS = [
  {
    n: "01",
    title_en: "Tell us what you need",
    title_et: "Räägi meile, mida vajad",
    body_en: "A short form: company, VAT number, industry, product categories, rough volume. 30 seconds.",
    body_et: "Lühike vorm: ettevõte, KMKR number, tegevusala, tootekategooriad, ligikaudne maht. 30 sekundit.",
  },
  {
    n: "02",
    title_en: "Quote in 24 hours",
    title_et: "Pakkumine 24 tunni jooksul",
    body_en: "An account manager calls or sends an Estonian-language PDF quote. Not a sales pitch — a consultation.",
    body_et: "Kliendihaldur helistab või saadab eestikeelse PDF-pakkumise. Mitte müügijutt — konsultatsioon.",
  },
  {
    n: "03",
    title_en: "We deliver, you open",
    title_et: "Meie tarnime, sina avad",
    body_en: "Logistics and install included where relevant. Service plan starts day one.",
    body_et: "Logistika ja paigaldus kaasas seal, kus asjakohane. Hoolduskava algab esimesest päevast.",
  },
]

export default async function AriklendileePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale
  const et = locale === "et"

  return (
    <div>
      {/* Hero */}
      <section
        className="w-full"
        style={{
          background:
            "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[80px]">
          <nav
            className="text-[12px] font-[family-name:var(--font-dm-sans)] text-white/55 mb-[24px] flex items-center"
            aria-label="Breadcrumb"
          >
            <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">
              {et ? "Avaleht" : "Home"}
            </Link>
            <span className="mx-[8px] text-white/30">/</span>
            <span className="text-white/90">{et ? "Ärikliendile" : "Business Customers"}</span>
          </nav>
          <span className="inline-block bg-[#D97706] text-white text-[11px] font-bold uppercase tracking-[0.12em] px-[10px] py-[4px] mb-[18px]">
            {et ? "B2B konto" : "B2B Account"}
          </span>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-[800] leading-[1.05] text-white tracking-[-0.025em] max-w-[880px] mb-[18px] font-[family-name:var(--font-dm-sans)]">
            {et ? "Net-30, mahuhinnad, päris inimesed." : "Net-30, volume pricing, real humans."}
          </h1>
          <p className="text-[15px] sm:text-[17px] text-white/70 max-w-[680px] leading-relaxed mb-[28px] font-[family-name:var(--font-dm-sans)]">
            {et
              ? "Personaalne kliendihaldur, kohandatud seadmekomplektid, eelistarne ja pikendatud garantii. Nii peakski B2B hanked toimima — inimene, pakkumine, tarne."
              : "Dedicated account manager, custom equipment bundles, priority shipping, and extended warranty. The way B2B procurement should work — a person, a quote, a delivery."}
          </p>
          <div className="flex flex-wrap gap-[10px]">
            <a
              href="#quote"
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] bg-[#D97706] text-white text-[14px] font-[600] hover:bg-[#B45309] transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              {et ? "Küsi pakkumist" : "Request a quote"} <ArrowRight size={15} strokeWidth={2.5} />
            </a>
            <Link
              href={`/${locale}/alustajale`}
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] border border-white/25 text-white/90 text-[14px] font-[600] hover:border-white/50 transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              {et ? "Stardikomplektid alates €2,799" : "Starter kits from €2,799"}
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits grid */}
      <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[#D97706] font-[700] mb-[6px] font-[family-name:var(--font-dm-sans)]">
          {et ? "Miks osta B2B leti kaudu" : "Why buy through the B2B desk"}
        </p>
        <h2 className="text-[24px] sm:text-[32px] font-[800] text-[#1E293B] mb-[32px] font-[family-name:var(--font-dm-sans)] max-w-[680px]">
          {et ? "Kuus asja, mida avalik kassa sulle teha ei suuda." : "Six things the public checkout cannot do for you."}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px] sm:gap-[24px]">
          {BENEFITS.map(b => {
            const Icon = b.icon
            return (
              <div key={b.title_en} className="border border-[#E2E8F0] p-[22px] bg-white hover:border-[#D97706] transition-colors">
                <div className="w-[38px] h-[38px] bg-[#FFFBEB] flex items-center justify-center mb-[16px]">
                  <Icon size={18} strokeWidth={1.6} className="text-[#D97706]" />
                </div>
                <h3 className="text-[16px] font-[700] text-[#1E293B] mb-[8px] font-[family-name:var(--font-dm-sans)]">
                  {et ? b.title_et : b.title_en}
                </h3>
                <p className="text-[13px] text-[#475569] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                  {et ? b.body_et : b.body_en}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Volume pricing band */}
      <section className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[40px] sm:py-[56px]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-[20px]">
            {[
              { k: et ? "5+ ühikut" : "5+ units", v: "−3%" },
              { k: et ? "10+ ühikut" : "10+ units", v: "−7%" },
              { k: et ? "20+ ühikut" : "20+ units", v: et ? "läbiräägitav" : "negotiated" },
              { k: et ? "Aastaleping" : "Annual contract", v: et ? "liituv soodustus" : "stacked discount" },
            ].map(item => (
              <div key={item.k} className="flex flex-col">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#94A3B8] mb-[4px] font-[600] font-[family-name:var(--font-dm-sans)]">
                  {item.k}
                </div>
                <div className="text-[28px] font-[800] text-[#1E293B] tabular-nums font-[family-name:var(--font-dm-sans)]">
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-step process */}
      <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[#D97706] font-[700] mb-[6px] font-[family-name:var(--font-dm-sans)]">
          {et ? "Kuidas see käib" : "How it works"}
        </p>
        <h2 className="text-[24px] sm:text-[32px] font-[800] text-[#1E293B] mb-[32px] font-[family-name:var(--font-dm-sans)] max-w-[680px]">
          {et ? "Kolm sammu. Esimesed kaks on tasuta." : "Three steps. First two are free."}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
          {STEPS.map(step => (
            <div key={step.n} className="border-t-2 border-[#D97706] pt-[18px]">
              <div className="text-[36px] font-[800] text-[#D97706] tabular-nums leading-none mb-[10px] font-[family-name:var(--font-dm-sans)]">
                {step.n}
              </div>
              <h3 className="text-[18px] font-[700] text-[#1E293B] mb-[10px] font-[family-name:var(--font-dm-sans)]">
                {et ? step.title_et : step.title_en}
              </h3>
              <p className="text-[13.5px] text-[#475569] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                {et ? step.body_et : step.body_en}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quote form block */}
      <section id="quote" className="bg-[#0F172A]">
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[80px]">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-[32px] lg:gap-[56px]">
            <div className="lg:col-span-2">
              <span className="inline-block bg-[#D97706] text-white text-[11px] font-bold uppercase tracking-[0.12em] px-[10px] py-[4px] mb-[18px]">
                {et ? "Alusta siit" : "Start here"}
              </span>
              <h2 className="text-[28px] sm:text-[36px] font-[800] text-white tracking-[-0.02em] mb-[16px] font-[family-name:var(--font-dm-sans)]">
                {et ? "Räägi meile, mida vajad." : "Tell us what you need."}
              </h2>
              <p className="text-[14px] text-white/65 leading-relaxed mb-[24px] font-[family-name:var(--font-dm-sans)]">
                {et
                  ? "Vastame igale pakkumispäringule alla 24 tööpäeva tunni jooksul. Kui tegu on suurema sisustusprojektiga, lepime kokku 30-minutilise kõne ja vaatame ruumi koos üle."
                  : "We answer every quote request in under 24 business hours. If it is a bigger fit-out, we book a 30-minute call and walk the space together."}
              </p>
              <div className="flex flex-col gap-[10px]">
                <a
                  href="mailto:b2b@xlmarket.ee?subject=B2B quote request"
                  className="inline-flex items-center gap-[10px] text-[14px] text-white/90 hover:text-[#D97706] transition-colors font-[family-name:var(--font-dm-sans)]"
                >
                  <Mail size={15} strokeWidth={1.8} /> b2b@xlmarket.ee
                </a>
                <a
                  href="/sample-b2b-agreement.pdf"
                  className="inline-flex items-center gap-[10px] text-[14px] text-white/90 hover:text-[#D97706] transition-colors font-[family-name:var(--font-dm-sans)]"
                >
                  <FileText size={15} strokeWidth={1.8} /> {et ? "Näidis B2B leping (PDF)" : "Sample B2B agreement (PDF)"}
                </a>
              </div>
            </div>

            <form
              className="lg:col-span-3 bg-white p-[24px] sm:p-[32px] flex flex-col gap-[14px]"
              action="mailto:b2b@xlmarket.ee"
              method="post"
              encType="text/plain"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-[600] text-[#64748B] font-[family-name:var(--font-dm-sans)]">{et ? "Ettevõte" : "Company"}</span>
                  <input required name="company" type="text" className="border border-[#CBD5E1] px-[12px] py-[10px] text-[14px] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[#D97706]" />
                </label>
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-[600] text-[#64748B] font-[family-name:var(--font-dm-sans)]">{et ? "KMKR number" : "VAT number"}</span>
                  <input name="vat" type="text" className="border border-[#CBD5E1] px-[12px] py-[10px] text-[14px] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[#D97706]" />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-[600] text-[#64748B] font-[family-name:var(--font-dm-sans)]">{et ? "Kontaktisik" : "Contact name"}</span>
                  <input required name="name" type="text" className="border border-[#CBD5E1] px-[12px] py-[10px] text-[14px] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[#D97706]" />
                </label>
                <label className="flex flex-col gap-[6px]">
                  <span className="text-[11px] uppercase tracking-[0.08em] font-[600] text-[#64748B] font-[family-name:var(--font-dm-sans)]">{et ? "E-post" : "Email"}</span>
                  <input required name="email" type="email" className="border border-[#CBD5E1] px-[12px] py-[10px] text-[14px] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[#D97706]" />
                </label>
              </div>
              <label className="flex flex-col gap-[6px]">
                <span className="text-[11px] uppercase tracking-[0.08em] font-[600] text-[#64748B] font-[family-name:var(--font-dm-sans)]">{et ? "Mida sa sisustad?" : "What are you setting up?"}</span>
                <select name="industry" className="border border-[#CBD5E1] px-[12px] py-[10px] text-[14px] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[#D97706] bg-white">
                  <option>{et ? "Kohvik / HoReCa" : "Café / HoReCa"}</option>
                  <option>{et ? "Autoremonditöökoda" : "Auto workshop"}</option>
                  <option>{et ? "Juuksur / salong" : "Barber / salon"}</option>
                  <option>{et ? "Trükk / sildid" : "Print / signage"}</option>
                  <option>{et ? "Pagariäri / toidutootmine" : "Bakery / food production"}</option>
                  <option>{et ? "Koristus / puhastus" : "Cleaning / janitorial"}</option>
                  <option>{et ? "Keevitus / metallitööd" : "Welding / metalworking"}</option>
                  <option>{et ? "Laser / CNC" : "Laser / CNC"}</option>
                  <option>{et ? "Ehitus" : "Construction"}</option>
                  <option>{et ? "Muu" : "Other"}</option>
                </select>
              </label>
              <label className="flex flex-col gap-[6px]">
                <span className="text-[11px] uppercase tracking-[0.08em] font-[600] text-[#64748B] font-[family-name:var(--font-dm-sans)]">{et ? "Räägi paari lausega" : "Tell us in a few sentences"}</span>
                <textarea required name="message" rows={4} className="border border-[#CBD5E1] px-[12px] py-[10px] text-[14px] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[#D97706] resize-y" placeholder={et ? "Ruumi suurus, ligikaudne eelarve, ajakava, juba olemasolevad seadmed." : "Size of space, rough budget, timeline, any equipment you already have."} />
              </label>
              <button type="submit" className="mt-[6px] inline-flex items-center justify-center gap-[8px] px-[22px] py-[13px] bg-[#D97706] text-white text-[14px] font-[700] hover:bg-[#B45309] transition-colors font-[family-name:var(--font-dm-sans)]">
                {et ? "Saada päring" : "Send request"} <ArrowRight size={15} strokeWidth={2.5} />
              </button>
              <p className="text-[11px] text-[#94A3B8] font-[family-name:var(--font-dm-sans)]">
                {et ? "Vastame 24 tööpäeva tunni jooksul. Mingit rämpsposti, mingeid müügikõnesid, kui sa ise ei palu." : "We reply within 24 business hours. No spam, no sales calls unless you ask."}
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
