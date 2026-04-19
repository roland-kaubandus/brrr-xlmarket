import { DM_Sans, Playfair_Display } from "next/font/google"
import JsonLdOrganization from "@/components/JsonLdOrganization"
import JsonLdWebsite from "@/components/JsonLdWebsite"
import PostHogProvider from "@/components/PostHogProvider"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-dm-sans",
})

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-playfair",
})

export const metadata = {
  verification: { google: "7CAn8vXu2SXJONPYZqctcHXWLFfRulKeyXy5" },
}

// Mulish — locked as the category-module body font (2026-04-19).
const CATEGORY_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Mulish:wght@500;600;700&display=swap"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={CATEGORY_FONTS_URL} />
      </head>
      <body className={dmSans.variable + " " + playfair.variable + " min-h-screen flex flex-col font-[family-name:var(--font-dm-sans)] antialiased bg-off-white text-off-black"}>
        <JsonLdOrganization />
        <JsonLdWebsite />
        <div className="noise-overlay" />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
