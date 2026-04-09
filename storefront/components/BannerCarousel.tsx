"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

const BANNERS = [
  {
    title: "Professional Tools & Equipment",
    subtitle: "Industrial-grade tools for workshops, garages, and construction sites",
    cta: "Shop Tools",
    link: "/kategooriad/tools",
    gradient: "from-[#1E293B] via-[#1E293B] to-[#334155]",
  },
  {
    title: "Free Shipping from 99\u20AC",
    subtitle: "Fast delivery across Estonia \u2022 2-year warranty on all products",
    cta: "Shop Now",
    link: "/otsing?sort=newest",
    gradient: "from-[#D97706] via-[#D97706] to-[#B45309]",
  },
  {
    title: "Outdoor & Garden",
    subtitle: "Everything for your yard, patio, and outdoor cooking",
    cta: "Explore",
    link: "/kategooriad/outdoors",
    gradient: "from-[#0F172A] via-[#1E293B] to-[#334155]",
  },
]

export default function BannerCarousel({ locale = "en" }: { locale?: string }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % BANNERS.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [paused, next])

  return (
    <div
      className="max-w-[1360px] mx-auto px-4 pt-4 pb-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className={`w-full flex-shrink-0 bg-gradient-to-r ${b.gradient} h-[180px] md:h-[280px] flex items-center justify-center px-8 md:px-16 relative overflow-hidden`}
            >
              {/* Text — centered */}
              <div className="text-white max-w-lg relative z-10 mx-auto text-center">
                <h2 className="font-bold text-xl md:text-3xl lg:text-4xl mb-2 leading-tight">
                  {b.title}
                </h2>
                <p className="text-white/70 text-xs md:text-sm mb-4 leading-relaxed max-w-[400px] mx-auto">
                  {b.subtitle}
                </p>
                <Link
                  href={`/${locale}${b.link}`}
                  className="inline-block bg-white text-[#1E293B] font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-white/90 transition-colors"
                >
                  {b.cta}
                </Link>
              </div>
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }} />
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {BANNERS.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === current ? "bg-white w-6" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
