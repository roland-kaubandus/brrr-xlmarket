import { Inter, Poppins, Outfit, Plus_Jakarta_Sans } from "next/font/google"
import JsonLdOrganization from "@/components/JsonLdOrganization"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
})

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
})

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-outfit",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jakarta",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="scroll-smooth" suppressHydrationWarning>
      <body className={inter.variable + " " + poppins.variable + " " + outfit.variable + " " + plusJakarta.variable + " font-[family-name:var(--font-inter)] antialiased bg-off-white text-off-black"}>
        <JsonLdOrganization />
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  )
}
