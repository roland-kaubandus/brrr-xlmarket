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
  /**
   * Päris laoseis SSoT-st (deriveInStock: Meili in_stock → feed-cache → false). true=laos ·
   * false=OOS · undefined=teadmata. Google Shopping vajab õiget saadavust — vale "InStock"
   * OOS-tootel = Merchant-karistus + klient klikib tarnimatut. !==true → OutOfStock (konservatiivne).
   */
  inStock?: boolean
  /**
   * Brändi kuvanimi indekseerija SSoT-st (meiliHit.brand_name — deriveBrandSlug→BRAND_NAMES).
   * ANTUD → kasutatakse otse (üks mehhanism, HARD RULE #5). PUUDUB (Meili maas) → langetatakse
   * tagasi lokaalsele deriveBrandName'ile, mis PEEGELDAB backend deriveBrandSlug loogikat 1:1.
   * Mõlemal teel: TUNDMATU bränd → "" (schema.org brand JÄETAKSE VÄLJA), MITTE "VEVOR".
   */
  brandName?: string
}

/**
 * Brändi kuvanimi TOOTEMETADATA'st — MITTE title'st. Kriitiline peale VEVOR-title-stripi
 * (2026-08-24): title ei sisalda enam brändi, seega schema.org Product.brand peab tulema
 * metadata'st. Peegeldab backend deriveBrandSlug (index-meilisearch.mjs) loogikat 1:1 —
 * BRÄND-AGNOSTILINE: tundmatu metadata → "" (EI vaikimisi "VEVOR"). SSoT = indekseerija
 * brand_name; see on AINULT fallback kui meiliHit puudub (Meili maas). Multi-brand: Powermat/KraftDele.
 */
const BRAND_NAMES: Record<string, string> = {
  vevor: "VEVOR", powermat: "Powermat", kraftdele: "KraftDele", blacktools: "BlackTools",
}
export function deriveBrandName(product: Product): string {
  const m = ((product as any).metadata || {}) as Record<string, any>
  const src = String(m.source || "").trim().toLowerCase()
  const ssku = String(m.supplier_sku || "").trim().toUpperCase()
  let slug: string | null = null
  if (src) slug = src
  else if (ssku.startsWith("PM-")) slug = "powermat"
  else if (ssku.startsWith("VV-")) slug = "vevor"
  else if (m.vevor_sku || m.vevor_product_type || m.vevor_upc) slug = "vevor"
  // BRÄND-AGNOSTILINE: tundmatu → "" (mitte "VEVOR"). Muidu tulevased BlackTools/GEKO
  // tooted märgitaks Google structured-data's valesti VEVORiks. deriveBrandSlug peegeldus.
  if (!slug) return ""
  return BRAND_NAMES[slug] || slug
}

export default function JsonLdProduct({ product, price, locale = "en", inStock, brandName }: Props) {
  // SSoT: eelista indekseerija brand_name'i; puudub → lokaalne peegeldus (mõlemad bränd-agnostilised).
  const brand =
    typeof brandName === "string" && brandName.trim()
      ? brandName.trim()
      : deriveBrandName(product)
  if (!brand) {
    // SIGNAAL: bränd tuvastamata → schema.org brand jäetakse välja (ei valeta "VEVOR"-it).
    // Aitab püüda metadata-lünki (uus tarnija ilma source/supplier_sku'ta).
    console.warn(`[JsonLdProduct] bränd tuvastamata handle="${product.handle}" → schema.org brand VÄLJA JÄETUD`)
  }
  const variant = product.variants?.[0]
  const sku =
    (variant as any)?.sku ||
    ((product as any).metadata?.vevor_sku as string | undefined) ||
    product.id

  const m = ((product as any).metadata || {}) as Record<string, any>
  const titleEt = typeof m.title_et === "string" && m.title_et.trim() ? m.title_et : null
  const descEt = typeof m.description_et === "string" && m.description_et.trim() ? m.description_et : null
  const name = locale === "et" && titleEt ? titleEt : product.title
  const description =
    locale === "et" && descEt
      ? descEt.replace(/<[^>]*>/g, "").substring(0, 500)
      : product.description
      ? product.description.replace(/<[^>]*>/g, "").substring(0, 500)
      : product.title

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url: `https://xlmarket.ee/${locale}/toode/${product.handle}`,
    description,
    sku,
  }

  // Bränd AINULT kui tuvastatud — tühi → väli jäetakse välja (ei emiteeri valet/tühja brändi).
  if (brand) {
    jsonLd.brand = { "@type": "Brand", name: brand }
  }

  const gtin = typeof m.vevor_upc === "string" && m.vevor_upc.trim() ? m.vevor_upc : null
  if (gtin) {
    jsonLd.gtin = gtin
  }

  if (product.thumbnail) {
    jsonLd.image = product.thumbnail
  }

  if (price) {
    jsonLd.offers = {
      "@type": "Offer",
      price: (price.calculated_amount / 100).toFixed(2),
      priceCurrency: price.currency_code?.toUpperCase() || "EUR",
      // Päris laoseis SSoT-st (deriveInStock), MITTE hardcode. Prop → fallback product.in_stock.
      // !==true (OOS VÕI teadmata) → OutOfStock (konservatiivne, väldib Google-karistust).
      availability:
        (inStock !== undefined ? inStock : product.in_stock) === true
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: `https://xlmarket.ee/${locale}/toode/${product.handle}`,
      seller: {
        "@type": "Organization",
        name: "XLmarket",
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
