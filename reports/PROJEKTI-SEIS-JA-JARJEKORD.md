# XL e-pood — PROJEKTI SEIS JA JÄRJEKORD (ankur-dokument)

> **Koostatud:** 2026-09-19 · **Eesmärk:** täielik, aus projekti seis, et ei hüppaks üle faaside ega
> unustaks pooleliolevat. Iga väide on TÕESTATUD (git SHA / DB-päring / report). Oletused on märgitud
> "⚠️ TÕESTAMATA".
>
> **Severity (CLAUDE.md HARD RULE #2):** AINULT **CRITICAL** või **VAJA ÄRA TEHA**. Mitte LOW/MEDIUM/P3.

## Tõestus-baas (kontrollitud 2026-09-19)

| Fakt | Väärtus | Allikas (tõestus) |
|---|---|---|
| Published tooted (deleted_at NULL) | **18606** | DB `product` päring k33g |
| Uus sisu-generaator tehtud (`content_gen_hash` olemas) | **13259** | DB-päring |
| Sisu-generaator PUUDU (`content_gen_hash` NULL) | **5347** | DB-päring (= re-run sihtmärk) |
| `title_et` olemas (sh vana juuni-tõlge) | **14967** | DB-päring |
| `description_et` olemas | **14967** | DB-päring |
| Zombie-kaksikud (published + deleted_at NOT NULL) | **363** | DB-päring (EI ole hard-deletitud) |
| `classification_review` (review-bucket) | **52 resolved, 0 pending** | DB-päring (bucket tühi) |
| Kategooriaid (`product_category`, elus) | **1933** | DB-päring |
| Draft-tooted | **0** | DB-päring |
| `specs` NULL | **144** | DB-päring |
| `product_redirect` tabel | olemas, **0 rida** | DB-päring (365p redirect, kandidaate pole) |
| Harude tipud | `origin/main` **553a113d** · `origin/taxonomy-v4` **58d9b009** | `git rev-parse` |
| Live storefront konteiner (k33g) | image-tag **93c1f8b3** | `docker ps` (= v4 eelviimane commit; HEAD 58d9b009 = ainult sessioonilogi → KÕIK build-fixid Osa 52-ni on LIVE) |
| Öine import-pipeline viimane jooks | 2026-09-19 03:00 = **rc=2 FAIL** | `/var/log/xlm/STATUS` (vt POOLELI §P1 — fix rakendatud PÄRAST seda jooksu) |

**Stack-topoloogia (kriitiline kontekst):** kaks Coolify-appi samal Hetzner-boxil (65.21.126.235):
`uo28…` = **PROD** (`xlmarket.ee`, coming-soon KOOD, 7 nädalat vana image `1c09a40`, vana taksonoomia
3360 kat — **ÄRA PUUTU**) · `k33g…` = **STAGING** (`staging.xlmarket.ee`, kogu töö, v4, 18606 toodet).
Cutover = k33g → prod domeeni-swap. Allikas: `reports/cutover-valmidus-audit.md`, mälu `stack-topoloogia-prod-staging.md`.

---

## 1. LÕPETATUD FAASID

### 1.1 Taksonoomia v4 — VALMIS ja LIVE
- SSoT `backend/src/data/taxonomy.yaml` + `category-tree.generated.json`; 1933 kategooriat (DB), 25 nähtavat L1 + Outlet (26.).
- Invariandid roheline: viimane dokumenteeritud `inv-taxonomy.mjs` = **0 FAIL** (Osa 30/33). Tööriistad git-is (`scripts/inv-taxonomy.mjs`, `lock-harness.mjs`, `grab-bag-judge.mjs`, `merge-judge.mjs`, `genyM.mjs`).
- Review-bucket **tühi (0 pending, 52 resolved)** — DB kinnitab. Viimane resolutsioon: Osa 29 (14 kodutut → 5 uut L3), commit main `13ef2738` / v4 `1e067369`.
- **Tõestus:** DB kategooria-arv 1933; git commitid; `reports/cutover-valmidus-audit.md` (k33g 1928→1933 v4 kat vs uo28 3360 vana).

### 1.2 FAAS 1 SAMM 1 — VEVOR title-strip (backfill + hook) — VALMIS
- Backfill **18278** title strippitud + `title_et` 6406 strippitud + ET-esitäht suureks. Hook `import-pipeline.sh [3.5]` (delta, per-bränd `deriveBrandSlug`, fail-loud) — HARD RULE #5 täidetud.
- **Tõestus:** commit `f62fde5d`/`23c2f8b1`; mälu `homne-stardipunkt-title-glossary-sisu.md`, `sisu-kihid-vana-tolge-asendatakse.md`; `scripts/lib/brand-strip.mjs`, `scripts/pipeline-strip-titles.mjs`.

### 1.3 FAAS 1 SAMM 2 — Glossary v1 — VALMIS
- `backend/src/data/glossary.yaml` — **185 kirjet** (176 locked + 9 defer), longest-match-first. Rakendub sisu-generaatori kaudu (forward-only).
- **Tõestus:** commit `9b7673b1` (main) / `ce6966fc` (v4).

### 1.4 Hinnastamise mootor — EHITATUD (andmed rakenduvad impordil)
- `computeRetail({priceRaw, supplierId, weight})`; `config/{suppliers,pricing-rules,fx}.yaml` + adapterid. `PRICE_MARKUP` konstant kustutatud, markup kulule. VEVOR −3,4% vs vana kood.
- **Tõestus:** commit main `384d0a76` / v4 `20ecbe32`; mälu `hinnastamise-arhitektuur-disain.md`.
- ⚠️ TÕESTAMATA / kontrollida: kas weight-surcharge on DISABLED (Tarmo otsus: tarne hinnast VÄLJAS). Kontroll: `scripts/lib/pricing-engine.mjs` + `config/pricing-rules.yaml`. (Mälu `hinnastamine-ja-ladu-otsused.md` märgib TODO, teostus tõestamata.)

### 1.5 Öine import-pipeline — EHITATUD + wire'itud (aga vt POOLELI §P1)
- Host-cron `0 3 * * * import-pipeline-cron.sh` (k33g root). Sammud [1]-[7] + [3.5] strip + [6.5] sisu-gen hook. Krediit-degrade (P1+P2) VALMIS: `credit-guard.mjs`, `credit-probe.mjs`, `credit-outage-state.mjs`, `drain-pending.sh`.
- **Tõestus:** commitid `18916327`/`caf066f7` (P1), `88bd38b6`/`dfa4f439` (P2); mälu `pipeline-live-stardipunkt.md`.

### 1.6 Launch-vastupidavuse fixid (5 build-fixi) — LIVE
Kõik LIVE storefront-konteineris (tag 93c1f8b3):
1. **Meili-maas OOS-fallback** (ei saa osta tarnimatut) — `ad645511`/`2b16e0ac`.
2. **Montonio makse-tõrke teade** ("raha EI võetud") — `f31d8c34`/`dabe01c4`.
3. **JsonLd availability päris-laoseisust** — `c0ce483b`/`e030314c`.
4. **Meili-maas UX** (kategooria-grid + avaleht ei näi tühi) — `66aeb874`/`5757145d`.
5. **Väljamüüdud tooted nähtavaks + badge + 365p soft-delete redirect** — `b4ea489d`/`4ef8f812`.
- **Tõestus:** Osa 19-26, 33; docker ps tag 93c1f8b3 (kõik ülal + hilisemad Osa 41-52 sees).

### 1.7 Backup — JOOKSEB + offsite + taastatav — VERIFITSEERITUD
- Host-cron `0 2 * * * /root/backup.sh`; katab uo28 PROD + **k33g STAGING** (alates 2026-08-24); offsite Hetzner Storage Box; test-restore exit 0.
- **Tõestus:** Osa 21; `/var/log/backup.log`; mälu `cutover-valmidus-audit.md`. Kinnitus täna: Osa 49 (backup jooksis 2026-09-19 02:01, 0 errors).

### 1.8 Kategooria-pildid (L3-thumbnailid) — VALMIS + LIVE
- 3400 vana webp → 1680 uut (praegune), L1/L2 pärivad kõrgeima-count lapse; productless-artefakt iseparanev. INV-20/26 roheline. Outlet = `concept_only` %-ikoon.
- **Tõestus:** Osa 32, 33, 36, 42; commitid `b572293d`/`40594a60` jt.

### 1.9 Monitooring / teavitus (dead-man mõlemast otsast) — VALMIS
- Wrapper source-kindel Telegram-alert (rc!=0) — `af6f5dd5`/`aa3667f3`.
- Kuma push dead-man **import-pipeline id=7** (25h) — `e4b65c11`/`cf8e64fc`.
- Kuma push dead-man **feed-refresh id=8** (5h) — `0acf447a`/`93c1f8b3`.
- **Tõestus:** Osa 50-52; git log; mälu `monitooring-topoloogia-teavitusahel.md`.
- ✅ **TÕESTATUD live-DB-st (2026-09-19, XL põhisessioon):** `docker exec uptime-kuma-* sqlite3 /app/data/kuma.db` →
  `6|Nightly backup|push|90000|1` · `7|XLMarket import-pipeline|push|90000|1` · `8|XLMarket feed-refresh|push|18000|1` (kõik active=1).
  id=8 viimane heartbeat `feed-ok-15207sku @ 2026-09-19 20:01` — st **feed-refresh Coolify-task JOOKSIS päriselt 20:00-l ja pingis kuma edukalt** (dead-man töötab live'is otsast-otsani, mitte ainult drill). (sqlite3 ON konteineris olemas — varasem "seire pole sqlite3" oli vale konteiner/käsk.)

### 1.10 Cutover-strateegia — KINNITATUD (audit tehtud, teostus EI)
- Strateegia **A** (k33g domeeni-swap, sama box) + `.eu → .ee` 301. uo28 = 30p backup.
- **Tõestus:** `reports/cutover-valmidus-audit.md` (git main, commitid `0f575cf3`, `8a749571`); mälu `cutover-strateegia-a-otsus.md`.
- **NB:** see on OTSUS + audit, MITTE teostus. Cutover ise = ALUSTAMATA (vt §3).

---

## 2. POOLELI (alustatud, EI lõpetatud — mis TÄPSELT puudu)

### P1. 🔴 CRITICAL — Öine import-pipeline: fix rakendatud, aga EI ole veel elus-jooksuga tõestatud
- **Seis:** `/opt/eumotors-tasks/.env` oli katki (bare `>` read + jutumärgita `COOLIFY_TOKEN` Sanctum-toru `9|…`) → `source .env` kukkus → import-pipeline **rc=2 FAIL 17.-19. sept** (3 ööd vaikselt). Fix tehtud 2026-09-19 (Osa 49): .env parandatud + wrapper source-kindel Telegram-alert + kuma dead-man'id.
- **TÕESTATUD nüüd:** `.env` sources puhtalt (rc=0, 4 võtit); backup `.env.bak-20260919` olemas.
- **AGA:** `/var/log/xlm/STATUS` näitab endiselt **viimane jooks = rc=2 FAIL** (2026-09-19 03:00, mis oli ENNE fix'i rakendust). **Esimene tõeline verifikatsioon = 2026-09-20 03:00 öine jooks.**
- **PUUDU lõpetamiseks:** hommikul 2026-09-20 kontrolli `cat /var/log/xlm/STATUS` (oota rc=0 result=OK) + Telegram-digest saabus. Kui FAIL → uuri logi `/var/log/xlm/import-pipeline-latest.log`.

### P2. 🔴 CRITICAL — FAAS 1 SAMM 3: Sisu-generaator backfill POOLELI (5347 puudu)
- **Seis:** täis-batch-jooks (18733 toodet, Sonnet 5, Batch API) käivitati 2026-08-25, aga **kukkus osaliselt krediidi otsasaamisel** (~29%). DB: `content_gen_hash` olemas **13259**, NULL **5347**.
- **PUUDU:** re-run 5347 puuduvale. Käsk: `bash scripts/run-content-backfill.sh` (hash-guard võtab AINULT NULL-hash tooted, idempotentne). Sõltuvus: **krediit/makse OK** — mälu järgi HELD kuni kasutaja console-kinnitus (saldo + auto-reload + makseviis). Krediidi-probe 2026-09-19 = HTTP 200 OK (Osa 49), seega tehniliselt saab jooksutada, kuid Tarmo hoid kehtib kuni eksplitsiitne "krediit laetud".
- **Verifitseeri pärast:** `content_gen_hash` NULL → 0 (või lähedal); STATUS=OK (mitte PARTIAL). Batch fail-loud garantii "VALMIS ⟺ errored==0" on ehitatud (`reports/multi-feed-valmidus.md` #5).
- **Tõestus:** DB 5347; Osa 10-15; mälu `sisu-kihid-vana-tolge-asendatakse.md`.
- **Seotud pooleli-detail:** description_et jääb VEVOR-toorest tõlkest kuni generaator selle asendab (title_et on juba strippitud). Vana juuni-tõlke kiht asendub generaatoriga, EI lapita.

### P3. VAJA ÄRA TEHA — 363 zombie-kaksikut EI ole hard-deletitud
- **Seis:** 363 published + soft-deleted kaksikut ühest 2026-04-19 re-impordist. 103 paaril storefront näitab tühja live-twinni. DB kinnitab **363 endiselt olemas**.
- **PUUDU:** järjekord (Osa 15 plaan) = (1) re-run 5332/5347 [P2] → (2) värske backup → (3) hard-delete AINULT need 363 (kriteerium `deleted_at IS NOT NULL AND status='published' AND created 2026-04-19`). Nimekiri: `reports/zombie-363-list.txt` (✅ KONTROLLITUD: fail PUUDUB → veel genereerimata, osa sellest lahtisest tööst). Backfill deleted_at-filter juba parandatud (`2d6d01dc`/`db53d5ab`).
- **Tõestus:** DB 363; Osa 14-15.

### P4. VAJA ÄRA TEHA — Outlet ristkuvamine (backend-skript valmis, EI jooksutatud)
- **Seis:** `scripts/outlet-crossdisplay.mjs` VALMIS (Outlet=kodu + valikuline tüüp-lisakuvamine, additiivne INSERT ON CONFLICT). EI jooksutatud — Osa 47/48 ütleb "backend maas". **NB:** backend on nüüd üleval (Osa 49: Medusa /health OK, 18606 toodet) → blokeering võib olla möödas.
- **PUUDU:** jooksuta skript (Wind Turbine → ka Tuulegeneraatorid) + `index-meilisearch.mjs` reindeks (struktuur ei muutu → redeploy pole vaja).
- **Tõestus:** commit `8715403a`/`a20f6405`; Osa 47-48.

### P5. VAJA ÄRA TEHA — Outlet atmosphere-pildid (6 uut AI-pilti)
- **Seis:** Elektroonika, Peoinventar, Büroo, Põllumajandus, Kodumasinad (+ Outlet, aga Outlet = %-ikoon lõplik) tahavad ilusamat atmosphere-stseeni. Praegu pärivad toote-thumbi/ikooni (töötab).
- **PUUDU (blokk):** `GEMINI_API_KEY` puudub + nano-banana tööriist pole sellel hostil (Osa 49: 🔴). Vaja key + tööriist VÕI Tarmo annab pildid.
- **Tõestus:** Osa 41, 49.

### P6. VAJA ÄRA TEHA — Feed condition-väli → automaatne outlet-routing (LAHTINE)
- **Seis:** `vevor-feed.ts` `condition?` väli (r14) kasutamata. Automaatne (tagastatud/rikutud → Outletisse) käiks feed-importeris.
- **PUUDU:** teadmine mis väärtusi condition sisaldab (vaja feedi elus kontrollida) → siis importeri-loogika.
- **Tõestus:** Osa 48 Q6.

---

## 3. ALUSTAMATA (plaanis / üle hüpatud)

### A1. Sisu-generaator SAMM 3 — kvaliteedi-jääk-otsad (glossary-koristus, B-monitor)
- "Thoughtful Tool" (locked, turundus-fluff) → glossary-koristus. B-scoped adherence-monitor täisrakendus (scoping + review-loendur → STATUS/Telegram). Adherence-piloot = 76.9% raw → ~93-95% pärast klassifitseerimist (`reports/adherence-latest.md`). ALUSTAMATA.

### A2. Sünonüümid (ET Meili search synonyms) — ALUSTAMATA
- Generaator = `claude -p haiku` OAuth (Max-tellimus, mitte pay-API). Pretsedent `sync-existing-synonyms.mjs`. Backlog 🟢 LLM-vaba (Osa 28). CLAUDE.md loeb seda cutover-eelseks auguks.

### A3. Rich-sisu lünk (~4329 toodet PIKK turundus-prose) — ALUSTAMATA
- EI ole feed-parandatav (VEVOR xlsx kärbib CSS-cap'i juures). Vajab generaatorit (spec+pilt) VÕI VEVOR web/API täis-HTML. Sisu-generaator (P2) katab title/description/selling-points; PIKK rich-plokk on eraldi. Mälu `sisu-generaator-skoop.md`.

### A4. Auto-klassifikaator: Opus asendab resolver-v2 (B-etapp) — ALUSTAMATA
- Praegu 2 paigutajat: resolver-v2 (4h feed-sync) + guard-parandused. Siht: Opus = primaar, resolver-v2 = fallback. Propose-not-create + review-bucket nähtavus (nädalane teade). Ehitada PÄRAST 956-backlogi importi. Mälu `b-disain-opus-klassifikaator-feed.md`.
- **NB:** SEG-01 kids-guard on ehitatud (`9d302918`/`2b06f116`, Osa 30) — üksik-parandus, mitte täis-B.

### A5. 956-backlog import — ALUSTAMATA (eraldi äriotsus)
- 956 uut toodet klassifitseeritud (auto 818, review 82, new_l3 41→9 päris uut, quarantine 15). EI ole DB-s (`--skip-new`). Import = launch-inventari-otsus. Mälu `956-autopaigutus-pipeline-leiud.md`.

### A6. Multi-feed (Powermat/BlackTools/KraftDele) — Phase-2, ALUSTAMATA
- **Tarmo otsus: EI ole Eesti-launchi blokeerija** (Eesti läheb üles VEVOR-iga). Phase-2 järjekord: P2-1 feed-migratsioon (🔴 adapter ühendamata) → P2-2 bränd-SSoT (🟡 3 koopiat + 3 hardcode, kõik VEVOR-only-ohutud) → P2-3 glossary-hook (🔴 ehitamata) → P2-4 hinna-glue. Report `reports/multi-feed-valmidus.md`.

### A7. Topelt-ladu / StockLocation (EE/Tenerife) — Phase-2, ALUSTAMATA
- Mootor olemas (`stock_source`, `StockLocation`), puudu andmed + haldus-UI. Erikategooriad (15-30%) = lattu-ostu stiimul. Mälu `hinnastamine-ja-ladu-otsused.md`.

### A8. Cutover teostus — ALUSTAMATA (strateegia A kinnitatud §1.10)
- Runbook'i **teadlikult EI kirjutata enne FAAS 4 valmimist** (vananeks). Päris augud: (1) `.eu` routing puudub (Traefik Host / 301) · (2) TLS/LE bare-domeenile · (3) uo28 backup enne stop'i · (4) E2E smoke prod-domeenil (Montonio makse) · (5) feed-sync sihtmärk (juba k33g → A puhul muutmatu). 2 pisiauku: uptime-kuma `xlmarket.ee` monitor + k33g Meili snapshot.

---

## 4. FAASI-JÄRJEKORD (rekonstrueeritud) — ⚠️ NUMERATSIOON EBASELGE

**AUS HOIATUS:** allikates EI ole ühtset "FAAS 4-11" nummerdust. Kaks eri skeemi:
- **Vana (juuni 2026, ajalooline):** FAAS 0/1/2 = kategooria-halduse override-kiht (`288a7151`, `a4aadb25`). Ei ole enam aktiivne raamistik.
- **Aktiivne (aug-sept 2026, sisu→cutover kaar):** allikad defineerivad selgelt **AINULT FAAS 1-5**. "FAAS 4-11" ei esine üheski logis ega CLAUDE.md-s.

**Mida aktiivsed allikad ütlevad (Osa 27, `cutover-strateegia-a-otsus.md`):**

| FAAS | Sisu | Seis | Tõestus |
|---|---|---|---|
| **FAAS 1** | Sisu-töö vundament: SAMM 1 title-strip · SAMM 2 glossary · SAMM 3 sisu-generaator | SAMM 1-2 ✓ · SAMM 3 **POOLELI (5347 puudu)** | §1.2-1.3, §P2 |
| **FAAS 2-4** | Ülejäänud sisu-töö: sisu-generaator / **sünonüümid** / **pildid** (Osa 27 sõnastus) | pildid ✓ (§1.8) · sünonüümid ALUSTAMATA (§A2) · sisu-gen pooleli | Osa 27 rida 465 |
| **FAAS 5** | Cutover (k33g → prod) | strateegia A kinnitatud, teostus ALUSTAMATA; runbook ootab FAAS 4 lõppu | §1.10, §A8 |

- ⚠️ **Ebakindlus:** FAAS 2, 3, 4 sisu ei ole allikates eraldi lahti kirjutatud — Osa 27 loetleb "FAAS 2-4 sisu-töö (sisu-generaator/sünonüümid/pildid)" ühe plokina. Täpne 2 vs 3 vs 4 piir on määramata. **FAAS 6-11 EI EKSISTEERI allikates.**
- **Praktiline tegelik järjekord (mida allikad tegelikult järgivad):** (1) lõpeta sisu-generaator [P2] → (2) sünonüümid [A2] → (3) pildid ✓ tehtud → (4) rich-sisu jääk [A3] valikuline → (5) cutover [A8]. Multi-feed / topelt-ladu / Opus-klassifikaator = **Phase-2 PÄRAST launchi**, väljaspool FAAS 1-5 kaart.

---

## 5. IGA LAHTISE JUURES — MIS VAJA LÕPETAMISEKS (konkreetsed sammud)

| # | Lahtine | Severity | Sammud lõpetamiseks | Sõltuvus |
|---|---|---|---|---|
| P1 | Import-pipeline elus-verifikatsioon | CRITICAL | Hommikul 2026-09-20: `cat /var/log/xlm/STATUS` (oota rc=0 OK) + Telegram-digest. FAIL → `tail -40 import-pipeline-latest.log` | Öine cron 03:00 (fix juba .env-is) |
| P2 | Sisu-gen re-run 5347 | CRITICAL | `bash scripts/run-content-backfill.sh` (hash-guard); pärast: DB `content_gen_hash NULL → 0`, STATUS=OK | **Krediit-kinnitus (Tarmo HELD)** |
| P3 | 363 zombie hard-delete | VAJA ÄRA TEHA | Järjekord: P2 → värske backup → hard-delete 363 (kriteerium fikseeritud) | Pärast P2 |
| P4 | Outlet ristkuvamine | VAJA ÄRA TEHA | `node scripts/outlet-crossdisplay.mjs execute` (medusa exec, ILMA `--`) + `index-meilisearch.mjs` | Backend üleval (Osa 49 ✓) |
| P5 | 6 outlet atmosphere-pilti | VAJA ÄRA TEHA | GEMINI_API_KEY + nano-banana tööriist VÕI Tarmo pildid → ATMOSPHERE_BANNERS kirjed | Pildi-tööriist puudub |
| P6 | Feed condition-routing | VAJA ÄRA TEHA | Kontrolli feed condition-väärtused (feed elus) → importeri-loogika | Feed elus |
| A2 | Sünonüümid ET | VAJA ÄRA TEHA | `claude -p haiku` OAuth generaator (Max) → `sync-existing-synonyms.mjs` muster → Meili | LLM-vaba, cutover-eelne |
| A4 | Opus-klassifikaator (B) | VAJA ÄRA TEHA | Opus = primaar feed-cron'is, resolver-v2 → fallback; propose-not-create + review-bucket teade | Pärast 956-importi |
| A8 | Cutover teostus | VAJA ÄRA TEHA | Kirjuta runbook (strateegia A): `.eu` 301 + LE bare-domeen + uo28 backup + E2E Montonio smoke | Pärast FAAS 4 (sisu 100%) |
| 1.4 | Weight-surcharge kontroll | VAJA ÄRA TEHA | Kontrolli `pricing-engine.mjs` + `pricing-rules.yaml` — kui weight-surcharge enabled → DISABLE (tarne hinnast väljas) | Enne impordi-hinna-jooksu |

---

## Mis jäi selles auditis TÕESTAMATA (vaja eraldi kontrollida)

1. ~~Kuma monitorid id=7/id=8 live-DB-rida~~ → ✅ **SULETUD** (vt §1.9): live-DB päring õnnestus, kõik 3 monitori active=1, id=8 pingiti reaalselt 20:00 cronist.
2. **`reports/zombie-363-list.txt`** → ✅ **KONTROLLITUD: fail PUUDUB** (`ls` → No such file). St 363 zombie hard-delete nimekiri on veel GENEREERIMATA — see on osa P3 lahtisest tööst (mitte lihtsalt tõestamata, vaid tegemata). Vt §2 P3.
3. **Weight-surcharge disable teostus** (§1.4) — Tarmo TODO mälus, teostust ei tõestatud koodist.
4. **P1 esimene tõeline öine jooks (2026-09-20)** — .env fix rakendatud, kuid end-to-end öine rc=0 pole veel juhtunud (viimane STATUS = pre-fix FAIL).
5. **FAAS 2/3/4 täpne piir** — allikad ei lahenda 2 vs 3 vs 4 sisu eraldi; "FAAS 6-11" ei eksisteeri.
