import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendInvoice, sendOrderConfirmation, type OrderData } from "../lib/email.js"

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
