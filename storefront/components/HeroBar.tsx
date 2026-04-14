export default function HeroBar({ locale = "et" }: { locale?: string }) {
  const isEt = locale === "et"
  return (
    <div
      className="border-t border-white/[.06]"
      style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 60%, #334155 100%)" }}
    >
      <div className="max-w-[1320px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: slogan */}
        <div className="text-white">
          <h2 className="text-[1.05rem] font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Professional Tools, <span className="text-[#F59E0B]">Half the Price</span>
          </h2>
          <p className="text-[0.78rem] text-[#94A3B8] mt-0.5">
            {isEt
              ? "Euroopa VEVOR volitatud edasimüüja — otse tehasest"
              : "Europe's VEVOR authorized dealer — direct from factory"}
          </p>
        </div>

        {/* Right: stats — hidden on mobile */}
        <div className="hidden sm:flex gap-7">
          <div className="text-right">
            <div className="text-[1.1rem] font-extrabold text-[#F59E0B] tabular-nums">16K+</div>
            <div className="text-[0.6rem] text-[#94A3B8] uppercase tracking-widest mt-px">
              {isEt ? "Toodet" : "Products"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[1.1rem] font-extrabold text-[#F59E0B] tabular-nums">1,688</div>
            <div className="text-[0.6rem] text-[#94A3B8] uppercase tracking-widest mt-px">
              {isEt ? "Kategooriat" : "Categories"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
