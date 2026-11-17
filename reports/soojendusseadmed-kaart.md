# Soojendusseadmete kaardistus (ainult lugemine) — 2026-11-17

> Tarmo palve: leia KÕIK soojendusseadmed, kus nad on (L1/L2/L3), mitu toodet; eristus
> tööstus/töökoda/garaaž vs kodu/vannituba vs sõiduki parkimissoojendid; miks audit/klassifikaator
> valesti-paigutust ei püüdnud; ettepanek sihtstruktuur + piirireegel L3 kirjeldustesse.
> **MIDAGI EI OLE LIIGUTATUD — ootab Tarmo kinnitust.**

Allikas: staging DB (k33g, `db-…20261117T110258`), `status='published'`, 2026-11-17.

---

## 1. KUS SOOJENDUSSEADMED PRAEGU ON (L1 → L2 → L3, tootearv)

### 🏭 Tööstus / töökoda / garaaž / sõiduk (kütust põletav või suur portatiivne)
| L1 | L2 | L3 | n | Märkus |
|---|---|---|---|---|
| Autovaruosad ja -tarvikud | Sõiduki küte ja kliima | **Sõiduki õhusoojendid** | **60** | 12V/24V diisli õhukütteseadmed (2–8 kW, "all-in-one", "parking heater", car/bus/RV). **KAHT-OTSTARBELISED** (sõiduk + garaaž/telk/töökoda) |
| Autovaruosad ja -tarvikud | Sõiduki küte ja kliima | **Diiselsoojendi osad** | **22** | varuosad (väljalasketorud, kütusepumbad, hõõgküünlad, õhukanalid) — kuuluvad soojendite kõrvale |
| Santehnika, küte ja ventilatsioon | **Rätikukuivatid ja elektriküte** | **Kaasaskantavad ruumisoojendid** | **10** | ⚠️ **torpeedo petrooleum/diisli soojapuhurid 20–50 kW, 70000–100000 BTU, ratastel** — TÕELISELT TÖÖSTUSLIKUD, aga asuvad kodu-santehnika L2 all |
| Telgid, varjualused ja kasvuhooned | Kasvuhooned | Kasvuhoone kütteseadmed | 4 | elektri-PTC soojapuhurid (2000 W) — kasvuhoone-spetsiifiline |
| Tööriistad ja tarvikud | Elektrilised tööriistad | Vaadi- ja tünnisoojendid | 5 | vaadisoojendus (protsessiküte, mitte ruum) |
| Garaažiseadmed ja autoremont | Kütusekäitlus ja -mahutid | Gaasiballooni soojendid | 1 | gaasiballooni soojendusriba |

### 🏠 Kodu / vannituba / elektriküte
| L1 | L2 | L3 | n | Verdict |
|---|---|---|---|---|
| Santehnika, küte ja ventilatsioon | Rätikukuivatid ja elektriküte | Rätikukuivatid | 12 | ✓ õige (vannituba) |
| Santehnika, küte ja ventilatsioon | Rätikukuivatid ja elektriküte | Konvektorid | 1 | ✓ õige (kodu elektriküte) |
| Santehnika, küte ja ventilatsioon | Rätikukuivatid ja elektriküte | Põrandaliistkütte katted | 8 | ✓ õige |
| Santehnika, küte ja ventilatsioon | Dušisüsteemid ja dušikabiinid | Elektrilised veesoojendid | 4 | ✓ (vee-, mitte ruumiküte) |

### 🌳 Õue / vaba aeg
| L1 | L2 | L3 | n | Verdict |
|---|---|---|---|---|
| Aed ja aiatehnika | Lõkkekolded ja tuleasemed | Terrassisoojendid | 7 | ✓ õige (õue-vaba-aeg) |
| Aed ja aiatehnika | Basseinid ja spaa | Basseiniküttekehad ja soojuspumbad | 12 | ✓ domeeni-spetsiifiline |
| Aed ja aiatehnika | Saun | Saunaahjud ja kerised | 6 | ✓ |

### ⚙️ EI OLE ruumiküte (nime-lõksud — "heater" ≠ ruumisoojendi)
| L3 | n | Mis tegelikult |
|---|---|---|
| Induktsioonkuumutid (Garaaž/Mootori-remont) | 12 | poltide/laagrite kuumutus |
| Infrapuna-kuivatuslambid (Garaaž/Värvimine) | 5 | värvi kuivatus |
| Toidusoojendusvitriinid / -kapid (Suurköök) | 4 | toit |
| Rätikusoojendid (Tervis/ilu) | 11 | salongi rätikud |
| Ultrahelipuhastid "with heater" (Tööriistad) | 60 | puhasti kuumutus-funktsiooniga |

---

## 2. KOLM SELGET KIMPU (Tarmo eristus)

1. **Tööstuslik / töökoja ruumiküte** (kütust põletav, suur): torpeedo petrooleum/diisli soojapuhurid (10, praegu **Santehnikas**) + gaasi-soojapuhurid. **See on klassikaline garaaži/töökoja seade.**
2. **Sõiduki (parkimis)soojendid**: 12V/24V diisli õhukütteseadmed (60) + osad (22) — praegu **Autos**. Need on **kaht-otstarbelised** (sõiduk + garaaž).
3. **Kodu / vannitoa küte**: rätikukuivatid (12), konvektorid (1), põrandaliist (8) — ✓ juba õiges kohas (Santehnika).

**Põhiprobleem:** kimp 1 (tööstuslikud torpeedo-soojapuhurid) elab **kodu-santehnika all**, kimp 2 **autos** — samasugune "kütust-põletav-soojapuhur" pere on **laiali 3 erineva L1 vahel** ja ükski pole koos.

---

## 3. MIKS AUDIT / KLASSIFIKAATOR EI PÜÜDNUD

Kõik 4 QA-judge'i (grab-bag, merge, intra-qa, DUP) + invariandid töötavad **L3 SISE-homogeensuse** või **sama-nimeliste dublikaatide** peal:

1. **"Kaasaskantavad ruumisoojendid" on SISEMISELT homogeenne** (kõik on portatiivsed soojapuhurid) → grab-bag läbib korrektselt. Ükski judge ei küsi: **"kas see terviklik L3 on ÕIGE L2/L1 DOMEENI all?"** — terve korrektne L3 vale L2 all on **kõigile 4 judge'ile nähtamatu**.
2. **DUP-01 fireb ainult sama L3-NIME peal** üle mainide. Siin on pere jagatud **eri-nimelisteks** L3-deks kütuse/paigalduse järgi (Sõiduki õhusoojendid / Kaasaskantavad ruumisoojendid / Kasvuhoone kütteseadmed) → nime-match puudub → DUP vaikib.
3. **Klassifikaator paigutab tüüp+domeen järgi;** "diisel-soojendi → sõiduk" ja "petrooleumi ruumisoojendi → kodu-küte (santehnika)" on **kumbki lokaalselt kaitstav**, aga keegi ei vaadanud **PERET üle L1-de**. Eksklusiivsus-värav ei käivitunud, sest iga L3 nägi isoleeritult korrektne välja.

**Juur-lünk:** puudub **cross-L1 "seadme-pere-terviklikkuse" audit.** Invariandid/judge'id garanteerivad, et iga L3 on sisemiselt puhas, MITTE et seotud seadme-tüübid üle kogu kataloogi jagavad üht kodu. See on täpselt CLAUDE.md **"SAMM 0 — kaardista kogu seotud teema"** reegel — mis on täna **käsitsi/inimese** samm, mitte automaatkontroll.

**Ettepanek (eraldi):** uus WARN-detektor **"family-scatter judge"** — seeme-mõiste (nt "soojapuhur") → leiab KÕIK L3-d üle kõigi L1-de, mille tooted vastavad perele → WARN kui üks terviklik pere on laiali sidumata L1-domeenide vahel. (HARD RULE #6: masin leiab, inimene kinnitab.)

---

## 4. ETTEPANEK — SIHTSTRUKTUUR (Tarmo kinnituseks, MITTE teostatud)

Tarmo soov: diisel- + muud tööstuslikud soojendusseadmed **KOOS ühes kohas (garaaž/auto või töökoda)**.

**Soovitus — uus L2 "Soojapuhurid ja kütteseadmed" L1 `Garaažiseadmed ja autoremont` all**, L3-d kütuse järgi:

| Uus L3 | Allikas | Tegevus |
|---|---|---|
| **Diisli õhukütteseadmed (12V/24V)** | Sõiduki õhusoojendid (60, Auto) | **KAHT-OTSTARBELINE** → soovitus: primaar jääb Autosse (12V/24V, sõiduki-turundus), **cross-list garaaži-küttesse (Phase-2)** — EI dubleeri andmeid |
| **Petrooleumi/diisli soojapuhurid (torpeedo)** | Kaasaskantavad ruumisoojendid (10, Santehnika) | **LIIGUTA siia** — eksklusiivselt tööstuslik (230V/standalone, 20–50 kW), praegu valesti kodu-santehnikas |
| **Gaasi-soojapuhurid** | (uus, feed täidab) | loo profiil |
| **Diiselsoojendi osad** | Diiselsoojendi osad (22, Auto) | varuosad soojendite kõrvale (jälgib primaar-otsust) |

**JÄTA PUUTUMATA (õige domeen):** Rätikukuivatid (12), Konvektorid (1), Põrandaliist (8) → Santehnika ✓ · Terrassisoojendid (7) → Aed-õue ✓ · Kasvuhoone kütteseadmed (4) → kasvuhoone-spets ✓ · Vaadisoojendid (5), Induktsioonkuumutid (12), Infrapunalambid (5), Basseini-/saunaküte → oma domeen ✓

> ⚠️ **OTSUSKOHT Tarmole:** diisli õhukütteseadmed (60) on päriselt kaht-otstarbelised. 2 varianti:
> - **A (soovitus):** primaar Autos (sõiduki-buyer leiab), cross-list garaaži-küttesse (Phase-2).
> - **B:** primaar garaaži-küttes (kõik tööstussoojendid koos), cross-list Auto. — kaotab veidi sõiduki-otsija konteksti.
> Torpeedo-soojapuhurid (10) **liiguvad kindlasti** (praegu selgelt vales kodus) — kumma variandi puhul tahes.

---

## 5. PIIRIREEGEL L3 KIRJELDUSTESSE (et öine masin edaspidi õigesti paigutaks)

L3 `description` = tüüp-profiil SSoT, mille vastu feed/klassifikaator mapib. Otsustav signaal = **kütus + pinge + võimsus + paigaldus + sihtruum**, MITTE sõna "heater":

- **Diisli õhukütteseadmed (sõiduk/garaaž):** 12V/24V DC diisli õhukütteseade, "all-in-one / parking heater", autole/kaubikule/matkaautole/paadile JA garaaži/töökotta. *Signaal: DC-pinge (12V/24V) + diisel + air heater.*
- **Petrooleumi/diisli torpeedo-soojapuhurid:** 230V/standalone sundõhu petrooleum/diisli/parafiini soojapuhur, "torpedo"/"forced air", BTU või kW ≥ 10, ratastel, töökotta/ehitusplatsile/lattu. *Signaal: "forced air"/"torpedo"/BTU + võrgutoide/standalone + MITTE 12V.*
- **Gaasi-soojapuhurid:** propaani/gaasi sundõhu- või infrapuna-soojapuhur töökotta/õue. *Signaal: gaas/propaan + soojapuhur.*
- **Rätikukuivatid:** vannitoa rätikukuivati/-redel. *Signaal: towel/rätik + vannituba.*
- **Konvektorid / paneelküte:** 230V elektri-konvektor/paneelküte kodu-ruumi, ≤ 2–3 kW. *Signaal: convector/panel + 230V.*
- **Terrassisoojendid:** õue terrassisoojendi (gaas/elekter, seisev/seina). *Signaal: patio/terrass/õue.*

**META-piirireegel (kõigi soojendite ülene):** soojendi kodu otsustab **kütus (diisel/petrooleum/gaas/elekter) + pinge (12V/24V vs 230V) + võimsus (kW/BTU) + paigaldus (standalone/ratastel/seina/sõiduki) + sihtruum**. Sõna "heater"/"soojendi" üksi EI otsusta.

---

## 6. KOKKUVÕTE
- Soojendusseadmed on laiali ~20 L3 vahel; **tööstuslik kütust-põletav pere on jagatud 3 L1 vahel** (Auto 60+22, Santehnika 10, Telgid 4).
- **1 selge valesti-paigutus:** torpeedo petrooleum/diisli soojapuhurid (10) kodu-santehnika all — peaksid olema garaaži/töökoja tööstusküttes.
- Audit ei püüdnud, sest **puudub cross-L1 pere-terviklikkuse kontroll** (judge'id vaatavad L3-sisest homogeensust, mitte L3 õiget domeeni).
- Sihtstruktuur + piirireeglid valmis → **ootab Tarmo kinnitust (variant A vs B) enne liigutamist.**
