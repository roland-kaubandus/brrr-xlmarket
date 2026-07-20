import { getProduct } from "@/lib/medusa"
import { getMeiliProductByHandle } from "@/lib/meilisearch"
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
  const { handle } = await params
  const product = await getProduct(handle)
  if (!product) return { title: "Product — XLMARKET" }
  const ogImage = product.thumbnail
  const desc = product.description
    ? product.description.replace(/<[^>]*>/g, "").substring(0, 160)
    : product.title
  return {
    title: product.title + " — XLMARKET",
    description: desc,
    openGraph: {
      title: product.title,
      description: desc,
      images: ogImage ? [{ url: ogImage }] : [],
      type: "website",
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: product.title,
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
      <JsonLdProduct product={product} price={price} locale={locale} />
      <JsonLdBreadcrumb items={breadcrumbItems} />
      <ProductPageClient handle={handle} locale={locale} />
    </div>
  )
}
