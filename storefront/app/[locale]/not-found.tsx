export default function NotFound() {
  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[80px] sm:py-[120px] text-center">
      <p className="text-[13px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#E8650A] tracking-[0.10em] uppercase mb-[16px]">
        Error 404
      </p>
      <h1 className="text-[64px] sm:text-[96px] font-[800] font-[family-name:var(--font-dm-sans)] text-[#E8E8E8] leading-none mb-[16px]">
        404
      </h1>
      <p className="text-[18px] sm:text-[20px] font-[600] font-[family-name:var(--font-dm-sans)] text-[#1E293B] mb-[8px]">
        Page not found
      </p>
      <p className="text-[14px] font-[family-name:var(--font-dm-sans)] text-[#999999] mb-[36px]">
        The requested page does not exist or the address has changed.
      </p>
    </div>
  )
}
