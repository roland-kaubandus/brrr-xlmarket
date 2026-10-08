# ETAPP 3 — LÕPLIK PLAAN (uued L3 täisauditist, ENNE DB-kirjutust)

> Genereeritud 2026-10-08T22:20:43.454Z · near-dup fold 2026-10-08T22:25:23.999Z · `scripts/classify-etapp3-create.mjs` + `scratchpad/etapp3-fold.mjs`
> **REŽIIM: PLAAN — DB/staging puutumata.** Loomismootor = `scripts/lib/l3-create-engine.mjs` (SAMA kui öine auto-create, HARD RULE #5).

## Värskendus + near-dup fold

- audit new_l3: **52** → gate.allPass 52 → live-DB KEEP **51** (−1 MOOT) → fold exact-name+L2 **48** → **near-dup merge −3 → 45 distinct L3**

### Near-dup merge'd (variant/subset, sama L2 — kõrge kindlus)

| survivor nimi | absorbeeris | L2 | põhjus |
|---|---|---|---|
| «Mullafreesid ja kultivaatorid» (5) | spu:10835 («Mullafreesid ja kultivaatorid») | — | EN mõlemal 'Tillers & Cultivators'; erineb ainult energiaallikas (bensiin vs elektri) → variant, sama väljund (kobestatud muld) |
| «Antenni- ja satelliidikinnitused» (3) | vpt:Electrical > Satellite Equipment > Satellite Dish Mounts («Satelliitantenni kinnitused») | — | mõlemad Starlink/satelliit-kinnitused; 'Satelliitantenni kinnitused' on 'Antenni- ja satelliidikinnituste' alamhulk → variant/subset |
| «Infusiooni- ja verevõtutoolid» (2) | spu:14309 («Vereproovivõtutoolid») | — | 'verevõtt' = phlebotomy; 'Vereproovivõtutoolid' on 'Infusiooni- ja verevõtutoolide' range alamhulk → DUP |

---

## «Põrandatoolid»  (×7 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Floor Chairs |
| handle | `v4-moobel-ja-sisustus-elutoamoobel-porandatoolid` |
| L2-vanem | Elutoamööbel (`v4-moobel-ja-sisustus-elutoamoobel`) |
| senine L3 | `v4-moobel-ja-sisustus-elutoamoobel-kott-toolid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Mugav istumine otse põrandal – mängi, loe, lõõgastu! |

**SEO (ET):** Põrandatoolid on mugavad ja kokkupandavad istmed, mis sobivad suurepäraselt mängimiseks, lugemiseks, teleri vaatamiseks või lihtsalt lõõgastumiseks. Valikus on reguleeritava seljatoega, pöörlevad ja diivanvoodiks muudetavad mudelid nii elutuppa kui magamistuppa. Valikul tasub jälgida sobivat suurust, reguleerimisvõimalusi ja kattematerjali.

**Pilt:** Hall kokkupandav põrandatool reguleeritava seljatoega heledal valgel taustal.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Mullivanni katted»  (×13 toodet) [fold spu:14265+spu:14266]

| väli | väärtus |
|---|---|
| EN nimi | Hot Tub Covers |
| handle | `v4-aed-ja-aiatehnika-basseinid-ja-spaa-mullivanni-katted` |
| L2-vanem | Basseinid ja spaa (`v4-aed-ja-aiatehnika-basseinid-ja-spaa`) |
| senine L3 | `v4-aed-ja-aiatehnika-l2-basseinikatted` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kaitse oma mullivanni igal aastaajal |

**SEO (ET):** Siit leiad katted mullivannide ja välispaade kaitsmiseks, mis aitavad hoida vett puhtana ning kaitsta vanni ilmastiku ja prahi eest. Valikus on nii kandilisi kui ka ümaraid katteid erinevates toonides. Vali kate oma mullivanni kuju ja mõõtude järgi ning pööra tähelepanu materjali vastupidavusele.

**Pilt:** Tume kandiline mullivanni kate heledal valgel taustal, nähtavate kinnitusrihmadega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Vaipplaadid»  (×10 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Carpet Tiles |
| handle | `v4-moobel-ja-sisustus-sisustusdekoor-vaipplaadid` |
| L2-vanem | Sisustusdekoor (`v4-moobel-ja-sisustus-sisustusdekoor`) |
| senine L3 | `v4-moobel-ja-sisustus-sisustusdekoor-vaibad` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Pehme põrand kiirelt ja lihtsalt paigaldatav |

**SEO (ET):** Vaipplaadid on mugav viis anda põrandale pehme ja hubane ilme ilma suurema remondita. Siit leiad isekleepuvaid ja lihtsalt paigaldatavaid vaipplaate magamistuppa, elutuppa, koduse kontori või muu ruumi jaoks. Vali sobiv värvitoon ja suurus vastavalt oma ruumile ja sisustusstiilile.

**Pilt:** Heledal valgel taustal virn pehmeid ruudukujulisi vaipplaate, millest üks on nurgast kergelt üles keeratud, näidates isekleepuvat alust.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Aktiivse istumise istmed»  (×4 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Active Sitting Chairs |
| handle | `v4-moobel-ja-sisustus-toolid-ja-istmed-aktiivse-istumise-istmed` |
| L2-vanem | Toolid ja istmed (`v4-moobel-ja-sisustus-toolid-ja-istmed`) |
| senine L3 | `v4-moobel-ja-sisustus-kontorimoobel-ja-tarvikud-kontoritoolid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Liigu istudes – parem rüht ja keskendumine! |

**SEO (ET):** Aktiivse istumise istmed ja kõikuvad taburetid, mis muudavad istumise liikuvamaks ja toetavad paremat kehahoiakut. Sobivad suurepäraselt kooli, kontorisse ja koju kõigile, kes soovivad pikkade istumistundide ajal keskendumist ja aktiivsust hoida. Valikul tasub jälgida sobivat kõrgust, materjali ja istme liikuvuse tüüpi.

**Pilt:** Heledal valgel taustal must kõrguse reguleerimisega kõikuv tabureti-tüüpi aktiivtool, ümara istme ja kumera põhjaga.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Raskustekid»  (×5 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Weighted Blankets |
| handle | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-raskustekid` |
| L2-vanem | Magamistoamööbel ja voodipesu (`v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu`) |
| senine L3 | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-tekid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Rahulikum uni ja vähem stressi raskusteki abil |

**SEO (ET):** Raskustekid aitavad keha õrnalt rahustada ja toetavad sügavamat, kvaliteetsemat und. Valikus on erinevas suuruses ja materjalist tekid nii jahedamat kui ka soojemat tunnetust eelistavatele magajatele. Teki valikul tasub jälgida sobivat suurust ja raskust vastavalt oma kehakaalule ning eelistatud kangamaterjali.

**Pilt:** Heledal valgel taustal korralikult volditud hall raskustekk, mille pehme tepitud pind ja raskust andvad ruudud on selgelt nähtavad.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Kasvuhoone ventilaatorid»  (×3 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Greenhouse Fans |
| handle | `v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-kasvuhoone-ventilaatorid` |
| L2-vanem | Ventilatsioon ja ventilaatorid (`v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid`) |
| senine L3 | `v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-valjalaskeventilaatorid` → reparent |
| kindlus | tie: hääli 3, new_l3 2 → enamus |
| tagline ET | Värske õhk ja terve kasvukeskkond taimedele |

**SEO (ET):** Kasvuhoone ventilaatorid aitavad hoida õhu liikumises ja tagavad taimedele sobiva kasvukeskkonna. Siit leiad ventilaatoreid kasvuhoonetele, kasvutelkidele ja muudele väiksematele hoonetele, sealhulgas päikeseenergial töötavaid lahendusi. Valikul tasub jälgida ruumi suurust, paigaldusviisi ja toiteallikat.

**Pilt:** Heledal valgel taustal päikesepaneeliga kasvuhoone ventilaator koos ühendusjuhtmega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Põlvitustoolid»  (×5 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Kneeling Chairs |
| handle | `v4-moobel-ja-sisustus-toolid-ja-istmed-polvitustoolid` |
| L2-vanem | Toolid ja istmed (`v4-moobel-ja-sisustus-toolid-ja-istmed`) |
| senine L3 | `v4-moobel-ja-sisustus-kontorimoobel-ja-tarvikud-kontoritoolid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Parem rüht ja mugavam istumine iga päev |

**SEO (ET):** Põlvitustoolid aitavad hoida loomulikku rühti ja vähendada koormust seljale pikaajalisel istumisel. Siit leiad ergonoomilised istmed koduseks tööks, kontorisse või meditatsiooniks. Valikul tasub jälgida sobivat materjali, polstri mugavust ja reguleerimisvõimalusi.

**Pilt:** Heledal valgel taustal ergonoomiline puitraamiga põlvitustool pehmete polsterdatud istmepatjadega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Metallkatuseplaadid»  (×4 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Metal Roof Panels |
| handle | `v4-ehitus-remont-ja-varvid-katusematerjalid-metallkatuseplaadid` |
| L2-vanem | Katusematerjalid (`v4-ehitus-remont-ja-varvid-katusematerjalid`) |
| senine L3 | `v4-ehitus-remont-ja-varvid-katusematerjalid-epdm-kummikatted` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Vastupidav metallkatus igale varjualusele ja kuurile |

**SEO (ET):** Metallkatuseplaadid sobivad varjualuste, kuuride, lehtlate ja muude väikehoonete katmiseks. Valikus on erinevas mõõdus ja toonis plaadid, mis paigalduvad kiirelt ja peavad vastu muutlikule ilmale. Valikul jälgi kaetava pinna suurust, plaadi profiili ja sobivat värvitooni.

**Pilt:** Heledal valgel taustal virn tumedaid profileeritud metallkatuseplaate, mille laineline pind on selgelt nähtav.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Kokkupandavad külalisvoodid»  (×4 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Folding Guest Beds |
| handle | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-kokkupandavad-kulalisvoodid` |
| L2-vanem | Magamistoamööbel ja voodipesu (`v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu`) |
| senine L3 | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-voodiraamid-ja-baldahhiinvoodid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Mugav magamiskoht külalistele, kompaktne hoiustamine |

**SEO (ET):** Siit leiad kokkupandavad külalisvoodid, mis pakuvad mugavat magamiskohta siis, kui seda vaja on, ja mahuvad pärast kasutamist kompaktselt hoiule. Sobivad ideaalselt külaliste majutamiseks nii kodus, suvilas kui ka üürikorteris. Valikul jälgi sobivat suurust, madratsi mugavust ja raami vastupidavust.

**Pilt:** Heledal valgel taustal ratastel kokkupandav külalisvoodi koos pehme madratsiga, osaliselt avatud asendis.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Jalamassöörid ja -stimulaatorid»  (×4 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Foot Massagers & Stimulators |
| handle | `v4-tervis-hooldus-ja-ilu-isikuhooldusseadmed-jalamassoorid-ja-stimulaatorid` |
| L2-vanem | Isikuhooldusseadmed (`v4-tervis-hooldus-ja-ilu-isikuhooldusseadmed`) |
| senine L3 | `v4-keha-massoorid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Lõõgastus ja kergendus sinu jalgadele kodus |

**SEO (ET):** Siit leiad elektrilised jalamassöörid ja -stimulaatorid, mis aitavad lõõgastada väsinud jalgu, leevendada pingeid ja toetada mugavat enesetunnet pärast pikka päeva. Valikus on erinevat tüüpi seadmed – nii massaažirullikutega kui ka elektrilise stimulatsiooniga mudelid – koju ja igapäevaseks kasutamiseks. Valikul tasub jälgida massaažitüüpi, lisafunktsioone ja seadme sobivust sinu vajadustega.

**Pilt:** Heledal valgel taustal moodne elektriline jalamassöör, mille peal on kasutaja jalad lõõgastumas.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Mullafreesid ja kultivaatorid»  (×5 toodet) [fold spu:10474+spu:10835]

| väli | väärtus |
|---|---|
| EN nimi | Tillers & Cultivators |
| handle | `v4-pollumajandus-ja-loomakasvatus-talutehnika-mullafreesid-ja-kultivaatorid` |
| L2-vanem | Talutehnika (`v4-pollumajandus-ja-loomakasvatus-talutehnika`) |
| senine L3 | `v4-pollumajandus-ja-loomakasvatus-talutehnika-lohistatavad-akked` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kobesta muld kiiresti ja vaevata! |

**SEO (ET):** Mullafreesid ja kultivaatorid aitavad mulda kiiresti ja vaevata kobestada – olgu tegu peenramaa, aia või põlluga. Valikus on nii bensiinimootoriga kui ka elektrilised mudelid, mis sobivad nii koduaednikule kui ka suurema maalapi harijale. Valikul tasub arvestada töödeldava ala suurust, mulla tüüpi ja eelistatud toiteallikat.

**Pilt:** Heledal valgel taustal bensiinimootoriga mullafrees teraspiidega ja juhtkäepidemega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Põlvekäimistoed (põlveskuutrid)»  (×3 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Knee Scooters |
| handle | `v4-meditsiin-ja-liikumisabi-liikumisabi-polvekaimistoed-polveskuutrid` |
| L2-vanem | Liikumisabi (`v4-meditsiin-ja-liikumisabi-liikumisabi`) |
| senine L3 | `v4-meditsiin-ja-liikumisabi-liikumisabi-kondimiskepid-ja-raamid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Mugav liikumine jalavigastuse taastumise ajal |

**SEO (ET):** Põlvekäimistoed ehk põlveskuutrid on mugav alternatiiv karkudele jalavigastuse või operatsioonijärgse taastumise ajal. Siit leiad erinevas suuruses ja erineva varustusega mudeleid nii kodus kui õues liikumiseks. Valikul tasub jälgida sobivat kõrgust, rataste tüüpi ja kokkupandavust, et abivahend sobiks just sinu igapäevaste vajadustega.

**Pilt:** Kokkupandav põlveskuuter reguleeritava juhtraua, pehme põlvepadja ja maastikuratastega heledal valgel taustal.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Hoiusahtlikapid»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Storage Drawer Units |
| handle | `v4-moobel-ja-sisustus-kontorimoobel-hoiusahtlikapid` |
| L2-vanem | Kontorimööbel (`v4-moobel-ja-sisustus-kontorimoobel`) |
| senine L3 | `v4-ladu-teenindus-utility-karud` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kord majas – kõik vajalik käeulatuses! |

**SEO (ET):** Hoiusahtlikapid aitavad hoida kontoritarbed, dokumendid ja pisiasjad korras ning alati käepärast. Sobivad suurepäraselt kontorisse, koduõppenurka, käsitöötuppa või klassiruumi. Valikul tasub jälgida sobivat suurust, sahtlite paigutust ja seda, kas kapp peaks olema ratastel või statsionaarne.

**Pilt:** Heledal valgel taustal ratastega plastist hoiusahtlikapp, mille läbipaistvates sahtlites on näha kontoritarbed.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Jalgratta transpordikotid ja -kohvrid»  (×3 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Bike Travel Bags & Cases |
| handle | `v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgratta-transpordikotid-ja-kohvrid` |
| L2-vanem | Jalgrattad ja tarvikud (`v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud`) |
| senine L3 | `v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgratta-kotid-ja-korvid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Vii oma jalgratas turvaliselt igale reisile! |

**SEO (ET):** Siit leiad transpordikotid ja kohvrid, mis aitavad jalgratast turvaliselt kaasa võtta reisile, võistlusele või matkale. Sobivad nii lennuki, auto kui ka rongiga reisijatele, kes soovivad oma ratast kriimustuste ja põrutuste eest kaitsta. Valikul jälgi oma ratta tüüpi ja mõõtmeid ning koti kinnitus- ja kaitselahendusi.

**Pilt:** Heledal valgel taustal must jalgratta transpordikott, mille sees on osaliselt nähtav kinnitatud jalgratas.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Külmkohvi valmistussüsteemid (nitro cold brew)»  (×3 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Nitro Cold Brew Systems |
| handle | `v4-suurkook-kohviseadmed-kulmkohvi-valmistussusteemid-nitro-cold-brew` |
| L2-vanem | Kohviseadmed (`v4-suurkook-kohviseadmed`) |
| senine L3 | `v4-kodumasinad-ja-kodutehnika-koogitehnika-espresso-ja-kohvimasinad` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kohvikukvaliteediga nitro-külmkohv otse sinu koju |

**SEO (ET):** Siit leiad külmkohvi valmistamise süsteemid ja nitro-dosaatorid, millega valmib kreemja vahuga külm kohv otse kodus. Sobivad kohvisõpradele, kes soovivad kohvikukvaliteediga jooki ilma kodust lahkumata. Vali endale sobiv suurus vastavalt sellele, kui palju kohvi korraga valmistada soovid.

**Pilt:** Heledal valgel taustal läikiv roostevaba nitro-külmkohvi vaat koos dosaatorikraaniga, kõrval klaas kreemja vahuga külma kohviga.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Hoiuvoodi tõstemehhanismid»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Storage Bed Lift Mechanisms |
| handle | `v4-moobel-ja-sisustus-moobliosad-ja-komponendid-hoiuvoodi-tostemehhanismid` |
| L2-vanem | Mööbliosad ja -komponendid (`v4-moobel-ja-sisustus-moobliosad-ja-komponendid`) |
| senine L3 | `v4-moobel-ja-sisustus-sisustustarvikud-ja-dekoor-seinavoodi-mehhanismid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Ava voodialune hoiuruum ühe liigutusega! |

**SEO (ET):** Siit leiad tõstemehhanismid, mis muudavad voodi- või diivanialuse ruumi mugavaks hoiukohaks. Sobivad nii uue mööbli ehitamiseks kui ka olemasoleva voodi uuendamiseks. Valikul jälgi mehhanismi suurust ja sobivust oma voodiraami tüübiga.

**Pilt:** Heledal valgel taustal must gaasivedruga voodi tõstemehhanismi komplekt, kergelt avatud asendis.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Värvimis- ja kuivatusstatiivid»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Painting & Drying Racks |
| handle | `v4-garaaziseadmed-varvimine-ja-viimistlus-varvimis-ja-kuivatusstatiivid` |
| L2-vanem | Värvimine ja viimistlus (`v4-garaaziseadmed-varvimine-ja-viimistlus`) |
| senine L3 | `v4-varvimiskabiinid-ja-telgid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Mugav tugi värvimiseks ja kuivatamiseks |

**SEO (ET):** Värvimis- ja kuivatusstatiivid aitavad autodetaile ja muid värvitavaid esemeid mugavalt riputada, värvida ja kuivatada. Sobivad nii autoremonditöökodadele kui ka koduse garaaži meistritele. Valikul tasub jälgida sobivat kõrgust, konksude paigutust ja statiivi liikuvust tööruumis.

**Pilt:** Heledal valgel taustal reguleeritav ratastega värvimisstatiiv, mille konksude küljes ripub autodetail.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Tuhaimejad»  (×4 toodet) [fold spu:08307+spu:10235]

| väli | väärtus |
|---|---|
| EN nimi | Ash Vacuums |
| handle | `v4-santehnika-kute-ja-ventilatsioon-kaminad-ja-korsten-tuhaimejad` |
| L2-vanem | Kaminad ja korsten (`v4-santehnika-kute-ja-ventilatsioon-kaminad-ja-korsten`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud-tolmuimejad` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Puhas kamin ilma tolmu ja vaevata |

**SEO (ET):** Tuhaimejad on spetsiaalsed imurid kamina, ahju, pelletikatla, grilli ja lõkkekoha tuha kiireks ning puhtaks eemaldamiseks. Need muudavad küttekolde korrashoiu lihtsamaks ja hoiavad peene tuhatolmu toaõhust eemal. Valikul tasub jälgida sobivat mahutit, vooliku pikkust ja filtreerimislahendust vastavalt oma kütteseadmele.

**Pilt:** Heledal valgel taustal seisab terasest korpusega tuhaimeja koos painduva vooliku ja imiotsikuga.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Kaitserauad»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Bumpers |
| handle | `v4-autovaruosad-ja-tarvikud-valistarvikud-ja-rehvitarvikud-kaitserauad` |
| L2-vanem | Välistarvikud ja rehvitarvikud (`v4-autovaruosad-ja-tarvikud-valistarvikud-ja-rehvitarvikud`) |
| senine L3 | `v4-autovaruosad-ja-tarvikud-veoauto-tarvikud-astmelauad-ja-astmepukid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Vastupidavad kaitserauad sinu auto kaitseks |

**SEO (ET):** Siit leiad asendus- ja tagumised kaitserauad erinevatele sõidukimudelitele, mis aitavad taastada auto välimuse ja kaitsta keret igapäevases liikluses. Sobivad nii vigastatud kaitseraua väljavahetamiseks kui ka sõiduki uuendamiseks. Enne tellimist kontrolli alati sobivust oma auto margi, mudeli ja aastakäiguga.

**Pilt:** Heledal valgel taustal läikiv kroomitud terasest tagumine kaitseraud koos astmeplaadiga.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Veinikülmikud»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Wine Coolers |
| handle | `v4-moobel-ja-sisustus-riiulid-ja-hoiustamine-veinikulmikud` |
| L2-vanem | Riiulid ja hoiustamine (`v4-moobel-ja-sisustus-riiulid-ja-hoiustamine`) |
| senine L3 | `v4-kodumasinad-ja-kodutehnika-koogitehnika-kulmikud-ja-sugavkulmikud` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Hoia oma veinid alati serveerimisvalmis! |

**SEO (ET):** Veinikülmikud hoiavad su veinivaru õigel temperatuuril ja alati serveerimisvalmis. Siit leiad erineva suuruse ja stiiliga veinikülmikuid nii kodubaari, kööki kui ka elutuppa. Valikul jälgi, kui palju pudeleid soovid hoiustada ja milline disain sinu interjööriga sobib.

**Pilt:** Elegantne klaasuksega veinikülmik, mille riiulitel on korralikult paigutatud veinipudelid, heledal valgel taustal.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Kattemadratsid»  (×3 toodet) [fold spu:12357+spu:12358]

| väli | väärtus |
|---|---|
| EN nimi | Mattress Toppers |
| handle | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-kattemadratsid` |
| L2-vanem | Magamistoamööbel ja voodipesu (`v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu`) |
| senine L3 | `v4-moobel-kodutekstiil-madratsikaitsed` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Mugavam uni ilma uut madratsit ostmata |

**SEO (ET):** Kattemadratsid muudavad olemasoleva voodi mugavamaks ja pikendavad madratsi eluiga. Siit leiad erineva paksuse ja täitematerjaliga kattemadratseid nii pehmema kui ka toetavama magamistunde eelistajatele. Valikul jälgi sobivat suurust, materjali ja hooldusmugavust.

**Pilt:** Heledal valgel taustal valge kattemadrats, mis on asetatud voodimadratsi peale, nurk kergelt üles keeratud.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Kallutuskomplektid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Dump Hoist Kits |
| handle | `v4-autovaruosad-ja-tarvikud-hudraulika-kallutuskomplektid` |
| L2-vanem | Hüdraulika (`v4-autovaruosad-ja-tarvikud-hudraulika`) |
| senine L3 | `v4-autovaruosad-ja-tarvikud-hudraulika-agregaadid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kiire ja mugav mahalaadimine hüdraulika jõul |

**SEO (ET):** Kallutuskomplektid on mõeldud haagiste ja veokite kastide hüdrauliliseks kallutamiseks, muutes puistematerjali ja koorma mahalaadimise kiireks ning mugavaks. Sobivad nii ehitus-, põllumajandus- kui ka transporditöödeks. Valikul tasub jälgida, et komplekt sobiks sinu haagise või veoki suuruse ja kasutusotstarbega.

**Pilt:** Hele valge taustaga pisipilt, millel on kujutatud hüdrauliline kääritõstuki tüüpi kallutuskomplekt koos pumbaplokiga.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Laste maandumispadjad»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Kids Crash Pads |
| handle | `v4-tervis-hooldus-ja-ilu-beebi-ja-lapsetarbed-laste-maandumispadjad` |
| L2-vanem | Beebi- ja lapsetarbed (`v4-tervis-hooldus-ja-ilu-beebi-ja-lapsetarbed`) |
| senine L3 | `v4-sport-ja-vaba-aeg-manguasjad-lastele-tasakaalu-ja-liikumismanguasjad` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Pehme ja turvaline maandumine igaks mänguhetkeks |

**SEO (ET):** Pehmed maandumispadjad ja hiiglaslikud padjamatid, mis pakuvad lastele turvalist kohta hüppamiseks, maandumiseks ja lõõgastumiseks. Sobivad suurepäraselt koju mängunurka, sensoorsesse tuppa või aktiivseks sisemänguks. Valikul tasub jälgida sobivat suurust, katte materjali ja puhastamise lihtsust.

**Pilt:** Suur pehme maandumispadi eemaldatava kattega heledal valgel taustal.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Kiviplaatide paigaldustööriistad»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Stone Slab Installation Tools |
| handle | `v4-tooriistad-ja-tarvikud-kasitooriistad-kiviplaatide-paigaldustooriistad` |
| L2-vanem | Käsitööriistad (`v4-tooriistad-ja-tarvikud-kasitooriistad`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-kasitooriistad-vuugitooriistad` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Täpne ja sujuv kiviplaatide paigaldus |

**SEO (ET):** Siit leiad spetsiaalsed tööriistad kivi-, graniit- ja marmorplaatide paigaldamiseks, sealhulgas vuugiseadjad ja vaakumiminutitega abivahendid plaatide täpseks ühendamiseks ja loodimiseks. Sobivad nii professionaalsetele paigaldajatele kui ka nõudlikumale koduküüle, kes soovib töötasapindade ja plaatide paigaldusel puhast ja sujuvat tulemust. Valikul jälgi, et tööriist sobiks sinu plaadi materjali ja pinna tüübiga.

**Pilt:** Heledal valgel taustal vaakumiminutitega vuugiseadja, mis hoiab kahte kiviplaati täpselt ühel tasapinnal.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Antenni- ja satelliidikinnitused»  (×3 toodet) [fold spu:14782+vpt:Electrical > Satellite Equipment > Satellite Dish Mounts]

| väli | väärtus |
|---|---|
| EN nimi | Antenna & Satellite Mounts |
| handle | `v4-elektroonika-vork-antenni-ja-satelliidikinnitused` |
| L2-vanem | Võrk ja satelliit (`v4-elektroonika-vork`) |
| senine L3 | `v4-elektritarvikud-ja-valgustus-elektroonika-satelliit-ja-vorgukaablid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kindel kinnitus parimaks signaaliks igas asukohas |

**SEO (ET):** Siit leiad kinnitused ja hoidikud antennide ning satelliitseadmete paigaldamiseks katusele, seinale või masti külge. Sobivad nii koduseks kui ka suvila- ja haagiselahendusteks, kus on vaja stabiilset ja töökindlat signaalivastuvõttu. Valikul jälgi oma seadme mudelit, paigalduskohta ja kinnituse reguleeritavust.

**Pilt:** Heledal valgel taustal must metallist reguleeritav katusekinnitus satelliidiantenni paigaldamiseks.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Piknikutarvikud»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Picnic Accessories |
| handle | `v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine-piknikutarvikud` |
| L2-vanem | Matkavarustus ja telkimine (`v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine`) |
| senine L3 | `v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine-jahutuskastid-ja-kotid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kõik mugavaks piknikuks looduses! |

**SEO (ET):** Piknikutarvikute kategooriast leiad kõik vajaliku mõnusaks väljasõiduks loodusesse – pikniku seljakotid, tekid ning söögi- ja jooginõude komplektid. Sobivad suurepäraselt rannapäevaks, matkaks või perepuhkuseks pargis. Valikul jälgi komplekti suurust, mugavat kandmist ja oma seltskonnale sobivat varustust.

**Pilt:** Heledal valgel taustal pikniku seljakott koos kõrval asetseva rulli keeratud teki ning nõude ja söögiriistade komplektiga.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Tomatipressid ja kastmemasinad»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Tomato Strainers & Sauce Makers |
| handle | `v4-suurkoogiseadmed-ettevalmistus-ja-tootlus-tomatipressid-ja-kastmemasinad` |
| L2-vanem | Ettevalmistus ja töötlus (`v4-suurkoogiseadmed-ettevalmistus-ja-tootlus`) |
| senine L3 | `v4-kodumasinad-ja-kodutehnika-koogitehnika-koogikombainid-ja-toiduprotsessorid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kodused kastmed ja mahlad vaevata valmis! |

**SEO (ET):** Tomatipressid ja kastmemasinad muudavad tomatite ja muude viljade töötlemise kiireks ja mugavaks – eraldades mahla ja viljaliha koortest ning seemnetest. Sobivad nii kodukokale hoidiste valmistamiseks kui ka suuremate koguste töötlemiseks. Valikul tasub jälgida sobivat võimsusklassi, materjali ja puhastamise lihtsust.

**Pilt:** Heledal valgel taustal roostevabast terasest elektriline tomatipress, mille täitelehtrisse on asetatud värsked punased tomatid.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Sõrmuste suuruse muutmise tööriistad»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Ring Sizing Tools |
| handle | `v4-hobi-ehtekunst-sormuste-suuruse-muutmise-tooriistad` |
| L2-vanem | Ehte- ja metallitöö (`v4-hobi-ehtekunst`) |
| senine L3 | `v4-hobi-ehtekunst-ehte-rullpressid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Täpne sõrmuse suurus iga meistri käe all |

**SEO (ET):** Siit leiad tööriistad sõrmuste suuruse muutmiseks ja vormimiseks – nii venitamiseks, vähendamiseks kui ka kuju korrigeerimiseks. Sobivad ehtemeistritele, parandustöökodadele ja hobikorras ehete valmistajatele. Valikul jälgi, et tööriist sobiks sinu töödeldava materjali ja töö iseloomuga.

**Pilt:** Heledal valgel taustal metallist sõrmuse venitamise tööriist koos koonusekujulise mõõtetorniga ja sõrmusega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Mereandide tarvikud»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Seafood Tools |
| handle | `v4-suurkoogiseadmed-noud-mereandide-tarvikud` |
| L2-vanem | Nõud ja serveerimine (`v4-suurkoogiseadmed-noud`) |
| senine L3 | `v4-suurkoogiseadmed-koogitarvikud-ja-noud-kokteili-ja-baaritarvikud` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Mugavad tööriistad mereandide nautimiseks |

**SEO (ET):** Mereandide tarvikud muudavad krabide, homaaride ja teiste koorikloomade serveerimise ja söömise lihtsaks ning nauditavaks. Kategooriast leiad purustajad, nõelad ja muud abivahendid nii koduseks kasutuseks kui ka pidulikuks serveerimiseks. Valikul tasub jälgida materjali vastupidavust ja mugavat käepidet.

**Pilt:** Heledal valgel taustal metallist krabipurustaja koos mereandide nõeltega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Roolisüsteemi tööriistad»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Steering System Tools |
| handle | `v4-tooriistad-ja-tarvikud-kasitooriistad-roolisusteemi-tooriistad` |
| L2-vanem | Käsitööriistad (`v4-tooriistad-ja-tarvikud-kasitooriistad`) |
| senine L3 | `v4-garaaz-veom-jouulekande-tooriistad` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Professionaalsed tööriistad roolisüsteemi remondiks ja hoolduseks |

**SEO (ET):** Roolisüsteemi tööriistad on mõeldud rooliotste, roolivarraste ja muude roolimehhanismi osade eemaldamiseks ning paigaldamiseks. Sobivad nii autoremonditöökodadele kui ka kodugaraaži meistritele, kes soovivad roolisüsteemi hooldust ise teha. Valikul tasub jälgida, et komplekt sobiks sinu sõiduki margi ja tööriistade ühendusega.

**Pilt:** Heledal valgel taustal roolivarraste eemaldamise tööriistakomplekt koos adapterite ja käepidemega avatud kohvris.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Roomajate inkubaatorid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Reptile Incubators |
| handle | `v4-lemmikloomatarbed-akvaariumid-ja-terraariumid-roomajate-inkubaatorid` |
| L2-vanem | Akvaariumid ja terraariumid (`v4-lemmikloomatarbed-akvaariumid-ja-terraariumid`) |
| senine L3 | `v4-pollumajandus-ja-loomakasvatus-linnukasvatus-inkubaatorid-ja-munahaudejad` → reparent |
| kindlus | tie: hääli 3, new_l3 2 → enamus |
| tagline ET | Turvaline haudekeskkond sinu roomajate munadele |

**SEO (ET):** Roomajate inkubaatorid aitavad luua munade haudumiseks stabiilse ja kontrollitud keskkonna. Sobivad nii hobikasvatajatele kui ka kogenud terraristidele, kes soovivad munade arengut mugavalt jälgida. Valikul tasub arvestada oma roomajaliigi vajaduste ja munade arvuga.

**Pilt:** Heledal valgel taustal kompaktne digitaalse ekraaniga roomajate inkubaator, mille läbipaistva ukse taga on näha munaalused.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Käte desinfitseerimise dosaatorid ja jaamad»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Hand Sanitizer Dispensers & Stations |
| handle | `v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud-kate-desinfitseerimise-dosaatorid-ja-jaamad` |
| L2-vanem | Puhastustehnika ja -tarvikud (`v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud`) |
| senine L3 | `v4-tervis-hooldus-ja-ilu-isikuhooldusseadmed-sterilisaatorid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Mugav kätehügieen igasse ruumi |

**SEO (ET):** Siit leiad käte desinfitseerimise dosaatorid ja jaamad nii kodudesse, kontoritesse kui ka avalikesse ruumidesse. Valikus on erinevat tüüpi lahendusi, sealhulgas automaatseid ja statiiviga mudeleid, mis muudavad kätehügieeni mugavaks ja kättesaadavaks. Valikul tasub arvestada paigalduskohta, kasutussagedust ja sobivat dosaatori tüüpi.

**Pilt:** Heledal valgel taustal seisab moodne statiiviga automaatne desinfitseerimisvahendi dosaator, mis sobib avalikku ruumi.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Graafikapressid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Printmaking Presses |
| handle | `v4-hobi-ehtekunst-graafikapressid` |
| L2-vanem | Ehte- ja metallitöö (`v4-hobi-ehtekunst`) |
| senine L3 | `v4-reklaami-truki-ja-graveerimisseadmed-tekstiili-ja-roivatrukk-siiditruki-seadmed-ja-komplektid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kvaliteetsed tõmmised sinu enda töötoast |

**SEO (ET):** Graafikapressid sügavtrüki, ofordi ja muude graafikatehnikate jaoks nii hobikunstnikule kui ka stuudiole. Siit leiad lauapresse ja tarvikuid, millega saab koduses töötoas või ateljees kvaliteetseid tõmmiseid valmistada. Valikul tasub jälgida sobivat tööpinna suurust ja pressi konstruktsiooni vastavalt oma tehnikale.

**Pilt:** Heledal valgel taustal metallist lauagraafikapress koos pöördratta ja siledate rullikutega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Pöördtööriista tarvikud»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Rotary Tool Accessories |
| handle | `v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-poordtooriista-tarvikud` |
| L2-vanem | Tööriistade tarvikud ja kulumaterjalid (`v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-puuri-ja-kruvikeerajaotsikute-komplektid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Õige otsak igaks täppistööks |

**SEO (ET):** Siit leiad mitmekülgsed tarvikud pöördtööriistadele – otsakud ja komplektid graveerimiseks, lihvimiseks, lõikamiseks, puurimiseks ja poleerimiseks. Sobivad nii hobimeistritele kui ka täpsustööde tegijatele. Vali tarvikud vastavalt oma tööriista kinnitusele ja planeeritavale tööle.

**Pilt:** Heledal valgel taustal avatud pöördtööriista tarvikute komplekt erinevate lihvimis-, lõike- ja graveerimisotsakutega korrastatud karbis.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Riidepuud»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Hangers |
| handle | `v4-ladu-kaupluse-sisustus-riidepuud` |
| L2-vanem | Kaupluse sisustus (`v4-ladu-kaupluse-sisustus`) |
| senine L3 | `v4-ladu-roivariiulid-nagid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Korras rõivad, rohkem ruumi garderoobis |

**SEO (ET):** Riidepuud rõivaste korrektseks ja säästlikuks eksponeerimiseks nii kaupluses kui ka kodus. Valikus on erineva kuju ja materjaliga riidepuid eri tüüpi rõivaste jaoks – pintsakutest kleitide ja õrnade kangasteni. Vali sobiv mudel vastavalt rõivaste tüübile, soovitud materjalile ja viimistlusele.

**Pilt:** Heledal valgel taustal komplekt elegantseid riidepuid, millest ühel ripub korrektselt rõivaese.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Vanni äravoolukomplektid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Bathtub Drain Kits |
| handle | `v4-santehnika-kute-ja-ventilatsioon-aravool-ja-porandatrapid-vanni-aravoolukomplektid` |
| L2-vanem | Äravool ja põrandatrapid (`v4-santehnika-kute-ja-ventilatsioon-aravool-ja-porandatrapid`) |
| senine L3 | `v4-santehnika-kute-ja-ventilatsioon-dusisusteemid-ja-dusikabiinid-dusialuste-komplektid-ja-tarvikud` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kindel äravool igale vannile |

**SEO (ET):** Siit leiad vanni äravoolukomplektid, mis sobivad nii vabalt seisvatele kui ka põrandale paigaldatavatele vannidele. Komplektid sisaldavad paigalduseks vajalikke osi, et ühendada vann äravoolusüsteemiga kindlalt ja lekkevabalt. Valikul jälgi oma vanni tüüpi, ühenduste sobivust ja materjali vastupidavust.

**Pilt:** Heledal valgel taustal vanni äravoolukomplekt koos torude ja ühendusdetailidega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Fotostuudio valgustistatiivid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Photo Studio Light Stands |
| handle | `v4-tooriistad-ja-tarvikud-moote-ja-markeriistad-fotostuudio-valgustistatiivid` |
| L2-vanem | Mõõte- ja märkeriistad (`v4-tooriistad-ja-tarvikud-moote-ja-markeriistad`) |
| senine L3 | `v4-elektritarvikud-ja-valgustus-toostusvalgustus-fotostuudio-valgustid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Kindel tugi sinu stuudiovalgustusele |

**SEO (ET):** Siit leiad statiivid ja alused fotostuudio valgustite, softboxide ja reflektorite kinnitamiseks. Sobivad nii koduse stuudio loojale kui ka professionaalsele fotograafile, kes vajab stabiilset ja reguleeritavat tuge oma valgustehnikale. Valikul tasub jälgida sobivat kõrgust, materjali vastupidavust ja ühilduvust oma seadmetega.

**Pilt:** Heledal valgel taustal seisab reguleeritav fotostuudio valgustistatiiv, mille otsa on kinnitatud stuudiovalgusti.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Infusiooni- ja verevõtutoolid»  (×2 toodet) [fold spu:17023+spu:14309]

| väli | väärtus |
|---|---|
| EN nimi | Infusion & Phlebotomy Chairs |
| handle | `v4-meditsiin-ja-liikumisabi-meditsiinitarvikud-infusiooni-ja-verevotutoolid` |
| L2-vanem | Meditsiinitarvikud (`v4-meditsiin-ja-liikumisabi-meditsiinitarvikud`) |
| senine L3 | `v4-meditsiin-ja-liikumisabi-meditsiinitarvikud-geriaatrilised-toolid` → reparent |
| kindlus | consensus: kinnitus=new_l3 |
| tagline ET | Mugavad ja praktilised toolid protseduurideks |

**SEO (ET):** Siit leiad infusiooni- ja verevõtutoolid haiglatele, kliinikutele, laboritele ja teistele tervishoiuasutustele. Valikus on reguleeritavate käetugede ja seljatoega mudelid, mis tagavad patsiendile mugavuse ja personalile hõlpsa ligipääsu protseduuri ajal. Valikul tasub tähele panna istme polsterdust, reguleerimisvõimalusi ja pinna puhastatavust.

**Pilt:** Heledal valgel taustal polsterdatud meditsiiniline verevõtutool reguleeritavate käetugede ja seljatoega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Plaadisaed»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Tile Saws |
| handle | `v4-tooriistad-ja-tarvikud-elektrilised-tooriistad-plaadisaed` |
| L2-vanem | Elektrilised tööriistad (`v4-tooriistad-ja-tarvikud-elektrilised-tooriistad`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-kasitooriistad-plaadiloikurid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Täpsed lõiked igale plaatimistööle! |

**SEO (ET):** Siit leiad elektrilised plaadisaed keraamiliste plaatide ja kivimaterjalide täpseks lõikamiseks. Sobivad nii koduseks remondiks kui ka sagedasemaks kasutuseks plaatimistöödel. Valikul tasub jälgida sobivat lõikeketta suurust, töölaua mõõtmeid ja kaldlõike võimalust.

**Pilt:** Heledal valgel taustal elektriline plaadisaag metallist töölaua, lõikeketta ja veepaagiga.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Suruõhu ettevalmistusseadmed»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Air Preparation Equipment |
| handle | `v4-tooriistad-ja-tarvikud-suruohutooriistad-suruohu-ettevalmistusseadmed` |
| L2-vanem | Suruõhutööriistad (`v4-tooriistad-ja-tarvikud-suruohutooriistad`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-suruohutooriistad-suruohu-torustiku-komplektid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Puhas suruõhk — pikem tööriistade eluiga |

**SEO (ET):** Suruõhu ettevalmistusseadmed aitavad hoida suruõhusüsteemi puhta ja töökindlana. Siit leiad filtrid, veeseparaatorid, rõhuregulaatorid ja muud lisaseadmed, mis kaitsevad pneumotööriistu niiskuse ja mustuse eest. Sobivad nii kodutöökotta kui ka professionaalsesse kasutusse — vali seade vastavalt oma kompressorile ja ühenduste suurusele.

**Pilt:** Heledal valgel taustal suruõhu filter-regulaator koos läbipaistva kondensaadianumaga ja manomeetriga.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Vertikaalselt avanevate uste komplektid (Lambo-stiilis)»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Vertical Door Kits (Lambo Style) |
| handle | `v4-autovaruosad-ja-tarvikud-valistarvikud-ja-rehvitarvikud-vertikaalselt-avanevate-uste-komplektid-lambo-stiilis` |
| L2-vanem | Välistarvikud ja rehvitarvikud (`v4-autovaruosad-ja-tarvikud-valistarvikud-ja-rehvitarvikud`) |
| senine L3 | `v4-autovaruosad-ja-tarvikud-valistarvikud-jeep-maasturi-valisosad` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Lambo-stiilis uksed – efektne tuuning sinu autole! |

**SEO (ET):** Siit leiad vertikaalselt avanevate uste komplektid, mis annavad autole efektse Lambo-stiilis välimuse. Sobivad autoentusiastidele, kes soovivad oma sõidukit silmapaistvalt tuunida. Enne ostu veendu komplekti sobivuses oma automargi ja -mudeliga ning paigalduse nõuetes.

**Pilt:** Heledal valgel taustal vertikaalselt avaneva ukse hingekomplekt koos metallist kinnitusdetailidega.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Paadivarustuse hoiukotid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Boat Gear Storage Bags |
| handle | `v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid-paadivarustuse-hoiukotid` |
| L2-vanem | Veesport ja ujuvvahendid (`v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid`) |
| senine L3 | `v4-sport-ja-vaba-aeg-veesport-ja-paadindus-paastevestid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Paadivarustus alati korras ja käepärast! |

**SEO (ET):** Siit leiad praktilised hoiukotid ja -lahendused paadivarustuse korrashoidmiseks – päästevestidele, tarvikutele ja muule veesõidukil vajalikule. Need aitavad hoida teki puhta ja varustuse käepärast nii paadis, pontoonil kui ka rannas. Vali sobiv suurus, kinnitusviis ja materjal vastavalt oma paadile ja varustusele.

**Pilt:** Heledal valgel taustal suur tumedast kangast paadi hoiukott, mille avatud suust paistavad päästevestid.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Trepivaibad ja trepikatted»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Stair Treads & Covers |
| handle | `v4-ehitus-remont-ja-varvid-porandakatted-ja-tarvikud-trepivaibad-ja-trepikatted` |
| L2-vanem | Põrandakatted ja tarvikud (`v4-ehitus-remont-ja-varvid-porandakatted-ja-tarvikud`) |
| senine L3 | `v4-moobel-ja-sisustus-sisustusdekoor-vaibad` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Turvaline ja mugav samm igal trepiastmel |

**SEO (ET):** Siit leiad trepivaibad ja trepikatted, mis muudavad trepi astumise mugavamaks ja turvalisemaks. Valikus on katted erinevatele treppidele ja interjööridele – sobivad nii peredele laste ja lemmikloomadega kui ka kõigile, kes soovivad trepiastmeid kulumise eest kaitsta. Valikul jälgi astmete suurust, materjali ja paigaldusviisi.

**Pilt:** Heledal valgel taustal pehme halli trepivaiba komplekt, millest üks kate on asetatud puidust trepiastmele.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Monitorikinnitused ja -hoidikud»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Monitor Mounts & Holders |
| handle | `v4-elektroonika-kinnitused-monitorikinnitused-ja-hoidikud` |
| L2-vanem | TV- ja monitorikinnitused (`v4-elektroonika-kinnitused`) |
| senine L3 | `v4-moobel-ja-sisustus-kontorimoobel-lauasahtlid-alused` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Ergonoomiline töökoht algab õigest monitorikinnitusest |

**SEO (ET):** Siit leiad erinevad monitorikinnitused ja -hoidikud, mis aitavad kuvari lauale või seinale ergonoomiliselt paigutada. Valikus on nii reguleeritavad monitorihoovad kui ka lauakinnitused koduseks ja kontoritööks. Valikul jälgi oma ekraani suurust, kinnitusviisi ja sobivust töökohaga.

**Pilt:** Heledal valgel taustal reguleeritav monitorihoob koos lauakinnitusega, millele on paigaldatud õhuke kuvar.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## «Puurile kinnitatavad lõikurid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Drill Attachment Cutters |
| handle | `v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-puurile-kinnitatavad-loikurid` |
| L2-vanem | Tööriistade tarvikud ja kulumaterjalid (`v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-metallitoo-ja-sepatoo-plekikaarid` → reparent |
| kindlus | tie: hääli 3, new_l3 3 → enamus |
| tagline ET | Muuda oma trell võimsaks lõiketööriistaks! |

**SEO (ET):** Puurile kinnitatavad lõikurid muudavad tavalise akutrelli või elektrilise puuri mitmekülgseks lõiketööriistaks. Sobivad nii meistrimeestele kui ka professionaalidele plaatmaterjalide kiireks ja mugavaks lõikamiseks. Valikul jälgi, et lõikur sobiks sinu puuri ja lõigatava materjaliga.

**Pilt:** Heledal valgel taustal metallist lõikuri otsik, mis kinnitub elektrilise puuri külge plaatmaterjalide lõikamiseks.

**§4.5 täielikkus:** ✅ 11/11 · SEO-värav: ✓

---

## KOKKUVÕTE

- **45 uut L3**, **120 toodet** (reparent senistest L3-dest).
- Täielikkus + SEO-värav: ✅ kõik läbivad.
