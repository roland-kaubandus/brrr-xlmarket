import { getTranslations } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"

export default function AnnouncementBar({ locale = "et" }: { locale?: string }) {
  const t = getTranslations(locale as Locale)
  return (
    <div className="bg-off-black text-white py-2.5 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-center gap-3 text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <span>{t.announcement.freeShipping}</span>
        </span>
        <span className="hidden md:inline text-white/30">|</span>
        <span className="hidden md:inline-flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          <span>{t.announcement.warranty}</span>
        </span>
        <span className="hidden lg:inline text-white/30">|</span>
        <span className="hidden lg:inline-flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>{t.announcement.delivery}</span>
        </span>
      </div>
    </div>
  )
}
