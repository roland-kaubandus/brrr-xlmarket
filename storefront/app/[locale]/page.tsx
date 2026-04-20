import type { Metadata } from "next"
import HomepageShell from "@/components/HomepageShell"
import { getHomepageL1Nodes } from "@/lib/menu-data"

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isEt = locale === "et"
  return {
    title: isEt
      ? "XLMarket — Professionaalsed tööriistad poole hinnaga"
      : "XLMarket — Professional Tools, Half the Price",
    description: isEt
      ? "Üle 16 000 toote: tööriistad, seadmed, köögivarustus, autovarustus. Soodne hind, 2-aastane garantii, tarne üle Euroopa."
      : "Over 16,000 products: tools, equipment, kitchen, automotive. Affordable prices, 2-year warranty, delivery across Europe.",
    alternates: {
      canonical: `https://xlmarket.store/${locale}`,
      languages: {
        et: "https://xlmarket.store/et",
        en: "https://xlmarket.store/en",
      },
    },
  }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  // Compute L1 data server-side — only ~30KB of category nodes go to the client
  // instead of the full 1.5MB category-tree.generated.json (PERF-C1).
  const l1Nodes = getHomepageL1Nodes()
  return <HomepageShell locale={locale} l1Nodes={l1Nodes} />
}
