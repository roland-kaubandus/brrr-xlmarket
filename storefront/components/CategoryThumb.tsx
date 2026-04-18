/**
 * CategoryThumb — renders a thumbnail for any taxonomy node.
 *
 * Priority:
 *   1. node.image_path (direct / alias / fuzzy — from category-tree.generated.json)
 *   2. L1 Lucide icon fallback with amber tint (taxonomy-v3 V3_ICONS)
 *   3. Generic box icon if no L1 ancestor found (should never happen for valid handles)
 *
 * Used by:
 *   - MegaMenu (all panels)
 *   - Category page SubcategoryScroller
 *   - HomepageShell category bento
 *
 * Spec: 2026-04-18 §3.5 — "iga paneel pildiga"
 */

import { V3_ICONS } from "@/lib/taxonomy-v3"
import { getL1Ancestor, getNode, type CategoryNode } from "@/lib/category-tree"

interface CategoryThumbProps {
  handle: string
  size?: number
  className?: string
  alt?: string
  /**
   * Pre-resolved node — skip the tree lookup. Provide when rendering many
   * thumbs in a tight loop (MegaMenu L2 list).
   */
  node?: CategoryNode | null
}

export default function CategoryThumb({
  handle,
  size = 40,
  className = "",
  alt = "",
  node,
}: CategoryThumbProps) {
  const resolved = node ?? getNode(handle)

  if (resolved?.image_path) {
    return (
      <span
        className={`flex-shrink-0 rounded-md bg-[#F8FAFC] border border-[#ECEEF1] overflow-hidden flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={decodeURIComponent(resolved.image_path)}
          alt={alt}
          className="w-full h-full object-contain"
          loading="lazy"
          width={size}
          height={size}
        />
      </span>
    )
  }

  // SVG fallback — use the L1 ancestor's Lucide icon
  const l1 = resolved ? getL1Ancestor(resolved.handle) : null
  const Icon = l1 ? V3_ICONS[l1.handle] : null
  const iconSize = Math.round(size * 0.55)

  return (
    <span
      className={`flex-shrink-0 rounded-md bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={!alt}
    >
      {Icon ? (
        <Icon size={iconSize} strokeWidth={1.4} color="#D97706" />
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 7V5a4 4 0 0 0-8 0v2" />
        </svg>
      )}
    </span>
  )
}
