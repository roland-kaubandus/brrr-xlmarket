/**
 * powermat.mjs — Powermat (powermat-hurt.pl) XML feed adapter.
 * Feed: http://powermat-hurt.pl/uploads/soteshopxml.xml (~1882 toodet, poola keeles).
 * Loeb XML → NormalizedRow[] (vt backend/src/feeds/README.md).
 *
 * Struktuur: <products><product code ean active><name><description HTML pl>
 *   <stock><tax><price netto><wholesale group a/b/c><categories><photos><attributes>
 *
 * NB Powermat = HULGImüüja ("hurt"). Hinnad on NETTO (ilma 23% PL käibemaksuta).
 * - price = wholesale group-a netto (meie ostuhind) — markup rakendub pipeline'is.
 * - Kategooriad = poola path'id (mapitakse powermat-to-v3.json kaudu, TULEVANE).
 * - Kirjeldus poola keeles → ET-tõlge tuleb pipeline'i tõlke-sammus.
 */
import { readFileSync } from "node:fs"
import { XMLParser } from "fast-xml-parser"
import { namespaceSku } from "../normalize.mjs"

function toNum(v) {
  const n = parseFloat(String(v == null ? "" : v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {string} filePath - XML faili tee
 * @param {object} feed - feeds.yaml konfiguratsioon (sku_prefix=PM, brand_lock, image_source, id)
 * @returns {Promise<Array>} NormalizedRow[]
 */
export async function parse(filePath, feed) {
  const xml = readFileSync(filePath, "utf8")
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    textNodeName: "#text",
    parseTagValue: false,
    trimValues: true,
  })
  const doc = parser.parse(xml)
  const list = doc?.products?.product
  const products = Array.isArray(list) ? list : list ? [list] : []

  const cdata = (v) => {
    if (v == null) return ""
    if (typeof v === "string") return v
    if (v.__cdata != null) return String(v.__cdata)
    if (v["#text"] != null) return String(v["#text"])
    return ""
  }

  const out = []
  for (const p of products) {
    if (p["@_active"] === "false") continue
    const rawSku = String(p["@_code"] || "").trim()
    if (!rawSku) continue

    // Hinnad: wholesale group-a netto eelistatud (ostuhind), fallback retail netto
    let priceNet = 0
    const wp = p.wholesale?.price
    if (wp) {
      const arr = Array.isArray(wp) ? wp : [wp]
      const a = arr.find((x) => x["@_group"] === "a")
      priceNet = toNum(cdata(a) || a?.["#text"] || a)
    }
    if (!priceNet) priceNet = toNum(cdata(p.price) || p.price?.["#text"] || p.price)

    // Kategooriad: vali main="true", strip "Lista produktów/" prefiks
    let catPath = ""
    const cats = p.categories?.category
    if (cats) {
      const arr = Array.isArray(cats) ? cats : [cats]
      const main = arr.find((x) => x["@_main"] === "true") || arr[arr.length - 1]
      catPath = cdata(main).replace(/^Lista produktów\//i, "").trim()
    }

    // Pildid
    const photos = p.photos?.photo
    const photoArr = photos ? (Array.isArray(photos) ? photos : [photos]) : []
    const images = photoArr.map((ph) => cdata(ph) || ph?.["#text"] || ph).filter(Boolean)
    const mainImg = photoArr.find((ph) => ph["@_main"] === "true")
    const mainImage = mainImg ? (cdata(mainImg) || mainImg["#text"] || mainImg) : images[0] || ""

    // Atribuudid (specid)
    const attrs = p.attributes?.attribute
    const attrArr = attrs ? (Array.isArray(attrs) ? attrs : [attrs]) : []
    const attributes = {}
    for (const a of attrArr) {
      const name = String(a["@_name"] || "").trim()
      const val = cdata(a.value)
      if (name && val) attributes[name] = val
    }

    const stock = toNum(p.stock?.["#text"] ?? p.stock)

    out.push({
      source: feed.id,
      supplier_sku: namespaceSku(feed.sku_prefix, rawSku),
      raw_sku: rawSku,
      title: cdata(p.name),
      description: cdata(p.description),
      rich_description_html: cdata(p.description) || null,
      brand: feed.brand_lock || cdata(p.producer) || "Powermat",
      product_type: catPath, // poola category path — resolver mapib (powermat-to-v3.json)
      price: priceNet, // NETTO ostuhind — markup rakendub pipeline'is
      availability: stock > 0 ? "in stock" : "out of stock",
      inventory: Math.round(stock),
      weight: toNum(p.weight?.["#text"] ?? p.weight),
      dimensions: { high: null, wide: null, long: null, unit: "cm" }, // feed ei anna
      images: {
        main: mainImage,
        main_original: null,
        gallery: images,
        original: images,
        image_source: feed.image_source || "powermat",
      },
      selling_points: [], // Powermat: pole struktureeritud (ainult description HTML)
      upc: String(p["@_ean"] || "").trim(),
      spu: null,
      link: cdata(p.url),
      _powermat: { tax: toNum(p.tax?.["#text"] ?? p.tax), retail_net: toNum(cdata(p.price) || p.price), attributes },
    })
  }
  return out
}
