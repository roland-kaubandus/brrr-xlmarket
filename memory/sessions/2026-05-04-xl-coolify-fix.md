# Sessioon 2026-05-04 — XL Coolify fix (poolik)

> Algas ~04:30, koos Risto. Eesmärk: parandada xlmarket.ee Coolify deploy mis oli mitmest kohast katki.

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

## TODO mida ei jõudnud teha

### CRITICAL — koodi parandus tehtud, vajab veel Coolify samme
1. **Risto: lisa Coolify UI-s env var** `NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY=458509c40836d9792776794f34a9f7ded8889857b1c9cb118bfe5f93a12ca48b` (sama search key, kahe nimega)
2. **Force Rebuild Coolify-s** pärast commit'i — sest `NEXT_PUBLIC_*` küpsetatakse build'i sisse
3. **Test brauseris:** kategooriad, esileht hero/featured tooted, otsing
4. Hiljem: `Preview` env var rida samuti kontrollida (production rida sai parandatud)

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
