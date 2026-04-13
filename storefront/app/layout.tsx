import { DM_Sans } from "next/font/google"
import JsonLdOrganization from "@/components/JsonLdOrganization"
import PostHogProvider from "@/components/PostHogProvider"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-dm-sans",
})

export const metadata = {
  verification: { google: "7CAn8vXu2SXJONPYZqctcHXWLFfRulKeyXy5" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="scroll-smooth" suppressHydrationWarning>
      <body className={dmSans.variable + " min-h-screen flex flex-col font-[family-name:var(--font-dm-sans)] antialiased bg-off-white text-off-black"}>
        <JsonLdOrganization />
        <div className="noise-overlay" />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
