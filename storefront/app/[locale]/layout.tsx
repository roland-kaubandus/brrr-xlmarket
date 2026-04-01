import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { isValidLocale, getTranslations, localePath } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import CookieConsent from "@/components/CookieConsent"
import CartSlideOver from "@/components/CartSlideOver"
import NavCartButton from "@/components/NavCartButton"
import MobileNav from "@/components/MobileNav"
import MetaPixel from "@/components/MetaPixel"
import AnnouncementBar from "@/components/AnnouncementBar"
import InstantSearch from "@/components/search/InstantSearch"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import SetHtmlLang from "@/components/SetHtmlLang"
import MuujaWidget from "@/components/MuujaWidget"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const t = getTranslations(locale)
  return {
    title: {
      default: t.meta.title,
      template: "%s | XL Market",
    },
    description: t.meta.description,
    openGraph: {
      title: t.meta.ogTitle,
      description: t.meta.ogDescription,
      locale: locale === "et" ? "et_EE" : "en_US",
      type: "website",
      siteName: "XL Market",
      url: "https://xlmarket.eu",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "XL Market" }],
    },
    alternates: {
      languages: {
        et: "/et",
        en: "/en",
      },
    },
    metadataBase: new URL("https://xlmarket.eu"),
    icons: { icon: "/favicon.svg" },
  }
}

export function generateStaticParams() {
  return [{ locale: "et" }, { locale: "en" }]
}

const branchNavET = [
  { name: "Suurk\u00f6\u00f6giseadmed", href: "/haru/suurkoogiseadmed" },
  { name: "Merevarustus", href: "/haru/merevarustus" },
  { name: "Ehitus ja remont", href: "/haru/ehitus-ja-remont" },
  { name: "Garaaz ja auto", href: "/haru/garaaz-ja-auto" },
  { name: "Aed ja maastik", href: "/haru/aed-ja-maastik" },
  { name: "T\u00f6\u00f6stus", href: "/haru/toostus" },
  { name: "Spordiklubi", href: "/haru/spordiklubi" },
  { name: "Tervis", href: "/haru/tervis" },
  { name: "Kontor", href: "/haru/kontor" },
  { name: "Puhastus", href: "/haru/puhastus" },
  { name: "K\u00e4sit\u00f6\u00f6", href: "/haru/kasitoo" },
  { name: "Toitlustus", href: "/haru/toitlustus" },
]

const branchNavEN = [
  { name: "Commercial Kitchen", href: "/haru/suurkoogiseadmed" },
  { name: "Marine", href: "/haru/merevarustus" },
  { name: "Construction", href: "/haru/ehitus-ja-remont" },
  { name: "Garage & Auto", href: "/haru/garaaz-ja-auto" },
  { name: "Garden", href: "/haru/aed-ja-maastik" },
  { name: "Industry", href: "/haru/toostus" },
  { name: "Sports Club", href: "/haru/spordiklubi" },
  { name: "Health", href: "/haru/tervis" },
  { name: "Office", href: "/haru/kontor" },
  { name: "Cleaning", href: "/haru/puhastus" },
  { name: "Crafts", href: "/haru/kasitoo" },
  { name: "Catering", href: "/haru/toitlustus" },
]

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const t = getTranslations(locale as Locale)
  const branchNav = locale === "en" ? branchNavEN : branchNavET
  const lp = (path: string) => localePath(locale as Locale, path)

  return (
    <>
      <SetHtmlLang locale={locale} />
      <AnnouncementBar locale={locale} />

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-soft-border">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20 gap-4">
            <Link href={lp("/")} className="shrink-0 flex flex-col rounded-[4px]">
              <div className="flex items-baseline gap-[1px]">
                <span className="text-[28px] font-[800] font-[family-name:var(--font-poppins)] leading-none text-accent">XL</span>
                <span className="text-[28px] font-[400] font-[family-name:var(--font-poppins)] leading-none text-off-black">Market</span>
              </div>
            </Link>

            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <InstantSearch className="w-full" locale={locale} />
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <LanguageSwitcher locale={locale} />
              <MobileNav locale={locale} />
              <Link href={lp("/kontakt")} className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-silver transition-colors duration-300" aria-label={t.nav.account}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </Link>
              <Link href={lp("/lemmikud")} className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-silver transition-colors duration-300" aria-label={t.nav.favorites}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </Link>
              <NavCartButton />
            </div>
          </div>

          <nav className="hidden md:block border-t border-soft-border -mx-4 px-4">
            <div className="flex items-center gap-1 overflow-x-auto py-2 hide-scrollbar">
              {branchNav.map((b) => (
                <Link key={b.name} href={lp(b.href)} className="shrink-0 px-3.5 py-2 text-sm font-medium text-muted hover:text-accent hover:bg-accent-light rounded-xl transition-all duration-300">
                  {b.name}
                </Link>
              ))}
              <Link href={lp("/kategooriad")} className="shrink-0 px-3.5 py-2 text-sm font-medium text-accent flex items-center gap-1 hover:bg-accent-light rounded-xl transition-all duration-300">
                {t.nav.allBranches}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </Link>
            </div>
          </nav>
        </div>

        <div className="md:hidden px-4 pb-3 border-t border-soft-border">
          <InstantSearch locale={locale} />
        </div>
      </header>

      <main className="min-h-[100dvh]">{children}</main>

      <footer className="bg-off-black text-white border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-6">
            <div className="col-span-2 md:col-span-4">
              <div className="flex items-baseline gap-[1px] mb-4">
                <span className="text-[24px] font-[800] font-[family-name:var(--font-poppins)] leading-none text-accent">XL</span>
                <span className="text-[24px] font-[400] font-[family-name:var(--font-poppins)] leading-none text-white">Market</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed max-w-sm mb-6">{t.footer.tagline}</p>
              <p className="text-[13px] text-white/30">{t.footer.company}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-xs uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 block">{t.footer.services}</span>
              <div className="space-y-2.5">
                <Link href={lp("/tarne")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.transport}</Link>
                <Link href={lp("/tagastamine")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.returns}</Link>
                <Link href={lp("/tingimused")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.warranty}</Link>
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="text-xs uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 block">{t.footer.info}</span>
              <div className="space-y-2.5">
                <Link href={lp("/meist")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.aboutUs}</Link>
                <Link href={lp("/kontakt")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.contact}</Link>
                <Link href={lp("/kategooriad")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.categories}</Link>
                <Link href={lp("/otsing")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.search}</Link>
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="text-xs uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 block">{t.footer.legal}</span>
              <div className="space-y-2.5">
                <Link href={lp("/privaatsus")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.privacy}</Link>
                <Link href={lp("/tingimused")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.terms}</Link>
                <Link href={lp("/kupsised")} className="block text-sm text-white/60 hover:text-accent transition-colors">{t.footer.cookies}</Link>
              </div>
            </div>
            <div className="col-span-2 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.15em] font-semibold text-white/40 mb-4 block">{t.footer.contactInfo}</span>
              <div className="space-y-2.5">
                <a href="mailto:info@xlmarket.eu" className="block text-sm text-white/60 hover:text-accent transition-colors">info@xlmarket.eu</a>
                <span className="block text-sm text-white/60">+372 5123 4567</span>
                <span className="block text-sm text-white/60">{t.footer.workHours}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <span className="text-xs text-white/30">{t.footer.copyright}</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-white/30">{t.footer.paymentMethods}</span>
              <div className="flex gap-2">
                <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center text-[8px] text-white/40">VISA</div>
                <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center text-[8px] text-white/40">MC</div>
                <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center text-[8px] text-white/40">SEB</div>
                <div className="w-10 h-6 bg-white/10 rounded flex items-center justify-center text-[8px] text-white/40">LHV</div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <CartSlideOver locale={locale} />
      <CookieConsent locale={locale} />
      <MuujaWidget />
      <MetaPixel />
    </>
  )
}
