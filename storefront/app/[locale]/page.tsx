import type { Metadata } from "next"
import HomepageShell from "@/components/HomepageShell"
import { getHomepageL1Nodes } from "@/lib/menu-data"
import { getHomepageCms, type HomepageContent } from "@/lib/cms"
import homepageFallback from "@/lib/cms-fallback/homepage.json"
import { getSeasonSpecial } from "@/lib/season-special-data"
import { readHomepageOverrides } from "@/lib/homepage-overrides"

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return {
    title: "XLMarket — Professional Tools, Half the Price",
    description: "Over 16,000 products: tools, equipment, kitchen, automotive. Affordable prices, 2-year warranty, delivery across Europe.",
    alternates: {
      canonical: `https://xlmarket.ee/${locale}`,
      languages: {
        et: "https://xlmarket.ee/et",
        en: "https://xlmarket.ee/en",
      },
    },
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  // Compute L1 data server-side — only ~30KB of category nodes go to the client
  // instead of the full 1.5MB category-tree.generated.json (PERF-C1).
  const overridesDoc = await readHomepageOverrides()
  const l1Nodes = getHomepageL1Nodes(overridesDoc.overrides)
  // CMS content: live Medusa → fallback JSON (ships in bundle as safety net)
  const cms: HomepageContent = (await getHomepageCms(locale)) ?? (homepageFallback as unknown as HomepageContent)
  // Season Special: 2 star deals + 6 strip items, server-fetched.
  const seasonSpecial = await getSeasonSpecial(locale)
  return (
    <HomepageShell
      locale={locale}
      l1Nodes={l1Nodes}
      slides={cms.slides}
      promos={cms.promos}
      navShortNames={cms.nav_short_names}
      seasonSpecial={seasonSpecial}
    />
  )
}
