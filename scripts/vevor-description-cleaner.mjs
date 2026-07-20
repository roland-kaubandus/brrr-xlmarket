// HTML-aware pre-translation cleaner for VEVOR sanitized_rich_description.
// Strategy: (A) port storefront sanitizeHtml VERBATIM (strips leaked CSS blocks,
// orphan CSS selectors, HTML comments, style/script; whitelists tags) — this is
// exactly what the storefront renders, so translating its output = translating
// what users see. (B) remove the "Why Choose VEVOR?" promise block (sanitize
// keeps it; it is VEVOR brand promises, possibly false for xlmarket, and doubled).
// (C) collapse emptied wrapper divs + whitespace.
// READ-ONLY helper — does not touch any DB.

const ALLOWED_TAGS = new Set([
  "br","p","strong","em","b","i","ul","ol","li","h1","h2","h3",
  "h4","h5","h6","span","div","table","tr","td","th","thead","tbody","a","img",
]);
const ALLOWED_ATTRS = { a: new Set(["href"]), img: new Set(["src","alt","width","height"]) };

// --- (A) ported from storefront/lib/sanitize.ts (verbatim logic) ---
export function sanitizeHtml(html) {
  return html
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\.[a-z][\w-]{0,50}[^{}]{0,10000}\{[^{}]{0,10000}\}/gi, "")
    .replace(/^[ \t]*\.[a-z][\w-]{0,80}(?:[ \t][^\n{}]{0,500})?[:~+>][^\n{}]{0,500},?[ \t]*$/gim, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(iframe|object|embed|form|input|textarea|select)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|textarea|select|label)[^>]*\/?>/gi, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/gi, (match, tag, attrs) => {
      const tagLower = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(tagLower)) return "";
      const isClosing = match.startsWith("</");
      if (isClosing) return `</${tagLower}>`;
      const allowedAttrs = ALLOWED_ATTRS[tagLower];
      if (!allowedAttrs) return `<${tagLower}>`;
      const safeAttrs = [];
      const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrs)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
        if (!allowedAttrs.has(attrName)) continue;
        if ((attrName === "href" || attrName === "src") && /^\s*javascript:/i.test(attrValue)) continue;
        safeAttrs.push(`${attrName}="${attrValue.replace(/"/g, "&quot;")}"`);
      }
      if (tagLower === "a") safeAttrs.push('rel="noopener noreferrer nofollow"', 'target="_blank"');
      const attrStr = safeAttrs.length ? " " + safeAttrs.join(" ") : "";
      return `<${tagLower}${attrStr}>`;
    });
}

// --- (B) Why-Choose VEVOR promise block removal (surgical) ---
// The 5 canonical promises. Only remove a <ul> if it contains >=2 of them
// (guards against nuking a legitimate list).
const PROMISES = [
  "Premium Tough Quality","Incredibly Low Prices","Fast &amp; Secure Delivery",
  "Fast & Secure Delivery","30-Day Free Returns","Attentive Service",
];
function removeWhyChoose(html) {
  let out = html;
  // 1) Remove any <ul>...</ul> that contains >=2 promises (the promise list).
  out = out.replace(/<ul>[\s\S]*?<\/ul>/gi, (block) => {
    const hits = PROMISES.filter((p) => block.includes(p)).length;
    return hits >= 2 ? "" : block;
  });
  // 2) Remove the "Why Choose VEVOR?" heading element (h1-6/div/p/span wrapper).
  out = out.replace(/<(h[1-6]|div|p|span)>\s*Why Choose VEVOR\??\s*<\/\1>/gi, "");
  // 3) Any stray leftover bare "Why Choose VEVOR?" text node.
  out = out.replace(/Why Choose VEVOR\??/gi, "");
  return out;
}

// --- (C) collapse emptied wrappers + whitespace ---
function collapseEmpty(html) {
  let prev, out = html;
  do {
    prev = out;
    out = out
      .replace(/<(div|span|p|ul|ol|li|h[1-6]|table|tbody|thead|tr|td|th)>\s*<\/\1>/gi, "")
      .replace(/<(div|span|p)>(\s|<br>)*<\/\1>/gi, "");
  } while (out !== prev);
  out = out.replace(/\n{2,}/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  return out;
}

export function clean(rich) {
  if (!rich) return "";
  const sanitized = sanitizeHtml(rich);     // A — matches storefront render
  const noPromo = removeWhyChoose(sanitized); // B
  return collapseEmpty(noPromo);              // C
}

// integrity helpers
export const visibleText = (html) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
export const imgSrcs = (html) =>
  [...(html || "").matchAll(/<img[^>]*\bsrc="([^"]*)"/gi)].map((m) => m[1]);
export const tagCount = (html) => ((html || "").match(/<[a-z]/gi) || []).length;
export const balancedTags = (html) => {
  // every opening non-void tag has a matching close; returns # of unclosed
  const stack = [];
  const void_ = new Set(["br","img"]);
  for (const m of (html || "").matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi)) {
    const closing = m[1] === "/"; const t = m[2].toLowerCase();
    if (void_.has(t)) continue;
    if (!closing) stack.push(t);
    else { const i = stack.lastIndexOf(t); if (i >= 0) stack.splice(i, 1); }
  }
  return stack.length;
};
