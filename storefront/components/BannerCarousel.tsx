"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "@/components/SafeLink"
import Image from "next/image"
import posthog from "posthog-js"

function trackEvent(event: string, properties: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined" && typeof posthog?.capture === "function") {
      posthog.capture(event, properties)
    }
  } catch {
    // PostHog not initialized — silently skip
  }
}

const BANNERS = [
  {
    title: "Professional Tools, Half the Price",
    titleEt: "Profitööriistad poole hinnaga",
    subtitle: "Industrial-grade equipment direct from the manufacturer. Free shipping on orders over 99€.",
    subtitleEt: "Tööstuslik kvaliteet otse tootjalt. Tasuta tarne alates 99€.",
    cta: "Shop Now",
    ctaEt: "Vaata pakkumisi",
    link: "/otsing?tag=deals",
    image: "/images/branches/toostus.png",
    align: "left" as const,
    overlay: "from-[#0F172A]/92 via-[#0F172A]/60 to-transparent",
  },
  {
    title: "16,000+ Professional Products",
    titleEt: "16 000+ profitoodet",
    subtitle: "Tools, kitchen, automotive, outdoors. 2-year warranty on everything.",
    subtitleEt: "Tööriistad, köök, auto, aed. 2-aastane garantii kõigele.",
    cta: "Browse Categories",
    ctaEt: "Vaata kategooriaid",
    link: "/kategooriad/tools",
    image: "/images/branches/garaaz.png",
    align: "right" as const,
    overlay: "from-transparent via-[#0F172A]/50 to-[#0F172A]/92",
  },
]

export default function BannerCarousel({ locale = "en" }: { locale?: string }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((c) => {
      const newIndex = (c + 1) % BANNERS.length
      trackEvent("banner_impression", {
        banner_index: newIndex,
        banner_title: BANNERS[newIndex].title,
      })
      return newIndex
    })
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
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl group">
        {/* Slides */}
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className="w-full flex-shrink-0 relative h-[200px] sm:h-[220px] md:h-[260px] lg:h-[300px]"
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

              {/* Gradient overlay — stronger on mobile for readability */}
              <div className={`absolute inset-0 bg-gradient-to-r ${b.overlay}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:hidden" />

              {/* Content */}
              <div
                className={`absolute inset-0 flex items-end pb-6 md:items-center md:pb-0 ${
                  b.align === "right" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`relative z-10 px-5 sm:px-12 md:px-16 lg:px-20 max-w-xl ${
                    b.align === "right" ? "md:text-right" : "text-left"
                  }`}
                >
                  <h2 className="font-extrabold text-white text-[22px] sm:text-2xl md:text-[36px] lg:text-[42px] mb-2 md:mb-4 leading-[1.1] tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                    {locale === "et" ? b.titleEt : b.title}
                  </h2>
                  <p className="hidden sm:block text-white/80 text-sm md:text-[15px] mb-5 md:mb-7 leading-relaxed max-w-[420px] drop-shadow-md">
                    {locale === "et" ? b.subtitleEt : b.subtitle}
                  </p>
                  <Link
                    href={`/${locale}${b.link}`}
                    className="inline-flex items-center gap-1.5 bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-[13px] md:text-[15px] px-5 md:px-9 py-2.5 md:py-3.5 rounded-lg md:rounded-xl transition-all duration-200 shadow-[0_4px_16px_rgba(217,119,6,0.3)]"
                    onClick={() =>
                      trackEvent("banner_cta_clicked", {
                        banner_index: current,
                        banner_title: b.title,
                        link: b.link,
                      })
                    }
                  >
                    {locale === "et" ? b.ctaEt : b.cta}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-2.5 md:bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-[3px] rounded-full transition-all duration-500 ${
                i === current
                  ? "bg-white w-8 md:w-10"
                  : "bg-white/30 hover:bg-white/50 w-4 md:w-5"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
