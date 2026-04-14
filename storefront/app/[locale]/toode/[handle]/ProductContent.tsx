"use client"

import Link from "@/components/SafeLink"
import ProductGallery from "@/components/ProductGallery"
import ProductPurchasePanel from "./ProductPurchasePanel"
import ProductInfoAccordion from "@/components/ProductInfoAccordion"
import ProductReviews from "@/components/ProductReviews"
import CollapsibleDescription from "@/components/CollapsibleDescription"
import CollapsibleSection from "@/components/CollapsibleSection"
import ProductCompareActions from "@/components/ProductCompareActions"
import ProductWishlistButton from "@/components/ProductWishlistButton"
import TrackProductView from "@/components/TrackProductView"
import RecentlyViewed from "@/components/RecentlyViewed"
import RelatedProducts from "./RelatedProducts"
import { categoryPath } from "@/lib/i18n"

export type ProductContentProps = {
  locale: string
  product: {
    id: string
    handle: string
    title: string
    thumbnail: string | null
    variants: any[]
    options?: any[]
    categories?: Array<{ id: string; name: string; handle: string; parent_category_id: string | null }>
  }
  localizedTitle: string
  images: Array<{ id: string; url: string }>
  specs: Array<{ key: string; value: string }>
  sellingPoints: string[]
  mainDescriptionHtml: string | null
  richDescription: string | null
  manualLinks: Array<{ label: string; href: string }>
  productTypeTrail: Array<{ name: string; handle: string }>
  breadcrumbItems: Array<{ name: string; url: string }>
  categoryId: string | null
  categoryHandle: string | null
  categoryName: string
  relatedSearchQuery: string
  priceFormatted: string
  priceAmount: number
  priceCurrency: string
  originalAmount: number
  compareItem: {
    id: string
    handle: string
    title: string
    thumbnail: string | null
    price: string
    specs: Record<string, string>
  }
  _categoryPathFn: string // unused, locale is used instead
}

function Stars({ productId, rating }: { productId: string; rating: number }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return (
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
                <linearGradient id={`pdp-half-${productId}-${i}`}>
                  <stop offset="50%" stopColor="#D97706" />
                  <stop offset="50%" stopColor="#E5E7EB" />
                </linearGradient>
              </defs>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#pdp-half-${productId}-${i})`} />
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
  )
}

function hashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export default function ProductContent(props: ProductContentProps) {
  const {
    locale, product, localizedTitle, images, specs, sellingPoints,
    mainDescriptionHtml, richDescription, manualLinks, productTypeTrail,
    categoryId, categoryHandle, categoryName, relatedSearchQuery,
    priceFormatted, priceAmount, priceCurrency, originalAmount,
    compareItem, _categoryPathFn,
  } = props

  const steps = [3.5, 4.0, 4.0, 4.5, 4.5, 4.5, 5.0, 5.0, 4.0, 4.5]
  const rating = steps[hashCode(product.id) % steps.length]

  return (
    <>
      <TrackProductView
        id={product.id}
        handle={product.handle}
        title={localizedTitle}
        thumbnail={product.thumbnail}
        price={priceFormatted}
      />

      {/* Breadcrumb */}
      <nav className="text-xs text-[#64748B] mb-5 min-h-[24px] flex items-center flex-wrap gap-y-1 transition-opacity duration-200" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="text-[#64748B] hover:text-[#D97706] transition-colors duration-200">
          {locale === "et" ? "Avaleht" : "Home"}
        </Link>
        {productTypeTrail.map((seg, index) => (
          <span key={`bc-${seg.handle}-${index}`}>
            <span className="mx-2 text-[#CBD5E1]">&gt;</span>
            <Link href={categoryPath(locale as "et" | "en", seg.handle)} className="text-[#64748B] hover:text-[#D97706] transition-colors duration-200">
              {seg.name}
            </Link>
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-10 lg:items-start">
        <ProductGallery images={images} title={localizedTitle} locale={locale} />

        <div>
          <h1 className="text-lg md:text-xl font-bold text-[#1E293B] leading-tight tracking-tight mb-2">
            {localizedTitle}
          </h1>

          <div className="flex items-center gap-2 mb-4">
            <Stars productId={product.id} rating={rating} />
            <span className="text-sm font-medium text-[#1E293B]">{rating.toFixed(1)}</span>
            <span className="text-sm text-[#64748B]">(0 Reviews)</span>
            <ProductWishlistButton locale={locale} item={compareItem} />
          </div>

          <div className="mb-4">
            <ProductCompareActions item={compareItem} locale={locale} />
          </div>

          <ProductPurchasePanel
            locale={locale}
            title={localizedTitle}
            variants={product.variants || []}
            options={product.options}
          />

          <ProductInfoAccordion locale={locale} />
        </div>
      </div>

      {/* Key Features */}
      {sellingPoints.length > 0 && (
        <div className="mt-6 lg:max-w-[60%]">
          <h3 className="text-sm font-bold text-[#1E293B] uppercase tracking-wider mb-3">
            {locale === "et" ? "Omadused" : "Key Features"}
          </h3>
          <div className="space-y-3">
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
        </div>
      )}

      {/* Accordion sections */}
      <div className="mt-12">
        {specs.length > 0 && (
          <CollapsibleSection title={locale === "et" ? "Tehnilised andmed" : "Specifications"} defaultOpen={false}>
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

        {(richDescription || mainDescriptionHtml) && (
          <CollapsibleSection title={locale === "et" ? "Tootekirjeldus" : "Product Description"} defaultOpen={true}>
            <div className="max-w-[800px]">
              <CollapsibleDescription
                html={richDescription || mainDescriptionHtml || ""}
                collapsedHeight={richDescription ? 500 : 300}
              />
            </div>
          </CollapsibleSection>
        )}

        {manualLinks.length > 0 && (
          <CollapsibleSection title={locale === "et" ? "Juhendid ja allalaadimised" : "Manuals & Downloads"} defaultOpen={false}>
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

        <CollapsibleSection title={locale === "et" ? "Arvustused" : "Reviews"} defaultOpen={false}>
          <ProductReviews />
        </CollapsibleSection>
      </div>

      <RelatedProducts
        productId={product.id}
        categoryId={categoryId}
        categoryHandle={categoryHandle}
        searchQuery={relatedSearchQuery}
        locale={locale}
        categoryName={categoryName}
        productTitle={localizedTitle}
        productThumbnail={product.thumbnail}
        productHandle={product.handle}
        productPrice={priceAmount > 0 ? { calculated_amount: priceAmount, currency_code: priceCurrency } : null}
      />

      <RecentlyViewed currentId={product.id} />
    </>
  )
}
