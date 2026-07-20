"use client"

import { useState, useEffect } from "react"

export default function FlashSaleTimer() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    function calcRemaining() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setUTCHours(24, 0, 0, 0)
      const diff = Math.max(0, midnight.getTime() - now.getTime())
      return {
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      }
    }

    setTime(calcRemaining())
    const interval = setInterval(() => setTime(calcRemaining()), 1000)
    return () => clearInterval(interval)
  }, [])

  const pad = (n: number) => n.toString().padStart(2, "0")

  return (
    <div className="flex items-center gap-2 ml-4">
      <span className="px-2 py-1 rounded-md bg-[#1a1a2e] text-white text-[14px] font-bold tabular-nums min-w-[34px] text-center">{pad(time.h)}</span>
      <span className="text-[#1a1a2e] font-bold text-[16px]">:</span>
      <span className="px-2 py-1 rounded-md bg-[#1a1a2e] text-white text-[14px] font-bold tabular-nums min-w-[34px] text-center">{pad(time.m)}</span>
      <span className="text-[#1a1a2e] font-bold text-[16px]">:</span>
      <span className="px-2 py-1 rounded-md bg-[#1a1a2e] text-white text-[14px] font-bold tabular-nums min-w-[34px] text-center">{pad(time.s)}</span>
    </div>
  )
}
