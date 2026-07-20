"use client"

import Script from "next/script"
import { useEffect, useState } from "react"

// Self-host Umami (analytics.xlmarket.ee). Cookieless — ei vaja consent-gate'i.
// Laeb AINULT prod-domeenil (xlmarket.ee), mitte staging/localhost.
// Admin-ala (/xl-admin) on väljaspool [locale] layout'i → juba välistatud.
const WEBSITE_ID = "4d640225-eab6-4edb-82f8-32fbb1eddc57"
const SRC = "https://analytics.xlmarket.ee/script.js"

export default function UmamiAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (window.location.hostname === "xlmarket.ee") setEnabled(true)
  }, [])

  if (!enabled) return null

  return (
    <Script
      id="umami-analytics"
      src={SRC}
      data-website-id={WEBSITE_ID}
      strategy="afterInteractive"
      defer
    />
  )
}
