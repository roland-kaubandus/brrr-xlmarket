import { NextResponse } from "next/server"
import { exec } from "node:child_process"
import { readAdminSession } from "@/lib/admin-session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

const PM2_APP = "xlmarket-storefront"

function pm2Reload(): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    exec(`pm2 reload ${PM2_APP}`, { timeout: 20_000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout, stderr })
    })
  })
}

export async function POST() {
  const session = await readAdminSession()
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  // PM2 not installed in dev — degrade gracefully so dev users get a clear message.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({
      ok: true,
      actor: session.email,
      env: "development",
      note: "PM2 reload skipped — dev server hot-reloads automatically.",
    })
  }
  const r = await pm2Reload()
  return NextResponse.json({
    ok: r.ok,
    actor: session.email,
    stdout: r.stdout.slice(0, 200),
    stderr: r.stderr.slice(0, 200),
  })
}
