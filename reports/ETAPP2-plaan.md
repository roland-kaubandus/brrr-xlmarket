# ETAPP 2 — LÕPLIK PLAAN (ENNE DB-kirjutust)

> Genereeritud 2026-10-06T17:16:31.965Z · `scripts/classify-etapp2-create.mjs` · allikas `reports/classify-chain-dryrun-v2.json`
> **REŽIIM: PLAAN AINULT — DB-s/stagingus EI muudetud midagi.** Spec §4 + §4.5 täielikkus-värav.
> Fable kutseid: 4 (in 2737 / out 1893 tok, ~$0.1220)

---

## «Pika materjali hoiuriiulid»  (×9 toodet)

| väli | väärtus |
|---|---|
| **ET nimi** | Pika materjali hoiuriiulid |
| **EN nimi** | Lumber Storage Racks |
| **handle/slug** | `v4-ladu-riiulid-restid-pika-materjali-hoiuriiulid` |
| **L2-vanem** | Riiulid ja restid (`v4-ladu-riiulid-restid`) |
| **päritolu** | viigimurdja→new_l3 (3× hääletus: 2/3 ✓) |
| **tagline ET** | Pikk materjal seinale – põrand vabaks! |
| **tagline EN** | Long materials on the wall – floor space freed! |

**SEO kirjeldus (ET):** Seinale kinnitatavad hoiuriiulid puidu, torude, liistude ja muu pika materjali korrastatud hoiustamiseks töökojas või garaažis. Sobivad nii hobimeistrile kui ka professionaalile, kes soovib põranda vabaks hoida. Ostul pane tähele riiulitasandite arvu, kandevõimet tasandi kohta (50–100 kg) ja seina tüüpi, kuhu riiul kinnitatakse.

**SEO kirjeldus (EN):** Wall-mounted storage racks for keeping lumber, pipes, mouldings and other long materials neatly organised in your workshop or garage. Suitable for both hobbyists and professionals who want to keep the floor clear. When buying, check the number of tiers, load capacity per tier (50–100 kg) and the type of wall the rack will be mounted on.

**Pilt (hele valge taust):** Heledal valgel taustal seinale kinnitatud mitmetasandiline metallist hoiuriiul, millel lebavad puitlauad ja -liistud.  
_Pipeline: primaar `build-cat-thumbs-l3.mjs` (top-toote pilt Meili/VEVOR CDN → webp 400×400 valge taust); fallback Gemini `image-pipeline/orchestrator.mjs` (#FFFFFF seamless)._

**Tooted (9):**
- `prod_01M35WHGGMD39TCEE3AENPEN3P` Lumber Rack, 4-Tier 2-Pack 100 kg per Tier, Welded Wood Pipe Storage,
- `prod_01M35WHGGMHATQ74AR4F8K54X5` Lumber Rack, 4-Tier 2-Pack 50 kg per Tier, Foldable Wood Storage, Wall
- `prod_01M35WHGSMRNV05C4HJSST6SJQ` Lumber Rack, 6-Tier 2-Pack 50 kg per Tier, Foldable Wood Storage, Wall
- `prod_01M35WHGGMY9XQ68VN6KXP1BXA` Lumber Rack, 3-Tier 4-Pack 100 kg per Tier, Welded Wood Pipe Storage,
- `prod_01M35WHGGMNCF2CSRDMJHVB7M9` Lumber Rack, 3-Tier 2-Pack 50 kg per Tier, Foldable Wood Storage, Wall
- `prod_01M35WHGGMY986JEZE92VK5HKW` Lumber Rack, 3-Tier 4-Pack 50 kg per Tier, Foldable Wood Storage, Wall
- `prod_01M35WHGSM6AY9W7TT5ZR01EFJ` Lumber Rack, 4-Tier 4-Pack 50 kg per Tier, Foldable Wood Storage, Wall
- `prod_01M35WHGGMDCRK18KKXJPZWWSB` Lumber Rack, 3-Tier 3-Pack 50 kg per Tier, Foldable Wood Storage, Wall
- `prod_01M35WHGGMKGAJACMQF5GX4FDF` Lumber Rack, 3-Tier 6-Pack 50 kg per Tier, Foldable Wood Storage, Wall

**§4.5 täielikkus-värav:** ✅ KÕIK 11 vara resolvitav

  - ✓ 1 handle unikaalne — v4-ladu-riiulid-restid-pika-materjali-hoiuriiulid
  - ✓ 2 name_et (nimevärav) — Pika materjali hoiuriiulid
  - ✓ 3 name_en (Fable) — Lumber Storage Racks
  - ✓ 4 nav parent-L2 kehtiv — v4-ladu-riiulid-restid
  - ✓ 5 pilt (CDN primaar / Gemini fallback) — 9 toodet → top-toote CDN-pilt → webp valge taust
  - ✓ 6 webp genereeritav — cat-thumbs/v4-ladu-riiulid-restid-pika-materjali-hoiuriiulid.webp (build-cat-thumbs-l3.mjs)
  - ✓ 7 SEO (ET+EN kirjeldus + tagline) — 4/4 välja täidetud
  - ✓ 8 Meili facet — tooted bind → reindeks → facet
  - ✓ 9 DB product_category rida — seed/INSERT transaktsioonis (gate #4)
  - ✓ 10 tooted seotud (≥1) — 9 toodet
  - ✓ 11 täis-deploy — genyM → Meili → push mõlemad → redeploy (§4b)

---

## «Päikesepaneelide hoiu- ja kandekotid»  (×4 toodet)

| väli | väärtus |
|---|---|
| **ET nimi** | Päikesepaneelide hoiu- ja kandekotid |
| **EN nimi** | Solar Panel Storage Bags |
| **handle/slug** | `v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid-paikesepaneelide-hoiu-ja-kandekotid` |
| **L2-vanem** | Taastuvenergia ja generaatorid (`v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid`) |
| **päritolu** | konsensus→new_l3 (1× kinnitus ✓) |
| **tagline ET** | Kaitse oma päikesepaneele teel ja laos! |
| **tagline EN** | Protect your solar panels on the go! |

**SEO kirjeldus (ET):** Siit leiad vastupidavad hoiu- ja kandekotid kokkupandavatele päikesepaneelidele. Veekindlad kotid kaitsevad paneele niiskuse, tolmu ja kriimustuste eest nii transpordil kui ka hoiustamisel. Koti valikul jälgi paneelide arvu ja võimsust (nt 200 W või 400 W), et mahutavus sobiks sinu komplektiga.

**SEO kirjeldus (EN):** Durable storage and carrying bags for foldable solar panels. Waterproof bags protect your panels from moisture, dust and scratches during transport and storage. When choosing a bag, check the panel count and wattage (e.g. 200W or 400W) to ensure the right fit for your setup.

**Pilt (hele valge taust):** Hele valgel taustal must veekindel kandekott, milles on kokkupandav päikesepaneel, nähtavad on tugevad käepidemed ja tõmblukk.  
_Pipeline: primaar `build-cat-thumbs-l3.mjs` (top-toote pilt Meili/VEVOR CDN → webp 400×400 valge taust); fallback Gemini `image-pipeline/orchestrator.mjs` (#FFFFFF seamless)._

**Tooted (4):**
- `prod_01M47BPXRCN3N8RNJMKGGCQ9YP` Solar Panel Storage Bag for 2 x 200W Foldable Solar Panels, Waterproof
- `prod_01M47BPXRCFD3A7DJP84NWMW4J` Solar Panel Storage Bag Holds up to 2 x 200W Foldable Solar Panels, Li
- `prod_01M47BPXRCPXDMRA0K1XX7FJK0` Solar Panel Storage Bag for 2 x 400W Foldable Solar Panels, Waterproof
- `prod_01M47BPXRCVD75VBZJRMPH212W` Solar Panel Storage Bag for 5 x 300W Foldable Solar Panels, Waterproof

**§4.5 täielikkus-värav:** ✅ KÕIK 11 vara resolvitav

  - ✓ 1 handle unikaalne — v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid-paikesepaneelide-hoiu-ja-kandekotid
  - ✓ 2 name_et (nimevärav) — Päikesepaneelide hoiu- ja kandekotid
  - ✓ 3 name_en (Fable) — Solar Panel Storage Bags
  - ✓ 4 nav parent-L2 kehtiv — v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid
  - ✓ 5 pilt (CDN primaar / Gemini fallback) — 4 toodet → top-toote CDN-pilt → webp valge taust
  - ✓ 6 webp genereeritav — cat-thumbs/v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid-paikesepaneelide-hoiu-ja-kandekotid.webp (build-cat-thumbs-l3.mjs)
  - ✓ 7 SEO (ET+EN kirjeldus + tagline) — 4/4 välja täidetud
  - ✓ 8 Meili facet — tooted bind → reindeks → facet
  - ✓ 9 DB product_category rida — seed/INSERT transaktsioonis (gate #4)
  - ✓ 10 tooted seotud (≥1) — 4 toodet
  - ✓ 11 täis-deploy — genyM → Meili → push mõlemad → redeploy (§4b)

---

## «Energiasalvestusakud»  (×3 toodet)

| väli | väärtus |
|---|---|
| **ET nimi** | Energiasalvestusakud |
| **EN nimi** | Energy Storage Batteries |
| **handle/slug** | `v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid-energiasalvestusakud` |
| **L2-vanem** | Taastuvenergia ja generaatorid (`v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid`) |
| **päritolu** | viigimurdja→new_l3 (3× hääletus: 3/3 ✓) |
| **tagline ET** | Salvesta energia täna, kasuta homme! |
| **tagline EN** | Store energy today, use it tomorrow! |

**SEO kirjeldus (ET):** Siit leiad kvaliteetsed LiFePO4-liitiumakud päikeseenergia salvestamiseks, matkaautodele, paatidele ja autonoomsetele elektrisüsteemidele. Pika elueaga akud (4000+ laadimistsüklit) on varustatud sisseehitatud BMS-kaitsega ning paljudel mudelitel ka Bluetooth-jälgimisega. Enne ostu veendu, et aku pinge (12V/24V/48V) ja mahtuvus vastaksid sinu süsteemi vajadustele.

**SEO kirjeldus (EN):** Here you'll find quality LiFePO4 lithium batteries for solar energy storage, campervans, boats and off-grid power systems. Long-life batteries (4000+ charge cycles) come with built-in BMS protection, and many models feature Bluetooth monitoring. Before purchasing, make sure the battery voltage (12V/24V/48V) and capacity match your system's needs.

**Pilt (hele valge taust):** Heledal valgel taustal sinine LiFePO4-liitiumaku klemmide ja Bluetooth-ikooniga esipaneelil.  
_Pipeline: primaar `build-cat-thumbs-l3.mjs` (top-toote pilt Meili/VEVOR CDN → webp 400×400 valge taust); fallback Gemini `image-pipeline/orchestrator.mjs` (#FFFFFF seamless)._

**Tooted (3):**
- `prod_01M2Y5BB4WEYKFR2B8K0265SCE` 24V 100Ah LiFePO4 Lithium Battery 4000+ Cycles 100A BMS with Bluetooth
- `prod_01M2Y5BB4XG10FXSN6QFG29SR7` 24V 50Ah LiFePO4 Lithium Battery 4000+ Cycles 50A BMS with Bluetooth,
- `prod_01M2Y5BB4WQWBEVEKBMTA95N49` 24V 100Ah LiFePO4 Lithium Battery 4000+ Cycles Built-in 100A BMS, Lith

**§4.5 täielikkus-värav:** ✅ KÕIK 11 vara resolvitav

  - ✓ 1 handle unikaalne — v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid-energiasalvestusakud
  - ✓ 2 name_et (nimevärav) — Energiasalvestusakud
  - ✓ 3 name_en (Fable) — Energy Storage Batteries
  - ✓ 4 nav parent-L2 kehtiv — v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid
  - ✓ 5 pilt (CDN primaar / Gemini fallback) — 3 toodet → top-toote CDN-pilt → webp valge taust
  - ✓ 6 webp genereeritav — cat-thumbs/v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid-energiasalvestusakud.webp (build-cat-thumbs-l3.mjs)
  - ✓ 7 SEO (ET+EN kirjeldus + tagline) — 4/4 välja täidetud
  - ✓ 8 Meili facet — tooted bind → reindeks → facet
  - ✓ 9 DB product_category rida — seed/INSERT transaktsioonis (gate #4)
  - ✓ 10 tooted seotud (≥1) — 3 toodet
  - ✓ 11 täis-deploy — genyM → Meili → push mõlemad → redeploy (§4b)

---

## «Universaalnöörid ja paracord»  (×3 toodet)

| väli | väärtus |
|---|---|
| **ET nimi** | Universaalnöörid ja paracord |
| **EN nimi** | Utility Cords & Paracord |
| **handle/slug** | `v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine-universaalnoorid-ja-paracord` |
| **L2-vanem** | Matkavarustus ja telkimine (`v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine`) |
| **päritolu** | konsensus→new_l3 (1× kinnitus ✓) |
| **tagline ET** | Tugev nöör igaks olukorraks – matkal ja kodus |
| **tagline EN** | Strong cord for every situation – outdoors and at home |

**SEO kirjeldus (ET):** Siit leiad vastupidavad universaalnöörid ja klassikalise 550 paracordi matkale, ellujäämisvarustusse ja igapäevasteks töödeks. Nailonist punutud nöör talub suurt koormust, ei mädane niiskuses ja sobib nii telgi kinnitamiseks, varustuse sidumiseks kui ka käevõrude punumiseks. Ostul jälgi nööri läbimõõtu, rulli pikkust ja tõmbetugevust – 550-tüüpi paracord kannatab kuni u 250 kg koormust.

**SEO kirjeldus (EN):** Durable utility cords and classic 550 paracord for hiking, survival kits and everyday tasks. Braided nylon cord handles heavy loads, resists moisture and works for securing tents, lashing gear or weaving bracelets. When buying, check the cord diameter, spool length and tensile strength – type 550 paracord holds up to approx. 250 kg.

**Pilt (hele valge taust):** Heledal valgel taustal korralikult keritud roheline paracord-nööri rull, mille ots on lahtiselt esiplaanil nähtaval.  
_Pipeline: primaar `build-cat-thumbs-l3.mjs` (top-toote pilt Meili/VEVOR CDN → webp 400×400 valge taust); fallback Gemini `image-pipeline/orchestrator.mjs` (#FFFFFF seamless)._

**Tooted (3):**
- `prod_01M38EY888NMVK3YVDC54C1PP4` Paracord Rope 4.7 mm x 305 m Nylon Parachute Cord 550 Tactical, Surviv
- `prod_01M2Y5BB4XSPPBDF81BG64PS0K` Paracord Rope 4 mm x 60 m Nylon Parachute Cord 550 Tactical, Survival
- `prod_01M2Y5BB4X7V02CKTGCKD73WWZ` Paracord Rope 4 mm x 305 m Nylon Parachute Cord 550 Tactical, Survival

**§4.5 täielikkus-värav:** ✅ KÕIK 11 vara resolvitav

  - ✓ 1 handle unikaalne — v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine-universaalnoorid-ja-paracord
  - ✓ 2 name_et (nimevärav) — Universaalnöörid ja paracord
  - ✓ 3 name_en (Fable) — Utility Cords & Paracord
  - ✓ 4 nav parent-L2 kehtiv — v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine
  - ✓ 5 pilt (CDN primaar / Gemini fallback) — 3 toodet → top-toote CDN-pilt → webp valge taust
  - ✓ 6 webp genereeritav — cat-thumbs/v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine-universaalnoorid-ja-paracord.webp (build-cat-thumbs-l3.mjs)
  - ✓ 7 SEO (ET+EN kirjeldus + tagline) — 4/4 välja täidetud
  - ✓ 8 Meili facet — tooted bind → reindeks → facet
  - ✓ 9 DB product_category rida — seed/INSERT transaktsioonis (gate #4)
  - ✓ 10 tooted seotud (≥1) — 3 toodet
  - ✓ 11 täis-deploy — genyM → Meili → push mõlemad → redeploy (§4b)

---

## KOKKUVÕTE

- **4 uut L3**, kokku **19 toodet**.
- Täielikkus-värav: ✅ kõik 4 L3 läbivad (kõik 11 vara olemas).
- **PLAAN — DB/staging puutumata.** Päris-loomine ootab `--execute` (pärast Tarmo OK).
