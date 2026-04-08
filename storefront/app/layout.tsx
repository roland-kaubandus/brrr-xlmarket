import { DM_Sans } from "next/font/google"
import JsonLdOrganization from "@/components/JsonLdOrganization"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-dm-sans",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="scroll-smooth" suppressHydrationWarning>
      <body className={dmSans.variable + " font-[family-name:var(--font-dm-sans)] antialiased bg-off-white text-off-black"}>
        <JsonLdOrganization />
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  )
}
