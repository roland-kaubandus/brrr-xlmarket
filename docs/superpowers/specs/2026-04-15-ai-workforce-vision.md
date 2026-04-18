# XLMarket AI Töötajaskond — Visioonidokument

> 2026-04-15 | Koostanud: XL agent + Risto
> Staatus: DRAFT — täieneb turu-uuringu tulemustega

---

## Juhtivkokkuvõte

XLMarket.eu on 16 000 tootega e-pood, mida opereeritakse ilma palgaliste töötajateta. Selle dokumendi eesmärk on kirjeldada, kuidas AI agendid täidavad kõik e-poe põhifunktsioonid — klienditeenindusest turunduseni.

**Kogu meeskond: 13 AI rolli 6 osakonnas.**

Need agendid asendavad ~3 täiskohaga töötajat (FTE), mille palgakulu oleks ~5 400€/kuu. AI kulu on Max plaan (kuumaks, täpne hind sõltub plaanist) + API tokenid klienditeeninduseks (~$30-300/kuu sõltuvalt mahust).

Agendid jagunevad kahte gruppi:
- **Kliendile suunatud** (chat, email) — Anthropic API, per-token billing, reaalajas
- **Sisemised** (analüütika, turundus, operatsioonid) — Claude Max plaan, cron/nõudmisel

Ehitamine toimub faasides, alustades klienditeenindusest (juba disainitud) ja analüütikast.

### Faasid

| Faas | Osakonnad | Eeldus |
|------|-----------|--------|
| **1** (praegu) | Klienditeenindus, Analüütika (alus) | Olemasolev infrastruktuur |
| **2** (pärast turu-uuringut) | Klienditugi, B2B müük, Analüütika (täis) | Turu-uuringu tulemused, emaili infrastruktuur |
| **3** (stabiilne käive) | Turundus, Operatsioonid | Piisav andmemaht raportiteks ja optimeerimiseks |

### Inimtööjõu võrdlus

| Osakond | AI rollid | FTE ekvivalent | Palgakulu ekvivalent/kuu |
|---------|-----------|----------------|--------------------------|
| Klienditeenindus | 2 | 0.5 | ~800€ |
| Klienditugi | 2 | 0.3 | ~500€ |
| Müük (B2B) | 2 | 1.0 | ~2 000€ |
| Analüütika | 2 | 0.3 | ~600€ |
| Turundus | 3 | 0.5 | ~1 000€ |
| Operatsioonid | 3 | 0.3 | ~500€ |
| **Kokku** | **13** | **~3 FTE** | **~5 400€/kuu** |
| | | **AI kulu** | **Max plaan + ~$30-300 API** |

---

## Tehniline alus

### Infrastruktuur (juba olemas)

| Komponent | Staatus | Otstarve |
|-----------|---------|----------|
| MeiliSearch | Töötab | Tooteotsing, kategooriad, facets (~5ms) |
| Medusa.js 2.0 | Töötab | Tellimused, inventuur, kliendid, maksed |
| Medusa Admin | Töötab | Tellimuste haldus, laoseis, tooted |
| PostHog | Integreeritud | 9 event'i, sessioonisalvestused, dashboardid |
| nginx + PM2 | Töötab | Reverse proxy, 5 cluster workerit |
| nodemailer | Töötab | Transaktsioonimeilid (tellimus, saatmine) |
| Feed sync | Cron iga 4h | VEVOR tootefeedi uuendamine |
| osta.ee feed | Töötab | XML feed, 10 700+ toodet |
| Facebook Commerce | Töötab | Feed, 10 700+ toodet |

### Puudu (ehitatav)

| Komponent | Vajab | Faas |
|-----------|-------|------|
| `/api/ai-chat` route | Anthropic SDK, SSE streaming | 1 |
| AiSearchPalette UI | Vestlusaken, tootekaardid | 1 |
| Emaili monitooring | IMAP polling või webhook (info@xlmarket.eu) | 2 |
| Juhtpaneel (dashboard) | Osakondade ülevaade, manuaalne käivitamine | 2 |
| Kliendiajaloo API | Medusa kliendi + tellimuste koondamine | 2 |
| Pakkumissüsteem | Hinnapakkumise genereerimine B2B-le | 2 |
| Blogi/sisu infrastruktuur | CMS või markdown-põhine blogi | 3 |

### Kulustruktuur

**API (per-token) — kliendile suunatud agendid:**

| Komponent | Mudel | Tokenit/vestlus | Hind/vestlus |
|-----------|-------|-----------------|--------------|
| Claudia | Haiku 4.5 | ~2 500 | ~$0.002 |
| Tootespetsialist | Sonnet 4.6 | ~4 800 | ~$0.02 |
| Tugiagent (email) | Sonnet 4.6 | ~3 000 | ~$0.015 |
| Ärikliendihaldur | Sonnet 4.6 | ~5 000 | ~$0.025 |

| Stsenaarium | Vestlusi/päev | API kulu/kuu |
|-------------|---------------|--------------|
| Algus | 10-20 | ~$30 |
| Keskmine | 50-100 | ~$100 |
| Kõrghooaeg | 200-500 | ~$300 |

**Max plaan — sisemised agendid:**

Kõik taustöötajad (analüütika, turundus, operatsioonid, turu-uuringud, B2B taustöö) jooksevad Max plaani peal. Kuumaks, mitte per-token.

---

## Osakond 1: Klienditeenindus

> Faas 1 — juba detailselt disainitud, vt `2026-04-15-ai-sales-agents-design.md`

### 1.1 Claudia — poe infopunkt

| | |
|---|---|
| **Roll** | Poe sissepääsu sõbralik inimene, kes teab kus miski asub |
| **Mudel** | Haiku 4.5 (API) |
| **Käivitaja** | Reaalaeg — AiSearchPalette vestlusaken (Ctrl+K) |
| **Toon** | Sõbralik, tagasihoidlik, eestipärane. EI müü. Ei ole entusiastlik |

**Mida teab:** kategooriapuu, poe üldinfo (tarne, tagastus, hinnad), populaarsed tooted
**Mida ei tea:** toodete spetsifikatsioone (watt, materjal, mõõdud)

**Käitumine:**
- Aitab kui küsid, ei tule ise peale
- Küsib tagasi ainult kui ebaselge ("Mis materjali puurid — puit, betoon, metall?")
- Kui ei tea — ütleb ausalt ja kutsub tootespetsialisti
- Kui keegi teeb nalja, läheb kaasa

**Eskaleerimine:**
- Tehniline küsimus → Tootespetsialist (automaatne)
- B2B kontekst (köök, kontor, hulgiost) → Ärikliendihaldur
- Otsustab ise: lihtne speci küsimus = eskaleerib kohe, pikk võrdlus = küsib kinnitust

**Tool:** `search_products` — MeiliSearch päring (max 6 tulemust)

### 1.2 Tootespetsialist — osakonna ekspert

| | |
|---|---|
| **Roll** | Kategooriapõhine tehniline ekspert, teab spece, oskab võrrelda |
| **Mudel** | Sonnet 4.6 (API) |
| **Käivitaja** | Eskaleerimine Claudialt |
| **Toon** | Tehniline, aus, konkreetne. Võrdleb numbreid, mitte ebamääraselt |

**Kontekst:** Claudia vestlusajalugu + konkreetse kategooria toodete specs (max 5-10 toote täisandmed)

**Käitumine:**
- "Selle keevitusaparaadi MIG-režiim töötab kuni 200A, 0.8-1.0mm traat" — mitte "see on super aparaat!"
- Kui ei tea — ütleb ausalt, ei genereeri fakte
- Eskaleerib kliendihaldurile kui selgub projektimüügi vajadus

**Tools:** `search_products` + `get_product_details` (toote täisandmed Medusa API-st)

---

## Osakond 2: Klienditugi

> Faas 1-2

### 2.1 Tugiagent — emailidele vastaja

| | |
|---|---|
| **Roll** | Monitoorib info@xlmarket.eu ja vastab klientide päringutele |
| **Mudel** | Sonnet 4.6 (API) |
| **Käivitaja** | Automaatne — iga sissetulev email |
| **Toon** | Sama mis Claudia — sõbralik, aus, ei genereeri. Emailis natuke formaalsem |

**Emailide klassifitseerimine:**
1. **Tellimusepäring** (kus mu pakk on?) → kontrollib Medusa API-st, vastab automaatselt
2. **Tooteküsimus** (kas see sobib...?) → suunab Tootespetsialistile
3. **Tagastus/pretensioon** → suunab Tagastuste haldurile
4. **B2B päring** (vajan 20 tk, hinnapakkumist) → suunab Ärikliendihaldurile
5. **Lihtne küsimus** (tarneaeg, makseviisid) → vastab ise
6. **Keeruline/viha** → koostab draft'i, saadab Slacki kinnitamiseks
7. **Spam** → ignoreerib

**Tools:**
- `check_order_status` — Medusa API, tellimuse staatus + tracking
- `search_products` — MeiliSearch
- `send_email` — SMTP (olemasolev nodemailer)
- `escalate_to_slack` — Slacki kanal kinnitamiseks

**Mida EI tee automaatselt:**
- Ei tagasta raha
- Ei luba midagi mis pole poliitikas
- Kahtluse korral küsib Slackis kinnitust

### 2.2 Tagastuste haldur

| | |
|---|---|
| **Roll** | Tagastusavalduste töötlemine vastavalt poliitikale |
| **Mudel** | Sonnet 4.6 (API/Max) |
| **Käivitaja** | Eskaleerimine tugiagendilt + cron (pooleliolevate jälgimine) |

**Tagastuspoliitika:**
- 30 päeva tagastusõigus
- Toode peab olema originaalpakendis
- Defektne toode — garantii vastavalt seadusele

**Töövoog:**
1. Kontrollib: kas 30 päeva sees? kas on ostutšekk/tellimus?
2. **Lihtne tagastus** → töötleb automaatselt, saadab kliendile juhised (kuhu saata, millal raha tagasi)
3. **Defektne toode** → küsib fotod/kirjelduse, hindab, Slacki kinnitamiseks
4. **Garantiipretensioon** → dokumenteerib, Slacki kinnitamiseks
5. **Cron (iga päev):** kontrollib pooleliolevate tagastuste staatust, saadab meeldetuletusi

---

## Osakond 3: Müük (B2B)

> Faas 2 — pärast turu-uuringut

### 3.1 Ärikliendihaldur(id) — sektoripõhised müügijuhid

| | |
|---|---|
| **Roll** | Isiklik müügihaldur B2B klientidele, üks per prioriteetsektor |
| **Mudel** | Sonnet 4.6 (API kliendiga suheldes, Max taustööks) |
| **Käivitaja** | Eskaleerimine (Claudia/Tugiagent) + proaktiivne (hiljem) + nõudmisel |

**Mitu haldurit:** turu-uuring tuvastab prioriteetsektorid. Iga sektori haldur tunneb:
- Sektori terminoloogiat ja vajadusi
- Tüüpilist ostutsüklit ja otsustajaid
- VEVOR sortimendi tugevusi selles sektoris

**Kuidas klient jõuab haldurini:**
- Claudia tuvastab B2B konteksti chatis → automaatne eskaleerimine
- Tugiagent tuvastab B2B päringu emailis → eskaleerimine
- Proaktiivne outreach (Phase 3): LinkedIn, otsekirjad

**Mida haldur teeb:**
- Koostab pakkumisi (tootevalik + kogusehind + tarne)
- Vastab sektori-spetsiifilistele küsimustele
- Jälgib kliendi ostude ajalugu, soovitab täiendavaid tooteid
- Korduvtellimuste meeldetuletused

**Faasiline laienemine:**
- **Faas 2:** reageeriv — vastab päringutele, koostab pakkumisi
- **Faas 3:** proaktiivne — uued tooted, kampaaniad, hooajalised pakkumised, outreach

**Tools:**
- `search_products`, `get_product_details`
- `get_customer_history` — Medusa API, kliendi varasemad tellimused
- `create_quote` — pakkumise koostamine (hind, kogus, tarne)
- `send_email` — personaalne kiri kliendile

**Sisselogimine pole eskaleerimiseks vajalik** — klient saab B2B teenust ka ilma kontota. Konto luuakse müügi lõpus.

### 3.2 Turu-uurija

| | |
|---|---|
| **Roll** | Sektorianalüüs, konkurentsijälgimine, uute võimaluste tuvastamine |
| **Mudel** | Sonnet 4.6 / Opus (Max) |
| **Käivitaja** | Nõudmisel + kvartaalselt |

**Regulaarne töö (kord kvartalis):**
- Sektorianalüüsi uuendamine (turu suurus, konkurendid, trendid)
- Konkurentide hindade jälgimine
- Uute VEVOR toodete hindamine ("VEVOR lisas 15 uut catering toodet, neist 4 sobivad Eesti turule")
- Uute sektorite tuvastamine

**Esimene ülesanne:** laiapõhjaline turu-uuring — vt `2026-04-15-market-research-prompt.md`

---

## Osakond 4: Analüütika

> Faas 1 (alus) → Faas 2 (täis)

### 4.1 PostHog analüütik

| | |
|---|---|
| **Roll** | Kasutajakäitumise jälgimine, konversioonioptimine, probleemide tuvastamine |
| **Mudel** | Sonnet 4.6 (Max) |
| **Käivitaja** | Cron: iga päev + nõudmisel |

PostHog on juba integreeritud (9 event'i, sessioonisalvestused, EU instance). Keegi peab neid andmeid lugema ja nende põhjal tegutsema — seda teebki see agent.

**Igapäevane raport (→ Slack #xlmarket-analytics):**
- Eilsed külastajad, sessioonid, bounce rate
- Konversioonilehter: koduleht → toode → ostukorv → checkout → ost
- Kus inimesed välja kukuvad
- Top otsinguterminid

**Iganädalane süvaanalüüs:**
- Millised kategooriad kasvavad/kahanevad
- Millistest kanalitest tulevad ostjad vs vaatajad
- Session recording'ute kokkuvõte — kus inimesed kinnijäävad
- A/B testide tulemused (kui on)

**Proaktiivsed alarmid (→ Slack, kohe):**
- Konversioon langes >20% vs eelmine nädal
- Bounce rate tõusis märkimisväärselt
- Ebatavaline muster (bot traffic, ühe toote plahvatuslik huvi)
- Checkout'i veamäär tõusis

**Tools:** PostHog API (events, trends, funnels, session recordings), MeiliSearch analytics, Slack

### 4.2 Äriraporteerija

| | |
|---|---|
| **Roll** | Äritulemuste koondamine ja raporteerimine juhtkonnale |
| **Mudel** | Sonnet 4.6 (Max) |
| **Käivitaja** | Cron: iga nädal + nõudmisel |

**Iganädalane raport (→ Slack + email Tarmole):**
- Käive, tellimuste arv, keskmine tellimus
- Top müüdud tooted (top 10)
- Tagastuste arv ja põhjused
- Laoseis — mis on otsas, mis ei liigu
- Turunduskulud vs käive

**Igakuine raport:**
- Kuu kokkuvõte vs eelmine kuu vs eesmärk (KPI-d turundusplaanist)
- ROAS per kanal (Google Ads, FB, orgaaniline)
- Kliendisegmendid (uued vs korduvostjad)
- Soovitused: mida muuta

**Andmeallikad:** Medusa API (tellimused, käive), PostHog (liiklus, konversioonid), Google Ads API, Facebook Ads API

---

## Osakond 5: Turundus ja sisu

> Faas 2-3

### 5.1 Sisulooja

| | |
|---|---|
| **Roll** | Blogi, tootekirjeldused, sotsiaalmeedia sisu |
| **Mudel** | Sonnet 4.6 (Max) |
| **Käivitaja** | Cron: 2x nädalas + nõudmisel |

**Blogi artiklid (2x nädalas):**
- Ostujuhendid ("Kuidas valida keevitusaparaati algajale")
- Tootevõrdlused ("5 parimat suurköögiseadet alla 500€")
- Sektoripõhised ("Mida vajab alustava kohviku köök")
- SEO-optimeeritud, eestikeelne, aus toon — informeerib, ei müü

**Tootekirjelduste rikastamine:**
- VEVOR originaalkirjeldused on tihti halvad/masintõlkelised
- AI kirjutab ümber: selge eesti keel, olulised specs esile, tarbetu välja

**Sotsiaalmeedia:**
- Facebook/Instagram postitused toodete ja artiklite põhjal
- Toon: sama mis pood — rahulik, informeeriv, mitte hüüumärgid ja emojid

### 5.2 SEO spetsialist

| | |
|---|---|
| **Roll** | Tehniline SEO, märksõnade jälgimine, sisu optimeerimine |
| **Mudel** | Sonnet 4.6 (Max) |
| **Käivitaja** | Cron: iganädalane + nõudmisel |

**Regulaarne töö:**
- Tehniline SEO audit (katkised lingid, aeglased lehed, indekseerimisprobleemid)
- Märksõnade positsioonide jälgimine (Google Search Console)
- Kategoorialehtede SEO tekstide kirjutamine/optimeerimine
- Internal linking soovitused
- Konkurentide SEO analüüs (millised märksõnad neil töötavad)

**Olemasolev alus:** tehniline SEO on suuresti tehtud (sitemap, robots.txt, structured data, meta tags — vt turundusplaan)

### 5.3 Kampaaniahaldur

| | |
|---|---|
| **Roll** | Google Ads ja Facebook Ads jälgimine ja optimeerimine |
| **Mudel** | Sonnet 4.6 (Max) |
| **Käivitaja** | Cron: igapäevane + nõudmisel |

**Igapäevane:**
- Google Ads: bid'ide optimeerimine, kehvade märksõnade eemaldamine, kvaliteediskoori jälgimine
- Facebook Ads: Dynamic Product Ads jälgimine, sihtrühmade testimine
- Eelarve monitooring — kas päevaeelarve on paigas

**Iganädalane:**
- ROAS per kanal ja kampaania
- Soovitused eelarve ümberjaotamiseks
- Uute märksõnade/sihtrühmade testimise ettepanekud

**Hooajalised kampaaniad:**
- Jõulud, suvehooaeg, back-to-business (september)
- Black Friday, Mother's/Father's Day (tööriistad!)
- Sektoripõhised (catering'i kõrghooaeg suvel)

---

## Osakond 6: Operatsioonid

> Faas 2-3

### 6.1 Laohaldur

| | |
|---|---|
| **Roll** | Laoseisu jälgimine, feed synci järelkontroll, probleemide tuvastamine |
| **Mudel** | Haiku 4.5 / Sonnet 4.6 (Max) |
| **Käivitaja** | Cron: iga 4h (feed synciga sünkroonis) + nõudmisel |

**Iga 4h (pärast feed synci):**
- Uute toodete tuvastamine — mitu lisati, mis kategooriad
- Laost otsa saanud toodete märgistamine ja raport
- Hinnamuutuste tuvastamine — mis toodetel hind muutus, kas *1.15 on paigas
- Vigaste andmete tuvastamine (puuduvad pildid, valed hinnad)

**Igapäevane raport (→ Slack):**
- Mitu tellimust ootab saatmist
- Kriitilised tooted (otsa saamas, populaarsed aga vähe laos)
- Aeglased tooted (laos palju, ei müü)
- Tarne probleemid (VEVOR viivitused)

### 6.2 Kvaliteedikontroll

| | |
|---|---|
| **Roll** | Tooteandmete ja saidi tervise audit |
| **Mudel** | Sonnet 4.6 (Max) |
| **Käivitaja** | Cron: igapäevane |

**Tooteandmete audit:**
- Puuduvad pildid
- Vigased/puuduvad kirjeldused
- Valed hinnad (ei vasta *1.15 valemile)
- Valed kategooriad, topelt-listingud

**Saidi tervisekontroll:**
- Katkised lingid (404-d)
- Aeglased lehed (LCP > 2.5s)
- Mobiilivaate probleemid
- SSL/sertifikaadi kehtivus

**Raport (→ Slack):** "12 tootel puudub pilt, 3 tootel vale hind, 2 katkist linki"

### 6.3 Tootehaldur

| | |
|---|---|
| **Roll** | Tootekataloogi kvaliteedi ja asjakohasuse haldamine |
| **Mudel** | Sonnet 4.6 (Max) |
| **Käivitaja** | Cron: iganädalane + nõudmisel |

**Regulaarne töö:**
- Toodete tõlkimine eesti keelde (~14K toodet, turundusplaanist)
- Tootekirjelduste parandamine (koostöös Sisulooojaga)
- Populaarsete toodete esiletõstmine (PostHog andmete põhjal)
- Uute VEVOR toodete hindamine: kas lisada sortimenti, mis kategooriasse

---

## Juhtpaneel (Dashboard)

Kõigi osakondade kohal on juhtpaneel — üks koht kust näeb kogu AI meeskonna tööd.

### Vaated

**Ülevaade (avaleht):**
- 6 osakonna kaardid, iga kaardi peal:
  - Staatus (aktiivne / viimati jooksnud / probleem)
  - Viimane tegevus ja aeg
  - Põhinumber (nt "Eilsed vestlused: 14" või "Nädala käive: 2 340€")

**Osakonna detailvaade:**
- Kõik selle osakonna agendid
- Viimased raportid ja tegevused
- Manuaalne käivitamine ("Tee analüüs kohe", "Saada nädalaraport")
- Logid — mida agent viimati tegi

**Kulud:**
- API tokenid per osakond (päev/nädal/kuu)
- Max plaani kasutus
- Trend — kas kulud kasvavad/kahanevad

### Tehniline teostus
- Eraldi admin-vaade (ligipääs Risto/Tarmo)
- Andmed: agentide logid + Medusa + PostHog + Slack sõnumid
- Faas 2 — ehitatakse koos esimeste taustaagentidega

---

## Käivitajate kokkuvõte

| Käivitaja | Agendid | Sagedus |
|-----------|---------|---------|
| **Reaalaeg (chat)** | Claudia, Tootespetsialist, Ärikliendihaldur | Iga kliendi sõnum |
| **Reaalaeg (email)** | Tugiagent, Tagastuste haldur | Iga sissetulev email |
| **Cron iga 4h** | Laohaldur | Feed synciga sünkroonis |
| **Cron igapäevane** | PostHog analüütik, Kvaliteedikontroll | Hommikul |
| **Cron 2x nädalas** | Sisulooja | E, N |
| **Cron iganädalane** | Äriraporteerija, SEO spetsialist, Tootehaldur, Kampaaniahaldur | Esmaspäev hommik |
| **Cron igakuine** | Äriraporteerija (laiendatud) | Kuu 1. kuupäev |
| **Cron kvartaalne** | Turu-uurija | Kvartali algus |
| **Nõudmisel** | Kõik agendid | Dashboardist või Slackist |

---

## Sõltuvused ja eeldused

### Tehniline

| Sõltuvus | Staatus | Vajalik faasis |
|----------|---------|----------------|
| Anthropic API (Haiku + Sonnet) | Seadistatav | 1 |
| Claude Max plaan | Aktiivne | 1 |
| MeiliSearch | Töötab | 1 |
| Medusa API | Töötab | 1 |
| PostHog API | Integreeritud, API ligipääs vajab seadistust | 1 |
| Emaili monitooring (IMAP/webhook) | Puudub | 2 |
| Google Ads API | Puudub | 3 |
| Facebook Ads API | Puudub | 3 |
| Blogi infrastruktuur | Puudub | 3 |

### Äriline

- **Turu-uuring** (Faas 2 eeldus) — B2B sektorite prioriteerimine, prompti valmis
- **Tagastuspoliitika** dokumenteerimine — Tugiagent ja Tagastuste haldur vajavad selgeid reegleid
- **B2B hinnapoliitika** — hulgiallahindlused, arvelduskontod? (Tarmo otsustab)
- **Sisuloome suunised** — mis toon, mis teemad, mis keeles (eesti? inglise? mõlemad?)
- **Reklaamieelarved** — turundusplaanist: ~800€ kuu 1, ~1500-3000€ kuu 2+

---

## Mida AI EI tee (inimene otsustab)

- Raha tagastamine (agent valmistab ette, inimene kinnitab)
- Hinnastrateegia muutmine (agent soovitab, inimene otsustab)
- Turunduseelarve suurendamine
- Uute sektorite avamine B2B-s
- Garantiipretensioonide lõplik lahendamine
- Tarnija vahetamine
- Juriidilised küsimused

Iga otsus mis puudutab raha väljaminekut, lubadusi kliendile, või strateegilist suunda — agent valmistab ette ja saadab Slacki kinnitamiseks.

---

## Järgmised sammud

1. **Kohe:** turu-uuring (prompt valmis, eraldi sessioon)
2. **Faas 1:** Claudia + Tootespetsialist implementeerimine (spec olemas: `2026-04-15-ai-sales-agents-design.md`)
3. **Faas 1:** PostHog analüütiku seadistamine (API + cron + Slack raportid)
4. **Pärast turu-uuringut:** Faas 2 planeerimine — B2B sektorid, Tugiagent, Dashboard
5. **Tarmo kinnitab:** B2B hinnapoliitika, reklaamieelarved, tagastuspoliitika detailid

---

## Seotud dokumendid

- [AI Sales Agents — tehniline spec](2026-04-15-ai-sales-agents-design.md)
- [Turu-uuringu prompt](2026-04-15-market-research-prompt.md)
- [Turundusplaan](../../turundusplaan.md)
- Turu-uuringu tulemused (tulemas): `docs/research/2026-04-15-b2b-market-research.md`
