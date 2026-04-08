"use client"

import { useState } from "react"
import Link from "next/link"

type Subcategory = {
  id: string
  name: string
  handle: string
  count: number
}

type Props = {
  subcategories: Subcategory[]
  selectedHandle: string | null
  basePath: string
  queryParams: Record<string, string>
  initialLimit?: number
}

function buildCatUrl(basePath: string, queryParams: Record<string, string>, catHandle: string) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(queryParams)) {
    if (k !== "cat" && k !== "limit" && v) params.set(k, v)
  }
  if (catHandle) params.set("cat", catHandle)
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export default function SubcategoryGrid({
  subcategories,
  selectedHandle,
  basePath,
  queryParams,
  initialLimit = 8,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? subcategories : subcategories.slice(0, initialLimit)
  const hasMore = subcategories.length > initialLimit
  const clearUrl = buildCatUrl(basePath, queryParams, "")

  return (
    <div className="mb-8">
      <h2 className="font-[family-name:var(--font-dm-sans)] font-[700] text-xl tracking-tight mb-5">
        Product Groups
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {visible.map((sub) => {
          const isActive = selectedHandle === sub.handle
          return (
            <Link
              key={sub.id}
              href={buildCatUrl(basePath, queryParams, sub.handle)}
              className={`group flex flex-col items-center justify-center rounded-2xl border bg-white px-3 py-5 text-center transition-all duration-300 ${
                isActive
                  ? "border-accent shadow-[0_8px_24px_rgba(232,101,10,0.08)]"
                  : "border-soft-border hover:border-accent/30"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  isActive ? "bg-accent/10" : "bg-silver group-hover:bg-accent/10"
                }`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isActive ? "#E8650A" : "#6B7280"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <span
                className={`text-xs font-semibold leading-tight ${
                  isActive ? "text-accent" : "text-off-black group-hover:text-accent"
                }`}
              >
                {sub.name}
              </span>
              <span className="mt-1.5 text-[10px] text-muted">
                {sub.count.toLocaleString("en")} products
              </span>
            </Link>
          )
        })}
      </div>

      {/* Show all / Hide button */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-muted hover:text-accent border border-soft-border hover:border-accent/30 rounded-xl transition-all duration-300"
          >
            {expanded ? (
              <>
                Hide
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m18 15-6-6-6 6"/></svg>
              </>
            ) : (
              <>
                {`View all product groups (${subcategories.length})`}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Clear active filter */}
      {selectedHandle && (
        <div className="mt-3 flex justify-center">
          <Link
            href={clearUrl}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            Clear filter
          </Link>
        </div>
      )}
    </div>
  )
}
