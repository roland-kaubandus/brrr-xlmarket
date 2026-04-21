/**
 * menu-data.ts — server-only slice of the category tree for MegaMenu + HomepageShell.
 *
 * Ships ~30KB JSON to client instead of 1.5MB.
 * L3+ nodes are fetched lazily via /api/category-children on user drill.
 *
 * Spec: PERF-C1 (2026-04-20).
 */

import "server-only"
import { getVisibleL1, getChildren, getNode, type CategoryNode } from "./category-tree"

export interface MenuNode {
  handle: string
  name_en: string
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
  image_path: string | null
  level: 1
  l2_count: number
  /** Direct L2 children (name + handle + image for the sublist). */
  l2_list: Array<{ handle: string; name_en: string; image_path: string | null }>
  /**
   * Up to 6 featured leaf nodes for the bento card grid.
   * BFS walk through subtree, filtered to nodes with usable image_path.
   */
  featured: Array<{ handle: string; name_en: string; image_path: string }>
}

/** Slim node for MegaMenu L2/L3 panels. */
function toMenuNode(node: CategoryNode, l1Handle: string): MenuNode {
  return {
    handle: node.handle,
    name_en: node.name_en,
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
    image_path: n.image_path,
    level: 1,
    has_children: n.child_handles.length > 0,
    l1_handle: n.handle,
  }))

  const l2ByL1: Record<string, MenuNode[]> = {}
  for (const l1Node of l1Nodes) {
    l2ByL1[l1Node.handle] = getChildren(l1Node.handle).map((c) =>
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

  return getChildren(handle).map((c) => toMenuNode(c, l1Handle))
}

/**
 * Returns the 18 L1 nodes enriched with L2 sublist and featured bento cards.
 * Used by HomepageShell.
 */
export function getHomepageL1Nodes(): HomepageL1Node[] {
  return getVisibleL1().map((l1Node) => {
    const l2List = getChildren(l1Node.handle)

    // BFS to find up to 6 usable nodes (image_path present and not fuzzy).
    const isUsable = (n: CategoryNode) =>
      !!n.image_path && n.image_source !== "fuzzy"
    const featured: Array<{ handle: string; name_en: string; image_path: string }> = []
    const seen = new Set<string>()
    const queue: string[] = [...l2List.map((n) => n.handle)]
    while (queue.length && featured.length < 6) {
      const h = queue.shift()!
      if (seen.has(h)) continue
      seen.add(h)
      const node = getNode(h)
      if (!node) continue
      if (isUsable(node)) {
        featured.push({
          handle: node.handle,
          name_en: node.name_en,
          image_path: node.image_path!,
        })
      }
      for (const ch of node.child_handles) queue.push(ch)
    }

    // Sublist: at least 6 entries. If L2 count < 6, backfill with L3 grandchildren
    // via BFS so sparse branches (e.g. pets-wildlife-clinic has only 2 L2) still
    // show a respectable list. Otherwise cap at 10 L2.
    const MIN_SUBLIST = 6
    const MAX_SUBLIST = 10
    const sublist: Array<{ handle: string; name_en: string; image_path: string | null }> = []
    const sublistSeen = new Set<string>()
    for (const l2 of l2List) {
      if (sublist.length >= MAX_SUBLIST) break
      sublist.push({ handle: l2.handle, name_en: l2.name_en, image_path: l2.image_path })
      sublistSeen.add(l2.handle)
    }
    if (sublist.length < MIN_SUBLIST) {
      // Backfill with grandchildren (L3) in L2 order.
      for (const l2 of l2List) {
        if (sublist.length >= MIN_SUBLIST) break
        for (const l3h of l2.child_handles) {
          if (sublist.length >= MIN_SUBLIST) break
          if (sublistSeen.has(l3h)) continue
          const l3 = getNode(l3h)
          if (!l3) continue
          sublist.push({ handle: l3.handle, name_en: l3.name_en, image_path: l3.image_path })
          sublistSeen.add(l3h)
        }
      }
    }

    return {
      handle: l1Node.handle,
      name_en: l1Node.name_en,
      image_path: l1Node.image_path,
      level: 1 as const,
      l2_count: l2List.length,
      l2_list: sublist,
      featured,
    }
  })
}
