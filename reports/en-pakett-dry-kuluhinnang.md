# EN-pakett — DRY-plaan + kuluhinnang (ENNE execute'i)

> Koostatud 2026-10-13. Read-only kaardistus (Explore agent) + analüüs. **MITTE veel teostatud.**
> Kuupäev-seis: staging k33g, harud main/taxonomy-v4 sünkroonis (vt sessioonilogi Phase 6).

## TL;DR — EN on osaliselt tehtud; kategooria-NIMED EI OLE

Kliendile nähtav pood **töötab juba kakskeelselt** (`et` + `en`) koodi mõttes. AGA kontroll (2026-10-13) **kinnitas vastuolu**: kategooria-nimede `name_en` väli on olemas, kuid **sisu on EESTI KEELES** — mitte tõlgitud.

> **⚠️ PARANDUS 2026-10-13:** varasem Explore-agent raporteeris "kõik 1970 kakskeelsed" — see kontrollis välja OLEMASOLU, mitte sisu. Päris-kontroll: **1970/1970 node'i `name_en == name_et`, 100% eesti keeles** (nt `name_en="Tööriistad ja tarvikud"`). EN-leht kuvab eesti kategooria-nimesid. → **täis-tõlge vaja** (konsensus + glossary + nimevärav).

| # | Mõõde | Seis | Jääk |
|---|---|---|---|
| 1 | Kategooriate EN-nimed | 🔴 **EI OLE** | 1970 node'i — `name_en` on eesti keeles (== `name_et`). Täis-tõlge EN-i (konsensus + glossary + nimevärav). |
| 4 | EN tootetekstid | ✅ **VALMIS** | 0 — base title/desc/selling_points ONGI EN-baseline |
| 2 | Kategooriate SEO-tekstid | 🟡 osaline | kood: 1 locale-haru puudu · sisu: L2/L3 (1921 kat) SEO puudub (mõlemas keeles) |
| 5 | hreflang | 🟡 osaline | kood: ~4 lehte + sitemap xhtml:link |
| 3 | UI hardcode'd / i18n | 🟡 osaline | kood: 309 inline-ternaari 44 failis → sõnastikku (EN-tekst on JUBA olemas) |
| 6 | Uue keele (3.) arhitektuur | 🔴 raske | kood: binaarne et/en läbivalt — lai refaktor |

**Järeldus:** EN-pakett ei ole sisutöö (va L2/L3 SEO), vaid **koodi-korrastus + SEO-täiendus**. Ainus LLM-kulu on L2/L3 SEO-sisu generaator (kattub olemas sisu-generaatori projektiga).

---

## Töö jaotub KAHEKS tüübiks

### A. KOODITÖÖ — LLM-kulu ~0 (ainult teostus-aeg)

| Töö | Severity | Mahu-hinnang | Detail |
|---|---|---|---|
| **A1. Kategooria SEO locale-haru** | VAJA ÄRA TEHA | 1 rida | `kategooriad/[handle]/page.tsx:79` loeb alati `description_en` → ka ET-lehel inglise meta. `_et` on 25 L1-l olemas, ignoreeritud. Lisa locale-haru (nagu `nodeName`). |
| **A2. hreflang augud** | VAJA ÄRA TEHA | ~5 faili | Puudu: kategooria-, otsingu-, vertical-, haru-leht + `sitemap.ts` xhtml:link. Olemas: layout/home/toode. |
| **A3. UI-ternaaride konsolideerimine** | VAJA ÄRA TEHA | 44 faili, 309 kohta | Sõnastik (`messages/{et,en}.json`, 234 stringi) on JUBA olemas, aga kasutusel vaid 2 failis. 309 `locale==='et'?…:…` → `t(dict,'key')`. EN-tekst säilib (ei kao). DRY + 3. keele eeltingimus. |
| **A4. 3. keele generaliseerimine** | VAJA ÄRA TEHA | lai | Sõltub A3-st. Choke-point'id: `i18n.ts` route-segment regex `(et\|en)`, `getProductTitle`/`nodeName` binaarne, andmemudel `_en`/`_et` 2 suffiksit, `generateStaticParams` hardcode, hreflang 2-võtme objektid, `LocaleSwitcher` 2 linki, OG `en_US`. |

> A3+A4 on suurim jupp, AGA **ei blokeeri EN-i** (EN töötab juba). Need on hooldatavus + 3. keele valmidus. Saab teha järk-järgult.

### B. SISUTÖÖ — LLM-kulu (kattub sisu-generaatoriga)

| Töö | Severity | Maht | HARD RULE #5 |
|---|---|---|---|
| **B1. L2/L3 SEO-tekstid (ET+EN)** | VAJA ÄRA TEHA | 1921 kat (224 L2 + 1697 L3) × 2 keelt | Backfill (kõik 1921) + hook (uus kategooria auto-create'il saab SEO — JUBA nõutud HARD RULE #5 täielikkus-väravas + SEO-REEGLIS). |

**B1 kuluhinnang (ühekordne backfill):**
- Sisend/kat ~1500 tok (nimi + path + 2-3 näidistoodet), väljund ~400 tok (ET desc+tagline + EN desc+tagline ühes kutses).
- 1921 kat → ~2.9M sisend + ~0.77M väljund:

| Mudel | ~Kulu (backfill 1×) |
|---|---|
| Haiku 4.5 ($1/$5) | **~$7** |
| Sonnet 5 ($3/$15) | **~$20** |
| Opus 4.8 ($5/$25) | **~$33** |

- **SEO-REEGEL (CLAUDE.md, mõõdetav värav):** keelatud konkreetsed numbrid/lubadused (W, tsüklid, "veekindel") → `seoClaimGate()` regen max 3×. See töötab iga mudeliga.
- **Hook** (uus kat): juba spetsis (täielikkus-värav gate #3.5 + SEO-värav) — B1 backfill peab kasutama SAMA transformi, mida auto-create hook kutsub (üks moodul, kaks kutsujat).

---

## Soovitatav järjekord

1. **A1 + A2** (SEO-korrektsus, ~pool päeva koodi, $0) — kiire võit, parandab ET-turu SEO KOHE.
2. **B1** (L2/L3 SEO-sisu) — Sonnet soovitus (~$20, primaarturu kvaliteet; Haiku piiripealne). Backfill + hook SAMA moodul.
3. **A3** (ternaarid → sõnastik) — DRY, suurim koodijupp, ei kiirusta (EN töötab).
4. **A4** (3. keel) — alles kui 3. keel päriselt plaanis (ES/DE). A3 on eeltingimus.

## Lahtised küsimused (vajavad Tarmo otsust enne execute'i)
- **B1 mudel:** Haiku ($7) vs Sonnet ($20) vs konsensus? SEO = primaarturu sisu → kalduksin Sonneti poole.
- **A3 skoop:** kõik 309 korraga vs ainult kliendi-lehed (admin jätta)? Admin on EN-irrelevantne (sisemine).
- **Kas 3. keel (A4) on horisondil?** Kui ei → A4 edasi lükata, A3 teha "ainult DRY" ulatuses.

## Leid (kõrval)
- `storefront/lib/category-tree.ts:39-41` kommentaar on **vale/aegunud** ("ükski tarbija ei loe `*_et`") — `nodeName` (:58) loeb. Parandada kommentaar A1 käigus.

---

## TEOSTUSPLAAN (2026-10-13 õhtu, pärast infra-kaardistust)

### Arhitektuuri-otsus — SSoT = DB (option a)
**Leid:** EN-nimel ega päris-SEO-l pole püsivat kodu. `genyM.mjs` regenereerib `taxonomy.yaml` DB `product_category.name`-st igal jooksul → `name_en=name_et` (eesti) + stub-SEO (`"<nimi> — products."`). classify-etapp2-create genereerib juba name_en+SEO (`l3-gates.genAssetsGated`), AGA viskab plaani-raportisse (ei jõua ühtegi SSoT-i).

**Otsus:** DB jääb SSoT (kooskõlas olemasoleva disainiga). Kirjutus → DB; genyM õpib DB-st lugema. Mitte otse taxonomy.yaml (klobberdaks).

**Skeem (migration 011):**
- `taxonomy_node_translation` (OLEMAS, migration 001): `node_id, locale∈{et,en,es}, name` — populeeri `locale='en'` tõlgitud nimega.
- **UUS** `taxonomy_node_seo` (node_id, description_et/en, tagline_et/en, updated_at, source_batch) — SEO-l polnud DB-kodu.

**genyM muudatus:** `block()/subsDB()` loevad name_en = `taxonomy_node_translation[en]` (fallback DB-nimi), SEO = `taxonomy_node_seo` (fallback stub). → idempotentne, backfill ei hävi regen'il. (Deploy-kriitiline: genyM = SSoT→nav pipeline; test enne.)

### Kaks transformi (HARD RULE #5 — üks moodul, kaks kutsujat)

**T1 — kategooria EN-nimi (konsensus + glossary + nimevärav):**
- Sonnet + Opus tõlgivad ET→EN; nõus → aktsepteeri; lahku → Fable viigimurdja.
- Glossary-adherence (`glossary-gates`) + nimevärav (`fableNameCheck`, 3 alakontrolli).
- Kutsujad: (a) backfill `--all` (1970, Batch API); (b) hook — uue L3 sünnil classify-etapp2-create kirjutab name_en DB-sse (praegu viskab ära).

**T2 — kategooria SEO (ET+EN, Sonnet batch):**
- Taaskasuta `l3-gates`: `genAssets` prompt + `SEO_RULE` + `seoClaimGate` (keelab numbrid/lubadused, regen max 3×). Mudel = **Sonnet** (Tarmo otsus), Batch API (`content-batch`).
- Kutsujad: (a) backfill `--all` (1921 L2/L3 + 25 L1); (b) hook — uue L3 sünnil (juba jookseb etapp2-create's, lisa DB-kirjutus).

### Väravad + ohutus
- `seoClaimGate` (SEO), nimevärav (nimi), glossary-adherence, stack-lukk (DB-write), Telegram fail-loud, `--all` batch-id → undo.
- DRY vaikimisi; `--execute` kirjutab DB-sse (stack-lukk).

### Samm-haaval (DRY-valim ENNE suurt jooksu)
1. Migration 011 (SEO-tabel) — **kirjutatud, EI rakendatud enne go-ahead'i**.
2. **DRY-valim ~15 kat** (nimi+SEO, 0 DB-write) → `reports/en-pakett-dry-valim.md`, näita Tarmole kvaliteet + tegelik token-kulu.
3. Go-ahead → genyM-read + hook-kirjutus + täis-backfill (`--execute`, stack-lukk, undo).
