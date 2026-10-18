import type { OrderData } from "./email.js"

// Arve summad — ÜKS SSoT nii PDF-ile (invoice-pdf.ts) kui HTML-arvele (email.ts sendInvoice).
// HARD RULE #5: üks transform, kaks kutsujat → PDF ja HTML EI lahkne kunagi.
//
// KÕIK BRUTO (KM sees). Pood on tax-inclusive (Medusa region is_tax_inclusive=true) → unit_price
// JA order.total sisaldavad juba 24% KM; klient maksis bruto-hinnad. Varasem bug SEGAS aluseid:
// tooterida bruto (48,52), Vahesumma NETO (43,15), Tarne bruto (4,99) → 43,15+4,99+10,36 ≠ 53,51.
// Nüüd kõik bruto → NÄHTAVALT liitub:  itemsGross + shippingGross = grandTotal  (= order.total).
// "sh KM" = SISALDUV käibemaks (informatiivne, EI liideta peale).
export interface InvoiceTotals {
  itemsGross: number // kaubad kokku bruto (= Σ unit_price*qty = order.total - tarne)
  shippingGross: number // tarne bruto
  grandTotal: number // kokku bruto (= order.total)
  vat: number // sisalduv käibemaks (order.tax_total)
  vatRate: number // KM määr % (arvutatud tegelikust, fallback 24 = Eesti sell_vat SSoT)
  currency: string
}

export function computeInvoiceTotals(order: OrderData): InvoiceTotals {
  const shippingGross = order.shipping_total || 0
  const grandTotal = order.total || 0
  // Kaubad bruto = KÕIGI tooteridade summa (unit_price on bruto). Tax-inclusive poes kehtib
  // Σ(unit_price*qty) + tarne = order.total → tuletame itemsGross order.total-ist, et GARANTEERIDA
  // liitumine (ei sõltu rea-tasandi ümardusest). Fallback ridade summale, kui väljad puuduvad.
  let itemsGross = grandTotal - shippingGross
  if (!(itemsGross > 0)) {
    itemsGross = (order.items || []).reduce(
      (s, it) => s + (it.total ?? it.unit_price * it.quantity),
      0
    )
  }
  const vat = order.tax_total || 0
  const net = grandTotal - vat
  // Määr arvutatakse tegelikust (KM / neto) — EI hardcode'i, et vältida triivi; fallback 24%
  // (pricing-rules.yaml:sell_vat_rate). net<=0 → fallback.
  const vatRate = net > 0 && vat > 0 ? Math.round((vat / net) * 100) : 24
  return { itemsGross, shippingGross, grandTotal, vat, vatRate, currency: order.currency_code }
}
