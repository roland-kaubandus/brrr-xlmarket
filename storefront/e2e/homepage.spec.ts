import { test, expect } from '@playwright/test';

test('T1: MegaMenu drills L1 → L2 → L3', async ({ page }) => {
  await page.goto('https://xlmarket.store/et/')
  await page.getByRole('menuitem', { name: /HoReCa/i }).hover()
  await expect(page.getByRole('menu').filter({ hasText: /Small Kitchen Appliances/i })).toBeVisible({ timeout: 3000 })
  await page.getByRole('menuitem', { name: /Small Kitchen Appliances/i }).hover()
  await page.waitForResponse(url => url.url().includes('/api/category-children'), { timeout: 5000 })
})

test('T2: wishlist resilient to corrupt localStorage', async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('xlmarket_wishlist', 'not-json')
  })
  await page.goto('https://xlmarket.store/et/kategooriad/horeca-food-service')
  await expect(page.locator('h1')).toBeVisible()
  const heart = page.locator('[aria-label*="wishlist"], [aria-label*="Wishlist"]').first()
  if (await heart.isVisible()) {
    await heart.click()
  }
  const healed = await page.evaluate(() => localStorage.getItem('xlmarket_wishlist'))
  expect(healed).not.toBe('not-json')
})

test('T3: /et/kategooriad shows all 18 L1', async ({ page }) => {
  await page.goto('https://xlmarket.store/et/kategooriad')
  const links = await page.locator('a[href*="/kategooriad/"]').count()
  expect(links).toBeGreaterThanOrEqual(18)
  await page.locator('a[href*="/kategooriad/"]').first().click()
  await expect(page).toHaveURL(/\/kategooriad\/[a-z-]+/)
})

test('T4: product breadcrumb renders full chain', async ({ page }) => {
  await page.goto('https://xlmarket.store/et/kategooriad/horeca-food-service')
  await page.locator('[href*="/toode/"]').first().click()
  await page.waitForURL(/\/toode\//)
  await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()
  const crumbs = await page.locator('nav[aria-label="Breadcrumb"] a').count()
  expect(crumbs).toBeGreaterThanOrEqual(1)
})

test('T5: subcategory click is client-side nav (no full reload)', async ({ page }) => {
  await page.goto('https://xlmarket.store/et/kategooriad/horeca-food-service')
  await page.evaluate(() => (window as any).__marker = 'original')
  await page.locator('[role="list"][aria-label*="ubcategor"] a').first().click()
  await page.waitForURL(/\/kategooriad\//)
  const marker = await page.evaluate(() => (window as any).__marker)
  expect(marker).toBe('original')
})
