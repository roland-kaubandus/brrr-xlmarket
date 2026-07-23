// feed-stock.mjs — ÜKS saadavuse-tõde VEVOR-feedist (churned/OOS otsus).
//
// MIKS JAGATUD (2026-07-23): saadavusel oli KAKS lahknevat tõe-allikat — kategooria-kaart
// luges Meili `in_stock` (õige "Otsas"), aga tooteleht + ostukorv lugesid Medusa dummy
// inventory=100 (vale "Laos" + ostunupp) → klient sai osta tarnimatu churned toote.
// Parandus = KAKS projektsiooni, ÜKS otsus: seesama `isOosFromFeed` juhib nii Meili
// `in_stock` (index-meilisearch.mjs) KUI Medusa `stocked_quantity` (sync-medusa-inventory.mjs).
// Definitsioon EI TOHI enam lahkneda — mõlemad impordivad siit.
//
// Otsus on PUHAS: kutsuja laeb ise cache'i (bySku) ja annab edasi → mälu-jaotus jääb kutsujale,
// loogika jääb siia. `bySku` = feed-cache `bySku` map (SKU → { availability, inventoryQuantity }).

/**
 * Kas toode on feedi järgi OTSAS (out of stock)?
 * @param {string} sku          variandi SKU
 * @param {object} meta         product.metadata (vevor_sku churned-tuvastuseks)
 * @param {object} bySku        feed-cache bySku map
 * @returns {boolean}           true = OOS (Meili in_stock=false / Medusa stocked=0)
 */
export function isOosFromFeed(sku, meta, bySku) {
  if (!sku) return false
  // SAFETY-GUARD: tühi/puuduv cache → ÄRA OOS'i kõike (churned-loogika vajab TÖÖTAVAT cache't).
  // Ilma selleta: cache puudub → iga toode "pole feedis" → kõik OOS. Tühi → vana ohutu (laos).
  if (!bySku || Object.keys(bySku).length === 0) return false
  const entry = bySku[String(sku).trim()]
  if (entry) {
    // Feedis OLEMAS: austa feedi enda saadavust (feed võib toote OOS-iks märkida ka kohalolles).
    if (entry.availability && entry.availability !== "in stock") return true
    if ((entry.inventoryQuantity || 0) === 0) return true
    return false
  }
  // POLE feedis: churned dropship → OOS AINULT kui feed-managed (variant-sku === vevor_sku).
  // Custom/Outlet (sku ≠ vevor_sku) → jäta saadavaks (pole feedi-juhitud).
  const vevorSku = meta && meta.vevor_sku ? String(meta.vevor_sku).trim() : null
  return vevorSku && vevorSku === String(sku).trim() ? true : false
}
