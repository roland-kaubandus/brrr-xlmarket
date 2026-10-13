# Kataloogi kvaliteedi audit — XL staging (k33g, taxonomy-v4), 2026-10-13

> Tarmo palve: read-only audit 9 teema kohta — seis + tõend + mis puudu + suurus + launch-blokeerija.
> **AINULT LUGEMINE** — DB-sse ei kirjutatud, ei deploy'tud, stack-lukku ei võetud (read-only).
> Baastõde: **18970 elavat toodet** (18968 published, 2 draft). Kõik kontrollid k33g-staging'u vastu (uo28 PROD puutumata).
> **Oluline:** `https://xlmarket.ee` tagastab praegu "Tuleme varsti" (uo28 külmutatud) — päris staging-pood = konteiner `storefront-k33g...` (staging.xlmarket.ee); live-kontrollid tehti selle vastu.

## Severity (HARD RULE #2 — ainult 2 kategooriat)

### 🔴 CRITICAL / BLOCKER (cutover) — 2 teemat, mõlemad SEO-terviklikkus

| # | Teema | Probleem | Suurus (fix) |
|---|---|---|---|
| **9** | **301-d ETAPP 1-3 jaoks puuduvad** | `slug_redirect` uusim kirje **2026-07-19** — MITTE ühtegi okt-2026 (ETAPP 1-3) kategooria-rename/merge/delete kirjet. Build-time `slug-redirects.generated.json` **mtime 2026-09-16** (ETAPP-eelne), 556 kirjet vs DB 589 → lahkneb + regen pole jooksnud. Middleware loeb JSON-ist. → Google-indekseeritud/välislingitud **vanad kategooria-URL-id annavad cutover'il 404** = SEO/raha kadu. (Toote-handle'id EI muutu liigutusel → toote-URL-id ei 404-i, leevendab ulatust.) | väike-keskmine |
| **4a** | **sitemap.xml = 0 toodet / 0 kategooriat** | `sitemap.ts` loodud õigesti (dünaamiline, ~19k toodet + 1688 kat + 2 locale), AGA `export const dynamic="force-static"` → genereeriti **build-ajal, kus medusa polnud kättesaadav** → live tagastab ainult 30 URL-i (staatilised). Runtime'is medusa TÖÖTAB (18968 toodet). → Google ei leia ühtegi toodet/kategooriat. | väike (build-config / ISR) |

### 🟡 VAJA ÄRA TEHA — kõik ülejäänud lahtised punktid

| # | Teema | Seis | Tõend | Mis puudu | Suurus |
|---|---|---|---|---|---|
| 1 | Tekstid | ~valmis | title_et+desc_et **18928/18970 (99.78%)**, 42 puudu (40 published → EN fallback); dup-pealkirjad **126** (oli 670, 60 gruppi); sisu genereeritud (`cg-v1`), mitte toortõlge | 40 published ET-tekstita; 126 dup; SEO pole eraldi väli | väike-kesk |
| 1b | SEO-meta + pikkused | pooleli | SEO genereeritakse **runtime'is** (`toode/[handle]/page.tsx:17-62`): title=title_et+" — XLMARKET", desc=strip(desc_et)[0:160]. Katvus=title_et katvus. Pikkused: title_et avg 59 (min42/max88), **~8600 >60 tähemärki** (Google lõikab); desc avg 149 | pole salvestatud SEO-välja ega pikkuse-valideerimis-väravat | keskmine |
| 3 | Õigekiri | kontroll alustamata, **kvaliteet kõrge** | spell-tööriista EI OLE (grep tühi). LLM-valim 50/50: **~1/50 selge grammatikaveaga**, prof. eesti keel. Leiud: käändeviga üksikjuht; EN-ühikud jäetud ("87×20 in", "22 000 lbs"); **brändi-leke 2/50** ("VEVOR …" kirjelduse alguses) | automaat-speller puudub; brändi-leke kirjeldustes (title-strip ei kata); ühiku-lokaliseerimine | väike (kvaliteet) / kesk (tööriist) |
| 5 | Spec'id | valmis | `metadata.specs` **18784/18970 (99.02%)**, 186 puudu (184 published). Struktuur `{"d":"10 kg","v":10}` (kuva+sorteeritav), ET-võtmed, 5-7 võtit/toode | 186 spec-jääk | väike |
| 5b | Võrdlus (UI) | **valmis + täis-juhtmestatud** | `CompareContext` (max 4, localStorage) → `CompareBar` → `/[locale]/vordlus` → värsked specid API-st → `SpecComparisonTable`. Toote-lehel `ProductCompareActions`, layout'is provider+bar. Locale-aware | — (hard-cap 4) | — |
| 2 | Keeled | ET valmis, EN osaline, RU alustamata | Locale'id **ainult et+en** (`i18n.ts`), RU-d EI OLE. UI ET+EN täielik (`messages/et.json`+`en.json`). **EN kategooria-nimed = eesti keeles** (name_en==name_et 1971/1973). RU tooted=0 | 42 toote ET; EN kat-nimede päris-tõlge; kogu RU kiht (locale+UI+tooted) | EN-nimed kesk; RU suur |
| 6 | Ristkuvamine (Phase-2) | disain proosas, **andmed alustamata** | Disain = CLAUDE.md UNIVERSAALNE PAIGUTUS + HÜBRIID-REEGEL (segment=ristlõikav vaade tüüp-kodu peal). **0 toodet** cross-listing metadata'ga (`cross_listing`/`secondary_categories`/`segment` võtmeid pole). Eraldi disaini-dokki pole | kogu andme-mudel + segment-vaate UI + mapping | suur |
| 7 | Seotud tooted | **tehtud** | `RelatedProducts.tsx` → `/api/related-products` → Meili sama-kategooria. Live: similar=6, best=6. Renderdub `ProductContent.tsx:349` | `best[]` fetchitakse aga ei kuvata; pealkiri "Similar Products" **hardcode inglise** (ET-lehel inglise) | väike |
| 8 | Pildid | **tehtud, bug ei reprodutseeru** | Hover-vahetus tootekaartidel (`VevorProductCard.tsx:94-167`, crossfade). "Esimene pilt kaob" EI reprodutseeru: `route.ts:245-263` prepend'ib thumbnaili images[0], galerii init active=0 → esimene kuvatakse | — | — |
| 4b | Tehniline SEO (ülejäänu) | **valmis** | JSON-LD Product (price 940.40, EUR, InStock/OOS SSoT, sku/gtin/brand) + Organization/WebSite/BreadcrumbList; robots staging=Disallow:/ (õige); hreflang et/en (x-default puudu); canonical; OG+Twitter card; microcache 5s | hreflang **x-default** puudu (väike); kategooria SEO-tekst meta/JSON-LD-s AGA **ei renderdu nähtavalt** on-page (kesk) | väike-kesk |

## Lahtiste teemade kokkuvõte (suurus + blokeerija)

| Teema | Suurus | Launch-blokeerija |
|---|---|---|
| 9 — 301 ETAPP 1-3 + JSON regen | väike-keskmine | **JAH (cutover)** |
| 4a — sitemap 0 toodet (force-static) | väike | **JAH (cutover SEO)** |
| 1b — SEO pikkus-valideerimine (~8600 title >60) | keskmine | ei |
| 4b — kategooria SEO-tekst nähtavaks + hreflang x-default | väike-keskmine | ei |
| 7 — seotud "best"-rida + ET pealkiri | väike | ei |
| 1 — 40 ET-tekstita + 126 dup-pealkirja | väike-keskmine | ei |
| 3 — speller + brändi-leke kirjeldustes + EN-ühikud | väike-keskmine | ei |
| 5 — 186 spec-jääk | väike | ei |
| 2 — EN kategooria-nimed eesti k. | keskmine | ei |
| 2 — RU kiht (locale+UI+tooted) | suur | ei (plaanis "hiljem") |
| 6 — ristkuvamine Phase-2 (andme-mudel) | suur | ei (teadlikult Phase-2) |

## Cutover-eel checklist (ainult 2 blokeerijat)

1. **301 (teema 9):** genereeri puuduvad `slug_redirect` kirjed ETAPP 1-3 diff'ist (renamed/merged/deleted L3 handle'id) → jooksuta `scripts/export-slug-redirects.mjs` → storefront rebuild (JSON on build-bundle).
2. **sitemap (teema 4a):** kinnita, et cutover-build toimub medusa kättesaadavusega (sitemap täitub ~19k+1688 URL-iga), VÕI muuda `sitemap.ts` dünaamiliseks/ISR. Verifitseeri `curl .../sitemap.xml | wc -l` peale build'i.

Kõik muu on kõrge katvusega ja toimib — launch ei blokeeru sisu-poolelt.
