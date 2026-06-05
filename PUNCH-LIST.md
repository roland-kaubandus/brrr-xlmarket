# xlmarket — Punch-list (avatud teadaolevad vead)

> Viimati uuendatud: 2026-06-05. Severity: AINULT CRITICAL/BLOCKER või VAJA ÄRA TEHA (HANDBOOK §2).

## 🛑 CRITICAL / BLOCKER
> Praegu CRITICAL avatud punkte EI ole (sait live, email töötab). Allolevad blokeerivad REAALSET MÜÜKI:

- [ ] **Montonio makse pole integreeritud** — ainult stub (`backend/medusa-config.ts:46`), npm paketti pole. Makseid ei töötle. Vaja custom Medusa 2.0 payment provider + webhook + checkout-flow. *(blokeerib müügi)*

## 📋 VAJA ÄRA TEHA

### Funktsioonid
- [ ] Tarne-teavituse email (`order-shipped.ts`) — kood taastatud, aktiveerub Variant 2-ga; vaja end-to-end testida
- [ ] Toote hinnangud/tärnid (`ProductContent.tsx:58` — TODO, ootab Huly ticketit)

### Turvalisus
- [x] **Admin lehed auth-gate'itud** (2026-06-05) — xl-admin/layout.tsx readAdminSession() → redirect /admin-login. Write-API'd (/api/admin/*) olid juba gate'itud (401).

### Sisu / tõlked
- [ ] ET-tõlked pooleli — **75.4% valmis (12900/17105), ~4205 jäänud** (seis 2026-06-05). Runner `/tmp/tr/` batch. 2026-06-04/05: +~4400 tõlgitud (0 broken). Jookseb partiidena, jätkub.

### Jõudlus
- [x] **Medusa → mailcow redis NOAUTH** (LAHENDATUD 2026-06-04, commit 4c9a90dc) — medusa on mailcow-võrgus (email), kus 'redis' alias = mailcow redis (parooliga) → NOAUTH → getCategories timeout → kõik medusa-lehed aeglased. Fix: Coolify redisele unikaalne alias `xlmarket-redis`. Tulemus: kat-detail 4.7s→0.078s, email töötab edasi.
- [x] **Kategooria-index 8.2MB payload** (LAHENDATUD 2026-06-04, commit 18912f89) — renderdas L1-L5 (3420 kaarti). Fix: L1+L2 (420 kaarti) → 0.99MB.
- [x] **Kategooria-lehed 9-19s SSR render** (LAHENDATUD 2026-06-04, commit 228ccca0) — juurpõhjus: root layout `readAdminSession()` (cookies()) → kõik lehed dünaamilised → no-store. Fix: admin-detect kliendipoolseks (AdminProvider fetchib whoami) → lehed static/ISR. **Tulemus (live): avaleht 11s→0.04s, kategooriad 9-26s→0.05s, beat VEVOR.com.**

### Stabiilsus / arhitektuur
- [x] **Meili settingud kirjutatakse üle** (LAHENDATUD 2026-06-04) — juurpõhjus: plugin'i `loaders/index.js` rakendab `medusa-config.ts` `indexSettings`'i IGAL boot'il (SKIP_MEILISEARCH_STARTUP_INDEXING keelab ainult dok-reindexi, mitte settinguid). Config'is olid minimaalsed searchable+displayed → reset igal redeploy'l (€0.00, tühjad kategooriad, ET peidus). **Fix:** `medusa-config.ts` `indexSettings` täiendatud täielikuks (sünk index-meilisearch.mjs-ga) → loader rakendab nüüd ÕIGEID settinguid igal boot'il. **Vajab redeploy't et aktiveeruda.** Praegune indeks juba parandatud (reindex 2026-06-04)
- [ ] DKIM võti (xlmarket.ee) on mailcow redis'es — dokumenteeri restore (kui mailcow taastatakse, võti taastada)
- [x] **MEILISEARCH_API_KEY fallback** (2026-06-05) — medusa-config.ts: fallback MEILISEARCH_KEY → MEILI_MASTER_KEY env-aliastele.

## ✅ Lahendatud (arhiiv)
- [x] 2026-06-03 admin.xlmarket.ee 502 → 200 (medusa routing/alias) → `memory/sessions/2026-06-03-xl.md`
- [x] 2026-06-03 Coolify redeploy kukkus alati → localhost destination + healthcheck 600s
- [x] 2026-06-03 Email ei läinud välja → Mailcow relay + SPF/DKIM/DMARC pass
- [x] 2026-06-03 .store/.eu viited → .ee
- [x] 2026-06-03 Risto offboard (Coolify migratsioon Root Team'i)
