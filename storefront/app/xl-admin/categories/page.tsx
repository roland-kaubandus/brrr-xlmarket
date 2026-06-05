import "server-only"
import treeData from "@/lib/category-tree.generated.json"
import countsDoc from "@/lib/category-counts.generated.json"
import CategoriesTable, { type CatRow } from "./CategoriesTable"

export const metadata = { title: "Kategooriad — XL Admin", robots: { index: false, follow: false } }
export const revalidate = 3600

interface RawNode {
  handle: string
  level: number
  parent_handle?: string | null
  name_en?: string
  name_et?: string
  child_handles?: string[]
}

const COUNTS: Record<string, number> = (countsDoc as { counts: Record<string, number> }).counts || {}

export default function AdminCategoriesPage() {
  const tree = treeData as { nodes: Record<string, RawNode> | RawNode[] }
  let nodes = tree.nodes as RawNode[] | Record<string, RawNode>
  const list: RawNode[] = Array.isArray(nodes) ? nodes : Object.values(nodes)

  const rows: CatRow[] = list
    .filter((n) => typeof n.level !== "undefined")
    .map((n) => ({
      handle: n.handle,
      level: n.level,
      parent: n.parent_handle || "",
      name: n.name_et || n.name_en || n.handle,
      isLeaf: !(n.child_handles && n.child_handles.length),
      count: COUNTS[n.handle] || 0,
    }))
    .sort((a, b) => b.count - a.count)

  const total = rows.length
  const empty = rows.filter((r) => r.count === 0).length
  const thin = rows.filter((r) => r.count >= 1 && r.count <= 2).length

  return (
    <main className="mx-auto max-w-[1200px] px-4 md:px-8 py-8">
      <h1 className="text-2xl font-bold text-[#1E293B] mb-1">Kategooriad — ülevaade</h1>
      <p className="text-sm text-[#64748B] mb-5">
        Kokku <b>{total}</b> kategooriat · tühje (0 toodet) <b>{empty}</b> · õhukesi (1–2) <b>{thin}</b>.
        Bulk-haldus: <code className="bg-[#F1F5F9] px-1 rounded">scripts/category-export.mjs</code> +{" "}
        <code className="bg-[#F1F5F9] px-1 rounded">category-assign.mjs</code>.
      </p>
      <CategoriesTable rows={rows} />
    </main>
  )
}
