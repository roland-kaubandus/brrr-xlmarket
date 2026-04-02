"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ZoomIn, ChevronUp, ChevronDown } from "lucide-react"

type GalleryImage = {
  id: string
  url: string
}

type Props = {
  images: GalleryImage[]
  title: string
}

function decodeImageUrl(url: string): string {
  try { return decodeURIComponent(url) } catch { return url }
}

const MAX_VISIBLE_THUMBS = 7

export default function ProductGallery({ images, title }: Props) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [showAll, setShowAll] = useState(false)

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
      <div className="aspect-square bg-silver rounded-2xl flex items-center justify-center text-muted text-sm font-[family-name:var(--font-jakarta)]">
        Pilt puudub
      </div>
    )
  }

  const hasMore = images.length > MAX_VISIBLE_THUMBS
  const visibleThumbs = showAll ? images : images.slice(0, hasMore ? MAX_VISIBLE_THUMBS - 1 : MAX_VISIBLE_THUMBS)
  const remaining = images.length - (MAX_VISIBLE_THUMBS - 1)

  return (
    <>
      {/* Desktop: vertical thumbstrip + main image */}
      <div className="hidden sm:flex gap-3 items-start">
        {images.length > 1 && (
          <div className="flex flex-col gap-1.5 shrink-0 w-[76px]">
            {visibleThumbs.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={"Pilt " + (i + 1)}
                aria-pressed={i === active}
                className={
                  "relative w-[76px] h-[76px] bg-silver rounded-xl border-2 overflow-hidden transition-all duration-300 " +
                  (i === active
                    ? "border-accent shadow-[0_0_0_1px_rgba(249,115,22,0.20)]"
                    : "border-soft-border hover:border-muted")
                }
              >
                <img
                  src={decodeImageUrl(img.url)}
                  alt={title + " " + (i + 1)}
                  className="object-contain absolute inset-0 w-full h-full p-1"
                  loading="lazy"
                />
              </button>
            ))}
            {hasMore && !showAll && (
              <button
                type="button"
                onClick={() => { setShowAll(true); setActive(MAX_VISIBLE_THUMBS - 1) }}
                className="w-[76px] h-[76px] rounded-xl border-2 border-soft-border bg-silver hover:border-accent/40 transition-all duration-300 flex flex-col items-center justify-center gap-0.5"
              >
                <span className="text-accent font-bold text-sm font-[family-name:var(--font-outfit)]">+{remaining}</span>
                <span className="text-[10px] text-muted font-medium">More</span>
              </button>
            )}
          </div>
        )}
        <div
          className="group relative flex-1 aspect-square bg-silver rounded-2xl border border-soft-border overflow-hidden cursor-zoom-in"
          onClick={() => setLightbox(true)}
          role="button"
          tabIndex={0}
          aria-label="Suurenda pilti"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightbox(true) }}
        >
          <div className="absolute inset-4 transition-transform duration-300 group-hover:scale-[1.03]">
            <img
              src={decodeImageUrl(images[active].url)}
              alt={title}
              className="object-contain absolute inset-0 w-full h-full"
            />
          </div>
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1.5 bg-off-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
            <ZoomIn size={11} strokeWidth={2} />
            Suurenda
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-off-black/40 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
              {active + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        <div
          className="relative aspect-square bg-silver rounded-2xl border border-soft-border overflow-hidden cursor-zoom-in"
          onClick={() => setLightbox(true)}
          role="button"
          tabIndex={0}
          aria-label="Suurenda pilti"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightbox(true) }}
        >
          <div className="absolute inset-3"><img src={decodeImageUrl(images[active].url)} alt={title} className="object-contain absolute inset-0 w-full h-full" /></div>
          {images.length > 1 && (
            <div className="absolute bottom-2 left-2 bg-off-black/40 text-white text-xs px-2 py-1 rounded-full">
              {active + 1} / {images.length}
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {images.slice(0, 8).map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                className={"relative shrink-0 w-[60px] h-[60px] bg-silver rounded-xl border-2 overflow-hidden transition-all duration-300 " + (i === active ? "border-accent" : "border-soft-border")}
              >
                <img src={decodeImageUrl(img.url)} alt={title + " " + (i + 1)} className="object-contain absolute inset-0 w-full h-full p-1" loading="lazy" />
              </button>
            ))}
            {images.length > 8 && (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="shrink-0 w-[60px] h-[60px] bg-silver rounded-xl border-2 border-soft-border flex flex-col items-center justify-center"
              >
                <span className="text-accent font-bold text-xs">+{images.length - 8}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {active > 0 && (
            <button
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
              onClick={(e) => { e.stopPropagation(); setActive((i) => i - 1) }}
              aria-label="Eelmine"
            >
              <ChevronUp size={20} className="-rotate-90" strokeWidth={2} />
            </button>
          )}
          {active < images.length - 1 && (
            <button
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
              onClick={(e) => { e.stopPropagation(); setActive((i) => i + 1) }}
              aria-label="Jargmine"
            >
              <ChevronDown size={20} className="-rotate-90" strokeWidth={2} />
            </button>
          )}
          <div
            className="relative max-w-[85vw] max-h-[85vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={decodeImageUrl(images[active].url)} alt={title} width={1200} height={1200} className="object-contain max-w-[85vw] max-h-[85vh] w-auto h-auto" />
          </div>
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
            onClick={close}
            aria-label="Sulge"
          >
            <X size={18} strokeWidth={2} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {active + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  )
}
