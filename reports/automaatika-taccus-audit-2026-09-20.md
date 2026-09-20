# Automaatika täpsus-audit — 9 sisu/SEO/otsingu-tööd × backfill/hook/multi-feed

> 2026-09-20. Tarmo põhimõte: **EHITAME MASINAT, mitte kataloogi.** Iga sisu-töö peab töötama
> automaatselt ka uute toodete + uute feedide (Powermat/KraftDele) puhul. HARD RULE #5 = backfill + hook.
> **Allikad kontrollitud KOODIST** (mitte mälust): `import-pipeline.sh`, `lib/brand-strip.mjs`,
> `lib/content-gen.mjs`, `pipeline-content-gen.mjs`, `pipeline-reprice.mjs`, `pipeline-classify.mjs`,
> `generate-synonyms.mjs`, `storefront/lib/meilisearch.ts`.

**Legend:** ✅ tehtud/torus · ⚠️ osaline/lukus · 🔴 puudub · ⬜ pole ehitatud

| # | Töö | Backfill | Hook (öine auto) | Multi-feed |
|---|---|---|---|---|
| 1 | Title-strip | ✅ 18278 | ✅ [3.5] `pipeline-strip-titles.mjs` delta | ✅ brand-agnostiline (`BRAND_NAMES` + `deriveBrandSlug`, PM-/VV-) |
| 2 | Glossary (terminid) | ✅ 185 kirjet lukus | ✅ [6.5] laeb `glossary.yaml`→`termBlock`→shared `generateContent` | ✅ EN-term→ET, bränd-agnostiline |
| 3 | Sisu-generaator (EN→ET SEO) | ✅ 100% (18675/18675) | ✅ [6.5] delta, shared transform + truncation-retry | ✅ loeb toote OMA EN-allikat |
| 4 | SEO (title 50-70ch, meta 140-160ch) | ✅ (sisu-geni sisene) | ✅ [6.5] | ✅ bränd-agnostiline |
| 5 | Kirjapildi-variandid (rulaator/rollaator) | ⚠️ compound-split hardcoded map; variandid ise ei | 🔴 PUUDUB torus | ⬜ pole |
| 6 | Sünonüümid / otsingusõnad | ⚠️ `generate-synonyms.mjs` olemas, vana (mai), mitte täis-korpus | 🔴 PUUDUB torus ([7] ei kutsu) | ⬜ pole |
| 7 | Ristkuvamine (üks kodu mitmes kohas) | ⬜ Phase-2 | 🔴 pole | ⬜ pole |
| 8 | Klassifikatsioon (uus→õige kodu) | ✅ v4-korpus | ✅ [4] `pipeline-classify.mjs` propose-not-create, auto≥0.85 muidu review | ✅ Opus semantiline; resolver-v2=fallback |
| 9 | Hind / spec / laoseis | ✅ kõik korpus | ✅ [5] hind · [6] spec · [1] laoseis/churn→OOS | ⚠️ HIND VEVOR-lukus (`supplierId:"vevor"`, `WHERE vevor_sku IS NOT NULL`); spec L3-mall agnostiline; laoseis per-feed |

## Sõltuvus-järjekord

```
[1] laoseis/import → [3.5] title-strip → [4] classify → [5] hind → [6] spec →
[6.5] sisu+SEO (vajab puhas title + glossary + spec) →
A2 sünonüümid/variandid (vajab valmis ET-sisu) → [7] reindeks
Phase-2: ristkuvamine
```

**Kus oleme:** [1]–[6.5]+[7] LIVE öises cronis (03:00, rc=0 tõestatud 2026-09-20).
Plaani `title→glossary→sisu→sünonüümid`: **3 esimest VALMIS+torus, oleme A2 (sünonüümid) kohal = järgmine.**

## AUGUD (kõik = VAJA ÄRA TEHA; ükski pole "pood katki")

1. **🔴 Sünonüümid/variandid (#5+#6) EI OLE hookis.** Suurim otsingu-automaatika-auk. Uus toode/feed
   ilma sünonüümideta → leitav ainult täpse sõnaga. Backfill ka vana. = plaani A2, järgmine.
2. **🔴 Glossary uus-termin-hook puudub** (LAHTINE stardipunktis). Feed toob uue EN-termini → generaator
   jätab vaikselt EN/valesti, keegi ei märka. Vajab propose-not-create review-bucketit. Multi-feed-kriitiline.
3. **⚠️ SEO pikkus = ainult promptis, MITTE jõustatud.** Väljundi-väravat pole (`content-write.mjs`).
4. **⚠️ Hind VEVOR-lukus päringu tasandil.** Mootor generic, päring VEVOR-scoped. 2. feed → vajab laiendust.
5. **⬜ Ristkuvamine = Phase-2, disain-only** (P4 outlet ankrus).

## Soovitus (prioriteet)

1. **A2 sünonüümid + glossary-uus-termini-hook KOOS** (üks review-bucket-muster, HARD RULE #5: transform+backfill+hook).
2. SEO-pikkuse-värav (odav valideerija content-write.mjs-i).
3. Hinna-päringu bränd-avamine (ootab tegelikku 2. feedi — pole veel kiireloomuline).
4. Ristkuvamine = Phase-2.

## Kinnitatud plaanis (muutumatu)

- Tõlke/sisu-plaan: loobu vigasest masintõlkest → EN-master → ET natiiv-SEO API-ga. ✅ kinnitatud.
- Järjekord: title-strip → glossary → sisu → sünonüümid. ✅ kinnitatud.
- Sisu-selg (1-4, 8, 9) automatiseeritud + bränd-agnostiline. Vundament tugev (~75% masinat).
- Vana juuni-masintõlge ASENDATUD (hash-tasandil 100%; sisu-valim veel tegemata kui soovitakse).
