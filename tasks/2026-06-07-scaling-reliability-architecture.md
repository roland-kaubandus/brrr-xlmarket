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

---

## 17. B-CUTOVER PROD — TEHTUD (2026-06-09 öö) ✅ + lahtised

**Aken:** öine, Tarmo jälgis. Prod-app uo28, commit 0044a754. Cutover ~16min (browse CF-cache'ist).

### Tehtud + verifitseeritud (8h stabiilne)
| Komponent | Tulemus |
|---|---|
| **B2 parool-rotatsioon** | ALTER + Coolify-env. **pg-auth-error 0** kõigis (medusa+medusa-2+worker). |
| **B1 pgbouncer** | transaction-mode üleval; medusa+medusa-2+worker → pgbouncer; **pg server-conn 11** (bounded, <100). |
| **B1 2 web-replica't** | medusa + medusa-2; **round-robin** `medusa` alias → 7:5 jaotus, mõlemad health 200. |
| **B1 worker** | MEDUSA_WORKER_MODE=worker, eraldi konteiner; 0 auth/conn-viga. |
| **B1 redis-moodulid** | cache/events/WE/locking → xlmarket-redis (jagatud state N replicale). |
| **B3 CMS-fix** | CMS DB-read töötab prod's (cms_page 20 rida); **0×5435, 0×ECONNREFUSED**. |
| **B4 warm-up** | purge ebavajalik (cache 8h loomulikult soe); /et 9/10×200, hinnad õiged (€973.94). |
| Sait | /et + kategooriad + toode + hind kõik OK. |

### Load-test enne/pärast (8 parallel raske query.graph)
- ENNE (single-instance, direct-pg): **36s**, pg-peak 10.
- PÄRAST (2 replicat + pgbouncer round-robin): **59s**, pg-peak 11.
- **Tõlgendus:** sünteetiline raske *untrimmed* query.graph endpoint POLE reaal-hot-tee (Fix#1 trimmib toote kiireks=0s soe; browse=Meili). pgbouncer txn-mode lisab per-query overhead'i "jutukale" relation-expansion'ile (#11922, ~5s/päring inherentne) → 2-replica split ei kompenseeri SEL sünteetilisel testil. **Reaal-liiklus regressioonita.** 2-replica concurrency-väärtus vajab päris-concurrent-cart k6-testi (Sammas 5).

### 🔴 LAHTISED (kriitiline + follow-up)
1. **PERSISTENTSUS (kriitiline):** worker + medusa-2 on **manuaalsed `docker run` konteinerid** (restart:unless-stopped), MITTE Coolify-compose's. → **Coolify-redeploy taastab single-instance'i** (worker+medusa-2 orphan'iks/kaob). **ÄRA tee prod Coolify-redeploy't enne kui need on compose's folditud.** Follow-up: lisa medusa-2+worker compose'i staggered-start'iga (sleep-delay command) VÕI tõsta Coolify deploy-timeout + serial depends_on. Vajab uut akent + go't.
2. **Homepage külm-render 504** (pre-existing, MITTE pgbouncer): TRULY-külm /et SSR ületab CF 30s → 504; soojana 0.1s. ISR-revalidate-hetkedel risk. Follow-up: uuri /et SSR aeglust (mis cold-renderil teeb) + warm-up-cron VÕI pikenda ISR.
3. **Parool assistant-teada:** Coolify PATCH-API kajas väärtuse sessioonis. Soovitus: 1× lõpp-rotatsioon UI kaudu (assistant ei näe) — vt session-log retsept.
4. **Stopgap (12s+retry) JÄÄB** — eemaldust EI tehtud (vajab eraldi go peale päris-load-testi).

---

## 18. PERSISTENTSUSE-VALIDATSIOON EBAÕNNESTUS + host-capacity leid (2026-06-09)

**Eesmärk oli:** worker + medusa-2 Coolify-compose'i staggered-start'iga, mis ei timeout'i deploy'd ega overload'i hosti. Valideerida staging'us enne prodi.

### Mis juhtus (staging)
- Compose: medusa-2 (`sleep 300 && start`, alias medusa) + worker (`sleep 600`), depends_on EI medusa:healthy.
- **Deploy EI timeout'inud** (finished +176s) ✅ — staggered-sleep väldib Coolify-timeout'i (õige leid).
- **AGA ükski 3-st ei boot'inud healthy'ks 55min jooksul.** Host load püsivalt 9-15 (tipp 15.64/12 tuuma).
- **Juur:** sleep 300/600 << medusa boot ~810s → boot'id KATTUSID (medusa 0-810, medusa-2 300-1100, worker 600-1400 → 3 korraga) → sustained CPU-overload → event-loop-starvation → ükski ei lõpeta (sama muster nagu dry-run §13.2).
- **+ Jagatud-host:** prod jookseb NÜÜD ise multi-instance (3 medusa) → staging-boot konkureeris → host'il polnud boot-headroom'i.

### 🔴 PROD MÕJUTATUD (oluline)
Staging boot-storm (load 15 jagatud hostil) → **prod homepage 504/20s** storm'i ajal (prod medusa-backend jäi 200, aga külm-render-SSR timeout'is host-load all). Peatasin staging (medusa+medusa-2+worker) → prod taastus (load 2.5, /et 200 0.1s). **Õppetund: raske operatsioon jagatud hostil ohustab prodi.**

### Juur-järeldused
1. **Stagger peab olema TÄIS-serialiseeriv:** medusa-2 sleep > medusa boot (~810s) → nt **900s**; worker > medusa-2 healthy → **1800s**. 300/600 oli vale.
2. **Host-capacity on PIIRANG:** üks 12-tuuma host, prod juba 3 medusa + mailcow/nextcloud/teine-coolify. Boot-CPU on kitsaskoht (RAM 62G OK). Isegi serialiseeritud staging-boot lisab prod-baseline'ile (~5) → ~14 → prod homepage-blip risk IGA boot-akna ajal.
3. **Staging-multi-instance valideerimine prod-multi-instance kõrval = ise riskantne** (jagatud host, konkureerivad, prod sai pihta).

### Valikud (vajab Tarmo otsust)
- **A — Serial-sleeps + quiet-aken:** sleep 900/1800 compose's, prod-redeploy SÜGAV-öö-aknas (madalaim liiklus), monitoori prodi, rollback kohe kui homepage-blip. Risk: iga boot lisab load'i, prod homepage võib akna jooksul blip'ida. Staging-validatsioon ka quiet-aknas.
- **B — Manuaalne + runbook (väikseim risk):** jäta prod manuaalsete medusa-2/worker konteineritega (töötab 8h+), dokumenteeri runbook "peale iga Coolify-redeploy'd käivita medusa-2+worker uuesti" + ÄRA-redeploy-ilma-selleta. Ei lahenda päris-persistentsust, aga 0 prod-riski praegu.
- **C — 2. node (õige pikaajaline):** capacity-plaan (§3.6) mainis "teine node kui tipp kõrge". 2 hosti → prod-replicad jagunevad → boot-headroom + päris-HA. Suurem muudatus (Coolify multi-server / eraldi host).
- **D — Lihtsusta:** kas prod VAJAB 2 web-replicat + workerit praegu (pre-launch, madal liiklus)? Võib-olla pgbouncer + 1 medusa + worker (2 boot'i, mitte 3) piisab kuni päris-liiklus tuleb. Cart-concurrency-vajadus tõestamata (k6 Sammas 5 pole tehtud).

### Seis
- Prod: stabiilne, manuaalne multi-instance (medusa+medusa-2-manual+worker-manual, 8h+), homepage intermittentne külm-504 (~10%, pre-existing).
- Staging: PEATATUD (kaitseks prodile). Vajab ta-käivitamist (single-instance) quiet-hetkel.
- Compose HEAD: ohutu (pgbouncer+single medusa+warm-cache). medusa-2/worker EI ole compose's.
- **ÄRA prod-redeploy** (kaotaks manuaalsed medusa-2/worker) enne kui valik A/B/C/D otsustatud.

### Homepage külm-render 504 (read-only leid)
- `[locale]/page.tsx` (ISR revalidate=3600) await'ib: `getHomepageCms` (Medusa /store/cms → pub-key-middleware query.graph, külm ~5s #11922) + `season-special` (Meili, kiire) + `brands`/`overrides` (failid). Juur = pub-key-middleware query.graph külm-cost + Meili-külm, intermittentne ISR-expiry'l (tunnis).
- **Fix (tehtud, foldub):** `warm-cache.sh` (hoia /et + kategooriad + header-cat ISR+CF soe) → Coolify scheduled-task (iga 15min) + feed-sync-bulk [8/8] re-warm peale revalidate+purge. Ships image's, aktiveerub persistentsuse-redeploy'l VÕI scheduled-task'i lisamisel.

---

## 19. VARIANT D valideeritud staging'us (2026-06-09) ✅ + prod-redeploy plaan

**D = pgbouncer + 1 medusa + worker** (TEADLIKULT ilma 2. web-replikata kuni k6 Sammas 5 tõestab cart-concurrency vajaduse; pgbouncer jääb tuleviku-skaleerimiseks). + warm-cache homepage-504-leevenduseks.

### Staging-validatsioon (2 järjestikust deploy'd, prod kaitstud warm-keeper'iga)
| Kriteerium | Tulemus |
|---|---|
| Deploy EI timeout | ✅ mõlemad deploy'd "finished" ~3min (staggered-sleep väldib) |
| medusa + worker healthy | ✅ medusa ~13min, worker ~31min (sleep 900 + boot) |
| 2. järjestikune deploy ei lõhu | ✅ persistentsus kinnitatud (mõlemad taas healthy) |
| Host-sõbralik (1-2 boot) | ✅ max-load 9.14-11.20 (<12, ei overload'inud; vrd #18 fail load 15.6) |
| worker redis | ✅ 0 redis-error (peale võrgu-fix'i) |
| warm-cache.sh | ✅ POSIX-sh, /et+kategooriad+header-cat 200 |

### Kriitiline fix avastatud staging'us (commit ae4f7bd3)
worker'i tühi `networks: default:` → Coolify EI liitnud `<uuid>_default` võrku (kus `xlmarket-redis` alias) → worker crash-loop (getaddrinfo ENOTFOUND xlmarket-redis). **Fix: `default: aliases: [xlmarket-worker]`** (mitte-tühi blokk) → Coolify liidab `_default`. medusa töötas sest tal oli default:aliases. + warm-cache.sh POSIX-sh (konteineris pole bash, pole pipefail).

### PROD-REDEPLOY PLAAN (watched madal-liiklus-aken, ootab go't)
**Eel:** git HEAD (D-compose + worker-fix + warm-cache POSIX) main'is. prod-warm-keeper käima (kaitse homepage). Parool juba roteeritud (B2) — D kasutab sama Coolify-env'i (uus parool), ALTER pole vaja.

**Sammud:**
1. Peata manuaalsed `medusa-2-manual` + `medusa-worker-manual` (eemalda "medusa"-alias rotatsioonist → puhas cutover, väldi 50% flaky booting-medusa pihta). Prod = compose single medusa.
2. Coolify prod-redeploy (uo28, D-compose). Build ~3min (vana serveerib). Recreate: pgbouncer + medusa (~13min boot) + worker (sleep 900 → boot ~+15min) + storefront.
   - **Downtime:** ~13min DÜNAAMILINE (cart/SSR); **browse püsib CF-cache'ist + warm-keeper hoiab homepage**. Watched aken.
3. Verifi compose medusa healthy → siis worker healthy (~+15min). Eemalda manuaalsed konteinerid lõplikult.
4. Lisa Coolify Scheduled Task: `sh /app/scripts/warm-cache.sh` iga 15min (pidev homepage-soojus). + feed-sync-bulk [8/8] juba re-warm'ib.
5. Verifi: medusa+worker healthy, pg bounded, CMS DB-read (20 rida), hinnad, 0×5435, 0 auth-error, warm-cache.

**Rollback (graatsiline):**
- Kui worker ei boot'i → compose medusa üksi serveerib (pgbouncer+1 medusa, töötab; ainult job-offload puudu — ajuti võib MEDUSA_WORKER_MODE eemaldada medusalt = shared, jooksutab jobe).
- Kui compose medusa katki → revert compose (eelmine HEAD) + redeploy VÕI taaskäivita manuaalsed medusa-2/worker (8h töötanud seis).
- Parool ei muutu (B2 juba tehtud) → ei auth-riski.

**D tulemus:** persistentne (Coolify-redeploy ei kaota worker'it), host-sõbralik (2 boot'i serial), homepage-504 leevendatud (warm-cache cron). 2. web-replica edasi lükatud k6-ni (Sammas 5). Stopgap (12s+retry) JÄÄB.

---

## 20. VARIANT D PROD-DEPLOY TEHTUD (2026-06-09) ✅ PERSISTENTNE

Prod-app uo28, watched-aken, Tarmo jälgis. D-redeploy (HEAD f587d60f) edukas.

| Samm | Tulemus |
|---|---|
| 1. Peata manuaalsed medusa-2+worker | ✅ puhas cutover (compose-medusa serveeris) |
| 2. Coolify D-redeploy | ✅ deploy ei timeout; compose-medusa healthy ~13min, worker healthy ~35min (sleep 900 serial); max-load 9.7 (host-sõbralik) |
| 3. Eemalda manuaalsed | ✅ — topoloogia nüüd 100% Coolify-managed |
| 4. Scheduled-task warm-cache | ✅ loodud (*/15, enabled). Dockerfile-fix (warm-cache.sh COPY puudus) + docker cp jooksvasse (kohene). wget-fix (konteineris pole curl) |
| 5. Verifikatsioon | ✅ pg-conn 11 bounded, CMS 20 rida, auth 0/0, 5435 0/0, worker-mode worker, medusa→pgbouncer, /et+kategooriad+toode 200, hind €973.94 |

**LÕPP-TOPOLOOGIA (persistentne, 7 Coolify-teenust):** db + **medusa** (server, →pgbouncer) + **medusa-worker** (worker-mode, sleep 900 stagger) + meili + **pgbouncer** + redis + storefront. **Coolify-redeploy EI kaota enam worker'it** (persistentsus saavutatud).

**Erinevus B-st:** 2. web-replica (medusa-2) EEMALDATUD — väärtus tõestamata + host ei mahtunud. pgbouncer JÄÄB (bounds conn + valmis 2.-node skaleerimiseks kui k6 tõestab). 

**Lahtised (väiksemad):**
- warm-cache.sh praegu docker-cp'ga jooksvas konteineris (toimib); PERSISTENTNE alles järgmisest redeploy'st (Dockerfile COPY lisatud, commit 7f5efc77). Scheduled-task töötab niikaua docker-cp-failiga.
- Homepage/toode TRULY-külm-render 504 (~10%, pre-existing #11922 pub-key-middleware) — warm-cache (*/15) leevendab nüüd; juur jääb (eraldi optimeerimine).
- 2. web-replica + k6 cart-load-test = Sammas 5 (kui päris-liiklus tõestab vajaduse).
- Stopgap (12s+retry) JÄÄB.
