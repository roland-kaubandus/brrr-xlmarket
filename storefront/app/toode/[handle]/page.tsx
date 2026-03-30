import Link from "next/link"
import { getProduct, getProducts, formatPrice } from "@/lib/medusa"
import { sanitizeHtml } from "@/lib/sanitize"
import { notFound } from "next/navigation"
import AddToCartButton from "./AddToCartButton"
import ProductInfoAccordion from "@/components/ProductInfoAccordion"
import ProductReviews from "@/components/ProductReviews"
import StickyBuyBar from "@/components/StickyBuyBar"
import RecentlyViewed from "@/components/RecentlyViewed"
import TrackProductView from "@/components/TrackProductView"
import ProductGallery from "@/components/ProductGallery"
import ProductCard from "@/components/ProductCard"
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
    title: product.title + " — XLMARKET",
    description: desc,
    openGraph: {
      title: product.title,
      description: desc,
      images: product.thumbnail ? [{ url: product.thumbnail }] : [],
      type: "website",
    },
    twitter: {
      card: product.thumbnail ? "summary_large_image" : "summary",
      title: product.title,
      description: desc,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}


function parseSpecs(description: string): Array<{ key: string; value: string }> {
  // Strip HTML tags
  const text = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  // Find spec-like portion: "Key: value,Key: value" pattern
  const specs: Array<{ key: string; value: string }> = []
  // Split by comma, then check if each part has colon
  const parts = text.split(",")
  for (const part of parts) {
    const colonIdx = part.indexOf(":")
    if (colonIdx > 2 && colonIdx < 40) {
      const key = part.substring(0, colonIdx).trim()
      const value = part.substring(colonIdx + 1).trim()
      // Skip if key looks like regular sentence (too long or has spaces > 4 words)
      if (key.split(" ").length <= 4 && value.length > 0 && value.length < 80) {
        specs.push({ key, value })
      }
    }
  }
  return specs.slice(0, 16)
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.substring(0, max).trimEnd() + "..."
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params
  const product = await getProduct(handle)
  if (!product) notFound()

  const variant = product.variants?.[0]
  const price = variant?.calculated_price
  const images = product.images?.length
    ? product.images
    : product.thumbnail
      ? [{ id: "thumb", url: product.thumbnail }]
      : []

  const categoryId = product.categories?.[0]?.id
  const [similarRes, koosRes] = await Promise.all([
    getProducts({
      limit: 5,
      ...(categoryId ? { category_id: [categoryId] } : {}),
    }),
    getProducts({
      limit: 4,
      offset: 5,
      ...(categoryId ? { category_id: [categoryId] } : {}),
    }),
  ])
  const similarProducts = similarRes.products
    .filter((p) => p.id !== product.id)
    .slice(0, 4)
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
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
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
        className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] mb-[32px]"
        aria-label="Leheasukoht"
      >
        <Link
          href="/"
          className="hover:text-[#E8650A] rounded-[2px]"
        >
          Avaleht
        </Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        {product.categories?.[0] && (
          <>
            <Link
              href={"/kategooriad/" + product.categories[0].handle}
              className="hover:text-[#E8650A] rounded-[2px]"
            >
              {product.categories[0].name}
            </Link>
            <span className="mx-[8px] text-[#E8E8E8]">/</span>
          </>
        )}
        <span className="text-[#777777]">{truncate(product.title, 40)}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[32px] lg:gap-[64px] lg:items-start">
        {/* Images */}
        <ProductGallery images={images} title={product.title} />

        {/* Info */}
        <div>
          <h1 className="text-[15px] sm:text-[16px] font-[500] font-[family-name:var(--font-inter)] text-[#1A1A1A] leading-[1.5] mb-[12px]">
            {product.title}
          </h1>

          {price && (
            <>
              <div className="h-[1px] bg-[#F0F0F0] mb-[16px]" />
              <div className="flex items-center gap-[12px] mb-[24px]">
                <p className="text-[26px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] tracking-tight">
                  {formatPrice(price.calculated_amount, price.currency_code)}
                </p>
                {price.original_amount > price.calculated_amount && (
                  <>
                    <span className="text-[16px] font-[400] font-[family-name:var(--font-inter)] text-[#999999] line-through">
                      {formatPrice(price.original_amount, price.currency_code)}
                    </span>
                    <span className="bg-[#EF4444] text-white text-[12px] font-[700] font-[family-name:var(--font-poppins)] px-[8px] py-[3px] rounded-[4px]">
                      -{Math.round((1 - price.calculated_amount / price.original_amount) * 100)}%
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          {/* Stock badge */}
          <div className="mb-[24px]">
            {variant ? (
              <span className="inline-flex items-center gap-[6px] px-[12px] py-[6px] bg-green-50 text-green-700 text-[13px] font-[500] font-[family-name:var(--font-inter)] rounded-[2px]">
                <span className="w-[6px] h-[6px] rounded-full bg-green-500" />
                Laos
              </span>
            ) : (
              <span className="inline-flex items-center gap-[6px] px-[12px] py-[6px] bg-red-50 text-red-700 text-[13px] font-[500] font-[family-name:var(--font-inter)] rounded-[2px]">
                <span className="w-[6px] h-[6px] rounded-full bg-red-500" />
                Hetkel ei ole saadaval
              </span>
            )}
          </div>

          {variant ? (
            <div className="flex flex-col gap-[12px] mt-[0px]">
              <AddToCartButton variantId={variant.id} />
              <a
                href={"/ostukorv"}
                className="block w-full text-center py-[12px] rounded-[8px] text-[14px] font-[600] font-[family-name:var(--font-poppins)] border border-[#E8650A] text-[#E8650A] bg-transparent hover:bg-[#FFF5EE]"
                style={{ transition: "all 0.2s ease" }}
              >
                Osta kohe →
              </a>
            </div>
          ) : (
            <p className="text-[14px] text-[#999999] font-[family-name:var(--font-inter)]">
              Seda toodet ei saa hetkel osta.
            </p>
          )}

          {/* Tarne / Garantii / Tagastus accordion — XLM-31 */}
          <ProductInfoAccordion />


          {product.description && (() => {
            const specs = parseSpecs(product.description)
            if (specs.length < 3) return null
            return (
              <div className="mt-[24px] border-t border-[#E8E8E8] pt-[24px]">
                <h2 className="text-[16px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[14px]">
                  Tehnilised andmed
                </h2>
                <div className="rounded-[6px] border border-[#E8E8E8] overflow-hidden">
                  {specs.map((spec, i) => (
                    <div
                      key={spec.key + i}
                      className={"flex gap-[0] " + (i % 2 === 0 ? "bg-[#FAFAFA]" : "bg-white")}
                    >
                      <div className="w-[45%] shrink-0 px-[14px] py-[10px] border-r border-[#E8E8E8]">
                        <span className="text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#555555]">
                          {spec.key}
                        </span>
                      </div>
                      <div className="flex-1 px-[14px] py-[10px]">
                        <span className="text-[12px] font-[family-name:var(--font-inter)] text-[#1A1A1A]">
                          {spec.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {product.description && (
            <div className="mt-[32px] border-t border-[#E8E8E8] pt-[32px]">
              <h2 className="text-[18px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[16px]">
                Kirjeldus
              </h2>
              <div
                className="text-[#555555] text-[14px] font-[family-name:var(--font-inter)] leading-[1.75] [&_br]:block [&_br]:mb-1 [&_p]:mb-[12px] [&_ul]:pl-[20px] [&_ul]:list-disc [&_li]:mb-[4px] [&_a]:text-[#E8650A] [&_a]:underline [&_a:hover]:text-[#CF5A08]"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(product.description),
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sarnased tooted */}
      {similarProducts.length > 0 && (
        <section className="mt-[64px] pt-[48px] border-t border-[#E8E8E8]">
          <h2 className="text-[20px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[24px]">
            Sarnased tooted
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[16px] sm:gap-[20px]">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Koos ostetud — XLM-44 */}
      {koosProducts.length > 0 && (
        <section className="mt-[48px] pt-[40px] border-t border-[#E8E8E8]">
          <h2 className="text-[20px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[20px]">
            Ostetakse koos
          </h2>
          <div className="flex flex-col sm:flex-row gap-[16px] items-start">
            {/* Main product mini card */}
            <div className="flex items-center gap-[12px] p-[12px] border border-[#E8E8E8] rounded-[8px] bg-[#FAFAFA] shrink-0">
              {product.thumbnail && (
                <div className="w-[60px] h-[60px] bg-white rounded-[4px] border border-[#E8E8E8] overflow-hidden relative shrink-0">
                  <img src={product.thumbnail} alt={product.title} className="w-full h-full object-contain p-[4px]" />
                </div>
              )}
              <div>
                <p className="text-[12px] text-[#999999] font-[family-name:var(--font-inter)] mb-[2px]">See toode</p>
                <p className="text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#1A1A1A] leading-[1.3] line-clamp-2 max-w-[140px]">{product.title.substring(0, 40)}{product.title.length > 40 ? "..." : ""}</p>
                {price && <p className="text-[13px] font-[600] text-[#E8650A] mt-[4px]">{formatPrice(price.calculated_amount, price.currency_code)}</p>}
              </div>
            </div>
            {/* Plus signs + related products */}
            {koosProducts.map((kp, idx) => (
              <div key={kp.id} className="flex items-center gap-[16px]">
                <span className="text-[20px] text-[#CCCCCC] font-[300] shrink-0">+</span>
                <a
                  href={"/toode/" + kp.handle}
                  className="flex items-center gap-[12px] p-[12px] border border-[#E8E8E8] rounded-[8px] bg-white hover:border-[#E8650A]/40 transition-colors shrink-0"
                >
                  {kp.thumbnail && (
                    <div className="w-[60px] h-[60px] bg-[#FAFAFA] rounded-[4px] overflow-hidden relative shrink-0">
                      <img src={kp.thumbnail} alt={kp.title} className="w-full h-full object-contain p-[4px]" />
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-[500] font-[family-name:var(--font-poppins)] text-[#1A1A1A] leading-[1.3] line-clamp-2 max-w-[140px]">{kp.title.substring(0, 40)}{kp.title.length > 40 ? "..." : ""}</p>
                    {kp.variants?.[0]?.calculated_price && <p className="text-[13px] font-[600] text-[#E8650A] mt-[4px]">{formatPrice(kp.variants[0].calculated_price.calculated_amount, kp.variants[0].calculated_price.currency_code)}</p>}
                  </div>
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews — XLM-28 */}
      <ProductReviews />

      {/* Recently viewed — XLM-47 */}
      <RecentlyViewed currentId={product.id} />

      {/* Sticky buy bar — XLM-30 */}
      {variant && price && (
        <StickyBuyBar
          variantId={variant.id}
          title={product.title}
          price={formatPrice(price.calculated_amount, price.currency_code)}
        />
      )}
    </div>
  )
}
