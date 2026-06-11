import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
export default function orderPlacedHandler({ event, container, }: SubscriberArgs<{
    id: string;
}>): Promise<void>;
export declare const config: SubscriberConfig;
