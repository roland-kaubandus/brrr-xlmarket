"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

const popularQueries = [
  "Garaži põrand vajab katet",
  "Koera aedik õue",
  "Tööstuslik veepump",
  "Restorani köögi sisustus",
]

export default function AiDiscoveryCard() {
  const [value, setValue] = useState("")
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) {
      router.push(`/otsing?q=${encodeURIComponent(trimmed)}`)
    }
  }

  function handleTagClick(tag: string) {
    router.push(`/otsing?q=${encodeURIComponent(tag)}`)
  }

  return (
    <section className="py-[64px] sm:py-[80px] lg:py-[96px]">
      <div className="max-w-3xl mx-auto px-[16px] sm:px-[24px]">
        {/* Outer bezel */}
        <div
          className="p-[8px] rounded-[2rem]"
          style={{
            background: "rgba(0,0,0,0.05)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
          }}
        >
          {/* Inner card */}
          <div
            className="bg-white p-[32px] sm:p-[40px] lg:p-[48px]"
            style={{ borderRadius: "calc(2rem - 0.5rem)" }}
          >
            {/* Eyebrow */}
            <span className="inline-block text-[11px] font-[600] font-[family-name:var(--font-poppins)] text-[#E8650A] tracking-[0.14em] uppercase mb-[16px]">
              Proovi järele
            </span>

            {/* Headline */}
            <h2
              className="font-[700] font-[family-name:var(--font-outfit)] text-[#1A1A1A] leading-[1.15] tracking-[-0.02em] mb-[12px]"
              style={{
                fontSize: "clamp(24px, 3.5vw, 36px)",
                textWrap: "balance",
              } as React.CSSProperties}
            >
              Kirjelda, mida kavatsed teha
            </h2>

            {/* Subtext */}
            <p className="text-[15px] sm:text-[16px] font-[family-name:var(--font-jakarta)] text-[#555555] leading-[1.7] mb-[28px] max-w-[520px]">
              Kirjuta vabas vormis, mida kavatsed teha. Saad personaalsed
              tootesoovitused koos hindade ja arvustustega.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mb-[28px]">
              <textarea
                rows={4}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Nt: Tahan ehitada terrassile pergola, vajan puidutööriista ja kinnitusmateriale..."
                className="w-full px-[16px] py-[14px] text-[15px] font-[family-name:var(--font-jakarta)] text-[#1A1A1A] placeholder:text-[#AAAAAA] border border-[#E8E8E8] rounded-xl resize-none focus:outline-none focus:border-[#E8650A] focus:ring-2 focus:ring-[#E8650A]/10 mb-[16px]"
                style={{ background: "#FAFAFA" }}
              />
              <button
                type="submit"
                className="group inline-flex items-center justify-center gap-[8px] bg-[#E8650A] text-white px-[24px] py-[14px] text-[15px] font-[600] font-[family-name:var(--font-poppins)] rounded-xl hover:bg-[#CF5A08] active:scale-[0.98] w-full sm:w-auto"
                style={{
                  boxShadow:
                    "0 4px 20px rgba(232,101,10,0.28), 0 1px 0 rgba(255,255,255,0.12) inset",
                  transition: "all 0.25s cubic-bezier(0.32,0.72,0,1)",
                }}
              >
                Leia sobivad tooted
                <ArrowRight
                  size={16}
                  strokeWidth={2}
                  className="group-hover:translate-x-[2px] transition-transform duration-[200ms]"
                />
              </button>
            </form>

            {/* Popular queries */}
            <div>
              <span className="inline-block text-[11px] font-[600] font-[family-name:var(--font-poppins)] text-[#999999] tracking-[0.10em] uppercase mb-[12px]">
                Populaarsed päringud
              </span>
              <div className="flex flex-wrap gap-[8px]">
                {popularQueries.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="inline-flex items-center px-[12px] py-[7px] rounded-full text-[13px] font-[500] font-[family-name:var(--font-jakarta)] text-[#555555] hover:text-[#E8650A] border border-[#E8E8E8] hover:border-[#E8650A]/30 hover:bg-[#FFF5EE] cursor-pointer"
                    style={{
                      transition: "all 0.18s cubic-bezier(0.32,0.72,0,1)",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
