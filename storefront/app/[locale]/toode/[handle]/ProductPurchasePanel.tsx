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
          <div className="h-px bg-soft-border mb-4" />
          <div className="flex flex-wrap items-center gap-3 mb-6">
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

      {/* Trust badges */}
      <div className="flex flex-wrap gap-4 py-4 mb-4 border-y border-soft-border">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8650A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          12 kuu garantii
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8650A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/><path d="M21 12A9 9 0 0 0 12 3a9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          14 p&auml;eva tagastus
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8650A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          Tasuta tarne 200&euro;+
        </div>
      </div>

      <div className="mb-6">
        {selectedVariant && inStock ? (
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

      {usableOptions.length > 0 && (
        <div className="space-y-5 mb-6">
          {usableOptions.map((option) => (
            <div key={option.id}>
              <p className="text-sm font-semibold font-[family-name:var(--font-outfit)] text-off-black mb-2">
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
                        "px-3.5 py-2 rounded-xl border text-sm transition-all duration-300 " +
                        (isActive
                          ? "border-accent bg-accent-light text-accent font-semibold"
                          : "border-soft-border bg-white text-off-black hover:border-accent/40")
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
        <p className="text-sm text-muted font-[family-name:var(--font-jakarta)] mb-6">
          SKU: <span className="text-off-black font-medium">{selectedVariant.sku}</span>
        </p>
      )}

      {selectedVariant && inStock ? (
        <div className="flex flex-col gap-3">
          <AddToCartButton variantId={selectedVariant.id} />
          <Link
            href={`/${locale}/ostukorv`}
            className="block w-full text-center py-3 text-sm font-semibold font-[family-name:var(--font-outfit)] border border-accent text-accent bg-transparent hover:bg-accent-light rounded-xl btn-press transition-all duration-300"
          >
            Osta kohe &rarr;
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted font-[family-name:var(--font-jakarta)]">
          Seda toodet ei saa hetkel osta.
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
