"use client"

import { useState, useEffect } from "react"
import Link from "@/components/SafeLink"

export default function CookieConsent({ locale = "et" }: { locale?: string }) {
  const [visible, setVisible] = useState(false)
  const [t, setT] = useState<any>(null)

  useEffect(() => {
    const consent = localStorage.getItem("xlmarket_cookie_consent")
    if (!consent) setVisible(true)
    // Load translations client-side
    import(`@/messages/${locale}.json`).then(m => setT(m.default?.cookie || m.cookie)).catch(() => {})
  }, [locale])

  function accept() { localStorage.setItem("xlmarket_cookie_consent", "all"); setVisible(false) }
  function acceptNecessary() { localStorage.setItem("xlmarket_cookie_consent", "necessary"); setVisible(false) }

  if (!visible || !t) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-[#E8E8E8]" style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[14px] flex flex-col sm:flex-row items-start sm:items-center gap-[12px]">
        <div className="flex-1 text-[13px] font-[family-name:var(--font-dm-sans)] text-[#555555]">
          <p>
            {t.message}{" "}
            <Link href={`/${locale}/kupsised`} className="text-[#E8650A] hover:text-[#CF5A08] underline underline-offset-2">{t.readMore}</Link>
          </p>
        </div>
        <div className="flex gap-[8px] shrink-0">
          <button type="button" onClick={acceptNecessary} className="px-[14px] py-[8px] text-[13px] font-[500] font-[family-name:var(--font-dm-sans)] border border-[#E8E8E8] text-[#555555] hover:border-[#E8650A] hover:text-[#D97706] transition-colors">{t.necessary}</button>
          <button type="button" onClick={accept} className="px-[14px] py-[8px] text-[13px] font-[600] font-[family-name:var(--font-dm-sans)] bg-[#E8650A] text-white hover:bg-[#CF5A08] transition-colors">{t.acceptAll}</button>
        </div>
      </div>
    </div>
  )
}
