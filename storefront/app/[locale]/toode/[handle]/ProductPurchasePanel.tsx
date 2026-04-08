"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import AddToCartButton from "./AddToCartButton"
import StickyBuyBar from "@/components/StickyBuyBar"
import { formatPrice, type ProductOption, type ProductVariant } from "@/lib/medusa"

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

  return (
    <>
      {price && (
        <>
          <div className="h-px bg-[#E5E5E5] mb-4" />
          <div className="flex flex-wrap items-baseline gap-3 mb-1">
            <p className="text-[32px] font-bold text-[#222] tracking-tight leading-tight">
              {formatPrice(price.calculated_amount, price.currency_code)}
            </p>
            {price.original_amount > price.calculated_amount && (
              <>
                <span className="text-base text-[#999] line-through">
                  {formatPrice(price.original_amount, price.currency_code)}
                </span>
                <span className="bg-[#E53E3E] text-white text-xs font-bold px-2 py-0.5 rounded">
                  -{Math.round((1 - price.calculated_amount / price.original_amount) * 100)}%
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-[#666] mb-5">Hind sisaldab kaibemaksu</p>
        </>
      )}

      <div className="mb-5">
        {selectedVariant && inStock ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#16A34A]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            Laos
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Hetkel ei ole saadaval
          </span>
        )}
      </div>

      {usableOptions.length > 0 && (
        <div className="space-y-5 mb-6">
          {usableOptions.map((option) => (
            <div key={option.id}>
              <p className="text-sm font-semibold text-[#222] mb-2">
                {option.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {optionValues(option).map((value) => {
                  const isActive = normalizeValue(selection[option.id]) === normalizeValue(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelection((current) => ({ ...current, [option.id]: value }))}
                      className={
                        "px-3.5 py-2 rounded-lg border text-sm transition-colors duration-200 " +
                        (isActive
                          ? "border-[#FF6A00] bg-[#FFF5EE] text-[#FF6A00] font-semibold"
                          : "border-[#E5E5E5] bg-white text-[#222] hover:border-[#FF6A00]/40")
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

      {selectedVariant?.sku && (
        <p className="text-sm text-[#666] mb-5">
          SKU: <span className="text-[#222] font-medium">{selectedVariant.sku}</span>
        </p>
      )}

      {selectedVariant && inStock ? (
        <div className="flex flex-col gap-3">
          <AddToCartButton variantId={selectedVariant.id} />
          <Link
            href={`/${locale}/ostukorv`}
            className="block w-full text-center h-12 leading-[48px] text-sm font-bold bg-[#1A1A1A] text-white hover:bg-[#333] rounded-lg transition-colors duration-200"
          >
            Osta kohe
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[#666]">
          Seda toodet ei saa hetkel osta.
        </p>
      )}

      {/* Delivery info */}
      <div className="mt-5 pt-5 border-t border-[#E5E5E5] flex items-center gap-2 text-sm text-[#666]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        <span>Tarne Eestisse. Hinnanguline tarneaeg 5-10 toopaeva</span>
      </div>

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
