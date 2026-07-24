# CRON-WIRING kaardistus + import-tee disain + dry-run

> 2026-07-24 · STAGING k33g / taxonomy-v4 · **read-only kaardistus, live't ei puutunud, DB-sse ei kirjutatud.**
> Eesmärk: uus feed-toode läbib terve ahela automaatselt (import → klass → hind → spec → Meili), ilma käsitsi tööta.

> ⚠️ **KORREKTSIOON 2026-07-24 (Tarmo):** HIND **ON** SSoT-erand — ostuhind muutub → **jaehind muutub kaasa** (computeRetail). Import/sync uuendab ka **olemasolevate** toodete hinnad. Ainus erand: hind TOHIB uueneda; kategooria/tõlge/specs/status **mitte**. See lisab 3 asja: (1) per-tsükkel reprice olemasolevatele, (2) Omnibus hinna-ajalugu (launch-eelne kohustus), (3) cart price-lock kontroll + marginaali-teade. **Vt lõpu-sektsioon "HIND = SSoT-ERAND".** Alljärgnev SAMM 2 "create-only" otsus on selle võrra REVIDEERITUD.

---

## SAMM 1 — KAARDISTUS

### Praegune reaalsus: kaks cron'i, kumbki EI impordi

| Cron | Kus jookseb | Sammud | Impordib uusi tooteid? |
|---|---|---|---|
| `backend/scripts/refresh-feed-cache.sh` | **Coolify (töötab)** medusa-teenuses, `0 */4 * * *` | download → build-cache → stamp feed_status → sync-inventory (churned→OOS) → Meili reindeks+delete-batch | **EI** — skoop ütleb otse: *"Toote-IMPORT EI ole siin (B-etapp)"* |
| `scripts/feed-sync.sh` | **Host bare-metal** (vana VPS), 6 sammu | download → cache → `import-vevor-feed --execute --update` → SSoT-regen → Meili → stock → väljund-feedid | JAH, aga **host'is, mitte Coolify's** + kasutab ohtlikku `--update` toorelt |

### ⛔ MIKS import ei jookse Coolify's — 3 juurpõhjust (tõestatud konteineris)

1. **Skripte POLE konteineris olemas.** Coolify buildib **ainult `backend/`** (`/app` = backend). Import-tee skriptid elavad repo **top-level `scripts/`-is**, mida build-context ei kaasa:
   - `docker exec … ls /app/scripts/import-vevor-feed.mjs` → **No such file**
   - `/app/scripts/lib/` sisaldab AINULT `feed-stock.mjs` — `pricing-engine.mjs` **puudub**
   - `spec-extract-skus.mjs`, `apply-956-categories.mjs` **puuduvad**
   - Baked ON ainult: `build-vevor-feed-cache · feed-status-stamp · sync-medusa-inventory · index-meilisearch · refresh-feed-cache.sh · lib/feed-stock`
2. **`ANTHROPIC_API_KEY` puudub konteineri env-ist** → Opus-klassifikaator ega Haiku spec-ekstraktor EI SAA konteineris joosta.
3. **`feed-sync.sh` on host-skript** (`REPO=/home/brrr/brrr-xlmarket`, `curl 127.0.0.1:7700`, PM2) — post-cutover host kaob → puruneks. Import pole kunagi container-native tehtud.

### refresh-feed-cache.sh (töötab) vs import-tee — mis erineb

| | refresh-feed-cache.sh | import-tee (vaja ehitada) |
|---|---|---|
| Skoop | ainult **olemasolevate** seis (stock/archived/reindeks) | **loob uusi** tooteid + klass + hind + spec |
| Skriptid konteineris | ✅ kõik baked | ❌ ükski baked |
| ANTHROPIC key | ei vaja | **vajab** (klass + spec) |
| Fail-loud muster | ✅ küps (RUN_START-templ, mtime>start, Meili task finishedAt>start, EXPECTED_DOCS isekohanduv) | järgib SAMA mustrit |

**Järeldus:** import-tee tuleb teha **container-native** (nagu refresh-feed-cache.sh), lisada puuduvad skriptid + config konteinerisse ja `ANTHROPIC_API_KEY` env-i. Praegune `feed-sync.sh --update` **EI kõlba** copy-paste'iks: `--update` kirjutab üle hinna, kategooriad, staatuse ja translation_status'e (vt SAMM 2).

---

## SAMM 2 — IMPORT-TEE (allowlist-muster, MITTE `--update` toorelt)

### `import-vevor-feed.mjs` väljad — täpne inventuur

**Uue-vs-olemas tuvastus:** `metadata->>'vevor_sku'` DB-lookup vs feed-rea `SKU` (mitte handle/external_id). `deleted_at IS NULL` filter.

**CREATE (uus toode) kirjutab:** title(EN) · handle · description(EN) · **status=published** (või draft kui review_bucket) · thumbnail · external_id `vevor:SKU` · metadata(vevor_*, weight_kg, selling_points, rich/sanitized_description, dimensions, gallery_images, `translation_status:pending`) · images · **variant.prices = computeRetail** (hind pannakse) · **categories = resolver-v2** (v.a `--defer-categories`).

**UPDATE (`--update`) — OHUALA, kirjutab üle iga 4h:**
| Väli | Käitumine | SSoT-oht |
|---|---|---|
| **hind** (variant POST) | `computeRetail` tingimusteta ülekirjutus | ⚠️ paneb üle pricing-engine override'i |
| **categories** | resolver-v2 **asendab** kogu sidumise (v.a kui `metadata.category_override` olemas) | ⚠️ **Opus-klassifikaatori paigutus KUSTUB järgmisel sync'il** |
| **status** | tingimusteta `published` | ⚠️ **äratab archived/draft ellu** |
| **translation_status** | reset `pending` | ⚠️ re-triggerib tõlkepipeline'i |
| metadata.title_et/description_et/selling_point_*_et | säilib (`...existingMeta` spread) | ✅ ok |
| **metadata.specs** | säilib (pole overwrite-listis) | ✅ ok, aga **allowlist puudub** → tuleviku-regressiooni risk |
| title/description/handle | ei puutu | ✅ |

### ⭐ OTSUS: cron = **create-only + `--defer-categories`**, EI `--update`

**Põhjendus:** `--update` pole allowlist-itud ja rikub 4/5 SSoT-välja (hind, kategooria, staatus, translation_status). Ehitada turvaline allowlist-`--update` on lisatöö väikese kasuga — **feed uuendab olemasolevate toodete sisu harva**, ja need vähesed asjad, mis feedist legitiimselt muutuvad, on juba KAETUD eraldi väli-skoobitud skriptidega:

| Mis feedist legitiimselt muutub | Kes seda juba teeb (turvaliselt) |
|---|---|
| laoseis (in/out of stock) | `sync-medusa-inventory.mjs` + Meili `in_stock` (refresh-cache samm 4/5) |
| feed_status / last_seen / churned→archived | `feed-status-stamp.mjs` (refresh-cache samm 3) |
| hind (kui pricing-rules muutub) | `reprice-existing.mjs` (eraldi, hind-only, teadlik jooks) |

→ **Uute toodete puhul: LOO. Olemasolevate puhul: import EI puutu midagi** (jätab olemasolevate sisu-refreshi — nimi/pildid/mõõdud — teadlikuks eraldi allowlist-backfilliks, kui üldse vaja = *vaja ära teha*, mitte cron).

**Uus toode sünnib `status=draft`** (kategooriata published = orb nav-is). Publish alles PÄRAST edukat auto-paigutust olemas-L3-sse. Review-bucketisse jäänu = jääb draft (karantiin, ei ole kataloogis). See hoiab ka Meili EXPECTED_DOCS-värava puhtana (draft ei loe).

**Vajab koodimuudatust importeris:** `--defer-categories` kaitseb ainult CREATE-teed; kui kunagi `--update` sisse tuleb, vajab category/price/status-guarde. **Praeguse create-only jaoks koodimuudatust EI vaja** — piisab `--execute --defer-categories` (ilma `--update`).

---

## SAMM 3 — AHEL (järjekord loeb)

| # | Samm | Seis | Kuidas |
|---|---|---|---|
| 1 | feed download + cache | ✅ olemas | refresh-cache samm 1-2 |
| 2 | laoseis + churned→OOS + stamp | ✅ olemas | refresh-cache samm 3-4 |
| 3 | **IMPORT uued (kategooriata, draft)** | 🔨 **ehita** | `import-vevor-feed.mjs --execute --defer-categories` (container-native) → väljasta loodud SKU-de nimekiri |
| 4 | **KLASS — Opus propose-not-create** | 🔨 **ehita** (loogika tõestatud, tööriist prototüüp) | conf≥0.85 + siht-L3 OLEMAS → paiguta + publish; uus tüüp / madal conf → review-bucket (draft). **ÄRA loo L3.** |
| 5 | **HIND — pricing-engine** | ✅ olemas (inline create's) | `computeRetail` jookseb juba import-create'is; eraldi sammu EI vaja uutele |
| 6 | **SPEC-ekstraktsioon uutele** | 🔨 **ehita glue** (tööriist olemas) | `spec-extract-skus.mjs --skus <uued>` (Haiku, `specs IS NULL` guard) |
| 7 | Meili reindeks + delete-batch | ✅ olemas | `index-meilisearch.mjs` (EXPECTED_DOCS isekohanduv värav) |

### 🔨 Mis on vaja EHITADA (ausalt)

1. **Konteinerisse toimetada** import-tee: `import-vevor-feed.mjs` + `scripts/lib/{pricing-engine,cost-engine}.mjs` + `config/{pricing-rules,suppliers,fx}.yaml` + `spec-extract-skus.mjs` + klassifikaator. (Coolify build-context laiendus VÕI eraldi image.)
2. **`ANTHROPIC_API_KEY`** konteineri env-i (Coolify secret).
3. **Opus-klassifikaator produktsiooniks:** täna on `classify-nohaiku.mjs` **scratchpad-prototüüp** (`/tmp` path'id, staatiline `fulltree.txt`, ei kirjuta DB-sse). Loogika tõestatud (956: 85.6% auto, $0.018/toode, 0 API-viga). Vaja: committed lib + DB-st värske L3-kandidaadipuu + auto-write "conf≥0.85 & L3 olemas → paiguta, muidu karantiin" (üldistatud `apply-956-categories.mjs` valid-L3 hard-abort). **Uue tüübi review-bucket (klaster-vaade, suggest_name/L2) — PUUDUB, vaja ehitada** (B-disain).
4. **Draft→publish gate** import-create's (uus = draft; publish pärast auto-paigutust).
5. **Uute-SKU-de nimekirja glue** (samm 3 → 4/6 sisend): `product.created_at >= RUN_START` või import-väljundi capture.
6. **Container-native orkestraator** `import-pipeline.sh` refresh-feed-cache.sh fail-loud mustris.

**Olemas ja valmis kasutada:** pricing-engine (inline), resolver-v2 (fallback), `spec-extract-skus.mjs` (`--skus`+`specs IS NULL`), audit-tabel + `v_review_queue` + `drain-review-queue.mjs` + `categorization-queue` UI (resolver low-conf tee), `--defer-categories`, `apply-956-categories.mjs` (valid-L3 hard-abort muster), `INV-STRUCT-01` (tühja-L3-keeld), delete-batch + EXPECTED_DOCS värav.

---

## SAMM 4 — FAIL-LOUD väravad (refresh-feed-cache.sh muster)

| Samm | Tõestus (vaikne no-op keelatud) |
|---|---|
| 1 download | xlsx ≥1MB + `PK` magic + mv õnnestus |
| 2 cache | mtime>RUN_START + SKU≥10k + drop≤20% vs eelmine |
| 3 import | loodud-arv väljastatud; kui väidab "N new" aga DB `created_at≥RUN_START` ≠ N → FAIL; SKU-nimekiri mitte-tühi kui N>0 |
| 4 klass | iga uus SKU sai kas L3-paigutuse VÕI review-bucketi (0 orb); auto-paigutatu siht-L3 OLEMAS (valid-set) — badTarget>0 → exit 1 |
| 5 hind | iga uue toote variant.price>0 (computeRetail ei tohi 0/null anda) |
| 6 spec | `spec-extract-skus` rc==0; kui uusi>0 → specs-kirjete juurdekasv >0 |
| 7 Meili | delete-batch + EXPECTED_DOCS isekohanduv värav (doc-count vs elus ±max(50,1%) + reindeks-task finishedAt>RUN_START) |

Ükski samm FAIL → `exit != 0` → Coolify "Failed". Draft-tooted ei loe EXPECTED_DOCS-i sisse → värav jääb puhtaks kuni publish.

---

## SAMM 5 — DRY-RUN (staging k33g, read-only, midagi ei kirjutatud)

**Seis praegu (feed vs DB):**

| Mõõt | Arv |
|---|---|
| Feed SKU-d | 14 819 |
| DB elus (vevor_sku, ¬deleted) | 18 061 |
| DB archived-live (feed_status=archived, published-status) | 3 242 |
| Elus kataloog (18061 − 3242) | **14 819** = feed ✓ (= EXPECTED_DOCS) |
| **UUSI (feedis, DB-s puudub) → import LOOKS** | **19** |
| — neist päris-uued (mitte soft-deleted) | 19 |
| Feed-SKU archived-live (äratamise-risk) | 0 ✓ |
| Churned (DB elus, feedist kadunud) | 3 261 |

**Mis JUHTUKS ühe cron-jooksuga praegu:**

| Etapp | Arv | Kulu |
|---|---|---|
| Import loob uusi | **19** (draft) | $0 |
| Klassifikatsioon (Opus, 85.6% auto pilootist) | ~16 auto-paigutust olemas-L3 → publish · ~3 review-bucket (draft) | 19 × $0.018 ≈ **$0.34** |
| — uut L3 EI loo (propose-not-create) | 0 | — |
| Hind (computeRetail inline) | 19 | $0 |
| Spec (Haiku, `specs IS NULL`) | 19 | 19 × $0.0015 ≈ **$0.03** |
| Meili reindeks + delete-batch | +~16 publish, churned juba archived | $0 |
| **KOKKU per jooks** | | **≈ $0.40** |

> **NB:** 19 on ebatavaliselt madal, sest **956-backlog imporditi eile käsitsi**. Steady-state 4h-tsükkel = üksik/madal-kahekohaline uute arv. See ongi cron-wiring'u mõte: 956 ei kordu, sest torusse jõuab jooksvalt.

**Kulu-mudel per jooks** (N uut toodet):
- Klass (Opus): N × $0.018
- Spec (Haiku): N × $0.0015 (+ ~$0.01 ühekordne iga uue L3-tüübi mall)
- Hind + import + Meili: $0
- **N≈20 → ~$0.40 · N=200 → ~$4 · N=950 (surge) → ~$19**
- Optimeering: klass/spec jookseta ainult kui N>0 → enamik tühju tsükleid $0.

---

## KOKKUVÕTE — soovitus

1. **Import-tee = create-only + `--defer-categories`, mitte `--update`.** Olemasolevaid ei puutu; stock/feed_status/hind on juba eraldi turvaliselt kaetud. Koodimuudatust create-only jaoks ei vaja.
2. **Suurim reaalne blokk pole loogika, vaid pakendus:** import-skriptid + config + ANTHROPIC key pole konteineris. Enne kui midagi jookseb Coolify's, tuleb need baked'ida + secret lisada.
3. **Opus-klassifikaator on prototüüp** (loogika tõestatud 956-l, $0.018/toode) — produktsiooniks vaja committed lib + DB-kandidaadipuu + auto-write valid-L3-guardiga + **uue-tüübi klaster-review-bucket (puudub)**. See on B-disaini tuum, gate'itud Tarmo "ehita" signaaliga.
4. **Dry-run praegu: 19 uut, ~16 auto / ~3 review, ~$0.40/jooks.** Torg deterministlik, kulu tühine.

**Ei ehitanud ega jooksutanud midagi — see on kaardistus + disain + dry-run.** Ootan "ehita" signaali enne B-etapi koodi.

---

# HIND = SSoT-ERAND (korrektsioon 2026-07-24)

Hind **uueneb kaasa** ostuhinnaga. See revideerib SAMM 2 "create-only" otsuse: import-tee TOHIB olemasolevate **hinda** uuendada (aga MITTE kategooriat/tõlget/specs/status). Turvaline tee EI ole ikkagi toorel `--update` (mis rikub 4 muud välja) — vaid **eraldi hind-only samm**.

## H1 — Per-tsükkel reprice: `reprice-existing.mjs` (hind-only, olemas, vaja kohandada)

`scripts/reprice-existing.mjs` on JUBA turvaline hind-only muster: ainus write = `UPDATE price SET amount` (ei puutu kategooriat/status/metadata't); backup-tabel; idempotentne (`<0.5%` delta → skip); feed-churned skip. **Ideaalne kandidaat** cron-sammuks. Vaja kohandada:
1. **Eemalda CUTOFF** (`created_at < 2026-07-22` legacy-filter, read 3, main+backup query) → reprice KÕIK feed-matched. `<0.5%` skip teeb selle niikuinii no-op'iks muutumatutele.
2. **Rulluv backup-nimi** (praegu fikseeritud `price_backup_reprice_20260722` + `IF NOT EXISTS` → per-tsükkel ei snapshot'iks) → timestamp'i.
3. **Säilita `computeRetail` täisvastus** (praegu viskab `cost_net`/`markup` ära) → vaja marginaali + Omnibus jaoks.
4. **Väljasta täis muutunud-nimekiri** `reports/reprice-<ts>.json` (old/new/margin/product_id) — Omnibus-writer + marginaali-teade tarbivad seda (praegu logib ainult top-8 stdout'i).
5. **Container-native** (praegu host, loeb xlsx + DATABASE_URL host'ist) → sama pakendus-blokk mis import-tee.

> ⚠️ **Miks EI feed-sync-bulk.sh:** selle `feed-bulk-price.mjs` = flat `MAP×1.15` → **revert'iks engine-hinnad iga 4h**. Cron-samm PEAB olema engine-põhine (`computeRetail`), mitte flat-markup. (Seetõttu jäeti hind cron'ist algselt välja.)

**Deploy-nüanss:** hind-only muutus (struktuur muutumatu) → **AINULT Meili reindeks**, ei vaja SSoT-regen/push/redeploy (CLAUDE.md DEPLOY-NÜANSS).

## H2 — Omnibus hinna-ajalugu (⚖️ LAUNCH-EELNE KOHUSTUS — täna PUUDUB)

EU Omnibus: iga "sooduspakkumine" peab võrdlema **viimase 30 päeva madalaima hinnaga**. Praegu:
- **Hinna-ajalugu puudub täielikult** — `price.amount` kirjutatakse üle kohapeal, vana kaob. `price_backup_reprice_20260722` = ühekordne rollback-snapshot (17106 rida), MITTE ajalugu.
- **Soodus-UI on JUBA ehitatud ja elus** — `ProductPurchasePanel.tsx:96-105` + `VevorProductCard.tsx:164` renderdavad `line-through` + `-N%` kui `original_amount > calculated_amount`. Täna inert (mõlemad võrdsed), aga **üks `price_list` rida → süttib** → Omnibus kehtib KOHE, ilma ajaloo-andmeteta = **õigusrikkumine**.
- Medusa 2.0 natiivselt: ainult jooksev hind, ajalugu EI ole. `price_list` (starts_at/ends_at) = soodus-mehhanism, aga mitte 30p-audit.

**Vaja ehitada (minimaalne):**
```sql
CREATE TABLE price_history (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  variant_id text NOT NULL, product_id text NOT NULL,
  currency_code text NOT NULL DEFAULT 'eur', amount numeric NOT NULL,  -- sentides
  changed_at timestamptz NOT NULL DEFAULT now(), source text);          -- 'reprice'|'import'
CREATE INDEX idx_ph_variant_time ON price_history(variant_id, changed_at DESC);
```
30p-viide: `SELECT MIN(amount) FROM price_history WHERE variant_id=$1 AND changed_at >= now()-interval '30 days'`. Write-hook: reprice + import hinna-write kohta (append AINULT kui muutus). Seed: `price_backup_reprice_20260722` (17106 rida) → esialgne ajalugu, et 30p-aken poleks tühi. **Soodust EI TOHI kuvada enne kui see olemas.**

## H3 — Cart price-lock (Medusa 2.13.5) — enamjaolt lukus, ÜKS auk

**Lukus (tõestatud koodist):** `cart_line_item.unit_price` on **salvestatud veerg** (snapshot add-to-cart hetkel); `complete-cart.js` loeb snapshot'i, EI arvuta variandist üle. Add-item / aadress / makse (Montonio, cart-total'ist) / complete = **snapshot-truu**. Storefront ei arvuta hinda ise (proxy). Region ei muutu → force_refresh ei käivitu.

**⚠️ AUK — koguse-muutus:** `updateLineItemInCartWorkflow` (kui klient muudab korvis kogust 1→2) **kirjutab unit_price ümber jooksva variandi hinnaga** (kui `is_custom_price=false`, mida storefront praegu on). Stsenaarium: lisab €100, cron reprice €120, klient muudab kogust → rida €120. Vaikne. (Sekundaarne: sisse-logimine → `transfer-cart-customer` force-repricer KÕIK read.)

**Minimaalne leevendus:** `app/api/cart/items/route.ts` POST → loe variandi jooksev `calculated_amount`, saada `unit_price`-na → Medusa märgib `is_custom_price=true` → nii koguse-muutus kui force_refresh JÄTAVAD snapshot'i puutumata. (Kompromiss: opt-out promo/price-list ümberarvutusest — üle vaadata kui cart-promo tuleb.) **Kohustuslik enne kui hind hakkab tsüklis muutuma** (muidu mid-session hinnahüpe koguse-muutusel).

## H4 — Marginaali-teade (delta-põhine, MITTE absoluut)

Markup on astmeline `cost_net` järgi → kui kulu ületab astme-piiri, saab toode **madalama markup'i → marginaal% langeb, kuigi jaehind tõusis** (cliff). Astmed + marginaalid:

| cost_net | markup | marginaal |
|---|---|---|
| 0–15 | 1.60 | 37.5% |
| 15–40 | 1.40 | 28.6% |
| 40–100 | 1.28 | 21.9% |
| 100+ | 1.15 | 13.0% (põhi) |

Cliff'id: €15 piir −8.9pp · €40 −6.7pp · €100 −8.8pp. `computeRetail` **tagastab juba** `cost_net`+`markup` → marginaal = `1−1/markup`, plumbing-muutust ei vaja.

> **KRIITILINE dry-run leid:** **5107 toodet (34.5%) on JUBA põhi-marginaalil 13%** (cost_net ≥ €100). Seega **absoluut-lävi "margin<15%" = 5107 valealarmi = müra.** Teade PEAB olema **delta-põhine**: alarm kui marginaal **langes ≥N pp vs eelmine hind** (cliff-ületus), MITTE absoluut-põhi. Surface: `slack_alert` helper (olemas feed-sync.sh:42) või `MARGIN_ALERT:` rida cron-wrapper'ile. Lävi config'i (`min_margin`), mitte hardcode (CLAUDE.md fikseeritud-numbri-keeld).

## Revideeritud AHEL (hind lisatud)

| # | Samm | Seis |
|---|---|---|
| 3 | import uued (draft) | ehita |
| 4 | klass (Opus propose-not-create) | ehita |
| 5a | **hind uutele** (computeRetail inline create's) | ✅ olemas |
| 5b | **hind OLEMASOLEVATELE** (reprice-existing kohandatud, hind-only) | 🔨 kohanda + Omnibus-write + marginaali-delta |
| 6 | spec uutele | glue |
| 7 | Meili reindeks + delete-batch | ✅ olemas |

## Revideeritud DRY-RUN (staging, mõõdetud — read-only, ei kirjutatud)

Arvutasin `computeRetail` iga feed-SKU peale (priceEur=MAP + weightKg) vs staging DB jooksev hind:

| Mõõt | Arv |
|---|---|
| Matched (feed ∩ DB olemas) | 14 800 |
| **Hind muutuks >0.5% (reprice write'iks NÜÜD)** | **17 (0.1%)** — 16 kallineb, 1 odavneb, avg \|Δ\| 11.4% |
| Marginaal <15% (standing, mitte per-tsükkel) | 5107 (34.5%) → **absoluut-alarm = müra, kasuta deltat** |

**Tähtis:** per-tsükkel hind-churn on **väike** (17 nüüd, sest 07-22 legacy-reprice joondas kõik) — reprice-samm write'ib väga vähe ridu tsüklis, no-op ülejäänuile. Tegelik per-tsükkel arv sõltub VEVOR MAP-muutuste sagedusest; reprice `--dry` mõõdab seda iga pull'i järel.

**Kulu:** reprice + Omnibus-write + marginaali-check = **$0** (puhas aritmeetika + SQL, LLM puudub). Ei muuda per-jooks kulu-hinnangut (~$0.40, klass+spec).

## Uued build-tükid (H-korrektsioonist)
1. `reprice-existing.mjs` → per-tsükkel (drop CUTOFF, rulluv backup, säilita margin, väljasta muutunud-nimekiri, container-native).
2. `price_history` tabel + 30p-min query + write-hook reprice/import hinna-write'i + seed backup'ist. **Launch-blokk soodus-UI jaoks.**
3. Cart `is_custom_price=true` add-time (`app/api/cart/items/route.ts`) → lukusta snapshot koguse-muutuse + login vastu.
4. Marginaali delta-alarm (config-lävi, slack_alert).
