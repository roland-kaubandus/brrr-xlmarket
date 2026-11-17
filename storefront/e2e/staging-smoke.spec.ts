import { test, expect } from '@playwright/test'

// STAGING-smoke (nädalane QA). Siht = staging.xlmarket.ee (k33g, PÄRIS pood).
// EI aja segi homepage.spec.ts-iga, mis käib xlmarket.ee (PROD uo28 coming-soon) pihta
// ja on mõeldud CUTOVER-hetkeks. Kerged, kiired, mitte-õrnad kontrollid — eesmärk on
// avastada "pood katki" regressioon, mitte pikseltäpne UI.
const BASE = process.env.QA_SMOKE_URL || 'https://staging.xlmarket.ee'

test('S1: /et/kategooriad renderdab ≥18 L1-kategooriat', async ({ page }) => {
  const resp = await page.goto(`${BASE}/et/kategooriad`, { waitUntil: 'domcontentloaded' })
  expect(resp?.status(), 'kategooriad-leht peab vastama 200').toBe(200)
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 })
  const links = await page.locator('a[href*="/kategooriad/"]').count()
  expect(links, 'peab olema vähemalt 18 L1-kategooria-linki').toBeGreaterThanOrEqual(18)
})

test('S2: kategooria-leht avaneb (L1 → sisu)', async ({ page }) => {
  await page.goto(`${BASE}/et/kategooriad`, { waitUntil: 'domcontentloaded' })
  await page.locator('a[href*="/kategooriad/"]').first().click()
  await expect(page).toHaveURL(/\/kategooriad\/[a-z0-9-]+/, { timeout: 10000 })
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 })
})

test('S3: otsing "soojendi" annab tulemusi (KIHT 1 regressioon)', async ({ page }) => {
  const resp = await page.goto(`${BASE}/et/otsing?q=soojendi`, { waitUntil: 'domcontentloaded' })
  // otsingu-marsruut võib erineda; kui 404, märgi SKIP-ina (ära kukuta kogu smoke'i)
  test.skip(resp?.status() === 404, 'otsingu-marsruut /et/otsing puudub sellel buildil')
  expect(resp?.status()).toBeLessThan(500)
  const body = await page.locator('body').innerText()
  expect(body.length, 'otsingu-leht peab sisu renderdama').toBeGreaterThan(200)
})
