import Image from "next/image"
import Link from "next/link"
import { Product, formatPrice } from "@/lib/medusa"

export default function ProductCard({ product }: { product: Product }) {
  const price = product.variants?.[0]?.calculated_price
  return (
    <Link
      href={`/toode/${product.handle}`}
      className="group border border-gray-200 bg-white hover:border-amber-500 hover:shadow-md transition overflow-hidden"
    >
      <div className="relative aspect-square bg-gray-50">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300 text-sm">
            Pilt puudub
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">
          {product.title}
        </h3>
        {price && (
          <p className="mt-2 text-lg font-bold text-amber-600">
            {formatPrice(price.calculated_amount, price.currency_code)}
          </p>
        )}
      </div>
    </Link>
  )
}
