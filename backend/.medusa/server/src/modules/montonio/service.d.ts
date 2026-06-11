/**
 * MontonioProviderService — Medusa 2.13 payment provider (Montonio Orders API v2).
 * Flow: initiatePayment → Montonio order (paymentUrl) → storefront redirect →
 * webhook (notificationUrl) kinnitab PAID → authorize → capture → tellimus.
 *
 * Identifier: "montonio" → makseviis "pp_montonio_montonio".
 * Task: tasks/2026-06-04-01-montonio-integration.md
 */
import { AbstractPaymentProvider, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils";
import { MontonioClient, type MontonioEnv } from "./lib/client";
type Options = {
    accessKey: string;
    secretKey: string;
    environment?: MontonioEnv;
    storeUrl?: string;
    backendUrl?: string;
};
type SessionData = {
    uuid?: string;
    paymentUrl?: string;
    session_id?: string;
    status?: string;
};
export default class MontonioProviderService extends AbstractPaymentProvider<Options> {
    static identifier: string;
    protected options_: Options;
    protected client_: MontonioClient;
    constructor(container: Record<string, unknown>, options: Options);
    static validateOptions(options: Record<string, unknown>): void;
    /** Montonio paymentStatus → Medusa PaymentSessionStatus. */
    private mapStatus;
    initiatePayment(input: {
        currency_code: string;
        amount: number;
        data?: SessionData;
        context?: Record<string, unknown>;
    }): Promise<{
        id: string;
        data: SessionData;
        status?: PaymentSessionStatus;
    }>;
    getPaymentStatus(input: {
        data?: SessionData;
    }): Promise<{
        status: PaymentSessionStatus;
        data: SessionData;
    }>;
    authorizePayment(input: {
        data?: SessionData;
    }): Promise<{
        status: PaymentSessionStatus;
        data: SessionData;
    }>;
    capturePayment(input: {
        data?: SessionData;
    }): Promise<{
        data: SessionData;
    }>;
    refundPayment(input: {
        amount: number;
        data?: SessionData;
    }): Promise<{
        data: SessionData;
    }>;
    cancelPayment(input: {
        data?: SessionData;
    }): Promise<{
        data: SessionData;
    }>;
    deletePayment(input: {
        data?: SessionData;
    }): Promise<{
        data: SessionData;
    }>;
    retrievePayment(input: {
        data?: SessionData;
    }): Promise<{
        data: SessionData;
    }>;
    updatePayment(input: {
        data?: SessionData;
    }): Promise<{
        data: SessionData;
    }>;
    /** Webhook: Montonio POSTib { orderToken: JWT }. Valideeri → action + session_id. */
    getWebhookActionAndData(payload: {
        data?: Record<string, unknown>;
        rawData?: unknown;
        headers?: Record<string, unknown>;
    }): Promise<{
        action: PaymentActions;
        data?: {
            session_id: string;
            amount: number;
        };
    }>;
}
export {};
