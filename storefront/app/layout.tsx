import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"

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
  },
  twitter: {
    card: "summary",
    title: "XLMARKET",
    description:
      "Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga.",
  },
  metadataBase: new URL("https://xlmarket.eu"),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="et">
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight shrink-0"
            >
              XLMARKET
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
                className="w-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-amber-500 transition"
              />
              <button
                type="submit"
                className="bg-amber-500 text-white px-4 py-2 text-sm font-medium hover:bg-amber-600 transition shrink-0"
              >
                Otsi
              </button>
            </form>

            <nav className="flex items-center gap-4 text-sm shrink-0">
              <Link
                href="/kategooriad"
                className="hover:text-amber-600 hidden md:block"
              >
                Kategooriad
              </Link>
              <Link href="/ostukorv" className="hover:text-amber-600">
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
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-500 text-white px-3 py-2 text-sm font-medium hover:bg-amber-600 shrink-0"
              >
                Otsi
              </button>
            </form>
          </div>
        </header>

        <main className="min-h-screen">{children}</main>

        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row justify-between gap-4 text-sm text-gray-500">
              <div>
                <p className="font-medium text-gray-900 mb-1">XLMARKET</p>
                <p>Roland Kaubandus OÜ</p>
                <p>info@xlmarket.eu</p>
              </div>
              <nav className="flex gap-6">
                <Link href="/kategooriad" className="hover:text-amber-600">
                  Kategooriad
                </Link>
                <Link href="/ostukorv" className="hover:text-amber-600">
                  Ostukorv
                </Link>
              </nav>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
