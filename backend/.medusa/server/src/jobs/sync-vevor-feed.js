"use strict";
/**
 * VEVOR XLSX Feed Sync Job
 *
 * Feed sync is handled by the external script: scripts/sync-vevor-feed.mjs
 * which runs via systemd timer every 4 hours.
 *
 * This Medusa scheduled job is disabled (no-op) to avoid conflicts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = syncVevorFeed;
async function syncVevorFeed(_container) {
    // Feed sync handled by external script + systemd timer
}
exports.config = {
    name: "sync-vevor-feed",
    schedule: "0 0 * * *", // No-op placeholder; keep interval within Node's timer limit
};
//# sourceMappingURL=sync-vevor-feed.js.map