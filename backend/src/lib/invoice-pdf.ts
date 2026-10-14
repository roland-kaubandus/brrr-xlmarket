import PDFDocument from "pdfkit"
import type { OrderData } from "./email.js"

// Arve PDF-manus (Tarmo 2026-10-14: "arve PDF-manusena, kui võimalik").
// pdfkit standard-font (Helvetica) = WinAnsi/Latin-1 kodeering → EI vaja väliseid font-faile
// (konteineri-ohutu). Latin-1 katab eesti õäöü; väljaspool-kodeeringut märgid (š ž „ " – €)
// asendatakse ASCII-lähendiga, et vältida genereerimis-viga. PDF on BEST-EFFORT: kui genereerimine
// kukub, sendInvoice saadab maili ILMA manuseta (arve-tekst on ka HTML-is). Vt email.ts sendInvoice.

// Latin-1-väline → lähim ASCII (muidu pdfkit viskab vea tundmatu glüüfi peal).
function sanitize(s: string | undefined | null): string {
  if (!s) return ""
  return String(s)
    .replace(/[Šš]/g, "s") // Š š
    .replace(/[Žž]/g, "z") // Ž ž
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/€/g, "EUR")
    .replace(/ /g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?") // muu Latin-1-väline → ?
}

function fmt(amount: number, currency = "EUR"): string {
  return (amount / 100).toFixed(2).replace(".", ",") + " " + currency
}

export function renderInvoicePdf(order: OrderData, orderNum: string | number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 })
      const chunks: Buffer[] = []
      doc.on("data", (c: Buffer) => chunks.push(c))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // Päis
      doc.fontSize(22).fillColor("#111827").text("XLMARKET", 50, 50)
      doc.fontSize(10).fillColor("#6b7280").text("Roland Kaubandus OU")
      doc.text("info@xlmarket.ee  |  xlmarket.ee")
      doc.moveDown(1.5)

      // Arve pealkiri
      doc.fontSize(16).fillColor("#111827").text(sanitize(`Arve #${orderNum}`))
      doc.fontSize(10).fillColor("#6b7280").text("Makse on kinnitatud")
      doc.moveDown()

      // Tarneaadress
      const a = order.shipping_address
      if (a) {
        doc.fontSize(11).fillColor("#111827").text("Tarneaadress:")
        doc.fontSize(10).fillColor("#4b5563")
        doc.text(sanitize(`${a.first_name || ""} ${a.last_name || ""}`.trim()))
        if (a.address_1) doc.text(sanitize(a.address_1))
        doc.text(sanitize(`${a.postal_code || ""} ${a.city || ""}`.trim()))
        if (a.phone) doc.text(sanitize(`Tel: ${a.phone}`))
        doc.moveDown()
      }

      // Tooteread
      doc.fontSize(11).fillColor("#111827").text("Tooted:")
      doc.fontSize(10).fillColor("#4b5563")
      for (const it of order.items || []) {
        const line = `${it.quantity} x ${it.title}  —  ${fmt(it.unit_price * it.quantity, it.currency_code || order.currency_code)}`
        doc.text(sanitize(line))
      }
      doc.moveDown()

      // Summad
      doc.fillColor("#4b5563")
      if (order.subtotal) doc.text(sanitize(`Vahesumma: ${fmt(order.subtotal, order.currency_code)}`))
      if (order.shipping_total) doc.text(sanitize(`Tarne: ${fmt(order.shipping_total, order.currency_code)}`))
      if (order.tax_total) doc.text(sanitize(`KM: ${fmt(order.tax_total, order.currency_code)}`))
      doc.moveDown(0.3)
      doc.fontSize(13).fillColor("#111827").text(sanitize(`Kokku tasutud: ${fmt(order.total, order.currency_code)}`))

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
