# CLAUDE.md — XL: xlmarket.ee + .eu e-pood

> Viimati uuendatud: 2026-05-02 (õhtul, pärast Tarmo Coolify deploy)

---

## Praegune deploy seis (2026-05-02 öö)

**TWO LIVE SETUPS — kasuta neid teadlikult:**

| Süsteem | URL | Mis seal töötab | Andmed |
|---|---|---|---|
| **Vana VPS** (`100.93.186.17`) | `xlmarket.store` (live) | bare-metal Next.js + Docker DB/Redis + bare-metal Meili + bare-metal Medusa, PM2 | Production andmed, 17468 toodet, **6508+ ET tõlget** (tõlke pipeline siin jookseb) |
| **Tarmo Coolify** (`65.21.126.235`) | `xlmarket.ee` (live, self-signed SSL) | 5-konteineri Docker stack: db/redis/meili/medusa/storefront, Coolify-managed | **Sama andmed migrates'tud** (pg dump + meili dump 2026-05-02). Tõlke pipeline EI jookse siin (lihtsam vana VPS-il jätkata) |

**Production migrate plaan:** Kui Tarmo lisab wildcard DNS `*.xlmarket.ee → 65.21.126.235`, Tarmo Coolify saab täielikult elus + Let's Encrypt cert. Siis: cutover (DNS muudatus), uus prod = Coolify, vana VPS jääb 30p backup'iks.

**Tarmo Coolify deploy detailid:** `xlmarket/memory/sessions/2026-05-02-xl-coolify.md` (kõik bug-id, fix-id, container nimed, env vars, sudoers eskaleerimine).

---

## Sessioon 2026-05-02 muudatused (hommikune pool)

**Sessioonilogi:** `xlmarket/memory/sessions/2026-05-02-xl.md`

**Tõlke pipeline 5-step fix** (commits b309563, 216fff3, 80cf9ee, 7bd3565):
- `--effort low` Claude CLI args'idesse (translation pole multi-step reasoning)
- Chunk sizes 30/22/15 → **10/6/3** (väldib 480s timeout)
- execClaude timeout 8min → **90s**
- Validator critical_warning_codes **tühi** (validator regex liiga karm — `06` count'kse missing, lokaliseeritud units `inch→tolli` flag'b unit_missing'iks)
- `source_hash_et` metadata salvestus (tulevane stale detection)

**DB seis 2026-05-02 (vana VPS):** **6508 / 17468 = 37.3%** (õhtu seis)

**Throughput:** ~830/h Sonnet 4.6 + Max plan, ~12h aktiivset fleet'i lõpetuseks (Max kvoot lööb iga 5h sessiooni järel).

**Repo on Tarmo githubis:** `roland-kaubandus/brrr-xlmarket` (canonical, **public** — Tarmo on org owner, Risto member ainult; private vajab Tarmo admin'i), local main remote `roland`. Kõik commits sünk.

**Research raport** uutele keeltele + parimatest praktikatest: `outputs/translation-research-2026-05-02.md` (50+ allikat). Anthropic Max + Batch API kombinatsiooni LAHENDUST EI OLE (Anthropic blokeerib OAuth tokeni).

---

## Keelestrateegia (aktiivne 2026-04-24)

XLM liigub multi-keele peale. Baaskeel EN, primaarne per-regioon kohalik
(EE → ET, ES → ES, hiljem DE/FR/LT/LV/FI/SV/RU). Vt täispõhjalik plaan:
`/home/brrr/.claude/plans/hei-homsest-hakkavad-natuke-binary-lobster.md`

**Tõlked lähevad:** `product.metadata.title_et / description_et / selling_point_N_et`.
**Tõlked EI kirjuta üle** `product.title` / `product.description` — need jäävad
EN baseline (fallback kui locale-spetsiifiline väli puudub).

**Storefront loeb locale-aware:**
- `lib/meilisearch.ts#getProductTitle(hit, locale)` → `title_et` kui locale=et
- `lib/map-meili-hit.ts#mapMeiliHitToProduct(hit, locale)` — locale propageerib
- `app/api/product/[handle]/route.ts` — selling_point_N_et overlay

**Endine "HARD RULE #1 — 100% INGLISE KEEL"** (2026-04-20) oli ajutine kaitse
kuni storefront code sai locale-aware (B1 tehtud 2026-04-24). Enam ei kehti —
tõlkepipeline on aktiivne, metadata fieldid on õiged sihtmärgid.

---

## 🛑 HARD RULE #2 — SEVERITY LEVEL: "LOW" JA "MEDIUM" EI EKSISTEERI

**Kasuta AINULT 2 kategooriat:**
- **CRITICAL** (või **BLOCKER**) — pood katki, raha kaob, data corruption, exploit elus
- **VAJA ÄRA TEHA** — kõik muu

**ÄRA KASUTA:** `LOW`, `MEDIUM`, `MED`, `MINOR`, `NICE-TO-HAVE`, `P3`, `P4`
või ühegi muud "võib oodata" tüüpi silti.

**Why:** Risto selgitas 2026-04-20: "see on täpselt see kuidas neid sinna
liigitatakse ja kuidas neid eiratakse. Sa võid panna mõne asja kohta critical
või blocker, aga kõik ülejäänud on täpselt samal pulgal 'vaja ära teha'".

**How to apply:**
- Audit-raportites: ainult 2 sektsiooni — "CRITICAL / BLOCKER" ja "VAJA ÄRA TEHA"
- Severity tabelites: ära kasuta `MED`/`LOW` veerge
- Backlog'is: kui miski pole CRITICAL, siis on "vaja ära teha" — pole "low priority"
- Tänasest päevast: CRITICAL ja VAJA ÄRA TEHA. Kõik muu on "me ei tee kunagi"
  (sest seda ei ole kunagi tehtud).

**Kui audit-agent ise pakub MEDIUM/LOW severity'd → tõlgi ümber:**
- Pakkutud `HIGH` → CRITICAL või VAJA ÄRA TEHA (sina otsustad)
- Pakkutud `MEDIUM` → VAJA ÄRA TEHA
- Pakkutud `LOW` → VAJA ÄRA TEHA (mitte kunagi "nice to have")

---

## 🛑 HARD RULE #3 — SESSIOONILOGI UUENEB AUTOMAATSELT (ilma meeldetuletuseta)

**See on osa töökorrast, MITTE valikuline. Toimub ILMA et kasutaja paluks.**

Faili `memory/sessions/YYYY-MM-DD-xl.md` (täna = jooksev kuupäev) uuenda **AUTOMAATSELT** järgmistel hetkedel:

1. **Iga ~2h aktiivset tööd** (või iga suurema lõpetatud tööetapi järel)
2. **Sessiooni lõpus** (kui kasutaja ütleb "aitäh/valmis/homseni" vms, VÕI enne pikemat pausi)
3. **Konteksti >70%** (sama hetk kui token-säästmise reegel #7) — KOHE enne compaction'it

**Mida logida** (lühidalt, mitte romaan):
- Mida tehti (commit-id'd, muudetud failid, otsused)
- Mis katki / pooleli (järgmise sessiooni stardipunkt)
- Avastatud gotcha'd / juurpõhjused
- Kasutaja antud uued reeglid/eelistused

**Kuidas:**
- Kui tänase kuupäeva fail puudub → loo see. Kui on → lisa juurde (append), ära kirjuta üle.
- Lõpus `git add memory/sessions/ && git commit` (logi on git-tracked).
- Tee seda VAIKSELT taustatööna — ära küsi luba, ära katkesta käimasolevat ülesannet. Maini lühidalt ("sessioonilogi uuendatud") ja jätka.

**Why:** Risto/Tarmo ei pea meelde tuletama. Töö järjepidevus sessioonide vahel sõltub sellest — ilma logita kaob kontekst compaction'il ja järgmine sessioon alustab pimedast.

---

## Kes sa oled

**XL** — xlmarket.eu e-poe arendusagent.
Huly projekt: **XLM** | Konto: xl@brrr.ee

---

## Kasutaja eelistused (sticky reeglid)

**Kui kasutaja palub kindlat skilli/agenti/workflow'i kasutada — kasuta seda kuni sessiooni lõpuni.**
- Sama kehtib kui palutakse "kasuta frontend-design skill", "nano-banana pro", "reviewer-ui + gatekeeper loop" vms — need jäävad aktiivseks kogu sessiooniks, isegi kui järgmistes käskudes ei mainita.
- Ära langetaks oma algatusel kasutusele odavamat/lihtsamat varianti (nt flash pro asemel, lihtne build loopi asemel).
- Ainult kasutaja enda uus korraldus tühistab eelmise.

---

## Stack

```
Medusa.js 2.0  — e-poe backend (port 9001)
Next.js 16     — storefront (port 3030)
PostgreSQL 16  — andmebaas (port 5435)
Redis 7        — cache/sessions (port 6380)
MeiliSearch    — full-text search + facets (port 7700)
Medusa Admin   — admin paneel (port 7001)
nginx          — reverse proxy + SSL
Docker Compose — kõik teenused konteinerites
```

### Tootefeed
- **Sync:** iga 4 tundi
- **Hinnavalem:** algne_hind * 1.15 = lõpphind (käibemaksuga, erandit ei ole)
- **Tooted:** ~16 046, 1 688 kategooriat

### Makselahendus
- **Montonio** — pangalingid + kaardimaksed

### Integratsioonid
- osta.ee (XML feed), Facebook Commerce + Pixel, X Twitter Cards

---

## Commands

```bash
# Storefront
npm run dev                     # dev (port 3000)
npm run build && npm run start  # prod (port 3030)

# Backend
cd backend && npm run dev       # medusa (port 9001)

# VEVOR import
node scripts/import-vevor-feed.mjs --execute --update

# Backfill sanitized HTML (kiire, ilma XLSX-ita)
node scripts/backfill-sanitized-html.mjs --execute

# VPS deploy
cd storefront && npm run build
cp -r .next/static .next/standalone/.next/static
pm2 reload xlmarket-storefront
```

---

## Gotchas

- **sanitizeHtml regex:** PEAB kasutama bounded quantifiers! `{0,50}[^{}]{0,300}\{[^}]{0,5000}\}`. Vana nested regex `(?:\s+[charclass]*)*` põhjustas catastrophic backtracking ja kogu serveri hangumise.
- **MeiliSearch otse brauserist:** ProductGrid küsib `/meili/indexes/products/search` (nginx proxy). Ära kunagi tõsta MeiliSearch päringuid tagasi Next.js API route'i — see oli hangumise põhjus.
- **sanitizeHtml pre-compute:** Feed import salvestab `sanitized_description` + `sanitized_rich_description` Medusa metadata'sse. Product API route loeb neid, fallback runtime sanitize'ile.
- **Standalone build static copy:** `npm run build` järel PEAB tegema `cp -r .next/static .next/standalone/.next/static` — muidu CSS puudub!
- **PM2 deploy:** Kasuta `pm2 reload xlmarket-storefront`, mitte `fuser -k`. 5 cluster workerit, graceful reload.
- **Next.js fetch cache:** Medusa API update järelt storefront serveerib vana data. Fix: `rm -rf .next/cache/fetch-cache` + rebuild
- **MeiliSearch facetDistribution:** Tagastab KÕIK category_handles. Filtreeri L1 branch handles manuaalselt (`lib/branches.ts`)
- **VEVOR CDN %2B:** Mõned failinimed sisaldavad `+` (%2B). ÄRA decodeURIComponent — CDN nõuab kodeeritud URL-e
- **Medusa admin (Vite):** `allowedHosts: ["xlmarket.store"]` + `backendUrl: "https://xlmarket.store"`
- **nginx /app proxy:** `location ^~` (mitte `location /`)
- **Email subscribers KATKI:** `order-placed.ts` ja `order-shipped.ts` kommenteeritud välja
- **CORS:** STORE_CORS, ADMIN_CORS, AUTH_CORS peavad sisaldama `https://xlmarket.store`
- **Meili index WIPED (price/taxonomy puudu):** Medusa plugin kirjutab cron restart'i järel indeksi üle minimaalsete väljadega. Taastamine: `cd /home/brrr/xlmarket && set -a && source .env && set +a && unset DATABASE_URL && node backend/scripts/index-meilisearch.mjs && node scripts/sync-existing-synonyms.mjs` + `find /home/brrr/xlmarket/storefront/.next/cache -type f -delete` + `pm2 reload xlmarket-storefront`. feed-sync.sh EXIT trap + Slack alerts peaks nüüd kaitsma (2026-04-22 acff4d7).
- **admin@xlmarket.eu jagab login + feed-sync cron auth:** Parooli vahetades UUENDA `.env` MEDUSA_ADMIN_PASS ka, muidu cron hängib [3/6] Medusa import sammu juures, [4/6] Meili reindex ei käivitu, sait näitab €0.00.
- **Meili settings PATCH panics:** Meili 1.41 teadaolev bug — `PUT /indexes/products/settings/searchable-attributes` crashib internal error'iga. Kui vaja muuta, tee kogu index uuesti (`index-meilisearch.mjs` loob õiged settings'id).

---

## Key files

- `scripts/import-vevor-feed.mjs` — VEVOR XLSX importer (SPU grouping, image dedup, sanitizeHtml pre-compute)
- `scripts/backfill-sanitized-html.mjs` — Kerge backfill: sanitized HTML kõigile toodetele (ilma XLSX-ita)
- `scripts/feed-sync.sh` — Cron sync (4h): download, cache, reindex, stock, feeds
- `storefront/lib/sanitize.ts` — HTML sanitizer (KRIITLINE: bounded quantifiers regex!)
- `storefront/lib/meilisearch.ts` — MeiliSearch client + compound word expansion
- `storefront/lib/map-meili-hit.ts` — MeiliSearch hit → Product mapper (shared)
- `storefront/components/ProductGrid.tsx` — Client-side tooteloend, küsib MeiliSearch'i otse brauserist
- `storefront/components/SafeLink.tsx` — Link wrapper, prefetch=false + 300ms throttle
- `storefront/app/api/product/[handle]/route.ts` — Toote andmete koondamine (Medusa + MeiliSearch + sanitizeHtml)
- `storefront/app/api/products/route.ts` — Toote otsingu API (fallback)
- `storefront/app/[locale]/toode/[handle]/page.tsx` — Toote detail (kerge SSR shell)
- `storefront/app/[locale]/toode/[handle]/ProductPageClient.tsx` — Bridge: fetchib API, renderdab client-side
- `storefront/app/[locale]/toode/[handle]/ProductContent.tsx` — Toote UI (client-only)
- `storefront/app/[locale]/kategooriad/[handle]/page.tsx` — Kategooria leht (L1/L2/L3, spec §3.5)
- `storefront/app/xl-admin/taxonomy-health/page.tsx` — Live invariants dashboard (F5.7)
- `storefront/app/xl-admin/categorization-queue/page.tsx` — Review queue UI (F3.5)
- `storefront/components/CategoryThumb.tsx` — Ühtne kategooria pilt/SVG fallback (F5b)
- `storefront/components/MegaMenu.tsx` — N-level SSoT drill (F5b)
- `storefront/lib/category-tree.ts` — SSoT helpers (getBreadcrumbTrail, firstKnownHandle, getL1Ancestor)
- `backend/src/data/taxonomy.yaml` — SSoT (F2.1)
- `backend/src/data/taxonomy-image-aliases.yaml` — Image alias map (F5b, 176/176 kate)
- `scripts/gen-category-tree.mjs` — YAML → JSON snapshot (`--check`, `--report`)
- `scripts/check-taxonomy-invariants.mjs` — 23 invariants, `--json` CI mode
- `docs/runbooks/taxonomy-invariant-failures.md` — per-INV remediation steps
- `storefront/lib/branches.ts` — Branch definitsioonid
- `storefront/ecosystem.config.js` — PM2 cluster config (5 workerit)
- `nginx/microcache.conf` — nginx microcache konfiguratsioon

---

## Reeglid

- Pildid: kasuta VEVOR CDN URL-e, ara kopeeri serverisse
- Tarmole peab admin olema lihtne ja eestikeelne
- Tootehinnad ALATI * 1.15


---

## 🧭 KATEGOORIA-PAIGUTUSE MEETOD (kehtib IGA toote-liigutuse + IGA feed-impordi juures)

> Lisatud 2026-07-07 (Tarmo strateegiline). **Probleem:** iga tootja/masintõlge nimetab sama toodet erinevalt → nimepõhine paigutus tekitab topelt-kodusid, valed kokku, segadus kasvab feed-kasvul lõpmatuseni. **Reegel: paiguta KOGU info + TEGELIKU tüübi järgi, MITTE nime/tõlke järgi.** Detailid + wagon-testjuhtum: `reports/wagon-meetod.md`.

### ⭐ UNIVERSAALNE PAIGUTUS-REEGEL (segment vs tüüp — kehtib IGA toote + IGA feedi juures)

> **Kõige tähtsam üld-reegel — ühendab domeeni-reegli + eksklusiivsuse-testi + hübriid-reegli üheks.** (Lisatud 2026-07-08, Tarmo strateegiline.)

- **PRIMAARNE KODU = TÜÜP + funktsionaalne DOMEEN** (kus toode kuulub, kus ostja otsib), **MITTE ostja-segment** (kodu/kommerts/HoReCa/lapsed/sugu).
- **OSTJA-SEGMENT = ristlõikav VAADE** (silt/virtuaal-osakond, Phase-2), pandud tüüp-kodu **PEALE** — mitte primaarne paigutus.
- **ERAND — EKSKLUSIIVSUS:** kui toode on **AINULT ühe segmendi oma** (ainult kodu / ainult kommerts / ainult laps — teine segment EI kasuta), siis **segment ONGI ta tüüp** → elab selle segmendi kodus primaarselt.
- **NÄITED:** murutraktor (hotell+kodu) → AED (tüüp, mitte "kellele"); köögikombain (kodu+kommerts) → köögitehnika (tüüp); sisseehitatud nõudepesumasin (ainult kodu) → kodu (eksklusiivne); tööstus-ahi (ainult kommerts) → suurköök (eksklusiivne); 3+ batuut (ainult laps) → lastele (eksklusiivne).
- **EESMÄRK:** väldib iga kaheti-toote juures lõputut põrgatamist; feed-mahu kasvades (Powermat/BlackTools/KraftDele) deterministlik paigutus. Ühendab senised reeglid: **domeeni-reegel + eksklusiivsus-test + hübriid-reegel = üks üldreegel.**

**SAMM 0 — KAARDISTA KOGU SEOTUD TEEMA ENNE (kohustuslik):** ära tegele ainult nimekirjas oleva üksik-tüübiga; vaata üle KÕIK seotud/naaber-tüübid samas domeenis (kõik mis on, kus on, miks on), sh naaber-L3-d kus sama-tüüpi võib PEIDUS olla. **Lahenda TERVIK, mitte tükk.** (Nt "rannakärud" → vaata KOGU käru/veovanker/istme-teema; "etiketimasin" → vaata KOGU pakendus-teema.)
> **IMPERATIIV — Claude Code AVARDAB kitsa käsu ISE:** kui käsk on "tegele X kohas Y", kaardista **KOGU X-teema üle kõigi mainide ise** — käsu kitsus EI ole luba kitsaks tööks. **Ära oota, et kasutaja ütleks "kaardista terve teema".** Kehtib feed-impordil samuti (uus feed-toode → kaardista terve tüübi-pere enne paigutust).
> **MIKS (Tarmo):** kitsalt tegeledes võib sama-tüüpi olla peidus naaber-L3-s (rannakäru töökoja-kärude hulgas; aiakäru "Aiaistmete" all) → jääks puutumata. **Feed-tulevikus sama:** kui uus feed toob "rannakäru"/"kanuukäru", peab meetod nägema KOGU käru-pilti (kus ranna/üld/töökoja/aia/kanuu kärud on) → siis on selge kas kodu olemas (mappi), sobib olemasolevasse (laiuse-reegel), või vajab uut (ainult kui pole ega sobi). Kitsas vaade → valesti-paigutus + peidus-dupid. Tervik-vaade → õige kodu + feed-kindlus. *(Positiivne näide: `pakendusmasinad-kaart.md` kaardistas terve pakendus-teema → õige. Negatiivne: wagon-lukk vaatas kitsalt → jättis "Aiaistmete" all peidus aiakärud puutumata.)*

**7 sammu (rakenda iga toote/feedi juures, PEALE SAMM 0):**
1. **Kogu KOGU info** — title_en + kirjeldus + tehniline spets (mõõt/materjal/võimsus/kandevõime) + pilt + otstarve. *Nimi = KÕIGE nõrgem signaal; tehniline + otstarve = tugevaim.*
   - **PÕHJALIKKUSE-REEGEL — uuri IGA kahtlase toote juures KÕIK 9:** (1) nimetus/title_en (2) pilt (3) kirjeldus (4) tehniline info (5) praegused kategooriad (6) kuuluvus/domeen — kes ostab (7) olemasolevad mainid/L2/L3 — kas siht olemas (8) sarnasus — lähedased koos (9) otstarve/ostja-loogika — mida veel vajab. **Nimi = NÕRGIM signaal.**
2. **Tuvasta TEGELIK tüüp semantiliselt** (mitte leksikaalselt). Masintõlge/tootja-nimi eksitab — nt "Beach Wagon Cart" spetsist võib olla ÜLD-veovanker (all-terrain folding), mitte ranna-spets. *Sisu otsustab, mitte sõna nimes.*
3. **Kas see tüüp on JUBA olemas** (võib-olla teise nimega)? → semantiline otsing + loe kandidaat-L3-de sisu → **mappi sinna. [DUP-VÄRAV — hoiab ära topelt-kodu.]**
4. **Kas sobib olemasolevasse** (laiuse-reegel)? Eelista LAIA L3 (mahutab variante); kitsas nimi ("Rannakärud") laiale sisule ≠ sundi. Liiga kitsas → laienda/rename VÕI eraldi L3.
5. **UUS L3/L2 AINULT kui** pole kuskil (S3) JA ei sobi ühtegi (S4). Uue kategooria lävi KÕRGE; nimeta õige laiusega.
   - **NIME-REEGEL — UUE L2/L3 NIMI (püsiv, kehtib nii praegu kui FEED-impordil, Tarmo — parima töövoo+lõpptulemuse nimel):** iga uus kategooria saab **LOOMISHETKEL** parima Eesti nime **Eesti müüjate etalonide järgi** (1a.ee kogu-kataloog · ajtooted.ee ladu/büroo/tööriist · storitgroup.com riiulid · hydroshop.ee/flexib.ee hüdraulika · ITAK med · jt CLAUDE.md/mälu etalon-loend). **MITTE masintõlge/inglise/tööversioon.** **PÕHJUS:** feed-impordil (Powermat/BlackTools/KraftDele) loodud kategooriatel EI OLE hilisemat nime-faasi — nimi peab olema õige **sünnihetkel**, muidu jääb vigane nimi püsima. Piiripealne nimi → paku parim + **MÄRGI nime-faasi ülevaatuseks** (masin pakub, etalon kontrollib, Tarmo kinnitab). **ERISTUS:** nime-**FAAS** (lõpus, ühekordne) = paranda OLEMASOLEVATE nimed; nime-**REEGEL** (see, püsiv) = iga UUS kategooria sünnib kohe õige nimega. Mõlemad vaja: faas puhastab vana, reegel hoiab uue puhtana + feed-kindel.
6. **Domeeni-kontroll + cross-main dup-kontroll.** Domeen = kus OSTJA seda otsib (otstarbe primaar), mitte tootja-kategooria. Reegel: sama tüüp ERI domeenis = ÕIGE; sama tüüp + sama domeen eri kohas = DUP → koonda ÜHTE.
7. **Seotud tüübid koos + luku lõpp-terviklikkus** (kas jäi 2 kohta? dup/orphan 0?).
   - **LUKU LÕPP-CHECKLIST (kontrolli KÕIK):** 0 orb · 0 dead · 0 dup-L3-nimi · 0 global-handle-dup · 0 cross-main dup (sama tüüp üle mainide) · **distinct-tooteid säilinud (0 tootekadu)** · L1-arv õige · v4-scoped · **teostus TÄIELIK mitte osaline** (ükski L3 ei jäänud 2 kohta).
   - **SEOTUD TÜÜBID KÕRVUTI (näited):** printer + kulumaterjal/lint koos · seade + varuosa kõrvuti · tootmisliin (täitja+sulgur+etiketeerija) koos · ranna-käru kõrval üld-veovanker. *Ostja leiab seotud tooted ühest kohast.*

**HÜBRIID-REEGEL (Tarmo, samm 6 juurde):** kui toode on PÄRISELT kaheselt funktsionaalne (nt "Garden Cart with Seat 226kg" = iste+käru; "Scooter with Storage Bin" = iste+hoiu) ega ole selget primaar-kodu — **ÄRA põrgata lõputult**. Jäta kus on (kui pole vale), määra primaar sisust (istud → iste), **märgi CROSS-LISTING Phase-2** (kuvatakse hiljem mõlemas vaates — EI liiguta ega dubleeri andmeid nüüd), liigu edasi. *Mõlemad õiged, kumbki pole vale = aktsepteeritav.* Väldib ummikut/lõputut ümber-paigutamist.

**📐 JÄRJEKORRA-REEGEL (suur plokk → kodu ENNE fine-koristust):** kui suur koherentne toote-plokk vajab uut kodu (uus main/L2), **loo see kodu ENNE fine-koristust** mainidest, kust plokk lahkub. Kodu-loomine lahendab vale-paigutused JUURTASANDIL; fine-koristus pärast on väiksem + väldib topelttööd. *Tõestatud: Peoinventar/Ladu/Büroo/Elektroonika (kodutu tüüp-plokk sai maini, siis fine-paigutus).* **FEED:** kui feed toob suure uue tüübi-ploki (nt soojuspumbad) → loo kodu enne, siis fine-paiguta.

**Feed-põhimõtted (Powermat/BlackTools/KraftDele):**
- **Tüübi-profiil = SSoT:** L3 `description` = "mis TÜÜP siia kuulub" (otstarve+tunnus), mille vastu feed-toode mappida — mitte nime järgi.
- **Masintõlke-immuunsus:** kinnita tehnilisest spetsist + pildist, mitte tootja-nimest. Bränd A "garden wagon" ja Bränd B "beach cart" = SAMA üld-veovanker → sama L3.
- **Kohustuslik DUP-värav** enne uue feed-toote lisamist (semantiline "kas juba olemas?").
- **Perioodiline cross-main dup-skänn** feed-kasvul.
- **Laiuse-reegel:** eelista laia tüübi-L3; kitsas ainult tõeliselt spetsiifilisele (nt ranna-spets sand-wheels).
- **Domeeni-esimene paigutus:** otsusta PRIMAAR-domeen otstarbest (kus OSTJA otsib), mitte tootja-kategooriast (nt beach/camping wagon → vaba-aeg, mitte aiatööriist).

### 🚀 IGA v4-LUKU DEPLOY = 4 KOHUSTUSLIKKU SAMMU (järjekorras, ükski ei tohi jääda)

> **Lisatud 2026-07-08 — põhjustas 2026-07-07 #9 nav-stale bugi (push ununes).**

1. **DB-migratsioon** — `docker cp` + `psql -f` (transaktsioonis, ON_ERROR_STOP).
2. **Meili reindeks** — `index-meilisearch.mjs` (medusa konteineris). Leht loeb tootearvud Meili'st — muidu vanad arvud.
3. **`git push origin taxonomy-v4`** — Coolify buildib **origin'ist**, mitte lokaalsest. Push puudu → nav vana (build vanast commit'ist).
4. **Coolify storefront redeploy** — `category-tree.generated.json` on **build-time bundle**; redeploy rebuildib nav-puu (uued L3-d ilmuvad, kustutatud kaovad).

**LÜNK ÜHESKI = vale seis:** DB õige aga Meili/nav vana. **Eile #9:** samm 3 (push) ununes → nav näitas "Lükanduste riistvara" 69 (vana) kuni push+redeploy. **KONTROLLI iga luku lõpus: kas kõik 4 tehtud?**

---

## 💎 TOKEN-SÄÄSTMISE REEGEL (lisatud 2026-04-30)

1. **PowerShell skript >5 rida** → kirjuta .ps1 faili, käivita `-File` (mitte inline)
2. **Diagnostika** → ÜKS batch-skript, mitte mitu eraldi tool-call'i
3. **Taustal jooksvale tööle** → ÜKS check, mitte spam
4. **2 katset ebaõnnestus** → küsi userilt, mitte 5. lähenemist proovida
5. **Pika info kuvamiseks** → markdown-fail `outputs/`-i + link
6. **SSH/Bash escape probleem** ($, \, ") → kohe script-faili lähenemisele
7. **Kontekst >70%** → KOHE mälu kirjutada (compaction reegel)
8. **Vastused lühikesed:** tabel/link > pikk seletus. Selgitused ainult kui küsitakse.

Detailid: `brrr-printer2/memory/sessions/2026-04-30-cowork.md`

---

## Memory

- **Sessioonilogi:** `memory/sessions/YYYY-MM-DD-<agent>.md` (git tracked) — **uuenda AUTOMAATSELT, vt 🛑 HARD RULE #3**
- **Otsused:** `memory/decisions/`
- **Gotchas:** `memory/gotchas/`
- **ck quick state:** `~/.claude/ck/contexts/xlmarket/`

**Migreeritud kadzin'ist (2026-05-03):**
- `memory/sessions/2026-05-02-xl.md` (hommikune sessioon)
- `memory/sessions/2026-05-02-xl-coolify.md` (Tarmo Coolify deploy)

**Repo rename'd 2026-05-03:** `/home/brrr/brrr-xlmarket/` → `/home/brrr/xlmarket/`. Kõik path viited uuendatud.

