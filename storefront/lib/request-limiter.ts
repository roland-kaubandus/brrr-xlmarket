// Global SSR request limiter — prevents event loop saturation
// When too many pages render simultaneously, new requests queue briefly then get 503
const MAX_CONCURRENT_SSR = 6  // 2 per PM2 worker
const QUEUE_TIMEOUT_MS = 2000 // wait max 2s in queue before 503

let activeSSR = 0
const waitQueue: Array<() => void> = []

/** Acquire an SSR slot. Resolves true if acquired, false if timed out. */
export function acquireSSR(): Promise<boolean> {
  if (activeSSR < MAX_CONCURRENT_SSR) {
    activeSSR++
    return Promise.resolve(true)
  }

  // Queue the request — wait for a slot to open
  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      const idx = waitQueue.indexOf(release)
      if (idx >= 0) waitQueue.splice(idx, 1)
      resolve(false)
    }, QUEUE_TIMEOUT_MS)

    function release() {
      clearTimeout(timeout)
      activeSSR++
      resolve(true)
    }

    waitQueue.push(release)
  })
}

export function releaseSSR() {
  activeSSR--
  if (waitQueue.length > 0 && activeSSR < MAX_CONCURRENT_SSR) {
    const next = waitQueue.shift()
    next?.()
  }
}

export function getActiveSSR(): number {
  return activeSSR
}
