import Link from "next/link"
import { notFound } from "next/navigation"
import { getProducts, getCategories, getCategoryByHandle, type Product } from "@/lib/medusa"
import { searchProducts } from "@/lib/meilisearch"
import ProductCard from "@/components/ProductCard"

export const revalidate = 300

/* Branch definitions */

type BranchDef = {
  name: string
  slug: string
  categoryHandle: string | null
  tagline: string
  description: string
  heroImg: string
  heroGradient: string
}

const BRANCHES: BranchDef[] = [
  {
    name: "Suurköögiseadmed",
    slug: "suurkoogiseadmed",
    categoryHandle: "toitlustus-ja-kook",
    tagline: "Professionaalne köök algab õigest varustusest",
    description: "Roostevaba terasest tööpinnad, kuumseadmed, külmikud ja kõik muu, mida professionaalne köök vajab. VEVOR kvaliteet, XL Market hinnaga.",
    heroImg: "/images/branches/suurkoogiseadmed.png",
    heroGradient: "from-amber-950/80 via-amber-900/40 to-transparent",
  },
  {
    name: "Merevarustus",
    slug: "merevarustus",
    categoryHandle: null,
    tagline: "Varustus, mis peab vastu merele",
    description: "Kaatritarvikud, paadimootori osad, navigatsioon, päästevarustus ja dekiseadmed. Kõik, mida meremees vajab.",
    heroImg: "/images/branches/merevarustus.png",
    heroGradient: "from-blue-950/80 via-blue-900/40 to-transparent",
  },
  {
    name: "Ehitus ja remont",
    slug: "ehitus-ja-remont",
    categoryHandle: "ehitus-ja-remont",
    tagline: "Ehita nagu profi",
    description: "Lõikurid, tõstukid, tellingud, mõõteriistad ja ehituskeemia. Kõik tööriistad ja seadmed ehitusplatsile.",
    heroImg: "/images/branches/ehitus.png",
    heroGradient: "from-stone-950/80 via-stone-900/40 to-transparent",
  },
  {
    name: "Garaaz ja auto",
    slug: "garaaz-ja-auto",
    categoryHandle: "auto-ja-garaaz",
    tagline: "Sinu garaaz, sinu reeglid",
    description: "Tungrauad, kompressorid, diagnostikaseadmed, tõstukid ja autohoolduse tööriistad. Kõik profi tasemel.",
    heroImg: "/images/branches/garaaz.png",
    heroGradient: "from-zinc-950/80 via-zinc-900/40 to-transparent",
  },
  {
    name: "Aed ja maastik",
    slug: "aed-ja-maastik",
    categoryHandle: "aed-ja-oueala",
    tagline: "Professionaalne haljastus ja aiandus",
    description: "Niidukid, trimmerd, pumpad, kasvuhooned ja maastikuhoolduse seadmed. Sinu aed väärib parimat.",
    heroImg: "/images/branches/aed.png",
    heroGradient: "from-emerald-950/80 via-emerald-900/40 to-transparent",
  },
  {
    name: "Tööstus",
    slug: "toostus",
    categoryHandle: "toostus-ja-seadmed",
    tagline: "Tööstuslik võimekus, mõistlik hind",
    description: "Töökojaseadmed, keevitusmasinad, metalli- ja puidutöötlus, tööstuslikud tööriistad ja varuosad.",
    heroImg: "/images/branches/toostus.png",
    heroGradient: "from-slate-950/80 via-slate-900/40 to-transparent",
  },
  {
    name: "Spordiklubi",
    slug: "spordiklubi",
    categoryHandle: "sport-ja-vaba-aeg",
    tagline: "Varusta oma spordiklubi",
    description: "Jõusaali seadmed, treeningtarvikud, spordivarustus ja vabaaja seadmed. Kommertskvaliteet, mõistlik hind.",
    heroImg: "/images/branches/spordiklubi.png",
    heroGradient: "from-red-950/80 via-red-900/40 to-transparent",
  },
  {
    name: "Tervis",
    slug: "tervis",
    categoryHandle: "meditsiin-ja-tervishoid",
    tagline: "Professionaalne meditsiinivarustus",
    description: "Meditsiiniline mööbel, diagnostikaseadmed, taastusravi ja tervishoiu tarvikud.",
    heroImg: "/images/branches/tervis.png",
    heroGradient: "from-teal-950/80 via-teal-900/40 to-transparent",
  },
  {
    name: "Kontor",
    slug: "kontor",
    categoryHandle: "kontor-ja-ladustamine",
    tagline: "Kontor ja ladu, targalt sisustatud",
    description: "Kontori- ja laomööbel, riiulisüsteemid, organiseerimistarvikud ja ladustamisseadmed.",
    heroImg: "/images/branches/kontor.png",
    heroGradient: "from-gray-950/80 via-gray-900/40 to-transparent",
  },
  {
    name: "Puhastus",
    slug: "puhastus",
    categoryHandle: null,
    tagline: "Puhtus on professionaalsuse alus",
    description: "Professionaalsed pesurid, puhastusmasinad, tolmuimejad ja hooldusvahendid. Tööstuslik puhtus.",
    heroImg: "/images/branches/puhastus.png",
    heroGradient: "from-cyan-950/80 via-cyan-900/40 to-transparent",
  },
  {
    name: "Käsitöö",
    slug: "kasitoo",
    categoryHandle: "kunst-ja-kasitoo",
    tagline: "Loovus kohtub meisterlikkusega",
    description: "Kangasteljed, õmblusmasinad, kunstitarvikud ja käsitööriistad. Professionaalsed töövahendid igale loojale.",
    heroImg: "/images/branches/kasitoo.png",
    heroGradient: "from-purple-950/80 via-purple-900/40 to-transparent",
  },
  {
    name: "Toitlustus",
    slug: "toitlustus",
    categoryHandle: "toitlustus-ja-kook",
    tagline: "Catering ja toitlustus professionaalile",
    description: "Cateringitehnika, serveerimisvahendid, soojendusletid ja kõik vajalik toitlustusäri jaoks.",
    heroImg: "/images/branches/toitlustus.png",
    heroGradient: "from-orange-950/80 via-orange-900/40 to-transparent",
  },
]

type Props = {
  params: Promise<{ handle: string; locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { handle, locale } = await params
  const branch = BRANCHES.find((b) => b.slug === handle)
  if (!branch) return { title: "Haru — XL Market" }
  return {
    title: `${branch.name} — XL Market`,
    description: branch.description,
    openGraph: {
      title: `${branch.name} — XL Market`,
      description: branch.description,
      type: "website",
      images: [{ url: branch.heroImg, width: 1600, height: 900, alt: branch.name }],
    },
  }
}

export function generateStaticParams() {
  return BRANCHES.map((b) => ({ handle: b.slug }))
}

export default async function BranchLandingPage({ params }: Props) {
  const { handle, locale } = await params
  const branch = BRANCHES.find((b) => b.slug === handle)
  if (!branch) notFound()

  const allCategories = await getCategories()

  const parentCategory = branch.categoryHandle
    ? allCategories.find((c) => c.handle === branch.categoryHandle) ?? null
    : null

  const subcategories = parentCategory
    ? allCategories.filter((c) => c.parent_category_id === parentCategory.id)
    : []

  let products: any[] = []
  let totalCount = 0

  if (branch.categoryHandle) {
    try {
      const meiliResult = await searchProducts({
        q: "",
        limit: 8,
        offset: 0,
        filter: [`category_handles = "${branch.categoryHandle}"`],
        sort: ["created_at:desc"],
      })
      totalCount = meiliResult.totalHits || meiliResult.estimatedTotalHits || 0
      products = meiliResult.hits.map((hit) => ({
        id: hit.id,
        title: hit.title,
        handle: hit.handle,
        description: hit.description,
        thumbnail: hit.thumbnail,
        images: [],
        variants: [
          {
            id: hit.id + "_v",
            title: "Default",
            calculated_price: {
              calculated_amount: Math.round(hit.price * 100),
              original_amount: Math.round(hit.price * 100),
              currency_code: "eur",
            },
          },
        ],
        categories: hit.categories.map((name: string, i: number) => ({
          id: `cat_${i}`,
          name,
          handle: hit.category_handles?.[i] || "",
          parent_category_id: null,
        })),
        created_at: new Date(hit.created_at * 1000).toISOString(),
      }))
    } catch {
      if (parentCategory) {
        const res = await getProducts({ category_id: [parentCategory.id], limit: 8, order: "-created_at" })
        products = res.products
        totalCount = res.count
      }
    }
  }

  // Fetch products grouped by subcategory
  type SubcategoryGroup = { category: { id: string; name: string; handle: string }; products: any[]; count: number }
  const subcategoryProducts: SubcategoryGroup[] = []

  if (subcategories.length > 0) {
    const subFetches = subcategories.slice(0, 8).map(async (sub) => {
      try {
        const meiliResult = await searchProducts({
          q: "",
          limit: 4,
          offset: 0,
          filter: [`category_handles = "${sub.handle}"`],
          sort: ["created_at:desc"],
        })
        const subProducts = meiliResult.hits.map((hit: any) => ({
          id: hit.id,
          title: hit.title,
          handle: hit.handle,
          description: hit.description,
          thumbnail: hit.thumbnail,
          images: [],
          variants: [{
            id: hit.id + "_v",
            title: "Default",
            calculated_price: {
              calculated_amount: Math.round(hit.price * 100),
              original_amount: Math.round(hit.price * 100),
              currency_code: "eur",
            },
          }],
          categories: hit.categories.map((name: string, i: number) => ({
            id: `cat_${i}`, name, handle: hit.category_handles?.[i] || "", parent_category_id: null,
          })),
          created_at: new Date(hit.created_at * 1000).toISOString(),
        }))
        if (subProducts.length > 0) {
          return { category: sub, products: subProducts, count: meiliResult.totalHits || meiliResult.estimatedTotalHits || 0 }
        }
        return null
      } catch { return null }
    })
    const results = await Promise.all(subFetches)
    for (const r of results) { if (r) subcategoryProducts.push(r) }
    subcategoryProducts.sort((a, b) => b.count - a.count)
  }

  const otherBranches = BRANCHES.filter((b) => b.slug !== handle).slice(0, 5)

  return (
    <>
      {/* HERO */}
      <section className="relative h-[420px] md:h-[520px] overflow-hidden">
        <img
          src={branch.heroImg}
          alt={branch.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${branch.heroGradient}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 h-full flex flex-col justify-end pb-12 md:pb-16">
          <nav className="text-[12px] text-white/50 mb-6" aria-label="Leheasukoht">
            <Link href={`/${locale}`} className="hover:text-white transition-colors">Avaleht</Link>
            <span className="mx-2">/</span>
            <span className="text-white/80">{branch.name}</span>
          </nav>

          <span className="inline-block text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-3">Valdkond</span>
          <h1 className="font-[family-name:var(--font-outfit)] font-[800] text-4xl md:text-6xl text-white tracking-tighter leading-[1.05] mb-4">
            {branch.name}
          </h1>
          <p className="font-[family-name:var(--font-outfit)] font-[300] text-xl md:text-2xl text-white/70 tracking-tight mb-2 max-w-2xl">
            {branch.tagline}
          </p>
          <p className="text-white/50 text-sm md:text-base max-w-xl leading-relaxed">
            {branch.description}
          </p>

          {branch.categoryHandle && totalCount > 0 && (
            <div className="mt-6 flex items-center gap-4">
              <Link
                href={`/${locale}/kategooriad/${branch.categoryHandle}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-xl btn-press transition-all duration-300"
              >
                {"Vaata k\u00f5iki tooteid"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <span className="text-white/40 text-sm">{totalCount.toLocaleString("et-EE")} toodet</span>
            </div>
          )}
        </div>
      </section>

      {/* TRUST BADGES */}
      {branch.categoryHandle && (
        <div className="bg-white border-b border-soft-border">
          <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {[
              { icon: "\u2713", text: "Professionaalne kvaliteet" },
              { icon: "\u26A1", text: "Kiire tarne" },
              { icon: "\u2699", text: "Varuosad saadaval" },
              { icon: "\u260E", text: "Eksperdi n\u00f5uanne" },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-2 text-sm text-muted">
                <span className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center text-accent text-xs">{badge.icon}</span>
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY CARDS */}
      {subcategories.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-4">
            <h2 className="font-[family-name:var(--font-outfit)] font-[700] text-2xl md:text-3xl tracking-tight mb-8">Kategooriad</h2>
            <div className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar">
              {subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/${locale}/kategooriad/${sub.handle}`}
                  className="shrink-0 group flex flex-col items-center justify-center w-[140px] md:w-[160px] py-6 bg-silver rounded-2xl hover:bg-accent-light border border-transparent hover:border-accent/10 card-lift transition-all duration-300 text-center"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)] group-hover:shadow-[0_4px_16px_rgba(249,115,22,0.12)] transition-shadow duration-300">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted group-hover:text-accent transition-colors">
                      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-off-black group-hover:text-accent transition-colors duration-300 px-2 line-clamp-2">
                    {sub.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRODUCTS BY CATEGORY */}
      {subcategoryProducts.length > 0 ? (
        <>
          {subcategoryProducts.map((catGroup, idx) => (
            <section key={catGroup.category.id} className={`py-16 md:py-24 ${idx % 2 === 0 ? "bg-white" : "bg-off-white"}`}>
              <div className="max-w-[1400px] mx-auto px-4">
                <div className="flex items-end justify-between mb-10">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] font-[700] text-2xl md:text-3xl tracking-tight">
                      {catGroup.category.name}
                    </h2>
                    <p className="text-muted text-sm mt-1">{catGroup.count} toodet</p>
                  </div>
                  <Link
                    href={`/${locale}/kategooriad/${catGroup.category.handle}`}
                    className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-dark transition-colors"
                  >
                    {"Vaata k\u00f5iki"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {catGroup.products.map((product: any) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </>
      ) : products.length > 0 ? (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="mb-10">
              <h2 className="font-[family-name:var(--font-outfit)] font-[700] text-2xl md:text-3xl tracking-tight">Tooted</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-silver rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h2 className="font-[family-name:var(--font-outfit)] font-[600] text-xl mb-3">Varsti saadaval</h2>
              <p className="text-muted text-sm leading-relaxed mb-6">Sortiment on tulekul. Teavitame, kui tooted on saadaval.</p>
              <Link href={`/${locale}/kategooriad`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-silver hover:bg-accent-light text-sm font-medium rounded-xl transition-all duration-300">
                Vaata kategooriaid
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* EXPLORE OTHER BRANCHES */}
      <section className="py-16 md:py-24 bg-silver">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="mb-10">
            <span className="inline-block text-[11px] uppercase tracking-[0.2em] font-semibold text-accent mb-3">Avasta veel</span>
            <h2 className="font-[family-name:var(--font-outfit)] font-[700] text-2xl md:text-3xl tracking-tight">
              Teised valdkonnad
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {otherBranches.map((b) => (
              <Link
                key={b.slug}
                href={`/${locale}/haru/${b.slug}`}
                className="group relative rounded-2xl overflow-hidden min-h-[180px]"
              >
                <img
                  src={b.heroImg}
                  alt={b.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 branch-card-overlay" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-[family-name:var(--font-outfit)] font-bold text-base text-white tracking-tight mb-0.5">
                    {b.name}
                  </h3>
                  <p className="text-white/50 text-xs">{b.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
