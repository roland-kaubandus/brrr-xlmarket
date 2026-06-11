"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MontonioClient = void 0;
/**
 * Montonio Orders API v2 klient (sandbox + live).
 * Docs: https://docs.montonio.com (Orders API). Auth: JWT HS256 secret key'ga.
 *
 * NB: väljanimed (grandTotal, paymentStatus jne) on Orders API v2 järgi —
 * sandbox-testil kinnita (task 2026-06-04-01 §5).
 */
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const BASE = {
    sandbox: "https://sandbox-api.montonio.com",
    live: "https://api.montonio.com",
};
class MontonioClient {
    constructor(opts) {
        this.accessKey = opts.accessKey;
        this.secretKey = opts.secretKey;
        this.base = BASE[opts.environment] || BASE.sandbox;
    }
    /** Allkirjasta payload JWT-na (HS256, 10 min exp). */
    sign(payload) {
        return jsonwebtoken_1.default.sign({ ...payload, accessKey: this.accessKey }, this.secretKey, {
            algorithm: "HS256",
            expiresIn: "10m",
        });
    }
    /** Bearer-token GET-päringuteks (accessKey claim). */
    bearer() {
        return jsonwebtoken_1.default.sign({ accessKey: this.accessKey }, this.secretKey, {
            algorithm: "HS256",
            expiresIn: "10m",
        });
    }
    /** Loo makse-order → tagastab paymentUrl + uuid. */
    async createOrder(input) {
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
        });
        const res = await fetch(`${this.base}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: orderToken }),
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Montonio createOrder ${res.status}: ${t.slice(0, 300)}`);
        }
        return (await res.json());
    }
    /** Päri order'i staatus uuid järgi. */
    async getOrder(uuid) {
        const res = await fetch(`${this.base}/orders/${uuid}`, {
            headers: { Authorization: `Bearer ${this.bearer()}` },
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Montonio getOrder ${res.status}: ${t.slice(0, 300)}`);
        }
        return (await res.json());
    }
    /** Tagasimakse. */
    async refundOrder(uuid, amount, currency) {
        const token = this.sign({ orderUuid: uuid, amount, currency });
        const res = await fetch(`${this.base}/refunds`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: token }),
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Montonio refund ${res.status}: ${t.slice(0, 300)}`);
        }
        return await res.json();
    }
    /** Valideeri webhook'i orderToken (JWT) + tagasta payload. Viskab kui vigane. */
    verifyWebhookToken(token) {
        return jsonwebtoken_1.default.verify(token, this.secretKey, { algorithms: ["HS256"] });
    }
}
exports.MontonioClient = MontonioClient;
//# sourceMappingURL=client.js.map