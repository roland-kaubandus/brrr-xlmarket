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

    // Honeypot: DOM-is olemas, aga EKRAANILT VÄLJAS (off-screen left:-9999px) — klassikaline
    // honeypot-muster (TEADLIKULT mitte display:none, sest osa botte jätab display:none väljad
    // vahele). NB: Playwright loeb off-screen 1×1 elementi "visible"-ks (tal on bounding box),
    // seega kontrollime asukohta: kast peab olema vaateaknast vasakul väljas (x+width ≤ 0).
    const hp = footer.locator('input[name="website"]')
    await expect(hp, "honeypot DOM-is olemas").toHaveCount(1)
    await expect(hp, "honeypot tabindex -1 (klaviatuurile kättesaamatu)").toHaveAttribute("tabindex", "-1")
    const box = await hp.boundingBox()
    expect(box, "honeypot bounding box olemas").not.toBeNull()
    expect(box!.x + box!.width, "honeypot vaateaknast vasakul väljas").toBeLessThanOrEqual(0)

    // Platshoider kadunud.
    await expect(
      footer.getByText(locale === "et" ? "Peagi saadaval." : "Coming soon.", { exact: false })
    ).toHaveCount(0)
  })
}
