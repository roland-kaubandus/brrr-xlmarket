export type MontonioEnv = "sandbox" | "live";
export interface MontonioOptions {
    accessKey: string;
    secretKey: string;
    environment: MontonioEnv;
}
export interface CreateOrderInput {
    merchantReference: string;
    grandTotal: number;
    currency: string;
    returnUrl: string;
    notificationUrl: string;
    locale?: string;
    paymentDescription?: string;
}
export interface MontonioOrder {
    uuid: string;
    paymentUrl: string;
    paymentStatus?: string;
    merchantReference?: string;
    grandTotal?: number;
    currency?: string;
}
export declare class MontonioClient {
    private accessKey;
    private secretKey;
    private base;
    constructor(opts: MontonioOptions);
    /** Allkirjasta payload JWT-na (HS256, 10 min exp). */
    private sign;
    /** Bearer-token GET-päringuteks (accessKey claim). */
    private bearer;
    /** Loo makse-order → tagastab paymentUrl + uuid. */
    createOrder(input: CreateOrderInput): Promise<MontonioOrder>;
    /** Päri order'i staatus uuid järgi. */
    getOrder(uuid: string): Promise<MontonioOrder>;
    /** Tagasimakse. */
    refundOrder(uuid: string, amount: number, currency: string): Promise<unknown>;
    /** Valideeri webhook'i orderToken (JWT) + tagasta payload. Viskab kui vigane. */
    verifyWebhookToken(token: string): Record<string, unknown>;
}
