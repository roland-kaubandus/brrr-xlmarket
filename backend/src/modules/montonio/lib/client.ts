/**
 * Montonio Orders API v2 klient (sandbox + live).
 * Docs: https://docs.montonio.com (Orders API). Auth: JWT HS256 secret key'ga.
 *
 * NB: väljanimed (grandTotal, paymentStatus jne) on Orders API v2 järgi —
 * sandbox-testil kinnita (task 2026-06-04-01 §5).
 */
import jwt from "jsonwebtoken"

export type MontonioEnv = "sandbox" | "live"

export interface MontonioOptions {
  accessKey: string
  secretKey: string
  environment: MontonioEnv
}

export interface CreateOrderInput {
  merchantReference: string // = Medusa payment session id
  grandTotal: number // major units (nt 12.99)
  currency: string // "EUR"
  returnUrl: string
  notificationUrl: string
  locale?: string // "et" | "en"
  paymentDescription?: string
}

export interface MontonioOrder {
  uuid: string
  paymentUrl: string
  paymentStatus?: string // PENDING | PAID | VOIDED | ABANDONED | REFUNDED ...
  merchantReference?: string
  grandTotal?: number
  currency?: string
}

const BASE: Record<MontonioEnv, string> = {
  sandbox: "https://sandbox-api.montonio.com",
  live: "https://api.montonio.com",
}

export class MontonioClient {
  private accessKey: string
  private secretKey: string
  private base: string

  constructor(opts: MontonioOptions) {
    this.accessKey = opts.accessKey
    this.secretKey = opts.secretKey
    this.base = BASE[opts.environment] || BASE.sandbox
  }

  /** Allkirjasta payload JWT-na (HS256, 10 min exp). */
  private sign(payload: Record<string, unknown>): string {
    return jwt.sign({ ...payload, accessKey: this.accessKey }, this.secretKey, {
      algorithm: "HS256",
      expiresIn: "10m",
    })
  }

  /** Bearer-token GET-päringuteks (accessKey claim). */
  private bearer(): string {
    return jwt.sign({ accessKey: this.accessKey }, this.secretKey, {
      algorithm: "HS256",
      expiresIn: "10m",
    })
  }

  /** Loo makse-order → tagastab paymentUrl + uuid. */
  async createOrder(input: CreateOrderInput): Promise<MontonioOrder> {
    const orderToken = this.sign({
      merchantReference: input.merchantReference,
      returnUrl: input.returnUrl,
      notificationUrl: input.notificationUrl,
      grandTotal: input.grandTotal,
      currency: input.currency,
      locale: input.locale || "et",
      payment: {
        method: "paymentInitiation",
        amount: input.grandTotal,
        currency: input.currency,
        methodOptions: {
          paymentDescription: input.paymentDescription || input.merchantReference,
          preferredCountry: "EE",
          preferredLocale: input.locale || "et",
        },
      },
    })
    const res = await fetch(`${this.base}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: orderToken }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Montonio createOrder ${res.status}: ${t.slice(0, 300)}`)
    }
    return (await res.json()) as MontonioOrder
  }

  /** Päri order'i staatus uuid järgi. */
  async getOrder(uuid: string): Promise<MontonioOrder> {
    const res = await fetch(`${this.base}/orders/${uuid}`, {
      headers: { Authorization: `Bearer ${this.bearer()}` },
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Montonio getOrder ${res.status}: ${t.slice(0, 300)}`)
    }
    return (await res.json()) as MontonioOrder
  }

  /** Tagasimakse. */
  async refundOrder(uuid: string, amount: number, currency: string): Promise<unknown> {
    const token = this.sign({ orderUuid: uuid, amount, currency })
    const res = await fetch(`${this.base}/refunds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: token }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Montonio refund ${res.status}: ${t.slice(0, 300)}`)
    }
    return await res.json()
  }

  /** Valideeri webhook'i orderToken (JWT) + tagasta payload. Viskab kui vigane. */
  verifyWebhookToken(token: string): Record<string, unknown> {
    return jwt.verify(token, this.secretKey, { algorithms: ["HS256"] }) as Record<string, unknown>
  }
}
