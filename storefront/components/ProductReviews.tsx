"use client"

import { useState } from "react"
import { Star } from "lucide-react"

export default function ProductReviews() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <section className="mt-[48px] pt-[40px] border-t border-[#E8E8E8]">
      <div className="flex items-center justify-between mb-[24px]">
        <h2 className="text-[20px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A]">
          Arvustused
        </h2>
        {!submitted && (
          <button
            className="px-[14px] py-[8px] text-[13px] font-[500] font-[family-name:var(--font-poppins)] border border-[#E8650A] text-[#E8650A] hover:bg-[#FFF5EE] transition-colors"
            type="button"
            onClick={() => setSubmitted(true)}
          >
            Lisa arvustus
          </button>
        )}
      </div>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-[32px] px-[24px] bg-green-50 border border-green-200">
          <p className="text-[15px] font-[600] font-[family-name:var(--font-poppins)] text-green-700 mb-[4px]">
            Aitäh!
          </p>
          <p className="text-[13px] font-[family-name:var(--font-jakarta)] text-green-600 text-center">
            Sinu arvustus on saadetud ülevaatusele.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-[48px] px-[24px] bg-[#FAFAFA] border border-[#E8E8E8]">
          <div className="flex gap-[4px] mb-[14px]">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={24} strokeWidth={1.5} className="text-[#E8E8E8]" />
            ))}
          </div>
          <p className="text-[15px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[6px]">
            Selle toote kohta pole veel arvustusi
          </p>
          <p className="text-[13px] font-[family-name:var(--font-jakarta)] text-[#999999] text-center max-w-[280px]">
            Ole esimene, kes jagab oma kogemust selle tootega.
          </p>
        </div>
      )}
    </section>
  )
}
