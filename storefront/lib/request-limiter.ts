// Global SSR request limiter — prevents event loop saturation
// When too many pages render simultaneously, new requests get 503
const MAX_CONCURRENT_SSR = 5
let activeSSR = 0

export function acquireSSR(): boolean {
  if (activeSSR >= MAX_CONCURRENT_SSR) return false
  activeSSR++
  return true
}

export function releaseSSR() {
  if (activeSSR > 0) activeSSR--
}

export function getActiveSSR(): number {
  return activeSSR
}
