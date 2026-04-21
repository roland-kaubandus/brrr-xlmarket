"use client"

import Link from "@/components/SafeLink"
import { usePathname } from "next/navigation"

interface NavLink {
  label: string
  href: string
  highlight?: boolean
  /**
   * Path prefix used to detect active state. When the current pathname starts
   * with this value, the link is rendered in the accent color.
   */
  matchPrefix: string
}

// Pathname prefixes owned by other "primary" nav surfaces that steal the
// accent color from fallback-highlighted links. Keep this in sync with
// MegaMenu's isCategoriesActive check.
const FOREIGN_ACTIVE_PREFIXES = [/^\/(?:et|en)\/kategooriad(?:\/|$)/]

export default function HeaderNavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname() ?? ""

  const matchedIdx = links.findIndex(
    (l) => l.matchPrefix !== "" && pathname.startsWith(l.matchPrefix),
  )
  const inForeignActive = FOREIGN_ACTIVE_PREFIXES.some((re) => re.test(pathname))

  // Fallback highlight applies only when nothing else in the primary nav
  // (this list + MegaMenu) claims the active slot. This keeps a single
  // accent color on screen at a time.
  const fallbackHighlightIdx = matchedIdx === -1 && !inForeignActive
    ? links.findIndex((l) => l.highlight)
    : -1

  return (
    <nav className="flex items-center gap-0.5">
      {links.map((link, idx) => {
        const active = idx === matchedIdx || idx === fallbackHighlightIdx
        return (
          <Link
            key={link.label}
            href={link.href}
            className={`px-4 py-1.5 text-[0.95rem] font-semibold rounded-md transition-colors whitespace-nowrap ${
              active
                ? "text-[#D97706] hover:text-[#F59E0B] hover:bg-white/10"
                : "text-[#94A3B8] hover:text-white hover:bg-white/10"
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
