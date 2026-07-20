"use client"

import { useEffect, useRef, useCallback, useState, type ReactElement } from "react"
import Link from "next/link"
import CategoryThumb from "@/components/CategoryThumb"
import { categoryPath, type Locale } from "@/lib/i18n"
import type { ChildWithCount } from "@/lib/category-tree"

interface SubcategoryCarouselProps {
  children: ChildWithCount[]
  locale: string
  /**
   * L1 ancestor handle — used by CategoryThumb for Lucide icon fallback when a
   * child node has no image_path. Resolved server-side so this component does
   * NOT import category-tree (PERF-C1).
   */
  l1Handle?: string | null
  /** When set, the matching child card is scrolled into view on mount. */
  previousHandle?: string
  /**
   * Handle of the category page currently rendering the carousel. When
   * provided, each child Link gets `?from={currentHandle}` appended so the
   * destination page knows which card to highlight/scroll into view. See
   * F5c H4.
   */
  currentHandle?: string
}

/** Safe handle/id token: alnum + dash + underscore, 1–128 chars. */
function isSafeHandleToken(v: string): boolean {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,127}$/i.test(v)
}

/**
 * Full-width horizontal snap-scroll carousel of child category cards.
 *
 * Spec §3.5.4 + INV-26:
 *   - Image is mandatory (SSoT guarantees `image_source !== "none"`).
 *   - Zero-count children are filtered out upstream.
 *   - Arrow-left / Arrow-right move focus between cards.
 *   - `role="list"` + `role="listitem"` + localized `aria-label`.
 *   - `scroll-snap-type: x mandatory` on the track.
 *
 * Returns `null` on leaf nodes (children.length === 0) so the page layout
 * collapses without an empty region.
 */
export default function SubcategoryCarousel({
  children,
  locale,
  l1Handle,
  previousHandle,
  currentHandle,
}: SubcategoryCarouselProps): ReactElement | null {
  const safeCurrent =
    currentHandle && isSafeHandleToken(currentHandle) ? currentHandle : undefined
  const trackRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])


  // Scroll previously visited child into view on mount.
  useEffect(() => {
    if (!previousHandle) return
    const idx = children.findIndex((c) => c.handle === previousHandle)
    if (idx < 0) return
    const el = itemRefs.current[idx]
    if (el && trackRef.current) {
      el.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" })
    }
  }, [previousHandle, children])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLAnchorElement>, idx: number) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        const next =
          e.key === "ArrowRight"
            ? Math.min(children.length - 1, idx + 1)
            : Math.max(0, idx - 1)
        const target = itemRefs.current[next]
        if (target) {
          target.focus()
          target.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" })
        }
      }
    },
    [children.length]
  )

  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    function update() {
      if (!el) return
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      el.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [children.length])

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" })
  }, [])

  if (children.length === 0) return null

  return (
    <section
      className="mb-8 relative"
      aria-labelledby="subcategory-carousel-heading"
    >
      <h2
        id="subcategory-carousel-heading"
        className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wider mb-3 px-4 sm:px-6 max-w-[1360px] mx-auto"
      >
        Subcategories
      </h2>
      <div className="relative max-w-[1360px] mx-auto">
        {canLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white border border-[#E2E8F0] shadow-sm hover:border-[#0ea5a0] hover:text-[#0b7d79] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        {canRight && (
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white border border-[#E2E8F0] shadow-sm hover:border-[#0ea5a0] hover:text-[#0b7d79] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      <div
        ref={trackRef}
        role="list"
        aria-label="Subcategories"
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 sm:px-6 pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {children.map((child, idx) => {
          const childName = child.name_en
          const isCurrent = previousHandle === child.handle
          const basePath = categoryPath(locale as Locale, child.handle)
          const childHref = safeCurrent ? `${basePath}?from=${encodeURIComponent(safeCurrent)}` : basePath
          return (
            <Link
              key={child.handle}
              ref={(el) => {
                itemRefs.current[idx] = el
              }}
              role="listitem"
              href={childHref}
              prefetch={false}
              aria-current={isCurrent ? "true" : undefined}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`group flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start flex flex-col items-center gap-2 p-3 rounded-xl bg-white border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0ea5a0] ${
                isCurrent
                  ? "border-[#0ea5a0] ring-2 ring-[#0ea5a0]/30"
                  : "border-[#E2E8F0] hover:border-[#0ea5a0] hover:shadow-md"
              }`}
              style={{ scrollSnapAlign: "start" }}
            >
              <CategoryThumb
                handle={child.handle}
                image_path={child.image_path}
                l1_handle={l1Handle}
                size={96}
                alt={childName}
                className="!rounded-lg"
              />
              <span className="text-[13px] text-center text-[#1a1a2e] group-hover:text-[#0b7d79] transition-colors leading-snug line-clamp-2 font-medium">
                {childName}
              </span>
              <span className="text-[11px] tabular-nums text-[#94A3B8]">
                {child.count.toLocaleString("en-GB")} products
              </span>
            </Link>
          )
        })}
      </div>
      </div>
    </section>
  )
}
