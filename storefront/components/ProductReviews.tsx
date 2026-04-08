"use client"

import { useState } from "react"
// Star icons rendered inline as SVG

export default function ProductReviews() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <section className="mt-12 pt-10 border-t border-[#E5E5E5]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-[#222]">
          Arvustused
        </h2>
        {!submitted && (
          <button
            className="px-4 py-2 text-sm font-medium border border-[#FF6A00] text-[#FF6A00] hover:bg-[#FFF5EE] rounded-lg transition-colors duration-200"
            type="button"
            onClick={() => setSubmitted(true)}
          >
            Lisa arvustus
          </button>
        )}
      </div>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-8 px-6 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-[15px] font-bold text-green-700 mb-1">
            Aitah!
          </p>
          <p className="text-sm text-green-600 text-center">
            Sinu arvustus on saadetud ulevaatusele.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg">
          {/* Rating summary stars */}
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} width="28" height="28" viewBox="0 0 24 24" fill="#E5E5E5" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          <p className="text-[15px] font-bold text-[#222] mb-1.5">
            Selle toote kohta pole veel arvustusi
          </p>
          <p className="text-sm text-[#666] text-center max-w-[320px]">
            Ole esimene, kes jagab oma kogemust selle tootega.
          </p>
        </div>
      )}
    </section>
  )
}
