"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react"

type GalleryImage = {
  id: string
  url: string
}

type Props = {
  images: GalleryImage[]
  title: string
  locale?: string // deprecated, kept for callsite compat
}

export default function ProductGallery({ images, title }: Props) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const [mainH, setMainH] = useState(0)

  const close = useCallback(() => setLightbox(false), [])

  // Measure main image height to constrain thumbstrip
  useEffect(() => {
    if (!mainRef.current) return
    const ro = new ResizeObserver(([entry]) => setMainH(entry.contentRect.height))
    ro.observe(mainRef.current)
    return () => ro.disconnect()
  }, [])

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
      <div className="aspect-square bg-silver rounded-2xl flex items-center justify-center text-muted text-sm font-[family-name:var(--font-dm-sans)]">
        No image
      </div>
    )
  }

  // Calculate how many thumbs fit: each thumb is 64px + 6px gap
  const thumbSize = 64
  const thumbGap = 6
  const thumbsPerCol = mainH > 0 ? Math.floor((mainH + thumbGap) / (thumbSize + thumbGap)) : 6
  // Reserve 1 slot for "+N" button if we have more
  const showCount = images.length > thumbsPerCol ? thumbsPerCol - 1 : Math.min(images.length, thumbsPerCol)
  const remaining = images.length - showCount

  return (
    <>
      {/* Desktop: vertical thumbstrip + main image */}
      <div className="hidden sm:flex gap-3 items-start">
        {images.length > 1 && (
          <div
            className="flex flex-col shrink-0 w-[64px] overflow-hidden"
            style={{ maxHeight: mainH > 0 ? mainH : undefined, gap: `${thumbGap}px` }}
          >
            {images.slice(0, showCount).map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={"Image " + (i + 1)}
                aria-pressed={i === active}
                className={
                  "relative shrink-0 bg-silver rounded-lg border-2 overflow-hidden transition-all duration-200 " +
                  (i === active
                    ? "border-[#D97706]"
                    : "border-transparent hover:border-soft-border")
                }
                style={{ width: thumbSize, height: thumbSize }}
              >
                <img
                  src={img.url}
                  alt={title + " " + (i + 1)}
                  className="object-contain absolute inset-0 w-full h-full p-1"
                  loading="lazy"
                />
              </button>
            ))}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="shrink-0 rounded-lg border-2 border-transparent bg-silver hover:border-soft-border transition-all duration-200 flex flex-col items-center justify-center gap-0"
                style={{ width: thumbSize, height: thumbSize }}
              >
                <span className="text-[#D97706] font-bold text-xs font-[family-name:var(--font-dm-sans)]">+{remaining}</span>
              </button>
            )}
          </div>
        )}
        <div
          ref={mainRef}
          className="group relative flex-1 aspect-square bg-white rounded-2xl border border-soft-border overflow-hidden cursor-zoom-in"
          onClick={() => setLightbox(true)}
          role="button"
          tabIndex={0}
          aria-label="Zoom image"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightbox(true) }}
        >
          <div className="absolute inset-4 transition-transform duration-300 group-hover:scale-[1.02]">
            <img
              src={images[active].url}
              alt={title}
              className="object-contain absolute inset-0 w-full h-full"
            />
          </div>
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1.5 bg-off-black/60 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm">
            <ZoomIn size={11} strokeWidth={2} />
            Zoom
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-off-black/50 text-white text-[11px] px-2 py-0.5 rounded-full backdrop-blur-sm">
              {active + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div
          className="relative aspect-square bg-white rounded-2xl border border-soft-border overflow-hidden cursor-zoom-in"
          onClick={() => setLightbox(true)}
          role="button"
          tabIndex={0}
          aria-label="Zoom image"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightbox(true) }}
        >
          <div className="absolute inset-3"><img src={images[active].url} alt={title} className="object-contain absolute inset-0 w-full h-full" /></div>
          {images.length > 1 && (
            <div className="absolute bottom-2 left-2 bg-off-black/50 text-white text-[11px] px-2 py-0.5 rounded-full">
              {active + 1} / {images.length}
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {images.slice(0, 8).map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                className={"relative shrink-0 w-[52px] h-[52px] bg-silver rounded-lg border-2 overflow-hidden transition-all duration-200 " + (i === active ? "border-[#D97706]" : "border-transparent")}
              >
                <img src={img.url} alt={title + " " + (i + 1)} className="object-contain absolute inset-0 w-full h-full p-0.5" loading="lazy" />
              </button>
            ))}
            {images.length > 8 && (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="shrink-0 w-[52px] h-[52px] bg-silver rounded-lg border-2 border-transparent flex items-center justify-center"
              >
                <span className="text-[#D97706] font-bold text-xs">+{images.length - 8}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {active > 0 && (
            <button
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200"
              onClick={(e) => { e.stopPropagation(); setActive((i) => i - 1) }}
              aria-label="Previous"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          )}
          {active < images.length - 1 && (
            <button
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200"
              onClick={(e) => { e.stopPropagation(); setActive((i) => i + 1) }}
              aria-label="Next"
            >
              <ChevronRight size={20} strokeWidth={2} />
            </button>
          )}
          <div
            className="relative max-w-[85vw] max-h-[85vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={images[active].url} alt={title} width={1200} height={1200} className="object-contain max-w-[85vw] max-h-[85vh] w-auto h-auto" />
          </div>
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-200"
            onClick={close}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
          {/* Lightbox thumbnail strip */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[80vw] overflow-x-auto scrollbar-hide px-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); setActive(i) }}
                className={"shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200 " + (i === active ? "border-white" : "border-white/20 opacity-50 hover:opacity-80")}
              >
                <img src={img.url} alt="" className="w-full h-full object-contain bg-white/10 p-0.5" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
