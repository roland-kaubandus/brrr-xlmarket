import Link from "next/link"
import { getCategories } from "@/lib/medusa"

export const revalidate = 300

export const metadata = {
  title: "Kategooriad — XLMARKET",
}

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Kategooriad</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/kategooriad/${cat.handle}`}
            className="border border-gray-200 bg-white p-8 text-center hover:border-amber-500 hover:shadow-md transition"
          >
            <span className="text-lg font-medium">{cat.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
