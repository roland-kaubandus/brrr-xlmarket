# KIHT 2 sõnavara — v1 DRY (soojendi/puhasti-pered) — Tarmole

**2026-11-17 · staging k33g · AINULT LUGEMINE/MÕÕTMINE · 0 kirjutust, EI sünkitud Meili'sse**

> Jätk: `otsing-liitsonad-diagnoos-2026-11-17.md`. KIHT 1 (morfoloogia) on nüüd **live** (vt SOOJENDI-LEID).
> See = **KIHT 2** (rahvakeelne sõnavara, mida morfoloogia EI tuleta). Vocab-fail: `kiht2-vocab-v1-dry-2026-11-17.yaml`.
> **Ära sünki enne kui kinnitad formaadi + skoobi.**

---

## TL;DR

- **Mehhanism:** üks sõnavara **per L3** (SSoT) → iga L3 folk-term laieneb `product_synonym` ridadeks kõigile selle L3 toodetele → `sync-synonyms.mjs` → Meili. Asendab laialipillutatud per-toote graafi.
- **Aus leid:** Sinu nimetatud rahvaterminitest **enamik juba töötab** pärand-graafist. Päris-augud on **4**, kitsad ja täpsed.
- **v1 skoop:** AINULT soojendi/puhasti-pered (tõestab mehhanismi + lappib 4 auku). Kataloogiülene (~1721 L3, LLM-konsensus, ~3–8 €) = eraldi järgmine samm Sinu OK-l.

## Mõõdetud (raw Meili, enne KIHT 2)

| folk-termin | siht-L3 | pool | leiab NÜÜD siht-tooteid | seis |
|---|---|--:|--:|---|
| soojapuhur | Diisli- ja petrooleumi soojapuhurid | 10 | **10/10** | ✅ kaetud |
| torpeedo | Diisli- ja petrooleumi soojapuhurid | 10 | **10/10** | ✅ kaetud (rahvakuju) |
| **halupuhur** | Diisli- ja petrooleumi soojapuhurid | 10 | **0/10** | 🔴 **AUK** |
| diisel soojendi | Autonoomsed diiselsoojendid | 60 | **60/60** | ✅ kaetud |
| **parkla soojendi** | Autonoomsed diiselsoojendid | 60 | **0/60** | 🔴 **AUK** |
| **terrassisoojendaja** | Terrassisoojendid | 7 | **0/7** | 🔴 **AUK** |
| **terrassikiirgur** | Terrassisoojendid | 7 | **0/7** | 🔴 **AUK** |
| rätikusoojendaja | Rätikusoojendid | 11 | **11/11** | ✅ kaetud |
| aurupesur / aurupuhasti | Aurupesurid ja -puhastid | 1 | **1/1** | ✅ kaetud* |

\* aurupesur andis "ainult 2" — aga katalogis ONGI ~2 aurupesurit. See on **laovaru-piirang, mitte otsingu-auk**. Vocab valmis, kui ladu kasvab.

## 4 päris-auku, mida KIHT 2 v1 lapiks

1. **halupuhur** → Diisli- ja petrooleumi soojapuhurid (0→10)
2. **parkla soojendi** / parkla kütteseade / autonoomne soojendi / standheater → Autonoomsed diiselsoojendid (0→60)
3. **terrassisoojendaja** / terrassikiirgur / patio heater / välissoojendi → Terrassisoojendid (0→7)
4. (rätiku, aurupesur, soojapuhur, torpeedo = juba OK → vocab formaliseerib, ei lisa katvust)

## Järjestus-märkus (seotud SOOJENDI-LEIU-ga)

`q="soojendi"` tipus on **Ultrahelipuhastid** (74 tk), sest nende title_et sisaldab sõna "soojendi" (funktsioon). KIHT 2 teine võimalik roll = **kaalu-vihje** (eelista soojendi-SEADET üle puhasti-funktsiooni). v1-s AINULT märgitud (`disambig_candidates`), **EI teostatud** — relevantsus-tuuning on Sinu otsus.

## Otsustuskohad (Sinule)

1. **Formaat OK?** per-L3 YAML `folk:` + `gaps:` (vt .yaml). Kui jah → kolib SSoT-i (cms/).
2. **v1 skoop OK?** ainult need pered nüüd, kataloogiülene hiljem?
3. **Sünkin 4 augu live?** (deterministlik: folk→product_synonym→Meili, backfill+hook, undo = read-delete per gen_version). Või ootad kataloogiülest korraga?
4. **Disambig (relevantsus-kaal)** — kas v2-sse või jätame Meili default-järjestuse?

**Midagi EI sünkitud. Ootan vastust p.1–4 enne live't.**
