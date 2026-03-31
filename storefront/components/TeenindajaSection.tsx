import Link from "next/link"
import { Compass, Search, Headphones } from "lucide-react"

const cards = [
  {
    Icon: Compass,
    title: "Avasta",
    desc: "Sirvi kategooriaid ja leia ise sobivad tooted",
    cta: "Sirvi kategooriaid",
    href: "/kategooriad",
  },
  {
    Icon: Search,
    title: "Otsi",
    desc: "Tead juba, mida otsid? Kirjuta m\u00e4rks\u00f5na ja leiad kohe",
    cta: "Otsi tooteid",
    href: "/otsing",
  },
  {
    Icon: Headphones,
    title: "K\u00fcsi m\u00fc\u00fcjalt",
    desc: "Las m\u00fc\u00fcja aitab algusest l\u00f5puni \u2014 kirjelda, mida vajad",
    cta: "Kutsu m\u00fc\u00fcja",
    href: "/otsing",
  },
]

export default function TeenindajaSection() {
  return (
    <section id="kuidas-see-tootab" className="py-[64px] sm:py-[80px] lg:py-[96px]">
      <div className="max-w-[1400px] mx-auto px-[16px] sm:px-[24px]">
        <div
          className="rounded-[2rem] px-[24px] py-[48px] sm:px-[48px] sm:py-[64px] lg:px-[64px] lg:py-[80px]"
          style={{ background: "#1A1A1A" }}
        >
          {/* Heading */}
          <div className="text-center mb-[48px]">
            <p
              className="text-[13px] font-[600] font-[family-name:var(--font-poppins)] text-zinc-400 tracking-[0.08em] uppercase mb-[12px]"
            >
              Vali oma tee
            </p>
            <h2
              className="font-[800] font-[family-name:var(--font-outfit)] text-white leading-[1.1] tracking-[-0.02em]"
              style={{ fontSize: "clamp(28px, 4vw, 44px)", textWrap: "balance" } as React.CSSProperties}
            >
              {"Mida siin poes teha saab?"}
            </h2>
          </div>

          {/* 3 cards in a row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[20px]">
            {cards.map((card) => (
              <div
                key={card.title}
                className="group rounded-2xl border border-white/10 p-[32px] hover:-translate-y-[4px]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(8px)",
                  transition: "all 0.3s cubic-bezier(0.32,0.72,0,1)",
                }}
              >
                {/* Icon */}
                <div
                  className="w-[56px] h-[56px] rounded-xl flex items-center justify-center mb-[20px]"
                  style={{ background: "rgba(232,101,10,0.10)" }}
                >
                  <card.Icon size={24} strokeWidth={1.5} className="text-[#E8650A]" />
                </div>

                {/* Title */}
                <h3
                  className="text-[18px] font-[700] font-[family-name:var(--font-outfit)] text-white mb-[10px]"
                >
                  {card.title}
                </h3>

                {/* Description */}
                <p
                  className="text-[14px] font-[family-name:var(--font-jakarta)] text-zinc-400 leading-[1.7] mb-[20px]"
                >
                  {card.desc}
                </p>

                {/* CTA link */}
                <Link
                  href={card.href}
                  className="inline-flex items-center gap-[6px] text-[14px] font-[600] font-[family-name:var(--font-poppins)] text-[#E8650A] hover:text-[#FF8C42]"
                  style={{ transition: "color 0.18s" }}
                >
                  {card.cta}
                  <span className="group-hover:translate-x-[3px] transition-transform duration-200">{"\u2192"}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
