# Churned→OOS revert — juurpõhjus + parandus (2026-07-23)

## Sümptom
Tarmo leidis pildi/sisu-vaese toote (`...zfxzbyctmspvcevq2v0`, aprilli orb-batch,
churned = puudub feedist), mis näitas "laos". Kontroll: **KÕIK 18062 toodet olid
`in_stock=true`** — eile pärast orb-fixi oli OOS 6420. Churned→OOS töö vaikselt tagasi pöördunud.

## Juurpõhjus (ahel)
1. k33g Coolify medusa-konteineris `FEED_CACHE_PATH=/data/vevor-feed-cache.json` — Coolify
   named-volume `k33g..._xlmarket-feeddata`, mount `/data`.
2. `/data` oli **root:root 755**, aga app-user = **uid 1001(medusa)** → app EI SAA sinna kirjutada.
   → cache't ei täitnud sinna KEEGI kunagi. Volume oli tühi.
3. `feed-sync.sh` (host bare-metal, `REPO=/home/brrr/...`, 127.0.0.1 pordid) EI jookse k33g-l —
   see kirjutab host-teele `backend/data/feeds/`, mitte konteineri volume'i.
4. Eile jooksis konteineri reindeks 3× (956-import, spec-ekstraktsioon, reprice Meili-samm)
   `docker exec <medusa> node /app/scripts/index-meilisearch.mjs` → cache puudus →
   `feedCacheBySku={}` → **safety-guard `isOosFromFeed` tagastas kõigile `false`** →
   kõik `in_stock=true`. OOS 6420 → 0.

## Guard oli VALE
`index-meilisearch.mjs` guard "cache tühi → ÄRA OOS'i kõike" (return false) tähendas
"kõik laos" — vaikne churned→OOS revert. Kommentaar nimetas seda "ohutuks" — ei olnud:
maskeerib tarnimatu dropship'i "laos"-olevaks (klient tellib, tarnija ei saa saata).

## Mis VEEL tagasi pöördus samast juurest?
**Ainult `in_stock`.** Kontrollitud:
- `specs` / `filter_tokens` (feed-tuletatud, rida 249) — langevad tagasi `meta.dimensions` peale
  → Meili-sample'is terved (weight_kg/dimensions olemas). MITTE materiaalne revert.
- `compare_specs` (eilne 956 spec-ekstraktsioon) = `meta.specs` DB-st → **cache-sõltumatu, terve.**
- Hind, kategooriad, taksonoomia, tõlked, pealkirjad — kõik DB-st → terved.

## Parandus (A + B + C)

**A — Andmed taastatud.** Container-native refresh (download → build-cache /data → reindeks) →
OOS **6614** (värske feed, veidi rohkem churned kui eilne 6420). Konkreetne toode `in_stock=false`.

**B — Guard abort** (`index-meilisearch.mjs` `preflightFeedCache`): cache tühi/puudub → **katkesta
exit 2 ENNE indekseerimist**, ära vaikselt kõik laos'ta. Override `ALLOW_EMPTY_FEED_CACHE=1`
(esmakäivitus/test). Testitud: abort peatab enne configureIndex; override lubab+hoiatab.

**C — Püsiv värskendus-mehhanism (Coolify-native).**
- `build-vevor-feed-cache.mjs` austab nüüd `FEED_CACHE_PATH` + `FEED_XLSX_PATH` env → konteiner
  kirjutab püsivasse `/data`-sse (vaikeväärtus = host backend/data/feeds/, tagurpidi-ühilduv).
- `refresh-feed-cache.sh` (uus) = container-native download→build→reindeks. Jookseb Coolify
  **Scheduled Task**-ina medusa-teenuses. Post-cutover kindel: elab Coolify-stackis, ei sõltu
  host bare-metal'ist ega docker-volume-siseelunditest.
- **Miks container-native, MITTE host-copy:** post-cutover host (vana VPS) muutub 30p backup'iks
  ja kaob. Host-copy sõltuks host'i olemasolust + docker-volume-siseelunditesse ulatumisest →
  puruneb cutover'il. Container-native = üks isemajandav mehhanism nüüd ja prod-is.

### Ühekordne eeltingimus (tehtud)
`/data` chown'itud `medusa:nogroup` (uid 1001), et app-user saaks kirjutada. Volume püsib
redeploy'de üleselt → chown püsib. Kui Coolify volume KUNAGI uuesti luuakse → esmane refresh
kukub valjult (wget permission denied) — nähtav, mitte vaikne.

### Coolify Scheduled Task (Tarmo registreerib dashboardis)
```
Service:  medusa
Command:  sh /app/scripts/refresh-feed-cache.sh
Cron:     0 */4 * * *
```

## Deploy-seis
- Skriptid kopeeritud jooksvasse konteinerisse (guard + refresh aktiivsed KOHE).
- Git commit = püsiv allikas; järgmine Coolify redeploy toob need image'ist.
- **SKOOP:** refresh hoiab cache värske + laoseisu õige. Toote-IMPORT (uued tooted feedist)
  EI ole siin — see on eraldi auto-klassifikaator B-etapp.

## Scheduled Task file-not-found (2026-07-23, järelkontroll)

**Sümptom:** `sh: can't open '/app/scripts/refresh-feed-cache.sh': No such file or directory`.

**Juurpõhjus:** `backend/Dockerfile` runner-etapp EI kopeeri `scripts/` kausta tervikuna — teeb
**valikulise per-fail COPY** (read 38–48). `refresh-feed-cache.sh` polnud loends → ei jõudnud image'i.
**Parandus:** lisatud Dockerfile COPY-ritta (aktiivne task, wget-põhine → curl pole vajalik).

**⚠️ feed-sync-bulk.sh EI ole cron-ohutu (uus leid — vastab "kas veel midagi revertiks"):**
- Selle `[2/5] feed-bulk-price.mjs --execute` = **flat MAP×1.15**, aga eile ühtlustati kogu
  kataloog **pricing-engine'ile** (`computeRetail`, kulu+kaal-astmed; `reprice-existing.mjs`, 34f07615).
- Kontroll-arvutus (MAP → sent): flat vs computeRetail erineb **+396…+1009 c** (kerged) ja **−990 c**
  (rasked). → feed-sync-bulk.sh cronina **kirjutaks hinnad iga 4h üle = eilse ühtlustuse revert**.
- Lisaks: `[1/5]` kasutab **curl-i** (konteineris pole → sureb 1. sammul); `set -uo pipefail` +
  seadmata `CF_API_TOKEN` → aborts 7. sammul.
- **Otsus:** feed-sync-bulk.sh JÄÄB repos (tulevik, kui pricing-engine greenlit), aga **EI wire'ita
  cronina praegu**. Cache/reindeks/laoseis käib **refresh-feed-cache.sh**'ist (stock-only, hinna-vaba).

**⚠️ Image ei sisaldanud commit 3ee1d4c9:** 09:00 redeploy build'is vanast koodist (Coolify cache) —
`grep preflightFeedCache` + `process.env.FEED_CACHE_PATH` image-failides = 0, kuigi `origin/main`=3ee1d4c9.
**Järgmine redeploy peab build'ima värskest commit'ist** (vajadusel force rebuild / no-cache),
muidu ka Dockerfile COPY-lisa ei ilmu.

### Coolify Scheduled Task (parandatud — Tarmo registreerib)
```
Service:  medusa
Command:  sh /app/scripts/refresh-feed-cache.sh
Cron:     0 */4 * * *
```
Eeltingimus: redeploy ≥ commit (Dockerfile-fix) värskest build'ist. `/data` juba chown'itud medusa:nogroup.
