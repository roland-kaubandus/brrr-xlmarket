"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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

export default function RecentlyViewed({ currentId }: Props) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'et'
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("xlmarket_recently_viewed")
      const all: RecentItem[] = raw ? JSON.parse(raw) : []
      setItems(all.filter((i) => i.id !== currentId).slice(0, 4))
    } catch {}
  }, [currentId])

  if (items.length === 0) return null

  return (
    <section className="mt-12 pt-10 border-t border-[#E5E5E5]">
      <h2 className="text-[20px] font-bold text-[#222] mb-5">
        Viimati vaadatud
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/${locale}/toode/${item.handle}`}
            className="group flex flex-col border border-[#E5E5E5] rounded-lg overflow-hidden hover:border-[#FF6A00]/40 hover:shadow-md transition-all duration-200 bg-white"
          >
            <div className="aspect-square bg-white overflow-hidden">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                />
              ) : null}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-medium text-[#222] line-clamp-2 leading-snug mb-1">
                {item.title}
              </p>
              {item.price && (
                <p className="text-sm font-bold text-[#222]">
                  {item.price}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
