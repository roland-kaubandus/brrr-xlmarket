import Link from "next/link"
import NavCartButton from "@/components/NavCartButton"
import SearchBar from "@/components/SearchBar"
import MegaMenu from "@/components/MegaMenu"
import AuthButton from "@/components/AuthButton"
import LocaleSwitcher from "@/components/LocaleSwitcher"

const getNavLinks = (locale: string) => locale === "et" ? [
  { label: "Sooduspakkumised", href: `/${locale}/otsing?tag=deals` },
  { label: "Uued", href: `/${locale}/otsing?sort=newest` },
  { label: "Bestsellerid", href: `/${locale}/otsing?tag=hot` },
  { label: "Allahindlus", href: `/${locale}/otsing?tag=flash-sale` },
  { label: "Meist", href: `/${locale}/meist` },
] : [
  { label: "Deals", href: `/${locale}/otsing?tag=deals` },
  { label: "New", href: `/${locale}/otsing?sort=newest` },
  { label: "Best Sellers", href: `/${locale}/otsing?tag=hot` },
  { label: "Clearance", href: `/${locale}/otsing?tag=flash-sale` },
  { label: "About Us", href: `/${locale}/meist` },
]

export default function VevorHeader({ locale = "et" }: { locale?: string }) {
  const NAV_LINKS = getNavLinks(locale)
  return (
    <header className="sticky top-0 z-30 shadow-[0_2px_16px_-2px_rgba(15,23,42,0.12)]">
      {/* Row 1: Dark top bar — logo + auth + cart */}
      <div className="bg-[#1E293B]">
        <div className="max-w-[1400px] mx-auto px-4 h-[52px] md:h-[56px] flex items-center gap-3 md:gap-4">
          {/* Logo */}
          <Link href={`/${locale}`} className="shrink-0 flex items-baseline gap-[2px]">
            <span className="text-[22px] md:text-[28px] font-extrabold text-[#D97706] leading-none tracking-tight">XL</span>
            <span className="text-[22px] md:text-[28px] font-normal text-white leading-none tracking-tight">Market</span>
          </Link>

          {/* Search bar — desktop inline, hidden on mobile (shown in row 2) */}
          <div className="hidden md:block flex-1 min-w-0">
            <SearchBar locale={locale} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 md:gap-4 shrink-0 ml-auto">
            {/* Language switcher */}
            <LocaleSwitcher locale={locale} />

            {/* Delivery indicator — desktop */}
            <div className="hidden lg:flex items-center gap-2 text-white text-[13px]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
                <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span className="text-white/70">{locale === "et" ? "Tarne" : "Delivery to"} <strong className="text-white">{locale === "et" ? "Eestisse" : "Estonia"}</strong></span>
            </div>

            {/* Sign in / Account */}
            <AuthButton />

            {/* Cart */}
            <div className="[&_a]:text-white [&_a]:hover:text-[#D97706] [&_a]:hover:bg-transparent">
              <NavCartButton />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Mobile search bar — full width */}
      <div className="md:hidden bg-[#1E293B] pb-2.5 px-4">
        <SearchBar locale={locale} />
      </div>

      {/* Row 3: Orange navigation bar */}
      <div className="bg-[#D97706]">
        <div className="max-w-[1400px] mx-auto px-2 md:px-4 flex items-center h-[40px]">
          {/* Categories button + mega menu */}
          <MegaMenu locale={locale} />

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center">
            <div className="w-px h-5 bg-black/20 mx-2" />
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3 py-1.5 flex items-center text-[#0F172A] text-[14px] font-semibold rounded-md hover:bg-black/10 transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
