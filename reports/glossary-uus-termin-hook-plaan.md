# #3 GLOSSARY UUE-TERMINI HOOK — PLAAN (koodita)

> **Koostatud:** 2026-10-09 (XL) · **Staatus:** PLAAN — ehitust EI alustatud · **Otsustaja:** Tarmo
> **Kontekst:** lahtiste järjekord #1 (`reports/PROJEKTI-SEIS-JA-JARJEKORD.md` §3). Klassifikaatori B-etapp (§1.13/§A4) EHITATUD → see on järgmine automaatika-vundamendi lünk.
> **Seotud mälu:** [[syn-konsensus-klassifikaator-kalibreerimine]], [[sisu-generaator-skoop]], [[homne-stardipunkt-title-glossary-sisu]]

---

## 0. PROBLEEM (miks seda vaja)

`backend/src/data/glossary.yaml` = EN→ET tõlke-SSoT (praegu ~185 kirjet, 176 locked + 9 defer; longest-match-first). Sisu-generaator ([6.5]) LOEB seda → ühtne terminoloogia. **Praegune reegel on `propose-not-create`:** uus termin sisus → review-bucket, Tarmo lisab käsitsi.

**Miks see on VALE lahendus (HARD RULE #6):** iga uus feed (Powermat/BlackTools/KraftDele) toob sadu uusi erialatermineid (uued tööriista-tüübid, materjalid, tehnoloogiad). `propose-not-create` tähendab, et **inimene peab korduvalt termineid tõlkima** — maht kasvab 10×/100× feed-kasvul → inimene jääb pidevalt jänni → sisu-generaator kasutab toor-EN termineid → vaikne kvaliteedi-lagunemine (sama muster kui VEVOR-title-strip, HARD RULE #5).

**Siht:** masin tuvastab uue termini → pakub ET-vaste → kahe mudeli konsensus → väravad → glossary'sse **automaatselt** → mõjutatud tooted genereeritakse uuesti. Inimene = turvavõrk ainult äärmuslikuks juhuks (kõik mudelid eri meelt).

---

## 1. ARHITEKTUUR — üks transform, kaks kutsujat (HARD RULE #5)

Nagu classify-chain (§1.13) ja sünonüümid ([6.6]): **üks moodul** `scripts/lib/glossary-term-chain.mjs` (otsustusahel) + **kaks kutsujat:**

| Kutsuja | Sisend | Millal |
|---|---|---|
| **BACKFILL-runner** (`glossary-term-backfill.mjs`) | KOGU korpus (~18k toodet) | ühekordne — tuvastab olemas-sisust kõik katmata terminid |
| **ÖINE HOOK** (`pipeline-glossary-terms.mjs`, `import-pipeline.sh` **[6.4]**) | AINULT delta (öine `classify-skus.txt`, ~100 toodet) | iga öö automaatselt |

**Sama transform, eri sisend** (delta vs täis-korpus) → backfill ja hook ei lahkne kunagi.

**Asukoht torus:** **[6.4]** — PEALE [4] classify + [6] spec (title_et toore sisu olemas), **ENNE [6.5] sisu-gen** (sisu-gen loeb glossary't → uued terminid peavad enne glossarys olema, muidu öine sisu-gen kasutab toor-EN). Järjekord: `[6] spec → [6.4] glossary-terminid → [6.5] sisu-gen → [6.6] sünonüümid → [7] reindeks`.

---

## 2. OTSUSTUSAHEL (per uus termin — asümmeetriline kindlus nagu §2c)

```
1. TUVASTA katmata termin  (delta-sisust, glossary-adherence detektor — EN esineb, glossary-match puudub)
       │
2. DUP-VÄRAV  (kas termin JUBA glossarys? sh aliased + morfoloogia-normaliseeritud)  → jah: skip
       │ ei
3. PAKU ET-vaste:  Opus-kohtunik  +  Sonnet-referents  (sõltumatu, pime — mõlemad saavad EN-termini + näidis-kontekstid)
       │
   ┌───┴─────────────────────────────┐
   │ KONSENSUS (sama ET-vaste)        │ → 1× Fable-kinnitus (asümm: glossary-rida = STRUKTUURI-otsus)
   │                                  │     kinnitus OK → LISA glossary'sse (locked)
   │                                  │     kinnitus vaidleb → defer + signaal (konservatiivne)
   ├──────────────────────────────────┤
   │ LAHKHELI (eri ET-vaste)          │ → Fable-VIIGIMURDJA 3× hääletus, ≥2/3 enamus otsustab
   │                                  │     enamus → LISA glossary'sse (locked)
   │                                  │     3× ei anna enamust → TERMIN JÄÄB TÕLKIMATA (defer) + signaal
   └──────────────────────────────────┘
       │
4. VÄRAVAD (kõik kohustuslikud, enne write'i) → 5. LISA glossary.yaml + DB-flag → 6. REGENEREERI mõjutatud tooted
```

**Miks asümmeetria:** glossary-rida mõjutab KÕIKI tooteid, mis terminit sisaldavad (mitte üksik-toodet) → struktuuri-otsus → nõuab stabiilsust (konsensus+kinnitus või enamus). Fable on mittedeterministlik → üksik kutse on viigimurdja, mitte tõe-allikas (sama põhjendus kui classify §2c).

**Kõik eri meelt → ohutu vaikimisi:** termin EI lähe glossary'sse, jääb toor-EN-ina (sisu-gen kasutab algvormi), signaal koguneb review-bucketisse. **MITTE inimese järjekorda rutiinselt** — ainult kui signaal kuhjub (nt sama termin 3× öödel ei saa konsensust → nädalane kokkuvõte Tarmole).

---

## 3. VÄRAVAD (kõik kohustuslikud, transaktsioonis — nagu l3-gates)

Moodul `scripts/lib/glossary-gates.mjs` (SSoT, jagatud backfill + hook):

1. **DUP-värav** — termin (sh aliased + eesti-morfoloogia-normaliseeritud) ei tohi juba olla. Longest-match-first konflikt: uus termin ei tohi varjata olemas-fraasi ega vastupidi (nt "steam generator" vs "steam room generator").
2. **KEHTIVUS-värav** — ET-vaste: (a) on päris eesti sõna/fraas (mitte transliteratsioon ega EN-koopia); (b) ei ole tühi/ühe-täheline; (c) cluster määratud (tööriistad/tehniline/materjalid/ühikud/turundus); (d) ei sisalda keelatud turundus-fluff'i (vrd "Thoughtful Tool" õppetund, §A1).
3. **MATCH-ohutus** — uue termini lisamine ei muuda olemas-toodete adherence't valesti (longest-match-first re-sort ei riku varasemaid matche). Kontroll: jooksuta adherence olemas-korpuse valimil enne+pärast → violation-arv ei tõuse.
4. **FREQ-värav** — termin esineb ≥1 tootes (locked); kui 0 → `defer` (aktiveerub kui feed toob). Väldib "fantoom-termineid".

Värav kukub → termin EI lähe glossary'sse, jääb `review` staatusega + Telegram.

---

## 4. REGENEREERIMINE (mõjutatud tooted — backfill JA hook)

Uus glossary-rida mõjutab KÕIKI tooteid, mille EN-sisu terminit sisaldab. **Pärast lisamist:**
- **HOOK (öine delta):** uus termin puudutab tavaliselt sama öö delta-tooteid (need, kust termin tuvastati) → need lähevad niikuinii [6.5] sisu-gen'i samal ööl → **automaatselt kaetud, lisatööd pole**.
- **BACKFILL (tagasiulatuv):** backfill-runner tuvastab korraga palju termineid olemas-korpusest → iga uue termini puhul kogu korpus, mis seda terminit sisaldab, märgitakse sisu-gen'i ümber-genereerimiseks (`content_regen_queue`). Regen jookseb partiidena (krediit-teadlik, nagu [6.5]).
- **Idempotentne:** toode, mille sisu juba kasutab kanoonilist ET-vastet, ei vaja regen'i (adherence-check → skip).

---

## 5. MULTI-FEED (KRIITILINE, osa hooki ehitusest — HARD RULE #5)

Terminituvastus peab olema **bränd-agnostiline** — termin tuvastatakse EN-SISUST (title_en + description), MITTE bränd-prefiksist. Powermat/BlackTools/KraftDele toovad samu erialatermineid eri sõnastuses → tuvastus loeb **sisu**, mitte tootja-nime (sama masintõlke-immuunsuse põhimõte kui taksonoomias). Üks glossary-SSoT → kõik feedid läbivad sama masina. Bränd-tuvastus `deriveBrandSlug` SSoT kaudu, kui vaja kontekst-filtriks — MITTE VEVOR-hardcode.

---

## 6. FAIL-LOUD + DEGRADE (nagu [4]–[6.6])

- **Krediit/API maas (probe rc=3 või key puudub):** [6.4] SKIP (degrade), [6.5]+ JÄTKUB olemas-glossary'ga → Telegram HOIATUS "N uut terminit ootab tõlget (krediit maas)". Uus toode saab sisu toor-EN-terminiga (ajutine), järgmine öö katab.
- **Üksik termin kukub värava/konsensuse taga:** skip + jätka (ÄRA peata pipeline'i ühe termini pärast) → Telegram raporteerib defer'itud terminite arvu.
- **Süsteemne viga (kogu partii kukub, API täiesti maas):** `exit != 0` → FAIL → Telegram.

---

## 7. UNDO + NÄHTAVUS (HARD RULE #6)

- **Undo:** iga öine/backfill jooks = batch_id (nt `gloss-2026-10-09T...`). `glossary-term-undo.mjs <batch_id>` → eemaldab lisatud read glossary.yaml-st + DB-flag + märgib mõjutatud tooted regen'i (algvormi tagasi). Git: glossary.yaml on versioonitud → diff nähtav igal commit'il.
- **Nähtavus:** Telegram-teade igal jooksul ("N uut terminit lisatud, M defer, K review"). **Klastrite kaupa, mitte termini-kaupa**, kui maht suur (nädalane kokkuvõte). Review-bucket (`glossary_review`) kuvatakse sama shadow-ledger/review-UI-ga kui klassifikaator (§P7 laiend).
- **Auto vs defer lävi:** EI fikseeritud arvu (HARD RULE: valideerimise väravad ei tohi fikseeritud numbreid). Konsensus+kinnitus või ≥2/3 enamus = auto-locked; muidu defer. Isekohanduv.

---

## 8. KULUHINNANG

| Faas | Termineid | LLM-kutseid / termin | Hinnang |
|---|---|---|---|
| **BACKFILL** (ühekordne) | ~500–1500 katmata (hinnang olemas-korpusest) | 2 (Opus+Sonnet) + 1–3 (Fable viigimurdja osal) | ~$15–40 ühekordne |
| **ÖINE HOOK** (delta) | ~5–30 uut terminit/öö (feed-kasvul) | 2–5 / termin | **~$0.10–0.50/öö** |
| **REGEN** (sisu-gen uuesti) | katab olemas [6.5] eelarve sees (delta niikuinii gen'itakse) | — | ~$0 lisa hook'il; backfill-regen partiidena krediit-teadlik |

Marginaalne öine lisa-kulu (~$0.5/öö) klassifikaatori ~$3.5/öö kõrval. Backfill ühekordne. Spend-guard (`XLM_SPEND_LIMIT_USD=350`) katab.

---

## 9. EHITUS-JÄRJEKORD (kui Tarmo kinnitab)

1. `scripts/lib/glossary-term-chain.mjs` (otsustusahel §2) + `glossary-gates.mjs` (väravad §3) — SSoT moodulid, git.
2. `glossary-term-backfill.mjs` (kutsuja A, täis-korpus) — DRY esmalt → kuldvalim-kalibreerimine (Tarmo vaatab ~20 pakutud vastet üle, ühekordne) → execute.
3. `pipeline-glossary-terms.mjs` (kutsuja B) + torusse **[6.4]** (import-pipeline.sh, ENNE [6.5]).
4. `glossary-term-undo.mjs` + review-bucket integratsioon (§P7 UI laiend).
5. Testid: DUP-värav, longest-match-ohutus, konsensus vs lahkheli vs kõik-eri, degrade-teekonnad.

**Kalibreerimine = ühekordne inimtöö (OK, HARD RULE #6);** öine hook = korduv masintöö (0 inimest).

---

## 10. KONTROLL (iga sisu-töö ülevaates — HARD RULE #5)

- **backfill:** X terminit (kogu korpus, ühekordne) ✅
- **hook:** pipeline samm [6.4], delta-peal (`classify-skus.txt`), bränd-agnostiline, fail-loud Telegram ✅
- **Ainult backfill = POOLELI, mitte valmis.** Mõlemad kohustuslikud.
