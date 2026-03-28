"use client"

import { useState } from "react"
import Image from "next/image"

type GalleryImage = {
  id: string
  url: string
}

type Props = {
  images: GalleryImage[]
  title: string
}

export default function ProductGallery({ images, title }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400">
        Pilt puudub
      </div>
    )
  }

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-square bg-white border border-gray-200">
        <Image
          src={images[activeIndex].url}
          alt={title}
          fill
          className="object-contain p-4"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {images.slice(0, 8).map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Vaata pilti ${i + 1}`}
              aria-pressed={i === activeIndex}
              className={`relative aspect-square bg-white border transition ${
                i === activeIndex
                  ? "border-brand-500 ring-1 ring-brand-500"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <Image
                src={img.url}
                alt={`${title} - pilt ${i + 1}`}
                fill
                className="object-contain p-1"
                sizes="(max-width: 1024px) 25vw, 12vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
