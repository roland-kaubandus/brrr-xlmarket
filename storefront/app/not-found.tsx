import Link from "next/link"

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Lehte ei leitud</p>
      <Link
        href="/"
        className="inline-block bg-amber-500 text-white px-6 py-3 font-medium hover:bg-amber-600 transition"
      >
        Tagasi avalehele
      </Link>
    </div>
  )
}
