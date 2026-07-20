"use client"

import Link from "@/components/SafeLink"
import { useMemo, useState } from "react"
import AddToCartButton from "./AddToCartButton"
import StickyBuyBar from "@/components/StickyBuyBar"
import { formatPrice, type ProductOption, type ProductVariant } from "@/lib/medusa"
import { useAdmin } from "@/components/admin/AdminProvider"
import posthog from "posthog-js"

type Props = {
  locale: string
  title: string
  variants: ProductVariant[]
  options?: ProductOption[]
}

function normalizeValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function optionValues(option?: ProductOption): string[] {
  if (!option?.values?.length) return []
  const values = option.values
    .map((value) => typeof value === "string" ? value : value?.value)
    .filter((value): value is string => Boolean(value))
  return Array.from(new Set(values))
}

function variantOptionValue(variant: ProductVariant | undefined, option: ProductOption): string {
  if (!variant) return ""
  const match = variant.options?.find((item) => {
    const optionId = item.option?.id || item.option_id
    return optionId === option.id || normalizeValue(item.option?.title) === normalizeValue(option.title)
  })
  return match?.option_value?.value || match?.value || ""
}

function hasInventory(variant: ProductVariant): boolean {
  if (variant.allow_backorder) return true
  if (variant.manage_inventory === false) return true
  if (typeof variant.inventory_quantity === "number") return variant.inventory_quantity > 0
  return true
}

export default function ProductPurchasePanel({ locale, title, variants, options = [] }: Props) {
  const usableOptions = useMemo(
    () => options.filter((option) => optionValues(option).length > 1 || normalizeValue(option.title) !== "default"),
    [options]
  )

  const defaultSelection = useMemo(() => {
    const firstVariant = variants[0]
    const initial: Record<string, string> = {}
    for (const option of usableOptions) {
      const variantValue = variantOptionValue(firstVariant, option)
      const fallbackValue = optionValues(option)[0] || ""
      initial[option.id] = variantValue || fallbackValue
    }
    return initial
  }, [usableOptions, variants])

  const [selection, setSelection] = useState<Record<string, string>>(defaultSelection)

  const selectedVariant = useMemo(() => {
    if (usableOptions.length === 0) return variants[0]
    return variants.find((variant) =>
      usableOptions.every((option) =>
        normalizeValue(variantOptionValue(variant, option)) === normalizeValue(selection[option.id])
      )
    ) || variants[0]
  }, [selection, usableOptions, variants])

  const price = selectedVariant?.calculated_price
  const inStock = selectedVariant ? hasInventory(selectedVariant) : false
  const { isAdmin } = useAdmin()
  const adminQty = isAdmin && selectedVariant && typeof selectedVariant.inventory_quantity === "number"
    ? selectedVariant.inventory_quantity
    : null

  return (
    <>
      {price && (
        <>
          <div className="h-px bg-[#E2E8F0] mb-4" />
          <div className="flex flex-wrap items-baseline gap-3 mb-1">
            <p className="text-[32px] font-bold text-[#1a1a2e] tracking-tight leading-tight">
              {formatPrice(price.calculated_amount, price.currency_code)}
            </p>
            {price.original_amount > price.calculated_amount && (
              <>
                <span className="text-base text-[#64748B] line-through">
                  {formatPrice(price.original_amount, price.currency_code)}
                </span>
                <span className="bg-[#DC2626] text-white text-xs font-bold px-2 py-0.5 rounded">
                  -{Math.round((1 - price.calculated_amount / price.original_amount) * 100)}%
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-[#64748B] mb-5">{locale === "et" ? "Hind sisaldab käibemaksu" : "Price includes VAT"}</p>
        </>
      )}

      <div className="mb-5 flex items-center gap-3 flex-wrap">
        {selectedVariant && inStock ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#059669]">
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            {locale === "et" ? "Laos" : "In Stock"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {locale === "et" ? "Hetkel pole saadaval" : "Currently Unavailable"}
          </span>
        )}
        {adminQty !== null && (
          <span
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1a1a2e] bg-[#FCD34D] border border-[#0b7d79] rounded px-2 py-0.5"
            title="Admin only — laoseis Medusa API-st"
          >
            ADMIN: {adminQty} tk
          </span>
        )}
      </div>

      {usableOptions.length > 0 && (
        <div className="space-y-5 mb-6">
          {usableOptions.map((option) => (
            <div key={option.id}>
              <p className="text-sm font-semibold text-[#1a1a2e] mb-2">
                {option.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {optionValues(option).map((value) => {
                  const isActive = normalizeValue(selection[option.id]) === normalizeValue(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                      setSelection((current) => ({ ...current, [option.id]: value }))
                      posthog.capture("variant_selected", { option: option.title, value })
                    }}
                      className={
                        "px-3.5 py-2 rounded-lg border text-sm transition-colors duration-200 " +
                        (isActive
                          ? "border-[#0ea5a0] bg-[#f0fdf9] text-[#0ea5a0] font-semibold"
                          : "border-[#E2E8F0] bg-white text-[#1a1a2e] hover:border-[#0ea5a0]/40")
                      }
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVariant && inStock ? (
        <div className="flex flex-col gap-3">
          <AddToCartButton variantId={selectedVariant.id} />
          <Link
            href={`/${locale}/ostukorv`}
            className="block w-full text-center h-12 leading-[48px] text-sm font-bold bg-[#1a1a2e] text-white hover:bg-[#12121f] rounded-lg transition-colors duration-200"
          >
            {locale === "et" ? "Osta kohe" : "Buy Now"}
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[#64748B]">
          {locale === "et" ? "See toode pole hetkel saadaval." : "This product is currently unavailable."}
        </p>
      )}

      {selectedVariant && price && (
        <StickyBuyBar
          variantId={selectedVariant.id}
          title={title}
          price={formatPrice(price.calculated_amount, price.currency_code)}
        />
      )}
    </>
  )
}
