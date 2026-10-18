import PDFDocument from "pdfkit"
import type { OrderData } from "./email.js"
import { computeInvoiceTotals } from "./invoice-totals.js"
import { getPage } from "../modules/cms/db.js"

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
    .replace(/ /g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?") // muu Latin-1-väline → ?
}

function fmt(amount: number, currency = "EUR"): string {
  return (amount / 100).toFixed(2).replace(".", ",") + " " + currency
}

// DD.MM.YYYY (Eesti formaat). created_at puudub → tänane kuupäev (makse kinnitatud = täna).
function fmtDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return fmtDate()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

// Müüja rekvisiidid (Eesti arve seadusnõue: nimi, reg-nr, KMKR, aadress) = CMS global SSoT
// (Tarmo 2026-10-18: "üks allikas", MITTE env). Sama allikas, mida storefront (lib/cms.ts) +
// JsonLd kasutavad. Loeme ET-rea (arve on eestikeelne); getPage fallbackib EN-ile. DB lugemine
// kukub / rida puudu → viimase-õlekõrre vaikeväärtused (resilience, nagu storefront global.json
// fallback) + VALJU hoiatus — arve peab ALATI renderduma (HARD RULE #6 ohutu vaikimisi).
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

export async function renderInvoicePdf(order: OrderData, orderNum: string | number): Promise<Buffer> {
  // Müüja andmed ENNE PDF-i ehitust (CMS global SSoT, async DB-lugemine).
  const company = await loadCompany(orderNum)
  const t = computeInvoiceTotals(order)
  const cur = order.currency_code

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 })
      const chunks: Buffer[] = []
      doc.on("data", (c: Buffer) => chunks.push(c))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      // Päis — müüja rekvisiidid (seadusnõue), CMS global SSoT-st
      doc.fontSize(22).fillColor("#111827").text("XLMARKET", 50, 50)
      doc.fontSize(10).fillColor("#6b7280").text(sanitize(company.name))
      doc.text(sanitize(`Reg-nr: ${company.reg}   KMKR: ${company.vat}`))
      doc.text(sanitize(company.address))
      doc.text(sanitize(`${company.email}  |  xlmarket.ee`))
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

      // Tooteread — BRUTO (unit_price on bruto, KM sees)
      doc.fontSize(11).fillColor("#111827").text("Tooted:")
      doc.fontSize(10).fillColor("#4b5563")
      for (const it of order.items || []) {
        const line = `${it.quantity} x ${it.title}  —  ${fmt(it.unit_price * it.quantity, it.currency_code || cur)}`
        doc.text(sanitize(line))
      }
      doc.moveDown()

      // Summad — KÕIK BRUTO, NÄHTAVALT liituvad (SSoT computeInvoiceTotals):
      //   Vahesumma (kaubad) + Tarne = Kokku tasutud.  "sh KM %" = sisalduv KM.
      doc.fillColor("#4b5563")
      doc.text(sanitize(`Vahesumma (kaubad): ${fmt(t.itemsGross, cur)}`))
      if (t.shippingGross) doc.text(sanitize(`Tarne: ${fmt(t.shippingGross, cur)}`))
      doc.moveDown(0.3)
      doc.fontSize(13).fillColor("#111827").text(sanitize(`Kokku tasutud: ${fmt(t.grandTotal, cur)}`))
      if (t.vat) {
        doc.fontSize(10).fillColor("#6b7280").text(sanitize(`sh KM ${t.vatRate}%: ${fmt(t.vat, cur)}`))
      }

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
