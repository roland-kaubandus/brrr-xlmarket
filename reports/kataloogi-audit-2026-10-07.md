# Kataloogi täis-audit — 2026-10-07

> **Kellele:** Tarmo (poe strateeg/omanik). **Režiim:** TRUU täisahel (kohtunik Opus-4.8 → referents Sonnet-5 pime → viigimurdja Fable-5), **AINULT DRY — ühtegi DB-muudatust ei tehtud.** Kulupiir $210, tegelik kulu **$194.27**.
> **Otsuste-fail (taaskasutus execute'is, ilma uute API-kutseteta):** `reports/audit-full-decisions-2026-10-07.json` (5225 kirjet, iga kirje: kohtunik + referents + Fable + lõppotsus + ahela-tee).

---

## Kokkuvõte

| Mõõdik | Väärtus |
|---|--:|
| Klastreid kokku (currentL3-ga) | **5225** |
| **Lõplik kohtuniku-katvus** | **5225 / 5225 (100%)** |
| Põhijooks ahelas | 5156 / 5225 (98.7%) |
| Täiendav partii (auk täidetud) | +54 (49 puudu + 5 parandatud) |
| Ahela-vigu | **0** |
| Referents-katvus (sisend=väljund) | **5225 / 5225 ✓** |
| Fable viigimurdjat kasutati | 969 klastril (~18.5%) |
| nonChain/keep (ahelasse ei läinud) | 69 |
| **Leide kokku** | **582** (1636 toodet) |
| — liiguta (move) | 530 (1502 toodet) |
| — uus-L3 shadow | 52 (134 toodet) |
| — neist cross-main | 252 klastrit (723 toodet) |
| — neist garden | 54 klastrit (163 toodet) |
| Kattuvusi (overlaps) | 100 paari |
| **Kulu** | **$194.27** (piir $210) |

**NB:** kõik 582 leidu on DRY-ETTEPANEKUD. Midagi ei ole veel poodi rakendatud. Rakendamine (execute) toimub eraldi otsuste-failist, ilma uute kohtuniku-kutseteta.

---

## 🛑 CRITICAL / BLOCKER

### [PARANDATUD] Vaikne otsuste-kadu kohtuniku-batchis (HARD RULE #5 rikkumine)

Sinu 47-klastri küsimus avas **süsteemse vaikse kao**, mis puudutas **nii auditit kui öist [4] hook'i**:

- **Põhjus 1 — kärbe:** 1 chunk (j84, 40 klastrit) lõikas `max_tokens` (14000) peale → kogu chunk kadus parsimisel.
- **Põhjus 2 — mudel-väljajätted:** ~9 klastrit üle 7 chunk'i jäid kohtuniku vastusest lihtsalt välja.
- **Põhjus 3 — fantoom-võtmed:** j100 tagastas 42/40 → 2 hallutsineeritud võtit (spu:07513, spu:07548) + 1 võõras võti (spu:07547, kuulus j18-le), mis **kirjutas üle** teise chunk'i päris otsuse (last-wins Map).
- **Põhjus 4 — chunk-sisesed dup-konfliktid:** 4 klastril (spu:17284 / 00684 / 11663 / 10573) andis mudel 2 rida sama võtmega → Map võttis vaikselt viimase.

**Miks CRITICAL:** öine hook kasutas sama koodi → iga öö oleks osa uusi tooteid saanud **vaikselt "otsuseta"** (kodutuks jäänud = otsingus/kategoorias puudu = praktikas müügil olematud), ilma ühegi hoiatuseta. Täpselt see muster, mille vastu HARD RULE #5 (fail-loud) on kirjutatud.

**Parandus (SSoT, commit — vt lõpp):** `scripts/lib/judge.mjs` kolm uut funktsiooni, mida kasutavad **nii audit kui öine hook** (üks transform, kaks kutsujat):
- `ingestClusterResults` — väljundi võtmed **peavad** võrduma sisendi võtmetega; võõras võti → ei ingestita + loendur; dup → säilita **esimene** + liputa konflikt (mitte last-wins).
- `resolveJudgeBatch` (batch-tee, audit) / `resolveClustersSyncVerified` (sünkr-tee, öine hook) — puuduv VÕI `max_tokens` → **rekursiivne chunk-poolitamine** (max 3 taset), siis fail-loud.
- Öises hook'is: hindamata klaster → **PENDING + Telegram-loendur** (re-proov järgmisel ööl), **mitte vaikne kadu**.

**Tõestus, et auk EI olnud kahjutu:** täiendav partii taastas **8 päris-leidu** (varem kaotatud), sh 2 dup-konflikti-parandust, mis olid tegelikud liigutused:
- spu:17284 (4 toodet): *Basseini äravooluvoolikud* → **Survepesuri voolikud ja otsakud**
- spu:00684 (3 toodet): *Kontoritoolid* → **Taburetid ja töötoolid ratastega**

Fantoom-ülekirjutus spu:07547 (6 toodet) kontrolliti: mõju **madal** — nii j18 õige otsus kui fantoom viisid "jääb paigale" (Hüdraulilised mulgustustööriistad). Kadu polnud siin sisuline, aga muster oli ohtlik.

---

## ✅ VAJA ÄRA TEHA — 582 kategooria-paranduse ettepanekut (DRY)

> HARD RULE #2: siin ei ole "low/medium". Kõik alljärgnev on "vaja ära teha" — prioriteet tootearvu järgi. Rakendamise otsustad sina; masin suudab execute'ida otsuste-failist.

### Cross-main liigutused (lähtemain → sihtmain) — 252 klastrit / 723 toodet

Suurimad vood (täisnimekiri all data-failis):

| Lähtemain → Sihtmain | Klastreid | Tooteid |
|---|--:|--:|
| Garaažiseadmed ja autoremont → Tööriistad ja tarvikud | 15 | 38 |
| Tööriistad ja tarvikud → Garaažiseadmed ja autoremont | 16 | 34 |
| Autovaruosad ja -tarvikud → Garaažiseadmed ja autoremont | 11 | 32 |
| Reklaami-, trüki- ja graveerimisseadmed → Tööriistad ja tarvikud | 9 | 27 |
| Tööriistad ja tarvikud → Sport ja vaba aeg | 2 | 23 |
| Ehitus ja remont → Aed ja aiatehnika | 2 | 19 |
| Peoinventar ja dekoratsioonid → Sport ja vaba aeg | 4 | 19 |
| Kodumasinad ja kodutehnika → Suurköögiseadmed | 10 | 19 |
| Ehitus ja remont → Tööriistad ja tarvikud | 3 | 18 |
| Mööbel ja sisustus → Tervis, hooldus ja ilu | 4 | 17 |
| Tööriistad ja tarvikud → Autovaruosad ja -tarvikud | 8 | 17 |
| Lastekaubad ja mänguasjad → Sport ja vaba aeg | 4 | 17 |

**Muster:** suurim segadus on **Tööriistad ↔ Garaažiseadmed ↔ Autovaruosad** kolmnurgas (autoremondi vs üldtööriista piir) ja **Reklaami-/graveerimisseadmed → Tööriistad** (lineaarjuhikud, CNC-komponendid tootja-kataloogist valesse maini). Täisnimekiri (104 vooguma) data-failis.

### Intra-main liigutused (sama main, õigem L3) — 271 klastrit / 758 toodet

| Main | Klastreid | Tooteid |
|---|--:|--:|
| Tööriistad ja tarvikud | 64 | 165 |
| Mööbel ja sisustus | 29 | 102 |
| Sport ja vaba aeg | 31 | 85 |
| Autovaruosad ja -tarvikud | 23 | 67 |
| Aed ja aiatehnika | 24 | 50 |
| Santehnika, küte ja ventilatsioon | 12 | 45 |
| Garaažiseadmed ja autoremont | 15 | 40 |
| Lastekaubad ja mänguasjad | 10 | 36 |
| (ülejäänud 15 maini) | … | … |

### Suurimad üksik-leiud (top 15 tootearvu järgi)

| Tooteid | Tüüp | Praegu | Pakutud | Cross |
|--:|---|---|---|:-:|
| 17 | move | Tööriistad / Joonte märgistusmasinad | Sport / Väljakumärgistajad | ✓ |
| 13 | move | Santehnika / Kanal- ja renn-äravool | Santehnika / Lineaarsed dušitrapid | |
| 13 | move | Reklaamiseadmed / Lineaarjuhikud ja liikumissüsteemid | Tööriistad / Lineaarjuhikud | ✓ |
| 13 | move | Mööbel / Peeglid | Tervis, hooldus ja ilu / Meigipeeglid | ✓ |
| 13 | move | Mööbel / TV-alused | Mööbel / Raamaturiiulid | |
| 12 | new_l3 | Mööbel / Kott-toolid | **Põrandatoolid** | |
| 11 | move | Tööriistad / Terastrossid | Ehitus / Kaabel- ja trosspiirded | ✓ |
| 11 | move | Ehitus / Kääriturvaväravad | Ehitus / Turvavõred ja kokkupandavad väravad | |
| 11 | move | Sport / Rebounderid | Sport / Jalgpalli viske- ja treeningvõrgud | |
| 11 | move | Meditsiin / Vannitoa ülekandeabivahendid | Meditsiin / Dušitoolid ja -pingid | |
| 11 | move | Põllumajandus / Mullaharimine | Aed / Murutasandusrehad | ✓ |
| 11 | new_l3 | Aed / Basseinikatted | **Mullivanni katted** | |
| 10 | move | Ehitus / Greiferid ja haaratsid | Aed / Palkide tõsteriistad ja konksud | ✓ |
| 10 | move | Ehitus / Pallikahvlid | Tööriistad / Kahveltõstuki lisaseadmed | ✓ |
| 10 | new_l3 | Mööbel / Vaibad | **Vaipplaadid** | |

---

## 🌱 Garden-tooted (aed ja aiatehnika) — 54 klastrit / 163 toodet

| Voog | Klastreid | Tooteid |
|---|--:|--:|
| Aed → Aed (sama main, õigem L3) | 24 | 50 |
| Ehitus ja remont → Aed | 2 | 19 |
| Peoinventar → Aed | 3 | 13 |
| Põllumajandus → Aed | 2 | 12 |
| Aed → Tööriistad | 2 | 10 |
| Tööriistad → Aed | 3 | 8 |
| Suurköögiseadmed → Aed (väligrillid/-köök) | 3 | 6 |
| (ülejäänud väiksemad vood) | 15 | 45 |

Suurim aia-sissevool: **Ehitus → Aed** (katusepaneelid/kasvuhoone-elemendid) ja **Põllumajandus → Aed** (mullafreesid, kultivaatorid — ostja otsib aiatehnikast).

---

## 🆕 Uus-L3 shadow-kandidaadid — 52 tüüpi / 134 toodet

> Need on **SHADOW** (VARIANT 1 "shadow enne" režiim): masin läbis kõik väravad ja logis "oleks loonud", **AGA EI loonud**. Inimene/auto-üleminek otsustab, kas luua. Top tootearvu järgi:

| Pakutud L3 nimi | Tooteid | Näidis |
|---|--:|---|
| Põrandatoolid | 12 | Floor Chair, 5 Adjustable Positions Folding |
| Mullivanni katted | 11+2 | Outdoor Hot Tub Cover 90×90×20in |
| Vaipplaadid | 10 | Carpet Tiles Peel and Stick 18″×18″ |
| Aktiivse istumise istmed | 8 | Wobble Chair, Height-Adjustable |
| Raskustekid | 5 | Weighted Blanket, 25 lbs King Size |
| Kasvuhoone ventilaatorid | 5 | Solar Powered Fan 15W |
| Põlvitustoolid | 5 | Ergonomic Kneeling Chair |
| Metallkatuseplaadid | 4 | Metal Roof Panels, galvanized steel |
| Kokkupandavad külalisvoodid | 4 | Rollaway Bed 38×75in |
| Jalamassöörid ja -stimulaatorid | 4 | Foot Circulation Stimulator EMS/TENS |
| Mootorfreesid ja kultivaatorid | 3 | Tiller Cultivator Gas 43CC |
| Põlvekäimistoed (põlveskuutrid) | 3 | Folding Knee Scooter |
| Hoiusahtlikapid | 3 | Plastic Storage Drawers Cart 4 Drawers |
| Jalgratta transpordikotid ja -kohvrid | 3 | Triathlon Bike Travel Bag |
| Külmkohvi süsteemid (nitro cold brew) | 3 | Nitro Cold Brew Coffee Maker 0.5L |
| (ülejäänud 37 tüüpi, 1–2 toodet igaüks) | ~55 | vt data-fail |

**Tähelepanek:** mitu kandidaati on **meditsiini/ergonoomika-istmed** (vereproovitoolid, infusioonitoolid, dušitoolid) ja **aktiivistmed** (wobble/kneeling/floor) — kui need kokku grupeerida, võib tekkida laiem "Ergonoomilised/teraapiatoolid" muster. Täisnimekiri (52) data-failis.

---

## 🔁 Kattuvused (overlaps) — 100 paari

Mõlemasuunalised vood = mainide-piir on sisuliselt hägune ja vajab reeglit (mitte ükshaaval liigutamist):

| Paar | Klastreid | Tooteid |
|---|--:|--:|
| Garaažiseadmed ↔ Tööriistad | 15+16 | 72 |
| Autovaruosad → Garaažiseadmed | 11 | 32 |
| Reklaamiseadmed → Tööriistad | 9 | 27 |
| Kodumasinad → Suurköögiseadmed | 10 | 19 |
| Mööbel → Tervis, hooldus ja ilu | 4 | 17 |
| Mööbel → Ladu | 5 | 15 |
| Meditsiin → Santehnika | 5 | 14 |

**Soovitus:** suurimad kahesuunalised (Garaaž↔Tööriist, Auto→Garaaž) väärivad **domeeni-reeglit** (CLAUDE.md universaalne paigutus-reegel), mitte 72 üksik-liigutust — muidu feed toob sama segaduse uuesti.

---

## 📋 Tarmo nõutud eraldi read

- **Täiendav partii:** 54 klastrit (49 kohtuniku-vastusest puudu + 5 ülekirjutatud/dup-konfliktist parandatud), chunk=10, Fable 10. Lahendamata **0**, poolitus-tasemeid 1. Lisandus **8 päris-leidu**, mis olid varem vaikselt kadunud.
- **Fantoomid:** **3 ära visatud** — spu:07513 (hallutsinatsioon, kehtetu võti), spu:07548 (hallutsinatsioon, kehtetu võti), spu:07547 (kehtiv võti, kuulus j18-le, ekslikult j100 all). Ükski ei kirjutanud üle päris-otsust pärast parandust (first-wins). 07547 sisuline mõju: madal (jääb paigale nii või teisiti).
- **Dup-konfliktid:** 4 klastrit (spu:17284 / 00684 / 11663 / 10573) — first-wins taastas esimese otsuse; neist 2 (17284, 00684) olid päris liigutused, 2 (11663, 10573) jäid ahela-konsensuses paigale.
- **Lõplik katvus:** **5225 / 5225 (100%)** kohtunik + **5225 / 5225** referents. Auku ei ole.
- **Referents-kontroll (sisend vs väljund):** 5225 sisse, 5225 välja — klapib täpselt, referentsil auku polnud.

---

## 💰 Kulu

| Mudel | Kulu |
|---|--:|
| Opus-4.8 (kohtunik) | $89.87 |
| Sonnet-5 (referents) | $56.32 |
| Fable-5 (viigimurdja) | $48.08 |
| **KOKKU** | **$194.27** (piir $210) |

Kutseid 5418 · cache-read 7.92M tok · cache-write 15.9M tok. Live-guard $210 juures ei rakendunud (jäime alla). Täiendava partii kulu mahtus sama piiri sisse ($0 batch-taaskasutus + väike chunk=10).

---

## ♻️ Taaskasutus (execute ilma uute kutseteta)

`reports/audit-full-decisions-2026-10-07.json` sisaldab iga 5225 klastri kohta: kohtunik-raw, referents-raw, Fable-otsus, lõppotsus (`final_decision`), sihtkäepide, värav/signaal. Execute-skript loeb siit (nagu sünonüüm `--from`) — **ühtegi uut API-kutset pole vaja**. Täienduse metaandmed failis `meta.supplement`.

---

## ➡️ Järgmine samm

Naabrite-ülehindamise ehitus (spets `reports/naabrite-ulehindamine-spets.md`, kinnitatud). **EI alusta enne, kui sina selle raporti üle vaatad** ja ütled, kas rakendame mõne leiu-ploki või liigume otse naabrite-ehitusele.
