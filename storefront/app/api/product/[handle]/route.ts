import { NextRequest, NextResponse } from "next/server"
import { getProduct, getCategoryByHandle, formatPrice } from "@/lib/medusa"
import { getProductMedia } from "@/lib/product-media"
import { getVevorFeedEntryAsync } from "@/lib/vevor-feed"
import { getMeiliProductByHandle, getProductDescription, getProductTitle } from "@/lib/meilisearch"
import { sanitizeHtml } from "@/lib/sanitize"
import { categoryPath } from "@/lib/i18n"
import { firstKnownHandle, getBreadcrumbTrail } from "@/lib/category-tree"

function stringifyScalar(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

/**
 * Beautify a sanitized VEVOR rich description.
 *
 * VEVOR's source HTML uses pure <div> trees with CSS classes for hierarchy.
 * After sanitization (which strips classes and styles) we are left with a
 * flat soup of <div>/<span>/<li> with no semantic structure. This function
 * adds back hierarchy by:
 *   - dropping duplicate "Why Choose VEVOR?" PC+mobile blocks
 *   - turning short text-only divs into <h3>
 *   - wrapping orphan text into <p>
 *   - collapsing empty wrapper <div>/<span> chains
 *
 * Keep this function defensive — it should never throw and should preserve
 * the original markup if a transformation does not match.
 */
function beautifyRichDescription(html: string): string {
  if (!html || html.length < 50) return html
  let out = html

  // 1. Drop duplicate "Why Choose VEVOR?" blocks (VEVOR ships PC + mobile copy)
  let firstWhy = true
  out = out.replace(
    /<div[^>]*>\s*(?:<div[^>]*>\s*)*[^<]*Why Choose VEVOR\?[\s\S]*?<\/ul>\s*(?:<\/div>\s*){1,4}/gi,
    (match) => {
      if (firstWhy) {
        firstWhy = false
        return match
      }
      return ""
    }
  )

  // 2. Strip empty divs/spans (with possible whitespace inside) — repeat
  //    until stable to handle deeply nested empties.
  for (let i = 0; i < 4; i++) {
    const before = out
    out = out
      .replace(/<div>\s*<\/div>/gi, "")
      .replace(/<span>\s*<\/span>/gi, "")
      .replace(/<ul>\s*<\/ul>/gi, "")
    if (out === before) break
  }

  // 3. Convert short text-only <div>...</div> to <h3>.
  //    Title heuristic: 5–80 chars, no other tags inside, ends without period
  //    OR matches Title Case / known section names.
  out = out.replace(/<div>\s*([^<>][^<>]{4,79})\s*<\/div>/gi, (match, text: string) => {
    const trimmed = text.trim()
    // Skip long sentence-like content (treat as paragraph instead)
    if (trimmed.length > 70 && /[.!?]$/.test(trimmed)) return match
    // Skip if it looks like body text (>10 words and ends with period)
    const words = trimmed.split(/\s+/).length
    if (words > 10 && /[.!?]$/.test(trimmed)) return match
    // Treat as heading if Title Case, ALL CAPS, or 1-7 words without ending period
    const looksLikeTitle =
      /^[A-Z]/.test(trimmed) &&
      (words <= 7 || !/[.!?]$/.test(trimmed))
    if (!looksLikeTitle) return match
    return `<h3>${trimmed}</h3>`
  })

  // 4. Wrap longer text-only divs as paragraphs.
  out = out.replace(/<div>\s*([^<>][^<>]{20,})\s*<\/div>/gi, (_m, text: string) => {
    const trimmed = text.trim()
    return `<p>${trimmed}</p>`
  })

  // 5. Flatten <li> contents — VEVOR wraps each bullet in 2-3 layers of
  //    <div>/<span>. Extract the deepest non-empty text and rewrite to <li>text.
  out = out.replace(/<li>([\s\S]*?)<\/li>/gi, (_m, inner: string) => {
    // Strip all tags inside, collapse whitespace, decode common entities at display-time.
    const text = inner
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    if (!text) return ""
    return `<li>${text}</li>`
  })

  // 6. Final empty-wrapper sweep
  for (let i = 0; i < 4; i++) {
    const before = out
    out = out
      .replace(/<div>\s*<\/div>/gi, "")
      .replace(/<span>\s*<\/span>/gi, "")
    if (out === before) break
  }

  return out
}

/**
 * Build a structured fallback when the product has no rich_description —
 * just the main description with <br>-separated lines. Promote the first
 * paragraph as intro, the next short lines as bullets.
 */
function structureMainDescription(text: string): string {
  if (!text) return ""
  // Split on <br> variants and newlines
  const parts = text
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\n+/)
    .map((s) => s.replace(/<[^>]+>/g, "").trim())
    .filter((s) => s.length > 0)
  if (parts.length === 0) return text
  if (parts.length === 1) return `<p>${parts[0]}</p>`

  // First long-ish line = intro paragraph; the rest = bullet list of features.
  const [intro, ...rest] = parts
  const introHtml = `<p>${intro}</p>`
  // If there are short bullet-like lines, render as <ul>
  const bulletLike = rest.filter((p) => p.length < 80 && !/[.!?]$/.test(p))
  if (bulletLike.length >= 3) {
    const items = bulletLike.map((b) => `<li>${b}</li>`).join("")
    return `${introHtml}<ul>${items}</ul>`
  }
  // Otherwise render as paragraphs
  const paragraphs = rest.map((p) => `<p>${p}</p>`).join("")
  return `${introHtml}${paragraphs}`
}

function parseSpecs(description: string): Array<{ key: string; value: string }> {
  const text = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const specs: Array<{ key: string; value: string }> = []
  const parts = text.split(",")
  for (const part of parts.slice(0, 24)) {
    const colonIdx = part.indexOf(":")
    if (colonIdx > 2 && colonIdx < 40) {
      const key = part.substring(0, colonIdx).trim()
      const value = part.substring(colonIdx + 1).trim()
      if (key.split(" ").length <= 4 && value.length > 0 && value.length < 80) {
        specs.push({ key, value })
      }
    }
  }
  return specs.slice(0, 16)
}

function collectKeyValueSpecs(value: unknown): Array<{ key: string; value: string }> {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return null
        const row = item as Record<string, unknown>
        const key = stringifyScalar(row.key) || stringifyScalar(row.name) || stringifyScalar(row.label)
        const cell = stringifyScalar(row.value) || stringifyScalar(row.text)
        return key && cell ? { key, value: cell } : null
      })
      .filter((item): item is { key: string; value: string } => Boolean(item))
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, cell]) => {
        const normalized = stringifyScalar(cell)
        return normalized ? { key, value: normalized } : null
      })
      .filter((item): item is { key: string; value: string } => Boolean(item))
  }
  return []
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const locale = request.nextUrl.searchParams.get("locale") || "et"

  try {
    const product = await getProduct(handle)
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const metadata = product.metadata || {}

    // Removed the per-request getCategoryByHandle call that used
    // include_ancestors_tree=true. Breadcrumb now comes from the SSoT
    // (category-tree.generated.json) and costs 0ms instead of a Medusa round-trip.
    const [meiliHit, feedEntry, media] = await Promise.all([
      getMeiliProductByHandle(handle),
      getVevorFeedEntryAsync({
        vevorSku: stringifyScalar(metadata.vevor_sku),
        vevorUpc: stringifyScalar(metadata.vevor_upc),
      }),
      getProductMedia({
        vevorUpc: stringifyScalar(metadata.vevor_upc),
        vevorSku: stringifyScalar(metadata.vevor_sku),
      }),
    ])

    // Locale-aware title: prefer ET (if locale=et and title_et present), else EN baseline.
    // meta.title_et is written by translate-worker.mjs; Meili reindex picks it up.
    const metaTitleEt = locale === "et" ? (typeof metadata.title_et === "string" && metadata.title_et.trim() ? metadata.title_et : null) : null
    const localizedTitle = meiliHit
      ? getProductTitle(meiliHit, locale)
      : (metaTitleEt || product.title)
    const metaDescEt = locale === "et" ? (typeof metadata.description_et === "string" && metadata.description_et.trim() ? metadata.description_et : null) : null
    const localizedDescription = meiliHit
      ? getProductDescription(meiliHit, locale)
      : (metaDescEt || product.description || "")
    const variant = product.variants?.[0]
    const price = variant?.calculated_price

    // Gallery images
    const metaGalleryImages: Array<{ id: string; url: string }> = Array.isArray(metadata.gallery_images)
      ? (metadata.gallery_images as string[])
          .filter((u): u is string => typeof u === "string" && u.length > 0)
          .map((url, i) => ({ id: `meta_gallery_${i}`, url: url.replace(/\/goods_img-/, "/original_img-") }))
      : []

    const images = Array.from(
      new Map(
        [
          ...metaGalleryImages,
          ...(metaGalleryImages.length === 0 ? [
            ...(product.images || []).map((img) => ({ ...img, url: img.url.replace(/\/goods_img-/, "/original_img-") })),
            ...(product.thumbnail ? [{ id: "thumb", url: product.thumbnail.replace(/\/goods_img-/, "/original_img-") }] : []),
          ] : []),
        ]
          .filter((image) => Boolean(image?.url))
          .map((image, index) => [image.url, { id: image.id || `img_${index}`, url: image.url }])
      ).values()
    )

    // Specs
    const likelySpecKeys = ["specs", "specifications", "technical_specs", "technical_data", "attributes", "details", "parameters"]
    let specs: Array<{ key: string; value: string }> = []
    for (const key of likelySpecKeys) {
      const s = collectKeyValueSpecs(metadata[key])
      if (s.length > 0) { specs = s.slice(0, 24); break }
    }
    if (specs.length === 0 && product.description) specs = parseSpecs(product.description)
    if (specs.length === 0 && feedEntry?.descriptionHtml) specs = parseSpecs(feedEntry.descriptionHtml)

    // Manuals
    const manualLinks = [...media.manuals]
    const manualKeys = ["manuals", "manual_urls", "pdfs", "pdf_urls", "manual_files"]
    for (const key of manualKeys) {
      const value = metadata[key]
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === "string" && item.includes(".pdf")) {
            manualLinks.push({ label: `Manual ${index + 1}`, href: item })
          } else if (item && typeof item === "object") {
            const row = item as Record<string, unknown>
            const href = stringifyScalar(row.url) || stringifyScalar(row.href) || stringifyScalar(row.path)
            if (href) manualLinks.push({ label: stringifyScalar(row.label) || `Manual ${index + 1}`, href })
          }
        })
      }
    }
    const uniqueManuals = manualLinks.filter((item, index, array) =>
      array.findIndex((c) => c.href === item.href) === index
    )

    // Breadcrumb — spec §3.5: autoritatiivne allikas on taxonomy SSoT
    // (category-tree.generated.json), mitte Medusa parent_category walk.
    // Põhjus: Medusa DB sisaldab 53 L1 (31 legacy + 22 v3) — parent_category
    // ahel võib lõppeda legacy rootis → drift. SSoT puu teab ainult 22 v3 L1.
    //
    // Valime esimese handle'i mis eksisteerib SSoT-s:
    //   1. meiliHit.taxonomy.ancestors (autoritatiivne leaf→root, resolver v2
    //      poolt arvutatud puu järgi — ainuke allikas, mis ALATI pöördub SSoT-sse)
    //   2. meiliHit.category_handles (Meili doc legacy candidates, sisaldab
    //      ka mitte-SSoT handleid — firstKnownHandle filtreerib nad välja)
    //   3. product.categories[].handle (Medusa links, järjekord juhuslik,
    //      Store API võib tagastada tühja listi kui kategooria pole publitseeritud)
    const taxonomyAncestors: string[] = meiliHit?.taxonomy?.ancestors || []
    const meiliCandidates: string[] = meiliHit?.category_handles || []
    const medusaCandidates: string[] = (product.categories || []).map((c) => c.handle).filter(Boolean)
    const candidates = [...taxonomyAncestors, ...meiliCandidates, ...medusaCandidates]
    const canonicalNode = firstKnownHandle(candidates)

    // Breadcrumb trail from SSoT only — NEVER fall back to VEVOR taxonomy.
    // Invariant 1 (§1) + INV-31: "portaalis on täpselt üks taksonoomia".
    // If the product has no v3 category yet, breadcrumb stays empty; the
    // product should surface in the review queue, not leak VEVOR paths.
    const productTypeTrail: Array<{ name: string; handle: string }> = canonicalNode
      ? getBreadcrumbTrail(canonicalNode.handle, locale)
      : []

    // Descriptions — locale-aware. For ET, prefer localizedDescription (metadata.description_et
    // or MeiliHit description_et). Sanitized HTML variants are EN-only right now; ET goes through
    // runtime sanitize on the plain-text translation.
    const mainDescriptionRaw = locale === "et"
      ? (localizedDescription || product.description || feedEntry?.descriptionHtml || null)
      : (product.description || feedEntry?.descriptionHtml || null)
    const mainSanitized = locale === "et"
      ? sanitizeHtml(mainDescriptionRaw || "")
      : (typeof metadata.sanitized_description === "string" && metadata.sanitized_description.length > 10
        ? metadata.sanitized_description
        : sanitizeHtml(mainDescriptionRaw || ""))
    // Structure plain <br>-separated text into <p>+<ul> for the fallback case.
    const mainDescriptionHtml = mainSanitized.includes("<p>") || mainSanitized.includes("<h")
      ? mainSanitized
      : structureMainDescription(mainSanitized)

    // Selling points — ET overlay if locale=et and metadata.selling_point_N_et present;
    // each slot independently falls back to EN if its ET twin is missing.
    const defaultSellingPoints: string[] = Array.isArray(metadata.selling_points) && metadata.selling_points.length > 0
      ? (metadata.selling_points as string[])
      : feedEntry?.sellingPoints || []
    const sellingPoints: string[] = locale === "et"
      ? [1, 2, 3, 4, 5]
          .map((i) => {
            const et = metadata[`selling_point_${i}_et`]
            return typeof et === "string" && et.trim() ? et : defaultSellingPoints[i - 1] || ""
          })
          .filter(Boolean)
      : defaultSellingPoints

    let richDescription: string | null = null
    // Locale-aware: eelista ET rich-description'i kui locale=et ja tõlge olemas
    // (tõlke-pipeline kirjutab metadata.sanitized_rich_description_et). Fallback EN.
    const richEt = locale === "et" && typeof metadata.sanitized_rich_description_et === "string" && metadata.sanitized_rich_description_et.length > 50
      ? metadata.sanitized_rich_description_et : null
    if (richEt) {
      richDescription = beautifyRichDescription(sanitizeHtml(richEt))
    } else if (typeof metadata.sanitized_rich_description === "string" && metadata.sanitized_rich_description.length > 50) {
      // Re-run sanitizeHtml — the pre-computed version may have been stored
      // before newer sanitize rules (e.g. orphan CSS selector stripping)
      // were added. Runtime re-sanitize is cheap (~5ms).
      richDescription = beautifyRichDescription(sanitizeHtml(metadata.sanitized_rich_description))
    } else {
      const rawRich = typeof metadata.rich_description === "string" && metadata.rich_description.length > 50
        ? metadata.rich_description : null
      if (rawRich) {
        let cleaned = rawRich
          .replace(/<!--\s*h5\s*-->[\s\S]*$/gi, "")
          .replace(/<div[^>]*class="m-banner"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "")
          .replace(/<img[^>]*src=["'][^"']*vevor-bmp-prm[^"']*["'][^>]*\/?>/gi, "")
          .replace(/<img[^>]*src=["'][^"']*boutique-banner[^"']*["'][^>]*\/?>/gi, "")
          .replace(/VEVOR is a leading brand[\s\S]*?global members\./gi, "")
          .replace(/Along with thousands[\s\S]*?global members\./gi, "")
          .replace(/<img[^>]*src=["'][^"']*-m\.[^"']*["'][^>]*\/?>/gi, "")
        const seenImgUrls = new Set<string>()
        cleaned = cleaned.replace(/<img[^>]*src=["']([^"'>]+)["'][^>]*\/?>/gi, (match, src) => {
          if (seenImgUrls.has(src)) return ""
          seenImgUrls.add(src)
          return match
        })
        richDescription = beautifyRichDescription(sanitizeHtml(cleaned))
      }
    }

    const categoryId = product.categories?.[0]?.id || null
    const meiliCategoryHandles: string[] = meiliHit?.category_handles || []
    const categoryHandle = product.categories?.[0]?.handle || meiliCategoryHandles[0] || null
    const productTypeL1 = (stringifyScalar(metadata.vevor_product_type) || feedEntry?.productType || "")
      .split(">")[0].trim()

    const priceFormatted = price ? formatPrice(price.calculated_amount, price.currency_code) : ""

    return NextResponse.json({
      product: {
        id: product.id,
        handle: product.handle,
        title: product.title,
        thumbnail: product.thumbnail,
        variants: product.variants || [],
        options: product.options,
        categories: product.categories,
      },
      localizedTitle,
      images,
      specs,
      sellingPoints,
      mainDescriptionHtml,
      richDescription,
      manualLinks: uniqueManuals,
      productTypeTrail,
      categoryId,
      categoryHandle,
      categoryHandles: meiliCategoryHandles,
      categoryName: product.categories?.[0]?.name || productTypeTrail[0]?.name || "Category",
      relatedSearchQuery: categoryId ? "" : productTypeL1,
      priceFormatted,
      priceAmount: price?.calculated_amount || 0,
      priceCurrency: price?.currency_code || "eur",
      originalAmount: price?.original_amount || 0,
      compareItem: {
        id: product.id,
        handle: product.handle,
        title: localizedTitle,
        thumbnail: product.thumbnail || null,
        price: priceFormatted,
        specs: Object.fromEntries(specs.map(s => [s.key, s.value])),
      },
      breadcrumbItems: [
        { name: "Home", url: `https://xlmarket.ee/${locale}` },
        ...productTypeTrail.map((seg) => ({
          name: seg.name,
          url: `https://xlmarket.ee${categoryPath(locale as "et" | "en", seg.handle)}`,
        })),
      ],
    }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    })
  } catch (e) {
    console.error("Product API error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
