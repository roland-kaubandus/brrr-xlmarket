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

/**
 * Brändi kuvanimi TOOTEMETADATA'st — MITTE title'st. Kriitiline peale VEVOR-title-stripi
 * (2026-08-24): title ei sisalda enam brändi, seega schema.org Product.brand peab tulema
 * metadata'st (peegeldab backend deriveBrandSlug loogikat). Multi-brand: Powermat/KraftDele.
 */
const BRAND_NAMES: Record<string, string> = {
  vevor: "VEVOR", powermat: "Powermat", kraftdele: "KraftDele", blacktools: "BlackTools",
}
function deriveBrandName(product: Product): string {
  const m = ((product as any).metadata || {}) as Record<string, any>
  const src = String(m.source || "").trim().toLowerCase()
  const ssku = String(m.supplier_sku || "").trim().toUpperCase()
  let slug: string | null = null
  if (src) slug = src
  else if (ssku.startsWith("PM-")) slug = "powermat"
  else if (ssku.startsWith("VV-")) slug = "vevor"
  else if (m.vevor_sku || m.vevor_product_type || m.vevor_upc) slug = "vevor"
  // Fallback VEVOR: praegu 100% kataloogist on VEVOR; tundmatu metadata → ära jäta brändita.
  return slug ? (BRAND_NAMES[slug] || slug) : "VEVOR"
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
      name: deriveBrandName(product),
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
