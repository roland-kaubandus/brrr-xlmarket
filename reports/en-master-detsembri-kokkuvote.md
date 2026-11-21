# EN-master — detsembri otsuse kokkuvõte

**Koostatud:** 2026-11-21 (GO tee A järel) · **DB:** k33g staging · **EN_MASTER_INDEX:** false (true-count = 0)

See fail on mõeldud detsembris OTSE kasutamiseks (kataloogi-regen + EN_MASTER_INDEX=true otsus).
Kõik arvud on staging'ust, kirjutamise seisuga.

---

## 1. Kataloogi seis praegu

| Mõõdik | Arv | Märkus |
|---|---:|---|
| Tooteid kokku | 20 050 | |
| **Clean olemas (kuvamiskõlblik tekst)** | **19 571** (97,6 %) | `title_en_clean`+`description_en_clean` ≠ NULL |
| Clean NULL (giveup/ootel) | 479 (2,4 %) | millest: **471 ilma base'ita** (pole kunagi genereeritud) + **8 base-only värav-skip** (öö-regen self-heal) |
| Uue arhitektuuri base salvestatud | 2 022 | `title_en_base`/`description_en_base` (LLM enne addMetric) |
| EN_MASTER_INDEX = true | **0** | kuvamine on eraldi otsus (see fail) |

**NB:** 19 571 "clean" EI ole kõik uuest arhitektuurist — enamik on vana juuni-tõlge/varasemad passid.
Uue, deterministliku `addMetric`-toruga puhastatud = 2 022 base-toodet (vt all).

## 2. Värava-seis (värav läbitud vs edasi lükatud)

2 022 base-toote `remetric` ümberjooks (base→addMetric, deterministlik, ilma LLM-ita):

| Tulem | Arv | Tegevus |
|---|---:|---|
| **Kirjutatud (värav läbitud)** | **1 481 toodet / 2 762 välja** | clean uuendatud (undo: `reports/en-master-remetric-undo-2026-11-21T22-55-18.json`) |
| No-change (jäägi-write juba ajakohane) | ~412 | varem kirjutatud (jäägi-417) |
| metricGate-skip (ebasidus peale ümberjooksu) | 63 | → detsembri base-regen |
| **Allika-vastuolu-skip (GO tee A)** | **66** | → detsembri base-regen |

**Kokku detsembri base-regenisse: 129 toodet** (`scratchpad/remetric-1756-srcgate.txt`).

### Mis on allika-vastuolu-skip (GO tee A, 2026-11-21)
Kui pealkirja/kirjelduse imperiaal→meetriline **arvutatud** teisendus erineb allika-spetsi
meetrilisest (nt dump-cart `800 lbs` → arvutatud 362,9 kg, aga allikas 363,6 kg), siis
`srcConflictGate` jätab teisenduse lisamata (**fail-closed**) ja toode skip'itakse → säilib
olemasolev väärtus, vastuolu läheb detsembri base-regenisse. Kõik 66 on **tõelised väikesed
lahknevused** (0,1–12 %, sama mõõde). Suuremad lahknevused (eri-mõõtme valepaaritused) on
teadlikult VÄLJAS (addMetric'u füüsika on neil õige).

### Teadlik piirang (dokumenteeritud)
Värav politseerib **üksikväärtusi**, MITTE komposiit-mõõtmeid (`A × B × C`), sest komposiidi
imperiaal↔meetriline paaritus on mitmetähenduslik (valepaarituse risk). Komposiit-vastuolud
(Opus-audit märkis 2: `6×3,51×2,5 m`, `30,5×30,5 cm`) lahendatakse detsembri base-regenis
allika juures (prompt reegel #4 "kopeeri numbrid TÄPSELT").

## 3. Sõltumatu Opus-audit (valim 20, kirjutuse eeltingimus)

Mudel `claude-opus-4-8`, batch, kate 7 addMetric-klassi · raport
`reports/en-master-review-2026-11-21T22-53-28.json`:

- **0 fail / 0 fabrikatsiooni** · acc 4,95 · read 4,85 (13 pass, 7 minor)
- 4 ühiku-märget — kõik healoomulised/edasi lükatud, MITTE valed teisendused:
  - 2× komposiit-mõõtme allika-vastuolu (teadlik piirang, vt 2)
  - 1× semantiline sildistus ("117 mm pulley" = välisrõngas; base-teksti küsimus, mõlemad arvud ehtsad)
  - 1× vahemik ainult tollides (kavakohane fail-closed — vahemik ei teisene garble'ita)

→ **Kirjutus-värav (0 fail / 0 fabrikatsioon) TÄIDETUD.** Minor'id = base-teksti kvaliteet →
detsembri regen, MITTE addMetric.

## 4. Kogu kataloogi regen'i kulu-hinnang (uue promptiga)

Toru: **GEN (Sonnet) + JUDGE (Sonnet) + ~29 % REGEN (Sonnet)**, kõik Batch API (−50 %).
Mõõdetud: süsteemi-prompt ~708 tok (cache'itav), näidis-korpus ~812 tok, väljund title+desc ~350 tok.

| Osa | in tok | out tok | $/toode (batch) |
|---|---:|---:|---:|
| GEN | ~1 700 | ~350 | ~$0,0052 |
| JUDGE | ~2 050 | ~150 | ~$0,0042 |
| REGEN (29 %) | ~2 050 | ~350 | ~$0,0017 |
| **Kokku/toode** | | | **~$0,011** |

- **20 050 toodet ≈ $180–230** (prompt-cache süsteemi-promptil vähendab ~$40).
- Juba tehtud 2 346 (chunk 1+2) ≈ ~$26.
- **Realistlik detsembri-töö:** kui regenerida ainult VEVOR-imperiaal-rasked + 129 edasi-lükatud +
  471 base'ita NULL, siis oluliselt vähem kui $180 (kogu kataloogi ülempiir).
- Hind sõltub mudeli-valikust (Sonnet-5 intro-hind kehtib 2026-08-31-ni — detsembris TÄISHIND
  $3/$15; kontrolli jooksvat hinnakirja enne käivitust).

## 5. Mis on vaja ENNE EN_MASTER_INDEX=true

1. **Detsembri base-regen** uue promptiga (reegel #4 "kopeeri numbrid täpselt" + #5 allika-vastuolu
   fail-closed juba karmistatud) → lahendab 129 edasi-lükatut + komposiit-vastuolud allika juures.
2. **remetric uuel base'il** → clean kõigile regenereeritutele (deterministlik, tasuta).
3. **471 base'ita NULL** katta (giveup/ootel) — kas regen või teadlik otsus jätta ilma EN-masterita.
4. **Opus-audit suuremal N-il** (80–100, kate 7 klassi) → 0 fail / 0 fabrikatsiooni.
5. **Kuvamis-cutover otsus:** ET-leht kuvab praegu staging'us VEVOR-it; vaja EN-master → kuvamine
   seotus + kategooria-nimede tõlge (1970/1970 ET juba olemas) — vt [[sisu-kihid-vana-tolge-asendatakse]].
6. **Meili reindeks** `en_master_index=true` — alles PÄRAST punkte 1–5.
7. **Render-tõestus** (playwright, mitte ainult DB) — nähtavus ≠ HTML-is olemasolu
   (vt [[tõesta-render-mitte-grep]]).

---

### Võtme-failid
- Undo (selle kirjutuse): `reports/en-master-remetric-undo-2026-11-21T22-55-18.json`
- Opus-audit: `reports/en-master-review-2026-11-21T22-53-28.json`
- Regen-vajavad ID-d (129): `scratchpad/remetric-1756-srcgate.txt`
- Värav + testid: `scripts/lib/en-master-clean.mjs` (`srcConflictGate`), `scripts/lib/en-master-clean.test.mjs`
- Tööriistad: `remetric` (tasuta re-dry/propagatsioon), `en-master-review.mjs --ids FILE --remetric` (audit)
