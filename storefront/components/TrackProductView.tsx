"use client"

import { useEffect } from "react"
import { safeReadJSON, safeWriteJSON } from "@/lib/safe-storage"

type Props = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  price: string
}

const STORAGE_KEY = "xlmarket_recently_viewed"

export default function TrackProductView({ id, handle, title, thumbnail, price }: Props) {
  useEffect(() => {
    const items = safeReadJSON<Array<{ id: string; handle: string; title: string; thumbnail: string | null; price: string }>>(STORAGE_KEY, [])
    // Remove if already present, prepend to front, keep max 10
    const filtered = items.filter((i) => i.id !== id)
    filtered.unshift({ id, handle, title, thumbnail, price })
    safeWriteJSON(STORAGE_KEY, filtered.slice(0, 10))
  }, [id, handle, title, thumbnail, price])

  return null
}
