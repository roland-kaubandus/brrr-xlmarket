"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("xlmarket_cookie_consent")
    if (!consent) {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem("xlmarket_cookie_consent", "all")
    setVisible(false)
  }

  function acceptNecessary() {
    localStorage.setItem("xlmarket_cookie_consent", "necessary")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-[#E8E8E8]" style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[14px] flex flex-col sm:flex-row items-start sm:items-center gap-[12px]">
        <div className="flex-1 text-[13px] font-[family-name:var(--font-inter)] text-[#555555]">
          <p>
            Kasutame küpsiseid veebipoe toimimiseks ja kasutajakogemuse parendamiseks.{" "}
            <Link href="/kupsised" className="text-[#E8650A] hover:text-[#CF5A08] underline underline-offset-2">
              Loe lähemalt
            </Link>
          </p>
        </div>
        <div className="flex gap-[8px] shrink-0">
          <button
            type="button"
            onClick={acceptNecessary}
            className="px-[14px] py-[8px] text-[13px] font-[500] font-[family-name:var(--font-poppins)] border border-[#E8E8E8] text-[#555555] hover:border-[#E8650A] hover:text-[#E8650A] rounded-[6px] transition-colors"
          >
            Ainult vajalikud
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-[14px] py-[8px] text-[13px] font-[600] font-[family-name:var(--font-poppins)] bg-[#E8650A] text-white hover:bg-[#CF5A08] rounded-[6px] transition-colors"
          >
            Nõustun kõigiga
          </button>
        </div>
      </div>
    </div>
  )
}
