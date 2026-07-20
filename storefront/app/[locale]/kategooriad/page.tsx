import "server-only"
import Link from "next/link"
import { getVisibleL1, getNode, nodeName, type CategoryNode } from "@/lib/category-tree"
import CategoryThumb from "@/components/CategoryThumb"
import CategoryImageEditor from "@/components/admin/CategoryImageEditor"
import countsDoc from "@/lib/category-counts.generated.json"

export const revalidate = 3600

export const metadata = {
  title: "All Categories — XLMARKET",
  description: "Browse all product categories at XLMarket — Level 1, Level 2, Level 3 and beyond.",
}

const COUNTS: Record<string, number> = (countsDoc as { counts: Record<string, number> }).counts || {}
const countOf = (h: string): number => COUNTS[h] ?? 0

/** Walk the visible-L1 subtree, collect every node with `level === target`. */
function collectByLevel(target: number, l1Nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = []
  const queue: CategoryNode[] = [...l1Nodes]
  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.level === target) out.push(cur)
    if (cur.level < target) {
      for (const childHandle of cur.child_handles || []) {
        const child = getNode(childHandle)
        if (child) queue.push(child)
      }
    }
  }
  out.sort((a, b) => countOf(b.handle) - countOf(a.handle))
  return out
}

/** Find the L1 ancestor of any node — for CategoryThumb icon fallback. */
function findL1Handle(node: CategoryNode): string {
  let cur: CategoryNode | null = node
  while (cur && cur.level > 1 && cur.parent_handle) {
    const parent = getNode(cur.parent_handle)
    if (!parent) break
    cur = parent
  }
  return cur?.handle ?? node.handle
}

interface CategoryCardProps {
  node: CategoryNode
  locale: string
}

function CategoryCard({ node, locale }: CategoryCardProps) {
  const count = countOf(node.handle)
  const name = nodeName(node, locale)
  const l1Handle = findL1Handle(node)
  return (
    <div className="relative group">
      <Link
        href={`/${locale}/kategooriad/${node.handle}`}
        prefetch={false}
        className="flex flex-col items-center justify-start text-center p-3 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#0ea5a0] hover:shadow-sm transition-all"
      >
        <div className="w-full aspect-square rounded-lg overflow-hidden mb-2.5 bg-[#F8FAFC] flex items-center justify-center">
          <CategoryThumb
            handle={node.handle}
            alt={name}
            size={140}
            image_path={node.image_path}
            l1_handle={l1Handle}
          />
        </div>
        <span className="text-[13px] font-semibold text-[#1a1a2e] line-clamp-2 leading-snug min-h-[34px] group-hover:text-[#0b7d79]">
          {name}
        </span>
        {count > 0 ? (
          <span className="mt-1 text-[11px] text-[#94A3B8] tabular-nums">
            {count} {locale === "et" ? "toodet" : "products"}
          </span>
        ) : null}
      </Link>
      {/* Admin-only editor — gate'itud kliendipoolselt (useAdmin → null kui
          mitte-admin). NB: leht on praegu dünaamiline mitte page-level cookie'st,
          vaid root layout'i readAdminSession()-ist (app/layout.tsx) — vt
          PUNCH-LIST "kategooria-lehed 9-19s render". */}
      <div className="absolute top-2 right-2">
        <CategoryImageEditor handle={node.handle} displayName={name} />
      </div>
    </div>
  )
}

interface LevelSectionProps {
  level: number
  nodes: CategoryNode[]
  locale: string
}

function LevelSection({ level, nodes, locale }: LevelSectionProps) {
  if (nodes.length === 0) return null
  const heading = locale === "et"
    ? `Tase ${level} — ${nodes.length} kategooriat`
    : `Level ${level} — ${nodes.length} categories`
  return (
    <section className="mb-12 md:mb-16" aria-labelledby={`level-${level}-heading`}>
      <header className="mb-5 md:mb-6 pb-3 border-b border-[#E2E8F0]">
        <h2
          id={`level-${level}-heading`}
          className="text-[13px] font-bold text-[#64748B] uppercase tracking-[0.12em]"
        >
          {heading}
        </h2>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {nodes.map((n) => (
          <CategoryCard key={n.handle} node={n} locale={locale} />
        ))}
      </div>
    </section>
  )
}

export default async function CategoriesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const l1Nodes = getVisibleL1()

  // PERF (2026-06-04 SSR-payload fix): show only L1+L2 here. Rendering all
  // levels (L1–L5 = 3420 kaarti) blew the RSC payload to ~7.8 MB / TTFB 60s+.
  // Deeper levels (L3+) stay reachable via the category detail page carousel,
  // the mega-menu drill and search — they don't need to be on this index.
  const MAX_LEVEL = 2
  const levels: Array<{ level: number; nodes: CategoryNode[] }> = []
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const nodes = collectByLevel(level, l1Nodes)
    if (nodes.length > 0) levels.push({ level, nodes })
  }

  const totalNodes = levels.reduce((sum, l) => sum + l.nodes.length, 0)

  const heading = locale === "et" ? "Kõik kategooriad" : "All categories"
  const intro = locale === "et"
    ? `Sirvi peamisi kategooriaid — klõpsa avamiseks ja vaata alamkategooriaid.`
    : `Browse our main categories — click any to drill into subcategories.`

  return (
    <main className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 md:py-12">
      <nav className="text-[14px] text-[#64748B] mb-4" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="hover:text-[#0ea5a0]">{locale === "et" ? "Avaleht" : "Home"}</Link>
        <span className="mx-2.5 text-[#CBD5E1]">&rsaquo;</span>
        <span className="text-[#1a1a2e] font-semibold">{heading}</span>
      </nav>

      <header className="mb-10 md:mb-14 max-w-[760px]">
        <h1 className="text-[36px] md:text-[52px] font-bold text-[#1a1a2e] tracking-tight mb-3 leading-[1.05]">
          {heading}
        </h1>
        <p className="text-[15px] md:text-[17px] text-[#64748B]">
          {intro}
        </p>
      </header>

      {levels.map(({ level, nodes }) => (
        <LevelSection key={level} level={level} nodes={nodes} locale={locale} />
      ))}
    </main>
  )
}
