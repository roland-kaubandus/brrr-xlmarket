"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getToken, getCustomer } from "@/lib/auth"

export default function AuthButton() {
  const pathname = usePathname()
  const locale = pathname.split("/")[1] || "en"
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getCustomer(token).then((c) => {
      if (c) setName(c.first_name || c.email.split("@")[0])
    })
  }, [])

  if (name) {
    return (
      <Link
        href={`/${locale}/account`}
        className="hidden md:flex items-center gap-2 text-white text-[13px] hover:text-[#D97706] transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
        <span className="text-white font-medium">{name}</span>
      </Link>
    )
  }

  return (
    <Link
      href={`/${locale}/login`}
      className="hidden md:flex items-center gap-2 text-white text-[13px] hover:text-[#D97706] transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
      <span className="text-white/70">Hello, <strong className="text-white">Sign In</strong></span>
    </Link>
  )
}
