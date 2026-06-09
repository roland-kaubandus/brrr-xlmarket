# xlmarket — Launch-checklist (enne reaalset müüki)

> Viimati uuendatud: 2026-06-03. Sait on tehniliselt live (xlmarket.ee 200), aga REAALSEKS MÜÜGIKS vajab allolevat.

## 🔴 Blokeerivad (ilma nendeta EI tohi müüki avada)
- [ ] **Montonio makse** — provider integreeritud, test + live võtmed (Vaultwarden), checkout end-to-end testitud
- [ ] **Tellimuse vormistus** end-to-end (cart → checkout → makse → tellimus loodud Medusas)
- [x] **Email tellimuse kinnitus** — relay töötab, SPF/DKIM/DMARC pass ✅ *(order-placed aktiivne; order-shipped testida)*
- [ ] **Tarne-teavitus** email testitud (order-shipped.ts)
- [x] **Backup + restore** — `scripts/backup.sh` olemas; restore testida
- [x] **Secrets Vaultwardenis** — SMTP/DB/JWT Coolify Is Secret; .env.example placeholder'id ✅
- [x] **SSL kehtiv** — kõik domeenid Let's Encrypt (kehtivad aug-sept 2026), kontrollitud 2026-06-04 ✅
- [ ] **Õiguslikud lehed** sisustatud — tingimused, privaatsus, tagastus, tarne (CMS)

## 🟡 Enne live'i soovituslik
- [x] SEO: sitemap, robots (.ee), canonical, JSON-LD ✅
- [ ] Monitooring / uptime alert (nt Coolify sentinel + väline)
- [ ] Analytics / Pixel (PostHog setup olemas — kontrolli)
- [x] 404/error lehed ✅
- [ ] Mobiilivaade testitud (brauseris)
- [ ] Admin basic-auth (xl-admin)

## xlmarket-spetsiifiline
- [ ] Hinnavalem *1.15 (käibemaks) kõigil toodetel õige
- [x] Meili index täielik (17105 dok) + price/taxonomy + settingud (2026-06-04 reindex + config-fix) ✅ — sünonüümid kontrollida
- [ ] VEVOR feed-sync cron töötab (4h) — ei tühjenda Meili indeksit
- [ ] ET-tõlked piisavas mahus (vähemalt top-kategooriad)
- [ ] osta.ee XML feed + Facebook Commerce (kui vaja)

---

## 🔴 CHECKOUT/MONTONIO — launch-blokeerijad (2026-06-09 e2e-test staging-sandbox)

Staging-sandbox e2e-test leidis 3 launch-kriitilist asja (kõik koodi-fix'id commit'itud, prod'i EI veel deployitud):

1. **Montonio client vale endpoint** `/orders` → `/api/orders` (Stargate v2). Andis 404 → checkout payment-session 500 → makse VÕIMATU. **FIX commit b0b08acc**, verifitseeritud staging.
2. **Montonio amount vales ühikus** — Medusa=sendid, Montonio API=eurod. €837 cart → grandTotal 83758 → "exceeding max 14999.99" (>€150 tellimused kukuvad + 100× ülemakse-risk). **FIX commit 7bc2d629** (initiate/refund /100, webhook *100). Väljuv verifitseeritud (session loob, €837.58 OK); webhook *100 vajab brauseri-sandbox-makse-testi.
3. **PROD Montonio = sandbox-mode** (MONTONIO_ENV=sandbox + tõenäoliselt sandbox-võtmed, sama pikkus staging'uga). Päris-makse vajab `MONTONIO_ENV=live` + production accessKey/secretKey (partner.montonio.com → Stargate live).

### e2e-staatus (staging-sandbox, headless)
✅ cart loob (1s) → add-to-cart (24s, cart-stall #11922, stopgap katab) → email+aadress+shipping → payment-collection → **Montonio payment-session + sandbox payment-URL**.
⏳ VAJAB BRAUSERIT: tegelik sandbox-makse Montonio lehel → webhook (notificationUrl) → Medusa authorize/capture → tellimus admin'is → kinnitus-email (staging EMAIL_DISABLED=true; prod saadaks). order-placed subscriber aktiivne, AGA täis-voog (makse→webhook→order→email) testimata.

### Prod päris-makse-launch NÕUDED (järjekord)
1. Deploy fix'id (b0b08acc + 7bc2d629) prod'i.
2. **Brauseri-sandbox e2e** (staging): soorita Montonio sandbox-makse lõpuni → kinnita webhook-capture + order + email. (Webhook *100 + capture testimata.)
3. Prod env: `MONTONIO_ENV=live` + production-võtmed (partner.montonio.com).
4. Väike päris-makse test prod'is enne avalikku launch'i.
5. Region↔montonio link prod'is OK (kinnitatud); staging'ule lisatud testiks.
