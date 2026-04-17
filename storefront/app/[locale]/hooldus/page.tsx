import type { Metadata } from "next"
import Link from "@/components/SafeLink"
import { ShieldCheck, ClipboardCheck, Zap, ArrowRight, FileText, Wrench, Flame, Car, Droplets, Snowflake, Fuel } from "lucide-react"

export const metadata: Metadata = {
  title: "Service Plans & Maintenance — Your Machines Should Last a Decade | XL Market",
  description: "Three tiered service plans from €49/machine/year. Quarterly maintenance, 48h priority repair, replacement units. Plus six practical maintenance guides for café, welding, auto-shop equipment.",
}

type Plan = {
  slug: string
  name: string
  price: string
  unit: string
  pitch: string
  bullets: string[]
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    slug: "warranty",
    name: "2-Year Warranty",
    price: "Free",
    unit: "Included",
    pitch: "Every tool and machine we sell. Manufacturing defects covered.",
    bullets: [
      "Manufacturing defects — repair or replace",
      "Return shipping covered (EU)",
      "10-business-day turnaround target",
      "Service log kept on file",
    ],
  },
  {
    slug: "basic",
    name: "Service Basic",
    price: "€49",
    unit: "per machine / year",
    pitch: "Annual inspection, cleaning, wear-part check. Cheap insurance for critical gear.",
    bullets: [
      "Annual on-site or drop-off inspection",
      "Cleaning + lubrication of moving parts",
      "Wear-part audit (belts, seals, tips)",
      "Written service report",
      "Priority ordering on spare parts",
      "10% discount on replacement parts",
    ],
    popular: true,
  },
  {
    slug: "pro",
    name: "Service Pro",
    price: "€129",
    unit: "per machine / year",
    pitch: "Full on-site service, 24h diagnosis, and a replacement unit while we fix yours.",
    bullets: [
      "Everything in Service Basic",
      "Quarterly on-site maintenance (EE mainland)",
      "24-hour fault diagnosis SLA",
      "+1 year extended warranty",
      "Replacement unit during repair",
      "15% discount on parts + bulk spares",
    ],
  },
]

const ARTICLES = [
  {
    icon: Flame,
    tag: "Café equipment",
    title: "Espresso machine daily & weekly routine",
    teaser: "Five minutes a day saves the boiler. Twenty minutes weekly saves the group heads. Here is the routine we give every café we deliver to.",
  },
  {
    icon: Zap,
    tag: "Welding",
    title: "MIG welder maintenance — what actually matters",
    teaser: "Skip the myths. Three components fail first on every MIG machine: wire-feed rollers, liner, contact tip. Learn what to clean and what to replace.",
  },
  {
    icon: Car,
    tag: "Auto workshop",
    title: "2-post lift inspection: monthly & annual",
    teaser: "Cables, locks, hydraulic fluid, floor anchors. The ATEX and EU annual inspection checklist used by certified shops — applied to your own gear.",
  },
  {
    icon: Droplets,
    tag: "Pressure washers",
    title: "Why your pressure washer loses pressure",
    teaser: "Four causes cover 90% of pressure loss: clogged nozzle, worn seals, bad inlet filter, failing unloader valve. Diagnose in five minutes, fix in ten.",
  },
  {
    icon: Snowflake,
    tag: "Laser engravers",
    title: "CO2 laser tube life — from 3,000 to 12,000 hours",
    teaser: "Chiller temperature, mirror alignment, and weekly optics cleaning. Three habits that quadruple the life of a €1,200 tube.",
  },
  {
    icon: Fuel,
    tag: "Generators",
    title: "Diesel generator winter storage",
    teaser: "Fuel stabilizer, battery tender, breather seal. A 30-minute autumn routine that keeps the gen-set ready to start at −20°C.",
  },
]

export default async function HooldusPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale

  return (
    <div>
      {/* Hero */}
      <section
        className="w-full"
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[80px]">
          <nav
            className="text-[12px] font-[family-name:var(--font-dm-sans)] text-white/55 mb-[24px] flex items-center"
            aria-label="Breadcrumb"
          >
            <Link href={`/${locale}`} className="hover:text-[#D97706] transition-colors">
              Home
            </Link>
            <span className="mx-[8px] text-white/30">/</span>
            <span className="text-white/90">Service & Maintenance</span>
          </nav>
          <span className="inline-block bg-[#D97706] text-white text-[11px] font-bold uppercase tracking-[0.12em] px-[10px] py-[4px] mb-[18px]">
            Service & Maintenance
          </span>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-[800] leading-[1.05] text-white tracking-[-0.025em] max-w-[880px] mb-[18px] font-[family-name:var(--font-dm-sans)]">
            Your machines should last a decade.
          </h1>
          <p className="text-[15px] sm:text-[17px] text-white/70 max-w-[680px] leading-relaxed mb-[28px] font-[family-name:var(--font-dm-sans)]">
            Two-year warranty is standard. Add an annual service plan and the return on your espresso machine, 2-post lift, or CO2 laser gets a lot better. Three tiers — pick one and forget about it.
          </p>
          <div className="flex flex-wrap gap-[10px]">
            <a
              href="#plans"
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] bg-[#D97706] text-white text-[14px] font-[600] hover:bg-[#B45309] transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              See service plans <ArrowRight size={15} strokeWidth={2.5} />
            </a>
            <a
              href="#guides"
              className="inline-flex items-center gap-[8px] px-[22px] py-[13px] border border-white/25 text-white/90 text-[14px] font-[600] hover:border-white/50 transition-colors font-[family-name:var(--font-dm-sans)]"
            >
              Maintenance guides
            </a>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[#D97706] font-[700] mb-[6px] font-[family-name:var(--font-dm-sans)]">
          Three service tiers
        </p>
        <h2 className="text-[24px] sm:text-[32px] font-[800] text-[#1E293B] mb-[32px] font-[family-name:var(--font-dm-sans)] max-w-[720px]">
          Choose the level of insurance that matches the machine&apos;s role.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
          {PLANS.map(plan => (
            <div
              key={plan.slug}
              className={`relative border ${plan.popular ? "border-[#D97706] bg-[#FFFBEB]" : "border-[#E2E8F0] bg-white"} p-[26px] flex flex-col`}
            >
              {plan.popular ? (
                <span className="absolute top-[-12px] left-[26px] bg-[#D97706] text-white text-[10px] uppercase tracking-[0.12em] font-[700] px-[8px] py-[3px] font-[family-name:var(--font-dm-sans)]">
                  Most popular
                </span>
              ) : null}
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className={`w-[36px] h-[36px] flex items-center justify-center ${plan.popular ? "bg-[#D97706]" : "bg-[#F1F5F9]"}`}>
                  {plan.slug === "warranty" ? <ShieldCheck size={17} strokeWidth={1.8} className={plan.popular ? "text-white" : "text-[#D97706]"} /> : plan.slug === "basic" ? <ClipboardCheck size={17} strokeWidth={1.8} className={plan.popular ? "text-white" : "text-[#D97706]"} /> : <Wrench size={17} strokeWidth={1.8} className={plan.popular ? "text-white" : "text-[#D97706]"} />}
                </div>
                <h3 className="text-[18px] font-[700] text-[#1E293B] font-[family-name:var(--font-dm-sans)]">{plan.name}</h3>
              </div>
              <div className="mb-[14px]">
                <div className="text-[32px] font-[800] text-[#1E293B] leading-none tabular-nums font-[family-name:var(--font-dm-sans)]">
                  {plan.price}
                </div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-[#64748B] mt-[4px] font-[600] font-[family-name:var(--font-dm-sans)]">
                  {plan.unit}
                </div>
              </div>
              <p className="text-[13px] text-[#475569] leading-relaxed mb-[16px] font-[family-name:var(--font-dm-sans)]">
                {plan.pitch}
              </p>
              <ul className="flex flex-col gap-[6px] mb-[20px] flex-1">
                {plan.bullets.map(b => (
                  <li key={b} className="flex items-start gap-[8px] text-[13px] text-[#334155] font-[family-name:var(--font-dm-sans)]">
                    <span className="text-[#D97706] mt-[2px]">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/arikliendile#quote`}
                className={`inline-flex items-center justify-center gap-[6px] px-[20px] py-[12px] text-[13px] font-[700] transition-colors font-[family-name:var(--font-dm-sans)] ${plan.popular ? "bg-[#D97706] text-white hover:bg-[#B45309]" : "border border-[#1E293B] text-[#1E293B] hover:bg-[#1E293B] hover:text-white"}`}
              >
                Talk to a manager <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-[28px] flex flex-wrap items-center gap-[16px] text-[12.5px] text-[#64748B] font-[family-name:var(--font-dm-sans)]">
          <a href="/sample-service-agreement.pdf" className="inline-flex items-center gap-[6px] hover:text-[#D97706]">
            <FileText size={13} strokeWidth={1.8} /> Sample service agreement (PDF)
          </a>
          <span className="text-[#CBD5E1]">·</span>
          <span>Fleet of 5+ machines? Ask for an enterprise quote.</span>
        </div>
      </section>

      {/* Maintenance articles */}
      <section id="guides" className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#D97706] font-[700] mb-[6px] font-[family-name:var(--font-dm-sans)]">
            Maintenance library
          </p>
          <h2 className="text-[24px] sm:text-[32px] font-[800] text-[#1E293B] mb-[8px] font-[family-name:var(--font-dm-sans)] max-w-[680px]">
            Six practical guides. No fluff, no SEO padding.
          </h2>
          <p className="text-[14px] text-[#64748B] mb-[32px] max-w-[620px] font-[family-name:var(--font-dm-sans)]">
            Written by the technicians who service these machines — published free. Coming online throughout 2026.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            {ARTICLES.map(a => {
              const Icon = a.icon
              return (
                <article key={a.title} className="bg-white border border-[#E2E8F0] p-[22px] flex flex-col hover:border-[#D97706] transition-colors">
                  <div className="flex items-center gap-[8px] mb-[14px]">
                    <Icon size={15} strokeWidth={1.8} className="text-[#D97706]" />
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[#64748B] font-[700] font-[family-name:var(--font-dm-sans)]">
                      {a.tag}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-[700] text-[#1E293B] leading-[1.25] mb-[10px] font-[family-name:var(--font-dm-sans)]">
                    {a.title}
                  </h3>
                  <p className="text-[13px] text-[#475569] leading-relaxed mb-[16px] flex-1 font-[family-name:var(--font-dm-sans)]">
                    {a.teaser}
                  </p>
                  <span className="inline-flex items-center gap-[6px] text-[12px] font-[600] text-[#94A3B8] font-[family-name:var(--font-dm-sans)]">
                    <span className="h-[6px] w-[6px] bg-[#D97706] rounded-full" /> Coming soon
                  </span>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[56px] sm:py-[72px]">
        <div className="border border-[#1E293B] bg-[#0F172A] text-white p-[32px] sm:p-[48px] flex flex-col lg:flex-row items-start lg:items-center gap-[24px] justify-between">
          <div className="max-w-[620px]">
            <h3 className="text-[22px] sm:text-[28px] font-[800] mb-[10px] tracking-[-0.015em] font-[family-name:var(--font-dm-sans)]">
              Running a fleet? Let&apos;s build a service agreement.
            </h3>
            <p className="text-[14px] text-white/70 font-[family-name:var(--font-dm-sans)]">
              Five machines or more — fleet pricing, consolidated service calendar, single point of contact.
            </p>
          </div>
          <Link
            href={`/${locale}/arikliendile#quote`}
            className="inline-flex items-center gap-[8px] px-[26px] py-[14px] bg-[#D97706] text-white text-[14px] font-[700] hover:bg-[#B45309] transition-colors font-[family-name:var(--font-dm-sans)]"
          >
            Get a fleet quote <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </section>
    </div>
  )
}
