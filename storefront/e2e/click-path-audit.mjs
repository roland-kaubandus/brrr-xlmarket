#!/usr/bin/env node
/**
 * Click-path audit: visits key pages, collects broken links, 404s,
 * console errors. Non-destructive — only navigates + reads.
 */
import { chromium } from "@playwright/test"
import { writeFileSync, mkdirSync } from "fs"

const BASE = "https://xlmarket.ee"
const OUT = "/home/brrr/brrr-xlmarket/reports/overnight-2026-04-22/clickpath"
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
  "/en/otsing?q=chainsaw",
]

const results = []

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) XLMarket-Audit/1.0",
})

for (const path of PAGES) {
  const url = BASE + path
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200))
  })
  page.on("pageerror", (err) => pageErrors.push(err.message.slice(0, 200)))
  page.on("requestfailed", (req) => {
    const f = req.failure()
    failedRequests.push(`${req.method()} ${req.url()} — ${f?.errorText || "?"}`)
  })

  const start = Date.now()
  let status = 0
  let title = ""
  let linkCount = 0
  let buttonCount = 0
  let imageCount = 0
  let imagesWithoutAlt = 0
  let error = null

  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 })
    status = response?.status() || 0
    title = await page.title()
    linkCount = await page.locator("a[href]").count()
    buttonCount = await page.locator("button").count()
    imageCount = await page.locator("img").count()
    imagesWithoutAlt = await page.locator("img:not([alt])").count()
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200)
  }

  const ms = Date.now() - start
  const result = {
    path,
    status,
    title,
    ms,
    error,
    consoleErrors,
    pageErrors,
    failedRequests,
    linkCount,
    buttonCount,
    imageCount,
    imagesWithoutAlt,
  }
  results.push(result)

  const ok = status === 200 && !error && pageErrors.length === 0
  process.stdout.write(`${ok ? "✓" : "✗"} ${status} ${ms}ms  ${path}\n`)
  if (consoleErrors.length) process.stdout.write(`    console errors: ${consoleErrors.length}\n`)
  if (pageErrors.length) process.stdout.write(`    page errors: ${pageErrors.length}\n`)
  if (failedRequests.length) process.stdout.write(`    failed requests: ${failedRequests.length}\n`)
  await page.close()
}

await browser.close()

writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))

// Summary markdown
const lines = ["# Click-path Audit — " + new Date().toISOString(), ""]
lines.push("| Path | Status | Load (ms) | Console | Page Err | Failed Req | Links | Images | No-alt |")
lines.push("|------|--------|-----------|---------|----------|------------|-------|--------|--------|")
for (const r of results) {
  lines.push(
    `| ${r.path} | ${r.status || r.error || "?"} | ${r.ms} | ${r.consoleErrors.length} | ${r.pageErrors.length} | ${r.failedRequests.length} | ${r.linkCount} | ${r.imageCount} | ${r.imagesWithoutAlt} |`
  )
}
lines.push("")

// Group all findings
const allConsole = []
const allPage = []
const allFailed = []
for (const r of results) {
  r.consoleErrors.forEach((e) => allConsole.push({ path: r.path, err: e }))
  r.pageErrors.forEach((e) => allPage.push({ path: r.path, err: e }))
  r.failedRequests.forEach((e) => allFailed.push({ path: r.path, err: e }))
}

if (allPage.length) {
  lines.push("## Page errors (JS exceptions)")
  for (const e of allPage) lines.push(`- \`${e.path}\` — ${e.err}`)
  lines.push("")
}
if (allConsole.length) {
  lines.push(`## Console errors (${allConsole.length})`)
  for (const e of allConsole.slice(0, 30)) lines.push(`- \`${e.path}\` — ${e.err}`)
  if (allConsole.length > 30) lines.push(`- ... and ${allConsole.length - 30} more`)
  lines.push("")
}
if (allFailed.length) {
  lines.push(`## Failed network requests (${allFailed.length})`)
  for (const e of allFailed.slice(0, 30)) lines.push(`- \`${e.path}\` — ${e.err}`)
  if (allFailed.length > 30) lines.push(`- ... and ${allFailed.length - 30} more`)
  lines.push("")
}

writeFileSync(`${OUT}/SUMMARY.md`, lines.join("\n"))
console.log(`\nDone. Summary: ${OUT}/SUMMARY.md`)
