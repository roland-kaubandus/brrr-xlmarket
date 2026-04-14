import { getProduct } from "@/lib/medusa"
import { notFound } from "next/navigation"
import JsonLdProduct from "@/components/JsonLdProduct"
import ProductPageClient from "./ProductPageClient"

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

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <JsonLdProduct product={product} price={price} locale={locale} />
      <ProductPageClient handle={handle} locale={locale} />
    </div>
  )
}
