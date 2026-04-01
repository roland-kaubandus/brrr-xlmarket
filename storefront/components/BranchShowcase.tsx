import Link from "next/link"
import { getTranslations, localePath } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"

function BranchIcon({ type }: { type: string }) {
  const cls = "w-5 h-5 text-muted group-hover:text-accent transition-colors"
  switch (type) {
    case "factory": return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 20h20"/><path d="M6 20V4l6 4V4l6 4v12"/></svg>
    case "health": return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/><path d="M10 14h4m-2-2v4"/></svg>
    case "desk": return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>
    case "broom": return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v8m-4 4l4-4 4 4m-8 0c0 4 1.5 8 4 8s4-4 4-8"/></svg>
    case "brush": return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 00-2.82 0L8 7l9 9 1.59-1.59a2 2 0 000-2.82L17 10l4.37-4.37a2.12 2.12 0 10-3-3zM9 8a2 2 0 00-1.41.59l-4 4a2 2 0 000 2.82L7 19l5-5"/></svg>
    case "chef": return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
    default: return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/></svg>
  }
}

export default function BranchShowcase({ locale = "et" }: { locale?: string }) {
  const t = getTranslations(locale as Locale)
  const lp = (path: string) => localePath(locale as Locale, path)

  const mainBranches = [
    { nameKey: "suurkoogiseadmed", descKey: "suurkoogiseadmedDesc", href: "/haru/suurkoogiseadmed", img: "/images/branches/suurkoogiseadmed.png", badge: t.branches.popular, span: "md:col-span-8 md:row-span-2", minH: "min-h-[300px] md:min-h-[480px]", titleSize: "text-2xl md:text-3xl" },
    { nameKey: "merevarustus", descKey: "merevarustusDesc", href: "/haru/merevarustus", img: "/images/branches/merevarustus.png", badge: null, span: "md:col-span-4", minH: "min-h-[220px]", titleSize: "text-xl" },
    { nameKey: "ehitus", descKey: "ehitusDesc", href: "/haru/ehitus-ja-remont", img: "/images/branches/ehitus.png", badge: null, span: "md:col-span-4", minH: "min-h-[220px]", titleSize: "text-xl" },
    { nameKey: "garaaz", descKey: "garaazDesc", href: "/haru/garaaz-ja-auto", img: "/images/branches/garaaz.png", badge: null, span: "md:col-span-4", minH: "min-h-[220px]", titleSize: "text-xl" },
    { nameKey: "aed", descKey: "aedDesc", href: "/haru/aed-ja-maastik", img: "/images/branches/aed.png", badge: null, span: "md:col-span-4", minH: "min-h-[220px]", titleSize: "text-xl" },
    { nameKey: "spordiklubi", descKey: "spordiklubiDesc", href: "/haru/spordiklubi", img: "/images/branches/spordiklubi.png", badge: null, span: "md:col-span-4", minH: "min-h-[220px]", titleSize: "text-xl" },
  ]

  const extraBranches = [
    { nameKey: "toostus", subKey: "toostusSub", href: "/haru/toostus", icon: "factory" },
    { nameKey: "tervis", subKey: "tervisSub", href: "/haru/tervis", icon: "health" },
    { nameKey: "kontor", subKey: "kontorSub", href: "/haru/kontor", icon: "desk" },
    { nameKey: "puhastus", subKey: "puhastusSub", href: "/haru/puhastus", icon: "broom" },
    { nameKey: "kasitoo", subKey: "kasitooSub", href: "/haru/kasitoo", icon: "brush" },
    { nameKey: "toitlustus", subKey: "toitlustusSub", href: "/haru/toitlustus", icon: "chef" },
  ]

  return (
    <section className="py-24 md:py-32 bg-white" id="branches">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="max-w-2xl mb-16">
          <span className="inline-block text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-4">{t.branches.eyebrow}</span>
          <h2 className="font-[family-name:var(--font-outfit)] font-[800] text-3xl md:text-5xl tracking-tighter leading-[1.05] mb-4">{t.branches.title}</h2>
          <p className="text-muted text-lg leading-relaxed">{t.branches.subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
          {mainBranches.map((branch, i) => (
            <Link key={branch.nameKey} href={lp(branch.href)} className={`${branch.span} relative rounded-3xl overflow-hidden group cursor-pointer ${branch.minH}`}>
              <img src={branch.img} alt={t.branches[branch.nameKey]} className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105" />
              <div className="absolute inset-0 branch-card-overlay" />
              <div className={`absolute bottom-0 left-0 right-0 ${i === 0 ? "p-6 md:p-8" : "p-5"}`}>
                {branch.badge && <span className="inline-block px-3 py-1 bg-accent/90 text-white text-[10px] uppercase tracking-[0.15em] font-semibold rounded-full mb-3">{branch.badge}</span>}
                <h3 className={`font-[family-name:var(--font-outfit)] font-bold ${branch.titleSize} text-white tracking-tight mb-1`}>{t.branches[branch.nameKey]}</h3>
                <p className="text-white/60 text-sm max-w-md">{t.branches[branch.descKey]}</p>
                {i === 0 && (
                  <span className="inline-flex items-center gap-2 text-white/80 text-sm font-medium mt-4 group-hover:text-accent transition-colors duration-300">
                    {t.branches.exploreStore}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform duration-300"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {extraBranches.map((branch) => (
            <Link key={branch.nameKey} href={lp(branch.href)} className="shrink-0 flex items-center gap-3 px-5 py-4 bg-silver rounded-2xl hover:bg-accent-light hover:border-accent/10 border border-transparent transition-all duration-300 group">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                <BranchIcon type={branch.icon} />
              </div>
              <div>
                <span className="text-sm font-semibold block">{t.branches[branch.nameKey]}</span>
                <span className="text-xs text-muted">{t.branches[branch.subKey]}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
