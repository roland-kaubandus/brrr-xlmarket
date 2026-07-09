# SANTEHNIKA KOMBINEERITUD MAIN-LUKK #1 — SAMM 0 KAART

**2026-07-09 · taxonomy-v4 191057c5 · main pcat_v4_l10.** Allikad: grab-verdiktid.json + intra-verdiktid.json. Backup: backup-<ts>-santehnika.sql. Baseline inv: 0 FAIL.

## SISU-ANALÜÜS TÄPSUSTAB JUDGE'i
Judge flag'is 5 kõrge grab-bagi, AGA sisu-lugemine näitab: **2 on tõelised grab-bagid** (nimi ei kata klastreid → split), **3 on tegelt intra-misfitid** (nimi katab enamiku, ainult üksik-tooted võõrad → liiguta välja).

## KÕRGE-KINDLUS — TEOSTAN (SAMM 1)

### A) TÕELISED GRAB-BAGID → split (uued L3-d)
| # | L3 | sisu | tegevus |
|--:|---|---|---|
| 1 | **Kaminad ja tarvikud** (pcat_10kam, 36) | 0 kaminat! 7 tarvikutüüpi: simsid 11 · tööriistakompl 7+tuhaämbrid 3 · restid 6+puuhoidja 1 · ekraanid 5 · dekoorhalud 3 | RENAME→"Kaminasimsid"(11) + **4 UUT L3**: Kaminatööriistad&tuhaämbrid(10) · Kaminarestid&puuhoidjad(7) · Kaminaekraanid(5) · Dekoratiivsed kaminahalud(3) |
| 5 | **Plaatsoojusvahetid** (pcat_es_10x1_13, 10) | joodetud plaat 7 (nimi-täpne) + vesi-õhk 3 (POLE plaat) | jäta 7 · **1 UUS L3** Vesi-õhk soojusvahetid(3) |

### B) INTRA-MISFITID (nimi katab enamiku → liiguta ainult võõrad, 0 uut L3)
| # | L3 | võõras | → siht (OLEMAS) |
|--:|---|---|---|
| 2 | Põrandakütte kollektorid ja torud (13) | 4 PEX-toru | → **PEX-AL-PEX torud** (pcat_es_10x1_22); RENAME→"Põrandakütte kollektorid"(9) |
| 3 | Õhuniisutajad ja jahutid (12) | 6 udupihusti-ventilaatorit | → **Põranda- ja kaasaskantavad ventilaatorid** (pcat_es_10x1_2); jääb niisutid+jahutid(6, nimi-täpne) |
| 4 | Lae- ja seinaventilaatorid (11) | 2 shutter-väljalaskeventilaatorit | → **Väljalaskeventilaatorid** (pcat_es_10x1_6); jääb lae+sein(9, nimi-täpne) |

### C) INTRA-MISFIT kõrge (1)
- prod_01KNXXA8H2… (kaasaskantav akutoitel ventilaator) Katuse-ja-päikeseenergia → **Põranda- ja kaasaskantavad ventilaatorid** (pcat_es_10x1_2).

**KOKKU teostan: 5 UUT L3 · 2 RENAME · ~24 toote-liigutust.**

## KESK-KINDLUS — FLAG Tarmole (EI teosta)
**Grab-bag kesk (5):** Korsten ja korstnahooldus (28: pühkimiskompl 23 + korstnamütsid 5) · Kliimaseadme kaitsed ja katted (22: AC-katted 18 + torukatted 4) · Ventilatsioonivõred ja restid (16: seinavõred 8 + return-air 8) · Õhupuhastid ja filtrid (15: UV 6 + osoon 3 + filtrid 4) · Gravitatsioonilised veefiltrid (10: süsteemid 8 + kannud 2).
**Intra kesk (3, peale GRAB4-ga lahendatud shutter'ite):** 2× Kanalventilaatorid→Õhupuhastid (HVAC UV/õhupuhasti, mitte kanalvent) · 1× Põranda-ja-kaasaskantavad→Tornventilaatorid (tower fan).

## DEPLOY: struktuur muutub (5 uut L3 + 2 rename) → **täis-4-sammu.**

---
## TEOSTATUD (SAMM 1) — taxonomy-v4 23c8a63d
- **5 UUT L3:** Kaminatööriistad&tuhaämbrid(10) · Kaminarestid&puuhoidjad(7) · Kaminaekraanid(5) · Dekoratiivsed kaminahalud(3) · Vesi-õhk soojusvahetid(3).
- **2 RENAME:** Kaminad ja tarvikud→Kaminasimsid(11) · Põrandakütte kollektorid ja torud→Põrandakütte kollektorid(9).
- **Liigutused:** 25 Kamina-toodet 4 uude L3 · 4 PEX→PEX-AL-PEX torud(7) · 6 udupihusti+1 portable→Põranda-kaasask.(30) · 2 shutter→Väljalaske(16) · 3 vesi-õhk→uus(3).
- **inv 0 FAIL · harness POST 🟢 PASS · intra-QA inkr 0 misfit · distinct 17425 (0 kadu) · L3 1595→1600.**

## FLAG Tarmole (KESK + granulaarsus — EI teostatud)
**Grab kesk (5):** Korsten(28) · Kliimaseadme katted(22) · Ventilatsioonivõred(16) · Õhupuhastid+filtrid(15) · Gravit. veefiltrid(10).
**Intra kesk (3):** 2× Kanalventilaatorid→Õhupuhastid · 1× Põranda-kaasask.→Tornventilaatorid.
**GRANULAARSUS (judge-inkr soovitab, ma jätsin terveks — nimi katab):** Lae-ja-seinaventilaatorid(9)→Lae/Sein? · Õhuniisutajad-ja-jahutid(6)→niisutid/jahutid? Tarmo otsustab kas peenem jaotus või jätta (nimi täpne).
