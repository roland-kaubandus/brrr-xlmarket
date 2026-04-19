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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="scroll-smooth" suppressHydrationWarning>
      <body className={dmSans.variable + " " + playfair.variable + " min-h-screen flex flex-col font-[family-name:var(--font-dm-sans)] antialiased bg-off-white text-off-black"}>
        <JsonLdOrganization />
        <JsonLdWebsite />
        <div className="noise-overlay" />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
