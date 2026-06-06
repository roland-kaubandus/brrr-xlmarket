"use client"
import { useCompare } from "./CompareContext"
import { usePathname } from "next/navigation"
import Link from "@/components/SafeLink"

export default function CompareBar() {
  const { items, remove, clear, count } = useCompare()
  const pathname = usePathname()
  const locale = pathname.split("/")[1] || "en"

  if (count === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-[#D97706] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <div className="max-w-[1360px] mx-auto px-4 py-3 flex items-center gap-4">
        {/* Product thumbnails */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {items.map((item) => (
            <div key={item.id} className="relative flex-shrink-0 group">
              <div className="w-14 h-14 rounded-lg border border-[#E2E8F0] bg-[#FAFAFA] overflow-hidden">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title}
                    className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-[#94A3B8]">—</div>
                )}
              </div>
              <button
                onClick={() => remove(item.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#64748B] text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove from compare"
              >×</button>
              <p className="text-[10px] text-[#64748B] mt-1 max-w-[56px] truncate text-center">{item.title.split(" ").slice(0, 3).join(" ")}</p>
            </div>
          ))}
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 2 - count) }).map((_, i) => (
            <div key={`empty-${i}`} className="w-14 h-14 rounded-lg border-2 border-dashed border-[#E2E8F0] flex items-center justify-center flex-shrink-0">
              <span className="text-[#CBD5E1] text-lg">+</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-medium text-[#1E293B]">
            {count} / 4
          </span>
          <button
            onClick={clear}
            className="text-xs text-[#64748B] hover:text-[#DC2626] transition-colors"
          >
            {locale === "et" ? "Tühjenda" : "Clear"}
          </button>
          <Link
            href={`/${locale}/vordlus`}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              count >= 2
                ? "bg-[#D97706] text-white hover:bg-[#B45309]"
                : "bg-[#E2E8F0] text-[#94A3B8] pointer-events-none"
            }`}
          >
            {locale === "et" ? `Võrdle (${count})` : `Compare (${count})`}
          </Link>
        </div>
      </div>
    </div>
  )
}
