#!/usr/bin/env node
/**
 * Performance audit via Playwright CDP.
 * Captures: LCP, FCP, load time, bytes transferred, resource count.
 */
import { chromium } from "@playwright/test"
import { writeFileSync, mkdirSync } from "fs"

const BASE = "https://xlmarket.ee"
const OUT = "/home/brrr/brrr-xlmarket/reports/overnight-2026-04-22/lighthouse"
mkdirSync(OUT, { recursive: true })

const PAGES = [
  "/en",
  "/en/kategooriad",
  "/en/alustajale",
  "/en/arikliendile",
  "/en/hooldus",
  "/en/meist",
  "/en/kontakt",
  "/en/tingimused",
  "/en/privaatsus",
  "/en/tarne",
  "/en/tagastamine",
  "/en/kupsised",
  "/en/kategooriad/renewable-energy",
  "/en/kategooriad/horeca-food-service",
  "/en/kategooriad/automotive-workshop",
  "/en/kategooriad/hand-power-tools",
  "/en/kategooriad/welding-metalworking",
  "/en/otsing?q=chainsaw",
]

const results = []
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] })

for (const path of PAGES) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  const resources = []
  let totalBytes = 0

  page.on("response", async (resp) => {
    try {
      const size = parseInt(resp.headers()["content-length"] || "0", 10) || 0
      totalBytes += size
      resources.push({ url: resp.url().slice(0, 120), status: resp.status(), bytes: size, type: resp.request().resourceType() })
    } catch {}
  })

  const url = BASE + path
  let status = 0
  let fcp = 0
  let lcp = 0
  let domContentLoaded = 0
  let loadEvent = 0
  let error = null
  const start = Date.now()

  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 30000 })
    status = response?.status() || 0

    // Wait a bit for LCP to settle
    await page.waitForTimeout(2000)

    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0]
      const paintEntries = performance.getEntriesByType("paint")
      const fcp = paintEntries.find((e) => e.name === "first-contentful-paint")?.startTime || 0
      // LCP via PerformanceObserver is async; we try to read from last LCP entry
      let lcp = 0
      try {
        const lcpEntries = performance.getEntriesByType("largest-contentful-paint")
        if (lcpEntries.length) lcp = lcpEntries[lcpEntries.length - 1].startTime
      } catch {}
      return {
        fcp,
        lcp,
        domContentLoaded: nav?.domContentLoadedEventEnd || 0,
        loadEvent: nav?.loadEventEnd || 0,
      }
    })
    fcp = perf.fcp
    lcp = perf.lcp
    domContentLoaded = perf.domContentLoaded
    loadEvent = perf.loadEvent
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200)
  }

  const ms = Date.now() - start
  const result = {
    path,
    status,
    wallMs: ms,
    fcp: Math.round(fcp),
    lcp: Math.round(lcp),
    domContentLoaded: Math.round(domContentLoaded),
    loadEvent: Math.round(loadEvent),
    totalKB: Math.round(totalBytes / 1024),
    resourceCount: resources.length,
    biggestResources: resources.sort((a, b) => b.bytes - a.bytes).slice(0, 5),
    error,
  }
  results.push(result)

  const ok = status === 200 && !error
  console.log(
    `${ok ? "✓" : "✗"} ${status} wall=${ms}ms fcp=${Math.round(fcp)} lcp=${Math.round(lcp)} load=${Math.round(loadEvent)} ${Math.round(totalBytes / 1024)}KB ${path}`
  )

  await context.close()
}

await browser.close()

writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))

const lines = ["# Performance Audit (Playwright CDP) — " + new Date().toISOString(), ""]
lines.push("Desktop viewport 1440×900, wall time = Playwright total, cold cache per page.")
lines.push("")
lines.push("| Path | Status | FCP (ms) | LCP (ms) | DCL (ms) | Load (ms) | Size (KB) | Resources |")
lines.push("|------|--------|----------|----------|----------|-----------|-----------|-----------|")
for (const r of results) {
  lines.push(
    `| ${r.path} | ${r.status || "?"} | ${r.fcp} | ${r.lcp} | ${r.domContentLoaded} | ${r.loadEvent} | ${r.totalKB} | ${r.resourceCount} |`
  )
}
lines.push("")

// Average
const ok = results.filter((r) => r.status === 200 && !r.error)
if (ok.length) {
  const avg = (f) => Math.round(ok.reduce((a, r) => a + r[f], 0) / ok.length)
  lines.push("## Averages (200 OK pages)")
  lines.push(`- FCP: ${avg("fcp")}ms`)
  lines.push(`- LCP: ${avg("lcp")}ms`)
  lines.push(`- DOM content loaded: ${avg("domContentLoaded")}ms`)
  lines.push(`- Load event: ${avg("loadEvent")}ms`)
  lines.push(`- Size: ${avg("totalKB")}KB`)
  lines.push(`- Resources: ${avg("resourceCount")}`)
  lines.push("")
}

// Biggest resources across all pages
const allRes = []
for (const r of results) for (const br of r.biggestResources) allRes.push({ path: r.path, ...br })
allRes.sort((a, b) => b.bytes - a.bytes)
lines.push("## Top 15 largest resources across all pages")
for (const r of allRes.slice(0, 15)) {
  lines.push(`- ${Math.round(r.bytes / 1024)}KB \`${r.type}\` — ${r.url} (on ${r.path})`)
}

writeFileSync(`${OUT}/SUMMARY.md`, lines.join("\n"))
console.log(`\n✓ Summary: ${OUT}/SUMMARY.md`)
