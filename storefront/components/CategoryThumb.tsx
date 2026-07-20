/**
 * CategoryThumb — renders a thumbnail for any taxonomy node.
 *
 * Priority:
 *   1. image_path prop (passed directly — no internal tree lookup)
 *   2. L1 Lucide icon fallback via V3_ICONS[l1Handle]
 *   3. Generic box icon
 *
 * PERF-C1 (2026-04-20): removed getNode / getL1Ancestor imports so this
 * component does NOT pull the 1.5MB category-tree.generated.json into the
 * client bundle. All callers must pass image_path and l1Handle explicitly
 * (or pass a node + l1Handle where the handle is known).
 *
 * Used by:
 *   - MegaMenu (all panels) — passes node + l1Handle
 *   - SubcategoryCarousel — passes node (ChildWithCount extends CategoryNode)
 *     which includes image_path; l1Handle resolved server-side
 *   - kategooriad/page.tsx — SERVER component, safe
 *
 * Spec: 2026-04-18 §3.5 — "iga paneel pildiga"
 */

import { V3_ICONS } from "@/lib/taxonomy-v3"
import CategoryThumbImage from "./CategoryThumbImage"

interface CategoryThumbProps {
  /** Category handle — used as React key only, no tree lookup. */
  handle: string
  size?: number
  className?: string
  alt?: string
  /** Image URL. When provided, renders an <img>. */
  image_path?: string | null
  /**
   * L1 ancestor handle for Lucide icon fallback.
   * If omitted and image_path is missing, renders a generic box icon.
   */
  l1_handle?: string | null
}

export default function CategoryThumb({
  handle,
  size = 40,
  className = "",
  alt = "",
  image_path,
  l1_handle,
}: CategoryThumbProps) {
  if (image_path) {
    return (
      <span
        className={`flex-shrink-0 rounded-md bg-[#F8FAFC] border border-[#ECEEF1] overflow-hidden flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <CategoryThumbImage src={image_path} alt={alt} size={size} l1_handle={l1_handle} />
      </span>
    )
  }

  const Icon = l1_handle ? V3_ICONS[l1_handle] : null
  const iconSize = Math.round(size * 0.55)

  return (
    <span
      className={`flex-shrink-0 rounded-md bg-[#ccfbf1] border border-[#FDE68A] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={!alt}
    >
      {Icon ? (
        <Icon size={iconSize} strokeWidth={1.4} color="#0ea5a0" />
      ) : (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0ea5a0"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 7V5a4 4 0 0 0-8 0v2" />
        </svg>
      )}
    </span>
  )
}
