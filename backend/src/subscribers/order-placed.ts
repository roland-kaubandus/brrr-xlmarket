import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { sendInvoice, sendOrderConfirmation, type OrderData } from "../lib/email.js"
import { allocateInvoiceNumber, invoiceSeriesEnabled } from "../lib/invoice-number.js"
import { notifyTelegram } from "../lib/telegram.js"

export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data.id
  const logger = container.resolve("logger")

  try {
    const query = container.resolve("query")
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "created_at",
        "email",
        "total",
        "subtotal",
        "shipping_total",
        "tax_total",
        "currency_code",
        "metadata",
        "items.*",
        "items.product.metadata", // title_et → arve kuvab tootenime tellimuse keeles (#1)
        "shipping_address.*",
        "billing_address.*", // arve-ostja aadress + ettevõtte-väljad (#2)
        "payment_collections.*",
      ],
      filters: { id: orderId },
    })

    if (!order) {
      logger.warn(`[EMAIL] Order ${orderId} not found`)
      return
    }

    // Flatten title_et items.product.metadata-st rea-tasandile (arve-vaade loeb it.title_et).
    const o = order as unknown as OrderData & {
      items: (OrderData["items"][number] & { product?: { metadata?: Record<string, unknown> } })[]
    }
    for (const it of o.items || []) {
      const et = it.product?.metadata?.title_et
      if (typeof et === "string" && et.trim()) it.title_et = et.trim()
    }

    // D3: arve-number XL-AAAA-NNNNN — allokeeri makse kinnitamisel (lipu taga, vaikimisi VÄLJAS).
    // Lünkadeta + idempotent (vt invoice-number.ts). Allokeerimis-viga EI blokeeri kirja:
    // arve läheb #N-fallback'iga välja, Telegram hoiatab (fail-loud) → Tarmo saab vajadusel uuesti väljastada.
    if (invoiceSeriesEnabled()) {
      try {
        const invNo = await allocateInvoiceNumber(o.id, o.created_at ? new Date(o.created_at) : undefined)
        o.invoice_number = invNo
        // Kinnista order.metadata'sse (püsiv — reissue/admin-vaade loeb sama numbrit ilma loendurita).
        const orderModule = container.resolve(Modules.ORDER)
        await orderModule.updateOrders(o.id, {
          metadata: { ...(o.metadata || {}), invoice_number: invNo },
        })
        logger.info(`[INVOICE] Allocated invoice number ${invNo} for order ${orderId}`)
      } catch (err) {
        const msg = (err as Error).message
        logger.error(`[INVOICE] Invoice number allocation FAILED for ${orderId}: ${msg}`)
        await notifyTelegram(
          `🧾❌ Arve-numbri allokeerimine KUKKUS tellimusel ${orderId}: ${msg}\n` +
            `Arve läks #N-fallback'iga välja — kontrolli seeriat / väljasta vajadusel uuesti.`
        ).catch(() => {})
      }
    }

    await sendOrderConfirmation(o as OrderData)
    await sendInvoice(o as OrderData)
    logger.info(`[EMAIL] Thank-you email and invoice sent for ${orderId}`)
  } catch (err) {
    logger.error(`[EMAIL] Failed to send order email(s): ${(err as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
