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

---

## 🔴🔴 CART-CREATE LAUNCH-BLOKEERIJA (2026-06-09 Tarmo browser-test + diagnoos)

**Sümptom:** Tarmo browser staging: add-to-cart 30-40s → "Failed to create cart". Blokeerib checkout'i.

**Diagnoos (prod+staging, idle, headless 5×):**
- cart-create `POST /store/carts`: **5-15s IDLE** (prod: 15/6/8/0/5s, staging: 11/7/5/5/6s) — pole liiklust, ikka aeglane.
- Võrdlus baseline: `/health` 0s, **`/store/regions` 0s** (kiire query.graph). → POLE kogu query.graph/pgbouncer/kontentsioon. **Cart-WORKFLOW ise spetsiifiliselt aeglane** (#11922 cart-tee).
- add-to-cart = create (5-15s) + add-line-item (24s) = **30-40s > stopgap 26s** (2×13s) → fail.
- pg-conn 1 active/10 idle (pole exhaustion). pgbouncer pool OK.

**Hinnang:**
- **LAUNCH-BLOKEERIJA JAH.** Cart-create ebausaldusväärselt aeglane isegi 1 kasutaja / idle. Stopgap (26s) EI kata (üksik create kuni 15s, +add 24s ületab). Halb UX (15-40s ootamine) + sage fail.
- **Variant D (1 web-replica) EI lahenda** — see on per-operatsioon latents, mitte kontentsioon. 2. replica aitab concurrency't, mitte üksik-cart-latentsi.
- **Stopgap on plaaster, MITTE lahendus.** Vaja PÄRIS cart-stall fix.

**Soovitus (real fix, mitte stopgap):**
1. Profileeri `createCartWorkflow` + add-line-item — leia TÄPNE aeglane samm (5-15s). /store/regions kiire → cart-workflow spetsiifiline (sales-channel/region/pricing-context setup VÕI cart-response query.graph relation-expansion).
2. Trimmi cart-ops query.graph relatsioonid (nagu Fix#1 tegi product-detail'iga) — cart GET kasutab juba `*items.variant.product` (raske).
3. Kontrolli kas Medusa createCartWorkflow teeb liigseid samme / N+1 (võib olla pricing-context või sales-channel-link).
4. Kuni real-fix: checkout EI ole launch-valmis. Stopgap-budget tõstmine (band-aid) ei paranda UX-i.

**Fix#1 (0119c2d3) EI kata cart'i** — see oli product-detail field-trim + Meili-price (browse). Cart/checkout läheb endiselt läbi raske Medusa-workflow.

### CART-STALL JUUR KINNITATUD + FIX-PLAAN (2026-06-09 profileerimine staging'us)

**Profileerimise-leid (pg-query-logging + ioredis-timing):**
- cart-create: 5-16s, VARIEERUB metsikult (0.66s ↔ 12s). AINULT **7 pg-päringut** (DB pole pudelikael).
- add-line-item: 7s, **~90 pg-päringut** (N+1 relation-expansion — cart-refresh laiendab `*items.variant.product` täis-graafi).
- cart-GET (raske fields): 0.59s (pole pudelikael soojas).
- `/store/regions`: 0s (üldine query.graph kiire).

**JUUR (kinnitatud mõõtmisega):**
1. **Redis ioredis cold-connect INTERMITTENTNE 5-10s** (IPv4/IPv6 family / Happy-Eyeballs). Mõõdetud: default cold-connect 27ms / 27ms / **5238ms** (intermittentne); **family:4 alati 3-6ms**. Cart-create kasutab redis workflow-engine + locking (lisatud 2026-06-06 in-memory-serialiseerumise vastu) → maksab intermittentse cold-connect-stalli → cart-create variance 0.66s↔12s. raw-TCP connect 7ms (võrk OK), `--no-network-family-autoselection` NODE_OPTIONS EI mõju ioredis'ile.
2. **add-line-item N+1** (~90 päringut) = query.graph relation-expansion `*items.variant.product`.

**FIX-PLAAN (2 osa, siht: cart-create <2s, add-line-item <2s):**
- **A (PRIMAARNE, cart-create): sunni IPv4 (`family:4`) kõigile redis-moodul-ühendustele** (WE/locking/cache/events + projectConfig.redisUrl) — medusa-config redis-options VÕI `?family=4` URL-is. Kaotab intermittentse 5-10s cold-connect-stalli → cart-create järjepidevalt <1s (0.66s juhtum saab normiks). **NB: see oli VARJATUD — `family:4` mõjub ioredis'ile, NODE_OPTIONS-lipp mitte.**
- **B (add-line-item): trimmi cart query.graph relatsioonid** storefront'is (`/api/cart/items` + `/api/cart` GET) minimaalseks — cart-UI vajab: item id, title, thumbnail, unit_price, quantity, variant id/title. EI täis `*items.variant.product` graafi. Kaotab ~90→<10 päringut.
- Fix#1 (0119c2d3) EI katnud cart'i (oli browse/product-detail).

**Mõju:** sama setup prod's → sama cart-stall. family:4 fix kandub prod'i. EI veel deployitud (ootab plaani-kinnitust). Saab staging'us tõestada (apply family:4 → re-mõõda) enne prod'i.
