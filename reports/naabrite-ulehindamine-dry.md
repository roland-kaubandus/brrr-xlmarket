# NAABRITE ÜLEHINDAMINE — DRY (9 tühja standalone L3)

> Spets: reports/naabrite-ulehindamine-spets.md · ESIMENE testjuhtum · DRY (0 DB-muudatust) · 2026-10-07
> Sisend: audit-clusters.json (5226 klastrit, ETAPP2-eelne seis) · K_sem=20 · topCl=20 · kulu $2.98

Iga tühja L3 kohta: naaber-L3-de (struktuurne ∪ semantiline) kõige-lähedasemad klastrid läbi SAMA classify-chain ahela (kitsas kandidaat-list {H} ∪ naabrid). **PULL** = ahel paigutaks toote tühja L3-sse (lõksus-toode leitud). **move_to_other** = bonus-leid kolmandasse naabrisse.

| Tühi L3 | naabreid | hinnatud klastrit | PULL (klastrit/toodet) | move_to_other |
|---|---|---|---|---|
| «Rehvivahetusseadmed ja -vahetid» | 81 | 20 | **0** / 0 | 0 |
| «Joonte märgistusmasinad» | 307 | 20 | **0** / 0 | 0 |
| «Keermestusmasinad» | 307 | 20 | **0** / 0 | 0 |
| «Kaalud ja mõõtevahendid» | 140 | 20 | **0** / 0 | 1 |
| «Saunatarvikud» | 163 | 20 | **1** / 1 | 1 |
| «Kuivatuspuhurid» | 104 | 20 | **0** / 0 | 0 |
| «Komposti tarvikud» | 163 | 20 | **0** / 0 | 0 |
| «Katete ja tarpide tarvikud» | 49 | 20 | **0** / 0 | 4 |
| «Tüübliliite puurimisšabloonid» | 303 | 20 | **0** / 0 | 3 |

## «Kaalud ja mõõtevahendid» — `v4-suurkook-kaalud-ja-mootevahendid`
**move_to_other (bonus — kolmas naaber):**

- `spu:11535` (2) «Commercial Popsicle Moulds, 40PCS Round-Head Ice P» v4-suurkoogiseadmed-koogitarvikud-ja-noud-jaapressid-ja-jaatarvikud → Jäätisepulga masinad

## «Saunatarvikud» — `v4-saunatarvikud`

**PULL (liiguks tühja L3-sse primaarkoduna):**

| ck | n | toode | praegune kodu | sim |
|---|---|---|---|---|
| `spu:05514` | 1 | External Sauna Heater Controller for 3KW-9KW Sauna Heaters C | Saunaahjud ja kerised | 0.025 |

**move_to_other (bonus — kolmas naaber):**

- `spu:13434` (2) «Foldable Picnic Table, 6 FT Folding Picnic Tables » v4-aed-ja-aiatehnika-l7-aialauad → Aiamööbli komplektid

## «Katete ja tarpide tarvikud» — `v4-varjualused-telgid-ja-kasvuhooned-varikatused-ja-pergolad-katete-ja-tarpide-tarvikud`
**move_to_other (bonus — kolmas naaber):**

- `spu:07956` (6) «Carport, 3.1 x 6.1 m Heavy Duty Car Canopy, Portab» v4-varjualused-telgid-ja-kasvuhooned-autovarjualused-ja-garaazitelgid-autovarjualused → Hoiutelgid ja garaažitelgid
- `spu:16577` (1) «SUV Tent with Shade Awning, All-Season SUV Tailgat» v4-varjualused-telgid-ja-kasvuhooned-telgid-rannatelgid-ja-varjualused → RV- ja ATV-tarvikud
- `spu:07957` (4) «Carport, 10x20 ft Heavy Duty Car Canopy Garage Boa» v4-varjualused-telgid-ja-kasvuhooned-autovarjualused-ja-garaazitelgid-autovarjualused → Hoiutelgid ja garaažitelgid
- `spu:08014` (2) «Pop Up Canopy Tent, 10 x 10 ft, 250 D PU Silver Co» v4-varjualused-telgid-ja-kasvuhooned-varikatused-ja-pergolad-paviljonid-ja-gasebod → Pop-up telgid ja varjualused

## «Tüübliliite puurimisšabloonid» — `v4-tooriistad-tuubliliite-puurimissabloonid`
**move_to_other (bonus — kolmas naaber):**

- `spu:05819` (2) «Milling Machine Worktable Cross Slide Table 10.2 x» v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-treilauad-ja-toolauad → Puurpingi tööpingid
- `spu:07848` (3) «Pipe Crimping Pliers Hand Pressing Kit with 6 Piec» v4-tooriistad-ja-tarvikud-akutooriistad-toru-pressimistooriistad → Pressimistangid ja -tööriistad
- `vpt:Power Tools > Power Tool Parts & Accessories > Hole Saw Kit` (3) «Hole Saw Kit, 11 PCS Saw Blades, 2 Drill Bits, 1 H» v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-teemantpuurkroonid-ja-sudamikpuurid → Augusaed ja kroonsaed

---

## Tõlgendus

- Kokku **1 klastrit / 1 toodet** pulliks tühjadesse L3-desse (lõksus-tooted, mis tekkisid enne kodu olemasolu).
- **9 move_to_other** bonus-leidu (naaber-reeval parandab ka kolmandaid valesid).
- **DRY** — midagi EI liigutatud. Päris-liigutus = eraldi execute (väravad: transaktsioon + undo + inv + lock-harness + Meili, spets §4).
- **Staleness-märge:** audit-clusters.json on ETAPP2-eelne (63/18910 toodet liikus vahepeal) — mehhanismi-tõestuseks tühine; päris-hookis loetakse LIVE DB.
