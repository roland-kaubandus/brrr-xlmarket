import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { isValidLocale, getTranslations, localePath } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import { getCategories } from "@/lib/medusa"
import CookieConsent from "@/components/CookieConsent"
import CartSlideOver from "@/components/CartSlideOver"
import MetaPixel from "@/components/MetaPixel"
import SetHtmlLang from "@/components/SetHtmlLang"
import MuujaWidget from "@/components/MuujaWidget"
import VevorHeader from "@/components/VevorHeader"
import VevorFooter from "@/components/VevorFooter"

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
      url: "https://xlmarket.eu",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "XL Market" }],
    },
    alternates: {
      languages: {
        et: "/et",
        en: "/en",
      },
    },
    metadataBase: new URL("https://xlmarket.eu"),
    icons: { icon: "/favicon.svg" },
  }
}

export function generateStaticParams() {
  return [{ locale: "et" }, { locale: "en" }]
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  // Fetch all categories for mega-menu
  let categories: Awaited<ReturnType<typeof getCategories>> = []
  try {
    categories = await getCategories()
  } catch {
    // Fallback to empty if Medusa is unreachable
  }

  // Map to CategoryNode shape
  const categoryNodes = categories.map(c => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
    parent_category_id: c.parent_category_id,
    children: [] as any[],
  }))

  // No need for MeiliSearch subcategory fetching anymore —
  // categories now have real parent-child tree from Medusa (3400+ nodes)

  return (
    <>
      <SetHtmlLang locale={locale} />

      <VevorHeader categories={categoryNodes} locale={locale} />

      <main className="min-h-[100dvh] bg-[#F8FAFC]">{children}</main>

      <VevorFooter locale={locale} />

      <CartSlideOver locale={locale} />
      <CookieConsent locale={locale} />
      <MuujaWidget />
      <MetaPixel />
    </>
  )
}
