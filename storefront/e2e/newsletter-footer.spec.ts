import { test, expect } from "@playwright/test"

// Jaluse uudiskirja-vormi render-test (GO #2, 2026-11-26). Kontrollib avalehe jaluses:
//   • e-posti input + "Telli"/"Subscribe" nupp nähtav (lipp NEXT_PUBLIC_NEWSLETTER_ENABLED sees)
//   • honeypot-väli OLEMAS DOM-is aga PEIDETUD (ei nähta inimesele)
//   • "Peagi saadaval"/"Coming soon" platshoider KADUNUD
// NB: lipp küpsetatakse build-ajal (NEXT_PUBLIC_*). Test eeldab, et bundle on ehitatud lipuga sees.
const BASE = process.env.BASE || "https://staging.xlmarket.ee"

for (const [locale, submit] of [["et", "Telli"], ["en", "Subscribe"]] as const) {
  test(`jaluse uudiskirja-vorm renderdub (${locale})`, async ({ page }) => {
    await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle" })

    const footer = page.locator("footer")
    const emailInput = footer.locator('input[type="email"]')
    await expect(emailInput, "e-posti input nähtav jaluses").toBeVisible({ timeout: 15000 })

    const btn = footer.getByRole("button", { name: submit })
    await expect(btn, `"${submit}" nupp nähtav`).toBeVisible()

    // Honeypot: DOM-is olemas, aga EI nähtav (off-screen).
    const hp = footer.locator('input[name="website"]')
    await expect(hp, "honeypot DOM-is olemas").toHaveCount(1)
    await expect(hp, "honeypot inimesele PEIDETUD").not.toBeVisible()

    // Platshoider kadunud.
    await expect(
      footer.getByText(locale === "et" ? "Peagi saadaval." : "Coming soon.", { exact: false })
    ).toHaveCount(0)
  })
}
