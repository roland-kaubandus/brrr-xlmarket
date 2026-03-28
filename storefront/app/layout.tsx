import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Link from "next/link"
import CookieConsent from "@/components/CookieConsent"
import MetaPixel from "@/components/MetaPixel"
import JsonLdOrganization from "@/components/JsonLdOrganization"
import "./globals.css"

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="et">
      <body className={`${inter.variable} font-[family-name:var(--font-inter)] antialiased bg-gray-50 text-gray-900`}>
        <JsonLdOrganization />
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="shrink-0 flex items-baseline gap-0.5"
            >
              <span className="text-2xl font-extrabold tracking-tight text-brand-600">XL</span>
              <span className="text-2xl font-bold tracking-tight text-gray-900">MARKET</span>
            </Link>

            {/* Search */}
            <form
              action="/otsing"
              method="GET"
              className="flex-1 max-w-xl hidden sm:flex"
            >
              <input
                type="search"
                name="q"
                placeholder="Otsi tooteid..."
                className="w-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-brand-500 transition"
              />
              <button
                type="submit"
                className="bg-brand-500 text-white px-4 py-2 text-sm font-medium hover:bg-brand-600 transition shrink-0"
              >
                Otsi
              </button>
            </form>

            <nav className="flex items-center gap-4 text-sm shrink-0">
              <Link
                href="/kategooriad"
                className="hover:text-brand-600 hidden md:block"
              >
                Kategooriad
              </Link>
              <Link href="/ostukorv" className="hover:text-brand-600">
                Ostukorv
              </Link>
            </nav>
          </div>
          {/* Mobile search */}
          <div className="sm:hidden border-t border-gray-100 px-4 py-2">
            <form action="/otsing" method="GET" className="flex">
              <input
                type="search"
                name="q"
                placeholder="Otsi tooteid..."
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="bg-brand-500 text-white px-3 py-2 text-sm font-medium hover:bg-brand-600 shrink-0"
              >
                Otsi
              </button>
            </form>
          </div>
        </header>

        <main className="min-h-screen">{children}</main>

        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm text-gray-500">
              {/* Company info */}
              <div>
                <p className="text-lg mb-3">
                  <span className="font-extrabold text-brand-600">XL</span>
                  <span className="font-bold text-gray-900">MARKET</span>
                </p>
                <p>Roland Kaubandus OÜ</p>
                <p className="mt-2">
                  <a href="mailto:info@xlmarket.eu" className="hover:text-brand-600">
                    info@xlmarket.eu
                  </a>
                </p>
              </div>

              {/* Shop links */}
              <div>
                <p className="font-medium text-gray-900 mb-3">Pood</p>
                <nav className="flex flex-col gap-2">
                  <Link href="/kategooriad" className="hover:text-brand-600">Kategooriad</Link>
                  <Link href="/otsing" className="hover:text-brand-600">Otsing</Link>
                  <Link href="/ostukorv" className="hover:text-brand-600">Ostukorv</Link>
                </nav>
              </div>

              {/* Info links */}
              <div>
                <p className="font-medium text-gray-900 mb-3">Info</p>
                <nav className="flex flex-col gap-2">
                  <Link href="/meist" className="hover:text-brand-600">Meist</Link>
                  <Link href="/tarne" className="hover:text-brand-600">Tarneinfo</Link>
                  <Link href="/tagastamine" className="hover:text-brand-600">Tagastamine</Link>
                  <Link href="/kontakt" className="hover:text-brand-600">Kontakt</Link>
                </nav>
              </div>

              {/* Legal links */}
              <div>
                <p className="font-medium text-gray-900 mb-3">Õiguslik</p>
                <nav className="flex flex-col gap-2">
                  <Link href="/tingimused" className="hover:text-brand-600">Müügitingimused</Link>
                  <Link href="/privaatsus" className="hover:text-brand-600">Privaatsuspoliitika</Link>
                  <Link href="/kupsised" className="hover:text-brand-600">Küpsiste poliitika</Link>
                </nav>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-8 pt-6 text-xs text-gray-400 text-center">
              &copy; {new Date().getFullYear()} Roland Kaubandus OÜ. Kõik õigused kaitstud.
            </div>
          </div>
        </footer>

        <CookieConsent />
        <MetaPixel />
      </body>
    </html>
  )
}
