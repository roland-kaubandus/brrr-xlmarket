# RAPORT — B-klassifikaator ETAPP 1 DRY-run (2026-10-06)

> Spec: `reports/b-klassifikaator-taisautomaatika-spets.md` §10 (ESIMENE ETAPP AINULT).
> **MITTE päris loomine, MITTE deploy, MITTE DB-kirjutus.** Ainult otsustusahela + väravate simulatsioon.
> Kood: `scripts/classify-chain-dryrun.mjs` · väljund: `reports/classify-chain-dryrun.json` · Fable-vahemälu: `reports/classify-chain-fable-cache.json`.

---

## Kokkuvõte

| mõõdik | väärtus |
|---|---|
| Klastrid / tooted | **13 / 40** |
| **MÜÜGIS** (leitav) | **40 / 40 (100%)** |
| **NÄHTAMATU** | **0** |
| Konsensus-tee (2 mudelit nõus) | 23 toodet (8 klastrit) |
| 2-of-3-tee (Fable viigimurdja) | 17 toodet (5 klastrit) |
| Madalaim ühine ülem (LCA) | 0 |
| new_l3-lahendusega klastrid | **5** |
| — neist väravad läbis (AUTO-CREATE lubatud) | **4** |
| — neist värav blokkis (→ turvaline fallback) | **1** |
| Fable-kutseid | 5 (in 7789 / out 3174 tok, **~$0.24**) |

**ETAPP 1 põhitulemus: ükski toode ei jääks nähtamatuks.** 40/40 saaks kodu — kas konsensuse, viigimurdja või (vajadusel) LCA/turvalise fallbacki kaudu. LCA-ooteruumi ega nähtamatut ei tekkinud, sest igas lahkheli-klastris leidis 2/3 enamus kodu.

---

## 1. Otsustusahela tee — kõik 13 klastrit

| klaster | n | tee ahelas | otsus | värav |
|---|--:|---|---|:--:|
| spu:10280 Lumber Rack (konsool-puiduriiul) | 9 | **2-of-3 (NEW)** · Fable=new_l3 | `new_l3` «Puiduriiulid» | ✅ |
| spu:13762 Laste jalgrattad | 8 | konsensus→assign | `…jalgrattad` | — |
| spu:17277 Päikesepaneeli hoiukotid | 4 | **konsensus→new_l3** | `new_l3` «Päikesepaneelide hoiu- ja kandekotid» | ✅ |
| spu:15229 LiFePO4 süvatsükli-aku | 3 | **2-of-3 (NEW)** · Fable=new_l3 | `new_l3` «LiFePO4 energiasalvestusakud» | ✅ |
| spu:16941 Paracord-nöör | 3 | **konsensus→new_l3** | `new_l3` «Paracord ja universaalnöörid» | ✅ |
| spu:10706 Luuahoidik + organisaator | 2 | konsensus→assign | `…koristuskarud` | — |
| spu:16937 Mängu-/söögilaud (2-ühes) | 2 | **2-of-3 (NEW)** · Fable=new_l3 | `new_l3` «Mängulauad» | 🛑 **dup** |
| spu:17092 Vee-aktiveeritav teibidosaator | 2 | konsensus→assign | `…pakkimis-sidumismasinad` | — |
| spu:17113 Vahukoore-sifoon | 2 | **2-of-3 (ASSIGN)** · Fable=referentsi pool | `…peo-serveerimisdispenserid` | — |
| spu:17166 Täispuhutavad põrkepallid | 2 | konsensus→assign | `…porke-ja-zorb-pallid` | — |
| spu:16546 Laste mänguostukäru | 1 | **2-of-3 (ASSIGN)** · Fable=kohtuniku pool | `…mangukoogid-ja-toidumangud` | — |
| spu:17106 Märgplaadisaag | 1 | konsensus→assign | `…plaadiloikurid` | — |
| spu:17290 Rulluv dokumendikäru | 1 | konsensus→assign | `…teenindus-utility-karud` | — |

**40-toote detailne tee:** `reports/classify-chain-dryrun.json` (klastrid[] + summary). Iga toode pärib oma klastri otsuse (ülevaatus klastrite kaupa = CLAUDE.md review-bucket nõue).

---

## 2. Viie lahkheli-klastri Fable-viigimurdja otsus

| klaster | kohtunik (Opus) | referents (Sonnet) | **Fable (viigimurdja)** | 2/3 tulemus |
|---|---|---|---|---|
| spu:10280 | assign → seinale-kinnitatavad | **new_l3** | **new_l3** «Puiduriiulid» (konsool-käpad ≠ tasandid) | → **new_l3** |
| spu:15229 | assign → sõidukiakud | **new_l3** | **new_l3** «LiFePO4 energiasalvestusakud» (tsükliline salvestus ≠ käivitusvool) | → **new_l3** |
| spu:16937 | assign → lauamängud | **new_l3** | **new_l3** «Mängulauad» (mööbel, mitte mäng) | → **new_l3** |
| spu:17113 | assign → baaritarvikud | assign → serveerimisdispenserid | **assign → serveerimisdispenserid** | → **assign** (referentsi pool) |
| spu:16546 | assign → mänguköögid | **new_l3** | **assign → mänguköögid** (sama rollimängu-funktsioon) | → **assign** (kohtuniku pool) |

**🔎 Oluline leid — Fable mittedeterminism (thinking always-on):** kahe järjestikuse jooksu vahel andis Fable spu:10280 (lumber rack) ja spu:17113 (vahukoore-sifoon) kohta **erineva** vastuse. See kinnitab spec'i eeldust: **üksik Fable-kutse on viigimurdja, MITTE tõe-allikas.** Ahel on tõenäosuslik. Vahemälu (`classify-chain-fable-cache.json`) külmutab tulemuse reprodutseeritavaks; spec §6 **struktuurne enesekontroll** (merge-judge/grab-bag jälg + isekohanduv lävi, inimeseta) on just see mehhanism, mis sellist müra pikas jooksus tasandab. **Soovitus ETAPP 2-le:** piiripealsetel (nt 17113 overlap-paar) → Fable 3× + hääletus, või signaali-kuhjumine enne auto-create't.

---

## 3. L3 auto-loomise väravad — 5 kandidaadi DRY-run

> Väravad §4: **DUP** (considered_l3s olemas?) · **über-frag** (parent-L2 olemas, uut L2 ei looda) · **nime-reegel** (eestikeelne nimi) · **merge/grab** (jookseks PÄRAST loomist, DRY ei käivita).

| kandidaat | parent-L2 | DUP | über-frag | nimi | merge/grab | **tulemus** |
|---|---|:--:|:--:|:--:|:--:|---|
| **Puiduriiulid** (×9) | v4-ladu | ✓ | ✓ | ✓ «Puiduriiulid» | DRY | ✅ **AUTO-CREATE lubatud** |
| **Päikesepaneelide hoiu- ja kandekotid** (×4) | v4-ladu | ✓ | ✓ | ✓ | DRY | ✅ **AUTO-CREATE lubatud** |
| **LiFePO4 energiasalvestusakud** (×3) | v4-autovaruosad | ✓ | ✓ | ✓ | DRY | ✅ **AUTO-CREATE lubatud** |
| **Paracord ja universaalnöörid** (×3) | v4-tööriistad | ✓ | ✓ | ✓ | DRY | ✅ **AUTO-CREATE lubatud** |
| **Mängulauad** (×2) | — | ✗ | ✓ | ✓ | DRY | 🛑 **DUP-värav BLOKK** → fallback |

**🛑 spu:16937 (Mängulaud) blokeeriti õigesti:** kohtunik valis sellele algselt `assign` (ei täitnud `considered_l3s`), ja uue otsuse `new_l3` sünnitas Fable — aga **ilma considered_l3s tõendita** ei suuda DUP-värav kinnitada, et ükski olemas-L3 ei sobi (spec B2: *tühi considered → pead valima assign_existing*). Väravate käitumine = **õige konservatiivsus**: parem jätta olemas-koju (kohtuniku `lauamängud`, turvaline vaikimisi) kui luua L3 tõendamata. Toode jääb **müügis** `lauamängud`-is kuni signaal-kuhjumine (§5) kogub koherentse klastri + täieliku DUP-tõendi. **Fallback ≠ nähtamatu.**

**merge/grab DRY:** 4 lubatud kandidaadil jookseks ETAPP 2-s pärast loomist `merge-judge` (kas kõrval-L3 sama tüüp?) + `grab-bag` (kas heterogeenne?). DRY-s ei käivitatud (API-kutse + päris-L3 vaja).

---

## 4. Müügis vs nähtamatu

| seisund | tooteid | % |
|---|--:|--:|
| **MÜÜGIS** (konsensus / 2-of-3 assign / auto-create L3) | **40** | **100%** |
| — konsensus-assign olemas-L3 | 16 | |
| — 2-of-3 assign olemas-L3 (17113, 16546) | 3 | |
| — auto-create uus L3 (väravad ✅: 10280, 17277, 15229, 16941) | 19 | |
| — fallback olemas-L3 (16937, värav-blokk → turvaline) | 2 | |
| **NÄHTAMATU** | **0** | 0% |
| LCA-ooteruum | 0 | |

**Ükski toode ei kaoks.** Isegi ainuke värav-blokk (Mängulaud ×2) jääb müügis turvalises olemas-kodus. LCA-d ega nähtamatut ei vajatud — see tekiks alles siis, kui kõik 3 mudelit valiksid täiesti eri harud (ETAPP 1 valimis ei juhtunud).

---

## 5. Erinevus spec §B4 ennustusest (aus raport)

Spec §9/§B4 ennustas 4 taksonoomia-auku. Sõltumatu ahel (eriti Fable) lahendas **3 neist teisiti**:

| §B4 ennustus | ETAPP 1 tegelik | miks |
|---|---|---|
| Lumber rack → new_l3 | **new_l3 ✓** (aga mittedeterministlik — 1 jooks andis assign) | Fable kõikus variant↔eri-tüüp |
| LiFePO4 → new_l3 | **new_l3 ✓** | stabiilne |
| Mängulaud + ostukäru → new_l3 | Mängulaud→new_l3 (blokk) · **ostukäru→assign** | ostukäru: Fable=variant (rollimäng) |
| Vahukoore-dosaator → overlap-signaal | **assign → serveerimisdispenserid** | Fable lahendas overlap'i otse (ei jäänud lahtiseks) |
| *(ennustamata)* | **Päikesepaneeli kotid + Paracord → konsensus-new_l3** | kohtunik+referents juba nõus — tugevaim kandidaat |

**Järeldus:** sõltumatu kolme-mudeli triangulatsioon annab täpsema pildi kui kohtunik-hindab-kohtunikku. Kaks tugevaimat auto-create kandidaati (päikesepaneeli-kotid, paracord) tulid **konsensusest** — ei vajanud isegi viigimurdjat.

---

## Staatus
**ETAPP 1 (DRY) VALMIS.** ETAPP 2 (päris L3-loomine väravatega + 4-sammu deploy + Telegram/undo) = **järgmine, ootab eraldi käsku.** Midagi DB-s/stagingus EI muudetud.
