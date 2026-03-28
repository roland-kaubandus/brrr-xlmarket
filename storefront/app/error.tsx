"use client"

import Link from "next/link"

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">Viga</h1>
      <p className="text-xl text-gray-600 mb-8">
        Midagi läks valesti. Palun proovi uuesti.
      </p>
      <div className="flex justify-center gap-4">
        <button
          onClick={reset}
          className="bg-brand-500 text-white px-6 py-3 font-medium hover:bg-brand-600 transition"
        >
          Proovi uuesti
        </button>
        <Link
          href="/"
          className="border border-gray-300 px-6 py-3 font-medium hover:border-brand-500 transition"
        >
          Avalehele
        </Link>
      </div>
    </div>
  )
}
