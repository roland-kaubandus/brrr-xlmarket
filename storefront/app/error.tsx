"use client"

import Link from "@/components/SafeLink"

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[80px] sm:py-[120px] text-center">
      <p className="text-[13px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#E8650A] tracking-[0.10em] uppercase mb-[16px]">
        Error
      </p>
      <h1 className="text-[64px] sm:text-[96px] font-[800] font-[family-name:var(--font-dm-sans)] text-[#E8E8E8] leading-none mb-[16px]">
        Oops
      </h1>
      <p className="text-[18px] sm:text-[20px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1a1a2e] mb-[8px]">
        Something went wrong
      </p>
      <p className="text-[14px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[36px]">
        Please try again or return to the home page.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-[12px]">
        <button
          onClick={reset}
          className="inline-flex items-center gap-[8px] bg-[#E8650A] text-white px-[24px] py-[12px] text-[15px] font-[600] font-[family-name:var(--font-dm-sans)] hover:bg-[#CF5A08] transition-colors"
        >
          Try again
        </button>
        <Link
          href="/et/"
          className="inline-flex items-center gap-[8px] border border-[#E8E8E8] text-[#555555] px-[24px] py-[12px] text-[15px] font-[500] font-[family-name:var(--font-dm-sans)] hover:border-[#E8650A] hover:text-[#0ea5a0] transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
