import PDFDocument from "pdfkit"
import type { OrderData } from "./email.js"
import { computeInvoiceTotals } from "./invoice-totals.js"
import {
  resolveLocale,
  resolveBuyer,
  resolveInvoiceNumber,
  itemTitle,
  LABELS,
  type InvoiceLocale,
} from "./invoice-view.js"
import { getPage } from "../modules/cms/db.js"

// Arve PDF-manus (Tarmo 2026-10-14). Kujundus uuendatud 2026-10-18 (Tarmo #4/#5): päris logo-kuju
// (bränd-wordmark XL + market), pealkiri ARVE, müüja + ostja plokid kõrvuti, toodete tabel
// (Toode | Kogus | Ühikuhind | Summa), summad paremal, jalus ettevõtte andmetega (CMS global SSoT).
//
// pdfkit standard-font (Helvetica) = WinAnsi/Latin-1 → EI vaja väliseid font-faile (konteineri-ohutu).
// Latin-1 katab eesti õäöü; väljaspool-kodeeringut märgid (š ž „ " – €) asendatakse ASCII-lähendiga.
// PDF on BEST-EFFORT: kukub → sendInvoice saadab maili ILMA manuseta (arve-tekst on ka HTML-is).
//
// LOGO "üks allikas" (Tarmo #4): bränd-wordmark elab storefront/public/logos/xlmarket-wordmark.svg-s
// kui TEKST-põhine SVG (süsteemifont) — pdfkitis ei embed'u puhtalt ilma font-failita. Siin
// taastoodame SAMA wordmark-i (sama värvid INK + TEAL, italic, "XL" bold + "market") pdfkiti
// sisseehitatud fontidega. SVG = disaini-SSoT (värv/italic/kuju). Soovi korral saab lülitada
// tõelisele SVG/PNG-embedile (vajab deps/committed PNG) — vt raport.

// ---- Bränd (SSoT: xlmarket-wordmark.svg) ----
const INK = "#1a1a2e" // "XL" + tume tekst
const TEAL = "#0ea5a0" // "market" + aktsent
const GREY = "#6b7280"
const LIGHT = "#9ca3af"
const LINE = "#e5e7eb"
const ROWLINE = "#f3f4f6"

// ---- Lehe geomeetria (A4) ----
const PAGE_W = 595.28
const PAGE_H = 841.89
const M = 40
const RIGHT = PAGE_W - M // 555.28
const FOOTER_Y = PAGE_H - 54
const BODY_BOTTOM = FOOTER_Y - 18

// ---- Tabeli veerud ----
const COL_PRODUCT_X = M
const COL_PRODUCT_W = 300
const COL_QTY_X = 345
const COL_QTY_W = 45
const COL_UNIT_X = 392
const COL_UNIT_W = 78
const COL_SUM_X = 474
const COL_SUM_W = RIGHT - COL_SUM_X // ends at RIGHT

// Latin-1-väline → lähim ASCII (muidu pdfkit viskab vea tundmatu glüüfi peal).
function sanitize(s: string | undefined | null): string {
  if (!s) return ""
  return String(s)
    .replace(/[Šš]/g, "s")
    .replace(/[Žž]/g, "z")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/€/g, "EUR")
    .replace(/ /g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?")
}

function fmt(amount: number, currency = "EUR"): string {
  return (amount / 100).toFixed(2).replace(".", ",") + " " + (currency || "EUR").toUpperCase()
}

// DD.MM.YYYY. created_at puudub → tänane (makse kinnitatud = täna).
function fmtDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return fmtDate()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

// Müüja rekvisiidid (Eesti arve seadusnõue) = CMS global SSoT (Tarmo: "üks allikas", MITTE env).
interface CompanyInfo {
  name: string
  reg: string
  vat: string
  address: string
  email: string
}

const COMPANY_FALLBACK: CompanyInfo = {
  name: "Roland Kaubandus OÜ",
  reg: "10327682",
  vat: "EE100217007",
  address: "Pärnu mnt 211, 11624 Tallinn",
  email: "info@xlmarket.ee",
}

async function loadCompany(orderNum: string | number): Promise<CompanyInfo> {
  try {
    const page = await getPage("global", "et")
    const c = (page?.content || {}) as Record<string, unknown>
    const s = (k: string) => (typeof c[k] === "string" ? (c[k] as string).trim() : "")
    const info: CompanyInfo = {
      name: s("company_name") || COMPANY_FALLBACK.name,
      reg: s("reg_number") || COMPANY_FALLBACK.reg,
      vat: s("vat_number") || COMPANY_FALLBACK.vat,
      address: s("address") || COMPANY_FALLBACK.address,
      email: s("email_info") || COMPANY_FALLBACK.email,
    }
    if (!page) {
      console.error(
        `[INVOICE] HOIATUS: CMS global puudub DB-s — kasutan müüja-rekvisiitide vaikeväärtusi (order=${orderNum})`
      )
    }
    return info
  } catch (e) {
    console.error(
      `[INVOICE] HOIATUS: CMS global lugemine kukkus — kasutan müüja-rekvisiitide vaikeväärtusi (order=${orderNum}): ${(e as Error)?.message || e}`
    )
    return COMPANY_FALLBACK
  }
}

export interface InvoicePdfOptions {
  locale?: InvoiceLocale // sunni keel (näidis-genereerimiseks); muidu resolveLocale(order)
  invoiceNumber?: string // sunni arve-number; muidu resolveInvoiceNumber(order)
}

export async function renderInvoicePdf(
  order: OrderData,
  orderNum: string | number,
  opts: InvoicePdfOptions = {}
): Promise<Buffer> {
  const company = await loadCompany(orderNum)
  const t = computeInvoiceTotals(order)
  const cur = order.currency_code
  const locale = opts.locale || resolveLocale(order)
  const L = LABELS[locale]
  const buyer = resolveBuyer(order, locale)
  const invNo = opts.invoiceNumber || resolveInvoiceNumber(order, orderNum)

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: M })
      const chunks: Buffer[] = []
      doc.on("data", (c: Buffer) => chunks.push(c))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // ---------- PÄIS: wordmark (vasak) + ARVE-plokk (parem) ----------
      const topY = M
      // Wordmark "XL" + "market" (sama kuju mis storefront-päis, bränd-SSoT)
      doc.font("Helvetica-BoldOblique").fontSize(30).fillColor(INK)
      doc.text("XL", M, topY, { lineBreak: false })
      const xlW = doc.widthOfString("XL")
      doc.font("Helvetica-Oblique").fontSize(30).fillColor(TEAL)
      doc.text("market", M + xlW + 1, topY, { lineBreak: false })

      // Parem: ARVE + number + kuupäev + staatus
      doc.font("Helvetica-Bold").fontSize(26).fillColor(INK)
      doc.text(L.invoice, RIGHT - 220, topY, { width: 220, align: "right" })
      doc.font("Helvetica").fontSize(10).fillColor(GREY)
      doc.text(sanitize(`${L.invoiceNo}: ${invNo}`), RIGHT - 220, topY + 34, { width: 220, align: "right" })
      doc.text(sanitize(`${L.date}: ${fmtDate(order.created_at)}`), RIGHT - 220, topY + 48, { width: 220, align: "right" })
      doc.fillColor(TEAL).text(sanitize(L.paid), RIGHT - 220, topY + 62, { width: 220, align: "right" })

      // Eraldusjoon
      let y = topY + 86
      doc.moveTo(M, y).lineTo(RIGHT, y).strokeColor(LINE).lineWidth(1).stroke()
      y += 16

      // ---------- MÜÜJA + OSTJA kõrvuti ----------
      const colLeftX = M
      const colRightX = M + 275
      const colW = 240
      const blockTop = y

      // Müüja (vasak)
      doc.font("Helvetica-Bold").fontSize(9).fillColor(LIGHT)
      doc.text(L.seller.toUpperCase(), colLeftX, blockTop, { width: colW })
      doc.font("Helvetica-Bold").fontSize(11).fillColor(INK)
      doc.text(sanitize(company.name), colLeftX, doc.y + 2, { width: colW })
      doc.font("Helvetica").fontSize(9).fillColor(GREY)
      doc.text(sanitize(`${L.regNr}: ${company.reg}   ${L.vat}: ${company.vat}`), colLeftX, doc.y + 1, { width: colW })
      doc.text(sanitize(company.address), colLeftX, doc.y + 1, { width: colW })
      doc.text(sanitize(company.email), colLeftX, doc.y + 1, { width: colW })
      const leftEnd = doc.y

      // Ostja (parem)
      doc.font("Helvetica-Bold").fontSize(9).fillColor(LIGHT)
      doc.text(L.buyer.toUpperCase(), colRightX, blockTop, { width: colW })
      doc.font("Helvetica-Bold").fontSize(11).fillColor(INK)
      doc.text(sanitize(buyer.name), colRightX, doc.y + 2, { width: colW })
      doc.font("Helvetica").fontSize(9).fillColor(GREY)
      if (buyer.regLine) doc.text(sanitize(buyer.regLine), colRightX, doc.y + 1, { width: colW })
      for (const ln of buyer.lines) doc.text(sanitize(ln), colRightX, doc.y + 1, { width: colW })
      if (buyer.email) doc.text(sanitize(buyer.email), colRightX, doc.y + 1, { width: colW })
      if (buyer.phone) doc.text(sanitize(`${L.phone}: ${buyer.phone}`), colRightX, doc.y + 1, { width: colW })
      const rightEnd = doc.y

      y = Math.max(leftEnd, rightEnd) + 20

      // ---------- TOODETE TABEL ----------
      const drawTableHeader = (yy: number): number => {
        doc.rect(M, yy, RIGHT - M, 22).fill(INK)
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff")
        const ty = yy + 7
        doc.text(L.colProduct, COL_PRODUCT_X + 6, ty, { width: COL_PRODUCT_W - 6 })
        doc.text(L.colQty, COL_QTY_X, ty, { width: COL_QTY_W, align: "center" })
        doc.text(L.colUnit, COL_UNIT_X, ty, { width: COL_UNIT_W, align: "right" })
        doc.text(L.colSum, COL_SUM_X, ty, { width: COL_SUM_W - 6, align: "right" })
        return yy + 22
      }

      y = drawTableHeader(y)

      doc.font("Helvetica").fontSize(9.5).fillColor("#374151")
      for (const it of order.items || []) {
        const title = sanitize(itemTitle(it, locale))
        const lineGross = it.total ?? it.unit_price * it.quantity
        const unit = it.unit_price
        const titleH = doc.heightOfString(title, { width: COL_PRODUCT_W - 12 })
        const rowH = Math.max(18, titleH + 8)

        // Lehe-murd: jäta ruumi jalusele
        if (y + rowH > BODY_BOTTOM) {
          doc.addPage()
          y = M
          y = drawTableHeader(y)
          doc.font("Helvetica").fontSize(9.5).fillColor("#374151")
        }

        const cy = y + 4
        doc.fillColor("#374151")
        doc.text(title, COL_PRODUCT_X + 6, cy, { width: COL_PRODUCT_W - 12 })
        doc.text(String(it.quantity), COL_QTY_X, cy, { width: COL_QTY_W, align: "center" })
        doc.text(fmt(unit, it.currency_code || cur), COL_UNIT_X, cy, { width: COL_UNIT_W, align: "right" })
        doc.text(fmt(lineGross, it.currency_code || cur), COL_SUM_X, cy, { width: COL_SUM_W - 6, align: "right" })

        y += rowH
        doc.moveTo(M, y).lineTo(RIGHT, y).strokeColor(ROWLINE).lineWidth(0.5).stroke()
      }

      // Tabeli-alune märge: hinnad on bruto (KM sees)
      doc.font("Helvetica").fontSize(8).fillColor(LIGHT)
      doc.text(sanitize(L.pricesInclVat), M, y + 5, { width: COL_PRODUCT_W })

      // ---------- SUMMAD (paremal) ----------
      y += 14
      const totalsLabelX = 300
      const totalsLabelW = 150
      const totalsValX = 455
      const totalsValW = RIGHT - totalsValX
      const totalRow = (label: string, value: string, bold = false, color = GREY) => {
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10).fillColor(color)
        doc.text(sanitize(label), totalsLabelX, y, { width: totalsLabelW, align: "right" })
        doc.text(sanitize(value), totalsValX, y, { width: totalsValW, align: "right" })
        y += bold ? 20 : 15
      }

      totalRow(`${L.subtotal}:`, fmt(t.itemsGross, cur))
      if (t.shippingGross) totalRow(`${L.shipping}:`, fmt(t.shippingGross, cur))
      y += 2
      doc.moveTo(totalsLabelX, y).lineTo(RIGHT, y).strokeColor(LINE).lineWidth(1).stroke()
      y += 6
      totalRow(`${L.total}:`, fmt(t.grandTotal, cur), true, INK)
      // KM-kokkuvõte (KMS § 37: maksustatav väärtus + käibemaksu summa). Read jäävad bruto.
      if (t.vat) {
        y += 8
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(LIGHT)
        doc.text(sanitize(L.vatSummaryTitle.toUpperCase()), totalsLabelX, y, {
          width: totalsValW + (totalsValX - totalsLabelX),
          align: "right",
          characterSpacing: 0.5,
        })
        y += 12
        totalRow(`${L.netAmount}:`, fmt(t.net, cur))
        totalRow(`${L.vatAmount(t.vatRate)}:`, fmt(t.vat, cur))
        totalRow(`${L.grandTotal}:`, fmt(t.grandTotal, cur))
      }

      // ---------- JALUS (ettevõtte andmed, CMS global SSoT) ----------
      doc.moveTo(M, FOOTER_Y - 10).lineTo(RIGHT, FOOTER_Y - 10).strokeColor(LINE).lineWidth(0.5).stroke()
      doc.font("Helvetica").fontSize(8).fillColor(LIGHT)
      const footer = `${company.name}  ·  ${L.regNr}: ${company.reg}  ·  ${L.vat}: ${company.vat}  ·  ${company.address}  ·  ${company.email}  ·  xlmarket.ee`
      doc.text(sanitize(footer), M, FOOTER_Y, { width: RIGHT - M, align: "center" })

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
