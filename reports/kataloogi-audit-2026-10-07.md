# Kataloogi klassifikatsiooni-audit — 2026-10-07

> **Direktiiv 2026-10-07 (Tarmo):** täisaudit kogu kataloogil, TRUU täisahelaga (mitte sõel, mitte kitsendus). Kulupiir **$160 (batch)**. DRY, väljund `reports/` + JSON.
> **Seis: EELTINGIMUSED TEHTUD (Fable-fix ✅, caching mõõdetud ✅) → UUS HINNANG ~$200 batch > $160 piir → täisaudit EI käivitatud, ootab Tarmo kulu-otsust.**
> Kulu siiani: **~$15** (kalibreerimine + Fable-fix test + batch-smoke, kõik DRY). DB-d EI muudetud.

---

## 🛑 PÕHITULEMUS (2026-10-07) — truu täisahel ei mahu $160 sisse, sest batch EI jaga prompt-cache'i

Direktiivi 3 väravat läbitud:

**1. Fable-truncation parandatud ✅.** Juurpõhjus: Fable-5 mittedeterministlik — üksik kutse tekitab vahel pikema mõttekäigu, mis ammendab `max_tokens` enne JSON-i lõppu (`stop_reason=max_tokens` → katkenud JSON). Parandus (`classify-chain.mjs` `makeFable`): kordab eskaleeritud laega `[32000, 56000]`, eemaldab koodi-aiad, viskab vea alles 2. ebaõnnestumisel. Test: 0 truncationit (spu:12468 → `new_l3` «Kallutuskomplektid», Fable 3/3 häält; + 80-klastri batch-smoke 0 truncationit).

**2. Caching mõõdetud — KRIITILINE LEID: batch EI jaga prompt-cache'i päringute vahel.**

| Kontekst | cache_read (mõõdetud) | Mida tähendab |
|---|---|---|
| **Sünkroonne** (järjest kutsed, sama mudel, <5 min) | `91 585 tok` 2. kutsel (~81% säästu soojalt) | ✅ caching TÖÖTAB |
| **Batch** (80-klastri smoke, chunk=40) | `cache_read = 0`, `cache_write = 363 914` | 🛑 iga päring kirjutab listi UUESTI |

Batch töötleb päringud **paralleelselt** → iga päring kirjutab 91 585-tokenise kandidaat-listi cache'i eraldi, keegi ei loe teise omast. **Caching-eeldus, millel vana $149-hinnang põhines, EI kehti batch'is.**

**3. Uus kuluhinnang (direktiiv samm 2: enne/pärast):**

| | Hinnang | Alus |
|---|---|---|
| **ENNE** (vana eeldus) | ~$149 batch | eeldas et caching rakendub batch'is (−89% listi-kulu) |
| **PÄRAST** (mõõdetud) | **~$200 batch** | $3.06 / 80 klastrit = $0.0383/klaster × 5225 (smoke chunk=40) |

**Miks ei saa alla $160 (struktuurne):** kulu-draiver EI ole list, vaid **output** — Opus-kohtunik ~1178 tok/klaster + Sonnet-referents ~1065 tok/klaster, mõlemal **kõigil** 5225 klastril (täis-ahela nõue). Output ei cache'u ega kahane (batch annab juba −50%). Output-põrand = **~$119** (judge+ref) + Fable ~$17 + input ~$10 = **~$146 absoluutne miinimum** ka hiiglaslike chunk'idega. List amortiseerub suurema chunk'iga, AGA judge-output (~1178 tok/kl) lööb **max_output lae** → chunk praktiline ülempiir ~60–80 klastrit → reaalne põrand **~$175–200**.

**Järeldus:** truu kogu-kataloogi täisahel (nagu Tarmo nõudis — mitte sõel, mitte kitsendus) maksab **~$175–200**, struktuurselt **üle $160 piiri**. Vajab Tarmo kulu-otsust (valikud all).

---

## ⚖️ VALIKUD — Tarmo otsustab (direktiiv: käivita AINULT kui ≤ $160)

**CRITICAL / BLOCKER:** —  *(ükski leid ei blokeeri poodi)*

**VAJA ÄRA TEHA:**

1. **Tõsta piir ~$210-ni → chunk=40 täis-fidelity täisaudit (~$200).** Ohutu chunk (0 truncation tõestatud), kõrgeim kvaliteet, kogu 5225 klastrit. Soovitus kui tahad TÄIELIKKU auditit.
2. **Jää $160 → käivita, live-valve peatab $160 juures.** Kataloog auditeeritakse järjekorras kuni piir; kaetud **~80% (~4200 klastrit)**, ülejäänu järgmise eelarvega. Saad truu auditi suurema osa katalogist $160 sees, teadlikult osaline.
3. **Trimmi auditi-skeemist prose-väljad** (`considered_reason`) — OTSUS (action+target) jääb identne, ainult seletus lüheneb → output −~40% → **~$140 batch, mahub $160**. Nüanss: võib OTSUST õrnalt mõjutada (mudel põhjendab vähem). Vajab 1 kalibreerimis-jooksu kinnitamaks et otsused ei muutu. **Lähim "truu + mahub" variant.**
4. **Ära käivita nüüd.** Fable parandatud + batch-pipeline tõestatud; otsusta hiljem rahulikult.

> **Soovitus:** **valik 3** (prose-trim, ~$140) kui "truu + $160 sees" on prioriteet — teen 1 kalibreerimis-jooksu tõestamaks otsuste identsust, siis käivitan. VÕI **valik 1** (tõsta $210) kui tahad 100% muutmata ahelat. **Valik 2** annab 80% kohe $160 sees.

---

## 📜 VARASEM: $50 kaheastmeline sõel (2026-10-06 öö) — EI läbinud (ajalugu)

> Direktiiv 2026-10-06 nõudis odavat kaheastmelist sõela $50 piiriga. See EI läbinud; 2026-10-07 direktiiv asendas selle truu täisahelaga. Säilitatud õppetunniks.

Kalibreerimine 150 juhu-klastril (fikseeritud seeme 20261007):

| Lähenemine | Mõõdetud tulemus | Verdikt |
|---|---|---|
| **Odav sõel** (Haiku) — "kas praegune L3 õige?" | recall **36.4%** (vahele 7/11 viga) | 🛑 kukub |
| **Odav sõel eskaleeritud Sonnet-ile** (HARD RULE #6) | recall **36.4%** (samad 7 vahele) | 🛑 kukub |
| **Eelvalik-shortlist** (praegune L3 + 30 lähimat) täis-ahelas | kokkulangevus täis-listiga **89.8%**, tekitab valesid NEW-otsuseid | 🛑 fidelity kukub |

**Miks sõel struktuurselt ei tööta:** kõik 7 vahele-jäänud viga on **"mujal on PAREM naaber-kodu"** juhtumid (mitte jämedad valepaigutused): kallutuskäru↔aiakäru, grill/griddle↔praepann, dušitool↔dušipink. Sõel vaatab AINULT "praegune L3 + toode" → ei näe alternatiive. Alternatiivide vastu võrdlemine **ongi** täis-ahela kulu. Mudeli vahetus (Haiku→Sonnet) ei aidanud — probleem on info, mitte võimekus. **See on ka põhjus, miks 2026-10-07 direktiiv nõuab truu täisahelat.**

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

## 🐞 Avastatud koodi-gotcha

- **Fable-viigimurdja JSON-truncation — PARANDATUD ✅** (`classify-chain.mjs` `makeFable`): juurpõhjus polnud fikseeritud lävi vaid Fable-5 mittedeterminism (vahel pikem mõttekäik ammendab `max_tokens`). Fix: kordus eskaleeritud laega `[32000, 56000]` + koodi-aedade eemaldus + viga alles 2. kukkumisel. Testitud 0 truncationit. **Kehtib ka öisele hookile** (sama SSoT-moodul).
- **Batch EI jaga prompt-cache'i (VAJA ÄRA TEHA, dokumenteeritud):** paralleel-töötlus → iga päring kirjutab kandidaat-listi (91 585 tok) cache'i eraldi, `cache_read=0`. Caching aitab AINULT sünkroonselt (<5 min TTL, sama mudel). Tähtis iga tuleviku-batch-disaini juures: ära eelda cache-säästu batch'is.
- **Output domineerib, mitte list:** Opus-kohtunik ~1178 tok/klaster + Sonnet-ref ~1065 tok/klaster. See seab chunk'ile `max_output` lae (~60–80 klastrit/kutse) ja on täisahela kulu-põrand (~$119 output üksi 5225 klastril, batch −50%-ga).

---

## 🔐 Ohutus (täidetud)

- ✅ **DRY:** DB-sse EI kirjutatud midagi. Väljund ainult `reports/` + `scratchpad/*.json`.
- ✅ **Kulupiir:** kõva $160 valve koodis (`guard()` + PRE-FLIGHT projektsioon, peatub ületusel). Tegelik kulu siiani **~$15** (kalibreerimine + Fable-fix test + batch-smoke).
- ✅ **Täis-audit EI käivitatud** — direktiivi värav rakendus (uus hinnang ~$200 > $160 piir → ootab Tarmo kulu-otsust, vt VALIKUD).
- ✅ **HARD RULE #8:** test-identiteet, inimese JWT-d EI mint'itud (audit on puhas read + LLM, 0 DB-kirjet, 0 admin-login).
- ✅ **DB-vaikuse aken 02:45–04:30** austatud (kõik DB-lugemine tehtud enne; LLM-töö loeb ainult offline JSON-i). Öist [4] hooki EI puudutatud.

---

## Masinloetavad väljundid (scratchpad)

- `audit-measure.json` — caching + eelvalik mõõtmised
- `audit-calibration.json` — 150-klastri kalibreerimine (recall, confusion, 11 lahkheli)
- `audit-probe.json` — shortlist-ahela fidelity + kulu-projektsioon
- `audit-clusters.json` — 5226 klastrit + 1684 L3 (DB-dump, read-only)
- `audit-pretest.json` — Fable-fix test (0 truncation) + caching sünkr-mõõtmine
- Tööriist: `scripts/catalog-audit.mjs` (measure | calibrate | probe | **full** = batch-täisahel staadiumid). `full` teeb PRE-FLIGHT projektsiooni ja keeldub submit'imast kui > `AUDIT_CAP` ($160).
