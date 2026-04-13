import type { Product } from "@/lib/medusa"

type Props = {
  product: Product
  price?: { calculated_amount: number; currency_code: string }
  locale?: string
}

export default function JsonLdProduct({ product, price, locale = "en" }: Props) {
  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url: `https://xlmarket.store/${locale}/toode/${product.handle}`,
    description: product.description
      ? product.description.replace(/<[^>]*>/g, "").substring(0, 500)
      : product.title,
    brand: {
      "@type": "Brand",
      name: "VEVOR",
    },
  }

  if (product.thumbnail) {
    jsonLd.image = product.thumbnail
  }

  if (price) {
    jsonLd.offers = {
      "@type": "Offer",
      price: (price.calculated_amount / 100).toFixed(2),
      priceCurrency: price.currency_code?.toUpperCase() || "EUR",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "XLMARKET",
      },
    }
  }

  if (product.categories?.[0]) {
    jsonLd.category = product.categories[0].name
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
