import Link from "next/link"
import { getTranslations, localePath } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"

export default function ThreePathsSection({ locale = "et" }: { locale?: string }) {
  const t = getTranslations(locale as Locale)
  const lp = (path: string) => localePath(locale as Locale, path)
  return (
    <section className="py-24 md:py-32 bg-silver/50" id="kuidas-see-tootab">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-4">{t.threePaths.eyebrow}</span>
          <h2 className="font-[family-name:var(--font-outfit)] font-[800] text-3xl md:text-5xl tracking-tighter leading-[1.05]">{t.threePaths.title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-4">
            <div className="bg-white rounded-3xl p-8 md:p-10 h-full border border-soft-border card-lift">
              <div className="w-14 h-14 bg-accent-light rounded-2xl flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <h3 className="font-[family-name:var(--font-outfit)] font-bold text-xl tracking-tight mb-3">{t.threePaths.searchTitle}</h3>
              <p className="text-muted text-sm leading-relaxed mb-6">{t.threePaths.searchDesc}</p>
              <Link href={lp("/otsing")} className="btn-press inline-flex items-center gap-2 text-accent text-sm font-semibold hover:gap-3 transition-all duration-300">
                {t.threePaths.searchCta}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="bg-white rounded-3xl p-8 md:p-10 h-full border border-soft-border card-lift">
              <div className="w-14 h-14 bg-accent-light rounded-2xl flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              </div>
              <h3 className="font-[family-name:var(--font-outfit)] font-bold text-xl tracking-tight mb-3">{t.threePaths.browseTitle}</h3>
              <p className="text-muted text-sm leading-relaxed mb-6">{t.threePaths.browseDesc}</p>
              <Link href={lp("/kategooriad")} className="btn-press inline-flex items-center gap-2 text-accent text-sm font-semibold hover:gap-3 transition-all duration-300">
                {t.threePaths.browseCta}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="bg-off-black text-white rounded-3xl p-8 md:p-10 h-full card-lift relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6m-3-3h6"/></svg>
                </div>
                <h3 className="font-[family-name:var(--font-outfit)] font-bold text-xl tracking-tight mb-3">{t.threePaths.sellerTitle}</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-6">{t.threePaths.sellerDesc}</p>
                <Link href={lp("/otsing")} className="btn-press inline-flex items-center gap-2 text-accent text-sm font-semibold hover:gap-3 transition-all duration-300">
                  {t.threePaths.sellerCta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
