import nodemailer from "nodemailer"

const SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1"
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "25", 10)
const SMTP_USER = process.env.SMTP_USER || ""
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ""

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
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
const EMAIL_ADMIN = process.env.EMAIL_ADMIN || "tarmo@xlmarket.ee"
const EMAIL_INVOICE = process.env.EMAIL_INVOICE || "tarmo@naissaar.eu"
const STORE_URL = process.env.STORE_URL || "https://xlmarket.ee"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  await transporter.sendMail({
    from: `"XLMARKET" <${EMAIL_FROM}>`,
    to,
    subject,
    html,
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
  return (amount / 100).toFixed(2).replace(".", ",") + " " + currency
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
  quantity: number
  unit_price: number
  currency_code?: string
}

export interface OrderData {
  id: string
  display_id?: number
  email: string
  total: number
  subtotal?: number
  shipping_total?: number
  tax_total?: number
  currency_code: string
  items: OrderItem[]
  payment_collections?: {
    status?: string
  }[]
  shipping_address?: {
    first_name?: string
    last_name?: string
    address_1?: string
    city?: string
    postal_code?: string
    phone?: string
  }
}

export async function sendOrderConfirmation(order: OrderData) {
  const name = order.shipping_address?.first_name || "Klient"
  const orderNum = order.display_id || order.id.slice(-8)
  const itemsHtml = renderOrderItems(order)

  const html = emailWrapper(`
    <h1 style="font-size: 22px; color: #111827; margin: 0 0 20px;">Aitäh tellimuse eest</h1>
    <p style="color: #4b5563; margin: 0 0 20px;">Tere, ${escapeHtml(name)}! Oleme teie tellimuse vastu võtnud.</p>
    <div style="background: #f9fafb; padding: 15px; margin-bottom: 20px;">
      <p style="margin: 0; font-weight: 600;">Tellimus #${orderNum}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb;">
          <th style="text-align: left; padding: 8px 0;">Toode</th>
          <th style="text-align: center; padding: 8px 0;">Kogus</th>
          <th style="text-align: right; padding: 8px 0;">Hind</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: right;">
      ${order.shipping_total ? `<p style="margin: 5px 0; color: #6b7280;">Tarne: ${formatPrice(order.shipping_total, order.currency_code)}</p>` : ""}
      <p style="margin: 5px 0; font-size: 18px; font-weight: 700; color: #111827;">Kokku: ${formatPrice(order.total, order.currency_code)}</p>
    </div>
    ${
      order.shipping_address
        ? `<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <h2 style="font-size: 16px; color: #111827; margin: 0 0 10px;">Tarneaadress</h2>
          <p style="color: #4b5563; margin: 0; line-height: 1.6;">
            ${escapeHtml(order.shipping_address.first_name)} ${escapeHtml(order.shipping_address.last_name)}<br>
            ${escapeHtml(order.shipping_address.address_1)}<br>
            ${escapeHtml(order.shipping_address.postal_code)} ${escapeHtml(order.shipping_address.city)}
            ${order.shipping_address.phone ? `<br>Tel: ${escapeHtml(order.shipping_address.phone)}` : ""}
          </p>
        </div>`
        : ""
    }
    <p style="color: #6b7280; margin-top: 25px; font-size: 13px;">K&uuml;simuste korral kirjutage <a href="mailto:info@xlmarket.ee" style="color: #d97706;">info@xlmarket.ee</a></p>
  `)

  await sendEmail({
    to: order.email,
    subject: `Aitäh tellimuse eest #${orderNum} — XLMARKET`,
    html,
  })

  // Admin notification
  const adminHtml = emailWrapper(`
    <h1 style="font-size: 22px; color: #111827; margin: 0 0 20px;">Uus tellimus #${orderNum}</h1>
    <p style="color: #4b5563;">Klient: ${escapeHtml(name)} (${escapeHtml(order.email)})</p>
    <p style="color: #4b5563;">Tooted: ${order.items.length} tk</p>
    <p style="font-size: 18px; font-weight: 700; color: #111827;">Kokku: ${formatPrice(order.total, order.currency_code)}</p>
    <p style="margin-top: 20px;"><a href="${process.env.MEDUSA_BACKEND_URL || "http://localhost:9001"}/app/orders/${order.id}" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; font-weight: 600;">Vaata tellimust</a></p>
  `)

  await sendEmail({
    to: EMAIL_ADMIN,
    subject: `Uus tellimus #${orderNum} (${formatPrice(order.total, order.currency_code)})`,
    html: adminHtml,
  })
}

export async function sendInvoice(order: OrderData) {
  const name = order.shipping_address?.first_name || "Klient"
  const orderNum = order.display_id || order.id.slice(-8)
  const itemsHtml = renderOrderItems(order)

  const html = emailWrapper(`
    <h1 style="font-size: 22px; color: #111827; margin: 0 0 20px;">Arve</h1>
    <p style="color: #4b5563; margin: 0 0 20px;">Tere, ${escapeHtml(name)}! Teie makse on kinnitatud. Allpool on arve teie tellimusele #${orderNum}.</p>
    <div style="background: #f9fafb; padding: 15px; margin-bottom: 20px;">
      <p style="margin: 0; font-weight: 600;">Arve #${orderNum}</p>
      <p style="margin: 6px 0 0; color: #6b7280;">Makse on kinnitatud</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb;">
          <th style="text-align: left; padding: 8px 0;">Toode</th>
          <th style="text-align: center; padding: 8px 0;">Kogus</th>
          <th style="text-align: right; padding: 8px 0;">Hind</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: right;">
      ${order.subtotal ? `<p style="margin: 5px 0; color: #6b7280;">Vahesumma: ${formatPrice(order.subtotal, order.currency_code)}</p>` : ""}
      ${order.shipping_total ? `<p style="margin: 5px 0; color: #6b7280;">Tarne: ${formatPrice(order.shipping_total, order.currency_code)}</p>` : ""}
      ${order.tax_total ? `<p style="margin: 5px 0; color: #6b7280;">KM: ${formatPrice(order.tax_total, order.currency_code)}</p>` : ""}
      <p style="margin: 5px 0; font-size: 18px; font-weight: 700; color: #111827;">Kokku tasutud: ${formatPrice(order.total, order.currency_code)}</p>
    </div>
    ${
      order.shipping_address
        ? `<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <h2 style="font-size: 16px; color: #111827; margin: 0 0 10px;">Tarneaadress</h2>
          <p style="color: #4b5563; margin: 0; line-height: 1.6;">
            ${escapeHtml(order.shipping_address.first_name)} ${escapeHtml(order.shipping_address.last_name)}<br>
            ${escapeHtml(order.shipping_address.address_1)}<br>
            ${escapeHtml(order.shipping_address.postal_code)} ${escapeHtml(order.shipping_address.city)}
            ${order.shipping_address.phone ? `<br>Tel: ${escapeHtml(order.shipping_address.phone)}` : ""}
          </p>
        </div>`
        : ""
    }
    <p style="color: #6b7280; margin-top: 25px; font-size: 13px;">K&uuml;simuste korral kirjutage <a href="mailto:info@xlmarket.ee" style="color: #d97706;">info@xlmarket.ee</a></p>
  `)

  await sendEmail({
    to: EMAIL_INVOICE,
    subject: `Arve #${orderNum} — XLMARKET`,
    html,
  })
}

export async function sendShippingConfirmation(order: OrderData, trackingNumber?: string) {
  const name = order.shipping_address?.first_name || "Klient"
  const orderNum = order.display_id || order.id.slice(-8)

  const html = emailWrapper(`
    <h1 style="font-size: 22px; color: #111827; margin: 0 0 20px;">Tellimus saadetud</h1>
    <p style="color: #4b5563; margin: 0 0 20px;">Tere, ${escapeHtml(name)}! Teie tellimus #${orderNum} on teele pandud.</p>
    ${trackingNumber ? `<div style="background: #f9fafb; padding: 15px; margin-bottom: 20px;"><p style="margin: 0;">J&auml;lgimisnumber: <strong>${escapeHtml(trackingNumber)}</strong></p></div>` : ""}
    <p style="color: #6b7280; font-size: 13px;">K&uuml;simuste korral kirjutage <a href="mailto:info@xlmarket.ee" style="color: #d97706;">info@xlmarket.ee</a></p>
  `)

  await sendEmail({
    to: order.email,
    subject: `Tellimus #${orderNum} saadetud — XLMARKET`,
    html,
  })
}

function renderOrderItems(order: OrderData): string {
  return order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${escapeHtml(item.title)}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${formatPrice(item.unit_price * item.quantity, item.currency_code || order.currency_code)}</td>
        </tr>`
    )
    .join("")
}
