import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { isValidLocale, getTranslations, localePath } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import { getCategories } from "@/lib/medusa"
import { searchProducts } from "@/lib/meilisearch"
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

  // Fetch L2 subcategories per L1 from MeiliSearch category_handles facets
  // Each product has category_handles = [L1_handle, L2_handle, L3_handle]
  // We get L2 handles by filtering on L1 and looking at facet distribution
  type SubcatData = { handle: string; name: string; thumbnail: string | null; count: number }
  type L1SubcatMap = Record<string, SubcatData[]>
  let l1Subcategories: L1SubcatMap = {}
  try {
    const L1_HANDLES = [
      "kodu-ja-aed", "toostus-ja-seadmed", "toitlustus-ja-kook", "ehitus-ja-remont",
      "auto-ja-garaaz", "sport-ja-vaba-aeg", "kontor-ja-ladustamine", "elektroonika",
      "kunst-ja-kasitoo", "meditsiin-ja-tervishoid", "lemmikloomad",
    ]
    const results = await Promise.all(
      L1_HANDLES.map(async (l1Handle) => {
        try {
          const res = await searchProducts({
            q: "",
            limit: 1,
            filter: [`category_handles = "${l1Handle}"`],
            facets: ["category_handles"],
          })
          const facets = res.facetDistribution?.category_handles || {}
          // L2 handles = all facet handles EXCEPT the L1 handle itself
          const subcats = Object.entries(facets)
            .filter(([h]) => h !== l1Handle)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 12)
            .map(([handle, count]) => ({
              handle,
              name: handle.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
              thumbnail: null as string | null,
              count,
            }))
          return { l1Handle, subcats }
        } catch {
          return { l1Handle, subcats: [] }
        }
      })
    )
    // Fetch one product thumbnail per top subcategory (top 6 per L1)
    for (const { l1Handle, subcats } of results) {
      const withThumbs = await Promise.all(
        subcats.slice(0, 6).map(async (sc) => {
          try {
            const r = await searchProducts({
              q: "",
              limit: 1,
              filter: [`category_handles = "${l1Handle}"`, `category_handles = "${sc.handle}"`],
            })
            return { ...sc, thumbnail: r.hits[0]?.thumbnail || null }
          } catch {
            return sc
          }
        })
      )
      // Keep remaining without thumbs
      l1Subcategories[l1Handle] = [...withThumbs, ...subcats.slice(6)]
    }
  } catch {
    // Fallback: empty subcategories
  }

  return (
    <>
      <SetHtmlLang locale={locale} />

      <VevorHeader categories={categoryNodes} locale={locale} subcategories={l1Subcategories} />

      <main className="min-h-[100dvh] bg-[#F8FAFC]">{children}</main>

      <VevorFooter locale={locale} />

      <CartSlideOver locale={locale} />
      <CookieConsent locale={locale} />
      <MuujaWidget />
      <MetaPixel />
    </>
  )
}
