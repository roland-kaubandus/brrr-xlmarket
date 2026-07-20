"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"

type Props = {
  html: string
  collapsedHeight?: number
  defaultExpanded?: boolean
}

export default function CollapsibleDescription({ html, collapsedHeight = 600, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)
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
          className="rich-desc text-[#1a1a2e] text-[15px] leading-[1.65] [&_img]:rounded-lg [&_img]:my-5 [&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-[500px] [&_img]:object-contain [&_img]:mx-auto [&_img]:block [&_h2]:font-bold [&_h2]:text-[20px] [&_h2]:text-[#1a1a2e] [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:tracking-tight [&_h3]:font-semibold [&_h3]:text-[17px] [&_h3]:text-[#1a1a2e] [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:tracking-tight [&_h4]:font-semibold [&_h4]:text-[15px] [&_h4]:text-[#1a1a2e] [&_h4]:mt-5 [&_h4]:mb-2 [&_p]:mb-3 [&_p]:text-[#475569] [&_p]:leading-[1.65] [&_b]:text-[#1a1a2e] [&_b]:font-semibold [&_strong]:text-[#1a1a2e] [&_strong]:font-semibold [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:my-3 [&_ul]:space-y-1 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:my-3 [&_ol]:space-y-1 [&_li]:text-[#475569] [&_li]:leading-[1.6] [&_a]:text-[#0ea5a0] [&_a]:underline [&_a:hover]:text-[#0b7d79] [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_table]:border [&_table]:border-[#E2E8F0] [&_table]:rounded-md [&_table]:overflow-hidden [&_th]:bg-[#F1F5F9] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-[#1a1a2e] [&_th]:border [&_th]:border-[#E2E8F0] [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:text-[#475569] [&_td]:border [&_td]:border-[#E2E8F0]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {needsCollapse && !expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      )}

      {needsCollapse && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-2 px-8 py-3 border border-[#E2E8F0] bg-white hover:border-[#0ea5a0]/40 rounded-lg text-sm font-semibold text-[#1a1a2e] transition-colors duration-200"
          >
            {expanded ? "Show Less" : "Show More"}
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
