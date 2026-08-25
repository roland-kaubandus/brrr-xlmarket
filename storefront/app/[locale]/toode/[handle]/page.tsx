import { getProduct } from "@/lib/medusa"
import { getMeiliProductByHandle } from "@/lib/meilisearch"
import { getVevorFeedEntryAsync, deriveInStock } from "@/lib/vevor-feed"
import { notFound } from "next/navigation"
import JsonLdProduct from "@/components/JsonLdProduct"
import JsonLdBreadcrumb from "@/components/JsonLdBreadcrumb"
import ProductPageClient from "./ProductPageClient"
import { deepestKnownHandle, getBreadcrumbTrail } from "@/lib/category-tree"
import { categoryPath } from "@/lib/i18n"

export const revalidate = 3600

type Props = {
  params: Promise<{ handle: string; locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle, locale } = await params
  const product = await getProduct(handle)
  if (!product) return { title: "Product — XLMARKET" }
  const ogImage = product.thumbnail
  const md = (product.metadata || {}) as Record<string, unknown>
  const titleEt = typeof md.title_et === "string" && md.title_et.trim() ? md.title_et : null
  const descEt = typeof md.description_et === "string" && md.description_et.trim() ? md.description_et : null
  const title = locale === "et" && titleEt ? titleEt : product.title
  const desc =
    locale === "et" && descEt
      ? descEt.replace(/<[^>]*>/g, "").substring(0, 160)
      : product.description
      ? product.description.replace(/<[^>]*>/g, "").substring(0, 160)
      : product.title
  return {
    title: title + " — XLMARKET",
    description: desc,
    alternates: {
      canonical: `https://xlmarket.ee/${locale}/toode/${handle}`,
      languages: {
        et: `https://xlmarket.ee/et/toode/${handle}`,
        en: `https://xlmarket.ee/en/toode/${handle}`,
      },
    },
    openGraph: {
      title: title,
      description: desc,
      images: ogImage ? [{ url: ogImage }] : [],
      type: "website",
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: title,
      description: desc,
      images: ogImage ? [ogImage] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { handle, locale } = await params
  let product: Awaited<ReturnType<typeof getProduct>> = null
  let meiliHit: Awaited<ReturnType<typeof getMeiliProductByHandle>> = null
  try {
    ;[product, meiliHit] = await Promise.all([
      getProduct(handle),
      getMeiliProductByHandle(handle),
    ])
  } catch (err) {
    console.error(`[ProductPage] fetch failed for handle="${handle}":`, err instanceof Error ? err.message : err)
    notFound()
  }
  if (!product) notFound()

  const variant = product.variants?.[0]
  const price = variant?.calculated_price

  // Laoseis JsonLd `availability`'le — SAMA deriveInStock SSoT, mida toote-detaili OOS-fallback
  // (route.ts) kasutab. Meili-up → meiliHit.in_stock (feed-tõde); MEILI-MAAS → feed-cache
  // predikaat (loeme feed-entry AINULT siis, kuum tee ei koorma); mõlemad maas → false
  // (konservatiivne OOS). Vale "InStock" OOS-tootel = Google-karistus → in_stock !== true = OutOfStock.
  const md = (product.metadata || {}) as Record<string, unknown>
  const feedEntry = meiliHit
    ? null
    : await getVevorFeedEntryAsync({
        vevorSku: md.vevor_sku != null ? String(md.vevor_sku) : null,
        vevorUpc: md.vevor_upc != null ? String(md.vevor_upc) : null,
      })
  const inStock = deriveInStock({ meiliHit: meiliHit as { in_stock?: boolean } | null, feedEntry })

  // BreadcrumbList JSON-LD — derive from SSoT category-tree.
  // Same candidate priority as /api/product route:
  //   1. Meili taxonomy.ancestors (resolver v2 authoritative path)
  //   2. Meili category_handles (legacy fallback)
  //   3. Medusa product.categories (Store API may return [] when category is
  //      not publicly listed — cannot be the only source)
  const taxonomyAncestors = meiliHit?.taxonomy?.ancestors || []
  const meiliHandles = meiliHit?.category_handles || []
  const medusaHandles = (product.categories || []).map((c) => c.handle).filter(Boolean) as string[]
  const canonicalNode = deepestKnownHandle([...taxonomyAncestors, ...meiliHandles, ...medusaHandles])
  const breadcrumbItems = [
    { name: "Home", url: `https://xlmarket.ee/${locale}` },
    ...(canonicalNode
      ? getBreadcrumbTrail(canonicalNode.handle, locale).map((item) => ({
          name: item.name,
          url: `https://xlmarket.ee${categoryPath(locale as "et" | "en", item.handle)}`,
        }))
      : []),
    {
      name: product.title,
      url: `https://xlmarket.ee/${locale}/toode/${product.handle}`,
    },
  ]

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <JsonLdProduct product={product} price={price} locale={locale} inStock={inStock} />
      <JsonLdBreadcrumb items={breadcrumbItems} />
      <ProductPageClient handle={handle} locale={locale} />
    </div>
  )
}
