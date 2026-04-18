/**
 * Admin layout — simple internal dashboard shell.
 *
 * SECURITY: this layout does NOT enforce auth. In production, admin routes
 * must be gated by basic auth / SSO via nginx or a proper auth middleware.
 * For now, they sit behind obscurity (no public link) — spec §F5.6–F5.7
 * expects these to be reachable by Tarmo/Risto only from known networks.
 *
 * TODO(faas-5b-followup): add basic-auth via ADMIN_BASIC_AUTH env var.
 */

import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Admin — XLMARKET",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1E293B] text-white px-6 py-4 flex items-center gap-6">
        <span className="font-bold text-lg">XL Admin</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/xl-admin/taxonomy-health" className="hover:text-[#FDE68A]">
            Taxonomy Health
          </Link>
          <Link href="/xl-admin/categorization-queue" className="hover:text-[#FDE68A]">
            Categorization Queue
          </Link>
        </nav>
      </header>
      <main className="max-w-[1280px] mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
