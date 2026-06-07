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
   - 🔴 **BLOKEERITUD: .ee NS-delegatsioon KIRJAVIGA** (diagnoos 2026-06-07, read-only DNS). Register delegeerib `edaard.ns.cloudflare.com` (kirjaviga, ei eksisteeri/ei resolveeru) + `penny.ns.cloudflare.com` (õige). Cloudflare nõuab MÕLEMAT määratud NS-i (`edward`+`penny`) → zone jääb **Pending**, ei aktiveeru. DNSSEC EI blokeeri (DS/DNSKEY puuduvad).
   - **Parandus (Tarmo, .ee registrari paneel — Code ei saa registrit muuta):** `edaard` → `edward`, `penny` jätta. Propagatsioon ~6h (NS TTL) → Cloudflare auto-aktiveerib. SEEJÄREL: A-rekord Proxied (oranž) + edge-cache reeglid + purge feed-sync'il.

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
