import { redirect } from "next/navigation"
import { readAdminSession } from "@/lib/admin-session"
import LoginForm from "./LoginForm"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin login — XLMARKET",
  robots: "noindex, nofollow",
}

// Open-redirect guard: only same-origin paths starting with a single "/" are allowed.
// Rejects "//evil.com", "https://evil.com", "javascript:..." etc.
function safeNext(raw: unknown): string {
  if (typeof raw !== "string") return "/et"
  if (!raw.startsWith("/")) return "/et"
  if (raw.startsWith("//")) return "/et"
  if (raw.startsWith("/\\")) return "/et"
  return raw
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const session = await readAdminSession()
  const params = await searchParams
  const next = safeNext(params.next)
  if (session) {
    redirect(next)
  }

  return (
    <main className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-16 bg-[#F8FAFC]">
      <div className="w-full max-w-[420px] bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-8">
        <h1 className="text-[24px] font-bold text-[#1a1a2e] mb-1">Admin login</h1>
        <p className="text-sm text-[#64748B] mb-6">
          Sisselogimine on lubatud ainult XLMarket administraatoritele.
        </p>
        <LoginForm next={next} />
      </div>
    </main>
  )
}
