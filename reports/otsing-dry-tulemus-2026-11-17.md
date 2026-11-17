# Eesti liitsõna-otsing — DRY-prototüübi tulemus (2026-11-17)

**Metoodika:** ajutine Meili-indeks `products_dry` (kustutatud pärast mõõtmist), koopia prod `products` seadetest (105781 sünonüümi, sama rankingRules/typoTolerance) + **uus väli `morph_et`** searchableAttributes lõpus (madalaim prioriteet). EstNLTK/Vabamorf arvutas 19284 unikaalsõna morfoloogia 13 s jooksul; `morph_et` = liitsõna terve lemma + **komponendid** (split `root` `_`-piiril, komponent ≥3 tähte) + käände-lemma. Mõõdetud 52 Tarmo testsõna. **Prod indeks puutumata, 0 kirjutust, stack-lukku ei vajatud.**

## Konfiguratsiooni-otsus (mõõtmisest tuletatud)

- **INDEKSI pool:** `morph_et` = terve lemma + komponendid + käände-lemma. See annab liitsõna-teise-poole tabamuse (`ahi` leiab `elektriahi`).
- **PÄRINGU pool:** **AINULT lemma** (käände-normaliseerimine), **MITTE komponent-split**. Komponent-split üle-laiendab spetsiifilise liitsõna-päringu (`õhksoojuspump` → kõik pumbad). Mõõdetud: `õhksoojuspump` lemma=110, comp-split=971. → päringu pool jääb lemma-ainult.

## Peamised numbrid

| Mõõdik | Tulemus |
|---|---|
| Kokku tabamusi (52 sõna) ENNE | 14 516 |
| Kokku tabamusi PÄRAST (lemma) | 24 376 (**+68%**) |
| Paranes | 38 / 52 sõna |
| **Latents keskmine ENNE → PÄRAST** | **171.52 ms → 171.38 ms (ei halvene)** |
| Latents max ENNE → PÄRAST | 202 ms → 181 ms |
| Vale-positiiv `ahi` → `lahing` | **0 / 95** (komponent-indeks välistab substring-müra konstruktsiooniga) |

## Suurimad võidud (käänded + mitmus + liitsõna teine pool)

| sõna | ENNE | PÄRAST | juurdevõit |
|---|---|---|---|
| toolid | 192 | 2512 | +2320 |
| riiulid | 832 | 2609 | +1777 |
| lauad | 355 | 1391 | +1036 |
| pumbad | 59 | 1017 | +958 |
| kompressorid | 22 | 820 | +798 |
| laud | 375 | 1197 | +822 |
| käru | 1430 | 2109 | +679 |
| pesurid | 4 | 437 | +433 |
| tool | 2171 | 2512 | +341 |
| ahi | 38 | 95 | +57 |
| soojendi | 22 | 150 | +128 |
| ahjud | 29 | 95 | +66 |

## Ausad regressioonid — need on TÄPSUSE võit, mitte kadu

| sõna | ENNE | PÄRAST | selgitus |
|---|---|---|---|
| pehme jäätise masin | 333 | 18 | ENNE 333 = Meili `matchingStrategy:last` kukkus sõnani "pehme" (pehme = pehme ükskõik mis) → müra. PÄRAST 18 = päris softijäätise-masinad. **Täpsem.** |
| jäätise masin | 64 | 18 | sama muster |
| ahju | 125 | 95 | ENNE 125 = prefiks "ahju" püüdis ka ahju-TARVIKUID; PÄRAST 95 = lemma `ahi` = päris ahjud. Piiripealne — vaata üle (ahju-tarvikud võivad olla soovitud). |

## praeahi jääb 0 — see on KIHT 2 (sõnavara), mitte morfoloogia

`praeahi` = 0 enne JA pärast. Korpuses pole ühtegi "praeahi"-toodet; deterministlik morfoloogia ei saa luua tähendust, mida andmes pole. Lahendus = **KIHT 2 sõnavara** (praeahi → ahi-kategooria sünonüüm, konsensus + värav). Sama: `mikrolaineahi` (2), `aurupesur` (2) — korpuses tõesti vähe, vocab suunab kategooriale.

## Üle-laienemise tõend (miks päringu pool EI tee komponent-splitti)

comp-split veerg ⚠️: `veepump`→971, `nõudepesumasin`→1473, `mootorsaag`→786, `kettsaag`→442. Komponent-split muudaks spetsiifilise päringu liiga laiaks. **Lemma-ainult päring hoiab täpsuse** (`õhksoojuspump` 110, mitte 971).

## Järeldus

KIHT 1 (deterministlik morfoloogia) töötab: +68% tabamusi, latents ei kannata, 0 vale-positiivi, täpsus paraneb. Valmis live-teostuseks (backfill + hook, HARD RULE #5) **Tarmo kinnitusel**.
