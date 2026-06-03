# TASK 2026-06-03-01 — Montonio makse integratsioon

- **Projekt:** xlmarket
- **Loodud:** 2026-06-03
- **Severity:** CRITICAL / BLOCKER (blokeerib reaalse müügi)
- **Staatus:** avatud

## Eesmärk
Integreerida Montonio makselahendus (pangalingid + kaardimakse) Medusa 2.0 backend'i + storefront checkout'i, et tellimusi saaks reaalselt eest maksta. Praegu ainult stub (`backend/medusa-config.ts:46`), npm paketti pole, makseid ei töödelda.

## Acceptance criteria
- [ ] Montonio sandbox makse end-to-end: cart → checkout → pangalink/kaart → tellimus "paid" Medusas
- [ ] Webhook valideerib JWT + märgib tellimuse makstuks
- [ ] Tagasimakse (refund) töötab admin'ist
- [ ] Live võtmed Vaultwardenis (TR2), `MONTONIO_ENVIRONMENT=live`
- [ ] Email tellimuse kinnitus läheb pärast edukat makset

## Sammud
1. Montonio konto → partner.montonio.com → sandbox + live API võtmed (access + secret) → Vaultwarden
2. Custom payment provider moodul `backend/src/modules/montonio/` (`AbstractPaymentProvider`: initiate/authorize/capture/refund/getStatus)
3. Registreeri `medusa-config.ts` payment providers + region'i makseviisid
4. Webhook endpoint (`src/api/.../montonio/webhook`) — JWT valideerimine → cart complete
5. Storefront checkout: `app/api/cart/payment` + tellimus-leht — algata sessioon, redirect makse-URL-ile, return-URL käsitlus
6. Test sandbox'is → siis live

## Riskid / kinnitust vajab (TR1)
- Puudutab tellimuste/maksete flow'd → testi sandbox'is enne live'i. Backup enne deploy't (TR3).
- Secrets AINULT Vaultwarden + Coolify Is Secret (TR2)

## Märkused
- Montonio = Stripe-laadne redirect-flow (JWT-allkirjastatud order → makse-URL)
- Maht: ~mitu päeva. Vt ka PROJECT-STATE "Email" — kinnitus-mailid juba töötavad.
