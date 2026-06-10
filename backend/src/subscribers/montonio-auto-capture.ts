import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { capturePaymentWorkflow } from "@medusajs/core-flows"

// Montonio pangalink/kaart = raha on PAID-hetkel JUBA liikunud (mitte ainult reserveeritud).
// Medusa webhook/return-flow jätab makse AUTHORIZED-staatusse ("Medusa capture'b järgmisena"),
// aga Medusa v2-l pole auto-capture'i → tellimus jääks admin'is "maksmata". See subscriber
// capture'b Montonio-maksed kohe order.placed'il, et paid_total kajastaks tegelikku raha.
//
// ⚠️ AINULT Montonio — pp_system_default (manuaal/test) ja muud provideret EI puudutata.
const MONTONIO_PROVIDER_ID = "pp_montonio_montonio"

export default async function montonioAutoCaptureHandler({
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
        "payment_collections.payments.id",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.captured_at",
        "payment_collections.payments.canceled_at",
      ],
      filters: { id: orderId },
    })

    if (!order) return

    for (const pc of order.payment_collections ?? []) {
      for (const p of pc.payments ?? []) {
        // Capture AINULT Montonio'l; jäta system_default jt puutumata.
        if (p.provider_id !== MONTONIO_PROVIDER_ID) continue
        // Idempotentne: juba captured või tühistatud → vahele.
        if (p.captured_at || p.canceled_at) continue
        await capturePaymentWorkflow(container).run({ input: { payment_id: p.id } })
        logger.info(`[MONTONIO] Auto-captured payment ${p.id} for order #${order.display_id}`)
      }
    }
  } catch (err) {
    // Ära blokeeri tellimust capture-vea korral — logi + jäta admin'ile käsitsi-capture.
    logger.error(`[MONTONIO] Auto-capture failed for order ${orderId}: ${(err as Error).message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
