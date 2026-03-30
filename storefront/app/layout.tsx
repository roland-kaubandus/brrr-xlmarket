import type { Metadata } from "next"
import { Poppins, Inter } from "next/font/google"
import Link from "next/link"
import CookieConsent from "@/components/CookieConsent"
import CartSlideOver from "@/components/CartSlideOver"
import NavCartButton from "@/components/NavCartButton"
import MobileNav from "@/components/MobileNav"
import MetaPixel from "@/components/MetaPixel"
import JsonLdOrganization from "@/components/JsonLdOrganization"
import { User, Search, Heart } from "lucide-react"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
})

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "XLMARKET — Suur valik, väike hind",
    template: "%s",
  },
  description:
    "Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga. Kiire tarne Eestis.",
  openGraph: {
    title: "XLMARKET",
    description:
      "Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga.",
    locale: "et_EE",
    type: "website",
    siteName: "XLMARKET",
    url: "https://xlmarket.eu",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "XLMARKET — Suur valik, väike hind",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "XLMARKET",
    description:
      "Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://xlmarket.eu"),
  icons: {
    icon: "/favicon.svg",
  },
}

const navCategories = [
  { name: "Ehitus", href: "/kategooriad/ehitus-ja-remont" },
  { name: "Tööstus", href: "/kategooriad/toostus-ja-seadmed" },
  { name: "Kodu", href: "/kategooriad/kodu-ja-aed" },
  { name: "Auto", href: "/kategooriad/auto-ja-garaaz" },
  { name: "Sport", href: "/kategooriad/sport-ja-vaba-aeg" },
  { name: "Elektroonika", href: "/kategooriad/elektroonika" },
  { name: "Toitlustus", href: "/kategooriad/toitlustus-ja-kook" },
  { name: "Lemmikloomad", href: "/kategooriad/lemmikloomad" },
  { name: "Kontor", href: "/kategooriad/kontor-ja-ladustamine" },
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
          inter.variable +
          " font-[family-name:var(--font-inter)] antialiased bg-white text-[#333333]"
        }
      >
        <JsonLdOrganization />

        <header className="sticky top-0 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Layer 1: Top bar — 36px (grid: 4.5 * 8) */}
          <div className="bg-[#1A1A1A] text-white">
            <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] flex items-center justify-between h-[36px] text-[12px] font-[family-name:var(--font-inter)]">
              <span className="text-white/80 tracking-wide">
                Tasuta tarne alates €50 · Kliendiabi: info@xlmarket.eu
              </span>
              <span className="hidden sm:inline text-white/50">
                Roland Kaubandus OÜ
              </span>
            </div>
          </div>

          {/* Layer 2: Main header — 64px (grid: 8 * 8) */}
          <div className="bg-white border-b border-[#E8E8E8]">
            <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] flex items-center justify-between h-[64px] gap-[16px]">
              {/* Mobile nav trigger */}
              <MobileNav />

              {/* Logo */}
              <Link
                href="/"
                className="shrink-0 flex items-baseline gap-[1px] rounded-[4px]"
              >
                <span className="text-[28px] font-[800] font-[family-name:var(--font-poppins)] leading-none text-[#E8650A]">
                  XL
                </span>
                <span className="text-[28px] font-[400] font-[family-name:var(--font-poppins)] leading-none text-[#1A1A1A]">
                  Market
                </span>
              </Link>

              {/* Search bar */}
              <form
                action="/otsing"
                method="GET"
                className="flex-1 max-w-[560px] hidden sm:flex"
                role="search"
              >
                <div className="flex w-full rounded-[8px] bg-[#F7F7F7] border border-transparent focus-within:border-[#E8650A] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(232,101,10,0.1)] transition-all">
                  <input
                    type="search"
                    name="q"
                    placeholder="Otsi tooteid..."
                    className="w-full bg-transparent px-[16px] py-[10px] text-[14px] font-[family-name:var(--font-inter)] text-[#333333] placeholder:text-[#999999] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-[16px] text-[#999999] hover:text-[#E8650A] rounded-r-[8px]"
                    aria-label="Otsi"
                  >
                    <Search size={20} strokeWidth={1.5} />
                  </button>
                </div>
              </form>

              {/* Action icons */}
              <nav className="flex items-center gap-[8px] shrink-0" aria-label="Kasutaja toimingud">
                <Link
                  href="/kontakt"
                  className="hidden sm:flex items-center justify-center w-[40px] h-[40px] rounded-[8px] text-[#333333] hover:text-[#E8650A] hover:bg-[#FFF5EE] active:scale-95"
                  aria-label="Konto"
                >
                  <User size={20} strokeWidth={1.5} />
                </Link>
                <Link
                  href="/lemmikud"
                  className="hidden sm:flex items-center justify-center w-[40px] h-[40px] rounded-[8px] text-[#333333] hover:text-[#E8650A] hover:bg-[#FFF5EE] active:scale-95"
                  aria-label="Lemmikud"
                >
                  <Heart size={20} strokeWidth={1.5} />
                </Link>
                <NavCartButton />
              </nav>
            </div>

            {/* Mobile search */}
            <div className="sm:hidden px-[16px] pb-[12px]">
              <form
                action="/otsing"
                method="GET"
                role="search"
              >
                <div className="flex rounded-[8px] bg-[#F7F7F7] border border-transparent focus-within:border-[#E8650A] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(232,101,10,0.1)] transition-all">
                  <input
                    type="search"
                    name="q"
                    placeholder="Otsi tooteid..."
                    className="w-full bg-transparent px-[16px] py-[10px] text-[14px] font-[family-name:var(--font-inter)] text-[#333333] placeholder:text-[#999999] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-[16px] text-[#999999] hover:text-[#E8650A]"
                    aria-label="Otsi"
                  >
                    <Search size={20} strokeWidth={1.5} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Layer 3: Navigation — 44px (grid: 5.5 * 8) */}
          <div className="bg-white border-b border-[#E8E8E8] hidden md:block">
            <nav
              className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] flex items-center gap-[4px] h-[44px] overflow-x-auto"
              aria-label="Kategooriate navigeerimine"
            >
              {navCategories.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="px-[12px] py-[8px] text-[14px] font-[500] font-[family-name:var(--font-poppins)] text-[#333333] hover:text-[#E8650A] border-b-2 border-transparent hover:border-[#E8650A] whitespace-nowrap rounded-t-[4px]"
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                href="/kategooriad"
                className="px-[12px] py-[8px] text-[14px] font-[500] font-[family-name:var(--font-poppins)] text-[#E8650A] hover:text-[#CF5A08] whitespace-nowrap ml-auto rounded-[4px]"
              >
                Kõik kategooriad
              </Link>
            </nav>
          </div>
        </header>

        <main className="min-h-screen">{children}</main>

        {/* Footer — generous vertical rhythm */}
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
                  Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga.
                  Kiire tarne üle Eesti.
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
                      Müügitingimused
                    </Link>
                  </li>
                </ul>
              </nav>

              {/* Ettevõte & Kontakt */}
              <nav aria-label="Ettevõte">
                <p className="font-[family-name:var(--font-poppins)] font-[600] text-[14px] text-white mb-[16px] tracking-wide">
                  Ettevõte
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
                      Küpsised
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
