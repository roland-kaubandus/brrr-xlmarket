"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

const HERO_IMAGES = [
  { src: "https://xlmarket.store/media/products/010100045763/img-0.webp", alt: "Vannitoasein", w: 1200, h: 1200 },
  { src: "https://xlmarket.store/media/products/010578059547/img-1.webp", alt: "Kontorilaud", w: 1200, h: 1200 },
  { src: "https://xlmarket.store/media/products/010278116317/img-0.webp", alt: "Ehtekapp", w: 1200, h: 1200 },
]

const CARD_STYLES = [
  { top: "0%", right: "0%", left: "auto", bottom: "auto", width: "55%", anim: "heroFloat1", zIndex: 20 },
  { top: "auto", right: "auto", left: "0%", bottom: "5%", width: "48%", anim: "heroFloat2", zIndex: 10 },
  { top: "28%", right: "auto", left: "15%", bottom: "auto", width: "40%", anim: "heroFloat3", zIndex: 30 },
]

export default function HeroFloatingProducts() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    cardsRef.current.forEach((el) => {
      if (!el) return

      const onPointerDown = (e: PointerEvent) => {
        el.setPointerCapture(e.pointerId)
        const startX = e.clientX
        const startY = e.clientY
        const style = window.getComputedStyle(el)
        const matrix = new DOMMatrix(style.transform)
        const currentX = matrix.m41
        const currentY = matrix.m42

        el.style.animation = "none"
        el.style.zIndex = "50"
        el.style.cursor = "grabbing"
        el.style.transition = "box-shadow 0.15s"
        el.style.boxShadow = "0 30px 60px rgba(0,0,0,0.15)"
        el.style.transform = `translate(${currentX}px, ${currentY}px) scale(1.03)`

        const onMove = (ev: PointerEvent) => {
          const dx = currentX + (ev.clientX - startX)
          const dy = currentY + (ev.clientY - startY)
          el.style.transform = `translate(${dx}px, ${dy}px) scale(1.03)`
        }

        const onUp = () => {
          const m = new DOMMatrix(window.getComputedStyle(el).transform)
          el.style.cursor = "grab"
          el.style.zIndex = ""
          el.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s"
          el.style.boxShadow = ""
          el.style.transform = `translate(${m.m41}px, ${m.m42}px)`
          el.removeEventListener("pointermove", onMove)
          el.removeEventListener("pointerup", onUp)
          el.removeEventListener("pointercancel", onUp)
        }

        el.addEventListener("pointermove", onMove)
        el.addEventListener("pointerup", onUp)
        el.addEventListener("pointercancel", onUp)
      }

      el.addEventListener("pointerdown", onPointerDown)
      return () => el.removeEventListener("pointerdown", onPointerDown)
    })
  }, [])

  return (
    <>
      {HERO_IMAGES.map((img, i) => {
        const s = CARD_STYLES[i]
        return (
          <div
            key={i}
            ref={(el) => { cardsRef.current[i] = el }}
            className="absolute rounded-2xl overflow-hidden select-none cursor-grab"
            style={{
              top: s.top,
              right: s.right,
              left: s.left,
              bottom: s.bottom,
              width: s.width,
              zIndex: s.zIndex,
              boxShadow: "0 20px 50px rgba(0,0,0,0.10), 0 8px 20px rgba(0,0,0,0.06)",
              animation: `${s.anim} ${6 + i * 1.5}s ease-in-out ${i * 0.7}s infinite`,
              touchAction: "none",
              willChange: "transform",
            }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={img.w}
              height={img.h}
              className="w-full h-auto object-cover pointer-events-none"
              draggable={false}
              unoptimized
              priority={i === 0}
            />
          </div>
        )
      })}
    </>
  )
}
