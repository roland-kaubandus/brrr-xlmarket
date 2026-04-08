import Link from "next/link"
import NavCartButton from "@/components/NavCartButton"
import SearchBar from "@/components/SearchBar"
import MegaMenu from "@/components/MegaMenu"
import type { CategoryNode } from "@/components/MegaMenu"

const getNavLinks = (locale: string) => [
  { label: "Deals", href: `/${locale}/otsing?sort=deals` },
  { label: "New", href: `/${locale}/otsing?sort=new` },
  { label: "Best Sellers", href: `/${locale}/otsing?sort=best` },
  { label: "Clearance", href: `/${locale}/otsing?sort=clearance` },
  { label: "About Us", href: `/${locale}/meist` },
]

export default function VevorHeader({ categories, locale = "et" }: { categories: CategoryNode[]; locale?: string }) {
  const NAV_LINKS = getNavLinks(locale)
  return (
    <header className="sticky top-0 z-30">
      {/* Row 1: Black top bar */}
      <div className="bg-[#1E293B] h-[48px] md:h-[56px]">
        <div className="max-w-[1400px] mx-auto px-4 h-full flex items-center gap-4">
          {/* Logo */}
          <Link href={`/${locale}`} className="shrink-0 flex items-baseline gap-[2px] mr-4">
            <span className="text-[24px] md:text-[28px] font-extrabold text-[#D97706] leading-none tracking-tight">XL</span>
            <span className="text-[24px] md:text-[28px] font-normal text-white leading-none tracking-tight">Market</span>
          </Link>

          {/* Search bar — desktop */}
          <div className="hidden md:flex flex-1 justify-center">
            <SearchBar locale={locale} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            {/* Delivery indicator — desktop */}
            <div className="hidden lg:flex items-center gap-2 text-white text-[13px]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
                <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span className="text-white/70">Delivery to <strong className="text-white">Estonia</strong></span>
            </div>

            {/* Sign in — desktop */}
            <Link href={`/${locale}/kontakt`} className="hidden md:flex items-center gap-2 text-white text-[13px] hover:text-[#D97706] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-white/70">Hello, <strong className="text-white">Sign In</strong></span>
            </Link>

            {/* Cart */}
            <div className="[&_a]:text-white [&_a]:hover:text-[#D97706] [&_a]:hover:bg-transparent">
              <NavCartButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden bg-[#1E293B] px-4 pb-3">
        <SearchBar locale={locale} />
      </div>

      {/* Row 2: Orange navigation bar */}
      <div className="bg-[#D97706]">
        <div className="max-w-[1400px] mx-auto px-0 md:px-4 flex items-center h-[44px]">
          {/* Categories button + mega menu */}
          <MegaMenu categories={categories} locale={locale} />

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center">
            <div className="w-px h-[24px] bg-white/30 mx-1" />
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="px-4 h-[44px] flex items-center text-white text-[14px] font-semibold hover:bg-[#B45309] transition-colors whitespace-nowrap"
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
