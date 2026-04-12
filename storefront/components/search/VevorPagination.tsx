import Link from "next/link"

type Props = {
  currentPage: number
  totalPages: number
  buildUrl: (page: number) => string
  locale?: string
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "...")[] = []

  // Always show first 2
  pages.push(1)
  if (total > 1) pages.push(2)

  const rangeStart = Math.max(3, current - 1)
  const rangeEnd = Math.min(total - 2, current + 1)

  if (rangeStart > 3) pages.push("...")
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)
  if (rangeEnd < total - 2) pages.push("...")

  // Always show last 2
  if (total - 1 > 2) pages.push(total - 1)
  pages.push(total)

  return pages
}

export default function VevorPagination({ currentPage, totalPages, buildUrl, locale = "et" }: Props) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(currentPage, totalPages)

  const linkBase = "inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors"
  const linkActive = "bg-[#D97706] text-white"
  const linkInactive = "border border-[#E2E8F0] text-[#1E293B] hover:border-[#D97706] hover:text-[#D97706]"

  return (
    <nav className="flex justify-center items-center gap-2 mt-10" aria-label="Pagination">
      {/* Previous */}
      {currentPage > 1 ? (
        <Link href={buildUrl(currentPage - 1)} className={`${linkBase} ${linkInactive}`} aria-label={locale === "en" ? "Previous page" : "Eelmine leht"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
      ) : (
        <span className={`${linkBase} border border-[#E2E8F0] text-[#CCC] cursor-not-allowed`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </span>
      )}

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-1 text-[#64748B] text-sm select-none">...</span>
        ) : (
          <Link
            key={p}
            href={buildUrl(p)}
            className={`${linkBase} ${p === currentPage ? linkActive : linkInactive}`}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link href={buildUrl(currentPage + 1)} className={`${linkBase} ${linkInactive}`} aria-label={locale === "en" ? "Next page" : "Järgmine leht"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
        </Link>
      ) : (
        <span className={`${linkBase} border border-[#E2E8F0] text-[#CCC] cursor-not-allowed`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
        </span>
      )}
    </nav>
  )
}
