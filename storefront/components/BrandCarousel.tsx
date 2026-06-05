"use client"

/**
 * BrandCarousel — esilehe horisontaalne brändi-logo riba.
 * Config: cms/brands.yaml → lib/brands.ts (server) → prop `brands`.
 * Iga logo klikitav → /{locale}/otsing?filters=<brand.filter> (brändi tooted).
 * Nooled + autoplay (peatub hover'il), CSS scroll-snap, mobiilil swipe.
 */
import { useRef, useState, useEffect, useCallback } from "react"
import SafeLink from "@/components/SafeLink"
import type { Brand } from "@/lib/brands"

interface Props {
  locale: string
  brands: Brand[]
}

export default function BrandCarousel({ locale, brands }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [paused, setPaused] = useState(false)

  // Kas sisu ei mahu (siis näita nooli + autoplay)
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const update = () => setOverflowing(el.scrollWidth > el.clientWidth + 8)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [brands.length])

  const scrollByPage = useCallback((dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    const amount = Math.max(el.clientWidth * 0.8, 240)
    // Lõpus → keri algusse (loop-tunne)
    if (dir === 1 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
      el.scrollTo({ left: 0, behavior: "smooth" })
    } else if (dir === -1 && el.scrollLeft <= 8) {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" })
    } else {
      el.scrollBy({ left: dir * amount, behavior: "smooth" })
    }
  }, [])

  // Autoplay 3s (ainult kui overflow + mitte pausil)
  useEffect(() => {
    if (!overflowing || paused) return
    const id = setInterval(() => scrollByPage(1), 3000)
    return () => clearInterval(id)
  }, [overflowing, paused, scrollByPage])

  if (!brands.length) return null

  return (
    <section className="brand-carousel" aria-label={locale === "et" ? "Brändid" : "Brands"}>
      <div className="brand-carousel-inner">
        {overflowing && (
          <button
            type="button"
            className="brand-arrow brand-arrow--left"
            aria-label={locale === "et" ? "Eelmine" : "Previous"}
            onClick={() => scrollByPage(-1)}
          >
            &#8249;
          </button>
        )}

        <div
          ref={trackRef}
          className="brand-track"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {brands.map((b) => (
            <SafeLink
              key={b.slug}
              href={`/${locale}/otsing?filters=${encodeURIComponent(b.filter)}`}
              className="brand-item"
              aria-label={b.name}
              title={b.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.logo} alt={b.name} className="brand-logo" loading="lazy" />
            </SafeLink>
          ))}
        </div>

        {overflowing && (
          <button
            type="button"
            className="brand-arrow brand-arrow--right"
            aria-label={locale === "et" ? "Järgmine" : "Next"}
            onClick={() => scrollByPage(1)}
          >
            &#8250;
          </button>
        )}
      </div>
    </section>
  )
}
