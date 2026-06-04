# TASK 2026-06-04-01 — Montonio makse integratsioon (detailne maht)

- **Projekt:** xlmarket
- **Loodud:** 2026-06-04
- **Severity:** CRITICAL / BLOCKER (ainus tehniline blokeerija reaalsele müügile)
- **Staatus:** avatud — ootab Montonio sandbox võtmeid (vt §0)
- **Asendab:** `2026-06-03-01-montonio-payment-integration.md` (esialgne stub-tasand)

## Eesmärk
Integreerida Montonio (Eesti pangalingid + kaardimakse) Medusa 2.0 backend'i nii, et
tellimusi saab reaalselt eest maksta: cart → makse → tellimus "captured" Medusas →
kinnitusmeil. Praegu `medusa-config.ts` payment providers tühi → makseid ei töödelda.

## 0. EELDUS — vajab kasutajalt enne alustamist
**Montonio sandbox API võtmed puuduvad täielikult** (kontrollitud 2026-06-04: ei koodis, ei
Coolify env-is, ei Vaultwardenis). Vaja:
1. Konto `partner.montonio.com` (kas on olemas?)
2. **Sandbox** Access Key + Secret Key (Settings → API keys, sandbox env)
3. Hiljem: **Live** võtmed (eraldi, pärast sandbox-testi)
→ Kõik **Vaultwardenisse** (TR2), Coolify env "Is Secret". Mitte koodi.

## Mahu-hinnang ja faaside jaotus

### ⏱ Kokku: ~2–3 arenduspäeva (sandbox-valmis) + 0.5p live-cutover

Värske leid (vähendab mahtu): **storefront checkout on juba olemas ja provider-agnostiline**
— `app/api/cart/payment/route.ts` võtab automaatselt esimese Medusa payment provideri
(`providers[0]`), loob payment-collection + session; `app/api/cart/complete/route.ts`
lõpetab cart'i → tellimus. Seega storefront vajab AINULT redirect-sammu + return-URL
käsitlust, mitte täielikku checkout'i.

| # | Töö | Maht | Fail(id) |
|---|---|---|---|
| 1 | **Backend payment provider moodul** — peamine töö | ~1p | `backend/src/modules/montonio/service.ts` |
| 2 | Registreeri provider + region makseviisid | ~0.5p | `backend/medusa-config.ts`, region seed |
| 3 | **Webhook endpoint** — JWT valideeri → authorize/capture | ~0.5p | `backend/src/api/store/montonio/webhook/route.ts` |
| 4 | Storefront: redirect makse-URL-ile + return/tagasi-leht | ~0.5p | `app/api/cart/payment`, `app/[locale]/tellimus/` |
| 5 | Sandbox end-to-end test (kõik pangad + kaart) | ~0.5p | — |
| 6 | Live-võtmed + cutover + esimene reaalne test-tellimus | ~0.5p | Vaultwarden, Coolify env |

### Detail — §1 payment provider moodul (südamik)
Medusa 2.0-le **pole ametlikku Montonio pluginat** → custom `AbstractPaymentProvider`.
Kontrolli enne kas `medusa-payment-montonio` vms community-pakett 2.0-ga ühildub; muidu custom.

Montonio **Orders API v2** flow (redirect-põhine, Stripe-laadne):
- `initiatePayment` → ehita payload (amount, currency, merchant_reference=cart_id,
  return_url, notification_url, payment_method), **allkirjasta JWT-ga** (HS256, secret key) →
  POST `https://sandbox-api.montonio.com/orders` → saad `paymentUrl` + order uuid.
- Tagasta session.data-sse `paymentUrl` (storefront redirectib sinna).
- `authorizePayment` / `getPaymentStatus` → kontrolli Montonio order staatust (PAID).
- `capturePayment` → Montonio orders on auto-capture (PAID = raha liikunud); märgi captured.
- `refundPayment` → POST refund Montonio API-le.
- `cancelPayment`, `deletePayment` → no-op / vastavalt.

### Detail — §3 webhook
- Montonio saadab `notification_url`-ile POST'i **JWT tokeniga** (`?order-token=...` või body).
- Valideeri JWT secret key'ga (verify allkiri + exp) → loe order staatus.
- Kui PAID → leia cart `merchant_reference` järgi → `authorize` payment-session →
  cart complete → tellimus loodud → order-placed email (juba töötab).
- **Idempotentne** (Montonio võib korrata) + **ära usu storefront return-URL-i**
  makse tõesuse osas, AINULT webhook on autoriteetne.

## Acceptance criteria
- [ ] Sandbox end-to-end: cart → checkout → Montonio pangalink/kaart → tagasi → tellimus "captured" Medusas
- [ ] Webhook valideerib JWT allkirja + on idempotentne (kordus ei tee topelt-tellimust)
- [ ] Makse staatus ei sõltu return-URL-ist (ainult webhook autoriteetne)
- [ ] Tagasimakse (refund) töötab Medusa admin'ist
- [ ] order-placed kinnitusmeil läheb pärast edukat makset (SPF/DKIM juba pass)
- [ ] Hinnasumma Montoniole = cart total (sis. *1.15 käibemaks) — sentides, õige valuuta EUR
- [ ] Live võtmed Vaultwardenis, `MONTONIO_ENV=live`, sandbox eemaldatud prodist

## Riskid / kinnitust vajab (TR1)
- Puudutab makseid/tellimusi → **kogu arendus + test sandbox'is**, live alles pärast kinnitust
- Backend deploy vajab Coolify redeploy't (~7min downtime) → backup enne (TR3), kinnitus enne
- Secrets AINULT Vaultwarden + Coolify Is Secret (TR2) — JWT secret key on tundlik
- Webhook URL peab olema avalik HTTPS (`api.xlmarket.ee/store/montonio/webhook`) — Traefik route

## Märkused
- Montonio sandbox test-pangad: simuleeritud "maksa/tühista" nupud, päris raha ei liigu
- Storefront staging'us on juba `MONTONIO sandbox` mainitud (PROJECT-STATE) — testi seal enne prod'i
- Region: kontrolli et EE region kasutab EUR + Montonio provider lubatud
- Vt ka research: makse-flow turvalisus (webhook autoriteetsus) on kriitiline
