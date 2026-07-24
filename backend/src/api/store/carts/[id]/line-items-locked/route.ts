/**
 * POST /store/carts/:id/line-items-locked — HINNA-LUKUGA ostukorvi lisamine.
 *
 * PROBLEEM: feed-reprice muudab price.amount iga tsükli. Medusa
 * `refreshCartItemsWorkflow` hinnastab OLEMASOLEVAD korvi-read ümber
 * (is_custom_price=false read järgivad price_set'i). → klient, kes lisas
 * toote hinnaga X, näeks checkoutis X' (bait-and-switch + Omnibus-risk).
 *
 * LAHENDUS: lisa rida tavaliselt (Medusa arvutab JOOKSVA õige hinna oma
 * price_set'ist — klient EI saa hinda süstida), seejärel KÜLMUTA rida
 * `is_custom_price=true`, hoides sama unit_price. Edaspidised refresh'id
 * ei liiguta lukustatud ridu.
 *
 * TURVE: hind tuleb AINULT Medusa server-side arvutusest, MITTE request-body'st.
 * Body annab ainult variant_id + quantity (valideeritud).
 */
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { addToCartWorkflow } from "@medusajs/core-flows"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const cartId = req.params.id
  const body = (req.body ?? {}) as { variant_id?: unknown; quantity?: unknown }
  const variantId = typeof body.variant_id === "string" ? body.variant_id : ""
  const quantity = Number(body.quantity)

  if (!cartId || !variantId) {
    return res.status(400).json({ error: "cart id (path) ja variant_id (body) on kohustuslikud" })
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return res.status(400).json({ error: "quantity peab olema täisarv 1..99" })
  }

  const cartModule = req.scope.resolve(Modules.CART)

  // (1) Lisa rida — Medusa arvutab JOOKSVA hinna oma price_set'ist.
  await addToCartWorkflow(req.scope).run({
    input: { cart_id: cartId, items: [{ variant_id: variantId, quantity }] },
  })

  // (2) KÜLMUTA kõik veel-lukustamata read add-time hinnaga (per-ühik).
  const lines = await cartModule.listLineItems(
    { cart_id: cartId },
    { select: ["id", "unit_price", "is_custom_price"] },
  )
  const toFreeze = lines
    .filter((l) => !(l as { is_custom_price?: boolean }).is_custom_price)
    .map((l) => ({
      selector: { id: l.id },
      data: { is_custom_price: true, unit_price: l.unit_price },
    }))
  if (toFreeze.length) {
    await cartModule.updateLineItems(toFreeze)
  }

  // (3) Tagasta värske korv (checkout-vaate jaoks).
  const cart = await cartModule.retrieveCart(cartId, {
    relations: ["items"],
    select: ["id"],
  })
  return res.json({ cart, locked: toFreeze.length })
}
