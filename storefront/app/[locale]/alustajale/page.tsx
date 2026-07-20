import type { Metadata } from "next"
import Link from "@/components/SafeLink"
import { Coffee, Wrench, Scissors, Printer, UtensilsCrossed, Sparkles, CheckCircle2, ArrowRight, type LucideIcon } from "lucide-react"
import { listVerticalsByMode, localisedVertical } from "@/lib/verticals"
import { getStarterKitsCms, type CmsKit } from "@/lib/cms"
import starterKitsFallback from "@/lib/cms-fallback/starter-kits.json"

export const metadata: Metadata = {
  title: "Starter Kits — Everything Your New Business Needs | XL Market",
  description: "Six turnkey business starter packages — café, auto workshop, barber, print shop, bakery, cleaning service. One order, one invoice, one delivery. VAT 24% incl.",
}

// Map icon name (CMS string) → Lucide component
const ICON_MAP: Record<string, LucideIcon> = {
  Coffee,
  Wrench,
  Scissors,
  Printer,
  UtensilsCrossed,
  Sparkles,
}

function iconFor(name: string): LucideIcon {
  return ICON_MAP[name] ?? Coffee
}

type Kit = CmsKit

// Kits are now CMS-managed (cms_page where page_key='starter-kits').
// Content below kept as a comment for reference during migration; delete later.
/*
const LEGACY_KITS_REFERENCE = [
  {
    slug: "cafe",
    name: "Café & Coffee Shop",
    priceFrom: 8499,
    icon: Coffee,
    tagline: "Open your doors with a real espresso bar, not a compromise.",
    includes: [
      "2-group espresso machine + grinder",
      "Refrigerator & display cooler",
      "Prep table with sink",
      "Bar shelving & storage",
      "Ice machine",
      "Cups, carafes, tampers, knock-box",
    ],
    image: "cat-01-horeca-food-service.webp",
  },
  {
    slug: "auto",
    name: "Auto Workshop",
    priceFrom: 12900,
    icon: Wrench,
    tagline: "2-post lift, diagnostics, and the tooling a real garage runs on.",
    includes: [
      "2-post vehicle lift (4t)",
      "50L air compressor",
      "Tyre changer + wheel balancer",
      "Mechanic tool chest",
      "Impact wrench & air tools",
      "OBD-II diagnostic scanner",
    ],
    image: "cat-12-automotive-workshop.webp",
  },
  {
    slug: "barber",
    name: "Barber Shop",
    priceFrom: 3499,
    icon: Scissors,
    tagline: "Four chairs, one mirror wall, every tool you actually use.",
    includes: [
      "4 hydraulic barber chairs",
      "Mirror stations & styling counters",
      "UV sterilizer cabinet",
      "Backwash shampoo sink",
      "Tool trolley & waiting bench",
      "Clippers, scissors, capes",
    ],
    image: "cat-18-salon-spa-wellness.webp",
  },
  {
    slug: "print",
    name: "Print & Sign Shop",
    priceFrom: 5999,
    icon: Printer,
    tagline: "Heat press, cutter, DTF — the stack that pays its invoice in month one.",
    includes: [
      "Heat press 40×60 cm",
      "Vinyl cutter 720mm",
      "DTF printer + curing oven",
      "Transfer tapes & inks",
      "Design tablet & workstation",
      "Heavy-duty workbench",
    ],
    image: "cat-07-printing-packaging-signage.webp",
  },
  {
    slug: "bakery",
    name: "Bakery & Pastry",
    priceFrom: 7499,
    icon: UtensilsCrossed,
    tagline: "Deck oven, planetary mixer, proofer — production from day one.",
    includes: [
      "Convection or deck oven",
      "Planetary mixer (20L)",
      "Dough sheeter & proofer",
      "Refrigerated prep table",
      "Display case + bakery racks",
      "Stainless steel prep surface",
    ],
    image: "cat-01-kitchen.webp",
  },
  {
    slug: "cleaning",
    name: "Cleaning Service",
    priceFrom: 2799,
    icon: Sparkles,
    tagline: "Floor scrubber, vacuum, pressure washer — contracts start paying fast.",
    includes: [
      "Industrial wet/dry vacuum 80L",
      "Single-disc floor scrubber",
      "Carpet extractor",
      "Pressure washer",
      "Supply carts & mop systems",
      "PPE kits × 4 + sanitizers",
    ],
    image: "cat-15-cleaning-janitorial.webp",
  },
]
*/

function priceFmt(n: number) {
  return `€${n.toLocaleString("en-US")}`
}

export default async function AlustajalePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale
  const et = locale === "et"
  const cms = (await getStarterKitsCms(locale)) ?? (starterKitsFallback as unknown as { kits: CmsKit[] })
  const KITS = cms.kits

  return (
    <div>
      {/* Hero strip */}
      <section
        className="w-full"
        style={{
          background:
            "linear-gradient(135deg, #12121f 0%, #1a1a2e 60%, #12121f 100%)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[80px]">
          <nav
            className="text-[12px] font-[family-name:var(--font-dm-sans)] text-white/55 mb-[24px] flex items-center"
            aria-label="Breadcrumb"
          >
            <Link href={`/${locale}`} className="hover:text-[#0b7d79] transition-colors">
              {et ? "Avaleht" : "Home"}
            </Link>
            <span className="mx-[8px] text-white/30">/</span>
            <span className="text-white/90">{et ? "Stardikomplektid" : "Starter Kits"}</span>
          </nav>
          <span className="inline-block bg-[#0ea5a0] text-white text-[11px] font-bold uppercase tracking-[0.12em] px-[10px] py-[4px] mb-[18px]">
            {et ? "Stardikomplektid" : "Starter Kits"}
          </span>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-[800] leading-[1.05] text-white tracking-[-0.025em] max-w-[880px] mb-[18px] font-[family-name:var(--font-dm-sans)]">
            {et ? "Kõik, mida su uus äri vajab. Üks tellimus." : "Everything your new business needs. One order."}
          </h1>
          <p className="text-[15px] sm:text-[17px] text-white/70 max-w-[680px] leading-relaxed mb-[28px] font-[family-name:var(--font-dm-sans)]">
            {et
              ? "Kuus võtmed-kätte seadmekomplekti, kokku pandud meie 16 000+ toote kataloogist. Üks arve, üks tarne, üks kliendihaldur. Käibemaks 24% sees — kassas üllatusi ei tule."
              : "Six turnkey equipment packages, assembled from our 16,000+ product catalogue. One invoice, one delivery, one account manager. VAT 24% included — no surprises at checkout."}
          </p>
          <div className="flex flex-wrap gap-[10px]">
            <Link
              href={`/${locale}/arikliendile`}
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] bg-[#0ea5a0] text-white text-[14px] font-[600] hover:bg-[#0b7d79] transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              {et ? "Küsi kohandatud pakkumist" : "Request a custom quote"} <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
            <a
              href="#kits"
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] border border-white/25 text-white/90 text-[14px] font-[600] hover:border-white/50 transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              {et ? "Vaata kõiki kuut komplekti" : "See all six kits"}
            </a>
          </div>
        </div>
      </section>

      {/* Live verticals (F4 pilots) */}
      <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[48px] sm:pt-[64px] pb-[16px]">
        <div className="flex items-end justify-between mb-[24px] flex-wrap gap-[12px]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#0b7d79] font-[700] mb-[6px] font-[family-name:var(--font-dm-sans)]">
              {et ? "Nüüd elus · 3 valdkonda" : "Now live · 3 verticals"}
            </p>
            <h2 className="text-[24px] sm:text-[32px] font-[800] text-[#1a1a2e] font-[family-name:var(--font-dm-sans)]">
              {et ? "Alusta oma äri ühelt lehelt" : "Start your business on a single page"}
            </h2>
          </div>
          <p className="text-[13px] text-[#64748B] max-w-[360px] font-[family-name:var(--font-dm-sans)]">
            {et ? "Iga valdkond: 3-tasemeline stardikomplekt, KKK, tarne tegelikkus, finantseerimisinfo." : "Every vertical: 3-tier starter kit, FAQ, delivery reality, financing info."}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
          {listVerticalsByMode("alustajale").map((v) => {
            const l = localisedVertical(v, locale)
            return (
              <Link
                key={v.slug}
                href={`/${locale}/alustajale/${v.slug}`}
                className="group border border-[#1a1a2e] bg-[#12121f] text-white hover:bg-[#1a1a2e] transition-colors p-[22px] flex flex-col"
              >
                <div className="flex items-start justify-between mb-[12px]">
                  <span className="inline-block bg-[#0ea5a0] text-white text-[10px] font-bold uppercase tracking-[0.12em] px-[8px] py-[3px]">
                    {et ? "Valdkond" : "Vertical"}
                  </span>
                  <ArrowRight size={16} strokeWidth={2.2} className="text-white/40 group-hover:text-[#0b7d79] group-hover:translate-x-[2px] transition-all" />
                </div>
                <h3 className="text-[20px] font-[800] mb-[8px] font-[family-name:var(--font-dm-sans)]">
                  {l.name}
                </h3>
                <p className="text-[13px] text-white/70 leading-relaxed font-[family-name:var(--font-dm-sans)] flex-1">
                  {l.tagline}
                </p>
                <div className="mt-[16px] pt-[14px] border-t border-white/10 text-[11px] text-white/50 font-[family-name:var(--font-dm-sans)]">
                  {et ? "3 taset · KKK · Tarne · Finantseerimine" : "3 tiers · FAQ · Delivery · Financing"}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Kits grid */}
      <section id="kits" className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
        <div className="flex items-end justify-between mb-[28px] flex-wrap gap-[12px]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#0b7d79] font-[700] mb-[6px] font-[family-name:var(--font-dm-sans)]">
              {et ? "Kuus valmis komplekti" : "Six ready kits"}
            </p>
            <h2 className="text-[24px] sm:text-[32px] font-[800] text-[#1a1a2e] font-[family-name:var(--font-dm-sans)]">
              {et ? "Vali see, mis sobib su avatava äriga." : "Pick the one that matches what you are opening."}
            </h2>
          </div>
          <p className="text-[13px] text-[#64748B] max-w-[360px] font-[family-name:var(--font-dm-sans)]">
            {et ? "Iga komplekt on lähtepunkt — kohandame konfiguratsiooni sinu ruumi ja eelarve järgi pakkumise käigus." : "Every kit is a starting point — we adjust the configuration to your space and budget during the quote."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px] sm:gap-[24px]">
          {KITS.map(kit => {
            const Icon = iconFor(kit.icon)
            return (
              <article
                key={kit.slug}
                className="border border-[#E2E8F0] bg-white flex flex-col hover:border-[#0ea5a0] transition-colors"
              >
                <div
                  className="w-full aspect-[16/10] bg-center bg-cover"
                  style={{ backgroundImage: `url(/images/${kit.image})` }}
                />
                <div className="p-[22px] flex flex-col flex-1">
                  <div className="flex items-center gap-[10px] mb-[12px]">
                    <div className="w-[32px] h-[32px] bg-[#f0fdf9] flex items-center justify-center">
                      <Icon size={16} strokeWidth={1.8} className="text-[#0b7d79]" />
                    </div>
                    <h3 className="text-[18px] font-[700] text-[#1a1a2e] font-[family-name:var(--font-dm-sans)] flex-1">
                      {kit.name}
                    </h3>
                  </div>
                  <p className="text-[13px] text-[#475569] leading-relaxed mb-[16px] font-[family-name:var(--font-dm-sans)]">
                    {kit.tagline}
                  </p>
                  <ul className="flex flex-col gap-[6px] mb-[18px] flex-1">
                    {kit.includes.map(item => (
                      <li key={item} className="flex items-start gap-[8px] text-[12.5px] text-[#334155] font-[family-name:var(--font-dm-sans)]">
                        <CheckCircle2 size={13} strokeWidth={2} className="text-[#0b7d79] mt-[3px] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-[14px] border-t border-[#F1F5F9] flex items-end justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-[#94A3B8] font-[600] font-[family-name:var(--font-dm-sans)]">
                        {et ? "Alates" : "From"}
                      </div>
                      <div className="text-[22px] font-[800] text-[#1a1a2e] tabular-nums font-[family-name:var(--font-dm-sans)]">
                        {priceFmt(kit.priceFrom)}
                      </div>
                      <div className="text-[10px] text-[#94A3B8] font-[family-name:var(--font-dm-sans)]">
                        {et ? "Käibemaks 24% sees" : "VAT 24% incl."}
                      </div>
                    </div>
                    <Link
                      href={`/${locale}/arikliendile#quote`}
                      className="inline-flex items-center gap-[6px] text-[13px] font-[600] text-[#0b7d79] hover:text-[#0b7d79] font-[family-name:var(--font-dm-sans)]"
                    >
                      {et ? "Küsi pakkumist" : "Request quote"} <ArrowRight size={13} strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* Why section */}
      <section className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[48px] sm:py-[64px]">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-[24px]">
            {[
              et
                ? { k: "Üks tellimus", v: "Iga masin, tarvik ja varuosa samalt arvelt ja samast tarnest." }
                : { k: "One order", v: "Every machine, accessory, and spare from the same invoice and delivery." },
              et
                ? { k: "Kaheaastane garantii", v: "Iga tööriist, masin ja seade. Pikendused saadaval." }
                : { k: "Two-year warranty", v: "Every tool, machine, and appliance. Extensions available." },
              et
                ? { k: "Net-30 kinnitatud ettevõtetele", v: "Maksa pärast uste avamist. Hulgitellimustel puudub kaardimakse lisatasu." }
                : { k: "Net-30 for approved businesses", v: "Pay after you open the doors. No card surcharge on bulk orders." },
              et
                ? { k: "Päris inimesed, mitte portaal", v: "Üks kliendihaldur pakkumisest tarneni ja hoolduseni." }
                : { k: "Real people, not a portal", v: "One account manager from quote to delivery to service." },
            ].map(item => (
              <div key={item.k}>
                <div className="text-[14px] font-[700] text-[#1a1a2e] mb-[6px] font-[family-name:var(--font-dm-sans)]">
                  {item.k}
                </div>
                <div className="text-[13px] text-[#475569] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
        <div className="border border-[#1a1a2e] bg-[#12121f] text-white p-[32px] sm:p-[48px] flex flex-col lg:flex-row items-start lg:items-center gap-[24px] justify-between">
          <div className="max-w-[620px]">
            <h3 className="text-[22px] sm:text-[28px] font-[800] mb-[10px] tracking-[-0.015em] font-[family-name:var(--font-dm-sans)]">
              {et ? "Ei sobi täpselt sinu äriga? Ehitame kohandatud komplekti." : "Not exactly your business? Let’s build a custom kit."}
            </h3>
            <p className="text-[14px] text-white/70 font-[family-name:var(--font-dm-sans)]">
              {et ? "Räägi meile, mida avad, ja saadame seadistatud pakkumise 48 tunni jooksul." : "Tell us what you are opening and we return a configured quote within 48 hours."}
            </p>
          </div>
          <Link
            href={`/${locale}/arikliendile#quote`}
            className="inline-flex items-center gap-[8px] px-[26px] py-[14px] bg-[#0ea5a0] text-white text-[14px] font-[700] hover:bg-[#0b7d79] transition-colors font-[family-name:var(--font-dm-sans)]"
          >
            {et ? "Räägi kliendihalduriga" : "Talk to an account manager"} <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </section>
    </div>
  )
}
