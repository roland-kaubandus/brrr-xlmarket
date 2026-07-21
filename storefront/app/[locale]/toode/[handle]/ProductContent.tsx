"use client"

import Link from "@/components/SafeLink"
import ProductGallery from "@/components/ProductGallery"
import ProductPurchasePanel from "./ProductPurchasePanel"
import ProductReviews from "@/components/ProductReviews"
import CollapsibleDescription from "@/components/CollapsibleDescription"
import CollapsibleSection from "@/components/CollapsibleSection"
import ProductCompareActions from "@/components/ProductCompareActions"
import ProductWishlistButton from "@/components/ProductWishlistButton"
import TrackProductView from "@/components/TrackProductView"
import RecentlyViewed from "@/components/RecentlyViewed"
import RelatedProducts from "./RelatedProducts"
import EditableText from "@/components/admin/EditableText"
import CategoryPicker from "@/components/admin/CategoryPicker"
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
  categoryHandles?: string[]
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

// TODO: add Stars component back when real ratings are available (Huly XLM-???).

export default function ProductContent(props: ProductContentProps) {
  const {
    locale, product, localizedTitle, images, specs, sellingPoints,
    mainDescriptionHtml, richDescription, manualLinks, breadcrumbItems,
    categoryId, categoryHandle, categoryHandles, categoryName, relatedSearchQuery,
    priceFormatted, priceAmount, priceCurrency, originalAmount,
    compareItem, _categoryPathFn,
  } = props

  return (
    <>
      <TrackProductView
        id={product.id}
        handle={product.handle}
        title={localizedTitle}
        thumbnail={product.thumbnail}
        price={priceFormatted}
      />

      {/* Breadcrumb — SSoT from category-tree.generated.json (spec §3.5.3 + INV-31).
          Never renders VEVOR productType path. */}
      <nav className="text-[15px] text-[#64748B] mb-6 min-h-[28px] flex items-center flex-wrap gap-y-1 transition-opacity duration-200" aria-label="Breadcrumb">
        {breadcrumbItems.map((seg, index) => {
          const isLast = index === breadcrumbItems.length - 1
          return (
            <span key={`bc-${index}-${seg.url}`} className="inline-flex items-center">
              {index > 0 && <span className="mx-2.5 text-[#CBD5E1]">&rsaquo;</span>}
              {isLast ? (
                <span aria-current="page" className="text-[#1a1a2e] font-semibold">{seg.name}</span>
              ) : (
                <Link href={seg.url} className="text-[#64748B] hover:text-[#0b7d79] transition-colors duration-200">
                  {seg.name}
                </Link>
              )}
            </span>
          )
        })}
        <CategoryPicker
          productId={product.id}
          productHandle={product.handle}
          locale={locale}
          currentHandle={categoryHandle}
          onSaved={() => window.location.reload()}
        />
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-10 lg:items-start">
        <ProductGallery images={images} title={localizedTitle} locale={locale} />

        <div>
          <EditableText
            productId={product.id}
            productHandle={product.handle}
            field="title"
            locale={locale}
            initialValue={localizedTitle}
            onSaved={() => window.location.reload()}
          >
            <h1 className="text-lg md:text-xl font-bold text-[#1a1a2e] leading-tight tracking-tight mb-3">
              {localizedTitle}
            </h1>
          </EditableText>

          <ProductPurchasePanel
            locale={locale}
            title={localizedTitle}
            variants={product.variants || []}
            options={product.options}
          />

          {/* Favorites + Compare — below Buy Now, 2-up grid, full labels */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ProductWishlistButton item={compareItem} locale={locale} />
            <ProductCompareActions item={compareItem} locale={locale} />
          </div>

          {/* Quiet key specs — top 4 rows + muted "View all" link */}
          {specs.length > 0 && (
            <dl className="mt-5 pt-4 border-t border-[#E2E8F0] space-y-1.5 text-[13.5px] text-[#64748B]">
              {specs.slice(0, 4).map((spec, i) => (
                <div key={spec.key + i} className="flex leading-[1.5]">
                  <dt className="flex-[0_0_45%] font-normal">{spec.key}</dt>
                  <dd className="m-0 text-[#334155] font-medium">{spec.value}</dd>
                </div>
              ))}
              {specs.length > 4 && (
                <a
                  href="#full-specifications"
                  className="inline-block mt-2 text-[13px] text-[#64748B] underline decoration-[#CBD5E1] underline-offset-[3px] hover:text-[#0b7d79] hover:decoration-[#0ea5a0]"
                >
                  {locale === "et" ? "Vaata kõiki spetsifikatsioone" : "View all specifications"}
                </a>
              )}
            </dl>
          )}

          {/* Trust list — Delivery, Warranty, Returns, Support */}
          <ul className="mt-5 pt-4 border-t border-[#E2E8F0] space-y-2.5 text-[13.5px] text-[#64748B]">
            <li className="flex items-start gap-2.5 leading-[1.45]">
              <svg className="shrink-0 mt-[1px]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5a0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <span>
                <span className="font-semibold text-[#334155]">{locale === "et" ? "Tarne Eestisse" : "Delivery to Estonia"}</span>
                <span className="mx-1.5 text-[#CBD5E1]">·</span>
                {locale === "et" ? "5–10 tööpäeva" : "5–10 business days"}
              </span>
            </li>
            <li className="flex items-start gap-2.5 leading-[1.45]">
              <svg className="shrink-0 mt-[1px]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5a0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
              </svg>
              <span>
                <span className="font-semibold text-[#334155]">{locale === "et" ? "2-aastane garantii" : "2-year warranty"}</span>
                <span className="mx-1.5 text-[#CBD5E1]">·</span>
                {locale === "et" ? "tootjapoolne" : "manufacturer-backed"}
              </span>
            </li>
            <li className="flex items-start gap-2.5 leading-[1.45]">
              <svg className="shrink-0 mt-[1px]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5a0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/>
              </svg>
              <span>
                <span className="font-semibold text-[#334155]">{locale === "et" ? "14-päevane tagastusõigus" : "14-day returns"}</span>
                <span className="mx-1.5 text-[#CBD5E1]">·</span>
                {locale === "et" ? "kasutamata, originaalpakendis" : "unused, in original packaging"}
              </span>
            </li>
            <li className="flex items-start gap-2.5 leading-[1.45]">
              <svg className="shrink-0 mt-[1px]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5a0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span>
                <span className="font-semibold text-[#334155]">{locale === "et" ? "Klienditugi" : "Customer support"}</span>
                <span className="mx-1.5 text-[#CBD5E1]">·</span>
                {locale === "et" ? "E–R" : "Mon–Fri"}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Description + Specs */}
      <div className="mt-12">
        {(() => {
          const richHasContent = richDescription && richDescription.replace(/<[^>]+>|\s/g, "").length > 20
          const descHtml = richHasContent ? richDescription : mainDescriptionHtml
          if (!descHtml) return null
          return (
            <div className="border-b border-[#E2E8F0] pb-6 mb-0">
              <h2 className="text-[17px] font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
                {locale === "et" ? "Toote kirjeldus" : "Product Description"}
                <EditableText
                  productId={product.id}
                  productHandle={product.handle}
                  field="description"
                  locale={locale}
                  initialValue={descHtml}
                  multiline
                  onSaved={() => window.location.reload()}
                >
                  <span aria-hidden="true" />
                </EditableText>
              </h2>
              <div className="max-w-[800px]">
                <CollapsibleDescription
                  html={descHtml}
                  defaultExpanded={true}
                  collapsedHeight={999999}
                />
              </div>
            </div>
          )
        })()}

        {/* Omadused ja üksikasjad — feature-bulletid (metadata.selling_points, locale-aware ET-overlay).
            Formaat "Pealkiri: tekst" → bold-pealkiri + kirjeldus; ilma koolonita → tervik. */}
        {sellingPoints.length > 0 && (
          <div className="border-b border-[#E2E8F0] pb-6 mb-0 pt-6">
            <h2 className="text-[17px] font-bold text-[#1a1a2e] mb-4">
              {locale === "et" ? "Omadused ja üksikasjad" : "Features & Details"}
            </h2>
            <ul className="max-w-[800px] space-y-3">
              {sellingPoints.map((point, i) => {
                const colon = point.indexOf(":")
                const hasTitle = colon > 0 && colon <= 60
                const title = hasTitle ? point.slice(0, colon).trim() : null
                const body = hasTitle ? point.slice(colon + 1).trim() : point.trim()
                if (!body && !title) return null
                return (
                  <li key={i} className="flex items-start gap-2.5 text-[14.5px] leading-[1.55] text-[#334155]">
                    <svg className="shrink-0 mt-[3px]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5a0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>
                      {title && <span className="font-semibold text-[#1a1a2e]">{title}: </span>}
                      {body}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {specs.length > 0 && (
          <div id="full-specifications" className="scroll-mt-20" />
        )}
        {specs.length > 0 && (
          <CollapsibleSection title={locale === "et" ? "Spetsifikatsioonid" : "Specifications"} defaultOpen={true}>
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
                          <span className="text-xs text-[#1a1a2e]">{spec.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        )}

        {manualLinks.length > 0 && (
          <CollapsibleSection title={locale === "et" ? "Juhendid ja allalaadimised" : "Manuals & Downloads"} defaultOpen={true}>
            <div className="flex flex-wrap gap-3">
              {manualLinks.map((manual, index) => (
                <a
                  key={`${manual.href}-${index}`}
                  href={manual.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-medium text-[#1a1a2e] hover:border-[#0ea5a0]/40 hover:text-[#0b7d79] transition-colors duration-200"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span className="text-[#0b7d79] font-bold">PDF</span>
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
        categoryHandles={categoryHandles || []}
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
