"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"

const BANNERS = [
  {
    title: "Suurköögiseadmed",
    subtitle:
      "Professionaalsed köögiseadmed restoranidele, hotellidele ja cateringfirmadele. Tööstuslik kvaliteet, taskukohane hind.",
    cta: "Vaata seadmeid",
    link: "/kategooriad/toitlustus-ja-kook",
    image: "/images/branches/suurkoogiseadmed.png",
    align: "left" as const,
    overlay: "from-black/80 via-black/50 to-transparent",
  },
  {
    title: "Toitlustus & Catering",
    subtitle:
      "Kõik catering-ürituste korraldamiseks — soojendusnõud, serveerimislauad, jäämasinad ja palju muud.",
    cta: "Avasta valik",
    link: "/kategooriad/toitlustus-ja-kook",
    image: "/images/branches/toitlustus.png",
    align: "right" as const,
    overlay: "from-transparent via-black/40 to-black/80",
  },
  {
    title: "Energia & Salvestus",
    subtitle:
      "Päikesepaneelid, tuulegeneraatorid, inverterid ja energiasalvestus. Säästa elektriarvelt juba täna.",
    cta: "Vaata lahendusi",
    link: "/kategooriad/renewable-energy",
    image: "/images/branches/energia.png",
    align: "left" as const,
    overlay: "from-black/80 via-black/50 to-transparent",
  },
]

export default function BannerCarousel({ locale = "et" }: { locale?: string }) {
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
    const id = setInterval(next, 6000)
    return () => clearInterval(id)
  }, [paused, next])

  return (
    <div
      className="max-w-[1360px] mx-auto px-4 pt-4 pb-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-xl group">
        {/* Slides */}
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className="w-full flex-shrink-0 relative h-[200px] sm:h-[260px] md:h-[340px] lg:h-[400px]"
            >
              {/* Background image */}
              <Image
                src={b.image}
                alt={b.title}
                fill
                className="object-cover"
                sizes="(max-width: 1360px) 100vw, 1360px"
                priority={i === 0}
              />

              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${b.overlay}`}
              />

              {/* Content */}
              <div
                className={`absolute inset-0 flex items-center ${
                  b.align === "right" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`relative z-10 px-8 sm:px-12 md:px-16 max-w-lg ${
                    b.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  <h2 className="font-bold text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-2 md:mb-3 leading-tight drop-shadow-lg">
                    {b.title}
                  </h2>
                  <p className="text-white/85 text-xs sm:text-sm md:text-base mb-4 md:mb-6 leading-relaxed max-w-[400px] drop-shadow-md">
                    {b.subtitle}
                  </p>
                  <Link
                    href={`/${locale}${b.link}`}
                    className="inline-block bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-sm md:text-base px-6 md:px-8 py-2.5 md:py-3 rounded-lg transition-colors shadow-lg"
                  >
                    {b.cta} &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Arrow buttons (visible on hover) */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          aria-label="Eelmine"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          aria-label="Järgmine"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "bg-white w-8"
                  : "bg-white/40 hover:bg-white/60 w-2.5"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
