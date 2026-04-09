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
    image: "https://image.vevor.com/us%2F0618-3BMNCC000001V2%2Foriginal_img-v9%2Fmetal-lathe-m100-1.2.jpg?timestamp=1652168143000",
  },
  {
    title: "Free Shipping from 99\u20AC",
    subtitle: "Fast delivery across Estonia \u2022 2-year warranty on all products",
    cta: "Shop Now",
    link: "/otsing?sort=new",
    gradient: "from-[#D97706] via-[#D97706] to-[#B45309]",
    image: "https://image.vevor.com/us%2F1100WJRJ90800X001V2%2Foriginal_img-v10%2Fcommercial-meat-grinder-m100-1.2.jpg?timestamp=1730432819000",
  },
  {
    title: "Outdoor & Garden",
    subtitle: "Everything for your yard, patio, and outdoor cooking",
    cta: "Explore",
    link: "/kategooriad/outdoors",
    gradient: "from-[#0F172A] via-[#1E293B] to-[#334155]",
    image: "https://image.vevor.com/us%2FPZSHLK37INCH5XEW0001V2%2Foriginal_img-v1%2Frotisserie-grill-m100-1.2.jpg?timestamp=1700000000000",
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
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className={`w-full flex-shrink-0 bg-gradient-to-r ${b.gradient} h-[180px] md:h-[280px] flex items-center justify-between px-8 md:px-16 relative overflow-hidden`}
            >
              {/* Text left */}
              <div className="text-white max-w-md relative z-10">
                <h2 className="font-bold text-xl md:text-3xl lg:text-4xl mb-2 leading-tight">
                  {b.title}
                </h2>
                <p className="text-white/70 text-xs md:text-sm mb-4 leading-relaxed max-w-[300px]">
                  {b.subtitle}
                </p>
                <Link
                  href={`/${locale}${b.link}`}
                  className="inline-block bg-white text-[#1E293B] font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-white/90 transition-colors"
                >
                  {b.cta}
                </Link>
              </div>
              {/* Product image right */}
              <div className="hidden md:flex items-center justify-center w-[280px] h-full relative z-10">
                <img
                  src={decodeURIComponent(b.image)}
                  alt=""
                  className="max-h-[220px] max-w-[250px] object-contain drop-shadow-2xl"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }} />
            </div>
          ))}
        </div>

        {/* Arrow buttons */}
        <button
          onClick={prev}
          aria-label="Previous"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button
          onClick={next}
          aria-label="Next"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
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
