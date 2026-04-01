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
  params: Promise<{ handle: string; locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle, locale } = await params
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

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.substring(0, max).trimEnd() + "..."
}

export default async function ProductPage({ params }: Props) {
  const { handle, locale } = await params
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
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
        className="text-xs font-[family-name:var(--font-jakarta)] text-muted mb-8"
        aria-label="Leheasukoht"
      >
        <Link
          href={`/${locale}`}
          className="hover:text-accent transition-all duration-300"
        >
          Avaleht
        </Link>
        <span className="mx-2 text-soft-border">/</span>
        {product.categories?.[0] && (
          <>
            <Link
              href={`/${locale}/kategooriad/` + product.categories[0].handle}
              className="hover:text-accent transition-all duration-300"
            >
              {product.categories[0].name}
            </Link>
            <span className="mx-2 text-soft-border">/</span>
          </>
        )}
        <span className="text-muted">{truncate(product.title, 40)}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 lg:items-start">
        {/* Images */}
        <ProductGallery images={images} title={product.title} />

        {/* Info */}
        <div>
          <h1 className="text-2xl md:text-3xl font-[800] font-[family-name:var(--font-outfit)] text-off-black leading-tight tracking-tight mb-3">
            {product.title}
          </h1>

          {price && (
            <>
              <div className="h-px bg-soft-border mb-4" />
              <div className="flex items-center gap-3 mb-6">
                <p className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-off-black tracking-tight">
                  {formatPrice(price.calculated_amount, price.currency_code)}
                </p>
                {price.original_amount > price.calculated_amount && (
                  <>
                    <span className="text-base font-[family-name:var(--font-jakarta)] text-muted line-through">
                      {formatPrice(price.original_amount, price.currency_code)}
                    </span>
                    <span className="bg-red-600 text-white text-xs font-bold font-[family-name:var(--font-outfit)] px-2 py-0.5 rounded-xl">
                      -{Math.round((1 - price.calculated_amount / price.original_amount) * 100)}%
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          {/* Stock badge */}
          <div className="mb-6">
            {variant ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium font-[family-name:var(--font-jakarta)] rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Laos
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium font-[family-name:var(--font-jakarta)] rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Hetkel ei ole saadaval
              </span>
            )}
          </div>

          {variant ? (
            <div className="flex flex-col gap-3">
              <AddToCartButton variantId={variant.id} />
              <a
                href={`/${locale}/ostukorv`}
                className="block w-full text-center py-3 text-sm font-semibold font-[family-name:var(--font-outfit)] border border-accent text-accent bg-transparent hover:bg-accent-light rounded-xl btn-press transition-all duration-300"
              >
                Osta kohe &rarr;
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted font-[family-name:var(--font-jakarta)]">
              Seda toodet ei saa hetkel osta.
            </p>
          )}

          {/* Tarne / Garantii / Tagastus accordion — XLM-31 */}
          <ProductInfoAccordion />


          {product.description && (() => {
            const specs = parseSpecs(product.description)
            if (specs.length < 3) return null
            return (
              <div className="mt-6 border-t border-soft-border pt-6">
                <h2 className="text-base font-semibold font-[family-name:var(--font-outfit)] text-off-black mb-4">
                  Tehnilised andmed
                </h2>
                <div className="border border-soft-border rounded-xl overflow-hidden">
                  {specs.map((spec, i) => (
                    <div
                      key={spec.key + i}
                      className={"flex " + (i % 2 === 0 ? "bg-silver" : "bg-white")}
                    >
                      <div className="w-[45%] shrink-0 px-4 py-3 border-r border-soft-border">
                        <span className="text-xs font-medium font-[family-name:var(--font-jakarta)] text-muted">
                          {spec.key}
                        </span>
                      </div>
                      <div className="flex-1 px-4 py-3">
                        <span className="text-xs font-[family-name:var(--font-jakarta)] text-off-black">
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
            <div className="mt-8 border-t border-soft-border pt-8">
              <h2 className="text-lg font-semibold font-[family-name:var(--font-outfit)] text-off-black mb-4">
                Kirjeldus
              </h2>
              <div
                className="text-muted text-sm font-[family-name:var(--font-jakarta)] leading-relaxed [&_br]:block [&_br]:mb-1 [&_p]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1 [&_a]:text-accent [&_a]:underline [&_a:hover]:text-accent-dark"
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
        <section className="mt-16 pt-12 border-t border-soft-border">
          <h2 className="text-xl font-semibold font-[family-name:var(--font-outfit)] text-off-black mb-6">
            Sarnased tooted
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Koos ostetud — XLM-44 */}
      {koosProducts.length > 0 && (
        <section className="mt-12 pt-10 border-t border-soft-border">
          <h2 className="text-xl font-semibold font-[family-name:var(--font-outfit)] text-off-black mb-5">
            Ostetakse koos
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Main product mini card */}
            <div className="flex items-center gap-3 p-3 border border-soft-border bg-silver rounded-xl shrink-0">
              {product.thumbnail && (
                <div className="w-[60px] h-[60px] bg-white rounded-lg border border-soft-border overflow-hidden relative shrink-0">
                  <img src={product.thumbnail} alt={product.title} className="w-full h-full object-contain p-1" />
                </div>
              )}
              <div>
                <p className="text-xs text-muted font-[family-name:var(--font-jakarta)] mb-0.5">See toode</p>
                <p className="text-sm font-medium font-[family-name:var(--font-outfit)] text-off-black leading-snug line-clamp-2 max-w-[140px]">{product.title.substring(0, 40)}{product.title.length > 40 ? "..." : ""}</p>
                {price && <p className="text-sm font-semibold text-accent mt-1">{formatPrice(price.calculated_amount, price.currency_code)}</p>}
              </div>
            </div>
            {/* Plus signs + related products */}
            {koosProducts.map((kp, idx) => (
              <div key={kp.id} className="flex items-center gap-4">
                <span className="text-xl text-muted/40 font-light shrink-0">+</span>
                <a
                  href={`/${locale}/toode/` + kp.handle}
                  className="flex items-center gap-3 p-3 border border-soft-border bg-white hover:border-accent/40 rounded-xl transition-all duration-300 shrink-0"
                >
                  {kp.thumbnail && (
                    <div className="w-[60px] h-[60px] bg-silver rounded-lg overflow-hidden relative shrink-0">
                      <img src={kp.thumbnail} alt={kp.title} className="w-full h-full object-contain p-1" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium font-[family-name:var(--font-outfit)] text-off-black leading-snug line-clamp-2 max-w-[140px]">{kp.title.substring(0, 40)}{kp.title.length > 40 ? "..." : ""}</p>
                    {kp.variants?.[0]?.calculated_price && <p className="text-sm font-semibold text-accent mt-1">{formatPrice(kp.variants[0].calculated_price.calculated_amount, kp.variants[0].calculated_price.currency_code)}</p>}
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
