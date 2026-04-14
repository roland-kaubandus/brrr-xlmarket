import { NextRequest, NextResponse } from "next/server"
import { getProduct, getCategoryByHandle, formatPrice } from "@/lib/medusa"
import { getProductMedia } from "@/lib/product-media"
import { getVevorFeedEntryAsync } from "@/lib/vevor-feed"
import { getMeiliProductByHandle, getLocalizedTitle } from "@/lib/meilisearch"
import { sanitizeHtml } from "@/lib/sanitize"
import { categoryPath } from "@/lib/i18n"

function stringifyScalar(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
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
    const linkedCategory = product.categories?.[0]

    const [meiliHit, feedEntry, media, catWithAncestors] = await Promise.all([
      locale === "en" ? getMeiliProductByHandle(handle) : Promise.resolve(null),
      getVevorFeedEntryAsync({
        vevorSku: stringifyScalar(metadata.vevor_sku),
        vevorUpc: stringifyScalar(metadata.vevor_upc),
      }),
      getProductMedia({
        vevorUpc: stringifyScalar(metadata.vevor_upc),
        vevorSku: stringifyScalar(metadata.vevor_sku),
      }),
      linkedCategory?.handle ? getCategoryByHandle(linkedCategory.handle) : Promise.resolve(null),
    ])

    const localizedTitle = meiliHit ? getLocalizedTitle(meiliHit, locale) : product.title
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
    const candidates = ["manuals", "manual_urls", "pdfs", "pdf_urls", "manual_files"]
    for (const key of candidates) {
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

    // Breadcrumb
    const rawType = stringifyScalar(metadata.vevor_product_type) || feedEntry?.productType || null
    let productTypeTrail = rawType
      ? rawType.split(">").map(s => s.trim()).filter(Boolean).map(name => ({ name, handle: slugify(name) }))
      : []
    if (catWithAncestors) {
      const trail: Array<{ name: string; handle: string }> = []
      const visited = new Set<string>()
      let parent = catWithAncestors.parent_category
      while (parent && !visited.has((parent as any).id) && trail.length < 20) {
        visited.add((parent as any).id)
        trail.unshift({ name: parent.name, handle: parent.handle })
        parent = (parent as any).parent_category
      }
      trail.push({ name: catWithAncestors.name, handle: catWithAncestors.handle })
      productTypeTrail = trail
    }

    // Descriptions — prefer pre-computed sanitized HTML from feed import
    const mainDescriptionRaw = product.description || feedEntry?.descriptionHtml || null
    const mainDescriptionHtml = typeof metadata.sanitized_description === "string" && metadata.sanitized_description.length > 10
      ? metadata.sanitized_description
      : sanitizeHtml(mainDescriptionRaw || "")

    const sellingPoints: string[] = Array.isArray(metadata.selling_points) && metadata.selling_points.length > 0
      ? (metadata.selling_points as string[])
      : feedEntry?.sellingPoints || []

    let richDescription: string | null = null
    if (typeof metadata.sanitized_rich_description === "string" && metadata.sanitized_rich_description.length > 50) {
      richDescription = metadata.sanitized_rich_description
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
        richDescription = sanitizeHtml(cleaned)
      }
    }

    const categoryId = product.categories?.[0]?.id || null
    const categoryHandle = product.categories?.[0]?.handle || null
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
        { name: locale === "et" ? "Avaleht" : "Home", url: `https://xlmarket.store/${locale}` },
        ...productTypeTrail.map((seg) => ({
          name: seg.name,
          url: `https://xlmarket.store${categoryPath(locale as "et" | "en", seg.handle)}`,
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
