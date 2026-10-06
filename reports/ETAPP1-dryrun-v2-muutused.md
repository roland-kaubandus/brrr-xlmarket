# RAPORT — ETAPP 1 DRY-run v2: AINULT MUUTUSED (2026-10-06)

> DIRECTIVE 4 kaks parandust rakendatud → DRY-run korratud. **Raporteerin ainult muutused vs v1** (`reports/ETAPP1-dryrun-raport.md`).
> Kood: `scripts/classify-chain-dryrun.mjs` · väljund: `reports/classify-chain-dryrun-v2.json` · spec §2c + §4.
> **MITTE päris loomine, MITTE deploy, MITTE DB-kirjutus.** 40/40 toodet endiselt MÜÜGIS, 0 nähtamatut.

---

## Parandus 1 — ASÜMMEETRILINE KINDLUS (spec §2c)

**Reegel:** struktuuri muutev otsus (new_l3) nõuab stabiilsust, toote paigutus (assign) mitte.

| otsus | Fable-nõue | mis muutus |
|---|---|---|
| assign (konsensus) | 0 kutset | — |
| assign (2/3 viigimurdja) | 1 kutse | — (sama kui v1) |
| **new_l3 konsensusega** | **1× KINNITUS** | uus: solar + paracord said 1× Fable-kinnituse (mõlemad ✓) |
| **new_l3 viigimurdja kaudu** | **3× hääletus, enamus** | uus: lumber + LiFePO4 + mängulaud said 3× Fable-hääle |

### 🎯 Lumber rack (spu:10280) — PEAMINE MUUTUS

v1: üksik Fable-kutse → new_l3 (märkisime: mittedeterministlik, 1 jooks andis assign).
**v2: 3× hääletus = 2/3 new_l3** — ja täpselt nagu Tarmo kahtlustas, **hääl 2 pööras `assign`-iks**:

| hääl | tulemus |
|---|---|
| viigimurdja (hääl 1) | **new_l3** «Puiduriiulid» (konsool-käpad ≠ seinahoiusüsteem) |
| hääl 2 | **assign_existing** → seinale-kinnitatavad-hoiususteemid |
| hääl 3 | **new_l3** «Puidu- ja torumaterjali hoidikud» |

→ **2/3 enamus new_l3 → L3 luuakse.** Mittedeterminism on nüüd nähtav JA talutav: üksik münt ei otsusta struktuuri, enamus otsustab. (Kui oleks tulnud 1/3 → fallback olemas-koju + signaal, MITTE L3.)

### LiFePO4 (spu:15229) — stabiilne

**3/3 new_l3** (kõik 3 häält «LiFePO4 energiasalvestusakud»). Stabiilne tüüp → kindel auto-create. Muutus vs v1: nüüd 3× kinnitatud, mitte üksik kutse.

### Mängulaud (spu:16937) — 3/3 new_l3, AGA ikka DUP-blokk

**3/3 new_l3** «Mängulauad», aga kohtunik ei andnud `considered_l3s` → **DUP-värav blokeerib** (sama õige konservatiivsus kui v1) → fallback `assign:lauamängud`, müügis. Asümmeetria ei muutnud tulemust (värav otsustab), aga kinnitas et Fable on selle tüübi osas stabiilne → signaali-kuhjumine (§5) võib hiljem L3 luua, kui täielik DUP-tõend koguneb.

---

## Parandus 2 — NIMEVÄRAV: KLIENDI-ARUSAAMINE (spec §4 gate #3)

**Reegel:** (1) kas Eesti klient saab nimest kohe aru, mis tooted? (2) kas segi aetav olemas-kategooria/tavakeelega? Kukub → mudel pakub uue → max 3× → fallback.

### 🎯 «Puiduriiulid» → PÜÜTUD (täpselt Tarmo näide)

| katse | nimi | verdikt |
|---|---|---|
| 1 | **Puiduriiulid** | ❌ **FAIL** — "klient loeb *puidust tehtud mööbliriiulid*, aga tegelikult saematerjali hoiustus-riiulid (konsool-käpad)". Segi aetav: *puidust tehtud riiulid*. |
| 2 | **Saematerjali hoiuriiulid** | ✅ OK — "ütleb üheselt: riiulid saematerjali/puidu hoiustamiseks". |

→ **Lõplik nimi: «Saematerjali hoiuriiulid».** Värav töötas täpselt nii nagu direktiiv nõudis.

### Teised 3 uut nime — kõik selged (pass 1. katsel)

| nimi | verdikt |
|---|---|
| Päikesepaneelide hoiu- ja kandekotid | ✅ selge |
| LiFePO4 energiasalvestusakud | ✅ selge |
| Paracord ja universaalnöörid | ✅ selge |

---

## Lisaleid — ÜBER-FRAG VÄRAV OLI KATKI (parandatud, kriitiline ETAPP 2-le)

DRY-run v2 paljastas, et **Fable vaba-teksti `parent_l2_handle` ei ole usaldusväärne**:
- Lumber rack sai pakutud vanema **`v4-ladu`** — see handle **EI EKSISTEERI** NODES-is (see on main-slug, mitte L2).
- LiFePO4 v1-vanem oli **`…aku-soiduki-ja-mootorrattaakud`** — see on **L3 (level 3)**, mitte L2.
- v1 konsensus-klastrid (solar, paracord) said vanemaks **mainid** (`v4-ladu`, `v4-tööriistad`) — samuti kehtetud L2-d.

Vana über-frag lasi need läbi (`siblingCount=null → pass`). **ETAPP 2-s oleks loonud orvu-L3 kehtetu/L3-vanema alla → STRUCT-rike / katkine nav.**

**Parandus (`scripts/classify-chain-dryrun.mjs`):**
1. `isRealL2(h)` — vanem peab olema NODES-is, `level===2`, ≥1 L3-lapsega. Muidu über-frag **FAIL → HOLD/fallback**.
2. `resolveParentL2(proposed, anchors)` — valideeri mudeli pakutu; kehtetu → tuleta **anchor-L3-de (considered + judge/ref target) enamus-L2**.

**Tulemus — kõik 4 uut L3 nüüd kehtiva, semantiliselt õige L2 all:**

| uus L3 | v1 vanem (kehtetu) | **v2 vanem (kehtiv L2)** |
|---|---|---|
| Saematerjali hoiuriiulid ×9 | `v4-ladu` (puudub) | **`v4-ladu-riiulid-restid`** (Riiulid ja restid — metallriiulid/lae-restid pere) |
| Päikesepaneelide hoiu- ja kandekotid ×4 | `v4-ladu` (puudub) | **`…taastuvenergia-ja-generaatorid`** (L2) |
| LiFePO4 energiasalvestusakud ×3 | `…soiduki-akud` (L3!) | **`…taastuvenergia-ja-generaatorid`** (L2) |
| Paracord ja universaalnöörid ×3 | `v4-tööriistad` (puudub) | **`…matkavarustus-ja-telkimine`** (L2) |

---

## Muutumatu (kinnituseks)

- **40/40 MÜÜGIS, 0 nähtamatut** (sama kui v1).
- Konsensus-assign klastrid (jalgrattad, koristuskärud, teibidosaator, põrkepallid, plaadisaag, dokumendikäru) — muutumatu.
- 2-of-3 assign (vahukoore-sifoon → serveerimisdispenserid; laste-ostukäru → mänguköögid) — muutumatu, 1 Fable-kutse.
- Mängulaud fallback → lauamängud, müügis — muutumatu (DUP-blokk).

---

## Kokkuvõte — mis ETAPP 2-s luuakse (plaan Tarmole, ENNE päris-jooksu)

| # | uus L3 nimi | L2-vanem | tooteid | päritolu | nimevärav |
|---|---|---|--:|---|---|
| 1 | **Saematerjali hoiuriiulid** | Riiulid ja restid (`v4-ladu-riiulid-restid`) | 9 | viigimurdja 2/3 | parandatud («Puiduriiulid»→) |
| 2 | **Päikesepaneelide hoiu- ja kandekotid** | Taastuvenergia ja generaatorid | 4 | konsensus +1× kinnitus | selge |
| 3 | **LiFePO4 energiasalvestusakud** | Taastuvenergia ja generaatorid | 3 | viigimurdja 3/3 | selge |
| 4 | **Paracord ja universaalnöörid** | Matkavarustus ja telkimine | 3 | konsensus +1× kinnitus | selge |

**Kokku: 4 uut L3, 19 toodet.** Ülejäänud 21 toodet → olemas-L3 (assign/fallback, kõik müügis).
**DRY — midagi DB-s/stagingus EI muudetud.** ETAPP 2 päris-loomine ootab Tarmo "mine".
