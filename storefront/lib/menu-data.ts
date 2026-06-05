/**
 * menu-data.ts — server-only slice of the category tree for MegaMenu + HomepageShell.
 *
 * Ships ~30KB JSON to client instead of 1.5MB.
 * L3+ nodes are fetched lazily via /api/category-children on user drill.
 *
 * Spec: PERF-C1 (2026-04-20).
 */

import "server-only"
import { getVisibleL1, getChildren, getNavChildren, getNode, type CategoryNode } from "./category-tree"
import countsDoc from "./category-counts.generated.json"

const COUNTS: Record<string, number> = (countsDoc as { counts: Record<string, number> }).counts || {}
const countOf = (handle: string): number => COUNTS[handle] ?? 0

export interface MenuNode {
  handle: string
  name_en: string
  /** Optional Estonian translation — present after taxonomy.yaml is translated + gen-tree runs. */
  name_et?: string
  image_path: string | null
  level: number
  /** Present only on L2 nodes — indicates whether this node has children (for drill chevron + lazy fetch). */
  has_children: boolean
  /** L1 ancestor handle — used by CategoryThumb for icon fallback. */
  l1_handle: string
}

export interface HomepageL1Node {
  handle: string
  name_en: string
  name_et?: string
  image_path: string | null
  level: 1
  l2_count: number
  /** Direct L2 children (name + handle + image for the sublist). */
  l2_list: Array<{ handle: string; name_en: string; name_et?: string; image_path: string | null }>
  /**
   * Up to 6 featured leaf nodes for the bento card grid.
   * BFS walk through subtree, filtered to nodes with usable image_path.
   */
  featured: Array<{ handle: string; name_en: string; name_et?: string; image_path: string }>
}

/** Slim node for MegaMenu L2/L3 panels. */
function toMenuNode(node: CategoryNode, l1Handle: string): MenuNode {
  return {
    handle: node.handle,
    name_en: node.name_en,
    name_et: node.name_et,
    image_path: node.image_path,
    level: node.level,
    has_children: node.child_handles.length > 0,
    l1_handle: l1Handle,
  }
}

/**
 * Returns L1 list + per-L1 direct children (L2) for the MegaMenu.
 * ~18 L1 + ~200 L2 nodes = ~500 nodes max.
 * L3+ not included — fetched lazily via /api/category-children.
 */
export function getMenuSlice(): {
  l1: MenuNode[]
  l2ByL1: Record<string, MenuNode[]>
} {
  const l1Nodes = getVisibleL1()
  const l1: MenuNode[] = l1Nodes.map((n) => ({
    handle: n.handle,
    name_en: n.name_en,
    name_et: n.name_et,
    image_path: n.image_path,
    level: 1,
    has_children: n.child_handles.length > 0,
    l1_handle: n.handle,
  }))

  const l2ByL1: Record<string, MenuNode[]> = {}
  for (const l1Node of l1Nodes) {
    l2ByL1[l1Node.handle] = getNavChildren(l1Node.handle).map((c) =>
      toMenuNode(c, l1Node.handle)
    )
  }

  return { l1, l2ByL1 }
}

/**
 * Returns the children of `handle` as MenuNode[].
 * Used by the /api/category-children route.
 */
export function getMenuChildren(handle: string): MenuNode[] {
  const node = getNode(handle)
  if (!node) return []

  // Find the L1 ancestor handle for the icon fallback.
  let cur: CategoryNode | null = node
  let l1Handle = handle
  while (cur && cur.level > 1 && cur.parent_handle) {
    const parent = getNode(cur.parent_handle)
    if (!parent) break
    cur = parent
    if (cur.level === 1) l1Handle = cur.handle
  }

  return getNavChildren(handle).map((c) => toMenuNode(c, l1Handle))
}

/**
 * Returns the 18 L1 nodes enriched with L2 sublist and featured bento cards.
 * Used by HomepageShell.
 *
 * `featuredOverrides` (optional, admin-edited) maps L1 handle → ordered list of
 * up to 6 descendant handles to use as featured cards instead of the default
 * BFS picks. Unknown handles are silently dropped; missing entries fall back to
 * the default behaviour.
 */
export function getHomepageL1Nodes(
  featuredOverrides?: Record<string, string[]>
): HomepageL1Node[] {
  return getVisibleL1().map((l1Node) => {
    const l2ListRaw = getNavChildren(l1Node.handle)
    // Sort L2 by product count (biggest first). Meili snapshot source.
    const l2List = [...l2ListRaw].sort((a, b) => countOf(b.handle) - countOf(a.handle))

    const isUsable = (n: CategoryNode) =>
      !!n.image_path && n.image_source !== "fuzzy"

    // Sublist: min 6, max 10. L2 in count order; backfill with L3 (also by count).
    const MIN_SUBLIST = 6
    const MAX_SUBLIST = 10
    const sublist: Array<{ handle: string; name_en: string; name_et?: string; image_path: string | null }> = []
    const sublistSeen = new Set<string>()
    for (const l2 of l2List) {
      if (sublist.length >= MAX_SUBLIST) break
      sublist.push({ handle: l2.handle, name_en: l2.name_en, name_et: l2.name_et, image_path: l2.image_path })
      sublistSeen.add(l2.handle)
    }
    if (sublist.length < MIN_SUBLIST) {
      // Backfill with L3 grandchildren, ordered by count across all L2 subtrees.
      const l3Pool: CategoryNode[] = []
      for (const l2 of l2List) {
        for (const l3h of l2.child_handles) {
          if (sublistSeen.has(l3h)) continue
          const l3 = getNode(l3h)
          if (l3) l3Pool.push(l3)
        }
      }
      l3Pool.sort((a, b) => countOf(b.handle) - countOf(a.handle))
      for (const l3 of l3Pool) {
        if (sublist.length >= MIN_SUBLIST) break
        sublist.push({ handle: l3.handle, name_en: l3.name_en, name_et: l3.name_et, image_path: l3.image_path })
        sublistSeen.add(l3.handle)
      }
    }

    // Featured cards mirror the sublist top-6. If an entry lacks a usable
    // image, descend its subtree by count until we find a node with an image.
    const resolveUsable = (handle: string): { handle: string; name_en: string; name_et?: string; image_path: string } | null => {
      let cur = getNode(handle)
      while (cur) {
        if (isUsable(cur)) {
          return { handle: cur.handle, name_en: cur.name_en, name_et: cur.name_et, image_path: cur.image_path! }
        }
        if (!cur.child_handles.length) return null
        const heaviest = [...cur.child_handles]
          .map((h) => getNode(h))
          .filter((n): n is CategoryNode => !!n)
          .sort((a, b) => countOf(b.handle) - countOf(a.handle))[0]
        if (!heaviest) return null
        cur = heaviest
      }
      return null
    }
    const featured: Array<{ handle: string; name_en: string; name_et?: string; image_path: string }> = []
    const overrideList = featuredOverrides?.[l1Node.handle]
    if (Array.isArray(overrideList) && overrideList.length > 0) {
      for (const handle of overrideList.slice(0, 6)) {
        const node = getNode(handle)
        if (!node) continue
        const resolved = resolveUsable(handle)
        if (resolved) {
          featured.push({ handle: node.handle, name_en: node.name_en, name_et: node.name_et, image_path: resolved.image_path })
        }
      }
    }
    if (featured.length === 0) {
      // Default: top-6 sublist with image fallback.
      for (const entry of sublist.slice(0, 6)) {
        const resolved = resolveUsable(entry.handle)
        if (resolved) {
          featured.push({ handle: entry.handle, name_en: entry.name_en, name_et: entry.name_et, image_path: resolved.image_path })
        }
      }
    }

    return {
      handle: l1Node.handle,
      name_en: l1Node.name_en,
      name_et: l1Node.name_et,
      image_path: l1Node.image_path,
      level: 1 as const,
      l2_count: l2ListRaw.length,
      l2_list: sublist,
      featured,
    }
  })
}
