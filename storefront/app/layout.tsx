import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "XLMARKET — Suur valik, väike hind",
  description: "Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga. Kiire tarne Eestis.",
  openGraph: {
    title: "XLMARKET",
    description: "Kvaliteetsed tööriistad, seadmed ja kodukaup soodsa hinnaga.",
    locale: "et_EE",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="et">
      <body className="font-sans antialiased bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-2xl font-bold tracking-tight">
              XLMARKET
            </a>
            <nav className="flex items-center gap-6 text-sm">
              <a href="/categories" className="hover:text-amber-600">Kategooriad</a>
              <a href="/cart" className="hover:text-amber-600">Ostukorv</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-8 text-sm text-gray-500">
            <p>Roland Kaubandus OÜ | info@xlmarket.eu</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
