export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          XLMARKET
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Suur valik, väike hind
        </p>
        <a
          href="/categories"
          className="inline-block bg-amber-500 text-white px-8 py-3 text-lg font-medium hover:bg-amber-600 transition"
        >
          Vaata tooteid
        </a>
      </section>

      {/* Categories placeholder */}
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-8">Kategooriad</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            "Ehitus ja remont",
            "Tööstus ja seadmed",
            "Kodu ja aed",
            "Auto ja garaaž",
            "Sport ja vaba aeg",
            "Kunst ja käsitöö",
            "Toitlustus ja köök",
            "Elektroonika",
          ].map((cat) => (
            <a
              key={cat}
              href={`/categories/${encodeURIComponent(cat.toLowerCase())}`}
              className="border border-gray-200 p-6 text-center hover:border-amber-500 hover:shadow-sm transition"
            >
              <span className="font-medium">{cat}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
