/**
 * REGRESSIOON-VÄRAV: kas hinna-lukk (is_custom_price) PÜSIB koguse-muutuse üle?
 *
 * MIKS: storefront PATCH /api/cart/items suunab koguse-muutuse Medusa STANDARD
 * endpointi `/store/carts/:id/line-items/:id` (updateLineItemInCartWorkflow), MITTE
 * lukustatud teed. Kui see refresh SULATAB add-time külmutatud hinna (kui feed-reprice
 * on vahepeal price_set'i muutnud), tekib bait-and-switch + Omnibus-risk korvis.
 *
 * TÕESTUS (Medusa 2.13.5, 2026-07-24): is_custom_price=true PÜSIB — koguse-uuendus
 * EI sulata lukustatud unit_price'i. Auku EI OLE. See skript on JÕUSTUS: kui Medusa-
 * upgrade käitumist muudab, FAIL (throw) püüab selle enne astmelist hinnastust.
 *
 * KÄIVITUS (medusa exec, ise-koristav — taastab hinna + kustutab throwaway-korvi):
 *   docker exec <medusa> sh -c 'cd /app && npx medusa exec ./scripts/verify-cartlock-quantity.mjs'
 * FAIL → viskab errori (nonzero exit). PASS → "✅ LUKK PIDAS".
 */
export default async function ({ container }) {
  const { Modules } = await import("@medusajs/framework/utils")
  const { addToCartWorkflow, updateLineItemInCartWorkflow, createCartWorkflow } =
    await import("@medusajs/core-flows")

  const cartModule = container.resolve(Modules.CART)
  const pricingModule = container.resolve(Modules.PRICING)
  const query = container.resolve("query")
  const log = (...a) => console.log(...a)

  // region/channel = Eesti / Default (SSoT: staging). Kui muutuvad, uuenda siin.
  const REGION = process.env.TEST_REGION_ID || "reg_01KMRXWSNXSYE4530A3K2BK86W"
  const CHANNEL = process.env.TEST_CHANNEL_ID || "sc_01KMRWP84555JPGA6M0QMG409M"

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "prices.id", "prices.amount", "prices.currency_code", "prices.price_set_id"],
    pagination: { take: 5 },
  })
  const v = variants.find((x) => (x.prices || []).some((p) => p.currency_code === "eur"))
  if (!v) throw new Error("verify-cartlock: ei leidnud eur-hinnaga varianti")
  const eurPrice = v.prices.find((p) => p.currency_code === "eur")
  const origAmount = Number(eurPrice.amount)
  log(`variant=${v.id} sku=${v.sku} orig_eur=${origAmount}`)

  let cartId
  let failed = null
  try {
    const { result: cart } = await createCartWorkflow(container).run({
      input: { region_id: REGION, sales_channel_id: CHANNEL, currency_code: "eur", items: [] },
    })
    cartId = cart.id

    await addToCartWorkflow(container).run({
      input: { cart_id: cartId, items: [{ variant_id: v.id, quantity: 1 }] },
    })

    // KÜLMUTA (nagu line-items-locked route)
    let lines = await cartModule.listLineItems({ cart_id: cartId },
      { select: ["id", "unit_price", "is_custom_price", "quantity"] })
    const line = lines[0]
    const frozenPrice = Number(line.unit_price)
    await cartModule.updateLineItems([
      { selector: { id: line.id }, data: { is_custom_price: true, unit_price: frozenPrice } },
    ])
    log(`LUKUSTATUD: unit_price=${frozenPrice} is_custom=true qty=1`)

    // SIMULEERI REPRICE: price_set eur +50%
    const newAmount = Math.round(origAmount * 1.5)
    await pricingModule.updatePrices([{ id: eurPrice.id, amount: newAmount }])
    log(`REPRICE (sim): ${origAmount} → ${newAmount}`)

    // MUUDA KOGUST standard-workflow'ga (= storefront PATCH tee)
    await updateLineItemInCartWorkflow(container).run({
      input: { cart_id: cartId, item_id: line.id, update: { quantity: 3 } },
    })

    lines = await cartModule.listLineItems({ cart_id: cartId },
      { select: ["id", "unit_price", "is_custom_price", "quantity"] })
    const after = lines[0]
    log(`\nunit_price: ${frozenPrice} → ${after.unit_price} · is_custom=${after.is_custom_price} · qty=${after.quantity}`)

    if (Number(after.unit_price) !== frozenPrice || after.is_custom_price !== true) {
      failed = `🛑 LUKK SULAS: unit_price ${frozenPrice}→${after.unit_price}, is_custom=${after.is_custom_price}. `
        + `Koguse-PATCH vajab lukustatud teed (line-items-locked koguse-variant).`
    } else {
      log(`\n✅ LUKK PIDAS — koguse-muutus ei sulanud lukustatud hinda. Auku ei ole.`)
    }
  } finally {
    try { await pricingModule.updatePrices([{ id: eurPrice.id, amount: origAmount }]) } catch (e) { log("cleanup price WARN:", e.message) }
    try { if (cartId) await cartModule.deleteCarts([cartId]) } catch (e) { log("cleanup cart WARN:", e.message) }
    log("cleanup: hind taastatud + throwaway-korv kustutatud")
  }
  if (failed) throw new Error(failed)
}
