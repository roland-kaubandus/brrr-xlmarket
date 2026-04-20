/**
 * Taxonomy Health Dashboard — spec F5.7
 *
 * Runs `scripts/check-taxonomy-invariants.mjs --json` and renders a
 * color-coded table of the 19+ invariants.
 *
 * PERF-C3: Uses async execFile (not execSync — never sync I/O in server
 * components) plus a 60s module-level cache so rapid refreshes serve from
 * memory instead of spawning a 3-5s Node subprocess per request.
 */

import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export const dynamic = "force-dynamic"

interface InvariantResult {
  id: string
  title: string
  severity: "CRIT" | "WARN"
  pass: boolean
  detail: string
}

interface InvariantsPayload {
  generated_at: string
  results: InvariantResult[]
}

const CACHE_TTL_MS = 60_000
let invariantsCache: { data: InvariantsPayload; cachedAt: number } | null = null

async function runInvariants(): Promise<InvariantsPayload> {
  if (invariantsCache && Date.now() - invariantsCache.cachedAt < CACHE_TTL_MS) {
    return invariantsCache.data
  }

  try {
    const candidate = resolve(process.cwd(), "../scripts/check-taxonomy-invariants.mjs")
    const scriptPath = scriptLocation(candidate)
    const { stdout } = await execFileAsync("node", [scriptPath, "--json"], {
      cwd: resolve(scriptPath, "..", ".."),
      maxBuffer: 16 * 1024 * 1024,
      // 30s hard timeout — if the script hangs, the cache still caps the
      // blast radius but a hung subprocess would still hold the worker
      // thread without this. Security review 2026-04-20.
      timeout: 30_000,
    })
    const data = JSON.parse(stdout) as InvariantsPayload
    invariantsCache = { data, cachedAt: Date.now() }
    return data
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const data: InvariantsPayload = {
      generated_at: new Date().toISOString(),
      results: [
        {
          id: "BOOTSTRAP",
          title: "Invariant script failed to run",
          severity: "CRIT",
          pass: false,
          detail: message,
        },
      ],
    }
    // Cache errors too — if the script is broken, don't hammer it every request.
    invariantsCache = { data, cachedAt: Date.now() }
    return data
  }
}

function scriptLocation(candidate: string): string {
  if (existsSync(candidate)) return candidate
  // Fallbacks for varied deploy layouts
  const fallbacks = [
    "/home/brrr/brrr-xlmarket/scripts/check-taxonomy-invariants.mjs",
    resolve(process.cwd(), "scripts/check-taxonomy-invariants.mjs"),
  ]
  for (const p of fallbacks) {
    if (existsSync(p)) return p
  }
  return candidate
}

export default async function TaxonomyHealthPage() {
  const { generated_at, results } = await runInvariants()
  const critFails = results.filter((r) => !r.pass && r.severity === "CRIT").length
  const warnFails = results.filter((r) => !r.pass && r.severity === "WARN").length
  const passes = results.filter((r) => r.pass).length

  const overall = critFails > 0 ? "red" : warnFails > 0 ? "amber" : "green"
  const overallBg =
    overall === "green" ? "bg-emerald-50 border-emerald-200" : overall === "amber" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
  const overallText =
    overall === "green" ? "text-emerald-700" : overall === "amber" ? "text-amber-700" : "text-red-700"

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Taxonomy Health</h1>
      <p className="text-sm text-[#64748B] mb-6">
        Generated at {new Date(generated_at).toLocaleString("en-IE")}
      </p>

      <div className={`rounded-lg border p-4 mb-8 ${overallBg}`}>
        <div className={`text-lg font-semibold ${overallText}`}>
          {overall === "green" ? "ALL GREEN" : overall === "amber" ? "WARNINGS" : "CRITICAL FAILURES"}
        </div>
        <div className="text-sm mt-1 text-[#1E293B]">
          {passes} pass · {warnFails} warn · {critFails} crit
        </div>
      </div>

      <table className="w-full text-sm bg-white rounded-lg shadow-sm overflow-hidden">
        <thead>
          <tr className="bg-[#F1F5F9] text-[#64748B] text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 w-20">Status</th>
            <th className="text-left px-4 py-3 w-20">ID</th>
            <th className="text-left px-4 py-3">Invariant</th>
            <th className="text-left px-4 py-3 w-20">Sev</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const badge = r.pass
              ? "bg-emerald-100 text-emerald-700"
              : r.severity === "CRIT"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            const label = r.pass ? "PASS" : r.severity === "CRIT" ? "FAIL" : "WARN"
            return (
              <tr key={r.id} className="border-t border-[#E2E8F0]">
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge}`}>{label}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{r.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#1E293B]">{r.title}</div>
                  {r.detail && <div className="text-xs text-[#64748B] mt-1">{r.detail}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-[#94A3B8]">{r.severity}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-8 text-sm text-[#64748B]">
        <p className="mb-2">
          <strong>Rerun via CLI:</strong>
        </p>
        <pre className="bg-[#1E293B] text-[#E2E8F0] p-3 rounded text-xs overflow-x-auto">
          node scripts/check-taxonomy-invariants.mjs
        </pre>
        <p className="mt-3">
          Live URL checks (INV-15) disabled by default — set <code className="bg-[#E2E8F0] px-1 rounded">TAXONOMY_HEALTH_LIVE=1</code> to
          enable.
        </p>
      </div>
    </div>
  )
}
