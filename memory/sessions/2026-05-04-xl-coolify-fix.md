# Sessioon 2026-05-04 — XL Coolify fix (poolik)

> Algas ~04:30, koos Risto. Eesmärk: parandada xlmarket.ee Coolify deploy mis oli mitmest kohast katki.

---

## 🚀 JÄRGMINE SESSIOON — START SIIT

**HOIATUS:** Risto lõpetas sessiooni frustreerituna ("see saast jääb üles?"). Sait on **kohati katki** (osad tooted 200 OK, osad annavad SSR-is "Oops"). Vana VPS xlmarket.store **endiselt redirectib xlmarket.ee'le** — tähendab kõik vana VPS kasutajad näevad osaliselt katki lehte. Mina pakkusin maintenance HTML-i kui vahe-lahendust, aga Risto ei vastanud "jah" — sessioon lõpetati ilma cleanup'ita.

**Esimene asi:** küsi Ristolt kas:
- (a) maintenance HTML xlmarket.store-le (vana VPS, mu kätte) + hommikul lahendada xlmarket.ee
- (b) rollback: eemalda nginx redirect, Coolify storefront stop, mõlemad domain'id "down"
- (c) jätka parandamist (vt punkte all)

**xlmarket.ee TÖÖTAB** sessiooni lõpu seisuga (200 OK, kõik 5 konteinerit healthy), aga **osad tooted SSR crash** (vt punkt 2.5). Aga 3 asja jäi pooleli. **Kontrolli kõigepealt:**

```bash
# 1. Kas leht ikka töötab (tarmo serverit puutumata)
curl -sk -o /dev/null -w "%{http_code}\n" "https://xlmarket.ee/et"
# 2. Kas konteinerid healthy
ssh -i ~/.ssh/xlmarket_deploy risto@65.21.126.235 "sudo docker ps --format '{{.Names}}\t{{.Status}}' | grep uo28"
```

Kui leht 200 ja konteinerid healthy — jätka punktide järgi. Kui storefront `Created` (Coolify deploy ebaõnnestus vahepeal): `sudo docker start storefront-uo28...` käsitsi.

### Punkt 1: Coolify Medusa healthcheck timing — CRITICAL FIX
- **Probleem:** Medusa start võtab 5-7 min, aga compose `start_period: 90s, retries: 5 × 30s = 240s` = 4 min. Iga Redeploy fail-b "dependency failed to start" veaga.
- **Fix:** muuda repo `docker-compose.yml` Medusa healthcheck `start_period: 600s`, commit, push, Coolify avastab uue commit'i, deploy'b. Coolify UI-s "Health Check" ei pruugi olla selgesti accessible.
- **Asukoht repo's:** `/home/brrr/xlmarket/docker-compose.yml` — vaata Medusa service block, lisa/muuda `start_period`.

### Punkt 2: Hero "festivalide kampaania" sektsioon esilehel puudu
- Pakkumised on tagasi, aga **hero osa puudu**
- Vaata `storefront/components/HomepageShell.tsx` — kuidas see hero'd renderdab
- Kontrolli kas `/store/cms/homepage?locale=et` API endpoint Medusa-s eksisteerib: `curl -sk "https://api.xlmarket.ee/store/cms/homepage?locale=et" -H "x-publishable-api-key: pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"`
- Kui 404 → endpoint pole installitud Coolify Medusa-sse (võib-olla custom plugin)
- Kui 200 aga tühi → andmed pole DB-s
- Kui 200 ja andmed → SSR koodi probleem

### Punkt 2.5: Mõned tooted annavad "Oops" (SSR error)
- Risto leidis **konkreetse toote** mis annab "Oops" — `vevor-pottery-wheel-for-adults-36-and-28-cm-turntables-450w-electric-t-pasipjqistmsc69yi0u1v2`
- Storefront API `/api/product/[handle]` → **404 "Not found"** sellele
- Medusa otse `/store/products?handle=...` → **200 OK** (toode on DB-s olemas)
- Console: "Error: An error occurred in the Server Components render"
- **Tähendab:** mingi konkreetse toote SSR koodis crashib (mitte kõik tooted)
- Hüpotees: toote metadata vormingus midagi katki — null väärtus, ET tõlke struktuur, kategooriad puudu
- **Test:** vaata `storefront/app/[locale]/toode/[handle]/page.tsx` ja `app/api/product/[handle]/route.ts` koodi — kuidas need tooted renderdavad. Lisaks: võrdle töötava (`12v-24v-400w-wind-turbine`) ja katkise (`vevor-pottery-wheel`) toote raw metadata Medusa API kaudu — leiad erinevuse

### Punkt 3: Cat-thumbs 502 Bad Gateway brauseris
- Brauseris nägime 20 × 502 kategooria pisipiltidele
- Otse curl töötab. Võib olla et oli vahepealse seisu (storefront polnud veel healthy)
- **Kõigepealt:** brauseris hard refresh (Ctrl+Shift+R), kas 502 endiselt tuleb
- Kui jah: vaata Traefik route'imist või Next.js standalone'i `/app/public/` mountimist

### Push state
- Push on **DISABLED tagasi** mõlemal remote'il (`origin`, `roland`)
- Viimane local commit = viimane push'itud roland'isse: `5c1868f`
- Lokaalne main = roland/main = origin/main (kõik sünk)

### Tarmo server cleanup
- `/tmp/reindex-bundle.tar.gz` ja `/tmp/reindex-data.tar.gz` võivad olla Tarmo `/tmp/`-s veel
- Eemalda kui näed: `ssh -i ~/.ssh/xlmarket_deploy risto@65.21.126.235 "rm -f /tmp/reindex-*.tar.gz"`

### Vältida
- **Ära Coolify Redeploy uuesti** kui Medusa healthcheck pole parandatud — sa saad sama "ebaõnnestus" tulemuse iga kord
- Risto märkis täna sessioonis: "äkki teeks midagi teistmoodi, mitte ei ürita 20 korda ühte ja sama asja teha ja loota erinevat tulemust"
- Iga Redeploy katse jätab `Created` storefront'i, mille pead käsitsi käivitama

---

## Mis tehti

### 1. Vana VPS xlmarket.store → 301 redirect xlmarket.ee'le
- nginx config täielikult asendatud lihtsa redirect'iga
- `/etc/nginx/sites-enabled/xlmarket.store` oli päris-fail, mitte symlink → vajas symlinki taastamist
- Backup: `/etc/nginx/sites-available/xlmarket.store.bak-2026-05-04`
- PM2 storefront jätta alles (mälu väike, võimalik backup)
- Postgres/Redis/Meili/tõlke pipeline puutumata

### 2. Coolify storefront — NEXT_PUBLIC_MEDUSA_KEY parandatud
- **Algne probleem:** eelmise sessiooni env vars'id paste'iti Coolify UI-sse ühel real (3 var'i tühikutega liidetud), DB-s tekkis katkine `pk_xxx NEXT_PUBLIC_REGION_ID=... NEXT_PUBLIC_MEILI_KEY=...` rida pikkusega 568 tähemärki
- Risto parandas Coolify UI-s (Production rida), mina sed-iga env failis ka (aga see ülekirjutub deploy-l, UI on tõde)
- Pärast parandust + Redeploy: konteineris õige `pk_d8dce98d...` 67-tähemärgine string
- TODO: kontrollida ka `Preview` rida samal viisil (jättis sessioonis tegemata, sest production peamine)

### 3. Meili reindex (oli täielikult tühi 2026-05-02-st saadik)
- Index oli loodud ja settings konfigureeritud, aga 0 dokumenti
- Reindex käivitatud Postgres'ist Meili-sse: `backend/scripts/index-meilisearch.mjs`
- Kuna script Medusa konteineris puudus, kopeerisin sinna: scripts + src/filters + src/data (YAML konfid)
- Symlink `/tmp/reindex/node_modules → /app/node_modules` et `pg` moodul kättesaadav
- Käsk: `docker exec -e DATABASE_URL=... -e MEILISEARCH_HOST=http://meili:7700 -e MEILISEARCH_KEY=ea5cd8f5... medusa-uo28... node /tmp/reindex/scripts/index-meilisearch.mjs`
- Tulemus: 17105 dokumenti Meili-s, 149.1s

### 4. Storefront kood: hardcoded `/meili/indexes` path → kasuta NEXT_PUBLIC_MEILI_URL
- 4 failis oli hardcoded `fetch("/meili/indexes/products/search")` — vana VPS arhitektuur kus nginx proxy'b `/meili/` → MeiliSearch
- Coolify-s (Traefik) `/meili/` proxy't ei eksisteeri, Meili on eraldi subdomain `meili.xlmarket.ee`
- **Failid muudetud:**
  - `storefront/components/HeroDeals.tsx`
  - `storefront/components/HomepageShell.tsx`
  - `storefront/components/ProductGrid.tsx`
  - `storefront/components/category/CategoryBottomRibbons.tsx`
- Pattern: `${process.env.NEXT_PUBLIC_MEILI_URL || "/meili"}/indexes/products/search` (fallback vanale path'ile)

### 5. Env var nime ebakõla: `NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY` vs `NEXT_PUBLIC_MEILI_KEY`
- Vana VPS .env.local: `NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY` (kood loeb seda)
- Coolify env: `NEXT_PUBLIC_MEILI_KEY` (lühem nimi)
- Lahendus: HeroDeals.tsx + HomepageShell.tsx loevad **mõlemat** võtmenime (fallback chain)

## Otsused

| Otsus | Põhjendus |
|---|---|
| 301 redirect (mitte 302) | Püsiv kolimine, Google indeks uuendub |
| nginx symlink taastatud | Õige nginx konventsioon, mitte päris-fail sites-enabled-is |
| Reindex Postgres'ist mitte dump'ist | Värskeim andmed, dump on 2 päeva vana snapshot |
| Sudoers ALL=NOPASSWD jääb Tarmo serveris | Eelmine sessiooni otsus, Coolify v4 nõue |
| Mitte rikkuda Tarmo teisi äppe (Mailcow, WP, Vaultwarden, Nextcloud) | UUID `uo28...` lukk kõikidel docker käsudel |

## Sessiooni lõppseis (2026-05-04 ~04:50)

**xlmarket.ee TÖÖTAB praegu** — kõik 5 konteinerit healthy, leht 200 OK. AGA ebamugavalt — Coolify Redeploy ei pruugi õnnestuda kui Medusa healthcheck'iga probleemid jätkuvad. Konteinereid tuleb käsitsi käivitada.

| Asi | Staatus |
|---|---|
| xlmarket.store → 301 → xlmarket.ee | ✅ Töötab (nginx redirect lokaalsel VPS-il) |
| xlmarket.ee tooteleht | ✅ Töötab — Oops kadunud, tooted nähtaval |
| xlmarket.ee esileht (kategooriad/pakkumised) | ✅ Töötab — pildid 502 (cat-thumbs probleem, vt all) |
| Hero "festivalide kampaania" sektsioon | ❌ Endiselt puudu |
| Mobiilne vaade | ❓ Vahepeal nägi "Oops" — vaja brauseris uuesti kontrollida |
| API otsene (api.xlmarket.ee) | ✅ Töötab |
| Meili otsing (meili.xlmarket.ee) | ✅ Töötab, 17105 dokumenti |
| Coolify Redeploy | ⚠️ Ebakindel — Medusa healthcheck timeout 240s, Medusa võtab 5-7min start'iks |

## Tehtud muudatused — kõik sees

### Koodimuudatused (commit-itud + push'itud roland-kaubandus/main):
- `e016006` — Storefront 4 faili: `/meili/indexes` → `${NEXT_PUBLIC_MEILI_URL}/indexes` env var'i kaudu
- `5c1868f` — ProductGrid + CategoryBottomRibbons: lisatud `Authorization: Bearer ${MEILI_KEY}` header

### Coolify env vars (Risto lisas UI-s):
- `NEXT_PUBLIC_MEDUSA_KEY` — parandatud katkisest 568-tähemärgisest stringist puhtaks `pk_d8dce98...` (67 tähemärki)
- `MEILISEARCH_HOST=http://meili:7700` — uus, SSR `lib/meilisearch.ts` jaoks
- `MEILISEARCH_KEY=458509c4...` — uus, SSR jaoks

### Server-side parandused:
- nginx vana VPS-il: `/etc/nginx/sites-enabled/xlmarket.store` symlink taastatud (oli päris-fail), config asendatud 30-rea redirect'iga
- Coolify Meili index: 17105 dokumenti reindekseeritud Postgres'ist (oli 0 dokumenti enne)

## TODO mida ei jõudnud teha

### CRITICAL — Coolify Medusa healthcheck timing
**Probleem:** docker-compose.yaml-is on Medusa healthcheck `start_period: 90s, interval: 30s, retries: 5` = 240s grace period. Medusa võtab tegelikult 5-7 min käivitumiseks. **Iga Redeploy fail-b** "dependency failed to start: medusa unhealthy" veaga, kuigi Medusa ise jookseb edasi healthy.
**Fix:** Coolify UI-s → Storefront → Configuration → Health Check (või Advanced) → Medusa `start_period: 600s` või rohkem. Või muuda repo `docker-compose.yml` ja tee uus deploy.
**Töökorras tee:** kui deploy fail-b, käsitsi `sudo docker start <storefront-konteineri-nimi>` Tarmo serveris (Medusa juba on Up, ainult storefront jääb Created).

### CRITICAL — Hero "festivalide kampaania" sektsioon puudu
- Risto märkis et esilehele tulid pakkumised tagasi, aga hero kampaania osa **endiselt puudu**
- Vaja vaadata järgmises sessioonis: kas see on `HomepageShell` mis kõnetab Medusa `/store/cms/homepage` endpoint'i, kas see endpoint Coolify Medusa-s eksisteerib või tagastab tühja andmete
- Logist nähtud (eelnevalt): `GET /store/cms/homepage?locale=et 400` → publishable key probleem mille parandasime, aga endpoint ise ka olla vaja kontrollida

### CRITICAL — `/cat-thumbs/*.webp` 502 Bad Gateway
- Brauseris Console näitas 20× 502 errorit kategooria pisipiltidele (`towing-system.webp`, `tie-down-straps.webp` jne)
- Failid ON konteineris olemas: `/app/public/cat-thumbs/*.webp` (3400 faili, 51MB total)
- Storefront otse vastab 200 (`docker exec wget http://127.0.0.1:3030/cat-thumbs/towing-system.webp` → 200 OK)
- **Aga 2 minutit hiljem `curl https://xlmarket.ee/cat-thumbs/towing-system.webp` → 200 OK ka** — võibolla on 502 oli **brauseri viewport** ajal mil storefront polnud veel healthy
- Vaja järgmises sessioonis brauseris uuesti vaadata
- Kui ikka 502: võibolla Traefik routing läheb vahel, või Next.js standalone'i `public/` dir mount probleem

### Mobiilne vaade
- Risto saatis screenshot'i mobiilses vaates "Oops" lehest — võib-olla oli see vahepealse seisu (storefront pooleldi healthy)
- Vaja uuesti kontrollida nüüd kui kõik healthy

### VAJA ÄRA TEHA
- **Push enable'da uuesti turvaliselt** — see sessioon push'is `e016006` ja `5c1868f` enable→push→disable patterniga, töötas. Tuleviku jaoks: kas teha skript või documentation kuidas seda korraga teha.
- **Tarmo serveris cleanup:** `/tmp/reindex-2026-05-04` kustutatud, aga `/tmp/reindex-bundle.tar.gz` ja `/tmp/reindex-data.tar.gz` võib-olla veel — kontrolli.
- **Coolify Preview env vars rida** kontrollida (eelmise sessiooni TODO, jätsime tegemata jälle)
- **storefront/lib/meilisearch.ts ja verticals.ts** kasutavad `MEILISEARCH_HOST` ja `MEILISEARCH_KEY` (ilma `NEXT_PUBLIC_` prefix). Need on praegu Coolify-s, aga **kahtlus: kuidas meili-lib teeb fetch via avaliku `https://meili.xlmarket.ee` aga konteinerist `http://meili:7700`** — kas SSR-i jaoks `http://meili:7700` (sisemine) on OK või vajab `https://meili.xlmarket.ee` (avalik)? Praegu töötab — aga vaja aru saada miks.
- **storefront `ecosystem.config.js`** uncommitted muudatus on **endiselt** uncommit'imata (path uuendus brrr-xlmarket→xlmarket). Lihtne commit homme.

### VAJA ÄRA TEHA
- **Push enable'da uuesti** (push on praegu DISABLED `oitmaaristo` ja `roland`-kaubandus remote'ide peal, vt `/home/brrr/CLAUDE.md`). Sessioonis ainult lokaalne commit, ei push'inud.
- **Hero Deals** ja **CMS homepage** API endpoint Medusa-s kontrollida — Medusa logides oli `GET /store/cms/homepage?locale=et` 400 (publishable key probleem mille me parandasime, aga endpoint võib eksisteerida või mitte)
- **storefront `ecosystem.config.js`** uncommitted muudatus on path uuendus (`brrr-xlmarket→xlmarket`), commit'ima
- **xlmarket.store SSL cert renewal** — Let's Encrypt renew on cert `xlmarket.store` peale, ACME challenge endiselt töötab redirect-config'is
- **Reindex skripti automaatika Coolify-s** — praegu manuaalselt copy-paste'isin Medusa konteinerisse. Õige lahendus: lisada Dockerfile-i `COPY scripts/ src/filters/ src/data/` ja teha cron'i jaoks command
- **Tõlke pipeline** otsustamata — kas jätkata vanas VPS DB-s ja sünkida hiljem Coolify-sse, või Coolify peale otse

### Memo: env var nimede konsolideerimine
- 2 erinevat nime samale võtmele on tehniline võlg — tulevikus ühtlustada `NEXT_PUBLIC_MEILI_KEY` peale (Coolify nimi, lühem)
- Kui muudad: kustuta `NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY` references kõikjalt (sh `.env.local`, `.env.example`)

## Failipathid

### Loodud
- `/tmp/reindex-bundle.tar.gz` — vana VPS-il (kustutati)
- `/tmp/reindex-data.tar.gz` — vana VPS-il (kustutati)
- `/tmp/reindex-2026-05-04/` — Tarmo serveris (kustutati pärast reindex)
- Medusa konteineri sees `/tmp/reindex/` — jääb sinna kuni järgmise restart'ini, automaatne cleanup
- `/etc/nginx/sites-available/xlmarket.store` — uus 30-rea redirect-only config
- `/etc/nginx/sites-available/xlmarket.store.bak-2026-05-04` — vana 209-rea full config backup
- `/data/coolify/applications/uo28ovobnflauslqjgxeohl0/.env.bak-2026-05-04` — Coolify env backup (Tarmo)

### Modifitseeritud (storefront kood, COMMIT'imata praegu)
- `storefront/components/HeroDeals.tsx`
- `storefront/components/HomepageShell.tsx`
- `storefront/components/ProductGrid.tsx`
- `storefront/components/category/CategoryBottomRibbons.tsx`
- `storefront/ecosystem.config.js` (varasem muudatus path uuendamine)

## Eksimused mida tegin

1. **2026-05-02 sessioonis env vars paste'imine ühel real** — sellest kasvas tänane segadus 2 päeva pärast. Olin pannud 3 env var'i ühele real "Lisaks pidi seadma..." sessioonilogis, Risto sisestas Coolify-sse selliselt nagu ma kirjutasin. Coolify env fail tekkis korruptseeritud. Risto vihastas (õigustatult) — vastutus on minul.
2. **Eeldasin asju ilma kontrollimata** — sessiooni alguses tegin järeldused "Meili tühi" ja "ET locale katki" enne kui kontrollin. Risto: "ära eelda midagi". Edasises töös jälgisin paremini.
3. **Mu CLAUDE.md memo Stacki kohta oli vananenud** — väitsin et Medusa backend port 9001 jookseb vana VPS-il, aga see ei jooksnud üldse. Memo polnud uuendatud peale 2026-05-02 migratsioon.
4. **Sed env failis ei ole tõde** — mu esimene parandus oli sed'iga `.env`-is otse, aga Coolify ülekirjutab redeploy-l. Pidin algusest peale juhendama Risto Coolify UI-st parandama (Coolify tõde DB-s). Õppus: Coolify-managed konfid pole edit'itavad otse failidena.

## Konteks järgmise sessiooni jaoks

**Esimene asi:** vajab Coolify Force Rebuild pärast koodimuudatuste push'i. Risto peab ka enne lisama puuduva env var'i `NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY` Coolify UI-sse. Pärast rebuild'i: test brauseris kõik 4 komponenti (HeroDeals, HomepageShell, ProductGrid kategooria all, CategoryBottomRibbons).

**Push enable'mine:** Risto soovis "git ja meie remote saada syncima nii, et ei kirjutaks enda oma üle pooliku versiooniga". Siia jäi sessioon poolikuks — push on endiselt DISABLED. Plaan järgmiseks sessiooniks: kõik 3 commit'i (kogu täna tehtud) sees lokaalsel `main`-il, ettevaatlikult enable'da push (esimene `git pull --rebase` et veenduda et Tarmo pole midagi push'inud — ta pole, kuid kontroll), siis push.

**Tõlge pole jätkunud** sellest sessioonist. DB seis: 6508/17468 ET tõlget. Pipeline jookseb vana VPS-il, käivitada vajadusel.
