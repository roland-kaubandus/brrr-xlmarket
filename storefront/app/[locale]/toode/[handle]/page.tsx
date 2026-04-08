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
import { getProductMedia } from "@/lib/product-media"
import { getVevorFeedEntry, type VevorFeedEntry } from "@/lib/vevor-feed"


export const revalidate = 300

type Props = {
  params: Promise<{ handle: string; locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle, locale } = await params
  const product = await getProduct(handle)
  if (!product) return { title: "Toode — XLMARKET" }
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
    vevor_product_type: "Tooteliik",
    vevor_link: "Toote algallikas",
    weight_kg: "Kaal",
    brand: "Bränd",
    model: "Mudel",
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
          links.push({ label: `Manuaal ${index + 1}`, href: item })
        } else if (item && typeof item === "object") {
          const row = item as Record<string, unknown>
          const href = stringifyScalar(row.url) || stringifyScalar(row.href) || stringifyScalar(row.path)
          if (href) {
            links.push({ label: stringifyScalar(row.label) || stringifyScalar(row.title) || `Manuaal ${index + 1}`, href })
          }
        }
      })
    } else if (typeof value === "string" && value.includes(".pdf")) {
      links.push({ label: "Manuaal", href: value })
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

  const images = Array.from(
    new Map(
      [
        ...media.images,
        ...metaGalleryImages,
        ...(product.images || []).map((img) => ({ ...img, url: decodeURIComponent(img.url) })),
        ...(product.thumbnail ? [{ id: "thumb", url: decodeURIComponent(product.thumbnail) }] : []),
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

  const [similarRes, koosRes] = await Promise.all([
    getProducts({ limit: 5, ...relatedQuery }),
    getProducts({ limit: 4, offset: 5, ...relatedQuery }),
  ])
  const similarProducts = similarRes.products
    .filter((p) => p.id !== product.id)
    .slice(0, 5)
  const koosProducts = koosRes.products
    .filter((p) => p.id !== product.id)
    .slice(0, 3)

  const breadcrumbItems = [
    { name: "Avaleht", url: "https://xlmarket.eu" },
    ...(product.categories?.[0]
      ? [
          {
            name: product.categories[0].name,
            url:
              "https://xlmarket.eu/kategooriad/" +
              product.categories[0].handle,
          },
        ]
      : []),
    {
      name: product.title,
      url: "https://xlmarket.eu/toode/" + product.handle,
    },
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

      {/* Breadcrumb */}
      <nav
        className="text-xs text-[#666] mb-5"
        aria-label="Leheasukoht"
      >
        <Link
          href={`/${locale}`}
          className="hover:text-[#FF6A00] transition-colors duration-200"
        >
          Avaleht
        </Link>
        <span className="mx-2 text-[#E5E5E5]">&gt;</span>
        {product.categories?.[0] && (
          <>
            <Link
              href={`/${locale}/kategooriad/` + product.categories[0].handle}
              className="hover:text-[#FF6A00] transition-colors duration-200"
            >
              {product.categories[0].name}
            </Link>
            <span className="mx-2 text-[#E5E5E5]">&gt;</span>
          </>
        )}
        <span className="text-[#666]">{truncate(product.title, 40)}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-10 lg:items-start">
        {/* Images */}
        <ProductGallery images={images} title={product.title} />

        {/* Info */}
        <div>
          {productTypeTrail.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {productTypeTrail.map((segment, index) => (
                <span
                  key={`${segment}-${index}`}
                  className="inline-flex items-center rounded-full bg-[#F5F5F5] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#666]"
                >
                  {segment}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-xl md:text-2xl font-bold text-[#222] leading-tight tracking-tight mb-2">
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
                        <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="#FF6A00" stroke="none">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      )
                    }
                    if (i === full && half) {
                      return (
                        <svg key={i} width="18" height="18" viewBox="0 0 24 24" stroke="none">
                          <defs>
                            <linearGradient id={`pdp-half-${i}`}>
                              <stop offset="50%" stopColor="#FF6A00" />
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
                <span className="text-sm font-medium text-[#222]">{rating.toFixed(1)}</span>
                <span className="text-sm text-[#666]">(0 Reviews)</span>
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

          {/* Selling points summary — bullet list */}
          {sellingPoints.length > 0 && (
            <div className="mt-5 pt-5 border-t border-[#E5E5E5]">
              <ul className="space-y-2">
                {sellingPoints.map((sp, i) => {
                  const colonIdx = sp.indexOf(":")
                  const spTitle = colonIdx > 0 && colonIdx < 60 ? sp.substring(0, colonIdx).trim() : sp.substring(0, 60)
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      <span className="text-[#222]">{spTitle}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Manuals in sidebar */}
          {manualLinks.length > 0 && (
            <div className="mt-5 pt-5 border-t border-[#E5E5E5]">
              <h2 className="text-base font-semibold text-[#222] mb-3">
                Manuaalid ja failid
              </h2>
              <div className="flex flex-wrap gap-3">
                {manualLinks.map((manual, index) => (
                  <a
                    key={`${manual.href}-${index}`}
                    href={manual.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-3 text-sm font-medium text-[#222] hover:border-[#FF6A00]/40 hover:text-[#FF6A00] transition-colors duration-200"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span className="text-[#FF6A00] font-bold">PDF</span>
                    <span>{manual.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== FULL-WIDTH SECTIONS BELOW THE FOLD ===== */}

      {/* Feature Highlights — selling points as cards (kavand: section-alt) */}
      {sellingPoints.length > 0 && (
        <section className="mt-12 pt-10 pb-10 bg-[#E8ECF0] -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="max-w-[1360px] mx-auto">
            <h2 className="text-[20px] font-bold text-[#222] mb-6">
              Feature Highlights
            </h2>
            <div className={`grid gap-4 ${sellingPoints.length >= 5 ? "grid-cols-2 lg:grid-cols-5" : sellingPoints.length >= 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2"}`}>
              {sellingPoints.map((sp, i) => {
                const colonIdx = sp.indexOf(":")
                const title = colonIdx > 0 && colonIdx < 60 ? sp.substring(0, colonIdx).trim() : null
                const body = title ? sp.substring(colonIdx + 1).trim() : sp
                return (
                  <div key={i} className="bg-white border border-[#E5E5E5] rounded-lg p-5 text-center hover:border-[#FF6A00]/20 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-12 h-12 mx-auto mb-3 bg-[#FFF5EE] rounded-lg flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    {title && (
                      <h3 className="font-bold text-sm text-[#222] mb-1.5">{title}</h3>
                    )}
                    <p className="text-xs text-[#666] leading-relaxed line-clamp-4">{body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Tehnilised andmed — 2-column specs table */}
      {specs.length > 0 && (
        <section className="mt-12 pt-10 border-t border-[#E5E5E5]">
          <h2 className="text-[20px] font-bold text-[#222] mb-6">
            Tehnilised andmed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Split specs into two columns */}
            {[0, 1].map((col) => {
              const half = Math.ceil(specs.length / 2)
              const colSpecs = col === 0 ? specs.slice(0, half) : specs.slice(half)
              return (
                <div key={col} className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                  {colSpecs.map((spec, i) => (
                    <div
                      key={spec.key + i}
                      className={"flex " + (i % 2 === 0 ? "bg-[#F5F5F5]" : "bg-white")}
                    >
                      <div className="w-[45%] shrink-0 px-4 py-3 border-r border-[#E5E5E5]">
                        <span className="text-xs font-medium text-[#666]">
                          {spec.key}
                        </span>
                      </div>
                      <div className="flex-1 px-4 py-3">
                        <span className="text-xs text-[#222]">
                          {spec.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Rich description from VEVOR (with images, collapsible) */}
      {richDescription && (
        <section className="mt-12 pt-10 border-t border-[#E5E5E5]">
          <h2 className="text-[20px] font-bold text-[#222] mb-6">
            Toote kirjeldus
          </h2>
          <CollapsibleDescription html={sanitizeHtml(richDescription)} collapsedHeight={600} />
        </section>
      )}

      {/* Plain description fallback */}
      {!richDescription && mainDescriptionHtml && (
        <section className="mt-12 pt-10 border-t border-[#E5E5E5]">
          <h2 className="text-[20px] font-bold text-[#222] mb-6">
            Toote kirjeldus
          </h2>
          <CollapsibleDescription html={sanitizeHtml(mainDescriptionHtml)} collapsedHeight={400} />
        </section>
      )}

      {/* Metadata highlights removed — internal data not for customers */}

      {/* Sarnased tooted */}
      {similarProducts.length > 0 && (
        <section className="mt-12 pt-10 border-t border-[#E5E5E5]">
          <h2 className="text-[20px] font-bold text-[#222] mb-6">
            Sarnased tooted
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {similarProducts.map((p) => (
              <VevorProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Ostetakse koos — with total price */}
      {koosProducts.length > 0 && (
        <section className="mt-12 pt-10 border-t border-[#E5E5E5]">
          <h2 className="text-[20px] font-bold text-[#222] mb-5">
            Ostetakse koos
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start flex-wrap">
            {/* Main product mini card */}
            <div className="flex items-center gap-3 p-3 border border-[#E5E5E5] bg-[#F5F5F5] rounded-lg shrink-0">
              {product.thumbnail && (
                <div className="w-[60px] h-[60px] bg-white rounded-lg border border-[#E5E5E5] overflow-hidden relative shrink-0">
                  <img src={product.thumbnail} alt={product.title} className="w-full h-full object-contain p-1" />
                </div>
              )}
              <div>
                <p className="text-xs text-[#666] mb-0.5">See toode</p>
                <p className="text-sm font-medium text-[#222] leading-snug line-clamp-2 max-w-[140px]">{product.title.substring(0, 40)}{product.title.length > 40 ? "..." : ""}</p>
                {price && <p className="text-sm font-semibold text-[#222] mt-1">{formatPrice(price.calculated_amount, price.currency_code)}</p>}
              </div>
            </div>
            {/* Plus signs + related products */}
            {koosProducts.map((kp) => (
              <div key={kp.id} className="flex items-center gap-4">
                <span className="text-xl text-[#E5E5E5] font-light shrink-0">+</span>
                <a
                  href={`/${locale}/toode/` + kp.handle}
                  className="flex items-center gap-3 p-3 border border-[#E5E5E5] bg-white hover:border-[#FF6A00]/40 rounded-lg transition-colors duration-200 shrink-0"
                >
                  {kp.thumbnail && (
                    <div className="w-[60px] h-[60px] bg-[#F5F5F5] rounded-lg overflow-hidden relative shrink-0">
                      <img src={kp.thumbnail} alt={kp.title} className="w-full h-full object-contain p-1" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-[#222] leading-snug line-clamp-2 max-w-[140px]">{kp.title.substring(0, 40)}{kp.title.length > 40 ? "..." : ""}</p>
                    {kp.variants?.[0]?.calculated_price && <p className="text-sm font-semibold text-[#222] mt-1">{formatPrice(kp.variants[0].calculated_price.calculated_amount, kp.variants[0].calculated_price.currency_code)}</p>}
                  </div>
                </a>
              </div>
            ))}
          </div>
          {/* Total + add all button */}
          {(() => {
            const mainPrice = price?.calculated_amount || 0
            const koosTotal = koosProducts.reduce((sum, kp) => {
              const kpPrice = kp.variants?.[0]?.calculated_price?.calculated_amount || 0
              return sum + kpPrice
            }, mainPrice)
            const currencyCode = price?.currency_code || "eur"
            return (
              <div className="flex items-center justify-between mt-5 p-4 border border-[#E5E5E5] bg-white rounded-lg">
                <p className="font-bold text-lg text-[#222]">
                  <span className="text-sm font-normal text-[#666] mr-2">Kokku:</span>
                  {formatPrice(koosTotal, currencyCode)}
                </p>
                <button className="px-6 py-3 bg-[#FF6A00] hover:bg-[#E55F00] text-white text-sm font-bold rounded-lg transition-colors">
                  Lisa koik ostukorvi
                </button>
              </div>
            )
          })()}
        </section>
      )}

      {/* Reviews — XLM-28 */}
      <ProductReviews />

      {/* Recently viewed — XLM-47 */}
      <RecentlyViewed currentId={product.id} />
    </div>
  )
}
