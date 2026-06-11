/**
 * VEVOR XLSX Feed Sync Job
 *
 * Feed sync is handled by the external script: scripts/sync-vevor-feed.mjs
 * which runs via systemd timer every 4 hours.
 *
 * This Medusa scheduled job is disabled (no-op) to avoid conflicts.
 */
import type { MedusaContainer } from "@medusajs/framework/types";
export default function syncVevorFeed(_container: MedusaContainer): Promise<void>;
export declare const config: {
    name: string;
    schedule: string;
};
