/**
 * Admin layout — simple internal dashboard shell.
 *
 * SECURITY (2026-06-05): layout JÕUSTAB nüüd auth'i — readAdminSession()
 * server-side, redirect /admin-login kui sessiooni pole. Gate'ib KÕIK
 * /xl-admin/* lehed (varem ainult obscurity). Write-API'd (/api/admin/*) olid
 * juba gate'itud. cookies() → leht dünaamiline (admin-lehel OK, ei cache'u).
 */

import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { readAdminSession } from "@/lib/admin-session"

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Admin — XLMARKET",
}

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readAdminSession()
  if (!session) redirect("/admin-login")
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
          <Link href="/xl-admin/categories" className="hover:text-[#FDE68A]">
            Kategooriad
          </Link>
        </nav>
      </header>
      <main className="max-w-[1280px] mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
