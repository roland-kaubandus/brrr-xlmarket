import Link from "@/components/SafeLink"

export default function NotFound() {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[80px] sm:py-[120px] text-center">
      <p className="text-[13px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#E8650A] tracking-[0.10em] uppercase mb-[16px]">
        Error 404
      </p>
      <h1 className="text-[64px] sm:text-[96px] font-[800] font-[family-name:var(--font-dm-sans)] text-[#E8E8E8] leading-none mb-[16px]">
        404
      </h1>
      <p className="text-[18px] sm:text-[20px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1a1a2e] mb-[8px]">
        Page not found
      </p>
      <p className="text-[14px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[36px]">
        The requested page does not exist or the address has changed.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-[12px]">
        <Link
          href="/et/"
          className="inline-flex items-center gap-[8px] bg-[#E8650A] text-white px-[24px] py-[12px] text-[15px] font-[600] font-[family-name:var(--font-dm-sans)] hover:bg-[#CF5A08] transition-colors"
        >
          Back to Home
        </Link>
        <Link
          href="/et/kategooriad"
          className="inline-flex items-center gap-[8px] border border-[#E8E8E8] text-[#555555] px-[24px] py-[12px] text-[15px] font-[500] font-[family-name:var(--font-dm-sans)] hover:border-[#E8650A] hover:text-[#0b7d79] transition-colors"
        >
          Browse Categories
        </Link>
      </div>
    </div>
  )
}
