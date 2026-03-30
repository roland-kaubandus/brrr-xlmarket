import type { Metadata } from "next"
import Link from "next/link"
import { getCategories } from "@/lib/medusa"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Kategooriad — XLMARKET",
  description:
    "Sirvi XLMARKET tootekategooriaid: tööriistad, kodu ja aed, sport, auto ja palju muud.",
  openGraph: {
    title: "Kategooriad — XLMARKET",
    description:
      "Sirvi XLMARKET tootekategooriaid: tööriistad, kodu ja aed, sport, auto ja palju muud.",
  },
}

const categoryColorMap: Record<string, { from: string; to: string; label: string }> = {
  "ehitus-ja-remont":        { from: "#C95208", to: "#E8650A", label: "Ehitus ja remont" },
  "toostus-ja-seadmed":      { from: "#1A3A5C", to: "#2D6A9F", label: "Tööstus ja seadmed" },
  "kodu-ja-aed":             { from: "#2E7D32", to: "#52B35A", label: "Kodu ja aed" },
  "auto-ja-garaaz":          { from: "#37474F", to: "#607D8B", label: "Auto ja garaaž" },
  "sport-ja-vaba-aeg":       { from: "#AD1457", to: "#E91E63", label: "Sport ja vaba aeg" },
  "kunst-ja-kasitoo":        { from: "#6A1B9A", to: "#AB47BC", label: "Kunst ja käsitöö" },
  "toitlustus-ja-kook":      { from: "#BF360C", to: "#FF5722", label: "Toitlustus ja köök" },
  "elektroonika":             { from: "#0D47A1", to: "#1976D2", label: "Elektroonika" },
  "lemmikloomad":             { from: "#558B2F", to: "#8BC34A", label: "Lemmikloomad" },
  "kontor-ja-ladustamine":    { from: "#4E342E", to: "#795548", label: "Kontor ja ladustamine" },
  "meditsiin-ja-tervishoid":  { from: "#00695C", to: "#26A69A", label: "Meditsiin ja tervishoid" },
}

const defaultColor = { from: "#555555", to: "#888888" }

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[32px] sm:py-[48px]">
      {/* Breadcrumb */}
      <nav
        className="text-[12px] font-[family-name:var(--font-inter)] text-[#999999] mb-[32px]"
        aria-label="Leheasukoht"
      >
        <Link href="/" className="hover:text-[#E8650A] transition-colors">
          Avaleht
        </Link>
        <span className="mx-[8px] text-[#E8E8E8]">/</span>
        <span className="text-[#777777]">Kategooriad</span>
      </nav>

      <h1 className="text-[28px] sm:text-[32px] font-[700] font-[family-name:var(--font-poppins)] text-[#1A1A1A] mb-[8px]">
        Kõik kategooriad
      </h1>
      <p className="text-[14px] text-[#999999] font-[family-name:var(--font-inter)] mb-[32px]">
        {categories.length} kategooriat · üle 10 000 toote
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[16px] sm:gap-[20px]">
        {categories.map((cat) => {
          const colors = categoryColorMap[cat.handle] ?? defaultColor
          return (
            <Link
              key={cat.id}
              href={`/kategooriad/${cat.handle}`}
              className="group relative overflow-hidden rounded-[16px] aspect-[4/3] flex flex-col justify-end p-[20px] sm:p-[24px]"
              style={{
                background: `linear-gradient(145deg, ${colors.from} 0%, ${colors.to} 100%)`,
              }}
            >
              {/* Shine overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)",
                }}
              />
              {/* Dot pattern */}
              <div
                className="absolute top-[12px] right-[12px] w-[40px] h-[40px] rounded-full opacity-20"
                style={{ background: "rgba(255,255,255,0.4)" }}
              />
              <div
                className="absolute top-[28px] right-[28px] w-[16px] h-[16px] rounded-full opacity-15"
                style={{ background: "rgba(255,255,255,0.6)" }}
              />
              <p className="relative text-white font-[600] font-[family-name:var(--font-poppins)] text-[15px] sm:text-[16px] leading-snug group-hover:translate-x-[2px] transition-transform duration-200">
                {cat.name}
              </p>
              <p className="relative text-white/60 text-[11px] font-[family-name:var(--font-inter)] mt-[4px] group-hover:text-white/80 transition-colors">
                Sirvi tooteid →
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
