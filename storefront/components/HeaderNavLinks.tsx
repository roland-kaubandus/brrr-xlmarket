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

  return (
    <nav className="flex items-center gap-0.5">
      {links.map((link) => {
        const isActive = link.matchPrefix !== "" && pathname.startsWith(link.matchPrefix)
        const active = isActive || link.highlight
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
