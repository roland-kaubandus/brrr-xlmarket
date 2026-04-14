import Link from "@/components/SafeLink"
import NavCartButton from "@/components/NavCartButton"
import SearchBar from "@/components/SearchBar"
import MegaMenu from "@/components/MegaMenu"
import AuthButton from "@/components/AuthButton"
import LocaleSwitcher from "@/components/LocaleSwitcher"
import MobileSearchToggle from "@/components/MobileSearchToggle"

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
      {/* Row 1: Dark top bar — logo + search + auth + cart */}
      <div className="relative bg-[#1E293B]">
        <div className="max-w-[1400px] mx-auto px-4 h-[52px] md:h-[56px] flex items-center gap-3 md:gap-4">
          {/* Logo */}
          <Link href={`/${locale}`} className="shrink-0 flex items-baseline gap-[2px]">
            <span className="text-[22px] md:text-[28px] font-extrabold text-[#D97706] leading-none tracking-tight">XL</span>
            <span className="text-[22px] md:text-[28px] font-normal text-white leading-none tracking-tight">Market</span>
          </Link>

          {/* Search bar — desktop only, capped width */}
          <div className="hidden md:block flex-1 min-w-0 max-w-md">
            <SearchBar locale={locale} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 md:gap-4 shrink-0 ml-auto">
            {/* Language switcher */}
            <LocaleSwitcher locale={locale} />

            {/* Search toggle — mobile only */}
            <div className="md:hidden">
              <MobileSearchToggle locale={locale} />
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

      {/* Row 2: Orange navigation bar */}
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
