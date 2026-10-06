# Kataloogi klassifikatsiooni-audit — 2026-10-07 (ÖÖ)

> Kaheastmeline kalibreeritud sõel (Tarmo direktiiv 2026-10-06). DRY, kulupiir $50.
> **Seis: KALIBREERIMINE TEHTUD → SÕEL EI LÄBINUD → täis-audit EI käivitatud (direktiivi värav: "sõel ei läbi → raporteeri ja oota").**
> Kulu täna öösel: **~$11.80** (ainult kalibreerimine + mõõtmine, kõik DRY). DB-d EI muudetud.

---

## 🛑 PÕHITULEMUS — odav sõel ei tööta, täis-audit ei mahu $50 sisse

Kalibreerimine 150 juhu-klastril (fikseeritud seeme 20261007) andis **ühemõttelise** tulemuse:

| Lähenemine | Mõõdetud tulemus | Verdikt |
|---|---|---|
| **Odav sõel** (Haiku) — "kas praegune L3 õige?" | recall **36.4%** (vahele 7/11 viga) | 🛑 kukub |
| **Odav sõel eskaleeritud Sonnet-ile** (HARD RULE #6) | recall **36.4%** (samad 7 vahele) | 🛑 kukub |
| **Eelvalik-shortlist** (praegune L3 + 30 lähimat) täis-ahelas | kokkulangevus täis-listiga **89.8%**, tekitab valesid NEW-otsuseid | 🛑 fidelity kukub |
| **Täis-ahel kõigil 5226 (täis-list)** — truu, kuld-standard | **$0.057/klaster → ~$298 sünkr / ~$149 batch** | 🛑 üle $50 |

**Järeldus:** praeguste tööriistadega **truu kogu-kataloogi audit ei mahu $50 sisse**, ja odav eelsõel, mis populatsiooni kärbiks, **ei püüa just neid peeni vigu**, mis on auditi mõte. Vajab Tarmo otsust (valikud all).

### Miks sõel struktuurselt ei tööta

Kõik 7 vahele-jäänud viga on **"mujal on PAREM naaber-kodu"** juhtumid (mitte jämedad valepaigutused): kallutuskäru↔aiakäru, grill/griddle↔praepann, dušitool↔dušipink. Sõel vaatab AINULT "praegune L3 + toode" → ei näe alternatiive → ei saa öelda "parem kodu on mujal". Alternatiivide vastu võrdlemine **ongi** täis-ahela kulu (37k-tokeni kandidaat-list). Seega odav sõel ja hea recall on **vastuolus** selle vea-profiili juures. Mudeli vahetus (Haiku→Sonnet) ei aidanud — probleem on info, mitte võimekus.

---

## 📊 KULU-OPTIMEERIMINE (direktiiv samm 1) — mõõdetud

**(a) Prompt-caching kandidaat-listil** (tegelik A/B, `usage.cache_read_input_tokens`):
- cache TÖÖTAB: 2. kutse luges listi cache'ist (`cache_read = 73 586 tok`, hind ~10% tavalisest).
- Projektsioon 131 kohtunik-kutset: listi-kulu **$24.42 → $2.66** (−89%).
- ⚠️ AGA: `judge.mjs` cache'ib praegu ainult *system*-promptu; list on *user*-sõnumis (cache'imata). Listi-caching nõuaks `judge.mjs` muutmist (SSoT) — EI tehtud enne öist hooki.

**(b) Kandidaat-eelvalik (trigram-shortlist):**
- Täis-list **1684 L3 (~37 280 tok)** → shortlist **~40 L3 (~932 tok)** = **40× väiksem** (üksik-klaster).
- **shortlist-recall = 99.3%** (õige kodu on top-40 sees) — eelvalik ise on suurepärane.
- ⚠️ AGA partii-tasandil (20 klastrit/kutse) läheb shortlistide ÜHEND suureks (~300–500 L3) → reaalne kulu-kärbe ainult **~1.6×**, mitte 40×. Ja täis-ahelas tekitab shortlist **valesid NEW-otsuseid** (kui õiget kodu pole shortlistis, kohtunik "leiutab" kategooria) → fidelity 89.8%.

**Kokkuvõte:** mõlemad optimeeringud mõõdetud; kumbki ei too truu auditit $50 alla (caching nõuab SSoT-muutust + output/Fable-kulu jääb; shortlist kaotab täpsust).

---

## ⚖️ VALIKUD — Tarmo otsustab (direktiiv: "sõel ei läbi → oota")

**CRITICAL / BLOCKER:** —  *(ükski leid ei blokeeri poodi; kataloog on 92.7% ulatuses õige)*

**VAJA ÄRA TEHA:**

1. **Kitsenda ulatus kõrge-riski mainidele** (soovitus, mahub $50 batch): auditi AINULT need mainid, kus misfit'id kuhjuvad (Aed/aiatehnika, Suurköök, Sport/vaba-aeg — kõik 11 lahkheli olid neis). Täis-ahel täis-fidelity'ga, batch. Hinnang kolmele mainile (~1500 klastrit) ~$45 batch → mahub.
2. **Tõsta kulupiir ~$150-ni** → truu kogu-kataloogi batch-audit (kõik 5226, täis-list). Kõige põhjalikum.
3. **Ehita "tark sõel": Sonnet-kohtunik täis-listiga ÜKS pass** (ilma referents/Fable), lipuga kus kohtuniku-kodu ≠ praegune → täis-ahel (Opus+ref+Fable) AINULT lipuga klastritel. Erinevalt sisu-sõelast NÄEB see alternatiive → recall peaks olema kõrge. Vajab eraldi kalibreerimist (kas Sonnet-pass püüab 11/11). ~$13 batch pass + täis-ahel ~7-15%-l → tõenäoliselt < $30. **Eraldi töö, mitte öösel improviseerida.**
4. **List-caching `judge.mjs`-s** (SSoT-muutus): −89% listi-kulu. Ei piisa üksi, aga kombineerituna valikuga 1/3 aitab.

> Soovitus: **valik 1 (kitsendatud ulatus) kohe + valik 3 (tark sõel) järgmise sammuna**. Valik 1 annab väärtust $50 sees juba homme; valik 3 teeb tuleviku-auditid odavaks.

---

## 🔎 11 KONKREETSET LAHKHELI (kalibreerimis-valimist — tegelik auditi-signaal juba praegu)

Need on 150-klastri valimi tegelikud leiud (täis-ahel otsustas värskelt, võrdlus praeguse L3-ga). Enamik on **piiripealsed** (mõlemad kodud usutavad) — just seepärast sõel neid ei püüa. 92.7% valimist oli ÕIGES kohas.

| Toode | Praegune L3 | Ahela ettepanek |
|---|---|---|
| Wheelbarrow Cart, 5 Cu.Ft 397 lbs | Kallutuskärud | **Aiakärud** |
| Art Easel for Kids, 2-in-1 Wooden | Kunsti- ja joonistustarvikud | **Tegevustahvlid** (lastekaubad) |
| Reversible Grill/Griddle 14×8.5" | Lauagrillid ja grillplaadid | **Praepannid ja pannikomplektid** |
| Rice Warmer Stand 14×14" Restaurant | Soemarmiidid ja bain-marie | **Roostevabast terasest töölauad** |
| Folding Shower Seat 34.5×32.5 cm | Dušitoolid ja -pingid | **Dušipingid ja -istmed** |
| Outdoor Park Style Grill 16×16" | Grillrestid ja lõkkegrillid | **Söe- ja gaasigrillid** |
| Golf Storage Garage Organizer | Golfikäru-katted ja -tarvikud | **Pallihoidjad ja spordivarustuse kärud** |
| Hydraulic Dump Lift Kit 22 000 lb | Hüdroagregaadid | **UUS: «Hüdraulilised kallutuskomplektid»** |
| Go Kart Wheels Rain Tires Set of 4 | ATV tarvikud | **Golfikäru ja go-kart osad** |
| Infrared Sauna Blanket 71×32" | Saunatarvikud | **Infrapunasaunad** |
| Artificial Plant Wall 4 PCS | Taimeseinad ja haljasseinad | **Privaatsusekraanid ja kunsthekid** |

Ekstrapoleerides 7.3% lahkheli-määra kogu kataloogile: **~380 klastrit** (~mitu sada toodet) võiks olla paremas kodus. Enamik piiripealsed, mitte jämedad vead.

---

## 🌱 Aiatoodete kontroll (direktiiv samm 4)

DB-heuristika (read-only, enne DB-vaikust) leidis **tegeliku misfit'i**:
- **Kultivaatorid/mullafreesid** (`rototillers & cultivators`, gas/electric tillers) istuvad osaliselt `v4-pollumajandus-ja-loomakasvatus-talutehnika-lohistatavad-akked` (= äkked/randaalid) all → vale tüüp (freesid ≠ äkked).
- **Mururullid** (`lawn rollers`) jagunevad `muruvaltsid` ja `lohistatavad-akked` vahel → sama L3 peaks koondama.

*(See kinnitab valiku 1 loogikat: Aed/aiatehnika main on misfit-tihe → esmane audit-sihtmärk.)*

---

## ✅ Eile loodud 4 uut L3 — verifitseeritud (direktiiv samm 5, OSA 2)

Batch `e2-2026-10-06T1820`, kõik **LIVE ja terviklikud** (undo: `node scripts/classifier-undo.mjs e2-2026-10-06T1820`):

| L3 | Tooteid | SEO | active/internal | nav-puu | pilt |
|---|---|---|---|---|---|
| Pika materjali hoiuriiulid | 9 | 329 t | ✅ / ❌ | JAH | ✅ |
| Päikesepaneelide hoiu- ja kandekotid | 4 | 263 t | ✅ / ❌ | JAH | ✅ |
| Energiasalvestusakud | 3 | 301 t | ✅ / ❌ | JAH | ✅ |
| Universaalnöörid ja paracord | 3 | ~290 t | ✅ / ❌ | JAH | ✅ |

Kõik 4: tooted olemas, SEO-tekst olemas, aktiivne + mitte-internal, navigatsioonis nähtav, pilt olemas. **pending = 0.**

---

## 🤖 Klassifikaatori seis (read-only)

| | |
|---|---|
| `classifier_config.auto_create_enabled` | **false** (shadow-režiim, Variant 1 — ohutu algseis) |
| `classifier_shadow_ledger` | **0 rida** (öist uut-L3 shadow'i veel ei ole) |
| `taxonomy_overlap_signal` | OLEMAS, **1 rida** |

---

## 🌙 Öine import-pipeline [4] tulemus (direktiiv samm 5, OSA 1)

**Seis: OOTEL** — pipeline jookseb 03:00 CEST (praegu kirjutamise hetk 23:07 CEST = pipeline pole veel jooksnud). DB-vaikuse aken 02:45–04:30.
**Kogutakse pärast 04:30** (ajastatud äratus) ja lisatakse siia: kas [4] ahel-hook jooksis, auto-assign/LCA/shadow arvud, koodivead.

<!-- PIPELINE-[4]-TULEMUS-SIIA -->

---

## 🐞 Avastatud koodi-gotcha (VAJA ÄRA TEHA)

- **Fable-viigimurdja JSON-truncation:** `classify-chain.mjs` Fable-kutse `max_tokens` on liiga väike paljusõnalise `reason`-välja jaoks → JSON katkeb (`new_l3` juhtudel nähtud). Öine hook püüab selle `code_bug`-ina (Telegram), aga **tõsta Fable `max_tokens`** (nt 4000→6000) et viigimurdja ei kukuks verbose põhjenduse peal.
- **Referents-partii output-cap:** 40 klastrit/kutse → Sonnet-referentsi JSON katkes (output-limiit). Auditis vähendatud 20-le. Kui `judge.mjs` cluster-funktsioone kasutatakse suurte partiidega, hoia chunk ≤ 20.

---

## 🔐 Ohutus (täidetud)

- ✅ **DRY:** DB-sse EI kirjutatud midagi. Väljund ainult `reports/` + `scratchpad/*.json`.
- ✅ **Kulupiir:** kõva $50 valve koodis (`guard()`), peatub ületusel. Tegelik kulu **~$11.80** (kalibreerimine + mõõtmine).
- ✅ **Täis-audit EI käivitatud** — direktiivi värav rakendus (sõel ei läbinud).
- ✅ **HARD RULE #8:** test-identiteet, inimese JWT-d EI mint'itud (audit on puhas read + LLM, 0 DB-kirjet, 0 admin-login).
- ✅ **DB-vaikuse aken 02:45–04:30** austatud (kõik DB-lugemine tehtud enne; LLM-töö loeb ainult offline JSON-i). Öist [4] hooki EI puudutatud.

---

## Masinloetavad väljundid (scratchpad)

- `audit-measure.json` — caching + eelvalik mõõtmised
- `audit-calibration.json` — 150-klastri kalibreerimine (recall, confusion, 11 lahkheli)
- `audit-probe.json` — shortlist-ahela fidelity + kulu-projektsioon
- `audit-clusters.json` — 5226 klastrit + 1684 L3 (DB-dump, read-only)
- Tööriist: `scripts/catalog-audit.mjs` (measure | calibrate | probe | full staadiumid)
