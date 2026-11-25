import { test, expect } from "@playwright/test"

// Uudiskirja kassa-linnukese render-test (GO aktiveerimine 2026-11-25).
// Loob ostukorvi + rea storefronti AVALIKU API kaudu, seemnedab localStorage'i
// (sama võti nagu AddToCartButton), siis kontrollib /tellimus lehel:
//   • #marketing_consent linnuke nähtav + VAIKIMISI MÄRKIMATA (GDPR opt-in)
//   • "Loe lähemalt" (ET) / "Read more" (EN) link → /{locale}/privaatsus
const BASE = process.env.BASE || "https://staging.xlmarket.ee"
const VARIANT = process.env.VARIANT_ID || "variant_01KNXX6161XA2S6GQT0TDEYB6T"

async function seedCart(request: any): Promise<string> {
  const c = await request.post(`${BASE}/api/cart`)
  expect(c.ok(), "cart-loomine").toBeTruthy()
  const cartId = (await c.json()).cart.id as string
  const a = await request.post(`${BASE}/api/cart/items`, {
    headers: { "Content-Type": "application/json" },
    data: { cart_id: cartId, variant_id: VARIANT, quantity: 1 },
  })
  expect(a.ok(), "rea lisamine").toBeTruthy()
  return cartId
}

for (const [locale, linkText] of [["et", "Loe lähemalt"], ["en", "Read more"]] as const) {
  test(`kassa uudiskirja-linnuke renderdub (${locale})`, async ({ page, request }) => {
    const cartId = await seedCart(request)
    // sea localStorage origin'ile enne tellimus-lehele minekut
    await page.addInitScript((id) => {
      try { localStorage.setItem("xlmarket_cart_id", id as string) } catch {}
    }, cartId)
    await page.goto(`${BASE}/${locale}/tellimus`, { waitUntil: "networkidle" })

    const cb = page.locator("#marketing_consent")
    await expect(cb, "linnuke nähtav").toBeVisible({ timeout: 15000 })
    await expect(cb, "vaikimisi MÄRKIMATA (opt-in)").not.toBeChecked()

    // Skoobi link linnukese-sildi SISSE — lehel on teisigi "Loe lähemalt"/"Read more"
    // linke (nt küpsiste-poliitika), seega page-level getByRole rikuks strict-mode'i.
    const label = page.locator('label[for="marketing_consent"]')
    const link = label.getByRole("link", { name: linkText })
    await expect(link, `"${linkText}" link nähtav sildis`).toBeVisible()
    await expect(link).toHaveAttribute("href", `/${locale}/privaatsus`)
  })
}
