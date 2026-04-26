/**
 * stock-board-data.ts — server-side fetcher for the homepage Stock Board.
 *
 * Returns one in-stock product per slot category so the row reads as a
 * slice across the whole shop, not a single category dump. Called from
 * the server-rendered homepage; results are revalidated on the page's
 * own revalidate window.
 */

import { searchProducts, getProductTitle } from "@/lib/meilisearch"
import { getNode, nodeName } from "@/lib/category-tree"
import type { StockBoardRow } from "@/components/StockBoard"

const SLOTS: Array<{ handle: string; fallbackLabel: string }> = [
  { handle: "welding-and-soldering", fallbackLabel: "Welding" },
  { handle: "outdoor-cooking", fallbackLabel: "Horeca" },
  { handle: "outdoor-power-equipment", fallbackLabel: "Outdoor power" },
  { handle: "salon-spa-wellness", fallbackLabel: "Salon & Spa" },
  { handle: "cleaning-janitorial", fallbackLabel: "Cleaning" },
  { handle: "small-kitchen-appliances", fallbackLabel: "Small appliances" },
  { handle: "automotive-workshop", fallbackLabel: "Automotive" },
  { handle: "construction-building", fallbackLabel: "Construction" },
]

async function fetchSlot(
  slot: { handle: string; fallbackLabel: string },
  locale: string
): Promise<StockBoardRow | null> {
  try {
    const node = getNode(slot.handle)
    const catLabel = node ? nodeName(node, locale) : slot.fallbackLabel
    const result = await searchProducts({
      q: "",
      limit: 1,
      offset: 0,
      filter: [`taxonomy.ancestors = "${slot.handle}"`, "in_stock = true"],
      sort: ["created_at:desc"],
    })
    const hit = result.hits?.[0]
    if (!hit || !hit.handle) return null
    return {
      handle: hit.handle,
      catLabel,
      name: getProductTitle(hit, locale),
      price: hit.price ?? 0,
    }
  } catch {
    return null
  }
}

export async function getStockBoardRows(locale: string): Promise<{
  rows: StockBoardRow[]
  updatedAt: string
}> {
  const fetched = await Promise.all(SLOTS.map((s) => fetchSlot(s, locale)))
  const rows = fetched.filter((r): r is StockBoardRow => r !== null)
  const now = new Date()
  const updatedAt = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  return { rows, updatedAt }
}
