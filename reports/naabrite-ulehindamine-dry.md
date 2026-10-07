# NAABRITE ÜLEHINDAMINE — DRY (9 tühja standalone L3)

> Spets: reports/naabrite-ulehindamine-spets.md · ESIMENE testjuhtum · DRY (0 DB-muudatust) · 2026-10-07
> Sisend: audit-clusters.json (5226 klastrit, ETAPP2-eelne seis) · K_sem=20 · topCl_sem=40 · kulu $13.34

Naabrus (spets §2.2): **struktuurne = sama L2 pere, KÕIK klastrid kärpimata** (deterministlik) + **semantiline far-field top-K** (kulu-bound). Iga klaster läbi SAMA classify-chain ahela (kitsas kandidaat-list {H} ∪ naabrid). **PULL** = ahel paigutaks toote tühja L3-sse (lõksus-toode leitud). **move_to_other** = bonus-leid kolmandasse naabrisse.

| Tühi L3 | naabreid | klastrid (strukt KÕIK + sem) | PULL (klastrit/toodet) | move_to_other |
|---|---|---|---|---|
| «Rehvivahetusseadmed ja -vahetid» | 24 | 9 + 40 = 49 | **0** / 0 | 0 |
| «Joonte märgistusmasinad» | 29 | 32 + 40 = 72 | **0** / 0 | 1 |
| «Keermestusmasinad» | 35 | 55 + 40 = 95 | **0** / 0 | 5 |
| «Kaalud ja mõõtevahendid» | 39 | 52 + 40 = 92 | **0** / 0 | 1 |
| «Saunatarvikud» | 23 | 6 + 27 = 33 | **1** / 1 | 0 |
| «Kuivatuspuhurid» | 42 | 66 + 40 = 106 | **0** / 0 | 4 |
| «Komposti tarvikud» | 46 | 75 + 40 = 115 | **1** / 9 | 2 |
| «Katete ja tarpide tarvikud» | 29 | 20 + 40 = 60 | **0** / 0 | 2 |
| «Tüübliliite puurimisšabloonid» | 33 | 44 + 40 = 84 | **0** / 0 | 1 |

## «Joonte märgistusmasinad» — `v4-tooriistad-ja-tarvikud-viimistlus-joonte-margistus`
**move_to_other (bonus — kolmas naaber):**

- `spu:03258` (1) «4 Jet Cement Mortar Spray Gun, Stucco Sprayer 4 Je» v4-tooriistad-ja-tarvikud-viimistlustooriistad-krohvimistooriistad → Värvipüstolid ja pihustusseadmed

## «Keermestusmasinad» — `v4-tooriistad-ja-tarvikud-metallitoo-ja-sepatoo-keermestusmasinad`
**move_to_other (bonus — kolmas naaber):**

- `spu:02943` (2) «Electric Metal Nibbler 380W Nibbler Metal Cutter 1» v4-tooriistad-ja-tarvikud-metallitoo-ja-sepatoo-plekitootlusmasinad → Plekikäärid
- `spu:00261` (1) «457 mm(18") Sheet Metal Bead Roller Bead Roller Fo» v4-tooriistad-ja-tarvikud-metallitoo-ja-sepatoo-plekitootlusmasinad → Plekirullid
- `spu:08051` (1) «Double Head Sheet Nibbler Metal Cutter Power Drill» v4-tooriistad-ja-tarvikud-metallitoo-ja-sepatoo-plekitootlusmasinad → Plekikäärid
- `spu:01738` (1) «Sheet Metal Brake, 12-inch, 3-In-1 Combination She» v4-tooriistad-plekirullid → Plekitöötlusmasinad
- `spu:05818` (2) «Tilting Milling Table 7x5inch Tilting Angle Millin» v4-tooriistad-metallifreespingid → Jaotuslauad ja jagamispead

## «Kaalud ja mõõtevahendid» — `v4-suurkook-kaalud-ja-mootevahendid`
**move_to_other (bonus — kolmas naaber):**

- `spu:13156` (1) «Glass Froster Chiller, CO2 Beer Glass Froster, 8-1» v4-suurkoogiseadmed-koogitarvikud-ja-noud-jaapressid-ja-jaatarvikud → Kokteili- ja baaritarvikud

## «Saunatarvikud» — `v4-saunatarvikud`

**PULL (liiguks tühja L3-sse primaarkoduna):**

| ck | n | toode | praegune kodu | sim |
|---|---|---|---|---|
| `spu:05514` | 1 | External Sauna Heater Controller for 3KW-9KW Sauna Heaters C | Saunaahjud ja kerised | 0.025 |

## «Kuivatuspuhurid» — `v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-kuivatuspuhurid`
**move_to_other (bonus — kolmas naaber):**

- `spu:12987` (5) «Industrial Pedestal Fan, 30 Inch 85-Degree Oscilla» v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-toostuslikud-ventilaatorid → Põranda-, torni- ja kaasaskantavad ventilaatorid
- `spu:16340` (3) «Industrial Ventilation Extractor air blower fan ve» v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-toostuslikud-ventilaatorid → Väljalaske- ja katuseventilaatorid
- `vpt:Heating & Cooling > Ventilation Equipment & Supplies > Pedestal Fans` (1) «Industrial Pedestal Fan, 16 Inch 75-Degree Oscilla» v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-toostuslikud-ventilaatorid → Põranda-, torni- ja kaasaskantavad ventilaatorid
- `spu:12719` (2) «Evaporative Humidifier Replacement Filter, 2-Pack,» v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-ohuniisutajad-ja-jahutid → Õhufiltrid ja varufiltrid

## «Komposti tarvikud» — `v4-aed-ja-aiatehnika-l1-komposti-tarvikud`

**PULL (liiguks tühja L3-sse primaarkoduna):**

| ck | n | toode | praegune kodu | sim |
|---|---|---|---|---|
| `spu:07217` | 9 | Compost Spreader, 24.4-25.6" Height Adjustable Handle, 24" W | Väetise- ja seemnelaotajad | 0.033 |

**move_to_other (bonus — kolmas naaber):**

- `spu:12144` (1) «Electric Utility Cart, 36V 432 Wh Battery Powered » v4-aed-kallutuskarud → Aiakärud
- `vpt:Automotive > Motorcycle Parts & Accessories > ATV & UTV Parts & Accessories` (1) «ATV Rear Storage Bag, 54L ATV Rear Cargo Bag with » v4-autovaruosad-ja-tarvikud-haagissuvila-rv-ja-atv-tarvikud → ATV tarvikud

## «Katete ja tarpide tarvikud» — `v4-varjualused-telgid-ja-kasvuhooned-varikatused-ja-pergolad-katete-ja-tarpide-tarvikud`
**move_to_other (bonus — kolmas naaber):**

- `spu:13156` (1) «Glass Froster Chiller, CO2 Beer Glass Froster, 8-1» v4-suurkoogiseadmed-koogitarvikud-ja-noud-jaapressid-ja-jaatarvikud → CO2 balloonid ja tarvikud
- `vpt:Automotive > Motorcycle Parts & Accessories > ATV & UTV Parts & Accessories` (1) «ATV Rear Storage Bag, 54L ATV Rear Cargo Bag with » v4-autovaruosad-ja-tarvikud-haagissuvila-rv-ja-atv-tarvikud → ATV tarvikud

## «Tüübliliite puurimisšabloonid» — `v4-tooriistad-tuubliliite-puurimissabloonid`
**move_to_other (bonus — kolmas naaber):**

- `spu:05285` (1) «16Pcs Mortice Door Fitting Kit, DBB Lock Mortiser » v4-tooriistad-ja-tarvikud-puidutoo-tooriistad-freesimislauad-ja-freesimistarvikud → Mööblifurnituuri puurimisšabloonid

---

## Tõlgendus

- Kokku **2 klastrit / 10 toodet** pulliks tühjadesse L3-desse (lõksus-tooted, mis tekkisid enne kodu olemasolu).
- **16 move_to_other** bonus-leidu (naaber-reeval parandab ka kolmandaid valesid).
- **DRY** — midagi EI liigutatud. Päris-liigutus = eraldi execute (väravad: transaktsioon + undo + inv + lock-harness + Meili, spets §4).
- **Staleness-märge:** audit-clusters.json on ETAPP2-eelne (63/18910 toodet liikus vahepeal) — mehhanismi-tõestuseks tühine; päris-hookis loetakse LIVE DB.
