# Cutover-valmiduse audit — FAAS 5 (2026-08-26)

> **Staatus: AINULT mõistmiseks, MITTE teha.** Read-only audit mõlemast stackist (uo28 PROD külmutatud, ei puudutatud). Eesmärk: mis staging'il ON, mida prod vajab identsena.

## Topoloogia — uo28 PROD vs k33g STAGING (sama host, sama Docker-daemon)

| | **uo28 PROD** (külmutatud) | **k33g STAGING** (kogu töö) |
|---|---|---|
| Stack (7 teenust) | db · medusa · medusa-worker · meili · pgbouncer · redis · storefront | **IDENTNE** (samad image'id: postgres:16-alpine, meilisearch:v1.41, redis:7-alpine) |
| Kood-image | `1c09a40…` (**7 nädalat vana** = coming-soon build) | `5757145d…` (taxonomy-v4, jooksev) |
| Storefront domeen | `xlmarket.ee` | `staging.xlmarket.ee` |
| Medusa API domeen | `api.xlmarket.ee` (+ admin `admin.xlmarket.ee`) | `staging-api.xlmarket.ee` |
| Meili domeen | `meili.xlmarket.ee` | `staging-meili.xlmarket.ee` |
| **Tooteid DB-s** | 17446 | **18382** |
| **Kategooriaid** | **3360 (VANA taksonoomia)** | **1928 (v4 puhastatud)** |
| Meili doc | ~vana | 15144 |
| Volume'id | meili · pgdata · redis (**3**) | meili · pgdata · redis · **feeddata (4)** |
| Region ID | `reg_01KMRXWS…` | **SAMA** `reg_01KMRXWS…` |
| Feed-sync | **EI** (pole feeddata't, cron ei siha) | **JAH** — host-cron `0 3 * * *` → k33g |

**Põhijäreldus:** uo28 pole "natuke maas" — ta jookseb **täiesti erinevat koodi (coming-soon) + vana taksonoomiat (3360 kat)**. k33g on juba täielikult ehitatud, jooksev ja testitud prod-kandidaat.

---

## 5 küsimuse vastused

### 1. Kas prod uo28 infra = staging k33g?
**JAH, infra identne** — sama 7-teenuse Docker-stack, samad image-versioonid, sama Coolify-muster, mõlemad samal hostil. **Erineb ainult:** (a) kood-image (vana coming-soon vs v4), (b) andmed (vana vs v4 taksonoomia), (c) **feeddata volume puudub uo28-l**, (d) domeenid (bare vs `staging-` prefiks).

### 2. Mis tuleb üle kanda?
| Element | Kopeerida? | Kuidas |
|---|---|---|
| **Kood** | JAH | uo28 Coolify → taxonomy-v4 branch + redeploy (tapab coming-soon builderi) |
| **DB** | JAH (või promote) | `pg_dump` k33g → restore uo28 (v4 taksonoomia + 18382 toodet) |
| **Meili** | Ei kopeeri toorelt | Reindeks kopeeritud DB-st (`index-meilisearch.mjs`) — puhtam kui dump |
| **Pildid** | **EI** | thumbnail = VEVOR CDN URL (`image.vevor.com/…`), serveris ei hoita |
| **feeddata volume** | JAH luua | uo28-l puudub — vaja lisada + feed-cache mount |
| **Redis** | EI | cache/sessions, taastub ise |

### 3. Feed-sync prod'is — seadistatud?
**EI.** Host-cron `0 3 * * * /opt/xlmarket-github/scripts/import-pipeline-cron.sh` sihib **eksplitsiitselt k33g-d** (`docker exec db-k33g …`). PROD-il pole feed-sync'i ega feeddata volume't. **Cutover nõuab:** feed-sync sihtmärk ümber prod-stackile + feeddata volume + öine import-cron testitud prod'i vastu.

### 4. DNS/domeen samm (coming-soon → live)?
- **Coming-soon = KOOD, mitte flag.** `xlmarket.ee` (ka `/api/products`) tagastab `<title>XL Market — tuleme varsti</title>` — kogu uo28 build on coming-soon-app (`1c09a40`). Env-lippu (COMING_SOON/MAINTENANCE) EI OLE. → live minek nõuab **uue koodi buildi**, mitte lipu-lülitust.
- **Domeeni-samm sõltub strateegiast (A vs B allpool).**

### 5. Mis on ERINEV prod'is?
- **`/meili` nginx-proxy — EI OLE kummaski Coolify-stackis.** See oli vana bare-metal VPS (`100.93.186.17`) muster. Coolify-s pärib klient otse Meili-FQDN-ilt (`NEXT_PUBLIC_MEILI_URL`). CLAUDE.md `/meili proxy` gotcha **ei kehti** Coolify-s.
- **`.eu` domeen — EI OLE üheski Traefik-reeglis.** `xlmarket.eu` pole siin hostil marsruuditud (ainult `xlrent.eu` = eraldi projekt: nextcloud/vault/status). Cutover-gap: `.eu` vajab kas Traefik Host-reeglit (→ storefront) või `.eu → .ee` redirecti — **praegu puudub**.
- **feed-mount:** k33g-l feeddata volume; uo28-l mitte.
- **TLS:** `staging.xlmarket.ee` = self-signed (curl -k). Prod `xlmarket.ee` vajab kehtivat Let's Encrypt certi (Coolify auto, kui FQDN avalik).

---

## Cutover-strateegia: A vs B

### ⭐ A — PROMOTE k33g → prod (domeeni-swap) — SOOVITATUD
k33g on **juba** valmis ehitatud (v4 kood) + jooksev andmestik (18382/1928 v4) + feed-sync sihib teda + feeddata olemas + Meili indekseeritud. Cutover = **domeenide ümber-suunamine**:
- k33g Coolify FQDN: `staging.xlmarket.ee` → `xlmarket.ee` (+ `api`/`meili`/`admin` bare-domeenid), Let's Encrypt bare-domeenile.
- uo28 → peatada, jääb **30p backup**.
- feed-sync juba sihib k33g-d → **muutmata**.
- **Pluss:** 0 andmekopeeringut, 0 rebuildi, "mida testisid staging'us = ON prod". **Miinus:** k33g nimeliselt "staging" saab prod'iks; uus staging vajab hiljem (uo28 võib selleks saada).

### B — REBUILD uo28 = k33g (kopeeri kõik)
uo28 Coolify → taxonomy-v4 + redeploy · pg_dump/restore k33g→uo28 · Meili reindeks · lisa feeddata + mount · feed-sync cron ümber k33g→uo28 · domeenid jäävad. **Pluss:** uo28 jääb kanooniliseks prod'iks, k33g jääb staging'uks. **Miinus:** oluliselt rohkem tööd + andmekopeeringu risk.

**Soovitus: A** — identne infra + jooksev k33g teeb domeeni-swapi madalaima riskiga. B ainult kui on tugev põhjus uo28 kui prod-host säilitada.

---

## FAAS 5 — CUTOVER CHECKLIST (strateegia A, domeeni-swap)

> Iga samm read-only kuni cutover-otsus tehtud. Järjekord loeb.

**Eeltingimused (enne cutoverit):**
- [ ] k33g täis-QA roheline: 5 build-fixi live · inv-taxonomy 0 FAIL · grab-bag täis-skänn (verstapost) · Montonio makse E2E test
- [ ] `.eu` domeeni-otsus: redirect `.eu → .ee` VÕI teine storefront-Host-reegel (praegu PUUDUB)
- [ ] DNS: `xlmarket.ee` (+ api/meili/admin) A-kirje → selle hosti IP kinnitatud (TTL madalaks enne)
- [ ] uo28 andmed backup'i (pg_dump + Meili dump) enne kui uo28 peatub

**Cutover-sammud:**
1. [ ] **DNS TTL alla** (nt 300s) 24h enne — kiire tagasipööre
2. [ ] **uo28 → maintenance/stop** (vabastab bare-domeenid Traefikus)
3. [ ] **k33g Coolify FQDN swap:** `staging.xlmarket.ee` → `xlmarket.ee`, `staging-api` → `api.xlmarket.ee`, `staging-meili` → `meili.xlmarket.ee` (+ admin)
4. [ ] **Let's Encrypt** bare-domeenidele (Coolify auto FQDN-swapil) — kontrolli cert väljastus
5. [ ] **Storefront env** uuenda: `NEXT_PUBLIC_BASE_URL` / `MEILI_URL` / `STORE_CORS` → bare-domeenid → **redeploy** (build-time bundle)
6. [ ] **.eu routing** aktiveeri (redirect või Host-reegel)
7. [ ] **Smoke-test** bare-domeenil: avaleht · kategooria · toode · otsing (Meili) · ost (Montonio E2E) · admin login
8. [ ] **Feed-sync** — juba sihib k33g-d; kinnita esimene öine `import-pipeline-cron.sh` jooks prod-domeenil (Telegram fail-loud roheline)
9. [ ] **uo28 = 30p backup** — ära kustuta, hoia külmutatud

**Cutover-järgne:**
- [ ] Uus staging (valikuline): uo28 → taxonomy-v4 staging-app VÕI eraldi Coolify-app
- [ ] Monitooring: uptime-kuma prod-domeenile · Meili doc-count vs DB elus-tooteid (isekohanduv)

---

## Lahtised augud (cutover-blokeerijad, VAJA ÄRA TEHA)

| Auk | Mõju | Strateegia A vajab? |
|---|---|---|
| **`.eu` routing puudub** | `.eu` külastaja ei jõua poodi | JAH — otsus + Traefik/redirect |
| **feeddata + feed-sync** | A: juba k33g-l ✓ / B: luua + repoint | A=✓, B=vaja |
| **Coming-soon = kood** | live nõuab uut buildi (mitte flagi) | A: k33g juba live-kood ✓ |
| **TLS bare-domeenile** | https kehtetu ilma LE-ta | JAH — Coolify LE swapil |
| **uo28 backup enne stop'i** | rollback-võimalus | JAH — pg+Meili dump |

**Kokkuvõte:** cutover ei nõua suurt migratsiooni, KUI valida strateegia A (k33g on de facto valmis prod). Peamised päris-tööd: (1) `.eu` otsus, (2) domeeni-swap + LE, (3) uo28 backup, (4) E2E smoke prod-domeenil. Andmed/pildid/feed-sync on A puhul juba paigas.
