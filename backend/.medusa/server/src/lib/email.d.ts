interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}
export declare function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void>;
export interface OrderItem {
    title: string;
    quantity: number;
    unit_price: number;
    currency_code?: string;
}
export interface OrderData {
    id: string;
    display_id?: number;
    email: string;
    total: number;
    subtotal?: number;
    shipping_total?: number;
    tax_total?: number;
    currency_code: string;
    items: OrderItem[];
    payment_collections?: {
        status?: string;
    }[];
    shipping_address?: {
        first_name?: string;
        last_name?: string;
        address_1?: string;
        city?: string;
        postal_code?: string;
        phone?: string;
    };
}
export declare function sendOrderConfirmation(order: OrderData): Promise<void>;
export declare function sendInvoice(order: OrderData): Promise<void>;
export declare function sendShippingConfirmation(order: OrderData, trackingNumber?: string): Promise<void>;
export {};
