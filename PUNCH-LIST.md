# xlmarket — Punch-list (avatud teadaolevad vead)

> Viimati uuendatud: 2026-06-03. Severity: AINULT CRITICAL/BLOCKER või VAJA ÄRA TEHA (HANDBOOK §2).

## 🛑 CRITICAL / BLOCKER
> Praegu CRITICAL avatud punkte EI ole (sait live, email töötab). Allolevad blokeerivad REAALSET MÜÜKI:

- [ ] **Montonio makse pole integreeritud** — ainult stub (`backend/medusa-config.ts:46`), npm paketti pole. Makseid ei töötle. Vaja custom Medusa 2.0 payment provider + webhook + checkout-flow. *(blokeerib müügi)*

## 📋 VAJA ÄRA TEHA

### Funktsioonid
- [ ] Tarne-teavituse email (`order-shipped.ts`) — kood taastatud, aktiveerub Variant 2-ga; vaja end-to-end testida
- [ ] Toote hinnangud/tärnid (`ProductContent.tsx:58` — TODO, ootab Huly ticketit)

### Turvalisus
- [ ] Admin paneelil pole basic-auth'i (`storefront/app/xl-admin/layout.tsx:9`) — ainult obscurity + reverse-proxy

### Sisu / tõlked
- [ ] ~10 148 toodet ilma ET-tõlketa (40.7% valmis, 6957/17105) — tõlke pipeline jätkata. Runner: `scripts/translate-claude-cli.cjs` (claude CLI, Max OAuth). 2026-06-03: +498 tõlgitud

### Stabiilsus / arhitektuur
- [ ] DKIM võti (xlmarket.ee) on mailcow redis'es — dokumenteeri restore (kui mailcow taastatakse, võti taastada)
- [ ] `MEILISEARCH_API_KEY` ilma fallbackita (`medusa-config.ts:29`) — vaikne crash kui puudu

## ✅ Lahendatud (arhiiv)
- [x] 2026-06-03 admin.xlmarket.ee 502 → 200 (medusa routing/alias) → `memory/sessions/2026-06-03-xl.md`
- [x] 2026-06-03 Coolify redeploy kukkus alati → localhost destination + healthcheck 600s
- [x] 2026-06-03 Email ei läinud välja → Mailcow relay + SPF/DKIM/DMARC pass
- [x] 2026-06-03 .store/.eu viited → .ee
- [x] 2026-06-03 Risto offboard (Coolify migratsioon Root Team'i)
