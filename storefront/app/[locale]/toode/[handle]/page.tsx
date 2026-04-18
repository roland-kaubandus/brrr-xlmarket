import { getProduct } from "@/lib/medusa"
import { notFound } from "next/navigation"
import JsonLdProduct from "@/components/JsonLdProduct"
import JsonLdBreadcrumb from "@/components/JsonLdBreadcrumb"
import ProductPageClient from "./ProductPageClient"
import { firstKnownHandle, getBreadcrumbTrail, type Locale as TaxLocale } from "@/lib/category-tree"
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
  const product = await getProduct(handle)
  if (!product) notFound()

  const variant = product.variants?.[0]
  const price = variant?.calculated_price

  // BreadcrumbList JSON-LD — derive from SSoT category-tree.
  // Uses same firstKnownHandle logic as /api/product route for visible breadcrumb.
  const medusaHandles = (product.categories || []).map((c) => c.handle).filter(Boolean) as string[]
  const canonicalNode = firstKnownHandle(medusaHandles)
  const breadcrumbItems = [
    { name: locale === "et" ? "Avaleht" : "Home", url: `https://xlmarket.store/${locale}` },
    ...(canonicalNode
      ? getBreadcrumbTrail(canonicalNode.handle, locale as TaxLocale).map((item) => ({
          name: item.name,
          url: `https://xlmarket.store${categoryPath(locale as "et" | "en", item.handle)}`,
        }))
      : []),
    {
      name: product.title,
      url: `https://xlmarket.store/${locale}/toode/${product.handle}`,
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
