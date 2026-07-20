"use client"

/**
 * CategoryBottomRibbons — three stacked horizontal carousels shown below the
 * main product grid on a category page (spec §3.5.7, F5c.9):
 *
 *   1. History        — products the user has recently viewed, scoped to the
 *                       current L1 branch. Fed by `useRecentlyViewed()` +
 *                       Meili `handle IN [...]` filter (`id` is NOT filterable).
 *                       Order preserved from localStorage (newest first).
 *   2. Deals          — lowest-priced in-stock items in the current L1 branch.
 *                       TODO: switch to `discount_pct:desc` when Meili field
 *                       is live (blueprint RISK-1).
 *   3. Best Sellers   — newest arrivals as a proxy until popularity lands.
 *                       TODO: switch to `popularity:desc` when Meili field is
 *                       live (blueprint RISK-2).
 *
 * Each ribbon self-hides when its product list is empty. The component fires
 * three independent Meili fetches directly from the browser via the nginx
 * `/meili/` proxy — zero SSR cost.
 */

import type { JSX } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import VevorProductCard from "@/components/VevorProductCard"
import { mapMeiliHitToProduct } from "@/lib/map-meili-hit"
import type { MeiliHit } from "@/lib/meilisearch"
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed"

interface CategoryBottomRibbonsProps {
  l1Handle: string
  locale: string
}

type RibbonProduct = ReturnType<typeof mapMeiliHitToProduct>

interface MeiliSearchResponse {
  hits?: MeiliHit[]
}

const RIBBON_LIMIT = 12

async function fetchMeili(body: Record<string, unknown>, signal: AbortSignal): Promise<MeiliHit[]> {
  try {
    const meiliKey = process.env.NEXT_PUBLIC_MEILI_KEY || process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY || ""
    const res = await fetch(`${process.env.NEXT_PUBLIC_MEILI_URL || "/meili"}/indexes/products/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(meiliKey ? { Authorization: `Bearer ${meiliKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) return []
    const data: MeiliSearchResponse = await res.json()
    return data.hits ?? []
  } catch {
    return []
  }
}

/** Safe handle/id token: alnum + dash + underscore, 1–128 chars. */
function isSafeToken(v: string): boolean {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,127}$/i.test(v)
}

function Ribbon({
  title,
  products,
  locale,
}: {
  title: string
  products: RibbonProduct[]
  locale: string
}): JSX.Element | null {
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])

  // H5: single tab-stop per card. Outer wrapper is tabIndex={-1} (programmatic
  // focus target for arrow navigation); the inner <Link> inside VevorProductCard
  // is the natural tab target. ArrowLeft/Right moves focus to sibling cards via
  // their inner <a> so keyboard users traverse predictably.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, idx: number) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
      e.preventDefault()
      const next =
        e.key === "ArrowRight"
          ? Math.min(products.length - 1, idx + 1)
          : Math.max(0, idx - 1)
      const wrapper = itemRefs.current[next]
      if (wrapper) {
        const link = wrapper.querySelector<HTMLAnchorElement>("a")
        if (link) link.focus()
        else wrapper.focus()
        wrapper.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" })
      }
    },
    [products.length]
  )

  if (products.length === 0) return null
  return (
    <section className="py-5 md:py-8" aria-label={title}>
      <div className="max-w-[1360px] mx-auto px-4">
        <div className="flex items-center gap-2 mb-3 md:mb-5">
          <div className="w-1 h-5 rounded-full bg-[#0ea5a0]" aria-hidden="true" />
          <h2 className="font-bold text-[17px] md:text-xl text-[#1a1a2e] tracking-tight">
            {title}
          </h2>
        </div>
      </div>
      <div
        role="list"
        aria-label={title}
        className="overflow-x-auto scrollbar-hide pl-4 md:pl-0 rounded"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <div
          className="flex gap-3 md:gap-4 pr-4 md:max-w-[1360px] md:mx-auto md:px-4"
          style={{ width: "max-content" }}
        >
          {products.map((product, idx) => (
            <div
              key={product.id}
              ref={(el) => {
                itemRefs.current[idx] = el
              }}
              role="listitem"
              tabIndex={-1}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className="w-[185px] md:w-[220px] shrink-0 focus:outline-none rounded-xl"
              style={{ scrollSnapAlign: "start" }}
            >
              <VevorProductCard product={product} locale={locale} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function CategoryBottomRibbons({
  l1Handle,
  locale,
}: CategoryBottomRibbonsProps): JSX.Element | null {
  const { handles: recentHandles } = useRecentlyViewed()

  const [history, setHistory] = useState<RibbonProduct[]>([])
  const [deals, setDeals] = useState<RibbonProduct[]>([])
  const [bestSellers, setBestSellers] = useState<RibbonProduct[]>([])

  const safeL1 = useMemo(() => (isSafeToken(l1Handle) ? l1Handle : null), [l1Handle])

  // Stable string key so the effect re-runs only when the handle list changes.
  const recentKey = useMemo(() => recentHandles.join("|"), [recentHandles])

  // History ribbon — depends on localStorage handles + current L1 branch.
  useEffect(() => {
    if (!safeL1) {
      setHistory([])
      return
    }
    const safeHandles = recentHandles.filter(isSafeToken).slice(0, RIBBON_LIMIT * 2)
    if (safeHandles.length === 0) {
      setHistory([])
      return
    }

    const controller = new AbortController()
    // Meili `id` on MITTE-filterable → filtreeri `handle IN [...]` (handle ON
    // filterable). Parandab brauseri 400 "Attribute `id` is not filterable".
    const handleList = safeHandles.map((h) => `"${h}"`).join(", ")
    const body = {
      q: "",
      limit: RIBBON_LIMIT * 2,
      filter: [
        `handle IN [${handleList}]`,
        `taxonomy.ancestors = "${safeL1}"`,
        "in_stock = true",
      ],
    }

    fetchMeili(body, controller.signal).then((hits) => {
      // Preserve localStorage order (newest first) — Meili does not guarantee it.
      const byHandle = new Map(hits.map((h) => [h.handle, h]))
      const ordered: RibbonProduct[] = []
      for (const h of safeHandles) {
        const hit = byHandle.get(h)
        if (hit) ordered.push(mapMeiliHitToProduct(hit, locale))
        if (ordered.length >= RIBBON_LIMIT) break
      }
      setHistory(ordered)
    })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeL1, locale, recentKey])

  // Deals ribbon — lowest price in-stock in L1.
  useEffect(() => {
    if (!safeL1) {
      setDeals([])
      return
    }
    const controller = new AbortController()
    const body = {
      q: "",
      limit: RIBBON_LIMIT,
      filter: [`taxonomy.ancestors = "${safeL1}"`, "in_stock = true"],
      // TODO: switch to discount_pct:desc when Meili field is live
      sort: ["price:asc"],
    }
    fetchMeili(body, controller.signal).then((hits) => {
      setDeals(hits.map((h) => mapMeiliHitToProduct(h, locale)))
    })
    return () => controller.abort()
  }, [safeL1, locale])

  // Best Sellers ribbon — newest arrivals as a proxy.
  useEffect(() => {
    if (!safeL1) {
      setBestSellers([])
      return
    }
    const controller = new AbortController()
    const body = {
      q: "",
      limit: RIBBON_LIMIT,
      filter: [`taxonomy.ancestors = "${safeL1}"`, "in_stock = true"],
      // TODO: switch to popularity:desc when Meili field is live
      sort: ["created_at:desc"],
    }
    fetchMeili(body, controller.signal).then((hits) => {
      setBestSellers(hits.map((h) => mapMeiliHitToProduct(h, locale)))
    })
    return () => controller.abort()
  }, [safeL1, locale])

  // TODO(F5c.9): Rename back to "Pakkumised" / "Deals" + switch sort to
  // `discount_pct:desc` once Meili field is live. Until then this ribbon is
  // an honest "lowest price" fallback — never advertise it as promotions.
  // TODO(F5c.9): Rename back to "Enimmüüdud" / "Best sellers" + switch sort
  // to `popularity:desc` once Meili field is live. Until then this ribbon
  // is an honest "new arrivals" fallback — never advertise it as popularity.
  const labels = { history: "Recently viewed", deals: "Lowest price", bestSellers: "New arrivals" }

  if (history.length === 0 && deals.length === 0 && bestSellers.length === 0) {
    return null
  }

  return (
    <div className="mt-8 md:mt-12 border-t border-[#E2E8F0]">
      <Ribbon title={labels.history} products={history} locale={locale} />
      <Ribbon title={labels.deals} products={deals} locale={locale} />
      <Ribbon title={labels.bestSellers} products={bestSellers} locale={locale} />
    </div>
  )
}
