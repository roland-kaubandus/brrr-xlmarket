# AI Content Pipeline — disain-spetsifikatsioon

**Projekt:** xlmarket.ee (Medusa v2 + Next.js)
**Kuupäev:** 2026-06-06
**Staatus:** DRAFT — ootab validatsiooni enne mass-jooksu
**Omanik:** Tarmo
**Track:** paralleelne P1 cart-stalliga; EI nõua deploy'i enne wiring-faasi
**Seotud failid:** `cms/`, `adapters/`, `feeds.yaml`, `vevor-to-v3.json`, `powermat-to-v3.json`, `taxonomy.yaml`, `category-tree.generated.json`

---

## 1. Eesmärk

Ehitada **üks jagatud AI-sisukiht**, mis teenindab kahte korduvat vajadust kogu kataloogis, kõigi tarnijate ja keelte üleselt:

- **A — Tõlge:** kvaliteetne, järjepidev eesti (hiljem hispaania jne) tõlge KÕIGILE tootevälja­dele, sh seni tõlkimata `sanitized_rich_description` HTML-blokk.
- **B — Kategooria-klassifikatsioon:** toodete automaatne paigutamine olemasolevasse kureeritud v3-taksonoomiasse, asendades habrast reegli­põhist mappingut (`vevor-to-v3.json` l1_defaults katki, `powermat-to-v3.json` tegemata).

**Põhiprintsiip:** see EI ole ühekordne töö, vaid **püsiv infrastruktuur**. Iga uus toode igalt tarnijalt läbib sama kvaliteedi­standardi automaatselt. Backlog on ühekordne kulu; jooksev kulu on sendid toote kohta.

### Miks see eraldi kihina
- Tõlge ja klassifikatsioon jagavad sama vundamenti: Anthropic Batch API, eraldi API-võti, glossary/kanooniline-mapping loogika, idempotentsus + resume, validatsiooni­väravad.
- Klassifikatsioon tehakse **üks kord allikkeeles** (keele-agnostiline); tõlge kordub iga sihtkeele kohta. → uue keele lisamine = ainult tõlke-kulu, mitte uus klassifikatsioon.

---

## 2. Skoop

**Sees:**
- Tõlge: title, lühikirjeldus, müügipunktid, `sanitized_rich_description` → `_et` (ja ettevalmistus `_es` jaoks)
- Klassifikatsioon: toode → v3-taksonoomia sõlm(ed), usaldusskooriga
- **Allika-QC:** feedi originaalteksti õigsuse kontroll/normaliseerimine enne tõlget (konservatiivne)
- Olemasoleva backlog'i ühekordne töötlemine + jooksev liidestus feed-sync'iga
- Kanooniline glossary + "ära tõlgi" nimekiri (jagatud vara)
- **Cross-projekt:** sama mootor + metoodika korduvkasutatav eumotors.es ja canarymotors jaoks (jagatud tuum + per-projekt adapter)

**Väljas (praegu):**
- Hispaania ja muud keeled (arhitektuur valmis, jooks hiljem)
- Storefront UI-stringide tõlge (juba tehtud, ~200 stringi)
- Taksonoomia struktuuri muutmine (struktuur on valmis; see kiht ainult paigutab sinna)

---

## 3. Arhitektuur

### 3.1 Pipeline'i positsioon
```
Feed ingest (VEVOR / Powermat / N)
   │
   ▼
Normaliseerimine (SKU-namespace: VV- / PM-, väljade mapping)
   │
   ▼
[C] ALLIKA-QC  →  puhasta/märgi originaaltekst (konservatiivne; numbrid/koodid puutumata)
   │
   ▼
[B] KLASSIFIKATSIOON  →  toode → v3-taksonoomia (usaldusskoor)
   │
   ▼
[A] TÕLGE  →  feed-first (native keel feedist) VÕI Opus-tõlge; locale-väljad + glossary + QA
   │
   ▼
DB write (idempotentne)  →  Meili indekseerimine (locale-indeks keele kohta)
```

### 3.2 Jagatud mootor
- **Mudel:** Claude Opus 4.8 (parim kvaliteet; tooteinfo + nüansirikas eesti keel)
- **Liides:** Anthropic **Batch API** (50% allahindlus, asünkroonne kuni 24h) — sobib offline-mahuks
- **API-võti:** eraldi `ANTHROPIC_API_KEY`, **AINULT** vastava skripti env-is. **MITTE** globaalne export (vastasel juhul kaaperdab Claude Code subscription-authi). Võti Vaultwardeni (vault.xlrent.eu).
- **Prompt caching:** glossary + taksonoomia-kontekst + süsteemi­juhised cache'itakse (90% odavam korduval sisendil)
- **Idempotentsus:** iga toode võtmestatud (SKU + sisu-hash); juba töödeldut ei töödelda uuesti; resume katkestuse korral
- **Rate/batch handling:** batch-failid tükeldatud, retry transientidel, progress-log

### 3.3 Tarnija × keel strateegia (tõlge = selgroog, feed = allahindlus)

**Põhimõte:** tõlge on **tuum-võimekus** (suvaline allikkeel → suvaline sihtkeel). Tarnija native-keele-feedi kasutamine on **opportunistlik allahindlus** seal, kus tarnija juhtub sihtkeelt pakkuma — see ei kata enamikku kombinatsioone.

Iga (tarnija × sihtkeel) lahtri kohta: **kui tarnija pakub sihtkeelt → kasuta feedi otse ($0); muidu → tõlgi parimast olemasolevast allikast.**

| Tarnija (allikas) | xlmarket.ee → ET (+RU?) | xlmarket.es → ES (+DE/EN?) |
|---|---|---|
| VEVOR (EN/ES/DE feedis) | EN→ET tõlge | ES/DE/EN **feed otse — $0** |
| Powermat (PL) | PL→ET tõlge | PL→ES tõlge |
| Uus inglise-only tarnija | EN→ET tõlge | EN→ES tõlge |
| Uus poola-only tarnija | PL→ET tõlge | PL→ES tõlge |

**Reaalsus:** ainus lahter, kus feed päriselt säästab, on VEVOR hispaania lehel. Kogu eesti leht + kõik poola/inglise tarnijad igale turule vajavad Claude-tõlget. Tõlge on seega hädavajalik tuum, mitte fallback.

**Tagajärjed disainile:**
- **Allikas-agnostiline mootor** — Opus tõlgib PL→ET, EN→ES, PL→RU võrdselt; allikkeel pole takistus.
- **Siht-keele-põhine glossary** — eraldi `glossary.et`, `glossary.es`, `glossary.ru` (terminoloogia järjepidevus igas keeles); "ära tõlgi" nimekiri (brändid, mudelikoodid) **jagatud** kõigi keelte vahel.
- **Kvaliteet vs feed:** tarnija feed-tõlked võivad olla masin-konarlikud → Claude saab valikuliselt parandada top-tooteid ka seal, kus native-feed olemas (vaikimisi siiski feed, $0).

### 3.4 Cross-projekt korduvkasutus (eumotors.es, canarymotors)

Sama mootor + metoodika teenindab **kõiki serveri projekte** — see pole xlmarket-spetsiifiline.

- **API-võti on konto-tasandil**, mitte projekti-spetsiifiline. Üks krediidi-pool katab kõik. **Soovitus:** eraldi võti per projekt sama arvelduskonto all → kulu-nähtavus per projekt + sõltumatu tühistamine.
- **Jagatud tuum + per-projekt adapter:** AI-loogika (glossary, batch, HTML-teadlik tõlge, QA, allika-QC) on 100% jagatud; erineb ainult juhtmestus — xlmarket = Medusa metadata + Meili; eumotors.es = WordPress (custom fields / WPML); canarymotors = oma stack. Sobib `/opt/dev-workflow/` mustriga (jagatud metoodika + projekti-sisu).
- **Feed-first kehtib ka seal:** eumotors/canarymotors on hispaaniakeelsed → VEVOR ES feed otse ($0).

---

## 4. Komponent A — Tõlge

### 4.1 Kvaliteedi-elemendid
1. **Kanooniline glossary (siht-keele-põhine)** — korduvad tehnilised terminid + brändid ühtse vastega igas sihtkeeles. Eraldi `cms/glossary.et.yaml`, `glossary.es.yaml`, `glossary.ru.yaml` jne; "ära tõlgi" nimekiri jagatud. Ekstraktitud kataloogist, kasvav vara, versioonihalduses. Mootor on allikas-agnostiline (PL/EN/... → suvaline sihtkeel).
2. **"Ära tõlgi" nimekiri** — brändinimed (VEVOR, Powermat...), mudelikoodid, SKU-d, mõõtühikud (70L, 230V), URL-id.
3. **HTML-teadlik** — tõlgi ainult tekst tag'ide vahel; säilita `<img>`, struktuur, atribuudid. (Pilot tõestas mustri: 1 toode, 42 segmenti, 10 pilti säilinud.)
4. **QA-pass** — teine Opus-pass kontrollib tõlke allika vastu; vähemalt in-stock / top-toodetele.

### 4.2 Väljund
- Kirjutab `<field>_et` metadata'sse (nt `sanitized_rich_description_et`)
- Storefront API on juba locale-aware (loeb `_et` kui locale=et, fallback EN) — pilotis kinnitatud
- Ettevalmistus: eraldi Meili-indeks keele kohta (otsustatud enne 3. keelt)

### 4.3 Katvus
title • lühikirjeldus • müügipunktid • `sanitized_rich_description`

---

## 5. Komponent B — Kategooria-klassifikatsioon

### 5.1 Mida lahendab
- Asendab habrast `vevor-to-v3.json` reegli­ahelat (path_contains → l1_l2_l3 → l1_l2 → l1_default), mis katkeb kui handle'd muutuvad
- Parandab katkise VEVOR `l1_defaults`
- Teeb tegemata Powermati mappingu (poola kategooriad → v3)
- Katab tulevased tarnijad automaatselt (ei vaja iga tarnija jaoks uut reegli-faili)

### 5.2 Lähenemine
- Sisend: toote title + (lühi)kirjeldus + tarnija kategooria-path
- Kontekst: v3-taksonoomia (cache'itud, 90% odavam korduval kasutusel)
- Väljund: valitud v3-sõlm(ed) + **usaldusskoor** + lühi-põhjendus
- **Review-bucket:** madala usaldusega (nt < lävi) tooted lähevad käsitsi-ülevaatusse, mitte ei kao
- Keele-agnostiline: tehakse allikkeeles, kehtib kõigi keelte jaoks

### 5.3 Suhe taksonoomiasse
See kiht EI muuda struktuuri — paigutab tooted **olemasolevasse** kureeritud v3-puusse (2731 sõlme). Struktuuri-töö (Faas A/B, nav-fix) on vundament, mida klassifikaator kasutab.

---

## 5b. Komponent C — Allika-QC (originaalteksti kontroll)

### 5b.1 Eesmärk
Feedi originaaltekst (tarnija-antud, sageli masin-tõlgitud või konarlik) sisaldab grammatika-/kirjavigu, MT-artefakte, vigast HTML-i, encoding-prügi. **Loogika: ära tõlgi prügi prügiks — puhasta/märgi allikas enne tõlget.** Jookseb samas Batch-passis (odav).

### 5b.2 Konservatiivne režiim (KRIITILINE)
- **EI tohi** automaatselt muuta spetse, numbreid, mudelikoode, mõõte (sama "ära tõlgi" põhimõte) — muidu "parandab" 70L→75L või rikub mudelikoodi.
- Parandab ainult **ilmsed keele-vead** (grammatika, kirjavead, formaat).
- **Märgib kahtlased** ülevaatuseks, ei kirjuta vaikselt ümber.
- Alusta režiimist **"flag-only"** või **"paranda + näita diff"**, kuni usaldus tekib. Numbrid/koodid alati puutumata.

### 5b.3 Väljund
- Puhastatud allikas (kui auto-fix) VÕI märgete-nimekiri (kui flag-only) + diff ülevaatuseks
- Puhastatud allikas läheb edasi tõlke-sisendiks (parem tõlge, sest allikas korras)

---

## 6. Jagatud mured

| Mure | Lahendus |
|---|---|
| API-võtme turve | Eraldi võti, env-scoped, Vaultwarden, mitte globaalne export, spend-limit konsoolis |
| Idempotentsus | SKU + sisu-hash võti; resume; ei tööedle juba tehtut |
| Validatsioon (HARD RULE #1) | Iga mass-jooks nõuab Tarmo kinnitust; eelnevalt näidis-batch + ülevaatus |
| Logimine | Progress + kulu-tokenid logitakse; sessioonilogi (HARD RULE #3) |
| Kvaliteedi-kontroll | Tõlkel QA-pass + näidiste heakskiit; klassifikatsioonil usaldusskoor + review-bucket |

---

## 7. Eelarve (hinnang, ~±20%; täpne kulu mõõdetud näidis-batch'ist)

**Hinnabaas:** Opus 4.8 Batch = $2.50 sisend / $12.50 väljund per miljon tokenit.

### Ühekordne backlog
| Töö | Maht | Kulu |
|---|---|---|
| Tõlge — rich-desc backlog (16602 toodet, 48MB) | ~12M in + ~13M out + QA | **~$250–300** |
| Klassifikatsioon — kogu kataloog (~17.4K) | väike väljund/toode (cache'itud taksonoomia) | **~$70–120** |
| **Ühekordne kokku (ET)** | | **~$320–420** |

### Jooksev (per uus toode, feed-sync)
| Töö | Per toode |
|---|---|
| Tõlge | ~$0.013 (~1.3 senti) |
| Klassifikatsioon | ~$0.004–0.007 (~pool senti) |

### Tarnija / keele laiendus
| Stsenaarium | Kulu |
|---|---|
| Powermat backlog (~10K toodet, hinnang): tõlge (PL→ET) + klassifikatsioon | ~$170–200 ühekordne |
| Iga lisakeel (kogu kataloog, nt vene ET-lehele): AINULT tõlge | ~$250–300 / keel |
| Uus tarnija (poola/inglise-only): tõlge igasse sihtkeelde + klassifikatsioon (1×) | ~$0.013–0.02 / toode |
| Feed-reuse allahindlus (VEVOR ES/DE/EN hispaania lehel) | **$0 (native feed)** |

**NB:** tõlge on baas-eeldus iga (tarnija × sihtkeel) jaoks; feed-reuse on $0-allahindlus ainult seal, kus tarnija pakub sihtkeelt (praktikas peamiselt VEVOR hispaania lehel). Vt §3.3 maatriks.

**Arveldus:** pay-as-you-go, kuumaksu pole. Idle = $0. Soovituslik stardikrediit ~$50–100.

---

## 8. Rollout — faasid + väravad

> Iga ✋ = STOPP, vajab Tarmo kinnitust (HARD RULE #1). Prod't ei puudutata enne wiring-faasi.

**Faas 0 — eeltingimus (ainult Tarmo):**
- API-võti + arveldus (console.anthropic.com), spend-limit, võti Vaultwardeni

**Faas 1 — disain + glossary:**
1. See spetsi-dokument (valmis)
2. Glossary v1 mustand (ekstrakt + brändid + ära-tõlgi)

**Faas 2 — tõlke + allika-QC validatsioon ✋:**
3. Näidis-batch: 30 toodet (sega in-stock + eri kategooriad), allika-QC + Opus Batch tõlge + glossary + QA
4. Näita: originaal vs QC-puhastatud vs tõlge kõrvuti + märgete-nimekiri + mõõdetud tokeni-kulu → **Tarmo heakskiit**

**Faas 3 — tõlke backlog ✋:**
5. Kogu 16602 rich-desc backlog (resume'itav), siis Meili reindeks

**Faas 4 — klassifikatsiooni pilot ✋:**
6. Näidis: ~50 toodet (sh praegu valesti/kategoriseerimata + Powermati näidised) → usaldusskoorid + ülevaatus → **Tarmo heakskiit**

**Faas 5 — klassifikatsiooni backlog ✋:**
7. Parandab VEVOR l1_defaults + kogu kataloogi reklassifikatsioon; madala usaldusega → review-bucket

**Faas 6 — jooksev liidestus:**
8. Feed-sync kutsub kõiki kihte (QC + klassifikatsioon + tõlge) uutele toodetele automaatselt

**Faas 7 — laiendus (hiljem):**
9. Powermat täis-import; hispaania + vene keel (sama toru)
10. Cross-projekt: per-projekt adapter eumotors.es + canarymotors jaoks (jagatud tuum)

---

## 9. Lahtised otsused
- [ ] Glossary lävi-väärtused (klassifikatsiooni usaldusskoori review-lävi)
- [ ] Kas QA-pass kõigile toodetele või ainult in-stock/top (kulu vs kvaliteet)
- [ ] Kas re-tõlkida olemasolevad lühiväljad glossary'ga järjepidevuse mõttes (väike kulu) või jätta
- [ ] Stardikrediidi suurus

---

## 10. Vastuvõtu-kriteeriumid
- [ ] `sanitized_rich_description_et` olemas kõigil backlog-toodetel; storefront näitab eesti rich-blokki
- [ ] Glossary järjepidevus: samad terminid tõlgitud ühtemoodi üle kataloogi
- [ ] HTML + pildid + brändid/mudelikoodid säilinud (0 katkist tag'i)
- [ ] VEVOR l1_defaults parandatud; Powermat mapitud; review-bucket käsitletud
- [ ] Jooksev feed-sync tõlgib + klassifitseerib uued tooted automaatselt
- [ ] Kogu mehhanism keele-agnostiline (hispaania lisatav ainult tõlke-jooksuga)

---

## 11. Viited
- Pilot (tõestatud): rich-desc `_et` + storefront locale-aware
- `taxonomy.yaml` / `category-tree.generated.json` — v3 SSoT (2731 sõlme)
- `vevor-to-v3.json`, `powermat-to-v3.json` — asendatavad reegli-failid
- HARD RULE #1 (kinnitus enne prod-DB/konteiner/deploy), HARD RULE #3 (sessioonilogi)
