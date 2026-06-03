import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { sendShippingConfirmation, type OrderData } from "../lib/email.js"

export default async function orderShippedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; fulfillment_id?: string }>) {
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
        "currency_code",
        "items.*",
        "shipping_address.*",
        "fulfillments.tracking_links.*",
      ],
      filters: { id: orderId },
    })

    if (!order) {
      logger.warn(`[EMAIL] Order ${orderId} not found for shipping notification`)
      return
    }

    const trackingNumber = (order as any).fulfillments?.[0]?.tracking_links?.[0]?.tracking_number

    await sendShippingConfirmation(order as unknown as OrderData, trackingNumber)
    logger.info(`[EMAIL] Shipping confirmation sent for ${orderId}`)
  } catch (err) {
    logger.error(`[EMAIL] Failed to send shipping confirmation: ${(err as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
