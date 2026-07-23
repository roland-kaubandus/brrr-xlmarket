# Split-brain saadavus — kaks tõe-allikat lahknesid (2026-07-23)

**Sümptom:** kategooria-kaart (Meili) = "Otsas", tooteleht (Medusa) = "Laos" + ostunupp.
Klient sai tarnimatu (churned) toote osta.

**Tõestus (bug-toode, rattan-kummut `...tbctj6chsbddzmqkwv0`):**
`feed_status='missing'` · Meili `in_stock=false` · Medusa `stocked_quantity=100` (dummy).

---

## Q1 — Kus tooteleht saadavust luges + kas saab lugeda sama tõde mis kaart?

**Enne (split-brain):**
- Kategooria-kaart → Meili `in_stock` (õige, feed-põhine).
- Tooteleht → `ProductPurchasePanel.hasInventory()` → `variant.inventory_quantity` (Medusa).
  See väli EI täitunud kunagi õigelt → `hasInventory` → alati `true` → "Laos" + ostunupp.

**Nüüd (parandatud, kood commit'itud):** tooteleht loeb **sama Meili `in_stock`** mis kaart:
- `route.ts` — `in_stock: meiliHit.in_stock` toote-objekti.
- `ProductContent.tsx` — `feedInStock={product.in_stock}` → panel.
- `ProductPurchasePanel.tsx` — `inStock = feedInStock !== false && hasInventory(...)`.
  `feedInStock===false` (churned/OOS) → ostunupp peidus, sõltumata Medusa dummy'st.
  `hasInventory` jääb fallback'iks (`undefined` → vana käitumine, tagurpidi-ühilduv).

→ **JAH.** Mõlemad kohad annavad nüüd sama vastuse. *(Läheb elus alles redeploy järel — build-time bundle.)*

## Q2 — Kas churned/archived toodetel tuleks Medusa inventory 0-le viia?

**JAH — ja tehtud (jõustatud live).** Kuva-parandus (Q1) peidab nupu, aga **server peab ka blokeerima**
(otse-API, vana cart-link, race). `sync-medusa-inventory.mjs` (UUS):
- churned/OOS + feed-managed (`sku===vevor_sku`) → `stocked_quantity=0`.
- tagasitulek feedi → restore 100. Custom/Outlet (`sku≠vevor_sku`) → puutumata.
- Sama `isOosFromFeed` otsus mis Meili (`lib/feed-stock.mjs`).

**Live tulem:** `5666 churned/OOS → 0` · custom vahele 1 · muutmata 8644 · bug-toode kinnitatud `0`.

**Miks see server-poolel PÄRISELT blokeerib:** kõigil 18062 variandil on juba
`manage_inventory=true`, `allow_backorder=false`. Ainus põhjus, miks churned ostetav oli,
oli dummy `stocked_quantity=100`. `0` → Medusa keeldub add-to-cart / checkout'ist. **Ei vaja
manage_inventory-flip'i.**

## Q3 — Kumb on arhitektuuriliselt õigem?

**ÜKS ülemine tõde, MITTE kaks lahknevat.** Ülemine tõde = **feed-cache `bySku`**.
Sellest tuletatakse **KAKS sünkroonis projektsiooni**:

```
                 feed-cache bySku  (ainus tõde)
                        │
          lib/feed-stock.mjs · isOosFromFeed()   ← jagatud otsus
              ┌─────────┴─────────┐
     Meili in_stock          Medusa stocked_quantity
     (kuva/otsing, kiire)    (ostukorv/checkout jõustus)
```

Enne oli viga: Meili tuletati feedist, Medusa inventory oli **sõltumatu dummy** → lahknes.
Nüüd mõlemad tuletatakse **samast funktsioonist** ja värskuvad **koos**
`refresh-feed-cache.sh`-is ([4/5] Medusa sync + [5/5] Meili reindeks, sama cache).
Kaks *lugejat* on OK (kuva vs jõustus) niikaua kui neil on **üks kirjutamis-otsus**.

## Q4 — Kas ostukorv/checkout laseb churned toote läbi? (launch-blokeerija?)

**Enne:** storefront cart/checkout tegi **null laoseisu-kontrolli** → JAH, laskis läbi = **launch-blokeerija**.
**Nüüd:** Medusa `stocked_quantity=0` + `manage_inventory=true` → **server keeldub** add/checkout'ist,
sõltumata frontendist. **Blokeerija suletud (live).** Kuva-pool (nupp peidus) läheb elus redeploy järel.

---

## Seis

| Osa | Seis |
|---|---|
| Jagatud otsus + Meili + Medusa sync-skript (kood) | ✅ commit `eda090bf` (main) / `7d9ce397` (taxonomy-v4) |
| Medusa inventory jõustus (5666→0) | ✅ **LIVE** (jooksutatud k33g konteineris) |
| Tooteleht kuva (nupp gate) | ⏳ vajab **Coolify redeploy** (build-time bundle) |
| refresh-feed-cache.sh [4/5] wire | ✅ kood; jõustub kui Scheduled Task jookseb uuest image'ist |

**Järgmine (Tarmo/inimene):** Coolify redeploy taxonomy-v4-st (7d9ce397) → kuva-fix elus +
sync-skript image'is + Scheduled Task jookseb medusa SERVICE-konteineris (`/data` mount).
