import { readdir } from "node:fs/promises"
import path from "node:path"

type ProductMedia = {
  images: Array<{ id: string; url: string }>
  manuals: Array<{ label: string; href: string }>
}

const MEDIA_ROOT = "/var/www/xlmarket-media"
const PRODUCT_MEDIA_BASE = "/media/products"
const MANUAL_MEDIA_BASE = "/media/manuals"

async function safeReadDir(targetPath: string) {
  try {
    return await readdir(targetPath, { withFileTypes: true })
  } catch {
    return []
  }
}

export async function getProductMedia(params: {
  vevorUpc?: string | null
  vevorSku?: string | null
}): Promise<ProductMedia> {
  const upc = String(params.vevorUpc || "").trim()
  const sku = String(params.vevorSku || "").trim()

  const [imageEntries, manualEntries] = await Promise.all([
    upc ? safeReadDir(path.join(MEDIA_ROOT, "products", upc)) : Promise.resolve([]),
    sku ? safeReadDir(path.join(MEDIA_ROOT, "manuals", sku)) : Promise.resolve([]),
  ])

  const images = imageEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(webp|png|jpe?g|avif)$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((name, index) => ({
      id: `media_${index}_${name}`,
      url: `${PRODUCT_MEDIA_BASE}/${upc}/${encodeURIComponent(name)}`,
    }))

  const manuals = manualEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.pdf$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((name, index) => ({
      label: `Manuaal ${index + 1}`,
      href: `${MANUAL_MEDIA_BASE}/${sku}/${encodeURIComponent(name)}`,
    }))

  return { images, manuals }
}
