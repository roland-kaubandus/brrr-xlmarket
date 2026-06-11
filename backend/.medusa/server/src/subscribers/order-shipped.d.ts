import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
export default function orderShippedHandler({ event, container, }: SubscriberArgs<{
    id: string;
    fulfillment_id?: string;
}>): Promise<void>;
export declare const config: SubscriberConfig;
