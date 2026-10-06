# AUTO-JUDGE kalibreerimine — Opus-REFERENTS (automaatne, HARD RULE #6)

> Genereeritud 2026-10-06T11:53:26.356Z. actor='opus-reference' calibration_rating-tabelis. Kohtunik DRY (ei rakendatud).
> Referents hindas PIMESI (ei näinud kohtuniku vastuseid). Kriteerium identne kohtuniku omaga.

## 🔤 Sünonüüm — kohtunik (Sonnet) vs referents (Opus)

| mõõdik | väärtus | lävi | verdikt |
|---|---|---|---|
| Kokkulangevus | 79/100 (79.0%) | — | — |
| **VALE-OK** (kohtunik OK, referents mitte) | 2/100 (2.0%) | ≤5% | ✅ LÄBITUD |
| Ohutu vaikimisi (ei lähe otsingusse) | 21 | — | mitte inimese järjekord |

### Lahknevused (→ ohutu vaikimisi)

| sõna | kohtunik | referents | VALE-OK? | referentsi põhjus |
|---|---|---|---|---|
| dj lahter | EBAKINDEL | VALE | ei | "Dj lahter" ei ole mõistlik otsingusõna DJ-laua alusele, õige oleks dj laud. |
| traktori kopp | VALE | OK | ei | Klient otsib traktori kopa tarvikuid ja servakaitsmed sobivad. |
| taimekaitse | EBAKINDEL | OK | ei | Taimekaitsepuur ja kaitsevõrk vastavad taimekaitse tootele. |
| autokatus | VALE | OK | ei | Roof rack vastab auto katusekorvile, sobib sõnaga autokatus. |
| hoiulaudade riiuli | EBAKINDEL | VALE | ei | Toode on triikimislaud, mitte hoiuriiul; klient ootaks riiulit. |
| või traktorile | EBAKINDEL | OK | ei | Traktorile kinnituv tööriist vastab kiirkinnitusega heinapalli odale. |
| katusehoidja | VALE | OK | ei | Klient, kes otsib katusehoidja/roof storage lift, ootaks seda Jeep hardtopi tõstukit. |
| tuhk-lapp | EBAKINDEL | VALE | ei | Tuhkur on loom ja tuhk-lapp pole ash shovel; sünonüümid on eksitavad. |
| nisurohu mahl | VALE | OK | ei | Nisurohu mahla otsija ootaks nisurohu mahlapressi. |
| gaasitank | EBAKINDEL | VALE | ei | Gaasitank/võisusilinder on eksitav; see on külmaaine kogumismahuti, mitte gaasiballoon. |
| puukäru | VALE | OK | ei | Puukäru viitab küttepuude hoidikule/kärule ning küttepuuriiul vastab otsingule. |
| alumiiniumne tugi | EBAKINDEL | VALE | ei | Alumiiniumne tugi on liiga üldine ja katuseristkang ei vasta kliendi tõenäolisele ootusele. |
| drenaaž | VALE | EBAKINDEL | ei | Torupuhastusmasin seostub äravooluga, kuid drenaaž viitab tavaliselt maapinna kuivendusele, mitte torupuhastusele. |
| katedraalus | EBAKINDEL | VALE | ei | Katedraal viitab kirikule, mitte toidusoojendusalusele; termin on ekslik. |
| hüdropinju | OK | EBAKINDEL | ⚠️ jah | Hüdropinju ei ole selge eestikeelne termin, tähendus ebaselge. |
| avatav päikesekatuse | VALE | OK | ei | Avatav päikesekatuse viitab matkaauto varikatusele, mis vastab tootele. |
| sügavpuurmasin | VALE | EBAKINDEL | ei | Kroonpuurmasin ei ole päris sügavpuurmasin, kuid võib kattuda puurimise otsinguga. |
| tarvikukomplekt | EBAKINDEL | OK | ei | Toode on tarvikukomplekt, vastab üldotsingule. |
| seljavõnk | OK | EBAKINDEL | ⚠️ jah | Seljavõnk pole tavapärane eesti otsingusõna inversioonilaua jaoks, tähendus ebaselge. |
| null gravity tehe | VALE | OK | ei | Zero gravity on levinud otsingusõna selle lamamistooli tüübi jaoks. |
| roostevabast terasest pann | VALE | OK | ei | Roostevabast terasest pann vastab gastronormanumale laialt. |

## 🏷 Klassifikaator — kohtunik (klastri-tasand, Opus) vs referents (Opus, pime)

| mõõdik | väärtus | lävi | verdikt |
|---|---|---|---|
| Kokkulangevus (tegevus) | 16/40 (40.0%) | — | — |
| **VALE-assign** (kohtunik paigutas, referents mitte samasse) | 9/40 (22.5%) | ≤2,5% | 🔴 ÜLETATUD |
| Ohutu vaikimisi (jääb ootele) | 9 | — | mitte inimese järjekord |

### Lahknevused (→ ohutu vaikimisi)

| toode | kohtunik | referents | VALE-assign? | referentsi põhjus |
|---|---|---|---|---|
| Lumber Rack, 4-Tier 2-Pack 100 kg per Tier, Welded | new_l3 | assign_existing → v4-ladu-seinale-kinnitatavad-hoiususteemid | ei | Seinale kinnitatav konsool-tüüpi puidu/toru hoiuriiul garaaži jaoks sobib seinale kinnitatavate hoiusüsteemide alla. |
| Lumber Rack, 4-Tier 2-Pack 50 kg per Tier, Foldabl | new_l3 | assign_existing → v4-ladu-seinale-kinnitatavad-hoiususteemid | ei | Seinale kinnitatav kokkupandav puidu hoiusüsteem konsoolkätega sobib seinale kinnitatavate hoiusüsteemide alla. |
| Lumber Rack, 6-Tier 2-Pack 50 kg per Tier, Foldabl | new_l3 | assign_existing → v4-ladu-seinale-kinnitatavad-hoiususteemid | ei | Seinale kinnitatav kokkupandav puidu hoiusüsteem konsoolkätega sobib seinale kinnitatavate hoiusüsteemide alla. |
| Lumber Rack, 3-Tier 4-Pack 100 kg per Tier, Welded | new_l3 | assign_existing → v4-ladu-seinale-kinnitatavad-hoiususteemid | ei | Seinale kinnitatav keevitatud konsool-hoiuriiul puidule sobib seinale kinnitatavate hoiusüsteemide alla. |
| Lumber Rack, 3-Tier 2-Pack 50 kg per Tier, Foldabl | new_l3 | assign_existing → v4-ladu-seinale-kinnitatavad-hoiususteemid | ei | Seinale kinnitatav kokkupandav puidu hoiusüsteem konsoolkätega sobib seinale kinnitatavate hoiusüsteemide alla. |
| Lumber Rack, 3-Tier 4-Pack 50 kg per Tier, Foldabl | new_l3 | assign_existing → v4-ladu-seinale-kinnitatavad-hoiususteemid | ei | Seinale kinnitatav kokkupandav puidu hoiusüsteem konsoolkätega sobib seinale kinnitatavate hoiusüsteemide alla. |
| Lumber Rack, 4-Tier 4-Pack 50 kg per Tier, Foldabl | new_l3 | assign_existing → v4-ladu-metallriiulid | ei | Seinale kinnitatav metallist puidu-hoiuriiul kuulub metallriiulite alla. |
| Lumber Rack, 3-Tier 3-Pack 50 kg per Tier, Foldabl | new_l3 | assign_existing → v4-ladu-metallriiulid | ei | Seinale kinnitatav metallist puidu-hoiuriiul sobib metallriiulite kategooriasse. |
| Lumber Rack, 3-Tier 6-Pack 50 kg per Tier, Foldabl | new_l3 | assign_existing → v4-ladu-metallriiulid | ei | Seinale kinnitatav terasest puidu-hoiuriiul kuulub metallriiulite alla. |
| Kids Bike, 14 Inch Children Bicycle, Training Whee | new_l3 | assign_existing → v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgrattad | ei | Laste 14-tolline jalgratas kuulub jalgrataste kategooriasse. |
| Kids Bike, 16 Inch Children Bicycle, Training Whee | new_l3 | assign_existing → v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgrattad | ei | Laste 16-tolline jalgratas kuulub jalgrataste kategooriasse. |
| Kids Bike, 18 Inch Children Bicycle, Kickstand Pri | new_l3 | assign_existing → v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgrattad | ei | Laste 18-tolline jalgratas kuulub jalgrataste kategooriasse. |
| Kids Bike, 20 in Children Bicycle, Kickstand Princ | new_l3 | assign_existing → v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgrattad | ei | Laste jalgratas kuulub jalgrataste kategooriasse. |
| Kids Bike, 18 in Children Bicycle, with Kickstand  | new_l3 | assign_existing → v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgrattad | ei | Laste jalgratas kuulub jalgrataste kategooriasse. |
| Kids Bike, 14 Inch Children Bicycle, Training Whee | new_l3 | assign_existing → v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgrattad | ei | Laste jalgratas kuulub jalgrataste kategooriasse. |
| Kids Bike, 16 Inch Children Bicycle, Training Whee | new_l3 | assign_existing → v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgrattad | ei | Laste jalgratas kuulub jalgrataste kategooriasse. |
| Kids Bike, 20 in Children Bicycle, with Kickstand  | new_l3 | assign_existing → v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgrattad | ei | Laste jalgratas kuulub jalgrataste kategooriasse. |
| Solar Panel Storage Bag for 2 x 200W Foldable Sola | new_l3 | assign_existing → v4-elektritarvikud-ja-valgustus-taastuvenergia-ja-generaatorid-paikesepaneeli-kinnitused | ei | Päikesepaneeli kandekott on tarvik, kuid ükski kategooria ei kata hoiukotte täpselt. |
| Solar Panel Storage Bag Holds up to 2 x 200W Folda | new_l3 | assign_existing → v4-autovaruosad-ja-tarvikud-haagissuvila-ja-matkatarvikud-katted-ja-kaitsekatted | ei | Päikesepaneeli kandekott ei sobi ühtegi olemas-L3-sse täpselt, aga kindlusetus suur. |
| Solar Panel Storage Bag for 2 x 400W Foldable Sola | new_l3 | keep | ei | Signaali blokeeriv Faraday kandekott paneelidele ei sobi ühegi olemas-L3-ga kindlalt. |
| Solar Panel Storage Bag for 5 x 300W Foldable Sola | new_l3 | keep | ei | Päikesepaneeli Faraday-kandekott ei vasta ühelegi olemas-kategooriale selgelt. |
| 24V 100Ah LiFePO4 Lithium Battery 4000+ Cycles 100 | assign_existing → v4-autovaruosad-ja-tarvikud-aku-soiduki-ja-mootorrattaakud | assign_existing → v4-tooriistad-ja-tarvikud-akutooriistad-akud-ja-laadijad | ⚠️ jah | LiFePO4 liitiumaku sobib akutööriista akude alla, aga see on pigem energiasalvestus. |
| 24V 50Ah LiFePO4 Lithium Battery 4000+ Cycles 50A  | assign_existing → v4-autovaruosad-ja-tarvikud-aku-soiduki-ja-mootorrattaakud | assign_existing → v4-tooriistad-ja-tarvikud-akutooriistad-akud-ja-laadijad | ⚠️ jah | LiFePO4 liitiumaku RV/marine jaoks; akukategooria on lähim, kuid pole täpne. |
| 24V 100Ah LiFePO4 Lithium Battery 4000+ Cycles Bui | assign_existing → v4-autovaruosad-ja-tarvikud-aku-soiduki-ja-mootorrattaakud | assign_existing → v4-tooriistad-ja-tarvikud-akutooriistad-akud-ja-laadijad | ⚠️ jah | 24V liitiumaku; akude kategooria on lähim vaste, kuid täpset energiasalvesti kategooriat pole. |
| Paracord Rope 4.7 mm x 305 m Nylon Parachute Cord  | assign_existing → v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-trossikoied | new_l3 | ⚠️ jah | Paracord/utility-nöör ei sobi ühtegi olemas-L3-sse (trossid ja köied on terasest/tõstmiseks). |
| Paracord Rope 4 mm x 60 m Nylon Parachute Cord 550 | assign_existing → v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-trossikoied | new_l3 | ⚠️ jah | Nailon-paracord ei vasta ühelegi olemasolevale köie- või trossikategooriale. |
| Paracord Rope 4 mm x 305 m Nylon Parachute Cord 55 | assign_existing → v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-trossikoied | new_l3 | ⚠️ jah | Paracord-nöör on üldotstarbeline, ei sobi tõstetrosside ega kinnitusköite alla. |
| Professional 304 Stainless Steel Whipped Cream Dis | assign_existing → v4-suurkoogiseadmed-koogitarvikud-ja-noud-kokteili-ja-baaritarvikud | assign_existing → v4-suurkook-peo-serveerimisdispenserid | ⚠️ jah | Vahukoore dispenser on serveerimis- ja köögidispenser. |
| Professional 304 Stainless Steel Whipped Cream Dis | assign_existing → v4-suurkoogiseadmed-koogitarvikud-ja-noud-kokteili-ja-baaritarvikud | assign_existing → v4-suurkook-peo-serveerimisdispenserid | ⚠️ jah | Vahukoore dispenser on serveerimis- ja köögidispenser. |
| Rolling File Cart 2-Tier Mobile Wire Mail Cart wit | assign_existing → v4-ladu-teenindus-utility-karud | assign_existing → v4-buroo-raamatukarud | ⚠️ jah | Kontori dokumendi-/postikäru ratastel sobib raamatu- ja raamatukogukärude kategooriasse. |

