# Multi-feed valmidus — audit + Phase-2 tegevuskava

> **Koostatud:** 2026-08-25 (4-agendi paralleel-audit: feed-adapter · bränd-SSoT · hind · glossary-hook).
> **Strateegiline otsus (Tarmo, 2026-08-25):** Multi-feed EI ole Eesti-launchi blokeerija.
> **Eesti läheb üles VEVOR-iga (üks feed).** Alljärgnev on Phase-2 tegevuskava — PÄRAST Eesti launchi.
> **Miks see fail on:** tegevuskava ei tohi kaduda; iga punkt on file:line-tõestatud.

---

## Küsimus: uue feedi lisamine = KONFIGURATSIOON või TUUMA-MUUTUS?

**Lühivastus: EI ole veel puhas config.** Üks alamsüsteem (hind) on eeskujulikult config-valmis;
kolm vajavad tuuma-tööd. Ootus "adapter + suppliers.yaml + BRAND_NAMES" **ei kata** tänast reaalsust.

| # | Dimensioon | Verdikt | Seis |
|---|---|---|---|
| 3 | **HIND** | 🟢 CONFIG | Mootor loeb kõik per-tarnija YAML-ist (parim; tuum valmis) |
| 2 | **BRÄND** | 🟡 PEAAEGU | Loogika bränd-teadlik, aga 3 koopiat + 3 hardcode |
| 1 | **FEED-ADAPTER** | 🔴 TUUM | Config-kiht ehitatud aga EI ühendatud live-toruga |
| 4 | **GLOSSARY-HOOK** | 🔴 EHITAMATA | Uute-terminite tuvastus planeeritud, koodi pole |
| 5 | **BATCH FAIL-LOUD** | ✅ **TEHTUD** | Parandatud 2026-08-25 (vt allpool) |

---

## ✅ #5 — BATCH FAIL-LOUD (TEHTUD 2026-08-25, EI ole Phase-2)

**Oli:** batch-jooks väljus `exit 0` hoolimata 29% kukkumisest (krediit otsas) → wrapper saatis eksitava "VALMIS".
Vaikne lagunemine — kriitilisem kui multi-feed.

**Fix** (commit `6922ae48` main / `51e4dae3` v4; wrapper stale-clear `0d13de08`/`176a23bd`):
- `scripts/content-gen-run.mjs` — 3-astmeline STATUS + exit (sama `FAIL_RATIO=0.5` kui hookil):
  `errored==0`→exit 0 `OK` (✅ VALMIS) · `0<err≤50%`→exit 2 `PARTIAL` (⚠️ OSALINE + re-run) · `err>50%`→exit 1 `SYSTEMIC` (❌ + juurpõhjus-vead).
- `scripts/run-content-backfill.sh` — case rc 0/2/*, VALMIS AINULT rc=0; STATUS-rida Telegrami. + stale-state (batches.json) puhastus enne submitti (re-run no-op lõks).
- **Garantii: VALMIS ⟺ errored==0.** Tõestus: eelmise jooksu ndjson (28.8% errored) läbi uue läve → `STATUS=PARTIAL exit=2` → EI väida VALMIS.

---

## 🟡 #2 — BRÄND-SSoT (osaliselt Eesti-relevantne? → EI, kõik Phase-2)

**Kontroll (Tarmo, 2026-08-25): kas mõni 3 hardcode'ist mõjutab VEVOR-only Eesti launchi? → EI.**
Kõik annavad juhuslikult õige väljundi, sest kataloog on 100% VEVOR. Muutuvad vigadeks alles teise feediga.

**Probleem 1 — `deriveBrandSlug` EI ole üks imporditud SSoT, vaid 3 käsitsi-sünkroonitud koopiat:**
| Koopia | Fail:rida | Vorm |
|---|---|---|
| Master (eksporditud) | `scripts/lib/brand-strip.mjs:28` (+ BRAND_NAMES `:21`) | ainus imporditud (title-strip [3.5]) |
| Duplikaat | `backend/scripts/index-meilisearch.mjs:216` (+ `:214`) | lokaalne |
| Duplikaat | `storefront/components/JsonLdProduct.tsx:27` (+ `:24`) | lokaalne |

Kõik teavad 4 brändi (vevor/powermat/kraftdele/blacktools), ükski ei defaulti vevorile detektsioonis.
**Nõrkus:** uue brändi detektsiooni-reegel (uus `supplier_sku` prefiks) vajab 3 faili muutmist → vaikne triiv.

**Probleem 2 — 3 päris-hardcode (kõik VEVOR-only-ohutud, Powermatiga katki):**
| Fail:rida | Viga | VEVOR-only | Powermat |
|---|---|---|---|
| `storefront/lib/filter-groups.ts:79` | facet `value.toUpperCase()` | ✓ "VEVOR" õige (bränd ongi suurtäht) | ✗ "POWERMAT" (peaks "Powermat") |
| `storefront/components/JsonLdProduct.tsx:37` | tundmatu-fallback `"VEVOR"` | ✓ kõik on vevor | ✗ Powermat võib saada schema `brand=VEVOR` |
| `scripts/reprice-existing.mjs:32` | `supplierId:"vevor"` kõval koodil | ✓ kõik on vevor + ühekordne skript | ✗ VEVOR-marginaal võõrale tarnijale |

**Phase-2 fix:** (a) konsolideeri 3 `deriveBrandSlug` koopiat ÜHTE jagatud moodulisse (kõik impordivad);
(b) paranda 3 hardcode → `BRAND_NAMES`-põhine + parametriseeri `supplierId`. **Effort: keskmine.**

---

## 🔴 #1 — FEED-ADAPTER (kõige rohkem tuuma-tööd) — Phase-2

**Config-kiht on pooleldi ehitatud aga EI ole live-toruga ühendatud.**

Reaalne öine import = `backend/scripts/import-new-drafts.mjs`:
- `:39` `CACHE_PATH=/data/vevor-feed-cache.json` (kõva); `:78-82` kirjutab `vevor_*` metadata-nimeruumi.
- `scripts/import-pipeline.sh` [1] cache-refresh (`backend/scripts/refresh-feed-cache.sh:24-26`) = üks kõva URL/xlsx.

**🔑 Ühine liitmisvõti `metadata->>'vevor_sku'` läbib KOGU toru** — teine feed (`PM-…` alla `supplier_sku`/`source`) oleks nähtamatu:
| Samm | Fail:rida | VEVOR-võti |
|---|---|---|
| [3] import-new | `import-new-drafts.mjs:39,78-82` | cache-path + `vevor_*` metadata |
| [3.5] title-strip | `pipeline-strip-titles.mjs:87-88` | transform agnostic, valik vevor-keyed |
| [4] classify | `pipeline-classify.mjs:96,107-110` | `vevor_sku IN (...)` |
| [5] price | `pipeline-reprice.mjs:24,43,50` | `supplierId:"vevor"` + xlsx-path + sku |
| [6] spec | `spec-extract-skus.mjs:75` | `vevor_sku IN (...)` |
| [6.5] content-gen | `pipeline-content-gen.mjs:85-91` | join `s.sku = vevor_sku` |
| [7] reindeks | `index-meilisearch.mjs:216-223` | 🟢 **JUBA multi-feed-teadlik** (source→supplier_sku→legacy) |

**Scaffold OLEMAS aga ühendamata:** `scripts/adapters/{index,xlsx,csv,xml}.mjs` (grep: ei impordi keegi peale iseenda);
`backend/src/feeds/registry.mjs` + `adapters/powermat.mjs` (täis-XML-adapter) + `feeds.yaml` (powermat plokk).
Nende OMA README (`backend/src/feeds/README.md:14-16`): "Praegu import-vevor-feed.mjs töötab iseseisvalt — EI ole veel muudetud."

**Phase-2 fix:** ühenda live-pipeline scaffolditud adapteritega; **vaheta ühine võti `vevor_sku` → `supplier_sku`/`source`**
([3]→[6.5]). **Effort: SUUR (suurim tükk).**

---

## 🔴 #4 — GLOSSARY UUTE-TERMINITE HOOK (ehitamata) — Phase-2

**Verdikt: NOT BUILT.** Planeeritud `backend/src/data/glossary.yaml:13-17` päises ("Uue termini tuvastus → propose-not-create review-bucket"), aga **koodi pole.**

- Glossary ainus runtime-mõju = prompt-injektsioon (`scripts/lib/content-gen.mjs:54-55,101-103`), ainult `locked` (176) läheb prompti.
- `scripts/glossary-adherence.mjs:51-97` mõõdab AINULT *tuntud* terminite järgimist (inversne küsimus); **ei kutsu ükski pipeline** (grep: ainult ise-viited). Ühekordne pilot-QC.
- Öine hook (`pipeline-content-gen.mjs:104-106`) ei ehita `matchList`, ei skänni. "review" = ainult generatsiooni-fail (`:132`), mitte terminid.
- **Uus feed uue terminoloogiaga → tundmatud terminid lähevad VAIKSELT läbi** (mudel tõlgib nagu oskab, 0 tagasiside).
- 9 `defer`-terminit on inertsed: miski ei aktiveeri `defer→locked` kui vastav toode saabub (käsitsi YAML-edit).
- **NB:** olemasolev "review-bucket" (`pipeline-classify.mjs`, `seed-review-bucket.mjs`, `pipeline-review-digest.mjs`) = **KATEGOORIA-klassifikatsioon**, mitte glossary. Terminoloogia-analoog kunagi ei ehitatud.

**Phase-2 fix:** content-gen'i coverage-detektor (source-tekst sisaldab terminit mis pole glossaris) → uute-terminite digest/review-bucket + `defer` auto-aktiveerimine. **Effort: keskmine.**

---

## 🟢 #3 — HIND (config-valmis, ainult glue-augud) — Phase-2 väike

**Mootor ON tõeliselt config-juhitud** (`scripts/lib/cost-engine.mjs` + `pricing-engine.mjs` + `config/suppliers.yaml`, ehitatud 2026-07-22; vana `PRICE_MARKUP=1.15` kustus).

Uus tarnija (PLN + Poola 23% KM + oma ladu + partii-veokulu) = **uus YAML-plokk, MITTE koodimuutus** — kõik 4 mõõdet parametriseeritud, Powermat-mall failis (`config/suppliers.yaml`, `active:false`). `getSupplier()` viskab "lisa suppliers.yaml-i" → onboarding = config-add by design.

**Glue-augud (Phase-2, väike):**
1. `supplierId:"vevor"` kõval koodil 3 kutse-kohas (`import-vevor-feed.mjs:65`, `pipeline-reprice.mjs:43`, `reprice-existing.mjs:32`) → parametriseeri.
2. `batchShippingPerUnit` torustatud otsast-otsani (`pricing-engine.mjs:123`, `cost-engine.mjs:94,111-113`) aga **ükski kutsuja ei anna seda** → toida ladu-tarnijale.
3. **Vana `backend/src/data/feeds.yaml` (2026-06-04) dubleerib hinnavalemi VALE rate'iga** — markup MAP-il (`feeds.yaml:9,23,42`), PLN×0.23 adapteris (`powermat.mjs:67`) vs uus mootor (markup cost_net'il, FX `fx.yaml` ÷rate). **Kaks eri valemit + kaks eri PLN-rate'i repos** → saada `feeds.yaml`/`backend/src/feeds` pensionile või numbrid lahknevad.

---

## Phase-2 tegevuskava (järjekord + sõltuvused)

| Prioriteet | Töö | Effort | Sõltuvus |
|---|---|---|---|
| ✅ TEHTUD | #5 batch fail-loud | — | — |
| P2-1 | #1 feed-toru migratsioon (võti `vevor_sku`→`supplier_sku`/`source`, ühenda adapterid) | SUUR | esimene — muud sõltuvad võtmest |
| P2-2 | #2 bränd-SSoT konsolideerimine (3 koopiat→1) + 3 hardcode | KESKMINE | iseseisev |
| P2-3 | #4 glossary uute-terminite hook | KESKMINE | iseseisev |
| P2-4 | #3 hinna-glue (supplierId param + batchShipping + feeds.yaml pension) | VÄIKE | pärast #1 (supplierId tuleb feedist) |

**Kokkuvõte:** hind tõestab, et õigesti tehtud multi-feed on siin võimalik (see alamsüsteem ONGI puhas config).
Aga feed-sisend, bränd-SSoT ja glossary-hook on **veel tuum** — "planeeritud+poolik", mitte "lisa YAML ja mine".
**Tee P2-1..P2-4 ENNE esimest teist feedi.**

---

### Audit-metaandmed
- Meetod: 4 paralleel-Explore-agenti (feed-adapter, bränd, hind, glossary), file:line-tõestus.
- Kõik viited kontrollitud repo seisu vastu 2026-08-25.
- Seotud mälu: `hinnastamise-arhitektuur-disain`, `hinnastamine-ja-ladu-otsused`, `b-disain-opus-klassifikaator-feed`.
