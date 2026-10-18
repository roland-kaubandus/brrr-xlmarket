import type { OrderData, OrderItem } from "./email.js"

// Arve VAADE — jagatud andmekiht nii PDF-ile (invoice-pdf.ts) kui HTML-arvele (email.ts).
// HARD RULE #5: üks transform (ostja-plokk · tootenimi · sildid · arve-number), kaks kutsujat →
// PDF ja HTML EI lahkne. Summad tulevad invoice-totals.ts-st (sama muster).

export type InvoiceLocale = "et" | "en"

// Tellimuse keel: eelista eksplitsiitset order.locale, siis metadata.locale; fallback "et"
// (pood on Eesti-primaarne). NB: kassas keelt PRAEGU EI salvestata (storefront ei saada) —
// seega prod-arve on seni "et". EN-arve nõuab kassa-muudatust (locale metadata'sse). Vt raport.
export function resolveLocale(order: OrderData): InvoiceLocale {
  const raw = (order.locale || (order.metadata?.locale as string) || "").toLowerCase()
  return raw === "en" ? "en" : "et"
}

// Tootenimi tellimuse keeles (Tarmo #1): ET → title_et kui olemas, muidu baas-title (fallback).
// EN → baas-title (title on EN-baseline). title_et tuleb items.product.metadata-st (vt order-placed.ts).
export function itemTitle(it: OrderItem, locale: InvoiceLocale): string {
  if (locale === "et") {
    const et = (it.title_et || "").trim()
    if (et) return et
  }
  return it.title
}

// Arve number (Tarmo #3): praegu = tellimuse nr (#N). Kui tellimusele on määratud eraldi
// arve-seeria number (order.metadata.invoice_number / order.invoice_number), kasuta seda.
// Seeria-loogika (XL-AAAA-NNNNN, järjestikune) on eraldi samm — kuni siis fallback #N.
export function resolveInvoiceNumber(order: OrderData, orderNum: string | number): string {
  const explicit = (order.invoice_number || (order.metadata?.invoice_number as string) || "").trim()
  return explicit || `#${orderNum}`
}

export interface Buyer {
  isCompany: boolean
  name: string // ettevõtte nimi VÕI eraisiku täisnimi
  regLine?: string // "Reg-nr: X   KMKR: Y" (ainult ettevõttel)
  lines: string[] // kontakt-isik (ettevõttel) + aadressiread
  email?: string
  phone?: string
}

// Ostja-plokk (Tarmo #2): ETTEVÕTE kui andmed olemas (nimi + reg + KMKR), muidu ERAISIK (nimi + aadress).
// Ettevõtte-väljad: order.company.{name,reg,vat} VÕI billing_address.company (+ order.metadata).
// NB: kassas EI koguta PRAEGU ettevõtte-välju → reaalne tellimus on seni eraisik. Plokk on
// edasi-ühilduv: niipea kui kassa saadab firma-andmed, kuvatakse ettevõtte-ostja automaatselt.
export function resolveBuyer(order: OrderData, locale: InvoiceLocale): Buyer {
  const a = order.billing_address || order.shipping_address
  const L = LABELS[locale]
  const companyName = (
    order.company?.name ||
    (a as { company?: string } | undefined)?.company ||
    (order.metadata?.company_name as string) ||
    ""
  ).trim()
  const reg = (order.company?.reg || (order.metadata?.company_reg as string) || "").trim()
  const vat = (order.company?.vat || (order.metadata?.company_vat as string) || "").trim()
  const person = `${a?.first_name || ""} ${a?.last_name || ""}`.trim()

  const addressLines: string[] = []
  if (a?.address_1) addressLines.push(a.address_1)
  const cityLine = `${a?.postal_code || ""} ${a?.city || ""}`.trim()
  if (cityLine) addressLines.push(cityLine)

  if (companyName) {
    const regParts: string[] = []
    if (reg) regParts.push(`${L.regNr}: ${reg}`)
    if (vat) regParts.push(`${L.vat}: ${vat}`)
    return {
      isCompany: true,
      name: companyName,
      regLine: regParts.length ? regParts.join("   ") : undefined,
      lines: [...(person ? [`${L.contact}: ${person}`] : []), ...addressLines],
      email: order.email,
      phone: a?.phone,
    }
  }
  return {
    isCompany: false,
    name: person || L.client,
    lines: addressLines,
    email: order.email,
    phone: a?.phone,
  }
}

// Sildid — arve lokaliseeritakse tervikuna tellimuse keele järgi (ET/EN).
export interface InvoiceLabels {
  invoice: string
  seller: string
  buyer: string
  invoiceNo: string
  date: string
  paid: string
  colProduct: string
  colQty: string
  colUnit: string
  colSum: string
  subtotal: string
  shipping: string
  total: string
  vatIncl: (rate: number) => string
  vatSummaryTitle: string // KM-kokkuvõtte ploki pealkiri (KMS § 37)
  netAmount: string // KMS § 37: maksustatav väärtus (summa käibemaksuta)
  vatAmount: (rate: number) => string // "Käibemaks 24%"
  grandTotal: string // KM-kokkuvõtte "Kokku" rida (bruto)
  pricesInclVat: string // tabeli-alune märge
  regNr: string
  vat: string
  contact: string
  client: string
  phone: string
  questions: (email: string) => string
}

export const LABELS: Record<InvoiceLocale, InvoiceLabels> = {
  et: {
    invoice: "ARVE",
    seller: "Müüja",
    buyer: "Ostja",
    invoiceNo: "Arve nr",
    date: "Kuupäev",
    paid: "Makse on kinnitatud",
    colProduct: "Toode",
    colQty: "Kogus",
    colUnit: "Ühikuhind",
    colSum: "Summa",
    subtotal: "Vahesumma (kaubad)",
    shipping: "Tarne",
    total: "Kokku tasutud",
    vatIncl: (r) => `sh KM ${r}%`,
    vatSummaryTitle: "Käibemaksu kokkuvõte",
    netAmount: "Summa käibemaksuta",
    vatAmount: (r) => `Käibemaks ${r}%`,
    grandTotal: "Kokku",
    pricesInclVat: "Hinnad sisaldavad käibemaksu",
    regNr: "Reg-nr",
    vat: "KMKR",
    contact: "Kontakt",
    client: "Klient",
    phone: "Tel",
    questions: (e) => `Küsimuste korral kirjutage ${e}`,
  },
  en: {
    invoice: "INVOICE",
    seller: "Seller",
    buyer: "Buyer",
    invoiceNo: "Invoice no",
    date: "Date",
    paid: "Payment confirmed",
    colProduct: "Product",
    colQty: "Qty",
    colUnit: "Unit price",
    colSum: "Amount",
    subtotal: "Subtotal (goods)",
    shipping: "Shipping",
    total: "Total paid",
    vatIncl: (r) => `incl. VAT ${r}%`,
    vatSummaryTitle: "VAT summary",
    netAmount: "Amount excl. VAT",
    vatAmount: (r) => `VAT ${r}%`,
    grandTotal: "Total",
    pricesInclVat: "Prices include VAT",
    regNr: "Reg. no",
    vat: "VAT",
    contact: "Contact",
    client: "Customer",
    phone: "Tel",
    questions: (e) => `Questions? Write to ${e}`,
  },
}
