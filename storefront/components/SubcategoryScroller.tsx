"use client"

import { useRef, useState, useEffect, useCallback } from "react"

type Props = {
  children: React.ReactNode
}

export default function SubcategoryScroller({ children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 5)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction === "right" ? 400 : -400, behavior: "smooth" })
  }

  return (
    <div
      className="relative mb-4 md:mb-5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={scrollRef}
        className="flex gap-2.5 md:gap-3 overflow-x-auto pt-1 pb-2.5 scrollbar-hide -mx-1 px-1"
      >
        {children}
      </div>

      {/* Left arrow */}
      {canScrollLeft && isHovered && (
        <button
          onClick={() => scroll("left")}
          className="hidden md:flex absolute left-0 top-0 bottom-5 w-16 bg-gradient-to-r from-white to-transparent items-center justify-start pl-1 z-10 cursor-pointer"
          aria-label="Scroll left"
        >
          <div className="w-8 h-8 rounded-full bg-white/90 border border-[#E2E8F0] shadow-sm flex items-center justify-center hover:bg-white hover:shadow-md transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
          </div>
        </button>
      )}

      {/* Right arrow */}
      {canScrollRight && isHovered && (
        <button
          onClick={() => scroll("right")}
          className="hidden md:flex absolute right-0 top-0 bottom-5 w-16 bg-gradient-to-l from-white to-transparent items-center justify-end pr-1 z-10 cursor-pointer"
          aria-label="Scroll right"
        >
          <div className="w-8 h-8 rounded-full bg-white/90 border border-[#E2E8F0] shadow-sm flex items-center justify-center hover:bg-white hover:shadow-md transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>
      )}
    </div>
  )
}
