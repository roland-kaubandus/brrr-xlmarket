/**
 * vevor.mjs — VEVOR XLSX feed adapter.
 * Loeb vevor-571.xlsx → NormalizedRow[] (vt backend/src/feeds/README.md).
 *
 * Veeru-mapping peegeldab scripts/import-vevor-feed.mjs readFeed()'i (SSoT seal kuni
 * migratsioonini). Lisab: SKU-namespace (sku_prefix) + image_source.
 */
import XLSX from "xlsx"
import { namespaceSku, parsePrice } from "../normalize.mjs"

/**
 * @param {string} filePath - XLSX faili tee
 * @param {object} feed - feeds.yaml feed-konfiguratsioon (sku_prefix, brand_lock, image_source, id)
 * @returns {Promise<Array>} NormalizedRow[]
 */
export async function parse(filePath, feed) {
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws)

  const out = []
  for (const r of raw) {
    const rawSku = String(r["SKU"] || "").trim()
    if (!rawSku) continue
    const price = parsePrice(r["Price"])
    if (!price) continue

    const sellingPoints = []
    for (let i = 1; i <= 5; i++) {
      const sp = String(r["Selling point " + i] || "").trim()
      if (sp) sellingPoints.push(sp)
    }

    const original = String(r["goods_original_picture"] || "").split(",").map((u) => u.trim()).filter(Boolean)
    const gallery = String(r["image_link1"] || "").split(",").map((u) => u.trim()).filter(Boolean)

    out.push({
      source: feed.id,
      supplier_sku: namespaceSku(feed.sku_prefix, rawSku),
      raw_sku: rawSku,
      title: String(r["Product title"] || "").trim(),
      description: String(r["Product description"] || "").trim(),
      rich_description_html: String(r["description_html"] || "").trim() || null,
      brand: feed.brand_lock || String(r["Brand"] || "").trim(),
      product_type: String(r["Product type"] || "").trim(),
      price, // ALGHIND — markup rakendub pipeline'is
      availability: String(r["Availability"] || "").trim().toLowerCase(),
      inventory: parseInt(r["Inventory quantity"]) || 0,
      weight: parseFloat(r["Product weight(KG)"]) || 0,
      dimensions: {
        high: parseFloat(r["High"]) || null,
        wide: parseFloat(r["Wide"]) || null,
        long: parseFloat(r["Long"]) || null,
        unit: String(r["goods_size_unit"] || "cm").trim(),
      },
      images: {
        main: String(r["Image link"] || "").trim(),
        main_original: String(r["goods_main_original_picture"] || "").trim() || null,
        gallery,
        original,
        image_source: feed.image_source || "vevor_cdn",
      },
      selling_points: sellingPoints,
      upc: String(r["UPC"] || "").trim(),
      spu: String(r["goods_spu"] || "").trim() || null,
      link: String(r["Product link"] || "").trim(),
    })
  }
  return out
}
