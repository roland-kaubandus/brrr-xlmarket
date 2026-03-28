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
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 shadow-lg p-4 sm:p-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-gray-700">
          <p>
            Kasutame küpsiseid veebipoe toimimiseks ja kasutajakogemuse parendamiseks.{" "}
            <Link href="/kupsised" className="text-amber-600 hover:text-amber-700 underline">
              Loe lähemalt
            </Link>
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={acceptNecessary}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Ainult vajalikud
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 text-sm bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
          >
            Nõustun kõigiga
          </button>
        </div>
      </div>
    </div>
  )
}
