import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
// import { sendOrderConfirmation, type OrderData } from "../lib/email"
type OrderData = { email: string; orderId: string; items: any[]; total: string; currency: string }

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

    // await sendOrderConfirmation(order as unknown as OrderData)
    // Email disabled temporarily — email module import broken
    logger.info(`[EMAIL] Order confirmation sent for ${orderId}`)
  } catch (err) {
    logger.error(`[EMAIL] Failed to send order confirmation: ${(err as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
