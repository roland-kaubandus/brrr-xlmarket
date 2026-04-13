import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { isValidLocale, getTranslations, localePath } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import CookieConsent from "@/components/CookieConsent"
import CartSlideOver from "@/components/CartSlideOver"
import MetaPixel from "@/components/MetaPixel"
import SetHtmlLang from "@/components/SetHtmlLang"
import MuujaWidget from "@/components/MuujaWidget"
import VevorHeader from "@/components/VevorHeader"
import VevorFooter from "@/components/VevorFooter"
import { CompareProvider } from "@/components/CompareContext"
import CompareBar from "@/components/CompareBar"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const t = getTranslations(locale)
  return {
    title: {
      default: t.meta.title,
      template: "%s | XL Market",
    },
    description: t.meta.description,
    openGraph: {
      title: t.meta.ogTitle,
      description: t.meta.ogDescription,
      locale: locale === "et" ? "et_EE" : "en_US",
      type: "website",
      siteName: "XL Market",
      url: "https://xlmarket.store",
      images: [{ url: "https://xlmarket.store/og-image.png", width: 1200, height: 630, alt: "XL Market" }],
    },
    alternates: {
      canonical: `https://xlmarket.store/${locale}`,
      languages: {
        et: "https://xlmarket.store/et",
        en: "https://xlmarket.store/en",
      },
    },
    metadataBase: new URL("https://xlmarket.store"),
    icons: { icon: "/favicon.svg" },
    verification: {
      google: "7CAn8vXu2SXJONPYZqctcHXWLFfRulKeyXy5",
    },
  }
}

export function generateStaticParams() {
  return [{ locale: "et" }, { locale: "en" }]
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  return (
    <CompareProvider>
      <SetHtmlLang locale={locale} />

      <VevorHeader locale={locale} />

      <main className="flex-1 bg-white">{children}</main>

      <VevorFooter locale={locale} />

      <CartSlideOver locale={locale} />
      <CompareBar />
      <CookieConsent locale={locale} />
      {/* MuujaWidget disabled — not smart enough yet, re-enable when AI search works */}
      <MetaPixel />
    </CompareProvider>
  )
}
