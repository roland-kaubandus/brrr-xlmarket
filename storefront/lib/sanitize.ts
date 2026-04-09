const ALLOWED_TAGS = new Set([
  "br", "p", "strong", "em", "b", "i", "ul", "ol", "li", "h1", "h2", "h3",
  "h4", "h5", "h6", "span", "div", "table", "tr", "td", "th", "thead",
  "tbody", "a", "img",
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href"]),
  img: new Set(["src", "alt", "width", "height"]),
}

/**
 * Sanitize HTML by removing all tags/attributes not in the whitelist.
 * Removes script tags, event handlers, javascript: URLs, iframes, etc.
 */
export function sanitizeHtml(html: string): string {
  return html
    // Remove CSS comments that VEVOR includes (/* pc dot样式 */ etc.)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Remove script/style/iframe blocks entirely (tag + content + closing tag)
    .replace(/<style[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(iframe|object|embed|form|input|textarea|select)[\s\S]*?<\/\1\s*>/gi, "")
    // Remove any remaining orphan opening/self-closing tags for blocked elements
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|select|label)[^>]*\/?>/gi, "")
    // Remove inline CSS rules that leaked out of style blocks
    .replace(/\.[a-z][\w-]*\s*\{[^}]*\}/gi, "")
    .replace(/\/\*[^*]*\*\//g, "")
    // Process remaining tags
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/gi, (match, tag, attrs) => {
      const tagLower = tag.toLowerCase()
      if (!ALLOWED_TAGS.has(tagLower)) return ""

      const isClosing = match.startsWith("</")
      if (isClosing) return `</${tagLower}>`

      const allowedAttrs = ALLOWED_ATTRS[tagLower]
      if (!allowedAttrs) return `<${tagLower}>`

      // Filter attributes
      const safeAttrs: string[] = []
      const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
      let attrMatch
      while ((attrMatch = attrRegex.exec(attrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase()
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? ""
        if (!allowedAttrs.has(attrName)) continue
        // Block javascript: URLs
        if ((attrName === "href" || attrName === "src") && /^\s*javascript:/i.test(attrValue)) continue
        safeAttrs.push(`${attrName}="${attrValue.replace(/"/g, "&quot;")}"`)
      }

      // Add security attrs to links
      if (tagLower === "a") {
        safeAttrs.push('rel="noopener noreferrer nofollow"', 'target="_blank"')
      }

      const attrStr = safeAttrs.length ? " " + safeAttrs.join(" ") : ""
      return `<${tagLower}${attrStr}>`
    })
}
