"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, ChevronRight } from "lucide-react"

const navCategories = [
  { name: "Ehitus ja remont", href: "/kategooriad/ehitus-ja-remont" },
  { name: "Tööstus ja seadmed", href: "/kategooriad/toostus-ja-seadmed" },
  { name: "Kodu ja aed", href: "/kategooriad/kodu-ja-aed" },
  { name: "Auto ja garaaž", href: "/kategooriad/auto-ja-garaaz" },
  { name: "Sport ja vaba aeg", href: "/kategooriad/sport-ja-vaba-aeg" },
  { name: "Elektroonika", href: "/kategooriad/elektroonika" },
  { name: "Toitlustus ja köök", href: "/kategooriad/toitlustus-ja-kook" },
  { name: "Lemmikloomad", href: "/kategooriad/lemmikloomad" },
  { name: "Kontor ja ladustamine", href: "/kategooriad/kontor-ja-ladustamine" },
  { name: "Kunst ja käsitöö", href: "/kategooriad/kunst-ja-kasitoo" },
  { name: "Meditsiin ja tervishoid", href: "/kategooriad/meditsiin-ja-tervishoid" },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-[40px] h-[40px] text-[#333333] hover:text-[#E8650A] hover:bg-[#FFF5EE]"
        aria-label="Ava menüü"
        aria-expanded={open}
      >
        <Menu size={22} strokeWidth={1.5} />
      </button>

      {/* Overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Slide-in panel */}
          <div
            className="fixed top-0 left-0 h-full w-[85vw] max-w-[320px] bg-white z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Navigatsioon"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-[20px] py-[18px] border-b border-[#E8E8E8]">
              <div className="flex items-baseline gap-[1px]">
                <span className="text-[22px] font-[800] font-[family-name:var(--font-poppins)] leading-none text-[#E8650A]">XL</span>
                <span className="text-[22px] font-[400] font-[family-name:var(--font-poppins)] leading-none text-[#1A1A1A]">Market</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-[#F7F7F7] text-[#999999]"
                aria-label="Sulge"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Category list */}
            <div className="flex-1 overflow-y-auto py-[8px]">
              <p className="px-[20px] py-[8px] text-[11px] font-[600] font-[family-name:var(--font-poppins)] text-[#999999] uppercase tracking-[0.08em]">
                Kategooriad
              </p>
              {navCategories.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-[20px] py-[13px] text-[14px] font-[500] font-[family-name:var(--font-poppins)] text-[#333333] hover:text-[#E8650A] hover:bg-[#FFF5EE] border-b border-[#F0F0F0] last:border-0"
                >
                  {cat.name}
                  <ChevronRight size={16} strokeWidth={1.5} className="text-[#CCCCCC]" />
                </Link>
              ))}
            </div>

            {/* Footer links */}
            <div className="border-t border-[#E8E8E8] px-[20px] py-[16px] flex flex-col gap-[12px]">
              <Link href="/lemmikud" onClick={() => setOpen(false)} className="text-[13px] font-[family-name:var(--font-inter)] text-[#555555] hover:text-[#E8650A]">
                Lemmikud
              </Link>
              <Link href="/ostukorv" onClick={() => setOpen(false)} className="text-[13px] font-[family-name:var(--font-inter)] text-[#555555] hover:text-[#E8650A]">
                Ostukorv
              </Link>
              <Link href="/kontakt" onClick={() => setOpen(false)} className="text-[13px] font-[family-name:var(--font-inter)] text-[#555555] hover:text-[#E8650A]">
                Kontakt
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
