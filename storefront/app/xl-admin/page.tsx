import Link from "next/link"

export default function AdminIndex() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">XL Admin</h1>
      <ul className="space-y-3">
        <li>
          <Link href="/xl-admin/taxonomy-health" className="text-[#D97706] hover:underline">
            → Taxonomy Health (19 invariants)
          </Link>
        </li>
        <li>
          <Link href="/xl-admin/categorization-queue" className="text-[#D97706] hover:underline">
            → Categorization Queue (products needing review)
          </Link>
        </li>
      </ul>
      <p className="text-sm text-[#64748B] mt-8">
        Medusa admin: <a href="/app" className="text-[#D97706] hover:underline">/app</a> (store config, orders,
        products)
      </p>
    </div>
  )
}
