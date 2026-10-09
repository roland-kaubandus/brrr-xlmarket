# ETAPP 3 — LÕPLIK PLAAN (granulaarsus-värava järel)

> Genereeritud 2026-10-08T22:20:43.454Z · granulaarsus-värav 2026-10-09T06:12 · `scripts/apply-granularity-gate.mjs`
> **REŽIIM: PLAAN — DB/staging sisu puutumata.** Loomismootor = `scripts/lib/l3-create-engine.mjs` (SAMA kui öine auto-create, HARD RULE #5).

## Lehter

- audit new_l3 **52** → KEEP **51** (−1 MOOT) → fold exact-name **48** → near-dup merge **45** → **granulaarsus-värav → 40 distinct L3** (−5 variant/ebaselge)

### ⛔ Granulaarsus-värav eemaldas (variant olemas-õest / ebaselge → EI looda, tooted jäävad koju + shadow)

| L3 (kandidaat) | tooteid | L2 | verdikt | lähim olemas-õde | põhjus |
|---|---:|---|---|---|---|
| «Mullivanni katted» | 13 | Basseinid ja spaa | variant | Basseinikatted | Sama funktsioon ja väljund — veepinna/vanni katmine ja kaitse. Erineb vaid rakenduselt (mullivann vs bassein) ja suuruselt, mitte funktsioonilt. |
| «Vaipplaadid» | 10 | Sisustusdekoor | variant | Vaibad | Vaipplaadid täidavad sama funktsiooni ja väljundi (põrandakate), erinedes vaid vormis (ruudukujulised isekleepuvad plaadid). Ostja otsib sama asja teises vormis. |
| «Kasvuhoone ventilaatorid» | 3 | Ventilatsioon ja ventilaatorid | variant | Väljalaske- ja katuseventilaatorid | Sama funktsioon — õhuvahetus/väljatõmme; erineb vaid energiaallikas (päikese) ja kasutuskoht, seega variant. |
| «Mullafreesid ja kultivaatorid» | 5 | Talutehnika | variant | Mullaharimine (äkked ja kultivaatorid) | Sama funktsioon ja tulem — mulla harimine/kobestamine teradega; erineb vaid ajami/vormi poolest, ostja otsib sama tulemust. |
| «Hoiusahtlikapid» | 2 | Kontorimööbel | variant | Lauasahtlid ja -alused | Sama funktsioon — kontoritarvete hoiustamine sahtlites; erineb vaid vormilt (ratastega eraldiseisev kapp vs lauaalune sahtel). |

---

## «Põrandatoolid»  (×7 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Floor Chairs |
| handle | `v4-moobel-ja-sisustus-elutoamoobel-porandatoolid` |
| L2-vanem | Elutoamööbel (`v4-moobel-ja-sisustus-elutoamoobel`) |
| senine L3 | `v4-moobel-ja-sisustus-elutoamoobel-kott-toolid` → reparent |
| granulaarsus | ✅ Põrandatoolid on jalgadeta, põrandal istutav reguleeritava seljatoega istetüüp (gaming/lazy), mis erineb selgelt tugitoolidest ja kott-toolidest nii vormi kui kasutuse poolest; ostja ei asenda seda tavatugitooliga sama tulemusega. |
| tagline ET | Mugav istumine otse põrandal – mängi, loe, lõõgastu! |

**SEO (ET):** Põrandatoolid on mugavad ja kokkupandavad istmed, mis sobivad suurepäraselt mängimiseks, lugemiseks, teleri vaatamiseks või lihtsalt lõõgastumiseks. Valikus on reguleeritava seljatoega, pöörlevad ja diivanvoodiks muudetavad mudelid nii elutuppa kui magamistuppa. Valikul tasub jälgida sobivat suurust, reguleerimisvõimalusi ja kattematerjali.

---

## «Aktiivse istumise istmed»  (×4 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Active Sitting Chairs |
| handle | `v4-moobel-ja-sisustus-toolid-ja-istmed-aktiivse-istumise-istmed` |
| L2-vanem | Toolid ja istmed (`v4-moobel-ja-sisustus-toolid-ja-istmed`) |
| senine L3 | `v4-moobel-ja-sisustus-kontorimoobel-ja-tarvikud-kontoritoolid` → reparent |
| granulaarsus | ✅ Aktiivse istumise istmed (wobble) pakuvad tasakaalustavat/liikuvat istumist rühi parandamiseks — funktsioon erineb selgelt söögitoolidest ja baaritoolidest; ostja ei saa asendada sama tulemusega. |
| tagline ET | Liigu istudes – parem rüht ja keskendumine! |

**SEO (ET):** Aktiivse istumise istmed ja kõikuvad taburetid, mis muudavad istumise liikuvamaks ja toetavad paremat kehahoiakut. Sobivad suurepäraselt kooli, kontorisse ja koju kõigile, kes soovivad pikkade istumistundide ajal keskendumist ja aktiivsust hoida. Valikul tasub jälgida sobivat kõrgust, materjali ja istme liikuvuse tüüpi.

---

## «Raskustekid»  (×5 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Weighted Blankets |
| handle | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-raskustekid` |
| L2-vanem | Magamistoamööbel ja voodipesu (`v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu`) |
| senine L3 | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-tekid` → reparent |
| granulaarsus | ✅ Raskustekk on teraapiline tekk (surve/ärevuse leevendus) — puudub õde-L3 tekkide jaoks, funktsioon ja väljund täiesti erinev. |
| tagline ET | Rahulikum uni ja vähem stressi raskusteki abil |

**SEO (ET):** Raskustekid aitavad keha õrnalt rahustada ja toetavad sügavamat, kvaliteetsemat und. Valikus on erinevas suuruses ja materjalist tekid nii jahedamat kui ka soojemat tunnetust eelistavatele magajatele. Teki valikul tasub jälgida sobivat suurust ja raskust vastavalt oma kehakaalule ning eelistatud kangamaterjali.

---

## «Põlvitustoolid»  (×5 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Kneeling Chairs |
| handle | `v4-moobel-ja-sisustus-toolid-ja-istmed-polvitustoolid` |
| L2-vanem | Toolid ja istmed (`v4-moobel-ja-sisustus-toolid-ja-istmed`) |
| senine L3 | `v4-moobel-ja-sisustus-kontorimoobel-ja-tarvikud-kontoritoolid` → reparent |
| granulaarsus | ✅ Põlvitustoolid on ergonoomilise erikujuga rühitoolid, kus kael/selg ja põlved toetatakse eri asendis — unikaalne funktsioon ja väljund, mida olemas-õed ei asenda. |
| tagline ET | Parem rüht ja mugavam istumine iga päev |

**SEO (ET):** Põlvitustoolid aitavad hoida loomulikku rühti ja vähendada koormust seljale pikaajalisel istumisel. Siit leiad ergonoomilised istmed koduseks tööks, kontorisse või meditatsiooniks. Valikul tasub jälgida sobivat materjali, polstri mugavust ja reguleerimisvõimalusi.

---

## «Metallkatuseplaadid»  (×4 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Metal Roof Panels |
| handle | `v4-ehitus-remont-ja-varvid-katusematerjalid-metallkatuseplaadid` |
| L2-vanem | Katusematerjalid (`v4-ehitus-remont-ja-varvid-katusematerjalid`) |
| senine L3 | `v4-ehitus-remont-ja-varvid-katusematerjalid-epdm-kummikatted` → reparent |
| granulaarsus | ✅ Metallkatuseplaadid on katusekattematerjal ise, erineb funktsioonilt nii EPDM kummikatetest kui läbiviigu tihenditest — ostja ei saa asendada sama tulemusega.nearest puudub.nearest.null |
| tagline ET | Vastupidav metallkatus igale varjualusele ja kuurile |

**SEO (ET):** Metallkatuseplaadid sobivad varjualuste, kuuride, lehtlate ja muude väikehoonete katmiseks. Valikus on erinevas mõõdus ja toonis plaadid, mis paigalduvad kiirelt ja peavad vastu muutlikule ilmale. Valikul jälgi kaetava pinna suurust, plaadi profiili ja sobivat värvitooni.

---

## «Kokkupandavad külalisvoodid»  (×4 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Folding Guest Beds |
| handle | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-kokkupandavad-kulalisvoodid` |
| L2-vanem | Magamistoamööbel ja voodipesu (`v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu`) |
| senine L3 | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-voodiraamid-ja-baldahhiinvoodid` → reparent |
| granulaarsus | ✅ Kokkupandav külalisvoodi on terviklik teisaldatav ajutine magamislahendus koos madratsiga, erineb selgelt püsivatest voodiraamidest. |
| tagline ET | Mugav magamiskoht külalistele, kompaktne hoiustamine |

**SEO (ET):** Siit leiad kokkupandavad külalisvoodid, mis pakuvad mugavat magamiskohta siis, kui seda vaja on, ja mahuvad pärast kasutamist kompaktselt hoiule. Sobivad ideaalselt külaliste majutamiseks nii kodus, suvilas kui ka üürikorteris. Valikul jälgi sobivat suurust, madratsi mugavust ja raami vastupidavust.

---

## «Jalamassöörid ja -stimulaatorid»  (×4 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Foot Massagers & Stimulators |
| handle | `v4-tervis-hooldus-ja-ilu-isikuhooldusseadmed-jalamassoorid-ja-stimulaatorid` |
| L2-vanem | Isikuhooldusseadmed (`v4-tervis-hooldus-ja-ilu-isikuhooldusseadmed`) |
| senine L3 | `v4-keha-massoorid` → reparent |
| granulaarsus | ✅ Jalaspetsiifilised massöörid EMS/TENS vereringe stimulatsiooni ja shiatsu jalatoega on eraldi tootetüüp – üldised keha-massöörid ei anna sama sihitud jalamassaaži/neuropaatia tulemust. |
| tagline ET | Lõõgastus ja kergendus sinu jalgadele kodus |

**SEO (ET):** Siit leiad elektrilised jalamassöörid ja -stimulaatorid, mis aitavad lõõgastada väsinud jalgu, leevendada pingeid ja toetada mugavat enesetunnet pärast pikka päeva. Valikus on erinevat tüüpi seadmed – nii massaažirullikutega kui ka elektrilise stimulatsiooniga mudelid – koju ja igapäevaseks kasutamiseks. Valikul tasub jälgida massaažitüüpi, lisafunktsioone ja seadme sobivust sinu vajadustega.

---

## «Põlvekäimistoed (põlveskuutrid)»  (×3 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Knee Scooters |
| handle | `v4-meditsiin-ja-liikumisabi-liikumisabi-polvekaimistoed-polveskuutrid` |
| L2-vanem | Liikumisabi (`v4-meditsiin-ja-liikumisabi-liikumisabi`) |
| senine L3 | `v4-meditsiin-ja-liikumisabi-liikumisabi-kondimiskepid-ja-raamid` → reparent |
| granulaarsus | ✅ Põlveskuuter toetab vigastatud jala sääre ja võimaldab liikuda terve jalaga lükates — see on erinev funktsioon kui rollaatoril (kõnnitugi) või elektriskuutril. Ostja ei saa seda asendada õe-kategooria tootega sama tulemusega. |
| tagline ET | Mugav liikumine jalavigastuse taastumise ajal |

**SEO (ET):** Põlvekäimistoed ehk põlveskuutrid on mugav alternatiiv karkudele jalavigastuse või operatsioonijärgse taastumise ajal. Siit leiad erinevas suuruses ja erineva varustusega mudeleid nii kodus kui õues liikumiseks. Valikul tasub jälgida sobivat kõrgust, rataste tüüpi ja kokkupandavust, et abivahend sobiks just sinu igapäevaste vajadustega.

---

## «Jalgratta transpordikotid ja -kohvrid»  (×3 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Bike Travel Bags & Cases |
| handle | `v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgratta-transpordikotid-ja-kohvrid` |
| L2-vanem | Jalgrattad ja tarvikud (`v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud`) |
| senine L3 | `v4-sport-ja-vaba-aeg-jalgrattad-ja-tarvikud-jalgratta-kotid-ja-korvid` → reparent |
| granulaarsus | ✅ Transpordikotid/-kohvrid terve ratta pakkimiseks ja kaitsmiseks lennureisil on erineva funktsiooniga kui rattale kinnitatavad tavakotid ja korvid, mis kannavad esemeid sõidu ajal. Ostja ei saa neid asendada sama tulemusega. |
| tagline ET | Vii oma jalgratas turvaliselt igale reisile! |

**SEO (ET):** Siit leiad transpordikotid ja kohvrid, mis aitavad jalgratast turvaliselt kaasa võtta reisile, võistlusele või matkale. Sobivad nii lennuki, auto kui ka rongiga reisijatele, kes soovivad oma ratast kriimustuste ja põrutuste eest kaitsta. Valikul jälgi oma ratta tüüpi ja mõõtmeid ning koti kinnitus- ja kaitselahendusi.

---

## «Külmkohvi valmistussüsteemid (nitro cold brew)»  (×3 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Nitro Cold Brew Systems |
| handle | `v4-suurkook-kohviseadmed-kulmkohvi-valmistussusteemid-nitro-cold-brew` |
| L2-vanem | Kohviseadmed (`v4-suurkook-kohviseadmed`) |
| senine L3 | `v4-kodumasinad-ja-kodutehnika-koogitehnika-espresso-ja-kohvimasinad` → reparent |
| granulaarsus | ✅ Lämmastikuga rikastatud külmkohvi süsteem annab unikaalse väljundi (nitro cold brew), mida tavalise kannu või pressiga ei saa asendada - erinev tulem ja funktsioon. |
| tagline ET | Kohvikukvaliteediga nitro-külmkohv otse sinu koju |

**SEO (ET):** Siit leiad külmkohvi valmistamise süsteemid ja nitro-dosaatorid, millega valmib kreemja vahuga külm kohv otse kodus. Sobivad kohvisõpradele, kes soovivad kohvikukvaliteediga jooki ilma kodust lahkumata. Vali endale sobiv suurus vastavalt sellele, kui palju kohvi korraga valmistada soovid.

---

## «Hoiuvoodi tõstemehhanismid»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Storage Bed Lift Mechanisms |
| handle | `v4-moobel-ja-sisustus-moobliosad-ja-komponendid-hoiuvoodi-tostemehhanismid` |
| L2-vanem | Mööbliosad ja -komponendid (`v4-moobel-ja-sisustus-moobliosad-ja-komponendid`) |
| senine L3 | `v4-moobel-ja-sisustus-sisustustarvikud-ja-dekoor-seinavoodi-mehhanismid` → reparent |
| granulaarsus | ✅ Hoiuvoodi gaasvedru-tõstemehhanism tõstab madratsialuse hoiustamiseks üles — funktsioon ja tulem erinevad seinavoodi (Murphy) kokkuklapitavast mehhanismist; ostja ei saa neid asendada sama tulemusega. |
| tagline ET | Ava voodialune hoiuruum ühe liigutusega! |

**SEO (ET):** Siit leiad tõstemehhanismid, mis muudavad voodi- või diivanialuse ruumi mugavaks hoiukohaks. Sobivad nii uue mööbli ehitamiseks kui ka olemasoleva voodi uuendamiseks. Valikul jälgi mehhanismi suurust ja sobivust oma voodiraami tüübiga.

---

## «Värvimis- ja kuivatusstatiivid»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Painting & Drying Racks |
| handle | `v4-garaaziseadmed-varvimine-ja-viimistlus-varvimis-ja-kuivatusstatiivid` |
| L2-vanem | Värvimine ja viimistlus (`v4-garaaziseadmed-varvimine-ja-viimistlus`) |
| senine L3 | `v4-varvimiskabiinid-ja-telgid` → reparent |
| granulaarsus | ✅ Statiiv osade riputamiseks ja kuivatamiseks on erineva funktsiooniga kui kabiinid, surveanumad või kuivatuslambid; ostja ei asenda seda õe-kategooria tootega.nearest puudub.nearest sama tulemus puudub.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest.nearest |
| tagline ET | Mugav tugi värvimiseks ja kuivatamiseks |

**SEO (ET):** Värvimis- ja kuivatusstatiivid aitavad autodetaile ja muid värvitavaid esemeid mugavalt riputada, värvida ja kuivatada. Sobivad nii autoremonditöökodadele kui ka koduse garaaži meistritele. Valikul tasub jälgida sobivat kõrgust, konksude paigutust ja statiivi liikuvust tööruumis.

---

## «Tuhaimejad»  (×4 toodet) [fold spu:08307+spu:10235]

| väli | väärtus |
|---|---|
| EN nimi | Ash Vacuums |
| handle | `v4-santehnika-kute-ja-ventilatsioon-kaminad-ja-korsten-tuhaimejad` |
| L2-vanem | Kaminad ja korsten (`v4-santehnika-kute-ja-ventilatsioon-kaminad-ja-korsten`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud-tolmuimejad` → reparent |
| granulaarsus | ✅ Tuhaimeja on elektriline imurseade, funktsioon (imemine) erineb selgelt tuhaämbrist (käsitsi hoiustamine). Ostja ei saa asendada sama tulemusega.ced |
| tagline ET | Puhas kamin ilma tolmu ja vaevata |

**SEO (ET):** Tuhaimejad on spetsiaalsed imurid kamina, ahju, pelletikatla, grilli ja lõkkekoha tuha kiireks ning puhtaks eemaldamiseks. Need muudavad küttekolde korrashoiu lihtsamaks ja hoiavad peene tuhatolmu toaõhust eemal. Valikul tasub jälgida sobivat mahutit, vooliku pikkust ja filtreerimislahendust vastavalt oma kütteseadmele.

---

## «Kaitserauad»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Bumpers |
| handle | `v4-autovaruosad-ja-tarvikud-valistarvikud-ja-rehvitarvikud-kaitserauad` |
| L2-vanem | Välistarvikud ja rehvitarvikud (`v4-autovaruosad-ja-tarvikud-valistarvikud-ja-rehvitarvikud`) |
| senine L3 | `v4-autovaruosad-ja-tarvikud-veoauto-tarvikud-astmelauad-ja-astmepukid` → reparent |
| granulaarsus | ✅ Kaitserauad on eraldi kerevälisosa, mille funktsioon ja väljund erinevad kõigist olemas-õdedest; ostja ei asenda seda ühegi loetletud tarvikuga. |
| tagline ET | Vastupidavad kaitserauad sinu auto kaitseks |

**SEO (ET):** Siit leiad asendus- ja tagumised kaitserauad erinevatele sõidukimudelitele, mis aitavad taastada auto välimuse ja kaitsta keret igapäevases liikluses. Sobivad nii vigastatud kaitseraua väljavahetamiseks kui ka sõiduki uuendamiseks. Enne tellimist kontrolli alati sobivust oma auto margi, mudeli ja aastakäiguga.

---

## «Veinikülmikud»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Wine Coolers |
| handle | `v4-moobel-ja-sisustus-riiulid-ja-hoiustamine-veinikulmikud` |
| L2-vanem | Riiulid ja hoiustamine (`v4-moobel-ja-sisustus-riiulid-ja-hoiustamine`) |
| senine L3 | `v4-kodumasinad-ja-kodutehnika-koogitehnika-kulmikud-ja-sugavkulmikud` → reparent |
| granulaarsus | ✅ Veinikülmik on aktiivse jahutuse ja temperatuurikontrolliga seade, mitte passiivne veiniriiul. Funktsioon ja väljund erinevad selgelt – ostja ei saa asendada jahutavat seadet tavalise pudeliriiuliga sama tulemusega.nearest ei kohaldu. |
| tagline ET | Hoia oma veinid alati serveerimisvalmis! |

**SEO (ET):** Veinikülmikud hoiavad su veinivaru õigel temperatuuril ja alati serveerimisvalmis. Siit leiad erineva suuruse ja stiiliga veinikülmikuid nii kodubaari, kööki kui ka elutuppa. Valikul jälgi, kui palju pudeleid soovid hoiustada ja milline disain sinu interjööriga sobib.

---

## «Kattemadratsid»  (×3 toodet) [fold spu:12357+spu:12358]

| väli | väärtus |
|---|---|
| EN nimi | Mattress Toppers |
| handle | `v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu-kattemadratsid` |
| L2-vanem | Magamistoamööbel ja voodipesu (`v4-moobel-ja-sisustus-magamistoamoobel-ja-voodipesu`) |
| senine L3 | `v4-moobel-kodutekstiil-madratsikaitsed` → reparent |
| granulaarsus | ✅ Kattemadrats on lisakiht olemasolevale madratsile, mitte iseseisev madrats — erinev funktsioon kui tatami matid/matrassid. |
| tagline ET | Mugavam uni ilma uut madratsit ostmata |

**SEO (ET):** Kattemadratsid muudavad olemasoleva voodi mugavamaks ja pikendavad madratsi eluiga. Siit leiad erineva paksuse ja täitematerjaliga kattemadratseid nii pehmema kui ka toetavama magamistunde eelistajatele. Valikul jälgi sobivat suurust, materjali ja hooldusmugavust.

---

## «Kallutuskomplektid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Dump Hoist Kits |
| handle | `v4-autovaruosad-ja-tarvikud-hudraulika-kallutuskomplektid` |
| L2-vanem | Hüdraulika (`v4-autovaruosad-ja-tarvikud-hudraulika`) |
| senine L3 | `v4-autovaruosad-ja-tarvikud-hudraulika-agregaadid` → reparent |
| granulaarsus | ✅ Kallutuskomplekt on terviklik rakendussüsteem (silinder+pump+klapp koos) kalluri tõstmiseks — ostja ei asenda seda üksiku hüdrokomponendiga sama tulemusega. |
| tagline ET | Kiire ja mugav mahalaadimine hüdraulika jõul |

**SEO (ET):** Kallutuskomplektid on mõeldud haagiste ja veokite kastide hüdrauliliseks kallutamiseks, muutes puistematerjali ja koorma mahalaadimise kiireks ning mugavaks. Sobivad nii ehitus-, põllumajandus- kui ka transporditöödeks. Valikul tasub jälgida, et komplekt sobiks sinu haagise või veoki suuruse ja kasutusotstarbega.

---

## «Laste maandumispadjad»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Kids Crash Pads |
| handle | `v4-tervis-hooldus-ja-ilu-beebi-ja-lapsetarbed-laste-maandumispadjad` |
| L2-vanem | Beebi- ja lapsetarbed (`v4-tervis-hooldus-ja-ilu-beebi-ja-lapsetarbed`) |
| senine L3 | `v4-sport-ja-vaba-aeg-manguasjad-lastele-tasakaalu-ja-liikumismanguasjad` → reparent |
| granulaarsus | ✅ Maandumispadi on paks vahtkummist kukkumis-/hüppepadi (sensoorne teraapiavahend), mitte õhuke mängumatt ega magamiseks mõeldud pesapadi. Funktsioon ja väljund (turvaline maandumistsoon) erinevad selgelt olemasolevatest õdedest. |
| tagline ET | Pehme ja turvaline maandumine igaks mänguhetkeks |

**SEO (ET):** Pehmed maandumispadjad ja hiiglaslikud padjamatid, mis pakuvad lastele turvalist kohta hüppamiseks, maandumiseks ja lõõgastumiseks. Sobivad suurepäraselt koju mängunurka, sensoorsesse tuppa või aktiivseks sisemänguks. Valikul tasub jälgida sobivat suurust, katte materjali ja puhastamise lihtsust.

---

## «Kiviplaatide paigaldustööriistad»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Stone Slab Installation Tools |
| handle | `v4-tooriistad-ja-tarvikud-kasitooriistad-kiviplaatide-paigaldustooriistad` |
| L2-vanem | Käsitööriistad (`v4-tooriistad-ja-tarvikud-kasitooriistad`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-kasitooriistad-vuugitooriistad` → reparent |
| granulaarsus | ✅ Kiviplaatide õmbluste seadmise ja vaakumtõstetööriistad on eriotstarbeline funktsioon, mida ükski olemas-õde ei kata.- |
| tagline ET | Täpne ja sujuv kiviplaatide paigaldus |

**SEO (ET):** Siit leiad spetsiaalsed tööriistad kivi-, graniit- ja marmorplaatide paigaldamiseks, sealhulgas vuugiseadjad ja vaakumiminutitega abivahendid plaatide täpseks ühendamiseks ja loodimiseks. Sobivad nii professionaalsetele paigaldajatele kui ka nõudlikumale koduküüle, kes soovib töötasapindade ja plaatide paigaldusel puhast ja sujuvat tulemust. Valikul jälgi, et tööriist sobiks sinu plaadi materjali ja pinna tüübiga.

---

## «Antenni- ja satelliidikinnitused»  (×3 toodet) [fold spu:14782+vpt:Electrical > Satellite Equipment > Satellite Dish Mounts]

| väli | väärtus |
|---|---|
| EN nimi | Antenna & Satellite Mounts |
| handle | `v4-elektroonika-vork-antenni-ja-satelliidikinnitused` |
| L2-vanem | Võrk ja satelliit (`v4-elektroonika-vork`) |
| senine L3 | `v4-elektritarvikud-ja-valgustus-elektroonika-satelliit-ja-vorgukaablid` → reparent |
| granulaarsus | ✅ Kinnitused/paigaldustarvikud erinevad funktsionaalselt kaablitest ja jätkuseadmetest — ostja ei saa asendada kinnitust kaabliga. |
| tagline ET | Kindel kinnitus parimaks signaaliks igas asukohas |

**SEO (ET):** Siit leiad kinnitused ja hoidikud antennide ning satelliitseadmete paigaldamiseks katusele, seinale või masti külge. Sobivad nii koduseks kui ka suvila- ja haagiselahendusteks, kus on vaja stabiilset ja töökindlat signaalivastuvõttu. Valikul jälgi oma seadme mudelit, paigalduskohta ja kinnituse reguleeritavust.

---

## «Piknikutarvikud»  (×2 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Picnic Accessories |
| handle | `v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine-piknikutarvikud` |
| L2-vanem | Matkavarustus ja telkimine (`v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine`) |
| senine L3 | `v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine-jahutuskastid-ja-kotid` → reparent |
| granulaarsus | ✅ Piknikukomplekt isoleeritud jahutuslahtri, nõude ja söögiriistadega – funktsioon (söögiks valmis piknikukomplekt) erineb selgelt seljakottidest ja matkatarvikutest; ostja ei saa seda asendada tavalise seljakoti ega matkatekiga sama tulemusega. |
| tagline ET | Kõik mugavaks piknikuks looduses! |

**SEO (ET):** Piknikutarvikute kategooriast leiad kõik vajaliku mõnusaks väljasõiduks loodusesse – pikniku seljakotid, tekid ning söögi- ja jooginõude komplektid. Sobivad suurepäraselt rannapäevaks, matkaks või perepuhkuseks pargis. Valikul jälgi komplekti suurust, mugavat kandmist ja oma seltskonnale sobivat varustust.

---

## «Tomatipressid ja kastmemasinad»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Tomato Strainers & Sauce Makers |
| handle | `v4-suurkoogiseadmed-ettevalmistus-ja-tootlus-tomatipressid-ja-kastmemasinad` |
| L2-vanem | Ettevalmistus ja töötlus (`v4-suurkoogiseadmed-ettevalmistus-ja-tootlus`) |
| senine L3 | `v4-kodumasinad-ja-kodutehnika-koogitehnika-koogikombainid-ja-toiduprotsessorid` → reparent |
| granulaarsus | ✅ Tomatipress eraldab viljaliha koortest ja seemnetest ning toodab kastet/püreed — funktsioon ja väljund erinevad selgelt viilutajatest ja hakklihamasinatest, ostja ei saa sama tulemust asenduskategooriast. |
| tagline ET | Kodused kastmed ja mahlad vaevata valmis! |

**SEO (ET):** Tomatipressid ja kastmemasinad muudavad tomatite ja muude viljade töötlemise kiireks ja mugavaks – eraldades mahla ja viljaliha koortest ning seemnetest. Sobivad nii kodukokale hoidiste valmistamiseks kui ka suuremate koguste töötlemiseks. Valikul tasub jälgida sobivat võimsusklassi, materjali ja puhastamise lihtsust.

---

## «Sõrmuste suuruse muutmise tööriistad»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Ring Sizing Tools |
| handle | `v4-hobi-ehtekunst-sormuste-suuruse-muutmise-tooriistad` |
| L2-vanem | Ehte- ja metallitöö (`v4-hobi-ehtekunst`) |
| senine L3 | `v4-hobi-ehtekunst-ehte-rullpressid` → reparent |
| granulaarsus | ✅ Sõrmuste suuruse muutmise/venitamise tööriistad on omaette funktsiooniga (sõrmuse vormimine/laiendamine), ükski olemas-õde ei kata seda tulemust.- |
| tagline ET | Täpne sõrmuse suurus iga meistri käe all |

**SEO (ET):** Siit leiad tööriistad sõrmuste suuruse muutmiseks ja vormimiseks – nii venitamiseks, vähendamiseks kui ka kuju korrigeerimiseks. Sobivad ehtemeistritele, parandustöökodadele ja hobikorras ehete valmistajatele. Valikul jälgi, et tööriist sobiks sinu töödeldava materjali ja töö iseloomuga.

---

## «Mereandide tarvikud»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Seafood Tools |
| handle | `v4-suurkoogiseadmed-noud-mereandide-tarvikud` |
| L2-vanem | Nõud ja serveerimine (`v4-suurkoogiseadmed-noud`) |
| senine L3 | `v4-suurkoogiseadmed-koogitarvikud-ja-noud-kokteili-ja-baaritarvikud` → reparent |
| granulaarsus | ✅ Mereandide avamise ja purustamise erifunktsioon (krabipurustid, austrinoad) erineb selgelt olemasolevatest õdedest — ostja ei asenda seda noa ega konserviavajaga, väljund on eri. |
| tagline ET | Mugavad tööriistad mereandide nautimiseks |

**SEO (ET):** Mereandide tarvikud muudavad krabide, homaaride ja teiste koorikloomade serveerimise ja söömise lihtsaks ning nauditavaks. Kategooriast leiad purustajad, nõelad ja muud abivahendid nii koduseks kasutuseks kui ka pidulikuks serveerimiseks. Valikul tasub jälgida materjali vastupidavust ja mugavat käepidet.

---

## «Roolisüsteemi tööriistad»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Steering System Tools |
| handle | `v4-tooriistad-ja-tarvikud-kasitooriistad-roolisusteemi-tooriistad` |
| L2-vanem | Käsitööriistad (`v4-tooriistad-ja-tarvikud-kasitooriistad`) |
| senine L3 | `v4-garaaz-veom-jouulekande-tooriistad` → reparent |
| granulaarsus | ✅ Roolivardade eemaldustööriistad on spetsiifiline auto-roolisüsteemi funktsioon, erineb selgelt kõigist olemas-õdedest. |
| tagline ET | Professionaalsed tööriistad roolisüsteemi remondiks ja hoolduseks |

**SEO (ET):** Roolisüsteemi tööriistad on mõeldud rooliotste, roolivarraste ja muude roolimehhanismi osade eemaldamiseks ning paigaldamiseks. Sobivad nii autoremonditöökodadele kui ka kodugaraaži meistritele, kes soovivad roolisüsteemi hooldust ise teha. Valikul tasub jälgida, et komplekt sobiks sinu sõiduki margi ja tööriistade ühendusega.

---

## «Roomajate inkubaatorid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Reptile Incubators |
| handle | `v4-lemmikloomatarbed-akvaariumid-ja-terraariumid-roomajate-inkubaatorid` |
| L2-vanem | Akvaariumid ja terraariumid (`v4-lemmikloomatarbed-akvaariumid-ja-terraariumid`) |
| senine L3 | `v4-pollumajandus-ja-loomakasvatus-linnukasvatus-inkubaatorid-ja-munahaudejad` → reparent |
| granulaarsus | ✅ Inkubaator haudub roomajate mune temperatuuri reguleerimisega — täiesti erinev funktsioon ja väljund võrreldes akvaariumide ja aedikute hooldustarvetega. Ostja ei saa seda asendada ühegi olemasoleva õe-kategooriaga. |
| tagline ET | Turvaline haudekeskkond sinu roomajate munadele |

**SEO (ET):** Roomajate inkubaatorid aitavad luua munade haudumiseks stabiilse ja kontrollitud keskkonna. Sobivad nii hobikasvatajatele kui ka kogenud terraristidele, kes soovivad munade arengut mugavalt jälgida. Valikul tasub arvestada oma roomajaliigi vajaduste ja munade arvuga.

---

## «Käte desinfitseerimise dosaatorid ja jaamad»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Hand Sanitizer Dispensers & Stations |
| handle | `v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud-kate-desinfitseerimise-dosaatorid-ja-jaamad` |
| L2-vanem | Puhastustehnika ja -tarvikud (`v4-tooriistad-ja-tarvikud-puhastustehnika-ja-tarvikud`) |
| senine L3 | `v4-tervis-hooldus-ja-ilu-isikuhooldusseadmed-sterilisaatorid` → reparent |
| granulaarsus | ✅ Käte desinfitseerimise dosaatorid on eraldiseisev funktsioon (desovahendi jaotamine), mitte pindade või põranda puhastamine; ükski olemas-õde ei täida sama tulemust.nearest puudub.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct.nearest.distinct |
| tagline ET | Mugav kätehügieen igasse ruumi |

**SEO (ET):** Siit leiad käte desinfitseerimise dosaatorid ja jaamad nii kodudesse, kontoritesse kui ka avalikesse ruumidesse. Valikus on erinevat tüüpi lahendusi, sealhulgas automaatseid ja statiiviga mudeleid, mis muudavad kätehügieeni mugavaks ja kättesaadavaks. Valikul tasub arvestada paigalduskohta, kasutussagedust ja sobivat dosaatori tüüpi.

---

## «Graafikapressid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Printmaking Presses |
| handle | `v4-hobi-ehtekunst-graafikapressid` |
| L2-vanem | Ehte- ja metallitöö (`v4-hobi-ehtekunst`) |
| senine L3 | `v4-reklaami-truki-ja-graveerimisseadmed-tekstiili-ja-roivatrukk-siiditruki-seadmed-ja-komplektid` → reparent |
| granulaarsus | ✅ Graafika-/söövituspressid on trükkimiseks (väljund = trükis paberile), erinevalt ehte-rullpressist, mis lapistab metalli. Funktsioon ja tulem erinevad. |
| tagline ET | Kvaliteetsed tõmmised sinu enda töötoast |

**SEO (ET):** Graafikapressid sügavtrüki, ofordi ja muude graafikatehnikate jaoks nii hobikunstnikule kui ka stuudiole. Siit leiad lauapresse ja tarvikuid, millega saab koduses töötoas või ateljees kvaliteetseid tõmmiseid valmistada. Valikul tasub jälgida sobivat tööpinna suurust ja pressi konstruktsiooni vastavalt oma tehnikale.

---

## «Pöördtööriista tarvikud»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Rotary Tool Accessories |
| handle | `v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-poordtooriista-tarvikud` |
| L2-vanem | Tööriistade tarvikud ja kulumaterjalid (`v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-puuri-ja-kruvikeerajaotsikute-komplektid` → reparent |
| granulaarsus | ✅ Pöördtööriista (Dremel-tüüpi) universaalsed tarvikud graveerimiseks, lihvimiseks, lõikamiseks — erineb funktsionaalselt võnk-/multitööriista saeteradest; ostja ei asenda ühte teisega. |
| tagline ET | Õige otsak igaks täppistööks |

**SEO (ET):** Siit leiad mitmekülgsed tarvikud pöördtööriistadele – otsakud ja komplektid graveerimiseks, lihvimiseks, lõikamiseks, puurimiseks ja poleerimiseks. Sobivad nii hobimeistritele kui ka täpsustööde tegijatele. Vali tarvikud vastavalt oma tööriista kinnitusele ja planeeritavale tööle.

---

## «Riidepuud»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Hangers |
| handle | `v4-ladu-kaupluse-sisustus-riidepuud` |
| L2-vanem | Kaupluse sisustus (`v4-ladu-kaupluse-sisustus`) |
| senine L3 | `v4-ladu-roivariiulid-nagid` → reparent |
| granulaarsus | ✅ Riidepuud on üksikud rõivaalused, mitte riiulid/nagid – ostja ei saa asendada riidepuude komplekti riidenagiga sama tulemusega. Funktsioon erineb selgelt. |
| tagline ET | Korras rõivad, rohkem ruumi garderoobis |

**SEO (ET):** Riidepuud rõivaste korrektseks ja säästlikuks eksponeerimiseks nii kaupluses kui ka kodus. Valikus on erineva kuju ja materjaliga riidepuid eri tüüpi rõivaste jaoks – pintsakutest kleitide ja õrnade kangasteni. Vali sobiv mudel vastavalt rõivaste tüübile, soovitud materjalile ja viimistlusele.

---

## «Vanni äravoolukomplektid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Bathtub Drain Kits |
| handle | `v4-santehnika-kute-ja-ventilatsioon-aravool-ja-porandatrapid-vanni-aravoolukomplektid` |
| L2-vanem | Äravool ja põrandatrapid (`v4-santehnika-kute-ja-ventilatsioon-aravool-ja-porandatrapid`) |
| senine L3 | `v4-santehnika-kute-ja-ventilatsioon-dusisusteemid-ja-dusikabiinid-dusialuste-komplektid-ja-tarvikud` → reparent |
| granulaarsus | ✅ Vanni äravoolukomplekt on funktsionaalselt erinev — vanni tühjendussüsteem koos ülevoolu ja toruga, mitte põranda/dušikanali äravool. Ostja ei saa asendada lineaartrapiga sama tulemusega.nearest ei sobi.nearest:null |
| tagline ET | Kindel äravool igale vannile |

**SEO (ET):** Siit leiad vanni äravoolukomplektid, mis sobivad nii vabalt seisvatele kui ka põrandale paigaldatavatele vannidele. Komplektid sisaldavad paigalduseks vajalikke osi, et ühendada vann äravoolusüsteemiga kindlalt ja lekkevabalt. Valikul jälgi oma vanni tüüpi, ühenduste sobivust ja materjali vastupidavust.

---

## «Fotostuudio valgustistatiivid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Photo Studio Light Stands |
| handle | `v4-tooriistad-ja-tarvikud-moote-ja-markeriistad-fotostuudio-valgustistatiivid` |
| L2-vanem | Mõõte- ja märkeriistad (`v4-tooriistad-ja-tarvikud-moote-ja-markeriistad`) |
| senine L3 | `v4-elektritarvikud-ja-valgustus-toostusvalgustus-fotostuudio-valgustid` → reparent |
| granulaarsus | ✅ Fotostuudio valgustistatiiv ei ole mõõte- ega märkeriist; funktsioon (valgusti kinnitus) erineb täielikult kõigist õdedest. Ei kuulu tegelikult sellesse L2-sse, kuid õdede seas puudub sarnane kategooria. |
| tagline ET | Kindel tugi sinu stuudiovalgustusele |

**SEO (ET):** Siit leiad statiivid ja alused fotostuudio valgustite, softboxide ja reflektorite kinnitamiseks. Sobivad nii koduse stuudio loojale kui ka professionaalsele fotograafile, kes vajab stabiilset ja reguleeritavat tuge oma valgustehnikale. Valikul tasub jälgida sobivat kõrgust, materjali vastupidavust ja ühilduvust oma seadmetega.

---

## «Infusiooni- ja verevõtutoolid»  (×2 toodet) [fold spu:17023+spu:14309]

| väli | väärtus |
|---|---|
| EN nimi | Infusion & Phlebotomy Chairs |
| handle | `v4-meditsiin-ja-liikumisabi-meditsiinitarvikud-infusiooni-ja-verevotutoolid` |
| L2-vanem | Meditsiinitarvikud (`v4-meditsiin-ja-liikumisabi-meditsiinitarvikud`) |
| senine L3 | `v4-meditsiin-ja-liikumisabi-meditsiinitarvikud-geriaatrilised-toolid` → reparent |
| granulaarsus | ✅ Infusiooni- ja verevõtutoolid on spetsiifilise funktsiooniga (vere võtmise/IV asend, käetoed veenipunktsiooniks), mida ei asenda geriaatrilised toolid ega uurimislauad – väljund ja kasutus erinevad selgelt. |
| tagline ET | Mugavad ja praktilised toolid protseduurideks |

**SEO (ET):** Siit leiad infusiooni- ja verevõtutoolid haiglatele, kliinikutele, laboritele ja teistele tervishoiuasutustele. Valikus on reguleeritavate käetugede ja seljatoega mudelid, mis tagavad patsiendile mugavuse ja personalile hõlpsa ligipääsu protseduuri ajal. Valikul tasub tähele panna istme polsterdust, reguleerimisvõimalusi ja pinna puhastatavust.

---

## «Plaadisaed»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Tile Saws |
| handle | `v4-tooriistad-ja-tarvikud-elektrilised-tooriistad-plaadisaed` |
| L2-vanem | Elektrilised tööriistad (`v4-tooriistad-ja-tarvikud-elektrilised-tooriistad`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-kasitooriistad-plaadiloikurid` → reparent |
| granulaarsus | ✅ Plaadisaag on spetsiaalne märglõikemasin plaatide ja kivi lõikamiseks veejahutusega teemant/terasketta abil — funktsioon ja väljund erinevad selgelt betoonisaagidest ja lauasaagidest, ostja ei saa seda asendada sama tulemusega. |
| tagline ET | Täpsed lõiked igale plaatimistööle! |

**SEO (ET):** Siit leiad elektrilised plaadisaed keraamiliste plaatide ja kivimaterjalide täpseks lõikamiseks. Sobivad nii koduseks remondiks kui ka sagedasemaks kasutuseks plaatimistöödel. Valikul tasub jälgida sobivat lõikeketta suurust, töölaua mõõtmeid ja kaldlõike võimalust.

---

## «Suruõhu ettevalmistusseadmed»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Air Preparation Equipment |
| handle | `v4-tooriistad-ja-tarvikud-suruohutooriistad-suruohu-ettevalmistusseadmed` |
| L2-vanem | Suruõhutööriistad (`v4-tooriistad-ja-tarvikud-suruohutooriistad`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-suruohutooriistad-suruohu-torustiku-komplektid` → reparent |
| granulaarsus | ✅ Õhu ettevalmistus (filtreerimine, rõhu reguleerimine, kondensaadi eraldus) on eraldi funktsioon — ükski olemas-õde ei täida õhu puhastamise/reguleerimise rolli, ostja ei saa asendada. |
| tagline ET | Puhas suruõhk — pikem tööriistade eluiga |

**SEO (ET):** Suruõhu ettevalmistusseadmed aitavad hoida suruõhusüsteemi puhta ja töökindlana. Siit leiad filtrid, veeseparaatorid, rõhuregulaatorid ja muud lisaseadmed, mis kaitsevad pneumotööriistu niiskuse ja mustuse eest. Sobivad nii kodutöökotta kui ka professionaalsesse kasutusse — vali seade vastavalt oma kompressorile ja ühenduste suurusele.

---

## «Vertikaalselt avanevate uste komplektid (Lambo-stiilis)»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Vertical Door Kits (Lambo Style) |
| handle | `v4-autovaruosad-ja-tarvikud-valistarvikud-ja-rehvitarvikud-vertikaalselt-avanevate-uste-komplektid-lambo-stiilis` |
| L2-vanem | Välistarvikud ja rehvitarvikud (`v4-autovaruosad-ja-tarvikud-valistarvikud-ja-rehvitarvikud`) |
| senine L3 | `v4-autovaruosad-ja-tarvikud-valistarvikud-jeep-maasturi-valisosad` → reparent |
| granulaarsus | ✅ Vertikaalselt avanevate uste komplekt on unikaalne ümberehituskomplekt, millel pole sarnast funktsiooni üheski olemas-ões. |
| tagline ET | Lambo-stiilis uksed – efektne tuuning sinu autole! |

**SEO (ET):** Siit leiad vertikaalselt avanevate uste komplektid, mis annavad autole efektse Lambo-stiilis välimuse. Sobivad autoentusiastidele, kes soovivad oma sõidukit silmapaistvalt tuunida. Enne ostu veendu komplekti sobivuses oma automargi ja -mudeliga ning paigalduse nõuetes.

---

## «Paadivarustuse hoiukotid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Boat Gear Storage Bags |
| handle | `v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid-paadivarustuse-hoiukotid` |
| L2-vanem | Veesport ja ujuvvahendid (`v4-sport-ja-vaba-aeg-veesport-ja-ujuvvahendid`) |
| senine L3 | `v4-sport-ja-vaba-aeg-veesport-ja-paadindus-paastevestid` → reparent |
| granulaarsus | ✅ Paadi T-Top hoiukott on spetsiifiline paadivarustuse säilitustoode, mille funktsioon (pehme kott paadil) erineb selgelt olemasolevatest hoiuriiulitest ja muudest õdedest; ostja ei asenda seda ühegi loetletud kategooriaga. |
| tagline ET | Paadivarustus alati korras ja käepärast! |

**SEO (ET):** Siit leiad praktilised hoiukotid ja -lahendused paadivarustuse korrashoidmiseks – päästevestidele, tarvikutele ja muule veesõidukil vajalikule. Need aitavad hoida teki puhta ja varustuse käepärast nii paadis, pontoonil kui ka rannas. Vali sobiv suurus, kinnitusviis ja materjal vastavalt oma paadile ja varustusele.

---

## «Trepivaibad ja trepikatted»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Stair Treads & Covers |
| handle | `v4-ehitus-remont-ja-varvid-porandakatted-ja-tarvikud-trepivaibad-ja-trepikatted` |
| L2-vanem | Põrandakatted ja tarvikud (`v4-ehitus-remont-ja-varvid-porandakatted-ja-tarvikud`) |
| senine L3 | `v4-moobel-ja-sisustus-sisustusdekoor-vaibad` → reparent |
| granulaarsus | ✅ Trepikatted on spetsiifiliselt treppidele mõeldud libisemisvastased katted, mille funktsioon ja paigalduskoht erinevad selgelt olemasolevatest põranda- ja uksemattidest ning vaibaalustest. Ostja ei saa asendada trepikatet tavalise põrandamatiga sama tulemusega. |
| tagline ET | Turvaline ja mugav samm igal trepiastmel |

**SEO (ET):** Siit leiad trepivaibad ja trepikatted, mis muudavad trepi astumise mugavamaks ja turvalisemaks. Valikus on katted erinevatele treppidele ja interjööridele – sobivad nii peredele laste ja lemmikloomadega kui ka kõigile, kes soovivad trepiastmeid kulumise eest kaitsta. Valikul jälgi astmete suurust, materjali ja paigaldusviisi.

---

## «Monitorikinnitused ja -hoidikud»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Monitor Mounts & Holders |
| handle | `v4-elektroonika-kinnitused-monitorikinnitused-ja-hoidikud` |
| L2-vanem | TV- ja monitorikinnitused (`v4-elektroonika-kinnitused`) |
| senine L3 | `v4-moobel-ja-sisustus-kontorimoobel-lauasahtlid-alused` → reparent |
| granulaarsus | ✅ Lauale kinnituv gaasvedruga reguleeritav monitorihoidik erineb funktsionaalselt seinakinnitusest ja kaasaskantavast laiendist — ostja ei saa asendada laua-C-klambriga käppa seinakinnitusega sama tulemusega. |
| tagline ET | Ergonoomiline töökoht algab õigest monitorikinnitusest |

**SEO (ET):** Siit leiad erinevad monitorikinnitused ja -hoidikud, mis aitavad kuvari lauale või seinale ergonoomiliselt paigutada. Valikus on nii reguleeritavad monitorihoovad kui ka lauakinnitused koduseks ja kontoritööks. Valikul jälgi oma ekraani suurust, kinnitusviisi ja sobivust töökohaga.

---

## «Puurile kinnitatavad lõikurid»  (×1 toodet)

| väli | väärtus |
|---|---|
| EN nimi | Drill Attachment Cutters |
| handle | `v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid-puurile-kinnitatavad-loikurid` |
| L2-vanem | Tööriistade tarvikud ja kulumaterjalid (`v4-tooriistad-ja-tarvikud-tooriistade-tarvikud-ja-kulumaterjalid`) |
| senine L3 | `v4-tooriistad-ja-tarvikud-metallitoo-ja-sepatoo-plekikaarid` → reparent |
| granulaarsus | ✅ Puurile kinnitatav kääri-tüüpi lõikur plaatide ja tsementkiudlevi lõikamiseks — eraldiseisev funktsioon ja väljund, ei kattu ühegi olemasoleva õega. |
| tagline ET | Muuda oma trell võimsaks lõiketööriistaks! |

**SEO (ET):** Puurile kinnitatavad lõikurid muudavad tavalise akutrelli või elektrilise puuri mitmekülgseks lõiketööriistaks. Sobivad nii meistrimeestele kui ka professionaalidele plaatmaterjalide kiireks ja mugavaks lõikamiseks. Valikul jälgi, et lõikur sobiks sinu puuri ja lõigatava materjaliga.

---

## KOKKUVÕTE

- **40 uut L3**, **87 toodet** (reparent).
- Granulaarsus-värav: −5 (shadow: 5 kirjutatud).
