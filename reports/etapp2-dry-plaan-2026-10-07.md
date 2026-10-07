# ETAPP 2 — PLAAN + DRY (midagi EI rakendatud)

> Kuupäev: 2026-10-07 · staging (k33g) · **DRY: 0 DB-kirjet, 0 l3meta-kirjet.**
> Allikas: bidirektsionaalsed paarid (ETAPP 1 jäägist) + 11 tühja-L3.
> Otsustusahel: kohtunik **Opus 4.8** + referents **Sonnet-5** → lahkheli **Fable-5** viigimurdja → 2/3 enamus (praegune kodu = hääl).

## 0. Kulu

| | |
|---|---|
| **Eelhinnang (enne jooksu)** | ~$6–8 (piir $30) |
| **Tegelik kulu** | **$4.69** |
| claude-sonnet-5 | 51 kutset · 114K in / 71K out · $1.41 |
| claude-opus-4-8 | 47 kutset · 91K in / 22K out · $0.99 |
| claude-fable-5 | 24 kutset · 38K in / 38K out · $2.28 |

## 1. Piirireeglid — kokkuvõte

- **Paare kokku:** 36 (24 main-paari + 12 L3-paari), 197 klastrit / 576 toodet.
- **Staatused:** fable-viik: 21 · konsensus: 13 · koik-eri-signaal: 2
- **Tulemus (DRY, EI rakendata):** liiguks **275** toodet · jääks **301** · signaal/puutumata **33**.
- **Reegel kirjutataks L3 kirjeldusse** (l3meta desc, praegu tühi) — kohtunik kasutab seda edaspidi igal ööl (HARD RULE #5: üks reegel, kõik tulevased otsused). _DRY: reeglid arvutatud, EI kirjutatud._

### Näited — main-paaride piirireeglid (8 suurimat)

**garaaziseadmed ja autoremont ↔ tooriistad ja tarvikud** (fable-viik, agr=0, 34 liig / 42 jääb)
> Kategooriasse A ('garaaziseadmed ja autoremont') kuulub toode, mille funktsioon on seotud konkreetselt sõiduki hooldamise, remondi või teenindamisega (pidurid, laagrid/puksid, jõuülekanne, mootoritõstmine, keretööd, autopesu, mehaaniku istmed/rambid) — s.t ostja otsib seda auto all või autoga töötades kasutamiseks. Kategooriasse B ('tööriistad ja tarvikud') kuulub üldotstarbeline töökoja-tööriist või -seade, mida kasutatakse mis tahes materjali/objekti töötlemiseks sõltumata sõidukist (üldpressid, torutangid, värvimisseadmed, üldtõsteseadmed, hoiustamine).
> _Liigutused:_ Laadimisrambid→Autorambid ja kaldteed (6t); Värvimise surveanumad→Värvi-rõhupaagid (5t); Laagri- ja tihendiväljavõtjad ning press-tööriistad→v4-garaaziseadmed-mehaaniku-tooriistad-puksi-ja-laagritooriistad (4t); Laagri- ja tihendiväljavõtjad ning press-tööriistad→Rummu- ja rattanaba väljavõtjad (2t) … +13

**autovaruosad ja tarvikud ↔ garaaziseadmed ja autoremont** (fable-viik, agr=0.41, 14 liig / 26 jääb)
> A-sse kuulub kõik, mis paigaldatakse sõidukile või sõidab sõidukiga kaasa ja mida kasutatakse sõidu/transpordi/tankimise käigus (kütusekanistrid ja teisaldatavad tankimispaagid, haagise- ja kererestid, kinnituskronsteinid, konksule monteeritavad tarvikud, välisosad). B-sse kuulub kõik, mis jääb garaaži/töökotta ja mida kasutatakse sõiduki hooldamiseks, tõstmiseks, remontimiseks või demonteeritud osade hoiustamiseks (tungrauad, hüdropumbad ja -silindrid, hooldusstatiivid, hoiukärud mahavõetud osadele).
> _Liigutused:_ Hüdropumbad ja -mootorid→Pneumaatilised ja membraanpumbad (7t); Hüdrosilindrid→Silindertungrauad (4t); Kütusemahutid ja -konteinerid ratastega→Kütusepaagid ja -mahutid (2t); Mootoritõstukid ja kraanad→Veoauto-kraanad (1t)

**ehitus ja remont ↔ tooriistad ja tarvikud** (konsensus, agr=0.83, 25 liig / 7 jääb)
> A ('ehitus ja remont') hõlmab püsivaid ehitus- ja paigaldusmaterjale ning hooneosi (nt piirdetrossid, kipsplaaditöö abivahendid), mille ostja otsib ehitusprojekti või renoveerimise jaoks. B ('tööriistad ja tarvikud') hõlmab korduvkasutatavaid seadmeid, masinate lisaseadmeid ja tõste-/käitlustarvikuid (nt kahveltõstuki pikendid, tõsteraami postid, konteineri tungrauad), mida ostja otsib töövahendina, mitte hoone osaks.
> _Liigutused:_ Terastrossid→Kaabel- ja trosspiirded (11t); Pallikahvlid ja kahvlid→Kahveltõstuki lisaseadmed (10t); Toestuspostid ja tungrauad→Posti eemaldajad (2t); Terastrossid→Kaabel- ja trosspiirded (1t) … +1

**kodumasinad ja kodutehnika ↔ suurkoogiseadmed** (fable-viik, agr=0.79, 6 liig / 25 jääb)
> Kategooriasse A (kodumasinad ja kodutehnika) kuuluvad seadmed ja tarvikud, mida eraisik kasutab kodus pere mahus toidu valmistamiseks — ostja otsib neid oma köögi jaoks (nt leti-blender, kodune jäämasin, pitsaahi, valamuvõre). Kategooriasse B (suurköögiseadmed) kuuluvad tooted, mille maht, jõudlus või otstarve on mõeldud toitlustusele/müügile — professionaalsed suuremahulised töötlusseadmed (6L+ anumad, kilodes tunnikoormus, vorstitootmine) ning HoReCa-tarbed nagu kaasamüügipakendid.
> _Liigutused:_ Köögikombainid ja toiduprotsessorid→Toiduprotsessorid (4t); Baristatarvikud ja espressotarvikud→Teraviljaveskid ja -jahvatajad (1t); Kommertsjäämasinad→Jäämasinad (1t)

**autovaruosad ja tarvikud ↔ tooriistad ja tarvikud** (konsensus, agr=0.85, 6 liig / 24 jääb)
> A (autovaruosad ja tarvikud) alla kuuluvad tooted, mille peamine otstarve on sõiduki/haagise koorma kinnitamine, pukseerimine või taastamine (kinnituskettid, pukseeri- ja taasterihmad, rataste/telgede kinnitusrihmad, paadivintsid). B (tööriistad ja tarvikud) alla kuuluvad üldkasutatavad töö- ja hüdrotööriistad ning universaalsed vintsid/puldid, mida kasutatakse tõstmiseks, pingutamiseks või hüdrosüsteemide hoolduseks, mitte konkreetselt sõiduki koorma fikseerimiseks.
> _Liigutused:_ Koormarihmad→Rataste kinnitusrihmad ja -kiilud (3t); Hüdropumbad ja -mootorid→Hüdraulilised pressimistööriistad (1t); Koormarihmad→Rataste kinnitusrihmad ja -kiilud (1t); Hüdroagregaadid→v4-tooriistad-ja-tarvikud-hudraulika-agregaadid (1t)

**peoinventar ja dekoratsioonid ↔ sport ja vaba aeg** (fable-viik, agr=0.67, 14 liig / 13 jääb)
> A-sse kuulub toode, mille esmane otstarve on ürituse või peo korraldamine ja külaliste meelelahutus kogunemiskohas: peomööbel ja -lauad, dekoratsioonid ning seltskonna- ja joogimängud, mida ostetakse peo tarbeks. B-sse kuulub toode, mille esmane otstarve on füüsiline aktiivsus, sportlik õuemäng või spordi/vaba aja tegevuses osalemine ja pealtvaatamine (sh matka-, staadioni- ja aktiivse liikumise varustus).
> _Liigutused:_ Staadioni istmed ja toolid→Staadionitoolid (7t); Matkalauad ja köögijaamad→Kokkupandavad peolauad (3t); Peomängud→Muru- ja õuemängud (2t); Peomängud→Muru- ja õuemängud (2t)

**aed ja aiatehnika ↔ ehitus ja remont** (fable-viik, agr=0.67, 19 liig / 3 jääb)
> A-sse ('aed ja aiatehnika') kuuluvad kõik tooted, mida kasutatakse krundi, aia, metsa ja maapinna hooldamiseks ning sealseteks töödeks — sh traktorite ja aiatehnika lisaseadmed, metsatöö- ja palgitõsteriistad ning hoovi/sissesõidutee hooldus- ja tähistusvahendid, mida ostja otsib aiatehnika alt. B-sse ('ehitus ja remont') kuuluvad tooted, mille otstarve on hoonete või rajatiste ehitamine, remontimine, viimistlemine või ehituslik mõõdistamine/mahamärkimine (ehitusplatsi ja konstruktsioonide kontekst).
> _Liigutused:_ Greiferid ja haaratsid→Palkide tõsteriistad ja konksud (10t); Tee- ja sõidutee märgistused→Mõõdistus- ja markeerimisvaiad (9t)

**aed ja aiatehnika ↔ tooriistad ja tarvikud** (fable-viik, agr=0.33, 14 liig / 8 jääb)
> A-sse ('aed ja aiatehnika') kuulub toode, mille püsiv otstarve on aia, muru, õueala või basseini hooldamine ja korrashoid – ostja otsib seda aia/õue kontekstis (nt muruhooldus, basseinihooldus, õue koristus). B-sse ('tooriistad ja tarvikud') kuulub toode, mis on üldotstarbeline töö- või käsitööriist või avarii-/kaitsetarvik konkreetse töö või tõrje teostamiseks sõltumata asukohast (nt postitõmbur, lekke- ja üleujutustõrje) – ostja otsib seda tööülesande, mitte aiaruumi järgi.
> _Liigutused:_ Üleujutuskaitse kotid ja barjäärid→Lekke- ja üleujutustõrje (6t); Üleujutuskaitse kotid ja barjäärid→Lekke- ja üleujutustõrje (4t); Vaibapuhastusmasinad→Muruharjad ja pühkijad (4t)


### Näited — L3-paaride piirireeglid (6 suurimat)

**Astmelauad ja astmed ↔ Astmelauad ja astmepukid** (fable-viik, agr=0.5, 15 liig / 0 jääb)
> A-sse kuuluvad sõiduki külgedele püsivalt paigaldatavad astmelauad ja külgastmed (running boards, step bars), mille otstarve on hõlbustada salongi sisenemist ja väljumist. B-sse kuuluvad eemaldatavad või haakeseadmesse (hitch/receiver) kinnituvad astmepukid ja tagaastmed, mille otstarve on ligipääs sõiduki tagaosale/kastile või tagakaitseraua kaitse.
> _Liigutused:_ Astmelauad ja astmed→Astmelauad ja astmepukid (11t); Astmelauad ja astmepukid→Astmelauad ja astmed (4t)

**Kütusepaagid ja -mahutid ↔ Kütusemahutid ja -konteinerid ratastega** (konsensus, agr=1, 2 liig / 12 jääb)
> A-sse kuuluvad statsionaarsed või kaasaskantavad kütusepaagid ja -mahutid ilma ratasteta (sh pumbaga ülekandepaagid, mida liigutatakse käsitsi/tõstes). B-sse kuuluvad ainult need kütusemahutid, millel on integreeritud rattad või käru mobiilseks veeretamiseks.
> _Liigutused:_ Kütusemahutid ja -konteinerid ratastega→Kütusepaagid ja -mahutid (2t)

**Laste trummikomplektid ↔ Trummikomplektid ja -tarvikud** (fable-viik, agr=0.5, 13 liig / 0 jääb)
> A-sse ('Laste trummikomplektid') kuuluvad ainult vähendatud mõõduga junior-/algaja komplektid, mis on mõeldud spetsiaalselt lastele (basstrumm tüüpiliselt ≤16 tolli, tootekirjelduses 'Kids'/'Junior' kui ainus sihtrühm). B-sse ('Trummikomplektid ja -tarvikud') kuuluvad täismõõdus (täiskasvanu) komplektid, kõik tarvikud ning segaklastrid, mis sisaldavad ka täiskasvanu täismõõdus variante — sest ostja, kes otsib täismõõdus komplekti, otsib üldkategooriast.
> _Liigutused:_ Laste trummikomplektid→Trummikomplektid ja -tarvikud (9t); Trummikomplektid ja -tarvikud→Laste trummikomplektid (4t)

**Betoonisilurid ja -hõõrutid ↔ Betoonitööriistad** (fable-viik, agr=0.33, 12 liig / 0 jääb)
> A-sse ('Betoonisilurid ja -hõõrutid') kuuluvad tööriistad, millega VIIMISTLETAKSE ja hõõrutakse juba tasandatud värsket betoonipinda siledaks (hõõrutid/float'id, bull float'id, silumiskellud). B-sse ('Betoonitööriistad') kuuluvad kõik muud betoonitöö etappide tööriistad, sh toorbetooni esmane mahatõmbamine ja loodimine tasanduslattidega (screed-lauad ja -terad), samuti segamise, vormimise jm abivahendid.
> _Liigutused:_ Betoonisilurid ja -hõõrutid→Betoonitööriistad (7t); Betoonitööriistad→Betoonisilurid ja -hõõrutid (3t); Betoonisilurid ja -hõõrutid→Betoonitööriistad (2t)

**Põranda-, torni- ja kaasaskantavad ventilaatorid ↔ Tööstuslikud ventilaatorid** (fable-viik, agr=0.5, 10 liig / 2 jääb)
> A-sse kuuluvad kodu- ja kontorikasutuseks mõeldud ventilaatorid, mida ostja otsib ruumi mugavusjahutuseks: reguleeritava kõrgusega jalg- (pedestal), torni- ja teisaldatavad põrandaventilaatorid, millel on tüüpiliselt ostsilleerimine ja mõõdukas õhuvool. B-sse kuuluvad töökoja-, lao- ja tootmisruumide õhuliigutamiseks mõeldud suure jõudlusega ventilaatorid: trummel- (drum/shop) ja muud heavy-duty seadmed, mille põhiomadus on väga suur õhuvool (tuhanded CFM-id) ja vastupidav tööstuslik konstruktsioon, mitte mugavusfunktsioonid.
> _Liigutused:_ Tööstuslikud ventilaatorid→Põranda-, torni- ja kaasaskantavad ventilaatorid (5t); Põranda-, torni- ja kaasaskantavad ventilaatorid→Tööstuslikud ventilaatorid (4t); Tööstuslikud ventilaatorid→Põranda-, torni- ja kaasaskantavad ventilaatorid (1t)

**Hüdroagregaadid ↔ Hüdropumbad ja -mootorid** (konsensus, agr=1, 3 liig / 8 jääb)
> A = Hüdroagregaadid (power unit / power pack) ehk terviklik hüdrosüsteem, kus pump, mootor, paak ja juhtventiilid on üheks agregaadiks koondatud ja müüakse komplektina. B = üksikud hüdrokomponendid — eraldi pump või mootor ilma paagi/juhtimiseta.
> _Liigutused:_ Hüdropumbad ja -mootorid→Hüdroagregaadid (2t); Hüdropumbad ja -mootorid→Hüdroagregaadid (1t)


### Kõik 24 main-paari

| Paar (A ↔ B) | kl | tooteid | agr | staatus | keep | move | signal |
|---|--:|--:|--:|---|--:|--:|--:|
| **garaaziseadmed ja autoremont** ↔ **tooriistad ja tarvikud** | 32 | 76 | 0 | fable-viik | 42 | 34 | 0 |
| **autovaruosad ja tarvikud** ↔ **garaaziseadmed ja autoremont** | 17 | 40 | 0.41 | fable-viik | 26 | 14 | 0 |
| **ehitus ja remont** ↔ **tooriistad ja tarvikud** | 6 | 32 | 0.83 | konsensus | 7 | 25 | 0 |
| **kodumasinad ja kodutehnika** ↔ **suurkoogiseadmed** | 14 | 31 | 0.79 | fable-viik | 25 | 6 | 0 |
| **autovaruosad ja tarvikud** ↔ **tooriistad ja tarvikud** | 13 | 30 | 0.85 | konsensus | 24 | 6 | 0 |
| **peoinventar ja dekoratsioonid** ↔ **sport ja vaba aeg** | 6 | 27 | 0.67 | fable-viik | 13 | 14 | 0 |
| **aed ja aiatehnika** ↔ **ehitus ja remont** | 3 | 22 | 0.67 | fable-viik | 3 | 19 | 0 |
| **aed ja aiatehnika** ↔ **tooriistad ja tarvikud** | 6 | 22 | 0.33 | fable-viik | 8 | 14 | 0 |
| **lastekaubad ja manguasjad** ↔ **sport ja vaba aeg** | 5 | 19 | 0.2 | fable-viik | 0 | 19 | 0 |
| **autovaruosad ja tarvikud** ↔ **sport ja vaba aeg** | 11 | 19 | 0 | fable-viik | 19 | 0 | 0 |
| **Mööbel ja sisustus** ↔ **Tervis, hooldus ja ilu** | 5 | 18 | 0.6 | fable-viik | 18 | 0 | 0 |
| **lastekaubad ja manguasjad** ↔ **muusika ja helitehnika** | 3 | 17 | 0.33 | koik-eri-signaal | 17 | 0 | 17 |
| **aed ja aiatehnika** ↔ **peoinventar ja dekoratsioonid** | 4 | 17 | 1 | konsensus | 5 | 12 | 0 |
| **lastekaubad ja manguasjad** ↔ **Mööbel ja sisustus** | 3 | 11 | 0.67 | fable-viik | 1 | 10 | 0 |
| **kodumasinad ja kodutehnika** ↔ **santehnika kute ja ventilatsioon** | 3 | 11 | 1 | konsensus | 11 | 0 | 0 |
| **santehnika kute ja ventilatsioon** ↔ **suurkoogiseadmed** | 4 | 10 | 1 | konsensus | 5 | 5 | 0 |
| **buroo ja kontoritarvikud** ↔ **ladu hoiustamine ja pakendamine** | 4 | 9 | 0.25 | fable-viik | 1 | 8 | 0 |
| **ladu hoiustamine ja pakendamine** ↔ **tooriistad ja tarvikud** | 5 | 9 | 0.6 | fable-viik | 5 | 4 | 0 |
| **tooriied ja isikukaitse** ↔ **tooriistad ja tarvikud** | 3 | 9 | 0.33 | fable-viik | 7 | 2 | 0 |
| **aed ja aiatehnika** ↔ **suurkoogiseadmed** | 4 | 7 | 0.5 | fable-viik | 7 | 0 | 0 |
| **sport ja vaba aeg** ↔ **telgid varjualused ja kasvuhooned** | 3 | 6 | 1 | konsensus | 2 | 4 | 0 |
| **Mööbel ja sisustus** ↔ **sport ja vaba aeg** | 2 | 3 | 1 | konsensus | 2 | 1 | 0 |
| **santehnika kute ja ventilatsioon** ↔ **tooriistad ja tarvikud** | 2 | 3 | 1 | konsensus | 3 | 0 | 0 |
| **aed ja aiatehnika** ↔ **sport ja vaba aeg** | 2 | 2 | 1 | konsensus | 0 | 2 | 0 |


### Kõik 12 L3-paari

| Paar (A ↔ B) | kl | tooteid | agr | staatus | keep | move | signal |
|---|--:|--:|--:|---|--:|--:|--:|
| **Mootorratta tõstukid** ↔ **Mootorratta- ja muruniidukitõstukid** | 4 | 16 | 0.5 | koik-eri-signaal | 16 | 0 | 16 |
| **Astmelauad ja astmed** ↔ **Astmelauad ja astmepukid** | 2 | 15 | 0.5 | fable-viik | 0 | 15 | 0 |
| **Kütusepaagid ja -mahutid** ↔ **Kütusemahutid ja -konteinerid ratastega** | 5 | 14 | 1 | konsensus | 12 | 2 | 0 |
| **Laste trummikomplektid** ↔ **Trummikomplektid ja -tarvikud** | 2 | 13 | 0.5 | fable-viik | 0 | 13 | 0 |
| **Betoonisilurid ja -hõõrutid** ↔ **Betoonitööriistad** | 3 | 12 | 0.33 | fable-viik | 0 | 12 | 0 |
| **Põranda-, torni- ja kaasaskantavad ventilaatorid** ↔ **Tööstuslikud ventilaatorid** | 4 | 12 | 0.5 | fable-viik | 2 | 10 | 0 |
| **Hüdroagregaadid** ↔ **Hüdropumbad ja -mootorid** | 3 | 11 | 1 | konsensus | 8 | 3 | 0 |
| **Üleujutuskaitse kotid ja barjäärid** ↔ **Lekke- ja üleujutustõrje** | 3 | 11 | 1 | konsensus | 10 | 1 | 0 |
| **Ekspositsioonistendid ja display** ↔ **Seinapaneelid ja pegboardid** | 2 | 8 | 0.5 | fable-viik | 0 | 8 | 0 |
| **Käsivintsid** ↔ **Vintsid** | 5 | 7 | 0.8 | konsensus | 2 | 5 | 0 |
| **Augusaed ja kroonsaed** ↔ **Teemantpuurkroonid ja südamikpuurid** | 2 | 4 | 0.5 | fable-viik | 0 | 4 | 0 |
| **Laagri- ja tihendiväljavõtjad ning press-tööriistad** ↔ **Rummu- ja rattanaba väljavõtjad** | 2 | 3 | 0.5 | fable-viik | 0 | 3 | 0 |


## 2. 11 tühja L3 — otsused (ahel, konsensus)

Kokku: **2 duplikaat** (eemaldada + 301) · **9 standalone** (jätta, ristkuvamine Outleti mustril).

| Tühi L3 | Vanem-L2 | Otsus | Sihtkategooria (duplikaat) | Staatus | Põhjus |
|---|---|---|---|---|---|
| Rehvivahetusseadmed ja -vahetid | Rehvitööd | **standalone** | — | fable-viik | Rehvivahetusseadmed (rehvivahetuspingid/-masinad) on eraldiseisev seadmetüüp, mida klient otsiks omaette. Õe-kategooria 'Rehvivahetuse tööriistakomplektid' katab käsitööriistu, mitte masinaid, seega funktsionaalset duplikaati ei ole. |
| Joonte märgistusmasinad | Viimistlustööriistad | **standalone** | — | konsensus | Joonte märgistusmasinad (põranda-/teejoonte värvimine) on eraldi ehitustööriist; nimesarnane etiketimasin on hoopis teine kasutus. |
| Keermestusmasinad | Metallitöö ja sepatöö | **standalone** | — | konsensus | Keermestusmasinad on eraldiseisev metallitöö masinaliik, õekategooriates pole sama tüüpi sihtkategooriat. |
| Kaalud ja mõõtevahendid | Nõud ja serveerimine | **standalone** | — | konsensus | Köögikaalud ja mõõtevahendid on eraldiseisev funktsioon, mille jaoks õe- ega sarnaste kategooriate seas pole dubleerivat sihtkategooriat; meditsiinilised kaalud on erineva kasutusega. |
| Saunatarvikud | Saun | **standalone** | — | konsensus | Saunatarvikud on eraldiseisev üldkategooria saunatarvetele, ei dubleeri ühtegi olemasolevat spetsiifilist kategooriat (ahjud, generaatorid, saunad). |
| Kuivatuspuhurid | Ventilatsioon ja ventilaatorid | **standalone** | — | konsensus | Kuivatuspuhurid (ehituskuivatuseks mõeldud puhurid) on eraldiseisev tooteliik, mis ei kattu õhukuivatite ega ventilaatoritega. |
| Kanal- ja renn-äravool | Äravool ja põrandatrapid | **duplicate** | v4-santehnika-kute-ja-ventilatsioon-lineaarsed-dusitrapid | konsensus | Kanal- ja renn-äravool on sama funktsioon mis lineaarsed dušitrapid - vee äravool renni kaudu. |
| Komposti tarvikud | Aiatööriistad | **standalone** | — | konsensus | Komposti tarvikud on omaette kasutusega kategooria, millele puudub olemasolev sihtkategooria; ükski nime-sarnane ei kata kompostimist. |
| Katete ja tarpide tarvikud | Varikatused ja pergolad | **standalone** | — | konsensus | Katete ja tarpide tarvikud on spetsiifiline varikatuste/pergolade alamkategooria, ükski nime-sarnane sihtkategooria ei kata sama funktsiooni. |
| Tüübliliite puurimisšabloonid | Puidutöö tööriistad | **standalone** | — | konsensus | Tüübliliite (dowel joint) puurimisšabloonid on eraldi liitetüüp, erinev taskuaukude ja mööblifurnituuri šabloonidest; klient otsib seda omaette. |
| Kiikautud | Õuemänguasjad ja mänguväljak | **duplicate** | v4-sport-ja-vaba-aeg-manguasjad-lastele-kiiged-ja-kiikhobud | konsensus | Kiikautod on sisuliselt kiikumismänguasjad, mis sobivad olemasoleva Kiiged ja kiikhobud kategooria alla. |

**Rakendusmuster (ei rakenda nüüd):**
- **duplicate** → L3 struktuurist eemaldada + **301** sihtkategooriale. Struktuurimuutus → täis-4-sammu deploy (SSoT-regen + push + redeploy).
- **standalone** → jätta alles; tooted **ristkuvamisega** (Outlet: kodu + lisa-vaade), EI dubleeri andmeid.

## 3. Rakenduseelsed väravad (kui ETAPP 2 hiljem EXECUTE)

1. Piirireegel → l3meta `description` (mõlemad paari L3-d).
2. Toote-liigutused → `etapp1-move-execute.mjs` muster (batch_id, undo, review_decision_log actor=`claude-code-test`).
3. Ainult lingid liiguvad (struktuur muutumatu) → **AINULT Meili reindeks**. Tühja-L3 eemaldamine (duplicate) → **täis-4-sammu**.
4. inv-taxonomy + lock-harness POST + Telegram + undo.

## 4. PLAAN (koodita) — kas KÕIK ülejäänud L3-d peaksid saama automaatse kirjelduse?

**Praegu:** L3 `description` on valdavalt tühi. Täidetud saaks AINULT paari-L3-d (see etapp). Küsimus: kas generaatorida kirjeldus KÕIGILE ~1684 L3-le?

**Kasu:**
- **Tüübi-profiil = SSoT** (CLAUDE.md feed-põhimõte): L3 desc = "mis TÜÜP siia kuulub (otstarve+tunnus)" → öine klassifikaator + feed-mapping loeb seda, mitte nime → masintõlke-immuunsus + deterministlik paigutus.
- **SEO**: kategooria-tekst (HARD RULE SEO: kirjeldab kogu kategooriat, 0 konkreetset numbrit/lubadust).
- **Piirireeglid** (see etapp) on erijuht: ainult naaber-paaridele. Täiskate = iga L3 teab oma tüübi-piiri.

**Kulu (eelhinnang):**
- ~1684 L3 × (Opus+Sonnet konsensus, ~$0.012/L3) ≈ **~$20** ühekordne backfill; Fable-viigid +~30% → **~$26**.
- Odavam variant: **ainult Opus, 1 kutse/L3** (desc-generaator pole viigi-tundlik nagu paigutus) ≈ **~$10**. SEO-värav (`seoClaimGate`) + nime-reegel juba olemas → valideerimine tasuta.
- **Hook (HARD RULE #5):** uus L3 (öine auto-create) saab desc SAMAST transformist → backfill + hook, delta-peal.

**Soovitus:** **JAH, aga 2 lainet.** (1) see etapp: paari-L3 piirireeglid (täpne, kallis-väärt). (2) eraldi backfill: ülejäänud L3 tüübi-profiil **ainult-Opus generaatoriga (~$10)** + SEO/nime-värav + hook uutele. **Põhjus:** tühi L3-desc = klassifikaator loeb nime (nõrgim signaal) → feed-kasvul triiv. Täidetud profiil = HARD RULE #5/#6 kooskõla (masin loeb reeglit, mitte nime).

---
_DRY lõpp. Rakendamiseks: eraldi EXECUTE-käsk. Kõik arvud on simulatsioon audit-otsustest + ahela piirireeglitest._
