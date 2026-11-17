import { defineConfig } from '@playwright/test'

// Eraldi config NÄDALASE QA staging-smoke jaoks (weekly-qa.sh). Peakonfiguratsioon
// (playwright.config.ts) kasutab testMatch 'e2e.spec.ts' (cutover-smoke) — ei puutu seda.
export default defineConfig({
  testDir: './e2e',
  testMatch: ['staging-smoke.spec.ts'],
  timeout: 30000,
  retries: 1,
  use: { headless: true, screenshot: 'only-on-failure', video: 'off' },
  outputDir: '/tmp/playwright-results/staging-smoke',
  reporter: [['list'], ['json', { outputFile: '/tmp/playwright-results/staging-smoke.json' }]],
})
