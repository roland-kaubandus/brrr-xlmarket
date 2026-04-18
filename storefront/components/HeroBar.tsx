"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "@/components/SafeLink"

type Slide = {
  badge: string
  badgeEt: string
  heading: string
  headingEt: string
  description: string
  descriptionEt: string
  cta: string
  ctaEt: string
  ctaHref: string
  bgImage: string
}

const SLIDES: Slide[] = [
  {
    badge: "Starter Kits",
    badgeEt: "Stardikomplektid",
    heading: "Six businesses. Six turnkey kits.",
    headingEt: "Kuus äri. Kuus valmis komplekti.",
    description: "Café, auto-shop, barber, print, bakery, cleaning. One order, one invoice, one delivery. From €2,799 to €12,900, VAT incl.",
    descriptionEt: "Kohvik, autoteenus, juuksur, trükk, pagariäri, koristus. Üks tellimus, üks arve, üks tarne. Alates €2,799 kuni €12,900, käibemaks sees.",
    cta: "See starter kits",
    ctaEt: "Vaata komplekte",
    ctaHref: "/alustajale",
    bgImage: "/images/hero/hero-1.png",
  },
  {
    badge: "B2B Account",
    badgeEt: "Ärikliendile",
    heading: "Net-30, volume pricing, real humans.",
    headingEt: "Net-30, mahuhinnad, päris inimesed.",
    description: "Dedicated account manager, custom equipment bundles, priority shipping, 2-year extended warranty.",
    descriptionEt: "Personaalne projektijuht, kohandatud komplektid, prioriteetne tarne, 2-aastane pikendatav garantii.",
    cta: "Request a quote",
    ctaEt: "Küsi pakkumine",
    ctaHref: "/arikliendile",
    bgImage: "/images/hero/hero-2.png",
  },
  {
    badge: "Service",
    badgeEt: "Hooldus",
    heading: "Your machines should last a decade.",
    headingEt: "Sinu masinad peavad kümme aastat vastu.",
    description: "Basic, Pro, Enterprise service plans. Quarterly maintenance, 48h priority repair, replacement units while we fix yours.",
    descriptionEt: "Basic, Pro, Enterprise hoolduspaketid. Kvartaalne hooldus, 48h prioriteetne remont, asenduseade remondi ajaks.",
    cta: "Choose a service plan",
    ctaEt: "Vali hoolduspakett",
    ctaHref: "/hooldus",
    bgImage: "/images/hero/hero-3.png",
  },
]

const INTERVAL_MS = 6000

export default function HeroBar({ locale = "et" }: { locale?: string }) {
  const isEt = locale === "et"
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % SLIDES.length)
    }, INTERVAL_MS)
  }, [])

  useEffect(() => {
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [startTimer])

  const goTo = useCallback((idx: number) => {
    setCurrent(idx)
    startTimer()
  }, [startTimer])

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "clamp(260px, 28vw, 420px)" }}>
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 flex items-center transition-opacity duration-700 ease-in-out"
          style={{
            opacity: i === current ? 1 : 0,
            pointerEvents: i === current ? "auto" : "none",
            backgroundImage: `linear-gradient(90deg, rgba(15,27,45,0.88) 0%, rgba(15,27,45,0.45) 55%, transparent 100%), url(${slide.bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="max-w-[1440px] mx-auto w-full px-6 sm:px-10 md:px-16">
            <div className="max-w-[520px]">
              <span className="inline-block bg-[#D97706]/90 text-white text-[11px] font-bold px-3 py-1 uppercase tracking-wider mb-4">
                {isEt ? slide.badgeEt : slide.badge}
              </span>
              <h2
                className="text-white text-[22px] sm:text-[28px] md:text-[36px] font-extrabold leading-[1.15] mb-3"
                style={{ letterSpacing: "-0.02em", fontFamily: "var(--font-dm-sans)" }}
              >
                {isEt ? slide.headingEt : slide.heading}
              </h2>
              <p className="text-white/85 text-[13px] sm:text-[14px] md:text-[15px] leading-relaxed mb-6 max-w-[440px]">
                {isEt ? slide.descriptionEt : slide.description}
              </p>
              <Link
                href={`/${locale}${slide.ctaHref}`}
                className="inline-block px-7 py-3 bg-[#D97706] text-white font-semibold text-[14px] hover:bg-[#B45309] transition-colors"
              >
                {isEt ? slide.ctaEt : slide.cta} &rarr;
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-5 left-6 sm:left-10 md:left-16 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === current
                ? "bg-[#D97706] w-7"
                : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Stats pill — desktop only */}
      <div className="hidden md:flex absolute bottom-5 right-16 gap-8 z-10">
        <div className="text-right">
          <div className="text-[1.3rem] font-extrabold text-[#F59E0B] tabular-nums">16K+</div>
          <div className="text-[0.65rem] text-white/60 uppercase tracking-widest">{isEt ? "Toodet" : "Products"}</div>
        </div>
        <div className="text-right">
          <div className="text-[1.3rem] font-extrabold text-[#F59E0B] tabular-nums">22</div>
          <div className="text-[0.65rem] text-white/60 uppercase tracking-widest">{isEt ? "Kategooriat" : "Categories"}</div>
        </div>
      </div>
    </div>
  )
}
