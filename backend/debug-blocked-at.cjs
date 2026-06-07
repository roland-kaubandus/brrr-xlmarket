// Debug-preload: event-loop blokeerimise tuvastaja (blocked-at).
// AKTIVEERUB AINULT kui DEBUG_BLOCKED_AT env seatud → prod-ohutu (no-op muidu).
// Lae NODE_OPTIONS=--require /app/debug-blocked-at.cjs kaudu (ainult staging).
// Cart-stall juuruurimine 2026-06-07: globaalne off-CPU event-loop freeze.
if (process.env.DEBUG_BLOCKED_AT) {
  try {
    const blocked = require("blocked-at")
    const thresholdMs = parseInt(process.env.DEBUG_BLOCKED_AT_MS || "1000", 10)
    blocked(
      (time, stack, { type, resource } = {}) => {
        // eslint-disable-next-line no-console
        console.error(
          "BLOCKED_AT " +
            JSON.stringify({
              ms: Math.round(time),
              type: type || null,
              stack: (stack || []).slice(0, 18),
            })
        )
      },
      { threshold: thresholdMs }
    )
    // eslint-disable-next-line no-console
    console.error(`[debug-blocked-at] ON, threshold=${thresholdMs}ms`)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[debug-blocked-at] laadimine ebaõnnestus:", e && e.message)
  }
}
