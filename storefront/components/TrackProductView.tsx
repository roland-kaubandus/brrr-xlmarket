"use client"

import { useEffect } from "react"

type Props = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price: string
}

export default function TrackProductView({ id, handle, title, thumbnail, price }: Props) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("xlmarket_recently_viewed")
      const items = raw ? JSON.parse(raw) : []
      // Remove if already exists, add to front
      const filtered = items.filter((i: { id: string }) => i.id !== id)
      filtered.unshift({ id, handle, title, thumbnail, price })
      // Keep max 10 items
      localStorage.setItem("xlmarket_recently_viewed", JSON.stringify(filtered.slice(0, 10)))
    } catch {}
  }, [id, handle, title, thumbnail, price])

  return null
}
