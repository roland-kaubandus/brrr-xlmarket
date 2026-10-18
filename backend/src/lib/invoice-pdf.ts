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

// Müüja rekvisiidid (Eesti arve seadusnõue: nimi, reg-nr, KMKR, aadress). Env kirjutab üle;
// reg + KMKR = Tarmo kinnitatud (2026-10-18) → vaikeväärtus. AADRESS = ainult env-ist (EI leiuta
// registrijärgset aadressi) — kui COMPANY_ADDRESS puudub, jäetakse aadressirida välja + hoiatus logis.
const COMPANY_NAME = process.env.COMPANY_NAME || "Roland Kaubandus OÜ"
const COMPANY_REG = process.env.COMPANY_REG || "10327682"
const COMPANY_VAT = process.env.COMPANY_VAT || "EE100217007"
const COMPANY_ADDRESS = (process.env.COMPANY_ADDRESS || "").trim()
const COMPANY_EMAIL = process.env.EMAIL_INFO || "info@xlmarket.ee"

// DD.MM.YYYY (Eesti formaat). created_at puudub → tänane kuupäev (makse kinnitatud = täna).
function fmtDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return fmtDate()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

export function renderInvoicePdf(order: OrderData, orderNum: string | number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 })
      const chunks: Buffer[] = []
      doc.on("data", (c: Buffer) => chunks.push(c))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // Päis — müüja rekvisiidid (seadusnõue)
      doc.fontSize(22).fillColor("#111827").text("XLMARKET", 50, 50)
      doc.fontSize(10).fillColor("#6b7280").text(sanitize(COMPANY_NAME))
      doc.text(sanitize(`Reg-nr: ${COMPANY_REG}   KMKR: ${COMPANY_VAT}`))
      if (COMPANY_ADDRESS) {
        doc.text(sanitize(COMPANY_ADDRESS))
      } else {
        console.error(
          `[INVOICE] HOIATUS: COMPANY_ADDRESS env puudub — müüja aadress jäetakse arvelt välja (order=${orderNum})`
        )
      }
      doc.text(sanitize(`${COMPANY_EMAIL}  |  xlmarket.ee`))
      doc.moveDown(1.5)

      // Arve pealkiri + kuupäev
      doc.fontSize(16).fillColor("#111827").text(sanitize(`Arve #${orderNum}`))
      doc.fontSize(10).fillColor("#6b7280").text(sanitize(`Kuupäev: ${fmtDate(order.created_at)}`))
      doc.text("Makse on kinnitatud")
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
      if (order.tax_total) {
        // KM eraldi real + määr (%). Määr arvutatakse tegelikust (tax / neto) — EI hardcode'i,
        // et vältida triivi; fallback 24% (Eesti sell_vat SSoT pricing-rules.yaml). Tax-inclusive:
        // neto = total - tax.
        const net = order.total - order.tax_total
        const rate = net > 0 ? Math.round((order.tax_total / net) * 100) : 24
        doc.text(sanitize(`KM ${rate}%: ${fmt(order.tax_total, order.currency_code)}`))
      }
      doc.moveDown(0.3)
      doc.fontSize(13).fillColor("#111827").text(sanitize(`Kokku tasutud: ${fmt(order.total, order.currency_code)}`))

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
