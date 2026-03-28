"use client"

import { useEffect } from "react"
import Script from "next/script"

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

export default function MetaPixel() {
  useEffect(() => {
    if (!PIXEL_ID) return
    const consent = localStorage.getItem("xlmarket_cookie_consent")
    if (consent !== "all") return

    // Initialize fbq if not already loaded
    if (typeof window !== "undefined" && !window.fbq) {
      const f: any = (window.fbq = function (...args: any[]) {
        f.callMethod ? f.callMethod(...args) : f.queue.push(args)
      })
      f.push = f
      f.loaded = true
      f.version = "2.0"
      f.queue = []
      window._fbq = f
      f("init", PIXEL_ID)
      f("track", "PageView")
    }
  }, [])

  if (!PIXEL_ID) return null

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      src={`https://connect.facebook.net/en_US/fbevents.js`}
    />
  )
}

// Add fbq to Window type
declare global {
  interface Window {
    fbq: any
    _fbq: any
  }
}
