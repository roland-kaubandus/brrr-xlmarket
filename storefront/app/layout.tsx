import type { Metadata } from "next"
import { Poppins, Outfit, Plus_Jakarta_Sans } from "next/font/google"
import Link from "next/link"
import CookieConsent from "@/components/CookieConsent"
import CartSlideOver from "@/components/CartSlideOver"
import NavCartButton from "@/components/NavCartButton"
import MobileNav from "@/components/MobileNav"
import MetaPixel from "@/components/MetaPixel"
import JsonLdOrganization from "@/components/JsonLdOrganization"
import { User, Heart } from "lucide-react"
import InstantSearch from "@/components/search/InstantSearch"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
})

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-outfit",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jakarta",
})

export const metadata: Metadata = {
  title: {
    default: "XL Market \u2014 Mitte see tavaline e-pood",
    template: "%s",
  },
  description:
    "E-pood, kus saad ka teenindajalt abi. 14 000+ toodet kiire tarnega \u00fcle Eesti.",
  openGraph: {
    title: "XL Market",
    description:
      "E-pood, kus saad ka teenindajalt abi. 14 000+ toodet kiire tarnega \u00fcle Eesti.",
    locale: "et_EE",
    type: "website",
    siteName: "XL Market",
    url: "https://xlmarket.eu",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "XL Market \u2014 Mitte see tavaline e-pood",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "XL Market",
    description:
      "E-pood, kus saad ka teenindajalt abi. 14 000+ toodet kiire tarnega \u00fcle Eesti.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://xlmarket.eu"),
  icons: {
    icon: "/favicon.svg",
  },
}

const navCategories = [
  { name: "K\õik", href: "/kategooriad", isActive: true },
  { name: "Ehitus", href: "/kategooriad/ehitus-ja-remont", isActive: false },
  { name: "T\u00f6\u00f6stus", href: "/kategooriad/toostus-ja-seadmed", isActive: false },
  { name: "Kodu", href: "/kategooriad/kodu-ja-aed", isActive: false },
  { name: "Aed", href: "/kategooriad/aed-ja-oueala", isActive: false },
  { name: "Auto", href: "/kategooriad/auto-ja-garaaz", isActive: false },
  { name: "Sport", href: "/kategooriad/sport-ja-vaba-aeg", isActive: false },
  { name: "Elektroonika", href: "/kategooriad/elektroonika", isActive: false },
  { name: "Toitlustus", href: "/kategooriad/toitlustus-ja-kook", isActive: false },
  { name: "Lemmikloomad", href: "/kategooriad/lemmikloomad", isActive: false },
  { name: "Kontor", href: "/kategooriad/kontor-ja-ladustamine", isActive: false },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="et">
      <body
        className={
          poppins.variable +
          " " +
          outfit.variable +
          " " +
          plusJakarta.variable +
          " font-[family-name:var(--font-jakarta)] antialiased bg-[#FAFAFA] text-[#333333]"
        }
      >
        <JsonLdOrganization />

        <header className="sticky top-0 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Layer 1: Top bar */}
          <div className="bg-[#1A1A1A] text-white">
            <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] flex items-center justify-between h-[36px] text-[12px] font-[family-name:var(--font-jakarta)]">
              <span className="text-white/80 tracking-wide">
                Tasuta tarne alates €50 · Kliendiabi: info@xlmarket.eu
              </span>
              <span className="hidden sm:inline text-white/50">
                Roland Kaubandus OÜ
              </span>
            </div>
          </div>

          {/* Layer 2: Main header */}
          <div className="bg-white border-b border-[#E8E8E8]">
            <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] flex items-center justify-between h-[64px] gap-[16px]">
              {/* Mobile nav trigger */}
              <MobileNav />

              {/* Logo */}
              <Link
                href="/"
                className="shrink-0 flex flex-col rounded-[4px]"
              >
                <div className="flex items-baseline gap-[1px]">
                  <span className="text-[28px] font-[800] font-[family-name:var(--font-poppins)] leading-none text-[#E8650A]">
                    XL
                  </span>
                  <span className="text-[28px] font-[400] font-[family-name:var(--font-poppins)] leading-none text-[#1A1A1A]">
                    Market
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-[family-name:var(--font-jakarta)] leading-none mt-[2px]">
                  Mitte see tavaline e-pood
                </span>
              </Link>

              {/* Search bar */}
              <div className="relative flex-1 max-w-[560px] hidden sm:block">
                <InstantSearch className="w-full" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#E8650A] text-white text-[10px] font-[600] px-[8px] py-[4px] rounded-full whitespace-nowrap pointer-events-none z-10 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  Otsi
                </span>
              </div>

              {/* Action icons */}
              <nav className="flex items-center gap-[8px] shrink-0" aria-label="Kasutaja toimingud">
                <Link
                  href="/kontakt"
                  className="hidden sm:flex items-center justify-center w-[40px] h-[40px] text-[#333333] hover:text-[#E8650A] hover:bg-[#FFF5EE] active:scale-95"
                  aria-label="Konto"
                >
                  <User size={20} strokeWidth={1.5} />
                </Link>
                <Link
                  href="/lemmikud"
                  className="hidden sm:flex items-center justify-center w-[40px] h-[40px] text-[#333333] hover:text-[#E8650A] hover:bg-[#FFF5EE] active:scale-95"
                  aria-label="Lemmikud"
                >
                  <Heart size={20} strokeWidth={1.5} />
                </Link>
                <NavCartButton />
              </nav>
            </div>

            {/* Mobile search */}
            <div className="sm:hidden px-[16px] pb-[12px]">
              <InstantSearch />
            </div>
          </div>

          {/* Layer 3: Category pills navigation */}
          <div className="bg-white border-b border-[#E8E8E8]">
            <nav
              className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] flex items-center gap-[8px] h-[52px] overflow-x-auto hide-scrollbar"
              aria-label="Kategooriate navigeerimine"
            >
              {navCategories.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className={
                    cat.isActive
                      ? "px-[16px] py-[6px] text-[13px] font-[600] font-[family-name:var(--font-jakarta)] bg-[#1A1A1A] text-white rounded-full whitespace-nowrap shrink-0"
                      : "px-[16px] py-[6px] text-[13px] font-[500] font-[family-name:var(--font-jakarta)] border border-[#E8E8E8] text-[#333] rounded-full whitespace-nowrap shrink-0 hover:border-[#E8650A] hover:text-[#E8650A]"
                  }
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="min-h-screen">{children}</main>

        {/* Footer */}
        <footer className="bg-[#1A1A1A] mt-[64px]">
          <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[48px] sm:py-[64px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[32px] lg:gap-[48px]">
              {/* Logo + company */}
              <div className="lg:col-span-2">
                <div className="flex items-baseline mb-[16px]">
                  <span className="text-[24px] font-[800] font-[family-name:var(--font-poppins)] leading-none text-[#E8650A]">
                    XL
                  </span>
                  <span className="text-[24px] font-[400] font-[family-name:var(--font-poppins)] leading-none text-white">
                    Market
                  </span>
                </div>
                <p className="text-[14px] text-white/60 leading-[1.7] max-w-[280px]">
                  E-pood, kus saad ka teenindajalt abi. 14 000+ toodet kiire tarnega \u00fcle Eesti.
                </p>
                <p className="text-[13px] text-white/30 mt-[16px]">
                  Roland Kaubandus OÜ
                </p>
              </div>

              {/* Pood */}
              <nav aria-label="Pood">
                <p className="font-[family-name:var(--font-poppins)] font-[600] text-[14px] text-white mb-[16px] tracking-wide">
                  Pood
                </p>
                <ul className="flex flex-col gap-[12px]">
                  <li>
                    <Link
                      href="/kategooriad"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      Kategooriad
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/otsing"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      Otsing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/ostukorv"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      Ostukorv
                    </Link>
                  </li>
                </ul>
              </nav>

              {/* Klienditugi */}
              <nav aria-label="Klienditugi">
                <p className="font-[family-name:var(--font-poppins)] font-[600] text-[14px] text-white mb-[16px] tracking-wide">
                  Klienditugi
                </p>
                <ul className="flex flex-col gap-[12px]">
                  <li>
                    <Link
                      href="/tarne"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      Tarneinfo
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/tagastamine"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      Tagastamine
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/tingimused"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      M\u00fc\u00fcgitingimused
                    </Link>
                  </li>
                </ul>
              </nav>

              {/* Ettev\õte & Kontakt */}
              <nav aria-label="Ettev\õte">
                <p className="font-[family-name:var(--font-poppins)] font-[600] text-[14px] text-white mb-[16px] tracking-wide">
                  Ettev\õte
                </p>
                <ul className="flex flex-col gap-[12px]">
                  <li>
                    <Link
                      href="/meist"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      Meist
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/kontakt"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      Kontakt
                    </Link>
                  </li>
                  <li>
                    <a
                      href="mailto:info@xlmarket.eu"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      info@xlmarket.eu
                    </a>
                  </li>
                  <li>
                    <Link
                      href="/privaatsus"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      Privaatsuspoliitika
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/kupsised"
                      className="text-[14px] text-white/60 hover:text-[#E8650A]"
                    >
                      K\u00fcpsised
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Copyright bar */}
          <div className="bg-[#111111]">
            <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[16px] flex items-center justify-between">
              <p className="text-[12px] text-white/35">
                © 2026 Roland Kaubandus OÜ. Kõik õigused kaitstud.
              </p>
              <span className="text-[12px] text-white/25">
                Turvaline makse
              </span>
            </div>
          </div>
        </footer>

        <CartSlideOver />
        <CookieConsent />
        <MetaPixel />
      </body>
    </html>
  )
}
