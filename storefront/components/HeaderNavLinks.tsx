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

export default function HeaderNavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname() ?? ""

  // Ainult TEGELIK aktiivne leht (praegusel URL-il) saab teal-aktsendi.
  // Tavaseisund = valge (selgesti nähtav navy-taustal, ~17:1). Hover = teal.
  const matchedIdx = links.findIndex(
    (l) => l.matchPrefix !== "" && pathname.startsWith(l.matchPrefix),
  )

  return (
    <nav className="flex items-center gap-0.5">
      {links.map((link, idx) => {
        const active = idx === matchedIdx
        return (
          <Link
            key={link.label}
            href={link.href}
            className={`px-4 py-1.5 text-[0.95rem] font-semibold rounded-md transition-colors whitespace-nowrap ${
              active
                ? "text-[#0ea5a0] bg-white/[0.08] shadow-[inset_0_-2px_0_0_#0ea5a0]"
                : "text-white hover:text-[#0ea5a0] hover:bg-white/[0.08]"
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
