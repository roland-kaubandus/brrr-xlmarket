"use client"

import { useEffect, useState } from "react"
import Link from "@/components/SafeLink"
import { safeReadJSON } from "@/lib/safe-storage"

type RecentItem = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price: string
}

type Props = {
  currentId: string
}

const STORAGE_KEY = "xlmarket_recently_viewed"

export default function RecentlyViewed({ currentId }: Props) {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    const all = safeReadJSON<RecentItem[]>(STORAGE_KEY, [])
    setItems(all.filter((i) => i.id !== currentId).slice(0, 10))
  }, [currentId])

  if (items.length === 0) return null

  return (
    <section className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-[#E2E8F0]">
      <h2 className="text-[15px] md:text-[20px] font-bold text-[#1E293B] mb-3 md:mb-5">
        Recently Viewed
      </h2>
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="flex gap-3" style={{ width: "max-content" }}>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/en/toode/${item.handle}`}
              className="group flex flex-col border border-[#E2E8F0] rounded-xl overflow-hidden hover:border-[#D97706]/40 hover:shadow-md transition-all duration-200 bg-white w-[160px] md:w-[200px] shrink-0"
            >
              <div className="aspect-square bg-[#FAFAFA] overflow-hidden flex items-center justify-center p-3">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                ) : null}
              </div>
              <div className="p-3">
                <p className="text-[13px] font-medium text-[#334155] line-clamp-2 leading-snug mb-1.5 group-hover:text-[#1E293B] transition-colors">
                  {item.title}
                </p>
                {item.price && (
                  <p className="text-[16px] font-bold text-[#1E293B]">
                    {item.price}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
