"use client"

import { useEffect, useRef, useState, type ReactElement } from "react"
import SafeLink from "@/components/SafeLink"

/**
 * HeroFour — homepage hero with one cinematic image per scene.
 *
 * Adapted from the T3-B mockup (offers-T3B-one-hand.html) and reconciled
 * with the existing site type system: Barlow Condensed for the headline,
 * Mulish for body + CTA, amber `WORKSHOP`/`Café` style badges, the same
 * dot-nav users already know from the prior 3-slide carousel.
 *
 * Four scenes, 6-second dwell, manual dot-jump resets the timer.
 */

interface Scene {
  badge: string
  headlinePre: string
  headlineAccent: string
  headlinePost: string
  sub: string
  cta: string
  href: string
  bgImage: string
  caption: string
}

const SCENES: Scene[] = [
  {
    badge: "Workshop",
    headlinePre: "The hour the ",
    headlineAccent: "morning shift",
    headlinePost: " begins.",
    sub: "Commercial-grade tools across 18 trades. Same parts EU brands resell at double the price. VAT paid, warranty in Tallinn, ships in 10 business days.",
    cta: "Browse the catalogue",
    href: "/kategooriad",
    bgImage: "/images/hero-3.webp",
    caption: "Workshop · 15-piece wrench set · €89",
  },
  {
    badge: "Café",
    headlinePre: "Espresso machine. ",
    headlineAccent: "Day one.",
    headlinePost: "",
    sub: "Two-group espresso, undercounter fridge, prep, shelving — €8,499 for a turnkey starter kit. One invoice, one delivery, ten business days.",
    cta: "See the café kit",
    href: "/alustajale#cafe",
    bgImage: "/images/starter-kit-cafe.webp",
    caption: "Café · 2-group espresso · €3,199",
  },
  {
    badge: "Salon & Spa",
    headlinePre: "Two chairs, ",
    headlineAccent: "ready to book.",
    headlinePost: "",
    sub: "Hydraulic chairs, gold-framed mirrors, clipper and razor sets, UV sterilizer. Barber starter kit from €3,499, VAT included.",
    cta: "See the barber kit",
    href: "/alustajale#barber",
    bgImage: "/images/starter-kit-barber.webp",
    caption: "Salon & Spa · hydraulic barber chair · €489",
  },
  {
    badge: "Bakery",
    headlinePre: "Hot ovens ",
    headlineAccent: "from day one.",
    headlinePost: "",
    sub: "Convection oven, spiral mixer, proofing cabinet, refrigerated display. Bakery kit from €7,499, ships in 10 business days.",
    cta: "See the bakery kit",
    href: "/alustajale#bakery",
    bgImage: "/images/starter-kit-bakery.webp",
    caption: "Bakery · convection oven · €1,249",
  },
]

const DWELL_MS = 6000

interface HeroFourProps {
  locale: string
}

export default function HeroFour({ locale }: HeroFourProps): ReactElement {
  const [active, setActive] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function start(): void {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % SCENES.length)
    }, DWELL_MS)
  }

  function go(idx: number): void {
    setActive(idx)
    start()
  }

  useEffect(() => {
    start()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const counter = String(active + 1).padStart(2, "0")
  const total = String(SCENES.length).padStart(2, "0")

  return (
    <section className="hero-four" aria-roledescription="carousel">
      {SCENES.map((s, idx) => (
        <div
          key={idx}
          className={`hero-four-slide${idx === active ? " active" : ""}`}
          style={{ backgroundImage: `linear-gradient(95deg, rgba(15,27,45,0.98) 0%, rgba(15,27,45,0.92) 22%, rgba(15,27,45,0.65) 42%, rgba(15,27,45,0.25) 62%, rgba(15,27,45,0.05) 82%, transparent 100%), url('${s.bgImage}')` }}
          aria-hidden={idx !== active}
        />
      ))}

      <div className="hero-four-content">
        <div className="hero-four-stack">
          {SCENES.map((s, idx) => (
            <div key={idx} className={`hero-four-scene${idx === active ? " active" : ""}`}>
              <span className="hero-four-badge">{s.badge}</span>
              <h1 className="hero-four-headline">
                {s.headlinePre}
                <span className="hero-four-accent">{s.headlineAccent}</span>
                {s.headlinePost}
              </h1>
              <p className="hero-four-sub">{s.sub}</p>
              <SafeLink className="hero-four-cta" href={`/${locale}${s.href}`}>
                {s.cta} &rarr;
              </SafeLink>
            </div>
          ))}
        </div>
      </div>

      <div className="hero-four-meta">
        <span className="hero-four-counter">
          <strong>{counter}</strong> / {total}
        </span>
        <div className="hero-four-dots" role="tablist" aria-label="Hero scenes">
          {SCENES.map((s, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === active}
              aria-label={`Scene ${idx + 1}: ${s.badge}`}
              className={`hero-four-dot${idx === active ? " active" : ""}`}
              onClick={() => go(idx)}
            />
          ))}
        </div>
      </div>

      <div className="hero-four-caption">{SCENES[active].caption}</div>
    </section>
  )
}
