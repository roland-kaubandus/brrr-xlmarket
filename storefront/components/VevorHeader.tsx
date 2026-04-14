import Link from "@/components/SafeLink"
import NavCartButton from "@/components/NavCartButton"
import SearchBar from "@/components/SearchBar"
import MegaMenu from "@/components/MegaMenu"
import AuthButton from "@/components/AuthButton"
import LocaleSwitcher from "@/components/LocaleSwitcher"
import MobileSearchToggle from "@/components/MobileSearchToggle"

const getNavLinks = (locale: string) => locale === "et" ? [
  { label: "Pakkumised", href: `/${locale}/otsing?tag=deals` },
  { label: "Uued", href: `/${locale}/otsing?sort=newest` },
  { label: "Bestsellerid", href: `/${locale}/otsing?tag=hot` },
] : [
  { label: "Deals", href: `/${locale}/otsing?tag=deals` },
  { label: "New", href: `/${locale}/otsing?sort=newest` },
  { label: "Best Sellers", href: `/${locale}/otsing?tag=hot` },
]

export default function VevorHeader({ locale = "et" }: { locale?: string }) {
  const NAV_LINKS = getNavLinks(locale)
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-[1320px] mx-auto h-[56px] flex items-center px-6 gap-3">
        {/* Logo — text only, no box */}
        <Link href={`/${locale}`} className="shrink-0 flex items-baseline" style={{ letterSpacing: "-0.03em" }}>
          <span className="text-[1.2rem] font-extrabold text-[#D97706] leading-none">XL</span>
          <span className="text-[1.2rem] font-semibold text-[#1E293B] leading-none">Market</span>
        </Link>

        {/* Left nav — desktop only */}
        <nav className="hidden lg:flex items-center gap-0.5">
          <MegaMenu locale={locale} />
          {NAV_LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className="px-2.5 py-1.5 text-[0.8rem] font-semibold text-[#475569] rounded-md hover:text-[#1E293B] hover:bg-[#F8FAFC] transition-colors whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search + AI button — centered */}
        <div className="flex-1 flex items-center gap-1.5 max-w-[520px] mx-auto">
          <div className="flex-1 hidden md:block">
            <SearchBar locale={locale} variant="light" />
          </div>
          <button
            type="button"
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-[0.7rem] font-bold uppercase tracking-wider hover:scale-[1.04] transition-transform"
            style={{ background: "linear-gradient(135deg, #D97706, #E8910A)" }}
            aria-label="AI Search"
            data-ai-trigger
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <span className="hidden sm:inline">AI</span>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <div className="hidden md:block">
            <LocaleSwitcher locale={locale} />
          </div>
          <div className="md:hidden">
            <MobileSearchToggle locale={locale} />
          </div>
          <AuthButton />
          <NavCartButton />
        </div>
      </div>
    </header>
  )
}
