import nodemailer from "nodemailer"
import { notifyTelegram } from "./telegram.js"
import { computeInvoiceTotals } from "./invoice-totals.js"
import { resolveLocale, resolveBuyer, resolveInvoiceNumber, itemTitle, LABELS } from "./invoice-view.js"
import type { InvoiceLocale } from "./invoice-view.js"

const SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1"
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "25", 10)
const SMTP_USER = process.env.SMTP_USER || ""
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ""

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  // Internal relay (mail.xlrent.eu) presents a self-signed/mismatched cert on the
  // Docker network path — accept it. Override via SMTP_TLS_REJECT_UNAUTHORIZED=true.
  tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "true" },
  ...(SMTP_PASSWORD
    ? {
        auth: {
          user: SMTP_USER || "apikey",
          pass: SMTP_PASSWORD,
        },
      }
    : {}),
})

const EMAIL_FROM = process.env.EMAIL_FROM || "info@xlmarket.ee"
// Saatja kuvatav nimi — env-ist (Tarmo 2026-10-14: "mitte koodis"). Vaikeväärtus = õige bränd-kuju
// (EI "XLMARKET" suurtähtedega). Coolify EMAIL_FROM_NAME kirjutab üle.
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "XLmarket.ee"
const EMAIL_REPLY_TO = (process.env.EMAIL_REPLY_TO || "").trim()
const EMAIL_ADMIN = process.env.EMAIL_ADMIN || "tarmo@xlmarket.ee"
const EMAIL_INVOICE = process.env.EMAIL_INVOICE || "tarmo@naissaar.eu"
const STORE_URL = process.env.STORE_URL || "https://xlmarket.ee"

// Staging-ohutus (HARD RULE #7): staging-DB on prod-koopia (päris klientide aadressid).
// EMAIL_ALLOWLIST (komadega eraldatud) → saadame AINULT nendele, kõik muu blokeeritakse + logitakse.
const EMAIL_ALLOWLIST = (process.env.EMAIL_ALLOWLIST || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

// Üks värav kõigile saatmistele (SSoT). Tagastab kas lubada + põhjus (logiks + nähtavus).
// JÄRJEKORD (Tarmo 2026-10-13): JÄME eel-värav ENNE täpset väravat.
// EMAIL_DISABLED blokib KÕIK (ka allowlisti) ja on esimene, sest tema eksimise hind on ODAV
// (kiri jääb saatmata, näed kohe); allowlisti eksimine tähendaks kirja PÄRIS kliendile (staging-DB
// = prod-koopia). Kaks sõltumatut kaitset: jäme (DISABLED) + täpne (allowlist).
function emailGate(to: string): { allow: boolean; reason: string } {
  const addr = (to || "").trim().toLowerCase()
  // 1) JÄME eel-värav — kill-switch blokib KÕIK, ka allowlistitud aadressid.
  if (process.env.EMAIL_DISABLED === "true") {
    return { allow: false, reason: "email-disabled" }
  }
  // 2) Allowlist peal → AINULT allowlist (täpne staging-värav). Muu blokeeritud.
  if (EMAIL_ALLOWLIST.length > 0) {
    return EMAIL_ALLOWLIST.includes(addr)
      ? { allow: true, reason: "allowlist-pass" }
      : { allow: false, reason: "allowlist-block" }
  }
  // 3) Prod: allowlist tühi, kill-switch maas → saada.
  return { allow: true, reason: "send" }
}

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  bcc?: string | string[]
  attachments?: EmailAttachment[]
}

export async function sendEmail({ to, subject, html, bcc, attachments }: SendEmailOptions) {
  // SSoT-värav: allowlist (staging) → kill-switch → prod. Blokk logitakse (nähtavus).
  const gate = emailGate(to)
  if (!gate.allow) {
    console.log(`[EMAIL] BLOCKED (${gate.reason}) — to=${to} subject="${subject}"`)
    return
  }
  // BCC-saajad (nt raamatupidamise arve-koopia) läbivad SAMA värava eraldi (SSoT) —
  // mitte-lubatud bcc-aadress jäetakse VÄLJA + logitakse (staging ei leki päris aadressile).
  const bccList: string[] = []
  if (bcc) {
    for (const addr of Array.isArray(bcc) ? bcc : [bcc]) {
      const g = emailGate(addr)
      if (g.allow) bccList.push(addr)
      else console.log(`[EMAIL] BCC-DROP (${g.reason}) — bcc=${addr} subject="${subject}"`)
    }
  }
  const att = attachments && attachments.length ? ` +${attachments.length} manus` : ""
  console.log(`[EMAIL] SEND (${gate.reason}) — to=${to}${bccList.length ? ` bcc=${bccList.join(",")}` : ""}${att} subject="${subject}"`)
  await transporter.sendMail({
    from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
    to,
    ...(bccList.length ? { bcc: bccList } : {}),
    ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
    subject,
    html,
    ...(attachments && attachments.length ? { attachments } : {}),
  })
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatPrice(amount: number, currency = "EUR"): string {
  return (amount / 100).toFixed(2).replace(".", ",") + " " + (currency || "EUR").toUpperCase()
}

// DD.MM.YYYY (Eesti formaat); created_at puudub → tänane (makse kinnitatud = täna).
function fmtDateHtml(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return fmtDateHtml()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="et">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #f59e0b; padding: 20px 30px; text-align: center;">
    <span style="font-size: 24px; font-weight: 800; color: white;">XL</span><span style="font-size: 24px; font-weight: 700; color: white;">MARKET</span>
  </div>
  <div style="padding: 30px;">
    ${content}
  </div>
  <div style="padding: 20px 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
    <p>Roland Kaubandus O&Uuml; | <a href="mailto:info@xlmarket.ee" style="color: #d97706;">info@xlmarket.ee</a></p>
    <p><a href="${STORE_URL}" style="color: #d97706;">xlmarket.ee</a></p>
  </div>
</div>
</body>
</html>`
}

export interface OrderItem {
  title: string
  title_et?: string // ET tootenimi (product.metadata.title_et); arve kuvab tellimuse keeles (vt invoice-view.ts)
  quantity: number
  unit_price: number // BRUTO (tax-inclusive region) — KM sees
  total?: number // rea bruto kokku (Medusa items.*); fallback unit_price*quantity
  currency_code?: string
}

interface InvoiceAddress {
  first_name?: string
  last_name?: string
  company?: string
  address_1?: string
  city?: string
  postal_code?: string
  phone?: string
}

export interface OrderData {
  id: string
  display_id?: number
  created_at?: string
  email: string
  total: number
  subtotal?: number
  shipping_total?: number
  tax_total?: number
  discount_total?: number
  currency_code: string
  items: OrderItem[]
  // Arve-lisad (vt invoice-view.ts). Kõik VALIKULISED — tagasi-ühilduv olemasolevate kutsujatega.
  locale?: "et" | "en" // tellimuse keel (arve lokaliseerimiseks). PRAEGU kassa ei saada → fallback "et".
  invoice_number?: string // eraldi arve-seeria number (#3); puudub → tellimuse nr
  company?: { name?: string; reg?: string; vat?: string } // ettevõtte-ostja (#2)
  metadata?: Record<string, unknown> // locale / company_* / invoice_number fallback-allikas
  payment_collections?: {
    status?: string
  }[]
  shipping_address?: InvoiceAddress
  billing_address?: InvoiceAddress // arve-ostja aadress (eelistatud shipping ees)
}

// Kinnituskirja sildid (D2) — tellimuse keeles. Kliendi-kiri; admin-teade jääb eesti keelde.
interface ConfirmLabels {
  thankYou: string
  greeting: (name: string) => string
  order: string
  product: string
  qty: string
  price: string
  shipping: string
  total: string
  shippingAddress: string
  phone: string
  questions: (email: string) => string
  subject: string
  customer: string
  // tarnekinnitus (sendShippingConfirmation)
  shipped: string
  shippedBody: (name: string, orderNum: string) => string
  tracking: string
}

const CONFIRM_LABELS: Record<InvoiceLocale, ConfirmLabels> = {
  et: {
    thankYou: "Aitäh tellimuse eest",
    greeting: (n) => `Tere, ${n}! Oleme teie tellimuse vastu võtnud.`,
    order: "Tellimus",
    product: "Toode",
    qty: "Kogus",
    price: "Hind",
    shipping: "Tarne",
    total: "Kokku",
    shippingAddress: "Tarneaadress",
    phone: "Tel",
    questions: (e) => `Küsimuste korral kirjutage ${e}`,
    subject: "Aitäh tellimuse eest",
    customer: "Klient",
    shipped: "Teie tellimus on teel",
    shippedBody: (n, o) => `Tere, ${n}! Teie tellimus #${o} on teele pandud.`,
    tracking: "Jälgimisnumber",
  },
  en: {
    thankYou: "Thank you for your order",
    greeting: (n) => `Hello, ${n}! We have received your order.`,
    order: "Order",
    product: "Product",
    qty: "Qty",
    price: "Price",
    shipping: "Shipping",
    total: "Total",
    shippingAddress: "Shipping address",
    phone: "Tel",
    questions: (e) => `Questions? Write to ${e}`,
    subject: "Thank you for your order",
    customer: "Customer",
    shipped: "Your order is on its way",
    shippedBody: (n, o) => `Hello, ${n}! Your order #${o} has been shipped.`,
    tracking: "Tracking number",
  },
}

export async function sendOrderConfirmation(order: OrderData) {
  // D2: kinnituskiri tellimuse keeles (resolveLocale = sama SSoT, mis arve). Kliendi-kiri
  // lokaliseeritud ET/EN; admin-teade (allpool) jääb eesti keelde (sisemine, Tarmole).
  const locale = resolveLocale(order)
  const C = CONFIRM_LABELS[locale]
  const name = order.shipping_address?.first_name || C.customer
  const orderNum = order.display_id || order.id.slice(-8)
  const itemsHtml = renderOrderItems(order, locale)

  const html = emailWrapper(`
    <h1 style="font-size: 22px; color: #111827; margin: 0 0 20px;">${C.thankYou}</h1>
    <p style="color: #4b5563; margin: 0 0 20px;">${C.greeting(escapeHtml(name))}</p>
    <div style="background: #f9fafb; padding: 15px; margin-bottom: 20px;">
      <p style="margin: 0; font-weight: 600;">${C.order} #${orderNum}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb;">
          <th style="text-align: left; padding: 8px 0;">${C.product}</th>
          <th style="text-align: center; padding: 8px 0;">${C.qty}</th>
          <th style="text-align: right; padding: 8px 0;">${C.price}</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: right;">
      ${order.shipping_total ? `<p style="margin: 5px 0; color: #6b7280;">${C.shipping}: ${formatPrice(order.shipping_total, order.currency_code)}</p>` : ""}
      <p style="margin: 5px 0; font-size: 18px; font-weight: 700; color: #111827;">${C.total}: ${formatPrice(order.total, order.currency_code)}</p>
    </div>
    ${
      order.shipping_address
        ? `<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <h2 style="font-size: 16px; color: #111827; margin: 0 0 10px;">${C.shippingAddress}</h2>
          <p style="color: #4b5563; margin: 0; line-height: 1.6;">
            ${escapeHtml(order.shipping_address.first_name)} ${escapeHtml(order.shipping_address.last_name)}<br>
            ${escapeHtml(order.shipping_address.address_1)}<br>
            ${escapeHtml(order.shipping_address.postal_code)} ${escapeHtml(order.shipping_address.city)}
            ${order.shipping_address.phone ? `<br>${C.phone}: ${escapeHtml(order.shipping_address.phone)}` : ""}
          </p>
        </div>`
        : ""
    }
    <p style="color: #6b7280; margin-top: 25px; font-size: 13px;">${C.questions('<a href="mailto:info@xlmarket.ee" style="color: #d97706;">info@xlmarket.ee</a>')}</p>
  `)

  await sendEmail({
    to: order.email,
    subject: `${C.subject} #${orderNum} — ${EMAIL_FROM_NAME}`,
    html,
  })

  // Admin notification.
  // "Vaata tellimust" link viib Medusa admin-paneeli (/app/orders/...). Baas-URL tuleb ENV-ist
  // (ADMIN_URL eelistatud, siis MEDUSA_BACKEND_URL) — EI ole localhost-fallbacki: puuduv env →
  // fail-loud logis + link JÄETAKSE kirjast VÄLJA (katkine localhost-link oleks hullem kui lingita).
  // Prod (uo28): MEDUSA_BACKEND_URL=https://admin.xlmarket.ee. Staging: sea ADMIN_URL=staging admin URL.
  const adminBase = (process.env.ADMIN_URL || process.env.MEDUSA_BACKEND_URL || "").trim().replace(/\/+$/, "")
  if (!adminBase) {
    console.error(
      `[EMAIL] HOIATUS: ADMIN_URL/MEDUSA_BACKEND_URL puudub — admin-teate "Vaata tellimust" link jäetakse välja (order=${orderNum})`
    )
  }
  const adminOrderLink = adminBase
    ? `<p style="margin-top: 20px;"><a href="${adminBase}/app/orders/${order.id}" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; font-weight: 600;">Vaata tellimust</a></p>`
    : ""

  const adminHtml = emailWrapper(`
    <h1 style="font-size: 22px; color: #111827; margin: 0 0 20px;">Uus tellimus #${orderNum}</h1>
    <p style="color: #4b5563;">Klient: ${escapeHtml(name)} (${escapeHtml(order.email)})</p>
    <p style="color: #4b5563;">Tooted: ${order.items.length} tk</p>
    <p style="font-size: 18px; font-weight: 700; color: #111827;">Kokku: ${formatPrice(order.total, order.currency_code)}</p>
    ${adminOrderLink}
  `)

  await sendEmail({
    to: EMAIL_ADMIN,
    subject: `Uus tellimus #${orderNum} (${formatPrice(order.total, order.currency_code)})`,
    html: adminHtml,
  })
}

// HTML-arve (Tarmo #6: "sama kujundus ka HTML-arvel"). Eraldiseisev valge dokument, mis peegeldab
// PDF-i: bränd-wordmark, pealkiri ARVE, müüja + ostja plokid kõrvuti, toodete tabel
// (Toode | Kogus | Ühikuhind | Summa), summad paremal, jalus ettevõtte andmetega (CMS global SSoT).
// Jagatud andmekiht (resolveBuyer / itemTitle / LABELS) = SAMA mis PDF-il (HARD RULE #5).
export async function renderInvoiceHtml(order: OrderData, orderNum: string | number): Promise<string> {
  const { getPage } = await import("../modules/cms/db.js")
  // Müüja CMS global SSoT-st (sama allikas mis PDF loadCompany + storefront). Fallback resilience.
  let company = {
    name: "Roland Kaubandus OÜ",
    reg: "10327682",
    vat: "EE100217007",
    address: "Pärnu mnt 211, 11624 Tallinn",
    email: "info@xlmarket.ee",
  }
  try {
    const page = await getPage("global", "et")
    const c = (page?.content || {}) as Record<string, unknown>
    const s = (k: string, d: string) => (typeof c[k] === "string" && (c[k] as string).trim() ? (c[k] as string).trim() : d)
    company = {
      name: s("company_name", company.name),
      reg: s("reg_number", company.reg),
      vat: s("vat_number", company.vat),
      address: s("address", company.address),
      email: s("email_info", company.email),
    }
  } catch {
    /* fallback (arve peab alati renderduma) */
  }

  const locale = resolveLocale(order)
  const L = LABELS[locale]
  const buyer = resolveBuyer(order, locale)
  const invNo = resolveInvoiceNumber(order, orderNum)
  const t = computeInvoiceTotals(order)
  const cur = order.currency_code

  const rows = order.items
    .map((it) => {
      const lineGross = it.total ?? it.unit_price * it.quantity
      return `<tr>
        <td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;color:#374151;">${escapeHtml(itemTitle(it, locale))}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">${it.quantity}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;white-space:nowrap;">${formatPrice(it.unit_price, it.currency_code || cur)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;white-space:nowrap;">${formatPrice(lineGross, it.currency_code || cur)}</td>
      </tr>`
    })
    .join("")

  const buyerLines = [
    buyer.regLine ? escapeHtml(buyer.regLine) : "",
    ...buyer.lines.map((l) => escapeHtml(l)),
    buyer.email ? escapeHtml(buyer.email) : "",
    buyer.phone ? `${L.phone}: ${escapeHtml(buyer.phone)}` : "",
  ]
    .filter(Boolean)
    .join("<br>")

  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;background:#f5f5f5;">
<div style="max-width:640px;margin:0 auto;background:#ffffff;padding:32px;">
  <table style="width:100%;border-collapse:collapse;"><tr>
    <td style="vertical-align:top;">
      <span style="font-size:30px;font-weight:800;font-style:italic;color:#1a1a2e;">XL</span><span style="font-size:30px;font-weight:700;font-style:italic;color:#0ea5a0;">market</span>
    </td>
    <td style="vertical-align:top;text-align:right;">
      <div style="font-size:26px;font-weight:800;color:#1a1a2e;letter-spacing:1px;">${L.invoice}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:6px;">${L.invoiceNo}: ${escapeHtml(invNo)}</div>
      <div style="font-size:12px;color:#6b7280;">${L.date}: ${escapeHtml(fmtDateHtml(order.created_at))}</div>
      <div style="font-size:12px;color:#0ea5a0;font-weight:600;">${L.paid}</div>
    </td>
  </tr></table>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;">
  <table style="width:100%;border-collapse:collapse;font-size:13px;"><tr>
    <td style="vertical-align:top;width:50%;padding-right:16px;">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">${L.seller}</div>
      <div style="font-size:14px;font-weight:700;color:#1a1a2e;margin-top:4px;">${escapeHtml(company.name)}</div>
      <div style="color:#6b7280;line-height:1.6;">${L.regNr}: ${escapeHtml(company.reg)} &nbsp; ${L.vat}: ${escapeHtml(company.vat)}<br>${escapeHtml(company.address)}<br>${escapeHtml(company.email)}</div>
    </td>
    <td style="vertical-align:top;width:50%;">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">${L.buyer}</div>
      <div style="font-size:14px;font-weight:700;color:#1a1a2e;margin-top:4px;">${escapeHtml(buyer.name)}</div>
      <div style="color:#6b7280;line-height:1.6;">${buyerLines}</div>
    </td>
  </tr></table>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:22px;">
    <thead>
      <tr style="background:#1a1a2e;color:#ffffff;">
        <th style="text-align:left;padding:8px 6px;font-size:11px;">${L.colProduct}</th>
        <th style="text-align:center;padding:8px 6px;font-size:11px;">${L.colQty}</th>
        <th style="text-align:right;padding:8px 6px;font-size:11px;">${L.colUnit}</th>
        <th style="text-align:right;padding:8px 6px;font-size:11px;">${L.colSum}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:11px;color:#9ca3af;margin:6px 0 0;">${L.pricesInclVat}</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;"><tr>
    <td></td>
    <td style="width:300px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:3px 0;color:#6b7280;text-align:right;">${L.subtotal}:</td><td style="padding:3px 0 3px 16px;text-align:right;color:#374151;white-space:nowrap;">${formatPrice(t.itemsGross, cur)}</td></tr>
        ${t.shippingGross ? `<tr><td style="padding:3px 0;color:#6b7280;text-align:right;">${L.shipping}:</td><td style="padding:3px 0 3px 16px;text-align:right;color:#374151;white-space:nowrap;">${formatPrice(t.shippingGross, cur)}</td></tr>` : ""}
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:4px;"></td></tr>
        <tr><td style="padding:3px 0;font-size:16px;font-weight:700;color:#1a1a2e;text-align:right;">${L.total}:</td><td style="padding:3px 0 3px 16px;font-size:16px;font-weight:700;color:#1a1a2e;text-align:right;white-space:nowrap;">${formatPrice(t.grandTotal, cur)}</td></tr>
        ${
          t.vat
            ? `<tr><td colspan="2" style="padding-top:10px;"></td></tr>
        <tr><td colspan="2" style="padding:0 0 4px;color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:right;">${L.vatSummaryTitle}</td></tr>
        <tr><td style="padding:2px 0;color:#6b7280;text-align:right;">${L.netAmount}:</td><td style="padding:2px 0 2px 16px;text-align:right;color:#374151;white-space:nowrap;">${formatPrice(t.net, cur)}</td></tr>
        <tr><td style="padding:2px 0;color:#6b7280;text-align:right;">${L.vatAmount(t.vatRate)}:</td><td style="padding:2px 0 2px 16px;text-align:right;color:#374151;white-space:nowrap;">${formatPrice(t.vat, cur)}</td></tr>
        <tr><td style="padding:2px 0;color:#6b7280;text-align:right;">${L.grandTotal}:</td><td style="padding:2px 0 2px 16px;text-align:right;color:#374151;white-space:nowrap;">${formatPrice(t.grandTotal, cur)}</td></tr>`
            : ""
        }
      </table>
    </td>
  </tr></table>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 12px;">
  <p style="font-size:11px;color:#9ca3af;text-align:center;line-height:1.6;margin:0;">
    ${escapeHtml(company.name)} &nbsp;·&nbsp; ${L.regNr}: ${escapeHtml(company.reg)} &nbsp;·&nbsp; ${L.vat}: ${escapeHtml(company.vat)} &nbsp;·&nbsp; ${escapeHtml(company.address)}<br>
    ${escapeHtml(company.email)} &nbsp;·&nbsp; xlmarket.ee
  </p>
  <p style="font-size:12px;color:#6b7280;text-align:center;margin-top:14px;">${escapeHtml(L.questions(company.email))}</p>
</div>
</body>
</html>`
}

export async function sendInvoice(order: OrderData) {
  const orderNum = order.display_id || order.id.slice(-8)
  const html = await renderInvoiceHtml(order, orderNum)

  // Arve PDF-manus (Tarmo 2026-10-14: "arve PDF-manusena, kui võimalik"). BEST-EFFORT:
  // genereerimine kukub → saadame maili ILMA manuseta (arve-tekst on ka HTML-is). EI blokeeri kirja.
  let attachments: EmailAttachment[] | undefined
  try {
    const { renderInvoicePdf } = await import("./invoice-pdf.js")
    const pdf = await renderInvoicePdf(order, orderNum)
    attachments = [{ filename: `arve-${orderNum}.pdf`, content: pdf, contentType: "application/pdf" }]
  } catch (e) {
    // FAIL-LOUD (HARD RULE #5): PDF kukub → kiri läheb ikka (HTML-arve sees), AGA nähtav hoiatus
    // (console.error + Telegram) tellimuse-numbriga. MITTE vaikne. Telegram ise ei tohi kirja blokeerida.
    const msg = (e as Error)?.message || String(e)
    console.error(`[EMAIL] arve-PDF genereerimine KUKKUS (saadan ilma manuseta) — order=${orderNum}: ${msg}`, e)
    await notifyTelegram(
      `🔴 XL arve-PDF genereerimine KUKKUS — tellimus #${orderNum}. Kiri saadeti ILMA manuseta (arve-tekst on HTML-is). Viga: ${msg}`
    ).catch(() => {})
  }

  // Arve läheb KLIENDILE (order.email); koopia raamatupidamisse (EMAIL_INVOICE) BCC-na,
  // et klient EI näeks sisemist aadressi. BCC AINULT kui EMAIL_INVOICE seatud JA erineb kliendist
  // (muidu topelt-saatmine — nt homne test, kus klient = EMAIL_INVOICE = tarmo@naissaar.eu).
  const invoiceBcc =
    EMAIL_INVOICE &&
    EMAIL_INVOICE.trim().toLowerCase() !== (order.email || "").trim().toLowerCase()
      ? EMAIL_INVOICE
      : undefined

  await sendEmail({
    to: order.email,
    subject: `Arve #${orderNum} — ${EMAIL_FROM_NAME}`,
    html,
    ...(invoiceBcc ? { bcc: invoiceBcc } : {}),
    ...(attachments ? { attachments } : {}),
  })
}

export async function sendShippingConfirmation(order: OrderData, trackingNumber?: string) {
  // D2: tarnekinnitus tellimuse keeles (sama resolveLocale SSoT).
  const locale = resolveLocale(order)
  const C = CONFIRM_LABELS[locale]
  const name = order.shipping_address?.first_name || C.customer
  const orderNum = order.display_id || order.id.slice(-8)

  const html = emailWrapper(`
    <h1 style="font-size: 22px; color: #111827; margin: 0 0 20px;">${C.shipped}</h1>
    <p style="color: #4b5563; margin: 0 0 20px;">${C.shippedBody(escapeHtml(name), String(orderNum))}</p>
    ${trackingNumber ? `<div style="background: #f9fafb; padding: 15px; margin-bottom: 20px;"><p style="margin: 0;">${C.tracking}: <strong>${escapeHtml(trackingNumber)}</strong></p></div>` : ""}
    <p style="color: #6b7280; font-size: 13px;">${C.questions('<a href="mailto:info@xlmarket.ee" style="color: #d97706;">info@xlmarket.ee</a>')}</p>
  `)

  await sendEmail({
    to: order.email,
    subject: `${C.order} #${orderNum} — ${C.shipped} — ${EMAIL_FROM_NAME}`,
    html,
  })
}

function renderOrderItems(order: OrderData, locale: InvoiceLocale = "et"): string {
  return order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${escapeHtml(itemTitle(item, locale))}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${formatPrice(item.unit_price * item.quantity, item.currency_code || order.currency_code)}</td>
        </tr>`
    )
    .join("")
}
