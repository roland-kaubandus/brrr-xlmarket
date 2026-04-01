import Link from "next/link"

const BRANCHES = [
  { name: "Suurköögiseadmed", nameEn: "Commercial Kitchen", slug: "suurkoogiseadmed", tagline: "Professionaalne köök algab õigest varustusest", taglineEn: "The professional kitchen starts with the right equipment" },
  { name: "Merevarustus", nameEn: "Marine", slug: "merevarustus", tagline: "Varustus, mis peab vastu merele", taglineEn: "Equipment that withstands the sea" },
  { name: "Ehitus ja remont", nameEn: "Construction", slug: "ehitus-ja-remont", tagline: "Ehita nagu profi", taglineEn: "Build like a pro" },
  { name: "Garaaz ja auto", nameEn: "Garage & Auto", slug: "garaaz-ja-auto", tagline: "Sinu garaaz, sinu reeglid", taglineEn: "Your garage, your rules" },
  { name: "Aed ja maastik", nameEn: "Garden", slug: "aed-ja-maastik", tagline: "Professionaalne haljastus ja aiandus", taglineEn: "Professional landscaping and gardening" },
  { name: "Tööstus", nameEn: "Industry", slug: "toostus", tagline: "Tööstuslik võimekus, mõistlik hind", taglineEn: "Industrial capability, sensible price" },
  { name: "Spordiklubi", nameEn: "Sports Club", slug: "spordiklubi", tagline: "Varusta oma spordiklubi", taglineEn: "Equip your sports club" },
  { name: "Tervis", nameEn: "Health", slug: "tervis", tagline: "Professionaalne meditsiinivarustus", taglineEn: "Professional medical equipment" },
  { name: "Kontor", nameEn: "Office", slug: "kontor", tagline: "Kontor ja ladu, targalt sisustatud", taglineEn: "Office and warehouse, smartly furnished" },
  { name: "Puhastus", nameEn: "Cleaning", slug: "puhastus", tagline: "Puhtus on professionaalsuse alus", taglineEn: "Cleanliness is the foundation of professionalism" },
  { name: "Käsitöö", nameEn: "Crafts", slug: "kasitoo", tagline: "Loovus kohtub meisterlikkusega", taglineEn: "Creativity meets craftsmanship" },
  { name: "Toitlustus", nameEn: "Catering", slug: "toitlustus", tagline: "Catering ja toitlustus professionaalile", taglineEn: "Catering for the professional" },
]

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const isEn = locale === "en"

  return (
    <div className="min-h-screen bg-off-white">
      <div className="max-w-[1400px] mx-auto px-4 py-12 md:py-20">
        <nav className="text-xs text-muted mb-8">
          <Link href={`/${locale}`} className="hover:text-accent transition-colors">
            {isEn ? "Home" : "Avaleht"}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-off-black">{isEn ? "All fields" : "Kõik valdkonnad"}</span>
        </nav>

        <h1 className="font-[family-name:var(--font-outfit)] font-[800] text-4xl md:text-5xl tracking-tight mb-3">
          {isEn ? "All fields" : "Kõik valdkonnad"}
        </h1>
        <p className="text-muted text-lg mb-12">
          {isEn ? "12 fields · over 10,000 products" : "12 valdkonda · üle 10 000 toote"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BRANCHES.map((branch) => (
            <Link
              key={branch.slug}
              href={`/${locale}/haru/${branch.slug}`}
              className="group relative overflow-hidden rounded-2xl h-[220px] card-lift transition-all duration-300"
            >
              <img
                src={`/images/branches/${branch.slug}.png`}
                alt={isEn ? branch.nameEn : branch.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="font-[family-name:var(--font-outfit)] font-[700] text-xl text-white mb-1">
                  {isEn ? branch.nameEn : branch.name}
                </h2>
                <p className="text-white/60 text-sm">
                  {isEn ? branch.taglineEn : branch.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
