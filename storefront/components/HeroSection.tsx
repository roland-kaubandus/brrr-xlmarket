import Link from "next/link"
import { getTranslations, localePath } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"

export default function HeroSection({ locale = "et" }: { locale?: string }) {
  const t = getTranslations(locale as Locale)
  const lp = (path: string) => localePath(locale as Locale, path)
  return (
    <section className="relative min-h-[100dvh] md:min-h-[85dvh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src="/images/branches/homepage-hero.png" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/40 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent md:hidden" />
      </div>
      <div className="relative max-w-[1400px] mx-auto px-4 w-full py-24 md:py-32">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-light border border-accent/10 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-accent rounded-full" />
            <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-accent">{t.hero.eyebrow}</span>
          </div>
          <h1 className="font-[family-name:var(--font-outfit)] font-[800] text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tighter leading-[0.95] text-off-black mb-6">
            {t.hero.title1}
            <span className="text-accent">{t.hero.titleHighlight}</span>
            {t.hero.title2}
          </h1>
          <p className="text-lg md:text-xl text-muted leading-relaxed max-w-[50ch] mb-10">{t.hero.subtitle}</p>
          <div className="flex flex-wrap gap-4">
            <Link href={lp("/kategooriad")} className="btn-press inline-flex items-center gap-3 bg-off-black text-white px-7 py-4 rounded-2xl font-semibold text-sm hover:bg-accent transition-colors duration-500 group">
              <span>{t.hero.ctaBranches}</span>
              <span className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-[1px] transition-transform duration-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </span>
            </Link>
            <Link href={lp("/otsing")} className="btn-press inline-flex items-center gap-3 bg-white text-off-black px-7 py-4 rounded-2xl font-semibold text-sm border border-soft-border hover:border-accent/30 hover:bg-accent-light transition-all duration-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span>{t.hero.ctaSearch}</span>
            </Link>
          </div>
          <div className="flex items-center gap-8 mt-12 pt-8 border-t border-soft-border">
            <div>
              <span className="font-[family-name:var(--font-outfit)] font-bold text-2xl text-off-black">12</span>
              <span className="block text-xs text-muted mt-0.5">{t.hero.statBranches}</span>
            </div>
            <div className="w-px h-10 bg-silver-dark" />
            <div>
              <span className="font-[family-name:var(--font-outfit)] font-bold text-2xl text-off-black">48h</span>
              <span className="block text-xs text-muted mt-0.5">{t.hero.statDelivery}</span>
            </div>
            <div className="w-px h-10 bg-silver-dark" />
            <div>
              <span className="font-[family-name:var(--font-outfit)] font-bold text-2xl text-off-black">2a</span>
              <span className="block text-xs text-muted mt-0.5">{t.hero.statWarranty}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
