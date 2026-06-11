"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * MontonioProviderService — Medusa 2.13 payment provider (Montonio Orders API v2).
 * Flow: initiatePayment → Montonio order (paymentUrl) → storefront redirect →
 * webhook (notificationUrl) kinnitab PAID → authorize → capture → tellimus.
 *
 * Identifier: "montonio" → makseviis "pp_montonio_montonio".
 * Task: tasks/2026-06-04-01-montonio-integration.md
 */
const utils_1 = require("@medusajs/framework/utils");
const client_1 = require("./lib/client");
class MontonioProviderService extends utils_1.AbstractPaymentProvider {
    constructor(container, options) {
        // @ts-ignore
        super(...arguments);
        this.options_ = options;
        this.client_ = new client_1.MontonioClient({
            accessKey: options.accessKey,
            secretKey: options.secretKey,
            environment: options.environment || "sandbox",
        });
    }
    static validateOptions(options) {
        if (!options.accessKey || !options.secretKey) {
            throw new Error("Montonio: accessKey ja secretKey on kohustuslikud");
        }
    }
    /** Montonio paymentStatus → Medusa PaymentSessionStatus. */
    mapStatus(montonioStatus) {
        switch ((montonioStatus || "").toUpperCase()) {
            case "PAID":
                return utils_1.PaymentSessionStatus.AUTHORIZED; // Medusa capture'b järgmisena
            case "VOIDED":
            case "ABANDONED":
                return utils_1.PaymentSessionStatus.CANCELED;
            case "REFUNDED":
                return utils_1.PaymentSessionStatus.CAPTURED;
            case "PENDING":
            default:
                return utils_1.PaymentSessionStatus.PENDING;
        }
    }
    async initiatePayment(input) {
        const sessionId = input.data?.session_id || `ses_${Date.now()}`;
        const store = this.options_.storeUrl || "https://xlmarket.ee";
        const backend = this.options_.backendUrl || "https://api.xlmarket.ee";
        const order = await this.client_.createOrder({
            merchantReference: sessionId,
            grandTotal: Number(input.amount),
            currency: (input.currency_code || "eur").toUpperCase(),
            returnUrl: `${store}/et/tellimus/tagasi?session=${encodeURIComponent(sessionId)}`,
            // Medusa sisseehitatud payment-webhook (POST /hooks/payment/[provider]).
            // provider-slug = pp_<identifier>_<id> = pp_montonio_montonio.
            notificationUrl: `${backend}/hooks/payment/pp_montonio_montonio`,
            locale: "et",
        });
        return {
            id: order.uuid,
            status: utils_1.PaymentSessionStatus.PENDING,
            data: { uuid: order.uuid, paymentUrl: order.paymentUrl, session_id: sessionId, status: "PENDING" },
        };
    }
    async getPaymentStatus(input) {
        const uuid = input.data?.uuid;
        if (!uuid)
            return { status: utils_1.PaymentSessionStatus.PENDING, data: input.data || {} };
        const order = await this.client_.getOrder(uuid);
        return { status: this.mapStatus(order.paymentStatus), data: { ...input.data, status: order.paymentStatus } };
    }
    async authorizePayment(input) {
        return this.getPaymentStatus(input);
    }
    async capturePayment(input) {
        // Montonio orders on auto-capture (PAID = raha liikunud). Kinnita staatus.
        const uuid = input.data?.uuid;
        if (uuid) {
            const order = await this.client_.getOrder(uuid);
            return { data: { ...input.data, status: order.paymentStatus } };
        }
        return { data: input.data || {} };
    }
    async refundPayment(input) {
        const uuid = input.data?.uuid;
        if (uuid) {
            await this.client_.refundOrder(uuid, Number(input.amount), "EUR");
        }
        return { data: { ...input.data, status: "REFUNDED" } };
    }
    async cancelPayment(input) {
        return { data: { ...(input.data || {}), status: "VOIDED" } };
    }
    async deletePayment(input) {
        return { data: input.data || {} };
    }
    async retrievePayment(input) {
        return this.getPaymentStatus(input).then((r) => ({ data: r.data }));
    }
    async updatePayment(input) {
        return { data: input.data || {} };
    }
    /** Webhook: Montonio POSTib { orderToken: JWT }. Valideeri → action + session_id. */
    async getWebhookActionAndData(payload) {
        const body = (payload.data || {});
        const token = (body.orderToken || body.order_token);
        if (!token)
            return { action: utils_1.PaymentActions.NOT_SUPPORTED };
        let claims;
        try {
            claims = this.client_.verifyWebhookToken(token);
        }
        catch {
            return { action: utils_1.PaymentActions.NOT_SUPPORTED };
        }
        const status = String(claims.paymentStatus || claims.status || "").toUpperCase();
        const sessionId = String(claims.merchantReference || "");
        const amount = Number(claims.grandTotal || 0);
        if (status === "PAID") {
            return { action: utils_1.PaymentActions.AUTHORIZED, data: { session_id: sessionId, amount } };
        }
        if (status === "VOIDED" || status === "ABANDONED") {
            return { action: utils_1.PaymentActions.CANCELED, data: { session_id: sessionId, amount } };
        }
        return { action: utils_1.PaymentActions.PENDING, data: { session_id: sessionId, amount } };
    }
}
MontonioProviderService.identifier = "montonio";
exports.default = MontonioProviderService;
//# sourceMappingURL=service.js.map