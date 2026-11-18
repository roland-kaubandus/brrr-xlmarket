# ÖINE TÖÖ — HOMMIKURAPORT (Tarmole)

**2026-11-18 · AINULT DRY — midagi live'i ei muudetud, DB-sse ei kirjutatud, ühtki deploy'd ei tehtud.**

> Kolm ülesannet jooksid öösel enne 02:45 ööakent (öine pipeline sai prioriteedi). Kõik väljundid on raportid; teostus ootab Sinu otsust.

---

## 1. KULU

| samm | mudel(id) | kulu |
|---|---|--:|
| KIHT 2 sõnavara — põhijooks (1674 L3) | Sonnet-5 + Opus-4.8 | $15.64 |
| KIHT 2 sõnavara — augutäide (45 L3, max_tokens-kärbe) | Sonnet-5 + Opus-4.8 | $0.48 |
| A2 grab-bag jagamis-ettepanek (82 L3) | Opus-4.8 | $1.05 |
| Simulatsioon + näidised | 0 LLM (Meili/fail) | $0.00 |
| **KOKKU** | | **~$17.17** |

Eelarvepiir oli $25 → **jäi $7.83 varu**. Piiri ei ületatud.

---

## 2. KOKKUVÕTE

### KIHT 2 sõnavara — KÕIK L3 valmis
- **1719 / 1719 L3** genereeritud (0 tühja), kahe mudeli **konsensus + kandidaat**.
- **Konsensus-termineid: 4378** (MÕLEMAD mudelid pakkusid → kõrge kindlus).
- **Kandidaate: 14327** (ainult üks mudel → vajab pilku; müra-tase näha näidistes).
- Rahvakeelsed/otsingunimed on **kontekstis** (toidusoojendi ≠ kütteseade), **kokku-lahku** variandid hoitud (nt "soojapuhur" / "sooja puhur"), SEO = 1–2 loomulikku lauset (mitte nimekiri).
- Väljund: `reports/kiht2-sonavara-dry.json` · 30 näidist: `reports/kiht2-naidised.md`.

### Mõõtmine — kui need sõnad lisada, mitu otsingusõna paraneks? (SIMULATSIOON, mitte live)
- **Regressioon-korpus (49 sõna):** praegu kukub **1**, millest KIHT 2 kataks **0**.
  → Järeldus: **KIHT 1 (morfoloogia) katab juba kogu regressioon-korpuse.** KIHT 2 väärtus on **korpuse-väline** — uued rahvaterminid, mida korpuses polnudki.
- **Net-uus katvus (konsensus-valim 400):** **52 / 400 (13%)** annavad praegu <3 tulemust, AGA nende siht-L3-l on ≥3 toodet → sünonüüm-lisa teeks need leitavaks.
  → **Ekstrapoleeritud ~499 terminit**, mida KIHT 2 teeks leitavaks (praegu peidus).
- Näiteid praegu-leidmatutest: `hüdromootor` (0), `katuselabidas` (0), `koorelahutaja` (0), `kanalisatsioonitross` (0), `kardinavarras` (0), `vaibapesur` (1), `katusekliimaseade` (2).
- Väljund: `reports/kiht2-regress-sim.md`.

> **NB:** simulatsioon ≠ live. Täpne arv selgub ALLES live-sünkimisel (folk → product_synonym → Meili). See samm on **edasi lükatud, ootab Sinu OK-d** — midagi pole sünkitud.

### A2 GRAB-BAG — 82 kõrge-kindlusega L3 jagamis-ettepanek
- Igale L3-le: alamtüübid → uued L3-nimed → hinnang-tootearv (24 näidise põhjal) → **värav** (≥3 toodet/≥15% + eristuv ostja-kontseptsioon).
- Üle-frag-värav järgitud: uued L3 OLEMASOLEVA L2 alla (ei loo uut L2 ühe L3 jaoks).
- **Väravad: 169 LÄBIS · 26 PIIRIPEALNE · 11 KUKKUS.** → **169 uut L3 kandidaati** teostuseks.
- Väljund: `reports/a2-grabbag-dry.md` (main-kategooria kaupa, tabelitega).

---

## 3. NÄIDISED

Täisnimekiri 30 näidisega (25 peakategooriat): **`reports/kiht2-naidised.md`**.

Vorming seal: iga L3 kohta **Konsensus** (mõlemad mudelid) · **Kandidaat** (üks mudel, müra-pilk) · **SEO-lause**. Sulgudes = sama termini kokku/lahku-variandid.

A2 jagamise näide (`reports/a2-grabbag-dry.md`):
- **Tennise pallimasinad ja -korvid** (16 toodet) → jaga: *Tennisepallikorvid ja -kärud* (~9, hoiustamine) vs *Tennise pallimasinad* (~7, viskavad). Korv ≠ masin = eri ostja-eesmärk. ✅ mõlemad LÄBIS.

---

## 4. A1 PERE-SCATTER OTSUSTABEL (kõik 19 peret)

Täistabel põhjendustega: **`reports/launch-qa/A1-TABEL-tarmole-2026-11-17.md`**. Kokkuvõte:

| # | pere | soovitus | kindlus |
|--:|---|---|---|
| 1 | kanister | **KOONDA → Auto** "Kütusekanistrid ja ohutuskanistrid" | 🟢 kõrge |
| 2 | lamp (kasvulamp) | **KOONDA → Elektritarvikud** "Kasvulambid" | 🟢 kõrge |
| 3 | värav (turvavärav) | **KOONDA** (sama L1) → "Turvavõred ja kokkupandavad väravad" | 🟢 kõrge |
| 4 | taignamikserid | ⚖️ otsusta (kodu-stand ≠ kommerts 10–30 L) | 🟡 lahkheli |
| 5 | riiul (seinariiul) | ⚖️ otsusta (garaaž-teras ≠ kodu-klaas) | 🟡 lahkheli |
| 6 | ekraan | ⚖️ otsusta (täispuhutav ≠ projektoriekraan) | 🟡 lahkheli |
| 7 | pump (membraan) | ⚖️ otsusta (membraan 2 mainis) | 🟡 lahkheli |
| 8 | vints | ✅ LAHENDATUD A3-ga | ✅ tehtud |
| 9 | imeja (tolmuimeja) | ⚖️ otsusta (kodu ≠ shop-vac) | 🟡 lahkheli |
| 10 | telk | ⚖️ otsusta (mull-telk, eri L1) | 🟡 lahkheli |
| 11 | vedru (garaažiuks) | ⚖️ otsusta (ehitus ↔ autoremont) | 🟡 lahkheli |
| 12 | külmik | **JÄTA eraldi** (mini/veini/kommerts) | ⚪ konsensus |
| 13 | laadija | **JÄTA eraldi** (sõiduk/EV/tööriist) | ⚪ konsensus |
| 14 | muundur | **JÄTA eraldi** (inverter/pinge/sagedus) | ⚪ konsensus |
| 15 | mast | **JÄTA eraldi** (kodu-lipp ≠ reklaammast) | ⚪ konsensus |
| 16 | klahvpillid | **JÄTA eraldi** (laste-mänguasi ≠ pill) | ⚪ konsensus |
| 17 | pitsaahjud | **JÄTA eraldi** (õue-puuküte ≠ kommerts-el.) | ⚪ konsensus |
| 18 | toiduprotsessor | **JÄTA eraldi** (kodu ≠ kommerts-skaala) | ⚪ konsensus |
| 19 | raud (tungraud) | **JÄTA eraldi** (kaitseraud/toestus/tungraud) | ⚪ konsensus |

**Kokkuvõte:** 3 KOONDA (kõrge, ootavad "jah": kanister · lamp · värav) · 7 LAHKHELI (otsusta) · 8 JÄTA (konsensus) · 1 tehtud (vints A3).

---

## OOTAVAD OTSUSED (teostus = eraldi, Sinu kinnitusel)

1. **KIHT 2 live-sünk** — folk → product_synonym → Meili. 4 otsustuspunkti (mis tier'id, müra-värav kandidaatidele, backfill+hook muster, Meili re-index).
2. **A1 read** — 3 KOONDA "jah" + 7 lahkheli otsus.
3. **A2 jagamine** — 169 värava-läbinud uut L3 (prioriteet: millised main-kategooriad enne).

*Kõik DRY. Ükski DB-kirjutus ega deploy pole tehtud. Raportid on commit'itud mõlemale harule.*
