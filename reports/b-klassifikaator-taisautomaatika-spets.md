# SPETS — Klassifikaatori täisautomaatika (B)

> **Staatus:** ✅ KINNITATUD 2026-10-06 (Tarmo, 3 parandusega: (1) kalibreerimine INIMESETA — kuldvalim eemaldatud §6; (2) HOLD → madalaim ühine ülem §2b; (3) deploy-turvavõrk §4b). Koostatud 2026-10-06 (Tarmo direktiiv "B — üks terviklik spets"). **ETAPP 1 = DRY-run (§10).**
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
                                          ║         ┌─────────── MADALAIM ÜHINE ÜLEM (LCA, §2b) ──────────┐
                                          ║         │ mudelite valikute ühine esivanem puus:               │
                                          ║         │  • ühine L2 → paiguta L2 "muud"-koju (müügis+leitav)  │
                                          ║         │  • ühine L1 → paiguta L1 "muud"-koju                  │
                                          ║         │  • ühist ülemat EI OLE (ka L1-s) → NÄHTAMATU + digest │
                                          ║         │ + taksonoomia-signaal (§5) · L3 tekib → AUTO-LIIGUTA  │
                                          ║         └───────────────────────────────────────────────────────┘
                                          ╚══════════════════════════════════════╝
```

**Põhimõtted:**
- **Kohtunik+referents nõus → Fable EI kutsuta** (kulu-säästlik; enamik juhte).
- **Fable AINULT lahkhelil** — raskeimad juhtumid vajavad tugevaimat otsustajat (mitte Haiku).
- **Kõik 3 eri meelt → MADALAIM ÜHINE ÜLEM (§2b), MITTE HOLD-pimedus.** Toode paigutatakse kõrgeimale tasemele, milles mudelid on nõus (L2/L1 "muud"-koju) → **müügis ja leitav**. Täiesti nähtamatu AINULT kui ühine ülem puudub ka L1-s. Signaal (§5) kogutakse; kui sobiv L3 tekib → masin **liigutab automaatselt**.
- **Inimene näeb Telegramis** iga auto-loomise + iga nähtamatu-juhu (nähtavus), saab **undo** (tagasipööratavus). Eel-kinnitust ega inimese-järjekorda EI ole.

---

## 2b. MADALAIM ÜHINE ÜLEM (LCA) — kui mudelid ei lepi L3 osas (Tarmo 2026-10-06, HOLD-pimeduse asemel)

Kui 3 mudelit valivad eri L3 (või eri new_l3), aga nende valikutel on **ühine esivanem** taksonoomia-puus → toode läheb **sinna**, mitte pimedasse HOLD-i. Eesmärk: **iga toode on müügis ja leitav**, isegi enne kui õige L3 olemas on.

**Algoritm (puu-ülem leidmine):**
1. Võta kõigi 3 mudeli siht-L3-de (või new_l3 kavandatud vanem-L2) **mpath-ülemad**.
2. **Ühine L2** olemas → paiguta toode selle L2 **"Muud / määramata"-koju**.
3. Ühist L2 pole, aga **ühine L1** → paiguta L1 "Muud"-koju.
4. Ühist ülemat ka L1-s pole (nt üks ütleb Tööriistad, teine Lemmikloomad) → **NÄHTAMATU** (jääb paigutamata) → digest näitab trendi (haruldane; viitab tõsisele ebaselgusele).

**"Muud"-kodu lahendus (taksonoomiaga kooskõlas, põhjendatud):**
- **Kui taksonoomia LUBAB tooteid L2-tasemel** (L2-l võib olla otse-tooteid) → toode L2-külge otse, tüüp-silt metadata's (`pending_l3=true`).
- **Kui tooted PEAVAD olema L3-tasemel** (meie v4 invariant STRUCT: L2 = ainult L3-konteiner) → loo/kasuta **püsiv "`…-muud`" L3** iga L2 all (nt `v4-ladu-muud`). See EI ole grab-bag — see on **teadlik ooteruum** (metadata `holding_bucket=true`), mida inv-taxonomy + grab-bag-judge **ignoreerivad** (whitelist). Põhjendus: parem nähtav ooteruumis kui nähtamatu HOLD-is; HARD RULE #6 "ohutu vaikimisi = nähtav + tagasipööratav".
- **Valik v4 jaoks:** meie STRUCT-invariant nõuab L3-taset → **`…-muud` holding-L3 per L2** (whitelist `inv-whitelist.json`). Lõplik valik ehituse SAMM 3 juures, kui näeme kui palju tooteid LCA-sse satub (DRY-run annab arvu).

**AUTO-LIIGUTAMINE (kui sobiv L3 hiljem tekib):** iga LCA-paigutatud toode kannab `holding_bucket=true` + `candidate_signal_id`. Kui §5 signaal-kuhjumine loob uue L3, mis katab selle klastri → ahel **liigutab holding-tootest uude L3-sse automaatselt** (sama transform, deploy-turvavõrk §4b), Telegram. Ooteruum tühjeneb ise.

---

## 2c. ASÜMMEETRILINE KINDLUS — struktuuri muutev otsus nõuab stabiilsust, toote paigutus mitte (Tarmo 2026-10-06)

> **Põhiprintsiip:** toote PAIGUTAMINE olemas-L3-sse on tagasipööratav üksik-liigutus (undo = üks `UPDATE`). Uue L3 LOOMINE muudab STRUKTUURI (nav-puu, Meili-skeem, deploy mõlemale harule) — eksitus siin on kallis ja levib. Seega: **mida püsivam on otsuse tagajärg, seda rohkem sõltumatut kinnitust nõuame.** Fable on mittedeterministlik (tõestatud ETAPP 1-s: sama klaster andis järjestikustel jooksudel eri vastuse) → üksik Fable-kutse on viigimurdja, MITTE tõe-allikas; struktuuri-otsus ei tohi sõltuda ühest mündiviskest.

**Kolm rada, kolm kindlus-nõuet:**

| otsus | päritolu | Fable-nõue | kui nõue ei täitu |
|---|---|---|---|
| **assign_existing** | konsensus (kohtunik+referents sama L3) | **0 kutset** | — (kohe assign) |
| **assign_existing** | 2/3 enamus (lahkheli, viigimurdja = assign) | **1 kutse** (viigimurdja) | — (paigutus ei vaja stabiilsust) |
| **new_l3** | konsensus (kohtunik+referents MÕLEMAD new_l3) | **1 kutse** (kinnitus) | kinnitus = assign → konservatiivne fallback olemas-koju (Fable pakutud target või LCA) + signaal |
| **new_l3** | viigimurdja (lahkheli, viigimurdja = new_l3) | **3 kutset, enamus** (≥2/3 new_l3) | enamust pole → toode olemas-koju (assign-enamus või LCA) + signaal kogunema, **MITTE uus L3** |

**Loogika sõnades:**
- **Paigutus on odav ja pöörduv** → üks Fable-hääl piisab (või konsensus ilma Fableta).
- **Struktuur on kallis ja püsiv** → `new_l3` viigimurdja kaudu (= ainult ÜKS inim-proxy mudel tahtis uut L3) nõuab **3× sõltumatut Fable-häält, enamus otsustab**. Kui 3 jooksu ei anna ≥2 new_l3 → mittedeterminism tähendab, et tüüp **pole piisavalt stabiilselt eristuv** → toode läheb olemas-koju (Fable assign-enamus VÕI LCA §2b) ja **taksonoomia-signaal (§5) kogub**, kuni muster on selge → siis auto-loomine.
- **Konsensus-`new_l3`** (mõlemad inim-proxy mudelid juba nõus) on tugev → piisab **1× Fable-kinnitusest**. Kui kinnitus vaidleb vastu (ütleb assign) → konservatiivne: ära loo, pane olemas-koju + signaal.

**Why (HARD RULE #6 kooskõla):** masin töötab ise, aga struktuuri-plahvatus on peamine triivi-oht. Asümmeetria hoiab auto-paigutuse sujuva (odav rada, enamik tooteid) JA struktuuri-muutuse stabiilse (kallis rada, 3× hääl). Mittedeterminism ei tekita enam juhuslikke L3-sid — ta lükkab kahtluse signaali-kuhjumisse (nähtav, tagasipööratav), mitte inimese järjekorda.

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
| 3 | **Nime-reegel + KLIENDI-ARUSAAMINE** — parim Eesti nimi LOOMISHETKEL (Eesti etalon: 1a.ee/ajtooted.ee/…) **JA** kliendi-arusaamise kontroll: (1) seg-aetavus (2) **termin-ees-keeld (3a)** (3) **sirvimistasand (3b)** (vt all) | nimi kukub → mudel pakub uue, värav kontrollib uuesti (max 3×); ikka kukub → fallback olemas-koju |
| 3.5 | **TÄIELIKKUS-VÄRAV (HARD RULE #5, Tarmo 2026-10-06)** — uus L3 saab AUTOMAATSELT KÕIK, mis olemas-L3-del on (vt all: pilt·ET+EN·slug·SEO·nav·Meili) | ükskõik mis puudu → **värav kukub, L3 jääb LOOMATA, tooted olemas-koju**. Mitte poolikut kategooriat poodi. |
| 4 | **DB-migratsioon** — loo L3 mpath+handle (transaktsioonis, ON_ERROR_STOP) | SQL-viga → ROLLBACK |
| 5 | **invariandid** (23 kontrolli: SEG/DUP/STRUCT/NAME/WIDTH/ORPHAN/COMPLETE + pilt INV-20/21/26) — **PÄRIS-FAIL: `scripts/check-taxonomy-invariants.mjs`** (`inv-taxonomy.mjs` on spetsis kasutatud alias, seda faili EI OLE — ehita `check-taxonomy-invariants.mjs` vastu) | FAIL → ROLLBACK + Telegram |
| 6 | **`lock-harness.mjs post`** (distinct säilinud · mpath terve · struktuur-muutus→push · Meili värske) | FAIL → ROLLBACK + Telegram |
| 7 | **`grab-bag-judge.mjs`** uuel L3-l (kas tahtmatult heterogeenne?) | WARN (ei blokeeri; logi) |
| 8 | **`merge-judge.mjs`** uus L3 vs õed (kas üle-fragmenteerisime?) | KÕRGE verdikt → **REVERT loomine**, assign lähimasse õde-L3 (nagu Piirdepostid-pretsedent) |
| 9 | **4-sammu deploy** (CLAUDE.md): SSoT-regen `genyM` → Meili reindeks → `git push taxonomy-v4` → Coolify redeploy | samm puudu → nav stale; harness samm 6 püüab push-lünka |
| 10 | **Telegram-teade + undo-handle** (L3 nimi · L2-vanem · N toodet · kandidaadid · batch_id) | — |

**🔤 NIMEVÄRAV — KLIENDI-ARUSAAMINE (gate #3 laiendus, Tarmo 2026-10-06):** lisaks eestikeelsuse-kontrollile hindab värav (LLM, Fable) iga uue L3-nime:
- **(1) Kas Eesti klient saab nimest KOHE õigesti aru, mis tooted seal on?**
- **(2) Kas nimi on segi aetav mõne OLEMAS-kategooriaga või tavakeele tähendusega?**

**Näide, mida värav PEAB püüdma:** «Puiduriiulid» — klient loeb "puidust **tehtud** riiulid" (riiul kui mööbel, materjal=puit), aga tegelikult on **puitmaterjali/saematerjali HOIUSTUS-riiulid** (konsool-käpad lauale/saematerjalile). Tähendus on seg-aetav → **FAIL** → mudel pakub selgema nime (nt «Saematerjali hoiuriiulid» / «Puidu laoriiulid»).

**(3a) TEHNILINE TERMIN/LÜHEND EI ALUSTA NIME (Tarmo 2026-10-06):** nime **esimene sõna** peab olema tavakeelne ja mõistetav — klient peab esimese sõna põhjal aru saama, mis tooted seal on. Tehniline termin/lühend/mudel-kood (LiFePO4, IP65, BMS, SKU-stiil) **EI tohi olla nime alguses**; kui vaja, läheb see täpsustusena **taha** (nt «LiFePO4 energiasalvestusakud» → **«Energiasalvestusakud (LiFePO4)»** — esimene sõna «Energiasalvestusakud» on arusaadav). *Põhjus: sirvija loeb vasakult; lühend ees = tühi pilk.*

**(3b) NIMI SIRVIMISTASANDIL, MITTE ÜHE TOOTETÜÜBI JÄRGI (Tarmo 2026-10-06):** nimi peab **mahutama tulevased sarnased tooted**, mitte kirjeldama ainult praegust ainsat alltüüpi. Kui kitsas nimi välistaks naaber-variandid, mille feed tõenäoliselt toob → laienda sirvimistasandi nimeni **AINULT kui DUP-värav lubab** (laiem nimi ei tohi kokku joosta olemas-L3-ga). Nt «Päikesepaneelide hoiu- ja kandekotid» → **«Päikesepaneelide tarvikud»** (mahutab hoidikud/kinnitused/juhtmed), kui ükski olemas-L3 pole juba «…tarvikud». Kui laiendus tekitaks DUP-i → jää kitsa (aga arusaadava) nime juurde.

**Need 3 alakontrolli (seg-aetavus · termin-ees · sirvimistasand) jooksevad SAMAS Fable-kutses** (üks nime-hindamine, kolm kriteeriumi). Kukub ükskõik milline → mudel pakub uue → recheck.

**Tsükkel:** kukkunud nimi → mudel pakub uue → värav kontrollib uuesti, **max 3 korda**. Kui 3 katse järel ikka segane → **fallback olemas-koju** (ei loo L3 segase nimega; toode müügis, signaal kogub kuni selge nimi tekib). Sama konservatiivsus nagu §2c: parem olemas-kodu kui segane uus struktuur.

**Undo:** iga auto-loomine logib ÜHE `review_decision_log` rea (actor=`auto-classifier`, channel=`pipeline`, batch_id, affected=loodud L3 + paigutatud tooted). `classifier-undo <batch_id>` → kustutab loodud L3, tooted tagasi HOLD-i, log `undone`. Sama muster nagu sünonüüm-undo (A).

**Kukkumis-granulaarsus (HARD RULE #5):** üksik toode/klaster kukub → **skip + jätka**, EI peata kogu pipeline'i. Süsteemne viga (API maas, kogu partii) → `exit!=0` + Telegram + degrade (laoseis jätkub, [[api-maas-degrade-otsus]]).

---

## 4.5 TÄIELIKKUS-VÄRAV — uus L3 saab AUTOMAATSELT KÕIK (HARD RULE #5, gate #3.5 detail)

> **Põhimõte (Tarmo 2026-10-06):** uus L3 EI tohi jõuda poodi poolikuna. Ta peab saama **automaatselt** kõik, mis olemas-L3-del on — muidu on tootel hind + import, aga kodu on katki (pildita kaart, tühi SEO, puuduv nav/facet) → **praktikas müügil olematu**. Täielikkus-värav kontrollib, et iga vara on **enne commit'i olemas**; ükski puudu → **ROLLBACK + tooted olemas-koju**, mitte poolik kategooria.

**Mida "täielik L3" tähendab (kontrollitud koodist, mitte oletus) — 11 kohustuslikku vara:**

| # | Vara | Allikas / väli | Kuidas uus L3 selle AUTOMAATSELT saab | Kontroll (invariant / fail) |
|---|---|---|---|---|
| 1 | **Handle/slug** (v4-scoped, unikaalne) | `product_category.handle` + generated.json `handle` | deriveeri L2-vanemast + ASCII-slug nimest (sama muster kui olemas-L3) | INV-03 (unikaalne handle) · STRUCT-01 |
| 2 | **ET nimi** | `taxonomy_node_translation` (et) + generated.json `name_et` | nimeväravast (gate #3, kinnitatud) | NAME-01 (pole inglise) |
| 3 | **EN nimi** | `taxonomy_node_translation` (en) + generated.json `name_en` | Fable tõlge ET→EN (sama kutse kui SEO, vt all) | — |
| 4 | **Nav-struktuur** (parent + level + lapsed) | generated.json `parent_handle`/`level`/`child_handles` | über-frag värav (gate #2) resolvib kehtiva L2 → `gen-category-tree.mjs` ehitab puu | INV-04 (puu = yaml) |
| 5 | **Pilt (hele valge taust)** | generated.json `image_path` + `image_source` (≠`none`) | **primaar:** `build-cat-thumbs-l3.mjs` → L3 top-toote pilt Meili/VEVOR CDN-ist → webp 400×400 valge taust (sharp flatten); **fallback:** Gemini `image-pipeline/orchestrator.mjs` (valge taust "#FFFFFF seamless"). Uuel L3-l on ALATI ≥3 toodet → top-toote pilt olemas → thumb deriveerub | **INV-20** (100% pilt) · **INV-21** (webp kettal) · **INV-26** (image_source≠none) |
| 6 | **webp-fail kettal** | `storefront/public/cat-thumbs/<handle>.webp` | samm 5 kirjutab faili | INV-21 |
| 7 | **SEO-tekst (ET+EN kirjeldus + tagline)** | generated.json `description_et/en` + `tagline_et/en` | **Fable-generaator** (uus samm — yaml-is on ainult placeholder "— products."): üks Fable-kutse → `{name_en, description_et, description_en, tagline_et, tagline_en}` nime+toodete põhjal | täielikkus-värav: kõik 4 välja mitte-tühjad + ≠placeholder |
| 8 | **Meili facet** (ancestors indekseeritud) | Meili `products` index `category_handles`/`ancestors` | tooted bind'itakse L3-le → `index-meilisearch.mjs` reindeks → facet tekib | INV-14 (Meili ancestors) · lehe tootearv Meili'st |
| 9 | **DB product_category rida** (mpath) | `product_category` + `taxonomy_node_meta` (v4-marker) | `seed-taxonomy-from-yaml.mjs` muster / otse-INSERT transaktsioonis (gate #4) | INV-04 · lock-harness mpath-terve |
| 10 | **Tooted seotud** (≥1, carousel ei peida) | `product_category_product` | §4 paigutus bind'ib klastri tooted uude L3-sse | INV-25 (carousel peidab 0-toote L3) |
| 11 | **Täis-deploy** (nav+Meili+git mõlemad harud) | 4-sammu deploy (§4 gate #9, §4b) | genyM SSoT-regen → Meili → push → redeploy | §4b D4 tervisekontroll |

**Värava loogika (enne §4 commit'i, transaktsiooni sees):**
1. Genereeri kõik varad **mällu/ajutisse** (SEO-tekst Fable'ist, EN-nimi, pildi-allikas resolve'itud, handle deriveeritud).
2. **Pilt-pre-check:** kas L3 top-tootel on Meili/CDN pilt (primaar) VÕI Gemini suudab genereerida (fallback)? Kumbki ei õnnestu → **värav kukub**.
3. **SEO-pre-check:** Fable tagastas 4 mitte-tühja välja (≠placeholder)? Ei → **värav kukub**.
4. Ükski vara puudu / genereerimata → **ROLLBACK (transaktsioon pole commit'itud), tooted → olemas-koju (LCA/assign), Telegram** («L3 X jäi loomata: puudu <vara>»).
5. Kõik 11 olemas → jätka gate #4 (DB-migratsioon) → … → gate #9 deploy. **Alles siis on L3 "valmis".**

**Jõustus (meta-reegel — reegel ilma kontrollita ei tööta):** täielikkus = `check-taxonomy-invariants.mjs` INV-20/21/26 (pilt) + INV-04/14 (nav/Meili) + INV-25 (0-toote) + `lock-harness.mjs post` (mpath+distinct+Meili-värske). Kui mõni invariant FAIL pärast loomist → §4 ROLLBACK + §4b D4 auto-rollback. **Proosa-lubadus "saab kõik" EI piisa — INV-d peatavad pool, enne kui pood seda näeb.**

---

## 4b. AUTOMAATSE DEPLOY TURVAVÕRK (Tarmo 2026-10-06)

Kui §4 lõi/muutis struktuuri (uus L3 / reparent / LCA-liigutus), järgneb **automaatne deploy mõlemale harule**, turvavõrguga igas etapis. Masin teeb selle ISE (HARD RULE #6), aga EI force-pushi ega jäta katkist seisu.

| samm | tegevus | turvavõrk kukkumisel |
|---|---|---|
| D1 | **Commit mõlemale harule** (HARD RULE #4): commit taxonomy-v4 → cherry-pick -x main-worktree'sse → push mõlemad | — |
| D2 | **Git-konflikt** (push rejected, lahknenud origin) | **FAIL-LOUD PEATUS + Telegram**, MITTE force-push. Struktuur-muutus jääb lokaalseks, DB-loomine tehakse undo-ga tagasi (§4 transaktsioon pole veel commit'itud VÕI classifier-undo). Inimene lahendab konflikti. **Kunagi `--force`.** |
| D3 | **4-sammu deploy** (genyM SSoT-regen → Meili reindeks → push → Coolify redeploy) | samm kukub → Telegram, deploy katkeb; DB+git on juba kooskõlas, aga nav/Meili stale → monitooring püüab |
| D4 | **Tervisekontroll PÄRAST deploy'd:** (a) `inv-taxonomy --json` 0 FAIL · (b) nav-puu sisaldab uut L3 (HTTP GET storefront) · (c) Meili doc-count ≥ elus-tooted-hälve · (d) uus L3 tagastab tooteid otsingus | **KUKKUMINE → AUTOMAATNE ROLLBACK** (`classifier-undo <batch_id>` → DB tagasi · git revert commit mõlemal harul · redeploy eelmine) **+ Telegram**. Pood jääb terveks. |
| D5 | **Telegram-kokkuvõte:** mis loodi/liigutati, SHA-d mõlemal harul, tervisekontroll ✅/rollback | — |

**Pärast cutover'it (prod = k33g, [[cutover-strateegia-a-otsus]]):**
- Praegu k33g = staging; deploy-sihtmärk on staging Coolify. **Cutover järel sama k33g box = PROD** (domeeni-swap, sama konteinerid) → deploy-turvavõrk **ei muutu mehhaaniliselt**, aga D4 tervisekontroll muutub **KRIITILISEKS** (viga on nüüd live-poes, mitte staging'us).
- **Lisa prod-rangus:** (1) D4 tervisekontroll jookseb **enne** Coolify `redeploy` lõplikku lülitust (blue-green: uus konteiner tervisekontroll → alles siis traffic-swap; kui Coolify toetab health-gate'i); (2) rollback-aken logitakse (HARD RULE #7: ära redeploy enne logide salvestamist — rollback salvestab `docker logs` enne recreate'i); (3) struktuur-muutus prod-is → Telegram **enne JA pärast** (mitte ainult pärast), et Tarmo näeks reaalajas. Auto-loomine jääb lubatuks (HARD RULE #6), aga nähtavus on prod-is tihedam.
- **Undo prod-is:** `classifier-undo` + git-revert + redeploy on identne; ainus vahe — rollback puudutab live-liiklust, seega D4 blue-green väldib vahepealset katkist seisu.

---

## 5. TAKSONOOMIA-SIGNAAL + SUHTELINE KUHJUMIS-LÄVI (c)

**Ehitatud alus:** `taxonomy_overlap_signal` (sümmeetriline dedup, hits++) + `overlap-signal.mjs` + kalibreerimis-lahknevused → digest.

**Kaks signaali-tüüpi:**
1. **AUK** (gap): tooted läksid LCA-ooteruumi (§2b), sest ükski olemas-L3 ei sobi (kõik mudelid new_l3 aga eri nimi, VÕI kõik eri meelt). Kogutakse klastrisse semantilise sarnasuse järgi. **Tooted on müügis** (L2/L1 "muud"-kodus), signaal kogub kuni L3 tekib → auto-liigutus.
2. **KATTUVUS** (overlap): kohtunik vs referents valisid eri olemas-L3 samale tootele → paar (merge/selgituse kandidaat).

**🔑 SUHTELINE kuhjumis-lävi (nõue 3 — SAMA loogika nagu granulaarsus b, MITTE "N korda"):**
LCA-ooteruumi klaster käivitab **auto-loomise uuesti** (mitte inimese) kui:
- klaster on **sisemiselt koherentne** (üks tüüp — `grab-bag-judge` madal heterogeensus), JA
- klastri **semantiline kaugus lähimast olemas-L3-st ≥ tüüpiline õdede-L3 kaugus** (sama mõõdupuu kui §3).

→ st **mitte** "nähtud 5 korda", vaid "klaster on nüüd sama eristuv ja koherentne kui tüüpiline olemas-L3". Üks väga eristuv toode võib ületada; viis ähmast ei pruugi. Kui lävi täitub → §4 värav-ahel jookseb automaatselt.

**KATTUVUS-signaal** kuhjub analoogselt: kui sama L3-paar kogub kattuvusi ja `merge-judge` annab kõrge verdikti (sama funktsioon+väljund) → **auto-merge-ettepanek** §4-sarnaste väravatega; madal verdikt (eri funktsioon) → jäta lahku, logi selgituse-vajadus.

---

## 6. KALIBREERIMINE (kui "õige vastus" on taksonoomia-küsimus)

**Probleem:** pole absoluutset tõde. Lihtne kokkulangevus EKSITAB — tõestatud: Opus-hindab-Opust = 22.5% VALE, sõltumatu Sonnet-5 = 42.5% (korrelatsioon peitis lahkhelid).

**Plaan — INIMESETA (Tarmo 2026-10-06: kuldvalim/adjudikatsioon EEMALDATUD). Kaks kihti, mõlemad automaatsed:**

1. **Fable-rubriik (automaatne, jooksev):** Fable-5 (tugevaim, sõltumatu) hindab perioodiliselt lahkheli- ja auto-loodud-valimit. Mõõdab **mitte kokkulangevust vaid OTSUSE-KVALITEETI** rubriigil (iga punkt 0–2):
   - kas granulaarsuse-reegel rakendus järjepidevalt (kohtunik vs referents varieeruvus)?
   - kas auto-loodud L3-d on õdedest eristuvad (`merge-judge` madal)?
   - kas auto-assign'id on puhtad (`grab-bag-judge` madal siht-L3-l)?
   - kas LCA-paigutused (§2b) olid põhjendatud (ülem tõesti ühine)?
   - Fable = **sõltumatu kõrgeim kohtunik**, mitte inimese-asendus: kui Fable-rubriik langeb alla läve → auto-rekalibratsioon (prompt/lävi), MITTE inimene.
2. **Struktuurne enesekontroll (jooksev, inimeseta):** iga auto-loodud L3 → `merge-judge` + `grab-bag` jälg. Uued L3-d koguvad **kõrgeid merge-verdikte** → granulaarsuse-lävi liiga peen → **auto-pingutus** (tõsta semantilise kauguse nõuet). Liiga palju LCA/nähtamatut → lävi liiga jäme → lõdvenda. Isekohanduv, nagu Meili doc-count värav (CLAUDE.md: "valideerimise väravad EI TOHI fikseeritud numbreid").

**Miks inimeseta töötab (puudub absoluutne tõde):** süsteem ei vaja "õiget vastust" — ta vajab **stabiilsust ja sisemist järjepidevust**. Kolm sõltumatut mudelit (Opus/Sonnet/Fable) + struktuursed kontrollid (merge/grab-bag/inv) annavad **triangulatsiooni**: kui kõik kolm + struktuur nõustuvad, on otsus usaldusväärne; kui lahknevad, läheb toode LCA-ooteruumi (nähtav, tagasipööratav) ja signaal kogub, kuni muster on selge. Viga ei ole püsiv — undo + auto-liigutamine parandab hiljem. See ongi HARD RULE #6: nähtavus + tagasipööratavus asendavad eel-kinnituse JA inimese-kalibratsiooni.

**Kuluhinnang kalibreerimisele:** Fable-5 ($10/$50 per 1M) valimil ~40 klastrit × ~2k in + ~0.5k out ≈ $0.8/jooks + 50% batch. Harv (nädalane/verstapost).

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

## 10. EHITUS-JÄRJEKORD (Tarmo kinnitas 2026-10-06; ESIMENE ETAPP = DRY-run)

**ETAPP 1 (DRY-RUN, KINNITATUD — ehitatakse esimesena, MITTE päris loomine/deploy):**
1. Granulaarsuse prompt-tekst (§3) → `judge.mjs` kohtunik+referents (sama tekst).
2. Fable-viigimurdja haru (§2) + LCA madalaim-ühine-ülem loogika (§2b) → DRY (otsustab, ei kirjuta).
3. **DRY-run otsustusahel 40 pending peal** → raport: iga toote tee (konsensus / 2-of-3 / LCA / nähtamatu).
4. **DRY-run L3 auto-loomise väravad 4 kandidaadil** (DUP + über-frag + merge-judge sim; MITTE DB-loomine, MITTE deploy).

**ETAPP 2+ (pärast DRY-run ülevaatust):**
5. Auto-L3 värav-ahel (§4) `classify-create.mjs` (transaktsioon + 10 väravat + undo) + deploy-turvavõrk (§4b).
6. Suhtelise läve arvutus (§5) — semantiline kaugus õdede vs klaster (embeddings VÕI LLM-paar).
7. Backfill (§8a) 40 pending → hook [4] (§8b) → multi-feed bränd-SSoT (§8c).
8. Kalibreerimis-mõõdik (§6, Fable-rubriik + struktuurne, INIMESETA) + digest-integratsioon.

---

**Seotud:** `reports/otsused-kalibreerimine-2026-10-06.md` · [[syn-konsensus-klassifikaator-kalibreerimine]] · [[b-disain-opus-klassifikaator-feed]] · [[956-autopaigutus-pipeline-leiud]] · [[over-frag-guard-l2]] · [[api-maas-degrade-otsus]] · CLAUDE.md §KATEGOORIA-PAIGUTUS + §AUTO-KLASSIFIKAATOR.
