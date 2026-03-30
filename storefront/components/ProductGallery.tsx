"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { X, ZoomIn, ChevronUp, ChevronDown } from "lucide-react"

type GalleryImage = {
  id: string
  url: string
}

type Props = {
  images: GalleryImage[]
  title: string
}

export default function ProductGallery({ images, title }: Props) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [thumbOffset, setThumbOffset] = useState(0)
  const VISIBLE_THUMBS = 5

  const close = useCallback(() => setLightbox(false), [])

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1))
      if (e.key === "ArrowRight") setActive((i) => Math.min(images.length - 1, i + 1))
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightbox, close, images.length])

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-[#F7F7F7] rounded-[2px] flex items-center justify-center text-[#999999] text-[14px] font-[family-name:var(--font-inter)]">
        Pilt puudub
      </div>
    )
  }

  const canUp = thumbOffset > 0
  const canDown = thumbOffset + VISIBLE_THUMBS < images.length

  return (
    <>
      {/* Desktop: vertical thumbstrip + main image */}
      <div className="hidden sm:flex gap-[12px] items-start">
        {images.length > 1 && (
          <div className="flex flex-col items-center gap-[6px] shrink-0">
            <button
              type="button"
              onClick={() => setThumbOffset((o) => Math.max(0, o - 1))}
              disabled={!canUp}
              className="w-[52px] h-[24px] flex items-center justify-center text-[#CCCCCC] hover:text-[#E8650A] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Kerima"
            >
              <ChevronUp size={16} strokeWidth={2} />
            </button>
            {images.slice(thumbOffset, thumbOffset + VISIBLE_THUMBS).map((img, i) => {
              const realIdx = i + thumbOffset
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActive(realIdx)}
                  aria-label={"Pilt " + (realIdx + 1)}
                  aria-pressed={realIdx === active}
                  className={
                    "relative w-[52px] h-[52px] bg-[#F7F7F7] rounded-[4px] border-2 overflow-hidden transition-all duration-[150ms] " +
                    (realIdx === active
                      ? "border-[#E8650A] shadow-[0_0_0_1px_rgba(232,101,10,0.20)]"
                      : "border-[#E8E8E8] hover:border-[#CCCCCC]")
                  }
                >
                  <Image
                    src={img.url}
                    alt={title + " " + (realIdx + 1)}
                    fill
                    className="object-contain p-[4px]"
                    sizes="60px"
                  />
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setThumbOffset((o) => Math.min(images.length - VISIBLE_THUMBS, o + 1))}
              disabled={!canDown}
              className="w-[52px] h-[24px] flex items-center justify-center text-[#CCCCCC] hover:text-[#E8650A] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Kerima alla"
            >
              <ChevronDown size={16} strokeWidth={2} />
            </button>
          </div>
        )}
        <div
          className="group relative flex-1 aspect-square bg-[#F7F7F7] rounded-[2px] border border-[#E8E8E8] overflow-hidden cursor-zoom-in"
          onClick={() => setLightbox(true)}
          role="button"
          tabIndex={0}
          aria-label="Suurenda pilti"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightbox(true) }}
        >
          <div className="absolute inset-[16px] transition-transform duration-[300ms] group-hover:scale-[1.03]">
            <Image
              src={images[active].url}
              alt={title}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 45vw"
              priority
            />
          </div>
          <div className="absolute bottom-[10px] right-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-[200ms] flex items-center gap-[5px] bg-black/50 text-white text-[11px] px-[8px] py-[4px] rounded-full backdrop-blur-[2px]">
            <ZoomIn size={11} strokeWidth={2} />
            Suurenda
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-[10px] left-[10px] bg-black/40 text-white text-[11px] px-[8px] py-[3px] rounded-full backdrop-blur-[2px]">
              {active + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="flex flex-col gap-[10px] sm:hidden">
        <div
          className="relative aspect-square bg-[#F7F7F7] rounded-[2px] border border-[#E8E8E8] overflow-hidden cursor-zoom-in"
          onClick={() => setLightbox(true)}
          role="button"
          tabIndex={0}
          aria-label="Suurenda pilti"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightbox(true) }}
        >
          <div className="absolute inset-[12px]"><Image src={images[active].url} alt={title} fill className="object-contain" sizes="100vw" priority /></div>
          {images.length > 1 && (
            <div className="absolute bottom-[8px] left-[8px] bg-black/40 text-white text-[11px] px-[7px] py-[3px] rounded-full">
              {active + 1} / {images.length}
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-[8px] overflow-x-auto pb-[2px] scrollbar-none">
            {images.slice(0, 10).map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                className={"relative shrink-0 w-[52px] h-[52px] bg-[#F7F7F7] rounded-[4px] border-2 overflow-hidden transition-all " + (i === active ? "border-[#E8650A]" : "border-[#E8E8E8]")}
              >
                <Image src={img.url} alt={title + " " + (i + 1)} fill className="object-contain p-[4px]" sizes="60px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center backdrop-blur-[4px]"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {active > 0 && (
            <button
              className="absolute left-[16px] sm:left-[32px] top-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setActive((i) => i - 1) }}
              aria-label="Eelmine"
            >
              <ChevronUp size={20} className="-rotate-90" strokeWidth={2} />
            </button>
          )}
          {active < images.length - 1 && (
            <button
              className="absolute right-[16px] sm:right-[32px] top-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setActive((i) => i + 1) }}
              aria-label="Järgmine"
            >
              <ChevronDown size={20} className="-rotate-90" strokeWidth={2} />
            </button>
          )}
          <div
            className="relative max-w-[85vw] max-h-[85vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={images[active].url} alt={title} width={1200} height={1200} className="object-contain max-w-[85vw] max-h-[85vh] w-auto h-auto" />
          </div>
          <button
            className="absolute top-[16px] right-[16px] w-[40px] h-[40px] rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={close}
            aria-label="Sulge"
          >
            <X size={18} strokeWidth={2} />
          </button>
          <div className="absolute bottom-[16px] left-1/2 -translate-x-1/2 text-white/70 text-[13px]">
            {active + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  )
}
