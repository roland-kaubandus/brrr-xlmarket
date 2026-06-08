# Skaleerimise & töökindluse arhitektuur

**Projekt:** xlmarket.ee (Medusa v2 + Next.js + Meilisearch)
**Kuupäev:** 2026-06-07
**Staatus:** DRAFT — launch-vundament
**Omanik:** Tarmo
**Siht:** kiirus + töökindlus **sadade samaaegsete päringute** all
**Seotud:** LAUNCH-CHECKLIST.md, PROJECT-STATE.md, PUNCH-LIST.md

---

## 1. Eesmärk ja põhiprintsiip

Saavutada, et pood peab kiiruse ja töökindluse poolest vastu sadadele samaaegsetele päringutele — see on launchi vundament, korduvkasutatav ka eumotors.es / canarymotors jaoks.

**Põhiprintsiip:** valdav enamus päringuid EI tohi kunagi tabada Medusa rasket `query.graph` teed. Liiklus jaguneb kaheks, kummalgi oma skaleerimis-strateegia.

### Juur (lühikokkuvõte)
Medusa 2.x `query.graph`/RemoteJoiner sügav relatsiooni-laiendus serialiseerub/ujutab event-loop'i samaaegsete raskete operatsioonide all (#11922 framework-piir). Per-protsess piir ~8 samaaegset rasket. Kõik config-hoovad (pool, threadpool, redis, worker-mode, logging) + field-trim annavad marginaalset abi, ei lahenda. **Lahendus = arhitektuur, mis hoiab koormuse raskelt teelt eemal + horisontaalne skaleerimine ülejäänule.**

### Liikluse dekompositsioon
| Tee | Osakaal | Cache'itav? | Skaleerimis-hoob |
|---|---|---|---|
| **Sirvimine** (toote-detail, listing, kategooriad, otsing) | ~95%+ | JAH | cache + CDN + Meili |
| **Cart/checkout** (per-user, dünaamiline) | väike % | EI | replicad + PgBouncer |

**Võti:** "sadu samaaegseid" = sajad sirvijad (kerge, cache'itav) + palju väiksem arv samaaegseid carte. Infra-suurus sõltub **tipp-samaaegsete CART-ide arvust**, mitte koguliiklusest.

---

## 2. Browse-tee — cache & CDN (peamine sirvimis-hoob)

Eesmärk: sajad/tuhanded samaaegsed sirvijad serveeritakse servast/cache'ist, Medusa-koormus ~null.

1. **Toote-detail Meili'st** (tehtud) — kerge, cache'itav. Tee **täielikult cache'itavaks**: Next.js ISR / route-cache + HTTP cache-headerid.
2. **Listing / otsing Meili'st** — Meilisearch on ehitatud kõrge päringu-concurrency jaoks (olemasolev eelis).
3. **Cloudflare edge-cache** (lõpeta lahtine "proxy ei aktiveeru" punkt) — edge cache'ib toote-/listing-/kategooria-lehed → sajad samaaegsed servast, Medusa ei tabata.
4. **Cache-invalideerimine** — feed-sync'il (hind/laoseis/toode muutub) purge/revalidate mõjutatud lehed. Seo lühema hind+laoseis-sünkiga (vt §6).
5. **Staatiline/ISR** toote-lehtedele kus võimalik → korduvad vaatamised ei tabada Medusa't üldse.

**Tulemus:** browse skaleerub sadadesse/tuhandetesse, sest see ei tabata rasket teed.

---

## 3. Cart/checkout-tee — horisontaalne skaleerimine

Eesmärk: kanda tipp-samaaegseid cart-operatsioone ilma freeze'ita.

1. **Mitu Medusa server-replica't** Traefik load-balancer'i taga — igal replical oma event-loop → N× rasket concurrency't.
2. **PgBouncer (KOHUSTUSLIK mitme replica juures)** — multipleksib palju app-ühendusi vähestele Postgres-ühendustele. Lahutab app-pooli suuruse Postgresi limiidist. Ilma selleta ammendub pg.
3. **DB pool per replica** (env-driven, tehtud) — koordineeritud PgBounceri taga (vt §5 matemaatika).
4. **Field-trim cart-query.graph'il** (tehtud/käib) — vähendab per-päring koormust.
5. **Eraldi worker-instants** taustatöödele (MEDUSA_WORKER_MODE) → HTTP-replicad ei jooksuta jobe.
6. **Capacity:** suurus tipp-samaaegsete CART-ide järgi. Üks AX41 (~12 lõime) on lagi → kui tipp on kõrge (kampaania/flash-sale), planeeri teine node.

---

## 4. Töökindlus (ei tohi koormuse all kokku kukkuda)

1. **Healthcheck-tolerants** — häälesta Coolify healthcheck (timeout, start-period, retry'd) nii, et mööduv freeze/aeglus EI käivitaks restart-kaskaadi. (Leid: üks burst jätab replica ~22s aeglaseks → naiivne healthcheck tapaks selle.)
2. **Load-balancer** — suuna aeglasest/ebatervest replicast eemale, ära tekita cascade'i.
3. **Resilient storefront** — lühike Medusa-timeout + cache-fallback, et aeglane Medusa ei võtaks tervet lehte maha (avaleht/kategooriad cache'ist; ainult checkout mõjutatud).
4. **Stopgap** (12s+retry) jääb turvavõrguks.
5. **Zero-downtime deploy** — lahenda Coolify non-rolling deploy (~10min downtime / deploy): rolling-config VÕI resilient-fallback. Vajalik enne sagedasi prod-deploy'sid.
6. **Monitooring** — Uptime Kuma (olemas) + lisa event-loop-lag / response-time / concurrency mõõdikud + alerting.

---

## 5. Ühendus-matemaatika & capacity

PgBouncer'ita: `replicad × pool_max ≤ pg max_connections (~100)`.

| Seadistus | Arvutus | pg-ühendused | Ohutu? |
|---|---|---|---|
| 1 replica, pool 50 | 50 + admin + worker | ~60 | ✅ |
| 3 replica't, pool 50 | 150 + lisad | ~165 | ❌ ületab |
| 3 replica't, pool 30 | 90 + lisad | ~100 | ⚠ piiril |
| N replica't + **PgBouncer** | app-pool lahti pg-st | ~PgBouncer pool (nt 20-40) | ✅ skaleerub |

**Järeldus:** >2 replica = PgBouncer kohustuslik. PgBouncer'iga saab replica't lisada ilma pg-limiiti puudutamata.

---

## 6. Koormustest (õige tööriist nüüd)

Black-box A/B jõudis piirini (degradatsioon ei taastu kohe). Edasi: **õige koormustest (k6 vms)** realistliku seguga.

- Defineeri **tipp-siht:** X samaaegset sirvijat + Y samaaegset cart-operatsiooni
- Testi staging'us: browse (cache/CDN tee) + cart (replica/PgBouncer tee) eraldi ja koos
- Mõõda: p95/p99 latents, event-loop-lag, pg-ühendused, replica-CPU
- Suurus infra tipp-sihi järgi → kinnita enne prod-launchi

---

## 7. Rollout — faasid + väravad

> ✋ = STOPP, vajab Tarmo kinnitust (HARD RULE #1). Prod't ei puudutata enne staging-tõestust.

**Faas 1 — storefront-deploy (tehtud muudatused):**
1. Deploy field-trim + Meili-hind staging'usse + UI visuaal-verify (hind/variandid/kategooriad)

**Faas 2 — browse-cache + CDN:**
2. Toote-/listing-lehed täielikult cache'itavaks (Next ISR/route-cache) — ✅ **app-tasand tehtud staging'us** (samm 2a, commit a77a7f08): browse-API s-maxage, dünaamilised lehed no-store, /api/revalidate + feed-sync hook. 8-parallel /api/product 0.014s (oli 25s freeze). Caveat: toode-leht response no-store (Next 15 vaikimisi; server-side full-route-cache töötab; CDN-html-edge = punkt 3).
3. Cloudflare edge-cache aktiveeri + cache-invalideerimine feed-sync'il
   - ✅ **zone AKTIIVNE** (2026-06-07 — NS-typo `edaard`→`edward` parandatud Tarmo poolt, propageeris). VERIFY: sait läbi CF (cf-ray, server: cloudflare), SSL kehtiv (Google Trust Services edge-cert), `/`→307 /et (locale, mitte loop), avaleht/cart/admin 200. **Email terve:** MX (mh7/mh9.elkdata.ee), SPF/DKIM/DMARC TXT alles, mail-host'id DNS-only (185.7.x, mitte CF-proxied) → SMTP OK. admin = DNS-only.
   - ⚠ Email-watch: SPF `a`-mehhanism resolveerib nüüd CF-IP-le → kui transaktsiooni-mail saadetakse origin-serverist (mailcow 65.21) otse, lisa 65.21 SPF-i (inbound + elkdata-mail OK).
   - **JÄRGMINE (peale 2a→prod):** CF cache-reeglid (cache browse-HTML toode/listing/kategooriad override no-store; bypass cart/checkout/admin/api-cart) + purge feed-sync'il. Praegu cf-cache-status=DYNAMIC (reegleid pole → kõik origin'i). NB: toode-leht vahelduvalt aeglane origin-renderil → CF-cache lahendab.

**Faas 3 — cart-skaleerimine ✋:**
4. PgBouncer staging'usse + pool-sizing koordineeri
5. 2-3 medusa server-replica't Traefiku taga + worker-instants
6. Skaleerimise-test: kas freeze hajub (8/16/24 paralleelset) + pg-limiit püsib

**Faas 4 — töökindlus ✋:**
7. Healthcheck-tolerants + resilient storefront-fallback + zero-downtime deploy

**Faas 5 — koormustest ✋:**
8. k6 realistliku tipu peal → suurus capacity → prod-deploy plaan

**Prod-deploy (koordineeritud, sinu go):** env-fix'id (pool/log/Meili) + PgBouncer + replicad + healthcheck-tolerants + lühem hind-sünk korraga.

---

## 8. Cross-projekt
Samad mustrid (browse-cache/CDN + cart-replica/PgBouncer + töökindlus) korduvkasutatavad eumotors.es / canarymotors jaoks — per-platvorm adapter, jagatud strateegia (`/opt/dev-workflow/` muster).

---

## 9. Vastuvõtu-kriteeriumid
- [ ] X samaaegset sirvijat serveeritakse servast/cache'ist <Ys (Medusa ~null koormus)
- [ ] Y samaaegset cart-operatsiooni ilma freeze'ita
- [ ] Koormuse all EI teki restart-kaskaadi
- [ ] Zero-downtime deploy töötab
- [ ] Monitooring + alerting elus (event-loop-lag, latents, pg-ühendused)
- [ ] Mustrid dokumenteeritud cross-projekt korduvkasutuseks

---

## 10. Lahtised otsused
- [ ] Tipp-siht: mitu samaaegset sirvijat + mitu samaaegset carti (suurustab capacity)
- [ ] CDN: Cloudflare kinnitus + invalideerimis-strateegia
- [ ] Teise node eelarve (kui tipp-cart-concurrency kõrge)
- [ ] PgBouncer pool-suurus

---

## 11. Mis on JUBA tehtud (vundament olemas)
- getProduct field-trim (drop calc_price/*categories/inventory/options) ✅ **DEPLOYED staging**
- Toote-detail hind Meili'st (1-variant, Meili === Medusa, UI verifitseeritud) ✅ **DEPLOYED+VERIFIED**
- DB pool 10/50, LOG_LEVEL=error, redis-moodulid — kõik env-driven, prod-ohutu
- Diagnoos lõpetatud: juur = framework query.graph concurrency-piir (#11922)

---

## 12. Empiiriline valideerimine — staging POC (2026-06-07)

**Faas 1 (storefront-deploy + UI-verify): ✅ TEHTUD.** Toote-detail staging'us — hind €832.59 Meili'st (=== Medusa täpne), variant.id (add-to-cart), breadcrumb ET, richDescription, 10 pilti, 5 selling-point — KÕIK terve.

**Faas 3 POC (PgBouncer + 2 replica't, manuaalsed test-konteinerid):**

| Tõestus | Tulemus |
|---|---|
| **PgBouncer + Medusa caveat** | ✅ Boot + cart + päring OK, **0 prepared-statement/transaction viga** (node-pg ei kasuta named prepared stmt → transaction-mode sobib). Warm single 0.04s (0 latentsi). |
| **PgBouncer connection-capping** | ✅ **pg-conn 20/100 KOGU koormuse vältel** (8+16 paralleelset), sõltumata instantside arvust → connection-exhaustion LAHENDATUD |
| **Connection-math ilma PgBouncer'ita** | ❌ kinnitatud: 2 replica't (pool 50+25+25) crashisid boot'il "pool is full" pg-limiidil → **PgBouncer kohustuslik >2 replica jaoks** |
| **Skaleerimine jaotab** | 8 paralleelset raske-päring: **1 instants 25s → 2 instantsi 16s** (jaotus toimib) |
| **Per-instants lävi (raske päring)** | ~4 samaaegset rasket query.graph → freeze. Kerge päring (Fix #1) palju kõrgem lävi. |
| **Taastumine burst'ist** | ~20-24s backlog-drain, **pole püsiv kahjustus** (t=8s:18s → t=24s:0.04s). → healthcheck-tolerants ~30s vajalik, LB peab aeglasest replicast eemale suunama. |

**Konfig mis töötas (POC):** PgBouncer `edoburu/pgbouncer`, `POOL_MODE=transaction`, `DEFAULT_POOL_SIZE=20`, `MAX_CLIENT_CONN=1000`, `AUTH_TYPE=scram-sha-256`. Medusa `DATABASE_URL` → `xlmarket-pgbouncer:5432`. Replica'd: sama image, `MEDUSA_WORKER_MODE=server`, pool 25.

**Avatud (prod-rollout jaoks):**
- PgBouncer + replicad Coolify-stack'i (compose-teenusena, mitte manuaalsed konteinerid) — POC oli docker-run; prod vajab Coolify-integratsiooni + Traefik-LB labelid mitme medusa-backend'iga.
- Eraldi `MEDUSA_WORKER_MODE=worker` instants (taustatööd).
- DEFAULT_POOL_SIZE tuning koormustesti järgi (20 hoidis 8-16 conc; k6-tipu järgi suurusta).
- Simultaanne replica-boot oli aeglane/flaky (meili settings-on-boot + raske boot) → prod: staggered boot VÕI keela meili-settings-on-boot.

---

## 13. STAGING DRY-RUN tulemused (2026-06-08) — RAKENDAMIS-LEIUD

Coolify-compose dry-run (pgbouncer + medusa+medusa-2 jagatud alias + medusa-worker) ENNE prod-cutover'it. **Prod puutumata kogu aja (afcad7e4).**

### ✅ Mis TÖÖTAB (valideeritud)
- **PgBouncer (transaction-mode):** single medusa boot'is healthy via pgbouncer; **pg server-conn 11-12 koormuse all** (8 parallel, 2 instantsi) → connection-math kinnitatud (<30, multiplekseerib).
- **Round-robin (docker-DNS):** medusa-2 jagatud võrgu-aliasega "medusa" → `getent medusa` → 2 IP (medusa + medusa-2), liiklus jaotub. **deploy.replicas EI tööta** (Coolify seab container_name → konflikt); **2 eraldi teenust jagatud aliasega = lahendus.**
- **Steady-state ODAV:** 2 medusa + pgbouncer = ~330MB RAM, ~0% CPU idle; koormuse all host load 4.6 (12 tuumast), vaba RAM 52Gi. Runtime-ressurss POLE piirang.
- **Load distribution:** 8 parallel raske-päring 1 instants **25s** → 4+4 jaotatud **15-20s** (paraneb; raske default-fields freeze'ib ikka ~4/instants — reaal-liiklus (Fix#1 kerge) palju parem).

### 🔴 Mis BLOKEERIB multi-instance boot'i (3 compounding fragiilsust)
1. **Meili settings-on-boot 408** — iga medusa-instants rakendab meili indexSettings boot'il (Dockerfile SKIP keelab AINULT doc-indexi, mitte settingsi). Meili 1.41 PATCH 408 intermittent → boot kukub. (CLAUDE.md teadaolev gotcha.)
2. **Simultaanne boot CPU-overload** — 3 medusa cold-boot korraga → host load **>13** (12 tuuma) → connect-timeout (redis/pg) → boot kukub. (Boot CPU-raske ~514s; steady-state ei ole.)
3. **Coolify-deploy-timeout serialiseeritult** — `depends_on: service_healthy` (boot'ide jadastamiseks) → `docker compose up` ootab medusa-healthy't ~514s → Coolify märgib deploy FAILED ("medusa unhealthy") enne kui medusa-2 stardib.

→ Manuaalne staggered boot (üks korraga) TÖÖTAS (medusa-2 healthy peale 1 retry'd — 408 intermittent). Aga Coolify-compose automaatne multi-instance boot EI ole töökindel.

### JÄRELDUS + PROD-EELTINGIMUSED
Multi-instance skaleerimine on **runtime'is valideeritud** (round-robin + pgbouncer + steady-state OK) AGA **boot/orkestratsioon Coolify-compose'is blokeeritud**. Enne prod-scaling'ut LAHENDA:
1. **Meili settings-on-boot maha** — tee index-settings ÜHEKORDSEKS/manuaalseks (mitte iga-boot). Eemaldab 408-blokeerija + kiirendab boot'i + teeb KÕIK deploy'd töökindlamaks (408 on varem prod-deploy'sid kukutanud). **Kõrge prioriteet, iseseisev väärtus.**
2. **Boot-aeg lühemaks** (~514s module-loader) — väldib simultaanse-boot overload'i.
SIIS multi-instance feasible (staggered VÕI peale meili-fix'i simultaanne). VÕI **2. node** (replicad eraldi hostil — aga meili-408 fix ikka vajalik).

**PgBouncer üksi** võib prod'i minna (ohutu, prod-standard, bounds conn) — AGA üksi ei lahenda cart-freeze't (selleks vaja replicaid). Stopgap (12s+retry) JÄÄB.

---

## 14. EELTINGIMUS #1 valideeritud — meili settings-on-boot SKIP (2026-06-08)

**Muudatus (commit bc8f8809):** `backend/Dockerfile` patch-blokk laiendatud — plugin loader
`@rokmohar/medusa-plugin-meilisearch/.../loaders/index.js` SKIP'ib `updateSettings` boot'il
kui `SKIP_MEILISEARCH_STARTUP_INDEXING !== 'false'` (juba `true` staging+prod env'is).
Settingsid jäävad SSoT `index-meilisearch.mjs`'i (feed-sync rakendab 4h tagant). Registreerimine
(`container.register(meilisearchService)`) jääb enne SKIP'i → teenus saadaval.

### Mõõdetud staging'us
| Mõõt | Enne | Peale meili-fix'i |
|---|---|---|
| Meili 408 boot'il | korduv → deploy FAILED | **0** |
| Boot StartedAt→loader-valmis | ~514s | **413s** (-100s) |
| Meili settings terved | — | ✅ searchable 7, filter 13, sort 3, 17105 docs (boot ei rakenda, volume-persistent) |
| Browse/search | — | ✅ töötab, hinnad õiged |

**Boot-aja suur osa (~5.5min) on Medusa core-bootstrap** (telemetry-banner → module/link-loaderid),
MITTE meili. Meili-fix annab **reliability** (0×408 = deploy-killer kadunud), boot-kiirus paraneb mõõdukalt.
→ **Blokeerija #1 lahendatud. Blokeerija #2 (boot CPU) leevendub aga jääb.**

### Multi-instance re-test (meili-fix'iga, manuaalne 2. instance)
- **medusa-2 boot HEALTHY** õigel võrgul (`k33g...` 10.0.9.x, kus db/meili/redis), **0×408**, boot 770s (host-CPU-surve all, aga edukas).
- ⚠️ **Test-harness gotcha:** Coolify-l on 2 võrku — `k33g...` (10.0.9.x, kus `db`/`meili` aliasid) ja `k33g..._default` (10.0.10.x). `db` resolveerub AINULT esimeses. medusa peab olema MÕLEMAS (medusa-1 on). Vale-võrgule pandud instance → `db` ei resolveeru → pool-timeout (algselt valesti tõlgendatud boot-blokeerijaks).
- **Round-robin kinnitatud:** `getent medusa` → 10.0.9.6 (3×) + 10.0.9.8 (7×), DNS jaotab mõlemale instantsile.
- **Connection-math kinnitatud:** idle 5 pg-conn (2 instance), 30-concurrent koormus → **pg-peak 18** (<30 siht, max 100). Host load tipnes 9.8/12 vCPU, RAM 9.4/62Gi.

### 🔴 UUS LEID — pool-starvation üksikinstantsil raske kontsurentsi all
Koormus-test (300 päringut, 30 concurrent `/store/regions`) → **medusa-1 jäi pool-starvation seisu**
(Running=true, Health=unhealthy, health-endpoint 20s timeout). Juur: `/store/regions` JA `/store/products`
teevad query.graph relation-expansion'i (EntityLoader.populateMany/findChildren N+1) → aeglased päringud
hoiavad knex-pool-conn'e → pool ammendub → uued acquire'd timeout'ivad → kaskaad. **Sama #11922 juur.**
pg server-conn oli vaid 12 (postgres POLE süüdi) — APP-pool ammendus. **Ise-taastus ~90s** peale koormuse lõppu (kinni-päringud timeout'ivad → pool vabaneb; restart polnud vaja).

**Tähendus prod'ile:**
- Browse on juba Meili peal (Fix #1) → see endpoint-klass EI ole reaal-browse-teel. Cart/checkout kaitseb stopgap.
- Aga kinnitab: **horisontaalne scaling (rohkem pool-e) + PgBouncer (bounds server-conn) on õige suund**, ja raske-relation-endpoint'e ei tohi katmata jätta.
- **Connection-math RISK ilma PgBouncerita:** 2 instance × DB_POOL_MAX 50 = **100 = postgres max_connections 100 → null headroom** (worker/migratsioon/psql/admin lükataks tagasi). → **PgBouncer prod'is VAJALIK**, mitte valikuline (VÕI DB_POOL_MAX alla).

### Steady-state ressurss (kõrvalteenuste headroom)
12 vCPU, 62Gi RAM. 2 medusa idle: load ~4-5, RAM 9.4Gi kasutuses / **53Gi vaba**. Kõrval: coolify (~50% CPU 1 tuum),
mailcow-redis, teine Coolify-projekt (uo28...), uptime-kuma, 2 muud db. **Runtime-headroom OLEMAS** mailcow/teiste kõrval.
Ainus surve-aken on **boot** (CPU-raske ~7-13min) — sellele staggered-boot.

---

## 15. PROD-DEPLOY A — meili-fix LIVE (2026-06-08) ✅ EELTINGIMUS #1 TÄIDETUD

**Deploy:** Coolify prod-app `uo28ovobnflauslqjgxeohl0` (brrr-xlmarket:main), main HEAD 42f3d701 (sisaldab bc8f8809).
Standard single-instance redeploy (Tarmo prod-go). Build 173s (cache), medusa boot ~13.5min (prod aeglasem: 7755 synonyme + rohkem data, jagatud host).

**Verifikatsioon LIVE:**
- ✅ **0×408 boot'il**, skip-log kinnitatud, boot edukas.
- ✅ **Meili settings 100% TERVED** (enne→peale identne): searchable 7, filterable 13, sortable 3, **synonyms 7755**, rankingRules 6, **17441 docs**. Boot ei puutunud (volume-persistent; synonyms tulevad sync-synonyms.mjs'ist).
- ✅ Otsing + facet-filtrid + kategooriad + toote-API + toote-leht + avaleht (/et) + hinnad — kõik 200, hinnad õiged.
- ⚠️ **Cutover-cleanup:** ~13.5min cutover-aknas (vana medusa maas, uus boot'is) CF cache'is mõned 404-d (storefront ei saanud tooteid → 404 → CF s-maxage=3600). **Lahendatud CF purge_everything'iga** (node-fetch konteineri seest, token ei lahkunud). Sait re-warm 200 (/et 0.13s).
  - **Õppetund:** purge_everything peale cutover'it tekitab külm-cache thundering-herd → esimene /et SSR 504 (CF/Traefik timeout), siis warmib. B-cutover'il: surgical purge VÕI warm-up-skript peale deploy't.
- 🟡 **Pre-existing leid (MITTE deploy A põhjustatud):** `connect ECONNREFUSED ::1:5435` kordub ~iga 2.5min prod-medusas. Port 5435 = lokaalne dev postgres-port (CLAUDE.md). DATABASE_URL on õige (`db:5432`); 5435 pole env'is/medusa-config'is/@medusajs's. Sügavam dev-config-default-leke (mingi subscriber/job). **Non-fatal** (sait töötab). VAJA ÄRA TEHA: jälita allikas (eraldi ülesanne).

**Seis:** eeltingimus #1 LIVE prod's → 408-deploy-killer kadunud, KÕIK tulevased prod-deploy'd töökindlamad. **B (PgBouncer + 2 replicat + worker) ootab eraldi öö-akna prod-go'd.** Stopgap jääb.

---

## 16. B-CUTOVER — uuendatud kombineeritud plaan (öö-aken, ootab prod-go't)

> **HARD RULE #1: EI käivita enne Tarmo öö-akna selget go'd.** Madal-liiklus-aken (öö), sest boot-aknas tulevad instantsid järjest üles + parooli-rotatsioon + cache külmeneb hetkeks.

**Eeldused olemas:** eeltingimus #1 (meili-fix) LIVE → 0×408, töökindel boot. Multi-instance runtime valideeritud staging'us (round-robin + connection-math pg-peak 18<30 + steady-state odav).

### B-cutover komponendid (ühes aknas, koordineeritult)

**B1 — Skaleerimis-tuum (PgBouncer + 2 replicat + worker)**
- Lisa `pgbouncer` (edoburu/pgbouncer, transaction-mode, `DEFAULT_POOL_SIZE=50`, `MAX_CLIENT_CONN=1000`, `AUTH_TYPE=scram-sha-256`, `DB_HOST=db`).
- `medusa` põhi: `DATABASE_URL→pgbouncer:5432`, `MEDUSA_WORKER_MODE=server`, redis-moodulid (CACHE/EVENTS/WE/LOCKING → xlmarket-redis).
- `medusa-2`: `<<: *medusa-env` + võrgu-alias `medusa` (round-robin), `depends_on medusa: service_healthy`.
- `medusa-worker`: `<<: *medusa-env` + `MEDUSA_WORKER_MODE=worker`, `depends_on medusa-2: service_healthy`.
- **Connection-math:** PgBouncer KOHUSTUSLIK — ilma selleta 2×DB_POOL_MAX 50 = 100 = postgres max 100 (null headroom). PgBouncer bounds server-conn <30.
- **Boot-orkestratsioon:** Coolify-compose automaatne *serial* multi-boot timeout'ib (~13min/instants × 3 > Coolify deploy-timeout). → kas (a) tõsta Coolify deploy-timeout, VÕI (b) põhi-medusa+pgbouncer+worker esmalt 1 web'iga, siis medusa-2 **staggered manuaalse boot'iga**. Otsusta aknas host-load'i järgi.

**B2 — Postgres-parooli rotatsioon (FOLDITUD, sama aken)**
> Põhjus: parool paljastus diagnostika-väljundis 2026-06-08 (sessioon). Roteeri B-cutover'i osana (stack niikuinii redeployb).
- Genereeri uus tugev parool.
- Koordineeritud uuendus ühes aknas (KÕIK tarbijad korraga, muidu auth-fail):
  1. `ALTER USER xlmarket WITH PASSWORD '<uus>'` postgres'is.
  2. Coolify-env `POSTGRES_PASSWORD=<uus>` (→ propageerub `DATABASE_URL`, pgbouncer `DB_PASSWORD`, kõik `<<: *medusa-env`).
  3. PgBouncer auth: edoburu loeb `DB_PASSWORD` env'ist → sama `<uus>`; kui userlist.txt kasutusel, uuenda ka seda.
  4. Kontrolli muud tarbijad: feed-sync skriptid (DATABASE_URL kaudu OK), cms/db PGPASSWORD (vt B3 — pärast fix'i DATABASE_URL kaudu).
  5. Redeploy → kõik konteinerid uue parooliga; postgres ALTER'itud → match.
- **Järjekord:** ALTER + env-update koos, SIIS redeploy. Lühike aken kus vanad konteinerid ei saa UUSI conn'e (aktsepteeritav cutover-aknas). Verifitseeri: kõik teenused healthy + pg-auth OK uue parooliga.
- **Rollback:** kui auth-fail → ALTER tagasi vanale + env tagasi + redeploy.

**B3 — CMS / 5435 dev-config-leke koristus (FOLDITUD, koodi-fix)**
> Juur (kinnitatud): `backend/src/modules/cms/db.ts` + `backend/src/api/admin/categorization-queue/route.ts` → oma pg-`Client` `host: PGHOST||"localhost"`, `port: PGPORT||5435`. Prod-medusas PG* puudub → localhost:5435 ECONNREFUSED ~2.5min → CMS ei loe DB-st (cms_page 20 rida db:5432's) → storefront fallback static-JSON'ile; admin CMS-editing katki.
- **Koodi-fix (eelistatud, robustne):** muuda `makePgClient()` + categorization-queue route parse'ima `DATABASE_URL`'i (üks tõeallikas) PG* env asemel. Siis pole eraldi env vaja, töötab dev+staging+prod. Läheb B-deploy'ga (rebuild niikuinii).
- **Alt (kiire):** lisa prod PG*-env (`PGHOST=db PGPORT=5432 PGUSER=xlmarket PGPASSWORD=<uus> PGDATABASE=xlmarket`) — aga siis sõltub parooli-rotatsioonist (B2) → koodi-fix puhtam.
- Verifitseeri peale: 0× ::1:5435 logis, `/store/cms/:key` 200, live CMS-leht näitab DB-sisu (mitte fallback), admin CMS-editing loeb+kirjutab.

**B4 — Surgical CF purge + warm-up (FOLDITUD)**
> Põhjus: deploy A `purge_everything` → külm-cache thundering-herd → esimene /et SSR 504 (CF/Traefik timeout) enne warmimist.
- **Surgical purge:** `purge_everything` asemel purge AINULT muutunud rajad (toode-API'd / kategooriad mida cutover puudutas), VÕI kui täis-purge vajalik → kohe warm-up.
- **Warm-up-skript:** peale cutover'it eelsoojenda võtme-browse-lehed ser-side ISR cache'i: `/et` (avaleht), top-N kategooria-lehte, `/api/header-categories`, sample toode-API'd. Sekventsiaalne (ei thundering-herd) → ISR soe enne kui CF-liiklus saabub.
- Verifitseeri: /et + kategooriad 200 <1s peale warm-up'i (mitte 504).

### B-cutover järjekord (öö-aknas)
1. Genereeri uus pg-parool (B2 ettevalmistus).
2. Merge koodi-fix (B3) main'i (eraldi PR/commit, ei deployi veel).
3. Aknas: ALTER postgres-parool + Coolify-env (POSTGRES_PASSWORD + scaling-env'd) → redeploy uue compose'iga (B1).
4. Boot-orkestratsioon (staggered vajadusel) → kõik healthy.
5. Surgical purge + warm-up (B4).
6. Verifitseeri: health, round-robin, pg-conn<30, CMS DB-sisu, 0×5435, sait+hinnad, parool-auth.
7. Load-test prod-arhitektuuril → kui kinnitab cart-tee → ALLES SIIS aruta stopgap'i eemaldamist (eraldi go).
- **Rollback igal sammul:** compose tagasi single-instance + parool tagasi + redeploy.

**Stopgap (12s+retry) JÄÄB** kuni load-test prod-arhitektuuril kinnitab (eraldi go eemaldamiseks).
