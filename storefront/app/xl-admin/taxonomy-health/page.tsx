/**
 * Taxonomy Health Dashboard — spec F5.7
 *
 * Runs `scripts/check-taxonomy-invariants.mjs --json` at request time and
 * renders a color-coded table of the 19+ invariants.
 *
 * No caching — every page load re-runs invariants fresh. Rendered SSR
 * so network calls (if enabled via TAXONOMY_HEALTH_LIVE=1) execute on
 * the server, not the browser.
 */

import { execSync } from "node:child_process"
import { resolve } from "node:path"

export const dynamic = "force-dynamic"

interface InvariantResult {
  id: string
  title: string
  severity: "CRIT" | "WARN"
  pass: boolean
  detail: string
}

function runInvariants(): { generated_at: string; results: InvariantResult[] } {
  try {
    const script = resolve(process.cwd(), "../scripts/check-taxonomy-invariants.mjs")
    // In standalone build, scripts dir may be at repo root. Try both paths.
    const scriptPath = scriptLocation(script)
    const out = execSync(`node ${scriptPath} --json`, { cwd: resolve(scriptPath, "..", ".."), stdio: ["ignore", "pipe", "pipe"] }).toString()
    return JSON.parse(out)
  } catch (err: any) {
    return {
      generated_at: new Date().toISOString(),
      results: [
        {
          id: "BOOTSTRAP",
          title: "Invariant script failed to run",
          severity: "CRIT",
          pass: false,
          detail: err.message || String(err),
        },
      ],
    }
  }
}

function scriptLocation(candidate: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs")
    if (fs.existsSync(candidate)) return candidate
  } catch {}
  // Fallbacks for varied deploy layouts
  const fallbacks = [
    "/home/brrr/brrr-xlmarket/scripts/check-taxonomy-invariants.mjs",
    resolve(process.cwd(), "scripts/check-taxonomy-invariants.mjs"),
  ]
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs")
  for (const p of fallbacks) {
    if (fs.existsSync(p)) return p
  }
  return candidate
}

export default function TaxonomyHealthPage() {
  const { generated_at, results } = runInvariants()
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
        Generated at {new Date(generated_at).toLocaleString("et-EE")}
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
