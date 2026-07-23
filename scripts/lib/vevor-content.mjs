// vevor-content.mjs — JAGATUD sisu-helperid (sanitize + rich-cleanup).
// EKSTRAKTITUD import-vevor-feed.mjs-ist (2026-07-23) → sama loogika, üks allikas,
// et backfill-content-fields.mjs toodaks BAIT-IDENTSE tulemuse impordiga (drift-vaba).
// KRIITILINE: sanitizeHtml regex PEAB kasutama bounded quantifiers (vt CLAUDE.md gotcha).

export const ALLOWED_TAGS = new Set([
  "br", "p", "strong", "em", "b", "i", "ul", "ol", "li", "h1", "h2", "h3",
  "h4", "h5", "h6", "span", "div", "table", "tr", "td", "th", "thead",
  "tbody", "a", "img",
])
export const ALLOWED_ATTRS = {
  a: new Set(["href"]),
  img: new Set(["src", "alt", "width", "height"]),
}

export function sanitizeHtml(html) {
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

export function normalizeImageUrl(url) {
  if (!url) return ""
  return decodeURIComponent(url.trim()).replace(/^https?:\/\//, "").replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase()
}

export function cleanRichDescription(html, galleryUrls) {
  if (!html) return null

  const gallerySet = new Set((galleryUrls || []).map(normalizeImageUrl))

  let cleaned = html
    .replace(/<!--\s*h5\s*-->[\s\S]*$/gi, "")
    .replace(/<div[^>]*class="m-banner"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "")
    .replace(/<img[^>]*src=["'][^"']*vevor-bmp-prm[^"']*["'][^>]*\/?>/gi, "")
    .replace(/<img[^>]*src=["'][^"']*boutique-banner[^"']*["'][^>]*\/?>/gi, "")
    .replace(/<img[^>]*src=["'][^"']*-m\.[^"']*["'][^>]*\/?>/gi, "")
    .replace(/VEVOR is a leading brand[\s\S]*?global members\./gi, "")
    .replace(/Along with thousands[\s\S]*?global members\./gi, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\.[a-z][\w-]{0,50}[^{}]{0,300}\{[^}]{0,5000}\}/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(input|label|iframe|object|embed|form|textarea|select)[^>]*\/?>/gi, "")

  const seenUrls = new Set()
  cleaned = cleaned.replace(/<img[^>]*src=["']([^"'>]+)["'][^>]*\/?>/gi, (match, src) => {
    const norm = normalizeImageUrl(src)
    if (seenUrls.has(norm) || gallerySet.has(norm)) return ""
    seenUrls.add(norm)
    return match
  })

  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n").trim()

  return cleaned.length > 50 ? cleaned : null
}
