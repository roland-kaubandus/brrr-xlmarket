"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

const BANNERS = [
  {
    title: "Spring Sale",
    subtitle: "Up to -30% on selected products",
    cta: "View Deals",
    link: "/otsing",
    gradient: "from-[#D97706] to-[#B45309]",
  },
  {
    title: "Free Shipping from 99\u20AC",
    subtitle: "Fast delivery across Estonia",
    cta: "Shop Now",
    link: "/otsing?sort=new",
    gradient: "from-[#1E293B] to-[#334155]",
  },
  {
    title: "New Products Just Arrived",
    subtitle: "Discover our latest selection",
    cta: "Explore New Products",
    link: "/kategooriad",
    gradient: "from-[#0F172A] to-[#1E293B]",
  },
]

export default function BannerCarousel({ locale = "en" }: { locale?: string }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % BANNERS.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + BANNERS.length) % BANNERS.length)
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
        {/* Slides */}
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className={`w-full flex-shrink-0 bg-gradient-to-r ${b.gradient} h-[180px] md:h-[250px] flex items-center px-8 md:px-16`}
            >
              <div className="text-white max-w-lg">
                <h2 className="font-[family-name:var(--font-dm-sans)] font-bold text-2xl md:text-4xl mb-2">
                  {b.title}
                </h2>
                <p className="text-white/80 text-sm md:text-base mb-4">{b.subtitle}</p>
                <Link href={`/${locale}${b.link}`} className="inline-block bg-white text-[#1E293B] font-semibold text-sm px-5 py-2 rounded-lg">
                  {b.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Arrow buttons */}
        <button
          onClick={prev}
          aria-label="Previous"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/30 hover:bg-white/60 flex items-center justify-center text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button
          onClick={next}
          aria-label="Next"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/30 hover:bg-white/60 flex items-center justify-center text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Banner ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
