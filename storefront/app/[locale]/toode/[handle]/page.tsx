import Link from "next/link"
import { getProduct, getProducts, formatPrice } from "@/lib/medusa"
import { sanitizeHtml } from "@/lib/sanitize"
import { notFound } from "next/navigation"
import ProductInfoAccordion from "@/components/ProductInfoAccordion"
import ProductReviews from "@/components/ProductReviews"
import RecentlyViewed from "@/components/RecentlyViewed"
import TrackProductView from "@/components/TrackProductView"
import ProductGallery from "@/components/ProductGallery"
import VevorProductCard from "@/components/VevorProductCard"
import JsonLdProduct from "@/components/JsonLdProduct"
import JsonLdBreadcrumb from "@/components/JsonLdBreadcrumb"
import ProductPurchasePanel from "./ProductPurchasePanel"
import CollapsibleDescription from "@/components/CollapsibleDescription"
import CollapsibleSection from "@/components/CollapsibleSection"
import { getProductMedia } from "@/lib/product-media"
import { getVevorFeedEntry, type VevorFeedEntry } from "@/lib/vevor-feed"


export const revalidate = 300

type Props = {
  params: Promise<{ handle: string; locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle, locale } = await params
  const product = await getProduct(handle)
  if (!product) return { title: "Product — XLMARKET" }
  const metadata = product.metadata || {}
  const media = await getProductMedia({
    vevorUpc: stringifyScalar(metadata.vevor_upc),
    vevorSku: stringifyScalar(metadata.vevor_sku),
  })
  const ogImage = media.images[0]?.url || product.thumbnail
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


function parseSpecs(description: string): Array<{ key: string; value: string }> {
  const text = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const specs: Array<{ key: string; value: string }> = []
  const parts = text.split(",")
  for (const part of parts) {
    const colonIdx = part.indexOf(":")
    if (colonIdx > 2 && colonIdx < 40) {
      const key = part.substring(0, colonIdx).trim()
      const value = part.substring(colonIdx + 1).trim()
      if (key.split(" ").length <= 4 && value.length > 0 && value.length < 80) {
        specs.push({ key, value })
      }
    }
  }
  return specs.slice(0, 16)
}

function titleizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function metadataLabel(key: string): string {
  const labels: Record<string, string> = {
    vevor_sku: "VEVOR SKU",
    vevor_upc: "UPC",
    vevor_product_type: "Product Type",
    vevor_link: "Original Source",
    weight_kg: "Weight",
    brand: "Brand",
    model: "Model",
  }
  return labels[key] || titleizeKey(key)
}

function stringifyScalar(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

function collectKeyValueSpecs(value: unknown): Array<{ key: string; value: string }> {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null
        const row = item as Record<string, unknown>
        const key = stringifyScalar(row.key) || stringifyScalar(row.name) || stringifyScalar(row.label)
        const cell = stringifyScalar(row.value) || stringifyScalar(row.text)
        return key && cell ? { key, value: cell } : null
      })
      .filter((item): item is { key: string; value: string } => Boolean(item))
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, cell]) => {
        const normalized = stringifyScalar(cell)
        return normalized ? { key: metadataLabel(key), value: normalized } : null
      })
      .filter((item): item is { key: string; value: string } => Boolean(item))
  }

  return []
}


function getProductSpecs(product: Awaited<ReturnType<typeof getProduct>>, feedEntry?: VevorFeedEntry | null): Array<{ key: string; value: string }> {
  if (!product) return []
  const metadata = product.metadata || {}
  const likelySpecKeys = ["specs", "specifications", "technical_specs", "technical_data", "attributes", "details", "parameters"]

  for (const key of likelySpecKeys) {
    const specs = collectKeyValueSpecs(metadata[key])
    if (specs.length > 0) return specs.slice(0, 24)
  }

  if (product.description) {
    return parseSpecs(product.description)
  }

  if (feedEntry?.descriptionHtml) {
    return parseSpecs(feedEntry.descriptionHtml)
  }

  return []
}

function getManualLinks(metadata?: Record<string, unknown>): Array<{ label: string; href: string }> {
  if (!metadata) return []
  const candidates = ["manuals", "manual_urls", "pdfs", "pdf_urls", "manual_files"]
  const links: Array<{ label: string; href: string }> = []

  for (const key of candidates) {
    const value = metadata[key]
    if (!value) continue

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "string" && item.includes(".pdf")) {
          links.push({ label: `Manual ${index + 1}`, href: item })
        } else if (item && typeof item === "object") {
          const row = item as Record<string, unknown>
          const href = stringifyScalar(row.url) || stringifyScalar(row.href) || stringifyScalar(row.path)
          if (href) {
            links.push({ label: stringifyScalar(row.label) || stringifyScalar(row.title) || `Manual ${index + 1}`, href })
          }
        }
      })
    } else if (typeof value === "string" && value.includes(".pdf")) {
      links.push({ label: "Manual", href: value })
    }
  }

  return links
}


function getProductTypeTrail(metadata?: Record<string, unknown>, feedEntry?: VevorFeedEntry | null): string[] {
  const raw = stringifyScalar(metadata?.vevor_product_type) || feedEntry?.productType || null
  if (!raw) return []
  return raw
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean)
}


function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.substring(0, max).trimEnd() + "..."
}

export default async function ProductPage({ params }: Props) {
  const { handle, locale } = await params
  const product = await getProduct(handle)
  if (!product) notFound()
  const metadata = product.metadata || {}
  const feedEntry = getVevorFeedEntry({
    vevorSku: stringifyScalar(metadata.vevor_sku),
    vevorUpc: stringifyScalar(metadata.vevor_upc),
  })
  const media = await getProductMedia({
    vevorUpc: stringifyScalar(metadata.vevor_upc),
    vevorSku: stringifyScalar(metadata.vevor_sku),
  })

  const variant = product.variants?.[0]
  const price = variant?.calculated_price

  // Gallery images from metadata (feed 571 import)
  const metaGalleryImages: Array<{ id: string; url: string }> = Array.isArray(metadata.gallery_images)
    ? (metadata.gallery_images as string[])
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .map((url, i) => ({ id: `meta_gallery_${i}`, url: decodeURIComponent(url) }))
    : []

  // Use gallery_images from feed metadata as primary source (best quality)
  // Fallback to product.images and thumbnail
  const images = Array.from(
    new Map(
      [
        ...metaGalleryImages,
        ...(metaGalleryImages.length === 0 ? [
          ...(product.images || []).map((img) => ({ ...img, url: decodeURIComponent(img.url) })),
          ...(product.thumbnail ? [{ id: "thumb", url: decodeURIComponent(product.thumbnail) }] : []),
        ] : []),
      ]
        .filter((image) => Boolean(image?.url))
        .map((image, index) => [image.url, { id: image.id || `img_${index}`, url: image.url }])
    ).values()
  )
  const specs = getProductSpecs(product, feedEntry)
  const manualLinks = [...media.manuals, ...getManualLinks(product.metadata)].filter(
    (item, index, array) => array.findIndex((candidate) => candidate.href === item.href) === index
  )
  const productTypeTrail = getProductTypeTrail(metadata, feedEntry)
  const mainDescriptionHtml = product.description || feedEntry?.descriptionHtml || null

  // Selling points from metadata (feed 571) or feed cache
  const sellingPoints: string[] = Array.isArray(metadata.selling_points) && metadata.selling_points.length > 0
    ? (metadata.selling_points as string[])
    : feedEntry?.sellingPoints || []

  // Rich description HTML from VEVOR feed (description_html with images)
  const richDescription = typeof metadata.rich_description === "string" && metadata.rich_description.length > 50
    ? metadata.rich_description
    : null

  // Find related products from same domain/category
  const categoryId = product.categories?.[0]?.id
  const productTypeL1 = (stringifyScalar(metadata.vevor_product_type) || feedEntry?.productType || "")
    .split(">")[0].trim()

  // Build query: prefer category, fallback to product type L1 search
  const relatedQuery = categoryId
    ? { category_id: [categoryId] }
    : productTypeL1
      ? { q: productTypeL1 }
      : {}

  const [similarRes, koosRes, bestSellersRes] = await Promise.all([
    getProducts({ limit: 12, ...relatedQuery }),
    getProducts({ limit: 5, offset: 12, ...relatedQuery }),
    categoryId
      ? getProducts({ limit: 6, category_id: [categoryId] })
      : Promise.resolve({ products: [], count: 0 }),
  ])
  const similarProducts = similarRes.products
    .filter((p) => p.id !== product.id)
    .slice(0, 10)
  const koosProducts = koosRes.products
    .filter((p) => p.id !== product.id)
    .slice(0, 3)
  const bestSellers = bestSellersRes.products
    .filter((p) => p.id !== product.id)
    .slice(0, 5)
  const categoryName = product.categories?.[0]?.name || productTypeTrail[0] || "Category"

  const breadcrumbItems = [
    { name: "Home", url: "https://xlmarket.eu" },
    ...productTypeTrail.map((segment) => ({
      name: segment,
      url: `https://xlmarket.eu/et/otsing?q=${encodeURIComponent(segment)}`,
    })),
  ]

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <JsonLdProduct product={product} price={price} />
      <JsonLdBreadcrumb items={breadcrumbItems} />
      {/* Track view — XLM-47 */}
      <TrackProductView
        id={product.id}
        handle={product.handle}
        title={product.title}
        thumbnail={product.thumbnail}
        price={price ? formatPrice(price.calculated_amount, price.currency_code) : ""}
      />

      {/* Breadcrumb — category path from productTypeTrail */}
      <nav
        className="text-xs text-[#64748B] mb-5"
        aria-label="Breadcrumb"
      >
        <Link
          href={`/${locale}`}
          className="hover:text-[#D97706] transition-colors duration-200"
        >
          Home
        </Link>
        {productTypeTrail.map((segment, index) => {
          const slug = segment.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          return (
            <span key={`bc-${segment}-${index}`}>
              <span className="mx-2 text-[#E2E8F0]">&gt;</span>
              <Link
                href={`/${locale}/kategooriad/${slug}`}
                className="hover:text-[#D97706] transition-colors duration-200"
              >
                {segment}
              </Link>
            </span>
          )
        })}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-10 lg:items-start">
        {/* Images */}
        <ProductGallery images={images} title={product.title} />

        {/* Info */}
        <div>
          <h1 className="text-lg md:text-xl font-bold text-[#1E293B] leading-tight tracking-tight mb-2">
            {product.title}
          </h1>

          {/* Star rating */}
          {(() => {
            function pdpHash(str: string): number {
              let h = 0
              for (let i = 0; i < str.length; i++) {
                h = ((h << 5) - h + str.charCodeAt(i)) | 0
              }
              return Math.abs(h)
            }
            const steps = [3.5, 4.0, 4.0, 4.5, 4.5, 4.5, 5.0, 5.0, 4.0, 4.5]
            const rating = steps[pdpHash(product.id) % steps.length]
            const full = Math.floor(rating)
            const half = rating % 1 >= 0.5
            return (
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => {
                    if (i < full) {
                      return (
                        <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#D97706" stroke="none">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      )
                    }
                    if (i === full && half) {
                      return (
                        <svg key={i} width="18" height="18" viewBox="0 0 24 24" stroke="none">
                          <defs>
                            <linearGradient id={`pdp-half-${i}`}>
                              <stop offset="50%" stopColor="#D97706" />
                              <stop offset="50%" stopColor="#E5E7EB" />
                            </linearGradient>
                          </defs>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#pdp-half-${i})`} />
                        </svg>
                      )
                    }
                    return (
                      <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#E5E7EB" stroke="none">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    )
                  })}
                </span>
                <span className="text-sm font-medium text-[#1E293B]">{rating.toFixed(1)}</span>
                <span className="text-sm text-[#64748B]">(0 Reviews)</span>
                <button className="ml-auto" aria-label="Add to Wishlist">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </button>
              </div>
            )
          })()}

          <ProductPurchasePanel
            locale={locale}
            title={product.title}
            variants={product.variants || []}
            options={product.options}
          />

          {/* Tarne / Garantii / Tagastus accordion — XLM-31 */}
          <ProductInfoAccordion />

          {/* Selling points moved to Features & Details section below */}

          {/* Manuals moved below description */}
        </div>
      </div>

      {/* ===== ACCORDION SECTIONS — uniform style, left-aligned titles ===== */}
      <div className="mt-12 border-t border-[#E2E8F0]">
        {/* Features & Details */}
        {sellingPoints.length > 0 && (
          <CollapsibleSection title="Features & Details" defaultOpen={false}>
            <div className="space-y-5 max-w-[800px]">
              {sellingPoints.slice(0, 5).map((sp, i) => {
                const colonIdx = sp.indexOf(":")
                const hasTitle = colonIdx > 0 && colonIdx < 60
                const spTitle = hasTitle ? sp.substring(0, colonIdx).trim() : null
                const body = hasTitle ? sp.substring(colonIdx + 1).trim() : sp
                return (
                  <div key={i} className="flex items-start gap-3">
                    <svg className="shrink-0 mt-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <div>
                      {spTitle && <p className="text-sm font-semibold text-[#1E293B] mb-0.5">{spTitle}</p>}
                      <p className="text-sm text-[#475569] leading-relaxed">{body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* Specifications */}
        {specs.length > 0 && (
          <CollapsibleSection title="Specifications" defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[0, 1].map((col) => {
                const half = Math.ceil(specs.length / 2)
                const colSpecs = col === 0 ? specs.slice(0, half) : specs.slice(half)
                return (
                  <div key={col} className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                    {colSpecs.map((spec, i) => (
                      <div key={spec.key + i} className={"flex " + (i % 2 === 0 ? "bg-[#F1F5F9]" : "bg-white")}>
                        <div className="w-[45%] shrink-0 px-4 py-3 border-r border-[#E2E8F0]">
                          <span className="text-xs font-medium text-[#64748B]">{spec.key}</span>
                        </div>
                        <div className="flex-1 px-4 py-3">
                          <span className="text-xs text-[#1E293B]">{spec.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* Product Description — ONE block, rich or plain fallback */}
        {(richDescription || mainDescriptionHtml) && (
          <CollapsibleSection title="Product Description" defaultOpen={false}>
            <div className="max-w-[800px]">
              <CollapsibleDescription
                html={sanitizeHtml(richDescription || mainDescriptionHtml || "")}
                collapsedHeight={richDescription ? 600 : 400}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* Manuals & Downloads */}
        {manualLinks.length > 0 && (
          <CollapsibleSection title="Manuals & Downloads" defaultOpen={false}>
            <div className="flex flex-wrap gap-3">
              {manualLinks.map((manual, index) => (
                <a
                  key={`${manual.href}-${index}`}
                  href={manual.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-medium text-[#1E293B] hover:border-[#D97706]/40 hover:text-[#D97706] transition-colors duration-200"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span className="text-[#D97706] font-bold">PDF</span>
                  <span>{manual.label}</span>
                </a>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Reviews — collapsed by default, before similar products */}
        <CollapsibleSection title="Reviews" defaultOpen={false}>
          <ProductReviews />
        </CollapsibleSection>
      </div>

      {/* Similar Products — 5-col grid */}
      {similarProducts.length > 0 && (
        <section className="mt-12 pt-10 border-t border-[#E2E8F0]">
          <h2 className="text-[20px] font-bold text-[#1E293B] mb-6">
            Similar Products
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {similarProducts.map((p) => (
              <VevorProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Frequently Bought Together — VEVOR-style horizontal row */}
      {koosProducts.length > 0 && (
        <section className="mt-12 pt-10 border-t border-[#E2E8F0]">
          <h2 className="text-[20px] font-bold text-[#1E293B] mb-5">
            Frequently Bought Together
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Main product */}
            <a
              href={`/${locale}/toode/` + product.handle}
              className="flex flex-col items-center p-4 border border-[#D97706]/30 bg-[#FFFBEB] rounded-lg w-[200px] shrink-0"
            >
              {product.thumbnail && (
                <div className="w-[100px] h-[100px] bg-white rounded-lg overflow-hidden mb-2 shrink-0">
                  <img src={product.thumbnail} alt={product.title} className="w-full h-full object-contain p-1" />
                </div>
              )}
              <p className="text-xs text-[#64748B] mb-0.5">This item</p>
              <p className="text-xs font-medium text-[#1E293B] leading-snug line-clamp-2 text-center">{truncate(product.title, 60)}</p>
              {price && <p className="text-sm font-bold text-[#1E293B] mt-1">{formatPrice(price.calculated_amount, price.currency_code)}</p>}
            </a>
            {/* Plus signs + related products */}
            {koosProducts.map((kp) => (
              <div key={kp.id} className="flex items-center gap-3">
                <span className="text-3xl text-[#64748B] font-light shrink-0">+</span>
                <a
                  href={`/${locale}/toode/` + kp.handle}
                  className="flex flex-col items-center p-4 border border-[#E2E8F0] bg-white hover:border-[#D97706]/40 rounded-lg transition-colors duration-200 w-[200px] shrink-0"
                >
                  {kp.thumbnail && (
                    <div className="w-[100px] h-[100px] bg-[#F1F5F9] rounded-lg overflow-hidden mb-2 shrink-0">
                      <img src={kp.thumbnail} alt={kp.title} className="w-full h-full object-contain p-1" />
                    </div>
                  )}
                  <p className="text-xs font-medium text-[#1E293B] leading-snug line-clamp-2 text-center">{truncate(kp.title, 60)}</p>
                  {kp.variants?.[0]?.calculated_price && <p className="text-sm font-bold text-[#1E293B] mt-1">{formatPrice(kp.variants[0].calculated_price.calculated_amount, kp.variants[0].calculated_price.currency_code)}</p>}
                </a>
              </div>
            ))}
            {/* Total price */}
            {(() => {
              const mainPrice = price?.calculated_amount || 0
              const koosTotal = koosProducts.reduce((sum, kp) => {
                const kpPrice = kp.variants?.[0]?.calculated_price?.calculated_amount || 0
                return sum + kpPrice
              }, mainPrice)
              const currencyCode = price?.currency_code || "eur"
              return (
                <div className="flex flex-col items-center justify-center ml-auto p-4 border border-[#E2E8F0] bg-white rounded-lg min-w-[140px]">
                  <span className="text-xs text-[#64748B] mb-1">Total:</span>
                  <p className="font-bold text-xl text-[#1E293B]">
                    {formatPrice(koosTotal, currencyCode)}
                  </p>
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* Best Sellers in Category */}
      {bestSellers.length > 0 && (
        <section className="mt-12 pt-10 border-t border-[#E2E8F0]">
          <h2 className="text-[20px] font-bold text-[#1E293B] mb-6">
            Best Sellers in {categoryName}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {bestSellers.map((p) => (
              <VevorProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed — XLM-47 */}
      <RecentlyViewed currentId={product.id} />
    </div>
  )
}
