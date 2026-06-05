/**
 * MontonioProviderService — Medusa 2.13 payment provider (Montonio Orders API v2).
 * Flow: initiatePayment → Montonio order (paymentUrl) → storefront redirect →
 * webhook (notificationUrl) kinnitab PAID → authorize → capture → tellimus.
 *
 * Identifier: "montonio" → makseviis "pp_montonio_montonio".
 * Task: tasks/2026-06-04-01-montonio-integration.md
 */
import {
  AbstractPaymentProvider,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import { MontonioClient, type MontonioEnv } from "./lib/client"

type Options = {
  accessKey: string
  secretKey: string
  environment?: MontonioEnv
  storeUrl?: string // storefront base (return-URL)
  backendUrl?: string // medusa avalik base (notification/webhook URL)
}

type SessionData = {
  uuid?: string
  paymentUrl?: string
  session_id?: string
  status?: string
}

export default class MontonioProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "montonio"

  protected options_: Options
  protected client_: MontonioClient

  constructor(container: Record<string, unknown>, options: Options) {
    // @ts-ignore
    super(...arguments)
    this.options_ = options
    this.client_ = new MontonioClient({
      accessKey: options.accessKey,
      secretKey: options.secretKey,
      environment: options.environment || "sandbox",
    })
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.accessKey || !options.secretKey) {
      throw new Error("Montonio: accessKey ja secretKey on kohustuslikud")
    }
  }

  /** Montonio paymentStatus → Medusa PaymentSessionStatus. */
  private mapStatus(montonioStatus?: string): PaymentSessionStatus {
    switch ((montonioStatus || "").toUpperCase()) {
      case "PAID":
        return PaymentSessionStatus.AUTHORIZED // Medusa capture'b järgmisena
      case "VOIDED":
      case "ABANDONED":
        return PaymentSessionStatus.CANCELED
      case "REFUNDED":
        return PaymentSessionStatus.CAPTURED
      case "PENDING":
      default:
        return PaymentSessionStatus.PENDING
    }
  }

  async initiatePayment(input: {
    currency_code: string
    amount: number
    data?: SessionData
    context?: Record<string, unknown>
  }): Promise<{ id: string; data: SessionData; status?: PaymentSessionStatus }> {
    const sessionId = (input.data?.session_id as string) || `ses_${Date.now()}`
    const store = this.options_.storeUrl || "https://xlmarket.ee"
    const backend = this.options_.backendUrl || "https://api.xlmarket.ee"

    const order = await this.client_.createOrder({
      merchantReference: sessionId,
      grandTotal: Number(input.amount),
      currency: (input.currency_code || "eur").toUpperCase(),
      returnUrl: `${store}/et/tellimus/tagasi?session=${encodeURIComponent(sessionId)}`,
      // Medusa sisseehitatud payment-webhook (POST /hooks/payment/[provider]).
      // provider-slug = pp_<identifier>_<id> = pp_montonio_montonio.
      notificationUrl: `${backend}/hooks/payment/pp_montonio_montonio`,
      locale: "et",
    })

    return {
      id: order.uuid,
      status: PaymentSessionStatus.PENDING,
      data: { uuid: order.uuid, paymentUrl: order.paymentUrl, session_id: sessionId, status: "PENDING" },
    }
  }

  async getPaymentStatus(input: { data?: SessionData }): Promise<{ status: PaymentSessionStatus; data: SessionData }> {
    const uuid = input.data?.uuid
    if (!uuid) return { status: PaymentSessionStatus.PENDING, data: input.data || {} }
    const order = await this.client_.getOrder(uuid)
    return { status: this.mapStatus(order.paymentStatus), data: { ...input.data, status: order.paymentStatus } }
  }

  async authorizePayment(input: { data?: SessionData }): Promise<{ status: PaymentSessionStatus; data: SessionData }> {
    return this.getPaymentStatus(input)
  }

  async capturePayment(input: { data?: SessionData }): Promise<{ data: SessionData }> {
    // Montonio orders on auto-capture (PAID = raha liikunud). Kinnita staatus.
    const uuid = input.data?.uuid
    if (uuid) {
      const order = await this.client_.getOrder(uuid)
      return { data: { ...input.data, status: order.paymentStatus } }
    }
    return { data: input.data || {} }
  }

  async refundPayment(input: { amount: number; data?: SessionData }): Promise<{ data: SessionData }> {
    const uuid = input.data?.uuid
    if (uuid) {
      await this.client_.refundOrder(uuid, Number(input.amount), "EUR")
    }
    return { data: { ...input.data, status: "REFUNDED" } }
  }

  async cancelPayment(input: { data?: SessionData }): Promise<{ data: SessionData }> {
    return { data: { ...(input.data || {}), status: "VOIDED" } }
  }

  async deletePayment(input: { data?: SessionData }): Promise<{ data: SessionData }> {
    return { data: input.data || {} }
  }

  async retrievePayment(input: { data?: SessionData }): Promise<{ data: SessionData }> {
    return this.getPaymentStatus(input).then((r) => ({ data: r.data }))
  }

  async updatePayment(input: { data?: SessionData }): Promise<{ data: SessionData }> {
    return { data: input.data || {} }
  }

  /** Webhook: Montonio POSTib { orderToken: JWT }. Valideeri → action + session_id. */
  async getWebhookActionAndData(payload: {
    data?: Record<string, unknown>
    rawData?: unknown
    headers?: Record<string, unknown>
  }): Promise<{ action: PaymentActions; data?: { session_id: string; amount: number } }> {
    const body = (payload.data || {}) as Record<string, unknown>
    const token = (body.orderToken || body.order_token) as string | undefined
    if (!token) return { action: PaymentActions.NOT_SUPPORTED }
    let claims: Record<string, unknown>
    try {
      claims = this.client_.verifyWebhookToken(token)
    } catch {
      return { action: PaymentActions.NOT_SUPPORTED }
    }
    const status = String(claims.paymentStatus || claims.status || "").toUpperCase()
    const sessionId = String(claims.merchantReference || "")
    const amount = Number(claims.grandTotal || 0)
    if (status === "PAID") {
      return { action: PaymentActions.AUTHORIZED, data: { session_id: sessionId, amount } }
    }
    if (status === "VOIDED" || status === "ABANDONED") {
      return { action: PaymentActions.CANCELED, data: { session_id: sessionId, amount } }
    }
    return { action: PaymentActions.PENDING, data: { session_id: sessionId, amount } }
  }
}
