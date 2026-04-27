import Link from "next/link"
import { getVisibleL1, getNode, type CategoryNode } from "@/lib/category-tree"
import CategoryThumb from "@/components/CategoryThumb"
import { ChevronRight } from "lucide-react"

export const revalidate = 3600

export const metadata = {
  title: "All Categories — XLMARKET",
  description: "Browse all product categories at XLMarket.",
}

interface TreeNode extends CategoryNode {
  children?: TreeNode[]
}

function nodeName(n: TreeNode, locale: string): string {
  if (locale === "et" && n.name_et) return n.name_et
  return n.name_en || n.handle
}

/** Recursively materialise a CategoryNode into a tree with `children` arrays. */
function buildTree(n: CategoryNode): TreeNode {
  const kids = (n.child_handles || [])
    .map((h) => getNode(h))
    .filter((c): c is CategoryNode => c !== null)
  return {
    ...n,
    children: kids.length > 0 ? kids.map(buildTree) : undefined,
  }
}

function CategoryBranch({
  node,
  locale,
  depth,
  l1Handle,
}: {
  node: TreeNode
  locale: string
  depth: number
  l1Handle: string
}) {
  const hasKids = Array.isArray(node.children) && node.children.length > 0
  const indent = depth * 24
  const href = `/${locale}/kategooriad/${node.handle}`
  if (!hasKids) {
    return (
      <Link
        href={href}
        prefetch={false}
        className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-[#FFF8F3] hover:text-[#B45309] transition-colors text-[15px] text-[#1F2937] group"
        style={{ paddingLeft: 12 + indent }}
      >
        <CategoryThumb
          handle={node.handle}
          alt=""
          size={28}
          image_path={node.image_path}
          l1_handle={l1Handle}
        />
        <span className="flex-1 truncate">{nodeName(node, locale)}</span>
      </Link>
    )
  }
  // Render expand-toggle and "go to category" as separate sibling rows so
  // a Server Component never needs onClick. Toggle = <details>/<summary>;
  // category link = a normal <Link> aligned to the right.
  return (
    <details className="group/branch">
      <summary
        className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-[#F8FAFC] cursor-pointer list-none text-[15px] text-[#1F2937]"
        style={{ paddingLeft: 12 + indent }}
      >
        <ChevronRight className="w-4 h-4 text-[#94A3B8] transition-transform group-open/branch:rotate-90 flex-shrink-0" />
        <CategoryThumb
          handle={node.handle}
          alt=""
          size={28}
          image_path={node.image_path}
          l1_handle={l1Handle}
        />
        <span className="flex-1 truncate font-medium">{nodeName(node, locale)}</span>
        {node.children && (
          <span className="text-[12px] text-[#94A3B8] tabular-nums">{node.children.length}</span>
        )}
        <Link
          href={href}
          prefetch={false}
          className="ml-2 px-2 py-0.5 text-[12px] font-semibold text-[#B45309] hover:text-[#92400E] uppercase tracking-wide"
        >
          {locale === "et" ? "Vaata" : "View"}
        </Link>
      </summary>
      <div className="mt-0.5">
        {node.children!.map((child) => (
          <CategoryBranch
            key={child.handle}
            node={child as TreeNode}
            locale={locale}
            depth={depth + 1}
            l1Handle={l1Handle}
          />
        ))}
      </div>
    </details>
  )
}

export default async function CategoriesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const l1: TreeNode[] = getVisibleL1().map(buildTree)

  const heading = locale === "et" ? "Kõik kategooriad" : "All categories"
  const intro = locale === "et"
    ? `Professionaalsed seadmed ja tööriistad ${l1.length} kategoorias. Klõpsa, et näha alamkategooriaid.`
    : `Professional tools and equipment across ${l1.length} categories. Click to expand subcategories.`

  return (
    <main className="mx-auto max-w-[1280px] px-4 md:px-6 py-8 md:py-12">
      <nav className="text-[14px] text-[#64748B] mb-4" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="hover:text-[#E8920A]">{locale === "et" ? "Avaleht" : "Home"}</Link>
        <span className="mx-2.5 text-[#CBD5E1]">&rsaquo;</span>
        <span className="text-[#1E293B] font-semibold">{heading}</span>
      </nav>

      <header className="mb-8 md:mb-10">
        <h1 className="text-[32px] md:text-[44px] font-bold text-[#1E293B] tracking-tight mb-3 leading-[1.1]">
          {heading}
        </h1>
        <p className="text-[15px] md:text-[16px] text-[#64748B] max-w-[680px]">
          {intro}
        </p>
      </header>

      {/* Two-column layout on desktop, stacked on mobile.
          Each L1 is an expandable tree → unlimited depth via <details>. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-2">
        {l1.map((node) => (
          <section
            key={node.handle}
            className="border-b border-[#F1F5F9] last:border-b-0 py-3"
          >
            <CategoryBranch
              node={node}
              locale={locale}
              depth={0}
              l1Handle={node.handle}
            />
          </section>
        ))}
      </div>
    </main>
  )
}
