/**
 * VEVOR XLSX Feed Sync Job
 *
 * Feed sync is handled by the external script: scripts/sync-vevor-feed.mjs
 * which runs via systemd timer every 4 hours.
 *
 * This Medusa scheduled job is disabled (no-op) to avoid conflicts.
 */

import type { MedusaContainer } from "@medusajs/framework/types"

export default async function syncVevorFeed(_container: MedusaContainer) {
  // Feed sync handled by external script + systemd timer
}

export const config = {
  name: "sync-vevor-feed",
  schedule: "0 0 31 2 *", // Disabled — will never fire (Feb 31)
}
