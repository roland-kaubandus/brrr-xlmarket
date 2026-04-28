import Link from "@/components/SafeLink"
import NavCartButton from "@/components/NavCartButton"
import SearchBar from "@/components/SearchBar"
import MegaMenu from "@/components/MegaMenu"
import MobileSearchToggle from "@/components/MobileSearchToggle"
import HeaderNavLinks from "@/components/HeaderNavLinks"
import LocaleSwitcher from "@/components/LocaleSwitcher"
import { getMenuSlice } from "@/lib/menu-data"
import { getTranslations, t } from "@/lib/i18n"

// Nav labels pulled from messages/{locale}.json nav.* — `matchPrefix` is used
// client-side to highlight the active link.
const getNavLinks = (locale: string, labels: ReturnType<typeof getTranslations>) => [
  { label: t(labels, "nav.starterKits"), href: `/${locale}/alustajale`, highlight: true, matchPrefix: `/${locale}/alustajale` },
  { label: t(labels, "nav.b2b"), href: `/${locale}/arikliendile`, matchPrefix: `/${locale}/arikliendile` },
  { label: t(labels, "nav.service"), href: `/${locale}/hooldus`, matchPrefix: `/${locale}/hooldus` },
  { label: t(labels, "nav.deals"), href: `/${locale}/otsing?sort=deals`, matchPrefix: "" },
]

export default async function VevorHeader({ locale = "en" }: { locale?: string }) {
  const labels = getTranslations(locale as "et" | "en")
  const NAV_LINKS = getNavLinks(locale, labels)
  // Compute menu slice server-side — only L1 + L2 (~30KB) goes to the client.
  // L3+ is fetched lazily by MegaMenu via /api/category-children.
  const menuData = getMenuSlice()

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

        {/* Search bar — desktop, centered. AI is in the SearchBar itself. */}
        <div className="hidden md:flex items-center w-full max-w-[600px]">
          <div className="flex-1">
            <SearchBar locale={locale} variant="dark" />
          </div>
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
          <MegaMenu locale={locale} variant="dark" menuData={menuData} />
          <HeaderNavLinks links={NAV_LINKS} />
        </div>
      </div>

      {/* === Mobile: hamburger row === */}
      <div className="md:hidden border-t border-white/10">
        <div className="flex items-center px-4 h-[44px]">
          <MegaMenu locale={locale} variant="dark" menuData={menuData} />
        </div>
      </div>
    </header>
  )
}
