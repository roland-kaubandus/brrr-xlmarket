/**
 * Safe localStorage helpers.
 *
 * localStorage access can fail in three ways:
 *   1. SSR — window/localStorage is undefined in the Node.js runtime
 *   2. SecurityError — third-party iframe or browser privacy mode blocks access
 *   3. SyntaxError — JSON.parse throws on corrupt / tampered values
 *
 * These helpers guard all three cases and self-heal by removing the corrupt
 * entry so the component starts fresh on the next load.
 */

/**
 * Read a JSON value from localStorage, returning `fallback` on any failure.
 * When the stored string is not valid JSON, the key is removed automatically.
 */
export function safeReadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    console.warn(`[safe-storage] corrupt localStorage value for key "${key}", resetting`)
    try { localStorage.removeItem(key) } catch { /* storage blocked */ }
    return fallback
  }
}

/**
 * Write a JSON value to localStorage, silently swallowing errors
 * (e.g. QuotaExceededError, SecurityError in private-mode browsers).
 */
export function safeWriteJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — silently ignore */
  }
}
