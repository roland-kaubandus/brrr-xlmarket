import Link from "next/link"
import { getProduct, formatPrice } from "@/lib/medusa"
import { sanitizeHtml } from "@/lib/sanitize"
import { notFound } from "next/navigation"
import AddToCartButton from "./AddToCartButton"
import ProductGallery from "@/components/ProductGallery"
import JsonLdProduct from "@/components/JsonLdProduct"
import JsonLdBreadcrumb from "@/components/JsonLdBreadcrumb"

export const revalidate = 300

type Props = {
  params: Promise<{ handle: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  const product = await getProduct(handle)
  if (!product) return { title: "Toode — XLMARKET" }
  const desc = product.description
    ? product.description.replace(/<[^>]*>/g, "").substring(0, 160)
    : product.title
  return {
    title: `${product.title} — XLMARKET`,
    description: desc,
    openGraph: {
      title: product.title,
      description: desc,
      images: product.thumbnail ? [{ url: product.thumbnail }] : [],
      type: "og:product",
    },
    twitter: {
      card: product.thumbnail ? "summary_large_image" : "summary",
      title: product.title,
      description: desc,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params
  const product = await getProduct(handle)
  if (!product) notFound()

  const variant = product.variants?.[0]
  const price = variant?.calculated_price
  const images = product.images?.length ? product.images : product.thumbnail ? [{ id: "thumb", url: product.thumbnail }] : []

  const breadcrumbItems = [
    { name: "Avaleht", url: "https://xlmarket.eu" },
    ...(product.categories?.[0]
      ? [{ name: product.categories[0].name, url: `https://xlmarket.eu/kategooriad/${product.categories[0].handle}` }]
      : []),
    { name: product.title, url: `https://xlmarket.eu/toode/${product.handle}` },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <JsonLdProduct product={product} price={price} />
      <JsonLdBreadcrumb items={breadcrumbItems} />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6" aria-label="Leheasukoht">
        <Link href="/" className="hover:text-brand-600">Avaleht</Link>
        <span className="mx-2">/</span>
        {product.categories?.[0] && (
          <>
            <Link
              href={`/kategooriad/${product.categories[0].handle}`}
              className="hover:text-brand-600"
            >
              {product.categories[0].name}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-gray-900 line-clamp-1">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Images - interactive gallery */}
        <ProductGallery images={images} title={product.title} />

        {/* Info */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-4">
            {product.title}
          </h1>

          {price && (
            <p className="text-3xl font-bold text-brand-600 mb-6">
              {formatPrice(price.calculated_amount, price.currency_code)}
            </p>
          )}

          {/* Laoseisu badge — Medusa v2 Store API ei paljasta inventory_quantity't.
              Import script märgib otsas tooted draft'iks, seega kõik published tooted on laos. */}
          <div className="mb-6">
            {variant ? (
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium">
                Laos
              </span>
            ) : (
              <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-medium">
                Hetkel ei ole saadaval
              </span>
            )}
          </div>

          {variant ? (
            <AddToCartButton variantId={variant.id} />
          ) : (
            <p className="text-sm text-gray-500">Seda toodet ei saa hetkel osta.</p>
          )}

          {product.description && (
            <div className="mt-10 border-t border-gray-200 pt-8">
              <h2 className="text-lg font-bold mb-4">Kirjeldus</h2>
              <div
                className="text-gray-700 text-sm leading-relaxed [&_br]:block [&_br]:mb-1"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(product.description),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
