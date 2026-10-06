# SPETS — Klassifikaatori täisautomaatika (B)

> **Staatus:** DISAIN (koodita). Koostatud 2026-10-06 (Tarmo direktiiv "B — üks terviklik spets").
> **Eelkäija:** [[b-disain-opus-klassifikaator-feed]] (2026-07-22) · kalibreerimine `reports/otsused-kalibreerimine-2026-10-06.md` · `reports/calib-reference-classify-POST.md`.
> **Reegel-raamistik:** HARD RULE #6 (masin ise, nähtavus+undo asendab eel-kinnituse) · #5 (üks transform, backfill+hook+multi-feed) · #4 (mõlemad harud) · #8 (test-identiteet).
>
> **⚠️ REEGLI-MUUTUS:** see spets **ASENDAB** CLAUDE.md 2026-07-22 "PROPOSE-NOT-CREATE" reegli L3-loomise osas. Vana: *cron EI loo L3, inimene kinnitab*. Uus (HARD RULE #6 kooskõla): **cron LOOB L3 automaatselt väravatega + Telegram + undo; Tarmo kinnitust EI nõuta.** Inimene = turvavõrk äärmuslikuks juhuks (kõik väravad kukkusid / kõik mudelid eri meelt).

---

## 1. EESMÄRK (üks süsteem, mitte kolm tükki)

Opus-klassifikaator asendab resolver-v2 feed-cron'is **ainsa primaar-paigutajana** ja **loob puuduvad L3-d ise**, täisautomaatselt, ilma inimese rutiinse sekkumiseta. (a) konsensus + viigimurdja, (b) suhteline L3-granulaarsus, (c) taksonoomia-signaal → auto-L3 on **üks otsustusahel**, mitte kolm eraldi funktsiooni.

**Miks üks süsteem:** sama granulaarsuse-reegel (b) otsustab nii üksiku toote paigutuse (assign vs new_l3) kui signaali-kuhjumise (c) — identne mõõdupuu. Konsensus (a) on mehhanism, mis seda reeglit kahe/kolme sõltumatu mudeliga rakendab.

---

## 2. OTSUSTUSAHEL (üks joonis)

```
  UUS TOODE  (feed-delta  VÕI  backlog/pending)
      │
      │  (klaster: sama vevor_product_type → üks otsus, mitte N korda — [[klassifikaator-partii-dup-idee]])
      ▼
 ┌─────────────────────────┐
 │ KOHTUNIK  Opus-4.8       │  → action (assign_existing | new_l3) + confidence
 │ (klastri-tasand)         │     + considered_l3s[2..5] + considered_reason + proposed_name?
 └─────────────────────────┘
      │
      ▼
 ┌─────────────────────────┐
 │ REFERENTS  Sonnet-5      │  → action (PIME: ei näe kohtuniku vastust)
 │ (sõltumatu, sama prompt) │     sama granulaarsuse-reegel
 └─────────────────────────┘
      │
      ▼
   ╔════════════ KONSENSUS? ════════════╗
   ║                                     ║
   ├─ MÕLEMAD → sama olemas-L3 ─────────▶ AUTO-ASSIGN  (kui conf ≥ lävi)
   │                                     ║
   ├─ MÕLEMAD → new_l3 (sama tüüp) ─────▶ AUTO-CREATE L3  → väravad (§4)
   │                                     ║
   └─ LAHKHELI (assign↔new_l3,          ║
   │   või eri olemas-L3) ──────────────▶  VIIGIMURDJA  Fable-5  (KÕIGE TUGEVAM)
   │                                     ║        │
   │                                     ║        ├─ nõustub ühega → 2/3 ENAMUS → selle tegevus
   │                                     ║        │       (assign → AUTO-ASSIGN; new_l3 → AUTO-CREATE §4)
   │                                     ║        │
   │                                     ║        └─ kolmas, eri vastus → KÕIK ERI MEELT
   │                                     ║                                      │
   └─ eri olemas-L3 (A vs B) ───────────▶ taxonomy_overlap_signal (hits++, §5)  │
                                          ║                                      ▼
                                          ║                         HOLD = ohutu vaikimisi
                                          ║                         (EI otsingusse, EI paiguta)
                                          ║                         + taksonoomia-signaal (§5)
                                          ╚══════════════════════════════════════╝
```

**Põhimõtted:**
- **Kohtunik+referents nõus → Fable EI kutsuta** (kulu-säästlik; enamik juhte).
- **Fable AINULT lahkhelil** — raskeimad juhtumid vajavad tugevaimat otsustajat (mitte Haiku).
- **Kõik 3 eri meelt → HOLD** (ohutu vaikimisi, HARD RULE #6 "mis sealtki jääb → ohutu vaikimisi"), MITTE inimese järjekord. Signaal kogutakse (§5); kui kuhjub → süsteem proovib ise uuesti (§5 lävi).
- **Inimene näeb Telegramis** iga auto-loomise + iga HOLD-i (nähtavus), saab **undo** (tagasipööratavus). Eel-kinnitust ei ole.

---

## 3. L3-GRANULAARSUSE REEGEL (prompt-tekst — MÕLEMAD mudelid kasutavad identset)

> Lisatakse `scripts/lib/judge.mjs` klassifikaatori-prompti JA referentsi-prompti **sõna-sõnalt sama tekstina** — mõlemad mudelid mõõdavad sama mõõdupuuga (nõue b). Viigimurdja Fable saab sama teksti.

```
L3-GRANULAARSUS — millal toode väärib OMA uut L3 vs olemas-naaber-L3:

Küsi: kas see tüüp erineb LÄHIMAST olemas-L3-st OSTJA-otsingu ja
funktsiooni/VÄLJUNDI mõttes nii palju, et ostja otsiks seda eraldi?

• ERI TÜÜP (→ new_l3): funktsioon VÕI väljund (tulem) erineb — ostja EI SAA
  toodet B asendada tootega A sama tulemusega.
  Nt: konsool-puiduriiul (kandekäpad) ≠ seinariiul (tasandid);
      LiFePO4 energiasalvesti (tsükliline salvestus) ≠ sõidukiaku (käivitusvool);
      helbejäämasin ≠ kuubikjäämasin (väljund erineb).

• VARIANT (→ assign_existing): sama funktsioon+väljund, erineb ainult
  vorm / suurus / materjal / paigaldus / energiaallikas — ostja otsib SAMA
  asja teises vormis.
  Nt: lae- vs seinaventilaator; torn- vs põrandaventilaator; pitsakivi vs -teras.

• SUHTELINE, MITTE absoluutne: ÄRA loe tooteid ("N tükki → uus L3").
  Otsusta SEMANTILISE KAUGUSE järgi lähimast olemas-L3-st:
   – kui kaugus ≥ tüüpiline kaugus olemas-õdede-L3-de vahel (sama L2) → OMA L3;
   – kui kaugus < see → variant → mine olemasolevasse.

• ENNE new_l3 KOHUSTUSLIK: täida considered_l3s (2–5 lähimat olemas-L3 handle)
  + considered_reason (miks semantiline kaugus liiga suur). Tühi considered →
  pead valima assign_existing (DUP-värav, B2).

• EKSKLUSIIVSUS- ja HÜBRIID-reeglid (CLAUDE.md §KATEGOORIA-PAIGUTUS) kehtivad
  granulaarsuse EES: ainult-laps/ainult-kommerts → segment-kodu; päris-kaheti →
  primaar sisust + cross-listing Phase-2.
```

**Miks prompt-tekstina, mitte koodina:** granulaarsus on semantiline otsus, mida kood ei suuda deterministlikult teha (tõestatud: keyword-recall 0%). LLM rakendab reeglit; kood **jõustab tulemuse** väravatega (§4).

---

## 4. AUTO-L3 LOOMISE VÄRAV-JÄRJESTUS (+ mis juhtub kui kukub)

Kõik ÜHES transaktsioonis (BEGIN…COMMIT); iga värav = enne-commit kontroll. Ükski kukub → **ROLLBACK + HOLD tooted + Telegram**, osa-seisu EI teki.

| # | Värav | Kukub → |
|---|---|---|
| 1 | **DUP-värav** (semantiline "kas L3 juba olemas mujal?" — B2 considered_l3s + cross-main) | leitakse vaste → **EI loo**, assign sinna L3-sse |
| 2 | **Über-frag guard L2** ([[over-frag-guard-l2]]) — ei loo uut L2 ühe L3 jaoks | kinnita olemas-L2 alla; pole sobivat L2 → HOLD + signaal |
| 3 | **Nime-reegel** — parim Eesti nimi LOOMISHETKEL (Eesti etalon: 1a.ee/ajtooted.ee/…); piiripealne → märgi nime-faasi | nimi puudu/kahtlane → loo `proposed_name`, lipp nime-ülevaatuseks (ei blokeeri) |
| 4 | **DB-migratsioon** — loo L3 mpath+handle (transaktsioonis, ON_ERROR_STOP) | SQL-viga → ROLLBACK |
| 5 | **`inv-taxonomy.mjs`** (23 invariant: SEG/DUP/STRUCT/NAME/WIDTH/ORPHAN/COMPLETE) | FAIL → ROLLBACK + Telegram |
| 6 | **`lock-harness.mjs post`** (distinct säilinud · mpath terve · struktuur-muutus→push · Meili värske) | FAIL → ROLLBACK + Telegram |
| 7 | **`grab-bag-judge.mjs`** uuel L3-l (kas tahtmatult heterogeenne?) | WARN (ei blokeeri; logi) |
| 8 | **`merge-judge.mjs`** uus L3 vs õed (kas üle-fragmenteerisime?) | KÕRGE verdikt → **REVERT loomine**, assign lähimasse õde-L3 (nagu Piirdepostid-pretsedent) |
| 9 | **4-sammu deploy** (CLAUDE.md): SSoT-regen `genyM` → Meili reindeks → `git push taxonomy-v4` → Coolify redeploy | samm puudu → nav stale; harness samm 6 püüab push-lünka |
| 10 | **Telegram-teade + undo-handle** (L3 nimi · L2-vanem · N toodet · kandidaadid · batch_id) | — |

**Undo:** iga auto-loomine logib ÜHE `review_decision_log` rea (actor=`auto-classifier`, channel=`pipeline`, batch_id, affected=loodud L3 + paigutatud tooted). `classifier-undo <batch_id>` → kustutab loodud L3, tooted tagasi HOLD-i, log `undone`. Sama muster nagu sünonüüm-undo (A).

**Kukkumis-granulaarsus (HARD RULE #5):** üksik toode/klaster kukub → **skip + jätka**, EI peata kogu pipeline'i. Süsteemne viga (API maas, kogu partii) → `exit!=0` + Telegram + degrade (laoseis jätkub, [[api-maas-degrade-otsus]]).

---

## 5. TAKSONOOMIA-SIGNAAL + SUHTELINE KUHJUMIS-LÄVI (c)

**Ehitatud alus:** `taxonomy_overlap_signal` (sümmeetriline dedup, hits++) + `overlap-signal.mjs` + kalibreerimis-lahknevused → digest.

**Kaks signaali-tüüpi:**
1. **AUK** (gap): tooted jäid HOLD-i, sest ükski olemas-L3 ei sobi (kõik mudelid new_l3 aga eri nimi, VÕI kõik eri meelt). Kogutakse klastrisse semantilise sarnasuse järgi.
2. **KATTUVUS** (overlap): kohtunik vs referents valisid eri olemas-L3 samale tootele → paar (merge/selgituse kandidaat).

**🔑 SUHTELINE kuhjumis-lävi (nõue 3 — SAMA loogika nagu granulaarsus b, MITTE "N korda"):**
HOLD-klaster käivitab **auto-loomise uuesti** (mitte inimese) kui:
- klaster on **sisemiselt koherentne** (üks tüüp — `grab-bag-judge` madal heterogeensus), JA
- klastri **semantiline kaugus lähimast olemas-L3-st ≥ tüüpiline õdede-L3 kaugus** (sama mõõdupuu kui §3).

→ st **mitte** "nähtud 5 korda", vaid "klaster on nüüd sama eristuv ja koherentne kui tüüpiline olemas-L3". Üks väga eristuv toode võib ületada; viis ähmast ei pruugi. Kui lävi täitub → §4 värav-ahel jookseb automaatselt.

**KATTUVUS-signaal** kuhjub analoogselt: kui sama L3-paar kogub kattuvusi ja `merge-judge` annab kõrge verdikti (sama funktsioon+väljund) → **auto-merge-ettepanek** §4-sarnaste väravatega; madal verdikt (eri funktsioon) → jäta lahku, logi selgituse-vajadus.

---

## 6. KALIBREERIMINE (kui "õige vastus" on taksonoomia-küsimus)

**Probleem:** pole absoluutset tõde. Lihtne kokkulangevus EKSITAB — tõestatud: Opus-hindab-Opust = 22.5% VALE, sõltumatu Sonnet-5 = 42.5% (korrelatsioon peitis lahkhelid).

**Plaan — kolm kihti, inimene AINULT ühekordselt:**

1. **Kuldvalim (ühekordne inimtöö — OK HARD RULE #6):** ~50 toodet, mille Tarmo **üks kord** adjudikeerib (assign vs new_l3 + õige L3). Saab fikseeritud mõõdupuuks. Korduvat inimtööd EI ole.
2. **Fable-referents mõõdikuna (automaatne, jooksev):** Fable-5 (tugevaim, sõltumatu) hindab perioodiliselt lahkheli-valimit. Mõõdame **mitte kokkulangevust vaid OTSUSE-KVALITEETI** rubriigil:
   - kas granulaarsuse-reegel rakendus järjepidevalt (varieeruvus kohtunik vs referents)?
   - kas auto-loodud L3-d on õdedest eristuvad (`merge-judge` madal)?
   - kas auto-assign'id on puhtad (`grab-bag-judge` madal siht-L3-l)?
   - Fable vs kuldvalim: kui Fable kaldub süsteemselt auto-otsuste vastu → promptI/läve rekalibratsioon.
3. **Struktuurne enesekontroll (jooksev, inimeseta):** iga auto-loodud L3 → `merge-judge` + `grab-bag` jälg. Kui uued L3-d hakkavad koguma **kõrgeid merge-verdikte** → granulaarsuse-lävi triivis liiga peeneks → **auto-pingutus** (tõsta semantilise kauguse nõuet). Kui liiga palju HOLD-i → lävi liiga jäme → lõdvenda. Isekohanduv, nagu Meili doc-count värav (CLAUDE.md: "valideerimise väravad EI TOHI sisaldada fikseeritud numbreid").

**Kuluhinnang kalibreerimisele:** Fable-5 ($10/$50 per 1M) lahkheli-valimil ~40 klastrit × ~2k in + ~0.5k out ≈ $0.8/kalibreerimisjooks + 50% batch. Harv (nädalane/verstapost).

---

## 7. KULUHINNANG (jooksev)

| komponent | mudel | / toode | märkus |
|---|---|---|---|
| kohtunik | Opus-4.8 ($5/$25) | ~$0.018 | klastri-tasand, cache-write põrand ~$0.1–0.4/sync |
| referents | Sonnet-5 ($3/$15) | ~$0.011 | iga toode (sõltumatu pime) |
| viigimurdja | Fable-5 ($10/$50) | ~$0.04 | **AINULT lahkhelil** (öine delta väike) |
| **tüüpiline öö** | — | — | ~100 uut toodet; lahkhelisid ~10–20% → Fable ~15× |

- **Tüüpiline öö:** kohtunik+referents 100 toodet ≈ **$2.9** + Fable ~15 lahkhelil ≈ **$0.6** → **~$3.5/öö** (sync, batch −50% → ~$1.75).
- **Backlog (40 pending + kogutud HOLD) ühekordne:** ~$1–2.
- **Stabiilne feed (vähe uut):** enamik sünke lähedal $0 (cache-põrand).
- Võrdlus: resolver-v2 = $0 aga **ei tunne uusi tüüpe** → kalastus/ladu/SDS HOLD-i → praktikas müügil olematud. $3.5/öö = õige paigutus + auto-kodud.

---

## 8. HARD RULE #5 — BACKFILL + HOOK + MULTI-FEED (üks transform, kolm kutsujat)

- **Transform (ÜKS kord):** otsustusahel §2 = `classifyCluster(cluster)` funktsioon `scripts/lib/judge.mjs`-s.
- **(a) BACKFILL:** praegused **40 pending** (18 klastrit) + kogutud HOLD → `classify-backfill.mjs --execute` kogu nimekirjal, ühekordne.
- **(b) ÖINE HOOK:** `import-pipeline.sh` samm **[4] classify** → SAMA `classifyCluster` **delta peal** (`/tmp/classify-skus.txt`, öö ~100), MITTE kogu 18k. Fail-loud Telegram, credit-degrade (rc=3 → skip LLM, laoseis jätkub). Asukoht: PÄRAST [3.5] title-strip (klassifikaator loeb puhast sisendit), ENNE [6.x] sünonüüm/sisu.
- **(c) MULTI-FEED:** bränd-teadlik `deriveBrandSlug` SSoT kaudu (MITTE VEVOR-hardcode) — Powermat/BlackTools/KraftDele toode läbib sama ahela; tüübi-tuvastus tehnilisest spetsist+pildist, mitte tootja-nimest (masintõlke-immuunsus, CLAUDE.md feed-põhimõtted).

**Resolver-v2 → fallback ainult** (API maas / kõik-eri-meelt HOLD asemel kiire ajutine paigutus). EI ole teine primaar-paigutaja (väldib triivi).

---

## 9. 4 PRAEGUST KANDIDAATI — mida süsteem teeks

| kandidaat (kalibreerimisest) | kohtunik | referents | → ahel §2 teeks |
|---|---|---|---|
| **Lumber rack (konsool) ×9** | assign → seinale-kinnitatavad-hoiususteemid (DUP-värav surus) | new_l3 | LAHKHELI → **Fable**. Funktsioon eristuv (kandekäpad ≠ tasandid) → tõenäoliselt new_l3 → 2/3 → **AUTO-CREATE "Puidu-/materjaliriiulid (konsool)"** ladu-L2 alla, väravad §4, 9 toodet, Telegram. |
| **LiFePO4 suuraku ×3** | assign → sõiduki-akud | new_l3 | LAHKHELI → **Fable**. Väljund eristuv (tsükliline salvestus ≠ käivitusvool). DUP-värav: energiasalvestus-L3 olemas? EI → **AUTO-CREATE "Energiasalvestus-/päikeseakud"**. |
| **Mängu-/söögilaud ×2** | assign → lauamängud | new_l3 | Hübriid (söögilaud+mäng). Granulaarsus piiripealne → **Fable**. Kui päris-kaheti → primaar sisust + cross-listing Phase-2; kui kõik eri meelt → HOLD + signaal. |
| **Laste mänguostukäru ×1** | assign → mänguköögid-ja-toidumängud | new_l3 | N=1 → **suhteline lävi (§5) otsustab**: üksik toode loob OMA L3 AINULT kui kaugus ≥ õdede-kaugus. Tõenäoliselt kaugus < lävi (mänguasi naabris) → assign VÕI HOLD+signaal kuni klaster koherentne. **Näitlikustab: 1 tükk ≠ automaatne L3.** |

→ Kattuvus-kandidaat (vahukoore-dosaator: baaritarvikud↔serveerimisdispenserid) = §5 KATTUVUS-signaal → merge-judge otsustab.

---

## 10. EHITUS-JÄRJEKORD (kui Tarmo spetsi kinnitab)

1. Granulaarsuse prompt-tekst (§3) → `judge.mjs` kohtunik+referents (sama tekst).
2. Fable-viigimurdja haru (§2) `judge.mjs`-sse + `REF_MODEL_*` kõrvale `TIEBREAK_MODEL=claude-fable-5`.
3. Auto-L3 värav-ahel (§4) `classify-create.mjs` (transaktsioon + 10 väravat + undo).
4. Suhtelise läve arvutus (§5) — semantiline kaugus õdede vs klaster (embeddings VÕI LLM-paar).
5. Kuldvalim (§6 samm 1) — Tarmo ühekordne adjudikatsioon.
6. Backfill (§8a) 40 pending → hook [4] (§8b) → multi-feed bränd-SSoT (§8c).
7. Kalibreerimis-mõõdik (§6 samm 2–3) + digest-integratsioon.

---

**Seotud:** `reports/otsused-kalibreerimine-2026-10-06.md` · [[syn-konsensus-klassifikaator-kalibreerimine]] · [[b-disain-opus-klassifikaator-feed]] · [[956-autopaigutus-pipeline-leiud]] · [[over-frag-guard-l2]] · [[api-maas-degrade-otsus]] · CLAUDE.md §KATEGOORIA-PAIGUTUS + §AUTO-KLASSIFIKAATOR.
