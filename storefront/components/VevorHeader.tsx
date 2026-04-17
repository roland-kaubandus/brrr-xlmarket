import Link from "@/components/SafeLink"
import NavCartButton from "@/components/NavCartButton"
import SearchBar from "@/components/SearchBar"
import MegaMenu from "@/components/MegaMenu"
import LocaleSwitcher from "@/components/LocaleSwitcher"
import MobileSearchToggle from "@/components/MobileSearchToggle"

const getNavLinks = (locale: string) => locale === "et" ? [
  { label: "Alusta ettevõtet", href: `/${locale}/alustajale`, highlight: true },
  { label: "Ärikliendile", href: `/${locale}/arikliendile` },
  { label: "Hooldus", href: `/${locale}/hooldus` },
  { label: "Pakkumised", href: `/${locale}/otsing?tag=deals` },
] : [
  { label: "Starter kits", href: `/${locale}/alustajale`, highlight: true },
  { label: "B2B", href: `/${locale}/arikliendile` },
  { label: "Service", href: `/${locale}/hooldus` },
  { label: "Deals", href: `/${locale}/otsing?tag=deals` },
]

export default function VevorHeader({ locale = "et" }: { locale?: string }) {
  const NAV_LINKS = getNavLinks(locale)
  return (
    <header className="sticky top-0 z-30" style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 60%, #1E293B 100%)" }}>
      {/* === Row 1: Logo + Search + Actions === */}
      <div className="max-w-[1440px] mx-auto flex items-center px-4 md:px-8 gap-3 md:gap-6 h-[56px] md:h-[68px]">
        {/* Logo */}
        <Link href={`/${locale}`} className="shrink-0 flex items-baseline" style={{ letterSpacing: "-0.03em" }}>
          <span className="text-[1.4rem] md:text-[1.8rem] font-extrabold text-[#D97706] leading-none">XL</span>
          <span className="text-[1.4rem] md:text-[1.8rem] font-semibold text-white leading-none"> Market</span>
        </Link>

        {/* Spacer left */}
        <div className="flex-1" />

        {/* Search bar — desktop, centered */}
        <div className="hidden md:flex items-center gap-2 w-full max-w-[600px]">
          <div className="flex-1">
            <SearchBar locale={locale} variant="dark" />
          </div>
          <button
            type="button"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[0.8rem] font-bold uppercase tracking-wider hover:scale-[1.03] transition-transform"
            style={{ background: "linear-gradient(135deg, #D97706, #E8910A)" }}
            aria-label="AI Search"
            data-ai-trigger
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            AI
          </button>
        </div>

        {/* Spacer right */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-1 md:gap-3 shrink-0">
          <div className="hidden md:block">
            <LocaleSwitcher locale={locale} variant="dark" />
          </div>
          <div className="md:hidden">
            <MobileSearchToggle locale={locale} />
          </div>
          <NavCartButton variant="dark" />
        </div>
      </div>

      {/* === Row 2: Menu + Nav links — desktop only === */}
      <div className="hidden md:block border-t border-white/10">
        <div className="max-w-[1440px] mx-auto flex items-center px-8 h-[48px] gap-1">
          <MegaMenu locale={locale} variant="dark" />
          <nav className="flex items-center gap-0.5">
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className={`px-4 py-1.5 text-[0.95rem] font-semibold rounded-md transition-colors whitespace-nowrap ${
                  link.highlight
                    ? "text-[#D97706] hover:text-[#F59E0B] hover:bg-white/10"
                    : "text-[#94A3B8] hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* === Mobile: hamburger row === */}
      <div className="md:hidden border-t border-white/10">
        <div className="flex items-center px-4 h-[44px]">
          <MegaMenu locale={locale} variant="dark" />
        </div>
      </div>
    </header>
  )
}
