# ETAPP 2 — LÕPLIK PLAAN (ENNE DB-kirjutust)

> Genereeritud 2026-10-06T17:41:24.939Z · `scripts/classify-etapp2-create.mjs` · allikas `reports/classify-chain-dryrun-v2.json`
> **REŽIIM: PLAAN AINULT — DB-s/stagingus EI muudetud midagi.** Spec §4 + §4.5 täielikkus-värav.
> Fable kutseid: 4 (in 4385 / out 1689 tok, ~$0.1283)

---

## «Pika materjali hoiuriiulid»  (×9 toodet)

| väli | väärtus |
|---|---|
| **ET nimi** | Pika materjali hoiuriiulid |
| **EN nimi** | Lumber Storage Racks |
| **handle/slug** | `v4-ladu-riiulid-restid-pika-materjali-hoiuriiulid` |
| **L2-vanem** | Riiulid ja restid (`v4-ladu-riiulid-restid`) |
| **päritolu** | viigimurdja→new_l3 (3× hääletus: 2/3 ✓) |
| **tagline ET** | Pikad materjalid korras ja käepärast |
| **tagline EN** | Keep long materials tidy and within reach |

**SEO kirjeldus (ET):** Pika materjali hoiuriiulid aitavad hoida lauad, prussid, torud ja muud pikad materjalid korras ning seinalt kergesti kättesaadavana. Sobivad töökotta, garaaži või lattu nii hobimeistritele kui ka professionaalidele. Valikul tasub jälgida sobivat tasandite arvu, paigaldusviisi ja materjali vastupidavust.

**SEO kirjeldus (EN):** Lumber storage racks keep boards, beams, pipes and other long materials organised and easily accessible on the wall. Ideal for workshops, garages and warehouses, suiting both hobbyists and professionals. When choosing, consider the number of tiers, mounting type and material durability.

**Pilt (hele valge taust):** Heledal valgel taustal seinale kinnitatav mitmetasandiline metallist hoiuriiul, millel lebavad puitlauad.  
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
  - ✓ 7 SEO (ET+EN kirj.+tagline, kategooria-tasand, 0 numbrit/lubadust) — 4/4 täidetud · SEO-värav läbib
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
| **tagline ET** | Kaitse ja kanna oma päikesepaneele mugavalt |
| **tagline EN** | Protect and carry your solar panels with ease |

**SEO kirjeldus (ET):** Siit leiad hoiu- ja kandekotid kokkupandavate päikesepaneelide mugavaks transportimiseks ja kaitsmiseks. Need sobivad matkajatele, haagissuvilaga reisijatele ja kõigile, kes kasutavad kaasaskantavaid päikesepaneele teel olles. Vali kott vastavalt oma paneelide suurusele ja arvule ning pööra tähelepanu materjali vastupidavusele.

**SEO kirjeldus (EN):** Here you will find storage and carrying bags for transporting and protecting foldable solar panels. They suit campers, caravan travellers and anyone using portable solar panels on the go. Choose a bag according to the size and number of your panels and pay attention to material durability.

**Pilt (hele valge taust):** Tume vastupidav kandekott kokkupandava päikesepaneeli jaoks, käepidemete ja tõmblukuga, heledal valgel taustal.  
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
  - ✓ 7 SEO (ET+EN kirj.+tagline, kategooria-tasand, 0 numbrit/lubadust) — 4/4 täidetud · SEO-värav läbib
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
| **tagline ET** | Kindel energiavaru sinu süsteemile |
| **tagline EN** | Reliable stored power for your system |

**SEO kirjeldus (ET):** Siit leiad energiasalvestusakud päikesesüsteemidele, haagissuvilatele, paatidele ja autonoomsetele lahendustele. Sobivad nii koduseks varutoiteks kui ka võrguvabaks elektrivarustuseks. Valikul tasub jälgida, et aku sobiks sinu süsteemi pinge ja kasutusotstarbega.

**SEO kirjeldus (EN):** Discover energy storage batteries for solar systems, campervans, boats and off-grid setups. Suitable for home backup power as well as independent energy solutions. When choosing, make sure the battery matches your system voltage and intended use.

**Pilt (hele valge taust):** Heledal valgel taustal kompaktne energiasalvestusaku puhta korpuse ja klemmidega.  
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
  - ✓ 7 SEO (ET+EN kirj.+tagline, kategooria-tasand, 0 numbrit/lubadust) — 4/4 täidetud · SEO-värav läbib
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
| **tagline ET** | Tugev nöör igaks seikluseks ja tööks |
| **tagline EN** | Strong cord for every adventure and task |

**SEO kirjeldus (ET):** Siit leiad mitmekülgsed universaalnöörid ja paracordi, mis sobivad matkamiseks, telkimiseks, ellujäämisvarustuseks ja igapäevasteks töödeks kodus või aias. Sobib varustuse kinnitamiseks, telgi pingutamiseks, asjade sidumiseks ja loominguliseks punumiseks. Valikul jälgi sobivat pikkust, jämedust ja kasutusotstarvet.

**SEO kirjeldus (EN):** Discover versatile utility cords and paracord suitable for hiking, camping, survival kits and everyday tasks at home or in the garden. Ideal for securing gear, guying tents, tying down loads and creative braiding projects. When choosing, consider the right length, thickness and intended use.

**Pilt (hele valge taust):** Heledal valgel taustal korralikult kokku keritud värviline paracord-nööri rull.  
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
  - ✓ 7 SEO (ET+EN kirj.+tagline, kategooria-tasand, 0 numbrit/lubadust) — 4/4 täidetud · SEO-värav läbib
  - ✓ 8 Meili facet — tooted bind → reindeks → facet
  - ✓ 9 DB product_category rida — seed/INSERT transaktsioonis (gate #4)
  - ✓ 10 tooted seotud (≥1) — 3 toodet
  - ✓ 11 täis-deploy — genyM → Meili → push mõlemad → redeploy (§4b)

---

## KOKKUVÕTE

- **4 uut L3**, kokku **19 toodet**.
- Täielikkus-värav: ✅ kõik 4 L3 läbivad (kõik 11 vara olemas).
- **PLAAN — DB/staging puutumata.** Päris-loomine ootab `--execute` (pärast Tarmo OK).
