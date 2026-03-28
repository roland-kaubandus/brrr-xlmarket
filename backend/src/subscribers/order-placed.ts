import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendOrderConfirmation, type OrderData } from "../lib/email"

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
        "email",
        "total",
        "subtotal",
        "shipping_total",
        "tax_total",
        "currency_code",
        "items.*",
        "shipping_address.*",
      ],
      filters: { id: orderId },
    })

    if (!order) {
      logger.warn(`[EMAIL] Order ${orderId} not found`)
      return
    }

    await sendOrderConfirmation(order as unknown as OrderData)
    logger.info(`[EMAIL] Order confirmation sent for ${orderId}`)
  } catch (err) {
    logger.error(`[EMAIL] Failed to send order confirmation: ${(err as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
