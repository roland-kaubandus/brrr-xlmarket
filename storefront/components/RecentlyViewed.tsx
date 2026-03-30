"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

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
    <section className="mt-[48px] pt-[40px] border-t border-[#E8E8E8]">
      <h2 className="text-[20px] font-[600] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[20px]">
        Viimati vaadatud
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[12px]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={"/toode/" + item.handle}
            className="group flex flex-col border border-[#E8E8E8] rounded-[6px] overflow-hidden hover:border-[#E8650A]/40 transition-colors bg-white"
          >
            <div className="aspect-square bg-[#F7F7F7] overflow-hidden">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-contain p-[8px] group-hover:scale-[1.03] transition-transform duration-[250ms]"
                />
              ) : null}
            </div>
            <div className="p-[10px]">
              <p className="text-[12px] font-[500] font-[family-name:var(--font-poppins)] text-[#1A1A1A] line-clamp-2 leading-[1.4] mb-[4px]">
                {item.title}
              </p>
              {item.price && (
                <p className="text-[13px] font-[700] font-[family-name:var(--font-poppins)] text-[#E8650A]">
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
