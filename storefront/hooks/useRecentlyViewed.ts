"use client"

/**
 * useRecentlyViewed — localStorage-backed ring buffer for the
 * "Recently viewed" ribbon on category pages (spec §3.5.7, F5c.10).
 *
 * Storage key: `xl.recently_viewed` (NEW key, deliberately different from the
 * legacy `xlmarket_recently_viewed` used by the product-detail RecentlyViewed
 * component — see blueprint ASSUMPTION-3). The two keys coexist until the
 * product-detail page is migrated to this hook in a follow-up.
 *
 * Guarantees:
 *   - SSR-safe: returns `{ ids: [], record: noop }` when `window` is absent.
 *   - Dedupe by `id`: recording an already-present id moves it to the front.
 *   - Newest first: the most recently viewed item is at index 0.
 *   - Max 50 entries: older overflow is dropped silently.
 *   - Malformed JSON in storage is tolerated (treated as empty list).
 */

import { useCallback, useEffect, useState } from "react"

export interface RecentlyViewedItem {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price: string
  viewed_at: number
}

export interface UseRecentlyViewedReturn {
  ids: string[]
  /** Product handles in the same (newest-first) order as `ids`. Meili `id` is
   *  NOT filterable, so consumers filter by `handle IN [...]` instead. */
  handles: string[]
  record: (item: RecentlyViewedItem) => void
}

const STORAGE_KEY = "xl.recently_viewed"
const LEGACY_STORAGE_KEY = "xlmarket_recently_viewed"
const MAX_ENTRIES = 50

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function parseEntries(raw: string | null): RecentlyViewedItem[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const items: RecentlyViewedItem[] = []
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue
      const e = entry as Record<string, unknown>
      if (typeof e.id !== "string" || typeof e.handle !== "string") continue
      items.push({
        id: e.id,
        handle: e.handle,
        title: typeof e.title === "string" ? e.title : "",
        thumbnail: typeof e.thumbnail === "string" ? e.thumbnail : null,
        price: typeof e.price === "string" ? e.price : "",
        viewed_at: typeof e.viewed_at === "number" ? e.viewed_at : 0,
      })
    }
    return items
  } catch {
    return []
  }
}

/**
 * TRANSITIONAL: Reads BOTH the new `xl.recently_viewed` key and the legacy
 * `xlmarket_recently_viewed` key (written by TrackProductView). New entries
 * take precedence; legacy-only ids fill the remainder. Once TrackProductView
 * is migrated to call `record()`, this fallback can be removed. See F5c.10.
 */
function readStorage(): RecentlyViewedItem[] {
  if (!isBrowser()) return []
  try {
    const primary = parseEntries(window.localStorage.getItem(STORAGE_KEY))
    const legacy = parseEntries(window.localStorage.getItem(LEGACY_STORAGE_KEY))
    const seen = new Set<string>()
    const merged: RecentlyViewedItem[] = []
    for (const it of primary) {
      if (seen.has(it.id)) continue
      seen.add(it.id)
      merged.push(it)
    }
    for (const it of legacy) {
      if (seen.has(it.id)) continue
      seen.add(it.id)
      merged.push(it)
    }
    return merged.slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

function writeStorage(items: RecentlyViewedItem[]): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ENTRIES)))
  } catch {
    // Quota exceeded or private mode — silently drop.
  }
}

export function useRecentlyViewed(): UseRecentlyViewedReturn {
  const [items, setItems] = useState<RecentlyViewedItem[]>([])

  // Hydrate from localStorage on mount (client only).
  useEffect(() => {
    if (!isBrowser()) return
    setItems(readStorage())

    // Cross-tab sync: react to storage events from other tabs.
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== STORAGE_KEY && ev.key !== LEGACY_STORAGE_KEY) return
      setItems(readStorage())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const record = useCallback((item: RecentlyViewedItem) => {
    if (!isBrowser()) return
    setItems((prev) => {
      const deduped = prev.filter((i) => i.id !== item.id)
      const next = [item, ...deduped].slice(0, MAX_ENTRIES)
      writeStorage(next)
      return next
    })
  }, [])

  return {
    ids: items.map((i) => i.id),
    handles: items.map((i) => i.handle),
    record,
  }
}
