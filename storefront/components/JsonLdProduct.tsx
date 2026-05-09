import type { Product } from "@/lib/medusa"

/**
 * JsonLdProduct — Schema.org Product + Offer markup.
 * Spec F5.1 — Rich Results Test must pass 10 random PDPs.
 *
 * Required fields for Google Merchant eligibility (2026):
 *   - image, name, description, brand, offers.price, offers.priceCurrency,
 *     offers.availability, offers.itemCondition, sku,
 *     offers.hasMerchantReturnPolicy, offers.shippingDetails
 */

type Props = {
  product: Product
  price?: { calculated_amount: number; currency_code: string }
  locale?: string
}

export default function JsonLdProduct({ product, price, locale = "en" }: Props) {
  const variant = product.variants?.[0]
  const sku =
    (variant as any)?.sku ||
    ((product as any).metadata?.vevor_sku as string | undefined) ||
    product.id

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url: `https://xlmarket.ee/${locale}/toode/${product.handle}`,
    description: product.description
      ? product.description.replace(/<[^>]*>/g, "").substring(0, 500)
      : product.title,
    sku,
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
      itemCondition: "https://schema.org/NewCondition",
      url: `https://xlmarket.ee/${locale}/toode/${product.handle}`,
      seller: {
        "@type": "Organization",
        name: "XLMARKET",
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "EE",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "4.99",
          currency: "EUR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "EE",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 3,
            unitCode: "DAY",
          },
        },
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
