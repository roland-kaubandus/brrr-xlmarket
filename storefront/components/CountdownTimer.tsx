"use client"

import { useState, useEffect } from "react"

const SALE_END = new Date("2026-04-30T23:59:59")

function calcTimeLeft() {
  const diff = SALE_END.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function CountdownTimer() {
  const [t, setT] = useState(calcTimeLeft())

  useEffect(() => {
    const id = setInterval(() => setT(calcTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  const pad = (n: number) => String(n).padStart(2, "0")

  const units = [
    { v: t.days,    label: "päeva" },
    { v: t.hours,   label: "tundi" },
    { v: t.minutes, label: "min" },
    { v: t.seconds, label: "sek" },
  ]

  return (
    <div className="flex items-center gap-[6px]">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-[6px]">
          <div className="flex flex-col items-center">
            <div
              className="w-[42px] h-[42px] flex items-center justify-center rounded-[6px] font-[700] font-[family-name:var(--font-poppins)] text-[18px] text-white"
              style={{ background: "#E8650A" }}
            >
              {pad(u.v)}
            </div>
            <span className="text-[10px] text-[#999999] font-[family-name:var(--font-inter)] mt-[3px]">
              {u.label}
            </span>
          </div>
          {i < 3 && (
            <span className="text-[#E8650A] font-[700] text-[16px] mb-[14px]">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
