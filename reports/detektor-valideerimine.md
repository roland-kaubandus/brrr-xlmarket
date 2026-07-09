# DETEKTORI VALIDEERIMINE — GRAB-01 (+ COMPLETE/ORPHAN/WIDTH) teadaoleva tõe vastu

**2026-07-09 · READ-ONLY valideerimine.** Ajend: GRAB-01 (keyword) raporteeris **0 heterogeenset L3**, AGA `grabbag-taisnimekiri.md` loetleb ~50 lahendamata grab-bagi (Opus-skänn). Kahtlus: detektor = VALE-NEGATIIV → vale kindlustunne. **Tõestatud: nii oligi.**

## SAMM 1 — GRAB-01 recall teadaoleva tõe vastu

Jooksutasin keyword-GRAB-01 loogika 26 TIER-1 L3 peal (grabbag-taisnimekiri.md KÕRGE kindlus). **Recall = 0/25 = 0%** (üks TIER-1 juba kustutatud).

**JUURPÕHJUS:** grab-bagid jagavad **dominantset sõna**, mis maskeerib sekundaar-klastri:
| Grab-bag L3 | top-sõna dominants | tegelik segu |
|---|---|---|
| Potid (49) | "cooking" 0.65 | potid+küpsetusnõud+survepotid+aurutuspotid |
| Grilliplaadid (18) | "grill" 1.00 | grilliplaadid + grillikatted |
| Kirjutuslauad (30) | "desk" 1.00 | kirjutus+konverents+**õmbluslauad** |
| Akvaariumitarvikud (16) | "aquarium" 1.00 | valgustid+alused+filtrid |

Top-sõna dominants oli 0.40–1.00 → `<0.40` lävi ei püüdnud MITTE ÜHTEGI. **Keyword-heuristika on põhimõtteliselt pime semantilistele grab-bagidele.**

## SAMM 1b — Nime-signaal ("X ja Y") testitud

Alternatiiv: L3-nimi sisaldab "ja"/"&"/","/"tarvikud". **Recall 22/26 = 85%** AGA fireb **805/1595 = 50% kataloogist** (nt "Ukselingid & käepidemed" = koherentne). **50% FP → kasutuskõlbmatu detektorina.** → **ükski odav heuristika ei tööta.**

## SAMM 2+3 — PARANDATUD DETEKTOR = LLM-judge (semantiline)

**`scripts/grab-bag-judge.mjs`** (uus): Claude Messages API (opus-4-8, adaptive thinking, low effort), loeb iga L3 title_en sisu semantiliselt, klasterdab tüübiti, otsustab GRAB/CLEAN. Raw fetch (zero-dep, node 22). Perioodiline (~30 API-kutset 1595 L3 peale) — mitte iga-luku. Väljund: `reports/grab-bag-judge-tulem.md`.

**Valideeritud (2× subagent-jooks, LLM-judge = sama loogika):**
| Test | Tulem | Tõlgendus |
|---|---|---|
| **TIER-1 (26 teadaolevat)** | **22 GRAB / 4 CLEAN** | 4 CLEAN = 2 juba lahendatud (pcat_6kont TÜHI/kustutatud, el_12x5_5 puhastatud) + 2 tõeliselt homogeenset (ag2_2x2_9 tööriista-organiseerijad = **nime-probleem**, ag2_2x1_8 pullerid). **Recall reaalsete grab-bagide peal ≈ 22/22 ≈ 100%.** |
| **Juhuslik-40 (FP-mõõt)** | **39 CLEAN / 1 GRAB** | ~2.5% flag-määr. Ainus GRAB (pcat_t3a_1_30 tow-behind muruhooldus) = piiripealne tahtlik umbrella. Nime-paarid ("Heinasööturid ja heinavõrgud") õigesti CLEAN. |

**Võrdlus:** keyword **0% recall** → LLM-judge **~100% recall · ~2.5% FP.** Uus leid Opus-skänni väliselt: pcat_t3a_1_30 (piiripealne).

**Parandus rakendatud:** keyword-GRAB-01 **EEMALDATUD** inv-taxonomy'st (andis vale "✓ puhas") → asendatud viitega grab-bag-judge.mjs-le.

## SAMM 4 — Teised detektorid valideeritud

| Detektor | Enne | Verdikt |
|---|---|---|
| **COMPLETE-01** | 0 | ✅ **TÕELINE 0** — ristkontroll (normaliseeritud L3-nimi 2× ühes mainis) tühi. True-negative, detektor õige. |
| **ORPHAN-01** | 29 | ⚠️ **liiga lai** (nime-põhine). Tihendatud 29→**16** (kulumaterjali-kodud välistatud). Jääb müra: "Lintlihvijad"=belt sander, "Lintsaed"=band saw on SEADMED, mitte kulumaterjal (regex "lint" eksitab). Sama õppetund mis GRAB — nime-põhine ei ole usaldusväärne. **Informatiivne, mitte autoriteet.** |
| **WIDTH-01** | 177 | ℹ️ **informatiivne**, mitte rikkumine. 78 on 1-toote-L3; enamik õigustatud kitsad tüübid (Golfimõõturid, Aeraatorrehad). Kitsas L3 pole viga kui on tõeline eristuv tüüp. |

## JÄRELDUS
- **Kriitiline õppetund:** nime/märksõna-põhine detektsioon EI TÖÖTA semantiliste probleemide (grab-bag, seotud-tüübid) jaoks. Tõestatud: GRAB-01 keyword 0% recall, ORPHAN-01 nime-müra. **Struktuur-kontrollid (STRUCT/COMPLETE/DUP/SEG) töötavad** (andme-fakt, mitte semantika); **semantilised vajavad LLM-judge'i.**
- **Meta-reegli kinnitus:** detektor ILMA valideerimiseta = vale kindlus. GRAB-01 "0 puhas" oleks varjanud 22 grab-bagi. **Iga uus detektor tuleb valideerida teadaoleva tõe vastu ENNE usaldamist.**
- **Feed-kriitiline:** feed toob heterogeenseid tooteid → grab-bag-judge.mjs (LLM) on ainus usaldusväärne tuvastus. Keyword oleks pannud sadu feed-tooteid valesti "puhtaisse" L3-desse.
