"use client"

import { useState } from "react"
import { V3_ICONS } from "@/lib/taxonomy-v3"

type Props = {
  src: string
  alt: string
  size: number
  l1_handle?: string | null
}

/**
 * Thin client wrapper around <img>. When the src fails to load (404 or broken),
 * swaps to an L1 Lucide icon fallback or a generic box. Prevents the raw
 * alt-text bubble from leaking into the UI.
 */
export default function CategoryThumbImage({ src, alt, size, l1_handle }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    const Icon = l1_handle ? V3_ICONS[l1_handle] : null
    const iconSize = Math.round(size * 0.5)
    return (
      <span className="w-full h-full flex items-center justify-center bg-[#F8FAFC]" aria-label={alt || undefined}>
        {Icon ? (
          <Icon size={iconSize} strokeWidth={1.3} color="#94A3B8" />
        ) : (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="7" width="18" height="13" rx="2" ry="2" />
            <path d="M16 7V5a4 4 0 0 0-8 0v2" />
          </svg>
        )}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain"
      loading="lazy"
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  )
}
