import { test, expect } from "@playwright/test"

// Privaatsuslehe render-test (CMS SSoT sync 2026-11-26).
// Kontrollib, et /privaatsus renderdab:
//   • §6 Otseturundus / Direct Marketing (heakskiidetud mustand, juba DB-s)
//   • uus jõustumiskuupäev (fallback JSON == DB pärast sync'i)
// DB võidab (getLegalPage), fallback JSON on git-SSoT — mõlemad peavad ühtima.
const BASE = process.env.BASE || "https://staging.xlmarket.ee"

const CASES = [
  { locale: "et", heading: "6. Otseturundus", date: "25. november 2026" },
  { locale: "en", heading: "6. Direct Marketing", date: "25 November 2026" },
] as const

for (const { locale, heading, date } of CASES) {
  test(`privaatsus renderdab §6 + uue kuupäeva (${locale})`, async ({ page }) => {
    await page.goto(`${BASE}/${locale}/privaatsus`, { waitUntil: "networkidle" })

    // §6 pealkiri renderdatud markdownis (CmsMarkdown → <h2>)
    const h = page.getByRole("heading", { name: heading })
    await expect(h, `§6 pealkiri "${heading}" nähtav`).toBeVisible({ timeout: 15000 })

    // uus jõustumiskuupäev lehel nähtav
    await expect(
      page.getByText(date, { exact: false }),
      `jõustumiskuupäev "${date}" nähtav`,
    ).toBeVisible({ timeout: 15000 })
  })
}
