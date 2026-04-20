"use client"

import { useState } from "react"
// Star icons rendered inline as SVG

export default function ProductReviews() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <section className="mt-12 pt-10 border-t border-[#E2E8F0]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-bold text-[#1E293B]">
          Reviews
        </h2>
        {!submitted && (
          <button
            className="px-4 py-2 text-sm font-medium border border-[#D97706] text-[#D97706] hover:bg-[#FFFBEB] rounded-lg transition-colors duration-200"
            type="button"
            onClick={() => setSubmitted(true)}
          >
            Write a review
          </button>
        )}
      </div>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-8 px-6 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-[15px] font-bold text-green-700 mb-1">
            Thank you!
          </p>
          <p className="text-sm text-green-600 text-center">
            Your review has been submitted and is awaiting approval.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg">
          {/* Rating summary stars */}
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} width="28" height="28" viewBox="0 0 24 24" fill="#E2E8F0" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          <p className="text-[15px] font-bold text-[#1E293B] mb-1.5">
            This product has no reviews yet
          </p>
          <p className="text-sm text-[#64748B] text-center max-w-[320px]">
            Be the first to share your experience with this product.
          </p>
        </div>
      )}
    </section>
  )
}
