#!/usr/bin/env node
/**
 * Backfill sanitized_description + sanitized_rich_description
 * into Medusa product metadata.
 *
 * Reads products directly from Medusa API (no XLSX),
 * sanitizes HTML fields, and updates metadata via Admin API.
 *
 * Usage:
 *   node scripts/backfill-sanitized-html.mjs           # dry run
 *   node scripts/backfill-sanitized-html.mjs --execute  # actually update
 */

import http from "http"

const MEDUSA_URL = "http://127.0.0.1:9001"
const ADMIN_EMAIL = "admin@xlmarket.eu"
const ADMIN_PASS = "MEDUSA_ADMIN_PASSWORD_REDACTED"
const BATCH_SIZE = 100
const EXECUTE = process.argv.includes("--execute")

// ── sanitizeHtml (same as storefront/lib/sanitize.ts) ──────────────

const ALLOWED_TAGS = new Set([
  "br", "p", "strong", "em", "b", "i", "ul", "ol", "li", "h1", "h2", "h3",
  "h4", "h5", "h6", "span", "div", "table", "tr", "td", "th", "thead",
  "tbody", "a", "img",
])
const ALLOWED_ATTRS = {
  a: new Set(["href"]),
  img: new Set(["src", "alt", "width", "height"]),
}

function sanitizeHtml(html) {
  if (!html) return ""
  return html
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\.[a-z][\w-]{0,50}[^{}]{0,300}\{[^}]{0,5000}\}/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(iframe|object|embed|form|input|textarea|select)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|select|label)[^>]*\/?>/gi, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/gi, (match, tag, attrs) => {
      const tagLower = tag.toLowerCase()
      if (!ALLOWED_TAGS.has(tagLower)) return ""
      const isClosing = match.startsWith("</")
      if (isClosing) return `</${tagLower}>`
      const allowedAttrs = ALLOWED_ATTRS[tagLower]
      if (!allowedAttrs) return `<${tagLower}>`
      const safeAttrs = []
      const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
      let attrMatch
      while ((attrMatch = attrRegex.exec(attrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase()
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ""
        if (!allowedAttrs.has(attrName)) continue
        if ((attrName === "href" || attrName === "src") && /^\s*javascript:/i.test(attrValue)) continue
        safeAttrs.push(`${attrName}="${attrValue.replace(/"/g, "&quot;")}"`)
      }
      if (tagLower === "a") {
        safeAttrs.push('rel="noopener noreferrer nofollow"', 'target="_blank"')
      }
      const attrStr = safeAttrs.length ? " " + safeAttrs.join(" ") : ""
      return `<${tagLower}${attrStr}>`
    })
}

function cleanRichDescription(rawRich) {
  if (!rawRich || typeof rawRich !== "string" || rawRich.length < 50) return null
  let cleaned = rawRich
    .replace(/<!--\s*h5\s*-->[\s\S]*$/gi, "")
    .replace(/<div[^>]*class="m-banner"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "")
    .replace(/<img[^>]*src=["'][^"']*vevor-bmp-prm[^"']*["'][^>]*\/?>/gi, "")
    .replace(/<img[^>]*src=["'][^"']*boutique-banner[^"']*["'][^>]*\/?>/gi, "")
    .replace(/VEVOR is a leading brand[\s\S]*?global members\./gi, "")
    .replace(/Along with thousands[\s\S]*?global members\./gi, "")
    .replace(/<img[^>]*src=["'][^"']*-m\.[^"']*["'][^>]*\/?>/gi, "")
  const seenImgUrls = new Set()
  cleaned = cleaned.replace(/<img[^>]*src=["']([^"'>]+)["'][^>]*\/?>/gi, (match, src) => {
    if (seenImgUrls.has(src)) return ""
    seenImgUrls.add(src)
    return match
  })
  return sanitizeHtml(cleaned)
}

// ── HTTP helpers ───────────────────────────────────────────────────

function apiCall(method, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, MEDUSA_URL)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    }
    if (token) options.headers["Authorization"] = "Bearer " + token
    const req = http.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, data: { raw: data } }) }
      })
    })
    req.on("error", reject)
    req.setTimeout(30000, () => req.destroy(new Error("Request timeout")))
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function log(msg) {
  const ts = new Date().toISOString().substring(11, 19)
  console.log(`[${ts}] ${msg}`)
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY RUN"}`)

  // Auth
  log("Authenticating...")
  const auth = await apiCall("POST", "/auth/user/emailpass", { email: ADMIN_EMAIL, password: ADMIN_PASS })
  if (auth.status !== 200) { console.error("Auth failed:", auth); process.exit(1) }
  const token = auth.data.token
  log("Authenticated OK")

  // Fetch all products in pages
  let offset = 0
  let total = 0
  let updated = 0
  let skipped = 0
  let alreadyDone = 0

  while (true) {
    const resp = await apiCall("GET", `/admin/products?limit=${BATCH_SIZE}&offset=${offset}&fields=id,handle,description,metadata`, null, token)
    if (resp.status !== 200) { console.error("List failed:", resp.status); break }

    const products = resp.data.products || []
    if (products.length === 0) break

    total += products.length
    log(`Fetched ${total} products (offset ${offset})...`)

    for (const product of products) {
      const meta = product.metadata || {}

      // Skip if already has sanitized fields
      if (meta.sanitized_description && meta.sanitized_description.length > 5) {
        alreadyDone++
        continue
      }

      const sanitizedDesc = sanitizeHtml(product.description || "")
      const rawRich = typeof meta.rich_description === "string" ? meta.rich_description : null
      const sanitizedRich = cleanRichDescription(rawRich) || ""

      if (EXECUTE) {
        const updateResp = await apiCall("POST", `/admin/products/${product.id}`, {
          metadata: {
            ...meta,
            sanitized_description: sanitizedDesc,
            sanitized_rich_description: sanitizedRich,
          }
        }, token)

        if (updateResp.status === 200) {
          updated++
        } else {
          log(`  ERROR updating ${product.handle}: ${updateResp.status}`)
        }
        // Small delay to not overload Medusa
        if (updated % 50 === 0 && updated > 0) {
          log(`  Progress: ${updated} updated, ${skipped} skipped, ${alreadyDone} already done`)
        }
        await sleep(20)
      } else {
        updated++
      }
    }

    offset += BATCH_SIZE
    if (products.length < BATCH_SIZE) break
  }

  log("")
  log("=== DONE ===")
  log(`Total products: ${total}`)
  log(`Updated: ${updated}`)
  log(`Already had sanitized HTML: ${alreadyDone}`)
  log(`Skipped: ${skipped}`)
}

main().catch(e => { console.error(e); process.exit(1) })
