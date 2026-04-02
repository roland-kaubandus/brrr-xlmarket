"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"

type Props = {
  html: string
  collapsedHeight?: number
}

export default function CollapsibleDescription({ html, collapsedHeight = 600 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [needsCollapse, setNeedsCollapse] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      setNeedsCollapse(contentRef.current.scrollHeight > collapsedHeight + 100)
    }
  }, [html, collapsedHeight])

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: expanded || !needsCollapse ? "none" : `${collapsedHeight}px` }}
      >
        <div
          className="rich-desc text-off-black text-sm font-[family-name:var(--font-jakarta)] leading-relaxed [&_img]:rounded-xl [&_img]:my-6 [&_img]:w-full [&_img]:max-w-4xl [&_h2]:font-[family-name:var(--font-outfit)] [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-[family-name:var(--font-outfit)] [&_h3]:font-bold [&_h3]:text-base [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-3 [&_p]:text-muted [&_b]:text-off-black [&_strong]:text-off-black [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1 [&_li]:text-muted [&_a]:text-accent [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {needsCollapse && !expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg to-transparent pointer-events-none" />
      )}

      {needsCollapse && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-2 px-8 py-3 border border-soft-border bg-white hover:border-accent/40 rounded-xl text-sm font-semibold font-[family-name:var(--font-outfit)] text-off-black transition-all duration-300"
          >
            {expanded ? "Näita vähem" : "Vaata rohkem"}
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={"transition-transform duration-300 " + (expanded ? "rotate-180" : "")}
            />
          </button>
        </div>
      )}
    </div>
  )
}
