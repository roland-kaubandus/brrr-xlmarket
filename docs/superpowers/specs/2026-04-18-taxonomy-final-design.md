# XLMarket Taksonoomia — Lõplik Kava (sünteesitud)

**Kuupäev:** 2026-04-18
**Autor:** XL (Claude Opus, 4 paralleelset agenti + 2 varasemat ettepanekut)
**Allikad:** `taxonomy-audit-2026-04-18/proposal-agent-{1,2,3-reality,3-architecture,3-customer,3-seo}.md`
**Turgude fookus:** EE (esmane), ES (roadmap)
**Sihtgrupp:** mikroettevõtjad ja uue tegevusala käivitajad — kohvik, autoremont, haljastus, laser-äri, pagariäri, keevituskoda, salong

---

## 0. Executive summary

Säilita v3 22-L1 taksonoomia struktuurselt, **lahenda koristus + ehita paralleelne vertikaali-kiht**, mis teenindab alustavaid ettevõtjaid võrdselt klassikalise kategooriate-sirvimise kõrval. Pood muutub **kahe režiimiga**:

- **Režiim 1 — Sirvi (know-what):** `/kategooriad/{slug}` — kes teab, mida vaja
- **Režiim 2 — Alustajale (jobs-to-be-done):** `/alustajale/{vertikaal}` — "avan kohviku, mida vajan?"

Mõlemad jagavad sama tootelauda, aga lõikavad seda eri vaatenurgast.

**Põhimehhanism:** üks machine-readable `taxonomy.yaml` on ainus tõe allikas. DB, `branches.ts`, MegaMenu, sitemap, Meili indeks, redirect'id kõik tuletatakse sellest. Drift saab füüsiliselt võimatuks.

**Feed → taksonoomia:** deterministlik 8-etapiline pipeline (override → path → keyword → NN → LLM → review bucket) confidence-loguga ja review-queue'ga. Tarmo saab admin UI kaudu edge case'e kinnitada/ümber suunata; selle toimingust luuakse automaatne reegel, mis laieneb tagasi kogu feedile.

**Faasimine:** 6 faasi üle ~1 nädala kodeerimise + 6-8 nädalat vertikaalide lisamiseks. Iga faas iseseisvalt deployable ja revertitav.

---

## 1. Põhimõtted (invariants)

Need on mitte-läbiräägitavad. Iga ülejäänud otsus tuleneb nendest.

1. **Single source of truth.** `taxonomy.yaml` defineerib iga L1/L2/L3. DB, branches.ts, MegaMenu, sitemap, Meili indeks, redirect'id — kõik derivate artefaktid, mitte käsitsi kirjutatud.
2. **Slug = stabiilne identifikaator, mitte nimi.** Kui slug on avalikkuses, on see *immutable*. Display-nimed tõlgitakse runtime'is, slug ei.
3. **Iga toode kuulub täpselt ühte kanooniliseks radu (L1, L2?, L3?).** Ei mingit dual-L1. Ristlingimine lahendatakse "See also" väljadega, mitte dubleeriva kategoriseerimisega.
4. **Taksonoomia ja vertikaalid on ortogonaalsed teljed.** Taksonoomia vastab küsimusele "mis asi see on?". Vertikaal vastab "mis äri jaoks?". Need lõikuvad, aga üks ei kirjuta teist üle.
5. **Iga import-jooks lõppeb teadliku seisundiga.** Toode on kas kindlustatud confidence ≥ threshold, või **eksplitsiitselt review-queue'i pandud**. Ei ühtegi "other" vaikset koondit.
6. **Iga invariant on CI/cron-iga kontrollitav.** Kui invariant'i ei saa automaatselt kontrollida, seda praktikas ei eksisteeri.
7. **Redirect'id on reeglitest tuletatud, mitte käsitsi kirjutatud.** `next.config.ts` redirect block tühjeneb; kõik tuleb `slug_redirect` tabelist.

---

## 2. Praeguse seisu faktid (Agent A — reality)

Konteksti jaoks enne kõiki muudatusi. Numbrid 2026-04-18 seisuga.

### 2.1 DB

- **14 842 toodet** kokku
- **14 841** on v3 L1 külge linkitud (99,993%)
- **1** stranded toode (`Other > Other > Other`, resolver skip-listis)
- **434 L1 kirjet** `product_category` tabelis (ainult 22 on aktiivselt v3)
- **382 tühja shell'i** (VEVOR feed artefakt, 0 toodet)
- **31 tripleeritud handle'it** — iga handle esineb 3× DB-s (sh `playground-sets`)
- **3 359 toodet** on samaaegselt v3 + legacy L1-l (migratsioon lisas v3, aga ei eemaldanud legacy)

### 2.2 V3 L1 toodete jaotus

| Slug | Tooted | Status |
|---|---|---|
| horeca-food-service | 1 907 | OK |
| hand-power-tools | 1 729 | OK, "suur sahtel" aga eraldi L2-dega lahendatav |
| automotive-workshop | 1 540 | OK |
| office-commercial-interiors | 1 528 | OK |
| outdoor-power-landscaping | 1 407 | OK |
| fitness-sports-recreation | 1 067 | OK |
| construction-building | 1 042 | OK |
| warehousing-material-handling | 787 | OK |
| electrical-energy | 744 | OK |
| health-medical-supply | 710 | OK |
| plumbing-water-systems | 593 | OK |
| printing-packaging-signage | 430 | OK |
| hvac-climate-control | 344 | OK |
| welding-metalworking | 277 | OK |
| safety-security-workwear | 252 | OK |
| boating-camping-outdoor | 178 | OK |
| fuel-lubrication-fluid | 119 | OK |
| cleaning-janitorial | 103 | OK |
| laser-cnc-digital-fabrication | **42** | **Madal — 3D printerid lähevad printing-packaging'sse** |
| woodworking-carpentry | **24** | **Madal — VEVOR feedi `Tools|Woodworking Tools` alakasutatud** |
| salon-spa-wellness | **9** | **Kriitilises vähem — kas peida või kasvata** |
| music-entertainment | **9** | **Kriitilises vähem — kas peida või kasvata** |

### 2.3 VEVOR feedi reaalsus

- **57 unikaalset VEVOR L1** väärtust toodete metadata'is (`vevor_product_type` juurel)
- **58 `l1_defaults` kirjet** resolveris (kõik 57 feed L1 on kaetud)
- **100% resolver-coverage** aktiivsest feedist (v.a. 1 `Other`, mis on skip-listis)

### 2.4 MeiliSearch

- 14 842 dokumenti, 61.9 MB
- `category_handles` on **lame array** — L1/L2/L3 struktuurselt eristatavad pole
- `maxTotalHits: 5000` — suurim L1 on 1 907, seega hetkel OK, aga globaalne search cap'itub
- **Puudub:** eraldi `taxonomy.l1_slug`/`l2_slug`/`l3_slug` väljad; `vevor_product_type`; `vertical_slugs`

### 2.5 Teadaolevad bugid (10, kõigil file:line viited)

- BUG-01: 3 359 dual-assignment'i
- BUG-02: 31 tripleeritud handle'it
- BUG-03: `playground-sets` redirect ↔ taxonomy-v3 subSlug kollisioon (`next.config.ts:29` vs `taxonomy-v3.ts:119`)
- BUG-04: Meili `maxTotalHits: 5000` cap
- BUG-05: laser-cnc: 42 toodet (3D printerid mujal)
- BUG-06: salon / music: 9 toodet
- BUG-07: woodworking: 24 toodet
- BUG-08: `lib/menu-order.ts` on surnud legacy fail
- BUG-09: `branches.ts` vs `taxonomy-v3.ts` drift (2 faili, samad 22)
- BUG-10: 1 orphan toode (`Other > Other > Other`)

---

## 3. Lõplik taksonoomia (22 L1 + L2 + L3 reeglid)

### 3.1 L1 nimekiri (lõplik, 22)

URL: `/{locale}/kategooriad/{slug}`. Slug'id jäävad ingliskeelseks (infrastruktuur); display-nimed tulevad `taxonomy_node_translation` tabelist.

| # | Slug | Name (EN) | Nimi (ET) | Nombre (ES, hilisem) |
|---|---|---|---|---|
| 01 | `horeca-food-service` | HoReCa & Food Service | Suurköök ja Toitlustus | HoReCa y Restauración |
| 02 | `laser-cnc-digital-fabrication` | Laser, CNC & Digital Fabrication | Laser, CNC ja Digitaaltootmine | Láser, CNC y Fabricación Digital |
| 03 | `welding-metalworking` | Welding & Metalworking | Keevitus ja Metallitöö | Soldadura y Metalurgia |
| 04 | `printing-packaging-signage` | Printing, Packaging & Signage | Trükk, Pakendamine ja Reklaam | Impresión, Embalaje y Rótulos |
| 05 | `electrical-energy` | Electrical & Energy | Elekter ja Energia | Electricidad y Energía |
| 06 | `woodworking-carpentry` | Woodworking & Carpentry | Puidutöö ja Tisleritöö | Carpintería y Ebanistería |
| 07 | `construction-building` | Construction & Building | Ehitus ja Remont | Construcción y Edificación |
| 08 | `cleaning-janitorial` | Cleaning & Janitorial | Puhastusteenindus | Limpieza y Mantenimiento |
| 09 | `hand-power-tools` | Hand & Power Tools | Käsi- ja Elektritööriistad | Herramientas Manuales y Eléctricas |
| 10 | `fuel-lubrication-fluid` | Fuel, Lubrication & Fluid Management | Kütus, Määrded ja Vedelikud | Combustible, Lubricación y Fluidos |
| 11 | `outdoor-power-landscaping` | Outdoor Power & Landscaping | Aiatehnika ja Maastikuhooldus | Equipos de Exterior y Jardinería |
| 12 | `warehousing-material-handling` | Warehousing & Material Handling | Laondus ja Materjalikäitlus | Almacenaje y Manutención |
| 13 | `hvac-climate-control` | HVAC & Climate Control | Kliima ja Ventilatsioon | HVAC y Climatización |
| 14 | `plumbing-water-systems` | Plumbing & Water Systems | Torustik ja Veesüsteemid | Fontanería y Sistemas de Agua |
| 15 | `safety-security-workwear` | Safety, Security & Workwear | Ohutus, Turve ja Tööriietus | Seguridad y Ropa Laboral |
| 16 | `automotive-workshop` | Automotive & Workshop | Autohooldus ja Töökoda | Automoción y Taller |
| 17 | `salon-spa-wellness` | Salon, Spa & Wellness | Salong, Spa ja Heaolu | Salón, Spa y Bienestar |
| 18 | `office-commercial-interiors` | Office & Commercial Interiors | Kontor ja Äriinterjöör | Oficina e Interiores Comerciales |
| 19 | `health-medical-supply` | Health & Medical Supply | Tervis ja Meditsiinivarustus | Salud y Material Médico |
| 20 | `fitness-sports-recreation` | Fitness, Sports & Recreation | Sport, Fitness ja Vaba Aeg | Fitness, Deporte y Ocio |
| 21 | `boating-camping-outdoor` | Boating, Camping & Outdoor Adventure | Paadindus, Matk ja Seiklus | Náutica, Camping y Aventura |
| 22 | `music-entertainment` | Music & Entertainment | Muusika ja Meelelahutus | Música y Entretenimiento |

**Muudatused v3-st:**
- `playground-sets` subSlug (Fitness all) → **`playground-outdoor-play`** (kollisioon redirect'iga)
- `hand-power-tools` nime NE muudeta (2 000 toote 301-d liiga kulukas) — lahendame tugeva L2 struktuuriga

### 3.1.1 Madala-tootearvuga L1 reegel — **strateegia-põhine, mitte automaatne**

Varasem versioon lülitas `showInMegaMenu: false` mehhaaniliselt kõik L1-d kus <30 toodet. See on vale, sest peidab ära **suure strateegilise potentsiaaliga kategooriaid, mida uuring (b2b-market-research.md §1) eksplitsiitselt prioritiseerib**.

**Lõplik reegel:** iga madala tootearvuga L1 klassifitseeritakse ühte kolmest kategooriast:

| Klass | Tegevus | Kriteeriumid |
|---|---|---|
| **A — STRATEEGILINE** | Jääb MegaMenu's nähtavaks. Investeeri resolveri-reeglitesse (S2-S5), et kasvatada tootearvu. Ehita vertikaali (`/alustajale/`) samal ajal. | Uuring märgib prioriteet-sektoriks VÕI selge kasvu-potentsiaal + vähemalt üks vertikaali-kit sellest sõltub |
| **B — HOOLDA** | Jääb nähtavaks, aga ei investeeri kasvatamisse. Tavapärane L2-struktuur. | Mitte prioriteet, aga sisuliselt olemas — UI-s ei peida, aga ka aktiivselt ei sihi |
| **C — PEIDA** | `showInMegaMenu: false` kuni >30 toodet. Vastab uuringu "sektorid mida MITTE sihtida" soovitusele. | Mitte uuringu prioriteet, madal konkurentsieelis, nõrk buyer-persona |

**Konkreetne klassifikatsioon praegustele madalatele L1-dele:**

| L1 | Tooted | Klass | Põhjendus |
|---|---|---|---|
| `laser-cnc-digital-fabrication` | 42 → **~200 pärast 3D-printer fix** | **A — STRATEEGILINE** | Uuring §1 prioriteet #2: "nišiturg ilma kohalike tarnijateta. Kohalikud alternatiivid algavad €5000+". Agent D: top-3 Google rank saavutatav 4-6 kuud. Agent C: oma vertikaal (`/alustajale/laser-graveerijad`). **Jääb nähtavaks. Investeerime.** |
| `woodworking-carpentry` | 24 → sihtarv 150+ | **B — HOOLDA** | V3 spec projekteeris 150+, aga VEVOR feed `Tools|Woodworking Tools` on alakasutatud. Resolveri laienduse kaudu saab kasvada, aga mitte uuringu top-3. Jääb nähtavaks, tavapärane L2. |
| `salon-spa-wellness` | 9 | **C — PEIDA** | Uuring §2 "watch-list" sektor, mitte prioriteet. Ilusalong vertikaal on plaanis (Agent C), aga L1 ise MegaMenu's genereerib negatiivset usalduse-signaali. `showInMegaMenu: false` kuni ≥30. Vertikaal `/alustajale/ilusalong` teenindab vajadust eraldi. |
| `music-entertainment` | 9 | **C — PEIDA** | Uuring ei maini prioriteedina. 9 toodet top-level kategoorias on ostja-usalduse-risk. `showInMegaMenu: false` kuni ≥30. |

**Oluline vahe laser-cnc ja music-entertainment vahel:**
- **Laser-cnc: 42 toodet, mis on tulevikus 200+ pärast 3D-printer migratsiooni (§5.5), uuring märgib #2 prioriteediks.** Peidame ära tähendaks ennast SEO-eelisest ja kasvupotentsiaalist ilma jätta.
- **Music-entertainment: 9 toodet, mille all pole strateegiat.** Peidame ära vastab uuringu "mitte-sihtida" soovitusele.

**3 kuu pärast audit:** iga **C — PEIDA** L1 vaadatakse uuesti üle. Kui tootearv kasvas >30 → liikume B-sse või A-sse. Kui ei, kaalume L1 merge'i sarnasesse (nt `music-entertainment` → `office-commercial-interiors/entertainment-venues`).

### 3.2 L2 struktuur

**Kõigil L1-del on 4-8 L2**, L2-del 0-12 L3. Kogu nimekiri elab `taxonomy.yaml`-is. Siin mõned näited, et illustreerida reegleid.

```yaml
horeca-food-service:   # L1
  name_et: "Suurköök ja Toitlustus"
  subs:
    - commercial-refrigeration           # L2
      subs:
        - commercial-refrigerators        # L3
        - ice-machines
        - display-cases
        - bain-maries
    - commercial-cooking-equipment
      subs: [commercial-ovens, combi-ovens, pizza-ovens, deep-fryers, induction-cookers]
    - food-preparation-equipment
    - bar-beverage-service
      subs: [espresso-machines, grinders-on-demand, blenders, juicers]
    - commercial-sinks-washdown
    - restaurant-storage-shelving
    - restaurant-furniture
    - kitchen-hvac-air-curtains

laser-cnc-digital-fabrication:
  subs:
    - co2-laser-engravers-cutters
    - diode-laser-engravers
    - cnc-routers-mills
    - 3d-printers                         # MIGREERITUD printing-packaging-st
    - laser-cnc-accessories
      subs: [rotary-attachments, honeycomb-tables, cnc-spindles]

hand-power-tools:
  subs:
    - power-tools
      subs: [drills, grinders, sanders, saws]
    - hand-tools
    - air-compressors-pneumatic
    - measuring-layout-tools
    - power-tool-accessories
    - tool-storage-cases
    - workbenches
```

Täielik nimekiri (22 L1 × ~6 L2 = ~132 L2, + ~60 L3 kus >50 toodet) elab failis `backend/src/data/taxonomy.yaml`. Ehitatakse Faasis 1.

### 3.3 L3 reegel

L3 eksisteerib **füüsiliselt DB-s** ainult kui:
- L2 sisaldab >50 toodet *ja* on selge alamkategoriatega, VÕI
- Verticaali starter kit vajab seda eristust (nt `diode-laser-engravers` vs `co2-laser-engravers`)

Muidu L3 elab ainult `taxonomy.yaml`-is + Meili `taxonomy.l3_slug`-is, aga ei saa oma lehte. Tooteloendi filter teeb selle ülearuseks.

### 3.4 Slug-skeem reeglid

1. **Inglise keeles, kebab-case.** ET-is UI-st tõlgitakse runtime'is.
2. **Max 5 sidekriipsuga tokenit.** Abreviatsioonid OK (`hvac`, `cnc`, `mig`).
3. **Globally unique** üle kogu puu (Medusa enforce'ib).
4. **Ei redirect-allikaga kollisiooni.** Enne lisamist: `grep {slug} slug_redirect.from_slug`.
5. **Stabiilsus:** kui slug on avalik, rename = 301 + permanent `slug_redirect` kirje.
6. **Reserveeritud prefix'id:** `/alustajale/`, `/hooldus/`, `/arikliendile/`, `/toode/`, `/haru/` — ära kasuta kategooria-slugina.

### 3.5 Category page UX (lõplik, 2026-04-18 — kasutaja ülevaatlik spetsifikatsioon)

Iga kategoorialeht (`/{locale}/kategooriad/{handle}`) — sõltumata kas L1, L2, L3 või Ln — peab renderdama **täpselt sama struktuuri**. Ainus erinevus sõltuvalt tasemest on see, **mida karusellile kuvatakse** (järgmise taseme lapsed).

#### 3.5.0 Terminoloogia ja üks tõde

- **Ainus taksonoomia portaalis:** `backend/src/data/taxonomy.yaml` (SSoT). Kõik lehed, menüüd, breadcrumbid, karussellid, sidebaril, tootekaart, SEO lugevad **ainult** `category-tree.generated.json` (YAML-ist tuletatud) kaudu.
- **VEVOR taksonoomiat portaali ei tooda kunagi.** VEVOR path kasutab ainult Resolver v2 (§5) sisendina, et paigutada toode meie taksonoomiasse. VEVOR slug'e, nimesid ega kategooriaid ei kuvata kunagi.
- **L1 kuni Ln:** "leht" tähendab taksonoomia sõlme mis tahes sügavusel. Reeglid on identsed igal tasemel; erinevus on ainult "millised lapsed on karusellil" ja "millal toode avaneb" (vt §3.5.2).

#### 3.5.1 Lehe struktuur (top → bottom)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (logo + MegaMenu + search + cart)                    │ ← site-wide
├─────────────────────────────────────────────────────────────┤
│ BREADCRUMB:  Avaleht › L1 [ › L2 [ › L3 [ ... [ › Ln ]]]]   │ ← §3.5.3
├─────────────────────────────────────────────────────────────┤
│ ALAMKATEGOORIATE KARUSELL (FULL WIDTH, ühe tulbaga)         │ ← §3.5.4
│  [pilt] [pilt] [pilt] [pilt] [pilt] [pilt] › › › ›          │
├─────────────────────────────────────────────────────────────┤
│ H1 {kategooria nimi}  ·  {N} toodet                         │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   FILTRID    │    PRODUCT GRID (4 veergu)                   │ ← §3.5.5 + §3.5.6
│  (adaptiivsed│                                              │
│   Meili      │    [prd] [prd] [prd] [prd]                   │
│   facets)    │    [prd] [prd] [prd] [prd]                   │
│              │    ...                                       │
│              │    Pagination                                │
├──────────────┴──────────────────────────────────────────────┤
│ HISTORY (hiljuti vaadatud, sama L1 seest)                   │ ← §3.5.7
├─────────────────────────────────────────────────────────────┤
│ DEALS (sama L1 seest, kõrgeima allahindlusega)              │ ← §3.5.7
├─────────────────────────────────────────────────────────────┤
│ BEST SELLERS (sama L1 seest, popularity desc)               │ ← §3.5.7
├─────────────────────────────────────────────────────────────┤
│ FOOTER                                                       │
└─────────────────────────────────────────────────────────────┘
```

#### 3.5.2 Millal avaneb tooteleht vs kategooria leht

- **Kui praegusel sõlmel on ≥1 laps, millel on ≥1 toode** → kuvatakse kategooria-leht (karusell + grid).
- **Kui praegusel sõlmel pole ühtegi last toodetega** → karusell peidetakse, kuvatakse ainult grid (leaf-käitumine). Sõlm ise on leaf.
- **Kui kasutaja klikib karusellil lapse-sõlmel ja selle lapsel on omakorda lapsed toodetega** → edasi sama malli järgi (drill-down). Breadcrumb kasvab ühe sammu võrra. See jätkub kuni leaf-tasemeni.
- **Karussellist kaob sõlm, millel on 0 toodet praeguse päringu kontekstis.** Vt §3.5.4.

#### 3.5.3 Breadcrumb invariants

1. **Vorm:** `Avaleht › L1 › L2 › … › Ln` — praegune sõlm on **alati viimane** ja kuvatud tekstina (non-link või `aria-current="page"`).
2. **Ei kuva kunagi toote nime.** Breadcrumb lõppeb kategooria viimase astmega. Toote detail-lehel (§ `/toode/{handle}`) breadcrumb näitab tootega seotud kategooriaketti (vt Faas 5b F5b.7); see on eraldi spec.
3. **Iga link on klikitav ja navigeerib tagasi sellesse sõlme** — kasutaja saab vabalt üles liikuda.
4. **Allikas:** `getBreadcrumbTrail(handle)` + `getAncestors(handle)` `category-tree.generated.json`-ist. **Mitte** Medusa `parent_category` walk. **Mitte** VEVOR path.
5. **Locale:** kuvatav nimi tuleb `nodeName(node, locale)` kaudu (`name_et` / `name_en` / `name_es`). Slug on stabiilne ingliskeelne identifikaator.
6. **Tase-õigsus:** `trail.length === depth(handle) + 1` (Avaleht + iga sõlm juureni). INV-24 kontrollib seda iga URL-i jaoks smoke-testis.

#### 3.5.4 Alamkategooriate karusell (full-width)

| Nõue | Detail |
|------|--------|
| **Laius** | 100% sisu-konteineri laiusest. Scroll horizontally, snap-to-item. |
| **Asukoht** | Breadcrumb'i all, H1 ja grid'i kohal. **Enne filtreid ja toote-grid'i.** |
| **Sisu L1 lehel** | Kõik `getChildren(L1)` = L2 sõlmed, millel on **≥1 toode kättesaadav** |
| **Sisu L2 lehel** | Kõik `getChildren(L2)` = L3 sõlmed, millel on **≥1 toode kättesaadav** |
| **Sisu Ln lehel** | Kõik `getChildren(Ln)` = L(n+1) sõlmed, millel on **≥1 toode kättesaadav** |
| **Leaf lehel** | Karusell peidetakse täielikult (ei pilu-containerit, ei tühja ruumi) |
| **Kaart** | Pilt (`CategoryThumb`, §Faas 5b) + nimi. Klikk → `/{locale}/kategooriad/{child.handle}`. |
| **Pildid** | **Kõikidel kategooriatel on pilt**, kasutades `image_path` SSoT'ist + alias-map + L1-SVG fallback (§Faas 5b). Kaart ilma pildita on invariant-rikkumine. |
| **Tühjad peidetakse** | Alamkategooria, mille tootearv (pärast stock-filtrit) = 0, **ei kuvata karusellil**. INV-25. |
| **Sort** | `sortOrder` `taxonomy.yaml`-ist; tie-break tootearvu järgi desc. |
| **Tagasiliikumine** | Kui praegu oleme L3-l ja kasutaja klikib breadcrumb'is "L2", siis L2 karusell peab näitama sama L3 sõlme, kust tulime, **esmase positsioonina** (scroll-into-view + accent-state). |
| **Keyboard** | `aria-label`, `role="list"`, arrow keys scroll, Enter avab. |

**Andmeallikas:** ühine päring `getChildrenWithProductCounts(handle)`:
- Sisendiks kasutatakse Meili `taxonomy.ancestors` facet'it: üks päring tagastab kõigi alamsõlmede tootearvud koos.
- Päring kaasab `in_stock = true` filtri (tühjade peitmine vastab spec-nõudele "kategooriaid, millel ei ole ühtegi toodet, ei kuvata").

#### 3.5.5 Filtrid (sidebar, vasakul)

| Nõue | Detail |
|------|--------|
| **Asukoht** | Vasak veerg, karuselli all (H1 kõrval, grid'i kõrval). Sticky desktop-is, drawer mobiilis. |
| **Adaptiivsus** | Facetid tuletatakse **elavalt praeguse päringu tulemusest** (Meili `facetDistribution`). Mitte staatilist listi. Tüüp-põhised facetid: hind, saadavus, brändid, whitelisted `attributes.*` (voltage, power_kw, …). |
| **Sõltuvalt tasemest** | L1 lehel: laiem facet-set (L2, bränd, hind, atribuudid). L2/L3 lehel: kitsam (ainult relevantsed atribuudid). Alamkategooria-filter **ei dubleeri karuselli** — kui karusell katab ühe tasme, ei ole facet'is sama tasme. |
| **URL state** | Kõik filtrid persistitakse query-parameetritesse (`?brand=bosch&min=100&max=500`). Tagasi-nupp taastab. |
| **Reset** | Eraldi "Tühjenda filtrid" nupp. Karusellil olev sõlme valimine = navigeerimine lapse lehele (mitte facet-filter). |

#### 3.5.6 Product grid

| Nõue | Detail |
|------|--------|
| **Veerud** | **4 veergu desktop-is** (≥1280px). 3 veergu 1024–1279px. 2 veergu tabletil. 1 veerg mobiilis. |
| **Leheküljel** | 24 toodet per lehekülg (`ITEMS_PER_PAGE = 24`). |
| **Päring** | Meili `filter: taxonomy.ancestors = "{handle}" AND in_stock = true` + sort + facetid. `taxonomy.ancestors` võimaldab ühe filtriga kaasata kogu sõlme alampuu. |
| **Sort** | SortSelect: relevance (vaikimisi), hind ↑/↓, uusim, popularity. |
| **Pagination** | Tagasi-edasi + lehenumbrid. URL `?page=N`. |

#### 3.5.7 Lehe jaluseelsed ribad (history / deals / best sellers)

Kõik kolm on **sama L1 kontekstis** — st päring kasutab `taxonomy.ancestors = "{currentL1}"`. L1 tuvastatakse `getL1Ancestor(handle)` kaudu (praeguse sõlme esivanem juurtasandil).

| Riba | Allikas | Sort | Limit |
|------|---------|------|-------|
| **History** (hiljuti vaadatud) | Kliendi local-storage `xl.recently_viewed[]` (product id + vaatamise aeg); Meili `filter: id IN (...) AND taxonomy.ancestors = currentL1` | Vaatamise aeg desc | 12 |
| **Deals** | Meili `filter: taxonomy.ancestors = currentL1 AND discount_pct > 0 AND in_stock = true` | `discount_pct:desc` | 12 |
| **Best sellers** | Meili `filter: taxonomy.ancestors = currentL1 AND in_stock = true` | `popularity:desc` | 12 |

- Kui riba oleks tühi (nt uus kasutaja ilma history'ta), riba **peidetakse täielikult**.
- Cursor-karusellid (sama UI pattern nagu §3.5.4, aga väiksemad kaardid).
- `currentL1 === handle` (st kasutaja on juba L1-l) ei muuda midagi — päring on siiski `taxonomy.ancestors = handle`.

#### 3.5.8 Andmeallikas (kokkuvõte)

Lehe rendereerimiseks tarvis olev info tuleb **ühest** SSoT'ist + Meili päringutest. Mitte kunagi Medusa `parent_category`-walk, mitte kunagi hardcoded nimestik, mitte kunagi VEVOR array.

| Vajadus | Allikas |
|---------|---------|
| Sõlme metadata (nimi, slug, ikoon, image_path) | `category-tree.generated.json` → `getNode(handle)` |
| Breadcrumb | `getBreadcrumbTrail(handle)` |
| Karuselli lapsed | `getChildren(handle)` + Meili fact count (tühjade filter) |
| Filtrite facet-list | Meili `search(..., { facets: [...] })` sama päringust |
| Product grid | Meili `search` + `filter: taxonomy.ancestors = handle` |
| L1 root history/deals/best sellers | `getL1Ancestor(handle)` + Meili päringud |

#### 3.5.9 Invariants (täiendab §8)

| ID | Invariant | Check |
|----|-----------|-------|
| INV-24 | Kõigil 22 L1 URL-il `getBreadcrumbTrail()` lõppeb kategooriaga, mitte tootega | smoke-test |
| INV-25 | Kategoorialeht ei kuva karussellil 0-toote alamsõlmi | UI smoke + Meili count diff |
| INV-26 | Iga karuselli-kaardil on `image_path` resolveeritud (direct/alias/none ≠ missing) | INV-20 laiendus |
| INV-27 | Breadcrumb `trail.length === depth(handle) + 1` iga URL-i kohta (22 L1 smoke) | JSON compare |
| INV-28 | Product grid päring kasutab `taxonomy.ancestors`, mitte `category_handles` (vältimaks legacy drift) | source scan CI |
| INV-29 | 4-veeruline grid ≥1280px viewport'il (Playwright visual invariant) | E2E regression |

**Marsruut deduplication:** `/haru/{slug}` 301 → `/kategooriad/{slug}` (middleware.ts, spec F4.8). `/haru/` route fail jääb alles ainult tagasiühilduvuseks; kogu UI ja sisemised lingid kasutavad `/kategooriad/`.

**Esilehe (HomepageShell) lingid** käivad samuti SSoT'ist (`getChildren(L1.slug)`), mitte hardcoded `subSlugs[]` massiividest. See garanteerib et igal homepage'i L2 lingil on tegelik DB L2 vaste.

**Põhjus miks see ei olnud algselt §3-s:** Faas 1-5 keskendusid andmete konsolidatsioonile (DB seosed, Meili facetid, vertikaalid). UX eeldas et `/kategooriad/[handle]/page.tsx` on juba terve, aga see leht oli tegelikult MVP dump-leht ilma hierarhia tugiteta. Avastatud 2026-04-18 öösel kasutaja screenshot'iga, kus L2 link viis 2-toote dump-lehele. Parandus: `storefront/lib/category-tree.ts` + `gen-category-tree.mjs` (SSoT YAML → JSON snapshot) + `kategooriad/[handle]/page.tsx` ümber-juhtmestik. **Post-Faas 5b audit (2026-04-18 öö, kasutaja QA):** 10/10 linki ei teinud õiget asja → seetõttu kirjutatud §3.5 täielikult lahti (§3.5.0–§3.5.9).

### 3.6 MegaMenu (lõplik, N-level SSoT)

| Nõue | Detail |
|------|--------|
| **Sügavus** | **L1 kuni Ln** — rekursiivne drill. Mitte ainult L2. Iga sõlm, millel on lapsi (≥1 toode), saab sublevel'i. |
| **Pildid** | **Alates L2-st kuvatakse iga kategooria pilt** (`image_path` SSoT + alias + L1-SVG fallback). L1 ikoonid on SVG (header compact). |
| **Käitumine** | Hover/focus L1-l → L2 paneel. Hover L2-l → L3 paneel kõrvale. Jne. Mobiilis accordion-drawer samas loogikas. |
| **Sisu** | Ainult sõlmed, mille tootearv ≥1 (tühjad peidetakse, vastab §3.5.4 reeglile). |
| **Allikas** | `category-tree.generated.json` → `getChildren(currentHandle)` rekursiivselt. Mitte `subSlugs[]`. Mitte `THUMB_OVERRIDES`. Mitte `/api/header-categories`. |
| **Eelrenderdatud** | Kogu menüü-puu serialiseeritakse build-time `category-tree.generated.json`-ist — runtime API fetchi pole. |
| **Klaviatuur / A11y** | `role="menubar"`, arrow keys nav, Escape sulgeb, focus-trap. |

Implementeeritud Faas 5b F5b.5-s (commit `b06e8b0`). Spec-formaliseering lisatud siia, et invariant INV-30 saaks "MegaMenu drillib Ln-ni" automaatselt kontrollida.

---

## 4. Vertikaalid (`/alustajale/`) — paralleelne kihistus

### 4.1 Definitsioon

**Vertikaal ei ole kategooria.** See on **kureeritud kollektsioon + lahendi (landing)**, mis pakub konkreetsele alustavale ettevõtjale:
- Stardikomplekti nimekiri (8-15 toote-kategooriat)
- FAQ tema hirmude kohta
- Finantseerimise + maksuviide
- Tarne-realiteet
- "Lisa kõik korvi" nupp

### 4.2 24 vertikaali nimekiri (Agent C)

**Toitlustus:** kohvik, restoran, pagariäri, food-truck, catering
**Teenindus:** maastikuhooldus, lumetõrje, autopesula, autoremont, puhastus, sauna-mobiil
**Tootmine:** keevitustöökoda, laser-graveerija, puidutöö, cnc-maker, t-särgitrükk, siiditrükk
**Tootmine-toit:** mesindus, kosmeetika-käsitöö
**Ilu:** ilusalong, küünesalong, spa
**Muu:** pakiteenus, farm-kanala

Iga vertikaal: EMTAK kood (EE) + CNAE kood (ES tulevikus). Täielik spec'i lisa.

### 4.3 Piloot (Faas 4 ehitab 3 esimest)

Valik põhineb Agent C demand + Agent D SEO-hinnangul:

| Vertikaal | URL | Demand (mo) | Meili tootearv | Ehituse skoor |
|---|---|---|---|---|
| **Kohvik** | `/et/alustajale/kohvik` | 300-500 | 554 | 9/10 |
| **Haljastus** | `/et/alustajale/haljastus` | 30-80 | 234 | 8/10 |
| **Autopesula** | `/et/alustajale/autopesula` | 80-150 | 50+ | 7/10 |

**Miks need kolm?** Sisulikult eri klastrid (toitlustus / teenindus-välistöö / teenindus-auto). Kui need 3 töötavad, ülejäänud 21 on replicate muster.

### 4.4 Mehhanism (Agent B)

**Andmemudel** (lisa 2 uut tabelit):

```sql
-- Vertikaali definition
CREATE TABLE vertical_collection (
  id              TEXT PRIMARY KEY,     -- "vc_kohvik"
  slug            TEXT NOT NULL UNIQUE, -- "kohvik"
  mode            TEXT NOT NULL,        -- "alustajale" | "arikliendile" | "hooldus"
  hero_image_url  TEXT,
  emtak_codes     TEXT[],
  cnae_codes      TEXT[],
  status          TEXT DEFAULT 'active', -- draft | active | archived
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Vertikaali sisu-reeglid (declarative)
CREATE TABLE vertical_collection_rule (
  id              BIGSERIAL PRIMARY KEY,
  collection_id   TEXT REFERENCES vertical_collection(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,     -- include_node | exclude_node | include_product | exclude_product
  node_slug       TEXT,               -- L1/L2/L3 slug kui kind = *_node
  product_id      TEXT,               -- product_id kui kind = *_product
  weight          NUMERIC DEFAULT 0,  -- sort järjestus
  reason          TEXT                -- admin UI inimloetav seletus
);

-- Localisation for vertical displays
CREATE TABLE vertical_collection_translation (
  collection_id   TEXT REFERENCES vertical_collection(id) ON DELETE CASCADE,
  locale          VARCHAR(5) NOT NULL,     -- et | en | es
  name            TEXT NOT NULL,            -- "Kohviku avamine"
  slug_localized  TEXT NOT NULL,            -- "kohvik" ET, "cafe" EN, "cafeteria" ES
  tagline         TEXT,
  meta_title      TEXT,
  meta_description TEXT,
  faq_markdown_path TEXT,
  PRIMARY KEY (collection_id, locale)
);
```

### 4.5 Materialiseerimine (`scripts/materialize-verticals.mjs`, nightly)

```
for each vertical_collection:
  include_nodes = [...rules where kind = include_node]
  exclude_nodes = [...rules where kind = exclude_node]
  include_products = [...rules where kind = include_product]
  exclude_products = [...rules where kind = exclude_product]

  product_set =
    (products in any include_node OR include_products)
    MINUS
    (products in any exclude_node OR exclude_products)

  for each product in product_set:
    meili_doc.vertical_slugs.push(`${collection.mode}:${collection.slug}`)

  meili.patchDocuments(product_set)
```

Salvestab Meili documendile `vertical_slugs: ["alustajale:kohvik", "arikliendile:haljastus"]`. Päring: `filter: "vertical_slugs = 'alustajale:kohvik' AND in_stock = true"`.

**Miks mitte eraldi Meili indeks?** Sest samad tooted on mitmetes vertikaalides (nõudepesumasin ∈ kohvik + restoran + pagariäri). Eraldi indeks tähendaks duplikaati storage'i 3-4x.

### 4.6 Mandatory sektsioonid `/alustajale/[vertikaal]` lehel

Agent C 7 nõudlikku sektsiooni:

1. **Hero** — JTBD lause (Eesti-lühidalt, mitte slogan): "Avad kohviku. Siit saad köögiseadmed, mööbli ja tarvikud."
2. **Starter kit** — 8-15 kit item'it. Grid. Summa "Täiskomplekt alates €X". **"Lisa kõik korvi" nupp** (pre-filled median-price product per kategooria).
3. **FAQ** — 5-8 konkreetset küsimust (mitte AI-lobi). Näited: "Kas Vevor espressomasinad on HoReCa-kõlblikud?", "Mis 3-faasi nõuded?", "HACCP + stainless sertifikaat?"
4. **Financing & VAT** — KredEx, Leader (MAK), Eesti KMD 24% reclaim, Hispaania CNAE + IGIC (hiljem)
5. **Delivery reality** — per kit-item tarnaeg, "paigaldust ei tee" disclaimer, tagastamise reeglid inimkeeles
6. **Social proof / "Sa oled üks esimesi"** — kui pole päris stories'i, siis aus: "Sa oled üks esimesi. Kirjuta meile + saad -5%"
7. **Cross-mode escape** — "Sirvi kategooriaid ise" + breadcrumb `Avaleht > Alustajale > Kohvik`

### 4.7 Header IA (dual-mode)

```
Logo | Sirvi (mega menu ▼) | Alustajale ▼ | Ärikliendile | Hooldus | [search] | Cart
                                     │
                                     ├─ Toitlustus (5 vertikaali)
                                     ├─ Teenindus (6)
                                     ├─ Tootmine (6)
                                     ├─ Ilu & Heaolu (3)
                                     └─ Muu (4)
```

**Sirvi** ja **Alustajale** on võrdse prominentsusega. Kumbki ei varja teist.

---

## 5. Feed-resolver v2 — deterministlik pipeline

### 5.1 Ülesanne

Iga VEVOR toode → `(l1_slug, l2_slug?, l3_slug?, confidence, method, needs_review)` n-tik. Logitakse `category_classification_audit` tabelisse.

### 5.2 Stage'id (ordered, short-circuit on high confidence)

```
VEVOR row
  │
  ▼
[S1] Manual SKU override              (backend/src/data/sku-overrides.json)
     if match: conf=1.00, STOP
  │
  ▼
[S2] path_contains                    (vevor_product_type substring → slug)
     if match: conf=0.95, STOP
  │
  ▼
[S3] l1_l2_l3_overrides              (exact "L1|L2|L3" triple match)
     if match: conf=0.95, STOP
  │
  ▼
[S4] l1_l2_overrides                  (exact "L1|L2" pair match)
     if match: conf=0.85, continue for L3 via keyword
  │
  ▼
[S5] l1_defaults + L2 keyword scoring (title + description + selling_points)
     score candidates, winner wins
     conf = score / (score + runner_up_score + 1)
  │
  ▼
[S6] Meili nearest-neighbour          (within resolved L1, vote by majority L2)
     conf capped at 0.75 (NN-based, weak signal)
  │
  ▼
[S7] LLM classifier (LATER — EDASI LÜKATUD)
     Implementeerida ainult kui review-queue stabilises >500.
     Claude Haiku, batched nightly, strict Zod schema, slug whitelist.
  │
  ▼
[S8] Fallback: review bucket
     assign to `needs-review-bucket` (hidden node, never in public)
     conf=0, needs_review=true
     queue for admin UI
```

### 5.3 Confidence thresholds

| Range | Action |
|---|---|
| ≥ 0.85 | Auto-assign, `needs_review=false` |
| 0.60-0.84 | Auto-assign, `needs_review=true`, surface in admin queue |
| < 0.60 | Park in `needs-review-bucket`, product stays `status=draft` (not publicly visible) |

### 5.4 Review-queue drain

- **Nightly cron `drain-review-queue.mjs`** saadab Slack `#xl`-i digesti: "N toodet review-bucket'is, vanuse histogram, top unmapped VEVOR paths"
- **Admin UI `/admin/categorization-queue`** — Tarmo näeb listi, saab:
  - Klõpsa ühe toote kategooriasse
  - Loe **reegel VEVOR path'i pealt** (1 click → `l1_l2_overrides` kirje, tagasi S3-le uuesti jooksma, laieneb kogu feedile)
- **14 päeva timeout:** kui toode on bucket'is >14 päeva, automaatselt `status=draft`, Huly issue luuakse

### 5.5 3D printerite ümbertõstmine

Agent A faktid: 3D printerid lähevad hetkel `printing-packaging-signage`-sse, mis seletab laser-cnc-i 42 toodet. Spec'i järgi peaksid olema `laser-cnc-digital-fabrication`.

**Fix:** `vevor-to-v3.json` `path_contains`:
```
"3D Printer" → "laser-cnc-digital-fabrication/3d-printers" (L2)
"Heat Press" → jääb "printing-packaging-signage/heat-press"
"Vinyl Cutter" → jääb "printing-packaging-signage/vinyl-cutters"
```

Pärast muudatust: re-run `migrate-categories-to-v3.mjs --execute` → ~100-150 toodet liigub laser-cnc'sse.

### 5.6 Edge case'id

| Case | Strateegia |
|---|---|
| VEVOR `productType = ""` | Signal B (keyword) → Signal D (Meili NN); kui ikka null → review bucket |
| VEVOR lisab uue L1 (nt "Robotics & AI") | Logitakse, >10 toodet → Slack `#xl`, auto-Huly-issue, vahepeal review bucket |
| Toode kattub mitme L1-ga (pressure washer + generator) | `category-priority.json` reeglid (konkreetsem võidab): `"pressure-washer" → "outdoor-power-landscaping"`, `"generator" → "electrical-energy"` |
| SPU group sisaldab eri L1 variante (harv) | `primaryRow` (esimene variant) klassifitseerib kogu group'i; hoiatuse logi |
| `productType = "Other"` | Skip list → S5-st (keyword) edasi; kui ikka null → review bucket |
| VEVOR muudab olemasoleva toote productType'i | `UPDATE_EXISTING=true`: kui uus klassifikatsioon conf ≥0.85 — liigu; 0.6-0.85 — flag; <0.6 — jäta alles, logi |
| LLM tagastab invalid slug'i (hallutsinatsioon) | Zod schema + whitelist check → reject, confidence=0 |

---

## 6. MeiliSearch indekseerimise spec

### 6.1 Dokumendi väljad

Üks dokument per toode (mitte per variant). Variantide atribuudid array-valued.

| Field | Type | Searchable | Filterable | Facetable | Sortable | Purpose |
|---|---|:---:|:---:|:---:|:---:|---|
| `id` | string | | ✔ | | | primary key |
| `handle` | string | | ✔ | | | URL lookup |
| `title` | string | ✔ | | | | primary text match |
| `title_et` / `title_en` / `title_es` | string | ✔ | | | | locale-boosted search |
| `sku` | string | ✔ | ✔ | | | exact match |
| `vevor_sku` | string | ✔ | ✔ | | | supplier ref |
| `description_snippet` | string (≤400) | ✔ | | | | relevance signal |
| `selling_points` | string[] | ✔ | | | | relevance signal |
| `brand` | string | ✔ | ✔ | ✔ | | brand filter |
| **`taxonomy.l1_slug`** | string | | ✔ | ✔ | | canonical L1 |
| **`taxonomy.l2_slug`** | string? | | ✔ | ✔ | | canonical L2 |
| **`taxonomy.l3_slug`** | string? | | ✔ | ✔ | | canonical L3 |
| **`taxonomy.ancestors`** | string[] | | ✔ | ✔ | | `[l1, l2, l3]` single-filter drill |
| **`vertical_slugs`** | string[] | | ✔ | ✔ | | e.g. `["alustajale:kohvik","arikliendile:haljastus"]` |
| `price_cents` | int | | ✔ | | ✔ | VAT-incl hind |
| `in_stock` | bool | | ✔ | ✔ | | availability |
| `stock_qty` | int | | ✔ | | ✔ | precise filter |
| `attributes` | object (flat) | | ✔ | ✔ | | e.g. `voltage:230V`, `power_kw:2.2` — whitelisted keys |
| `thumbnail` | string | | | | | display-only |
| `published_at` | int (unix) | | ✔ | | ✔ | "new arrivals" |
| `popularity` | int | | | | ✔ | editorial sort |

### 6.2 Settings invariants

```json
{
  "searchableAttributes": [
    "title", "title_et", "title_en", "title_es",
    "sku", "vevor_sku", "selling_points", "brand", "description_snippet"
  ],
  "filterableAttributes": [
    "handle", "sku", "vevor_sku", "brand",
    "taxonomy.l1_slug", "taxonomy.l2_slug", "taxonomy.l3_slug",
    "taxonomy.ancestors", "vertical_slugs",
    "price_cents", "in_stock", "stock_qty", "attributes", "published_at"
  ],
  "sortableAttributes": ["price_cents", "stock_qty", "published_at", "popularity"],
  "pagination": { "maxTotalHits": 20000 },
  "faceting": { "maxValuesPerFacet": 200 }
}
```

### 6.3 Migration plan

- **Vana `category_handles`** jääb alles 30 päevaks backward-compat (mõned olemasolevad komponendid kasutavad)
- **Uus `taxonomy.*`** lisatakse indexi-skripti poolt
- Pärast 30 päeva + kõik komponendid migreeritud → `category_handles` eemaldatakse

---

## 7. Slug lifecycle & redirect'id

### 7.1 `slug_redirect` tabel

```sql
CREATE TABLE slug_redirect (
  from_slug    TEXT PRIMARY KEY,
  to_slug      TEXT NOT NULL,
  reason       TEXT NOT NULL,  -- rename | merge | deprecate | legacy
  created_at   TIMESTAMP DEFAULT NOW(),
  expires_at   TIMESTAMP       -- NULL = permanent
);

CREATE INDEX idx_slug_redirect_to ON slug_redirect(to_slug);
```

### 7.2 Kes redirect'e kirjutab

- **Kunagi mitte käsitsi `next.config.ts`-i.** Redirect block tühjeneb.
- `next.js middleware.ts` loeb Redis-cache'itud koopiat `slug_redirect` tabelist, emit'ib 301.
- **Sitemap generator** excludes any `from_slug`.

### 7.3 Millal 301 vs uus kategooria

| Muudatus | Emits 301 | Loob uue node'i |
|---|:---:|:---:|
| Rename node (samad tooted, parem nimi) | ✔ | ✗ |
| Split: üks node → kaks (vanad tooted liiguvad suuremasse, uus node väiksemasse) | ✔ | ✔ |
| Merge: kaks node'i → üks | ✔ | ✗ |
| Move products across nodes, slug ei muutu | ✗ | ✗ |
| Lisa uus kategooria täiesti uutele toodetele | ✗ | ✔ |

### 7.4 Chain cleanup

- **Max 2 hop** redirect'ides. `A → B → C` → automaatne `A → C` collapse.
- **Max 3 hop** on CI hard failure.
- **Quarterly cron** drops rows `expires_at < now()`.

---

## 8. Invariants & enforcement

### 8.1 CI checks (iga PR mis puudutab taksonoomiat)

| ID | Invariant | Check |
|---|---|---|
| INV-01 | `taxonomy.yaml` on valid JSON Schema | `npm run lint:taxonomy` |
| INV-02 | L1 ∈ [18, 22]; L2/L1 ∈ [4, 8]; L3/L2 ∈ [0, 12] | counting on YAML |
| INV-03 | No duplicate slug anywhere in tree | set-size check |
| INV-04 | `branches.ts` byte-identical to generator output | `diff <(npm run gen:branches --stdout) branches.ts` |
| INV-05 | No slug in `slug_redirect.from_slug` also exists as active `taxonomy_node.slug` | SQL-equivalent on fixtures |
| INV-06 | Every L1 in yaml has translations for `et`, `en` (es optional) | check translations fixture |

### 8.2 Cron checks (nightly)

| ID | Invariant | Check |
|---|---|---|
| INV-10 | `taxonomy_node` DB == `taxonomy.yaml` | `check-taxonomy-drift.mjs` |
| INV-11 | Every product has exactly 1 row in `product_taxonomy` | COUNT query |
| INV-12 | No active L1 with <30 products for >60 days (warn); <10 products for >14 days (alert) | rollup |
| INV-13 | No product placed at node with `status != active` (except review-bucket) | SQL |
| INV-14 | Meili `taxonomy.ancestors` matches DB for every product | sample diff |
| INV-15 | Every L1/L2 slug in MegaMenu resolves to 200 on `/kategooriad/{slug}` | smoke-curl |
| INV-16 | No `slug_redirect` chain >3 hops | graph walk |
| INV-17 | `vertical_collection` materialization ≤ 26h old | `materialize-verticals.mjs` SLA |
| INV-18 | `needs-review-bucket` size <500 (warn); <2000 (alert) | SQL |
| INV-19 | Unmapped VEVOR path count last import ≤10 new | diff `imports/<ts>/summary.json` |
| INV-20 | 100% v3 nodes have resolvable `image_path` | Faas 5b |
| INV-21 | Every `image_path` file exists on disk | Faas 5b |
| INV-22 | `taxonomy-image-aliases.yaml` targets all valid | Faas 5b |
| INV-23 | Parent-handle chains end at an L1 root, no cycles | Faas 5b |
| INV-24 | Kõigi 22 L1 URL-i breadcrumb lõppeb kategooriaga, mitte tootega | smoke + JSON diff |
| INV-25 | Kategoorialeht ei näita karussellil 0-tootearvuga alamsõlme | UI smoke + Meili count |
| INV-26 | Iga karuselli-kaart resolveerib `image_path` (ei missing) | INV-20 laiendus |
| INV-27 | Breadcrumb trail.length === depth(handle)+1 iga URL-i kohta | Playwright + JSON |
| INV-28 | Product grid kasutab `taxonomy.ancestors`, mitte `category_handles` | CI source scan |
| INV-29 | 4-veeruline grid ≥1280px viewport'il | Playwright visual |
| INV-30 | MegaMenu drillib L1→Ln (mitte ainult L2) | Playwright keyboard nav |
| INV-31 | VEVOR slug/name ei leki kunagi UI-sse (kategoorialehed, breadcrumb, karusell) | CI grep scan |

### 8.3 Dashboard

`/xl-admin/taxonomy-health` renders live invariant results via `scripts/check-taxonomy-invariants.mjs --json`. Green on all-pass. Tarmo vaatab igal hommikul.

Alerts posts to `#xl` Slack with rule ID + offending rows. Repeat failures of same ID → auto-Huly-issue.

Runbook per invariant: [docs/runbooks/taxonomy-invariant-failures.md](../../runbooks/taxonomy-invariant-failures.md).

---

## 9. SEO & Schema

### 9.1 JSON-LD per page type (Agent D)

**L1/L2 category page:** `CollectionPage` + `BreadcrumbList`
**Product detail page (`/toode/{handle}`):** `Product` + `Offer` + `BreadcrumbList`
**Vertical collection (`/alustajale/{v}`):** `CollectionPage` + `ItemList`
**Homepage:** `WebSite` + `SearchAction` (Sitelinks Searchbox eligibility)

Täpsed JSON-LD šabloonid: vt `proposal-agent-3-seo.md` §5.1-5.6.

### 9.2 VAT (KMD 24%) tax-inclusive pricing

- Kõigil Product `offers.price` väljadel VAT-INCLUSIVE hind, mis vastab UI-s kuvatule.
- **Mitte** saada net-hind; Google flagiks vastuolu.

### 9.3 Hreflang (kui ES käivitub)

```typescript
alternates: {
  languages: {
    'et': `https://xlmarket.eu/et/kategooriad/${handle}`,
    'en': `https://xlmarket.eu/en/kategooriad/${handle}`,
    'es': `https://xlmarket.eu/es/categorias/${handle_es}`,
    'x-default': `https://xlmarket.eu/en/kategooriad/${handle}`,
  }
}
```

ES subdirectory (`/es/`) esialgu, mitte eraldi domeen. Migreerida `xlmarket.es`-ile kui ES tulu kasvab piisavalt.

### 9.4 Top 5 vertikaali SEO-otstarbel ehitamiseks (Agent D)

1. `kohvik` — 300-500/mo, 554 toodet, low competition
2. `laser-graveerijad` — 300-600/mo, zero ET competition <€1K
3. `autopesula` — 80-150/mo, no dedicated ET page
4. `restoran` — 200-350/mo, broader kit
5. `trykifirma` — 30-60/mo, 115 toodet, niche winner

---

## 10. Tegevuskava — 6 faasi

### Faas 0 — Baseline (0,5 päeva)

- [ ] `pg_dump -h localhost -p 5435 -U xlmarket xlmarket > ~/backups/xlmarket-$(date +%F).sql`
- [ ] Meili snapshot: `curl -X POST 'http://127.0.0.1:7700/snapshots' -H "Authorization: Bearer $MEILI_KEY"`
- [ ] Freeze main, create `feat/taxonomy-foundation` branch

### Faas 1 — Quick wins (30 min, zero risk)

**Eesmärk:** kõrvaldada teadaolevad bugid ilma DB muudatusteta.

- [ ] F1.1: Kustuta `storefront/next.config.ts:29` `"playground-sets": "fitness-sports-recreation"` rida
- [ ] F1.2: `storefront/lib/taxonomy-v3.ts:119` — rename `playground-sets` → `playground-outdoor-play`
- [ ] F1.3: `storefront/app/[locale]/kategooriad/[handle]/page.tsx:21-54` — asenda `CATEGORY_NAMES` hardcoded → `TAXONOMY_V3` lookup
- [ ] F1.4: `mv data/feeds/sitemap.xml data/feeds/sitemap.xml.stale`; eemalda nginx `location = /sitemap.xml` rule; restart nginx
- [ ] F1.5: `/et/kategooriad/other` → add `<meta name="robots" content="noindex,nofollow" />` kui category product count = 0
- [ ] F1.6: Kustuta surnud failid:
  - `storefront/lib/menu-order.ts`
  - `storefront/lib/featured-categories.ts`
  - `storefront/components/SubcategoryPills.tsx`
- [ ] F1.7: Build + PM2 reload + verify
  ```bash
  cd storefront && npm run build && cp -r .next/static .next/standalone/.next/static
  pm2 reload xlmarket-storefront
  curl -I https://xlmarket.store/et/kategooriad/playground-sets  # should be 200, not 308
  curl -I https://xlmarket.store/et/kategooriad/other            # noindex header
  curl -s https://xlmarket.store/sitemap.xml | head -30           # served from app/sitemap.ts
  ```

**Exit criteria:** INV-01 kuni INV-06 CI-s pass.

### Faas 2 — DB konsolidatsioon (1 päev, backup-nõudlik)

**Eesmärk:** üks tõe allikas (`taxonomy.yaml`), legacy rigle koristus, slug redirect tabelisse.

- [ ] F2.1: Loo `backend/src/data/taxonomy.yaml` (22 L1 + ~132 L2 + ~60 L3 kus >50 toodet)
- [ ] F2.2: `scripts/gen-branches.mjs` — YAML → `storefront/lib/branches.ts` (deterministic output)
- [ ] F2.3: Seed `taxonomy_node` + `taxonomy_node_translation` DB-st YAML-ist
  - `scripts/seed-taxonomy-from-yaml.mjs --execute`
- [ ] F2.4: `slug_redirect` tabel loo + migreerida 41 `next.config.ts` `CATEGORY_V3_REDIRECTS` sellesse
- [ ] F2.5: Luua `middleware.ts` mis loeb Redis-cache'itud `slug_redirect`-i (TTL 5 min); eemalda redirect block `next.config.ts`-st
- [ ] F2.6: Cleanup:
  - Kustuta 31 tripleeritud L1 handle'it (jäta 1 iga kohta)
  - Kustuta 382 tühja shell'i (0 toodet, NULL parent)
  - Eemalda 3 359 toote dual-assignment (jäta ainult v3 L1 külje)
  - Script: `scripts/cleanup-legacy-categories.mjs --execute --dry-run-first`
- [ ] F2.7: `vevor-to-v3.json` laienda L2 + L3 overrides'iga (fix 3D printer → laser-cnc)
- [ ] F2.8: `node scripts/migrate-categories-to-v3.mjs --execute --reassign` — re-klassifitseeri kõik tooted uue YAML + resolver põhjal
- [ ] F2.9: Meili reindex uute väljadega (`taxonomy.l1_slug`, `taxonomy.l2_slug`, `taxonomy.l3_slug`, `taxonomy.ancestors`, `vertical_slugs` esialgu tühi)
  - `cd backend && node scripts/index-meilisearch.mjs --full`
  - `PATCH /indexes/products/settings/pagination {"maxTotalHits": 20000}`
- [ ] F2.10: Smoke test kõigi 22 v3 L1 + läbi-klõpsa MegaMenu drill

**Exit criteria:** INV-10, INV-11, INV-13, INV-14 pass. DB on clean (434 → 22 L1 + ~132 L2 + ~60 L3).

### Faas 3 — Resolver v2 (1 päev)

**Eesmärk:** 8-etapiline feed pipeline + audit log + review bucket.

- [ ] F3.1: Loo `backend/src/taxonomy/` moodul:
  - `resolver.ts` — main API `classifyProduct()`
  - `signals.ts` — signal extractors
  - `stages.ts` — S1 kuni S8 implementatsioonid
  - `rules/sku-overrides.json` (tühi)
  - `rules/l1-l2-l3-overrides.json`
  - `rules/l1-l2-overrides.json` (migreeritud vanast `vevor-to-v3.json`-st)
  - `rules/l1-defaults.json`
  - `rules/l2-keywords.json` (L2 per L1 + required_any/required_none/boost)
  - `rules/category-priority.json` (edge case: "pressure-washer" vs "generator")
- [ ] F3.2: Loo `category_classification_audit` tabel
- [ ] F3.3: Loo `needs-review-bucket` hidden node (status='hidden')
- [ ] F3.4: Integreeri `import-vevor-feed.mjs:452-455` kasutama `classifyProduct()`-i
- [ ] F3.5: Admin UI `/admin/categorization-queue`:
  - List kõigist `needs_review=true` toodetest
  - Ühe toote kinnituse klick
  - "Loo reegel VEVOR pathi pealt" (lisab `l1_l2_overrides` JSON-i, trigger'b re-run S3-S5)
- [ ] F3.6: Daily cron `drain-review-queue.mjs` → Slack `#xl` digest
- [ ] F3.7: 14-päeva timeout rule: bucket'i toode >14p → `status=draft` + Huly issue
- [ ] F3.8: (NOT YET) S7 LLM — edasi lükatud; implementeeri ainult kui queue stabilises >500

**Exit criteria:** INV-18, INV-19 pass. 3D printerid on nüüd `laser-cnc-digital-fabrication`-is (~100 toodet liikunud).

### Faas 4 — Vertikaalid: 3 pilot (1 päev)

**Eesmärk:** `/alustajale/{kohvik, haljastus, autopesula}` live, materializer töötab.

- [ ] F4.1: Loo `vertical_collection` + `vertical_collection_rule` + `vertical_collection_translation` tabelid (Medusa module)
- [ ] F4.2: Seed 3 pilot vertikaalit:
  ```yaml
  kohvik:
    mode: alustajale
    emtak: [56101, 56301]
    rules:
      - include_node: horeca-food-service/commercial-cooking-equipment
      - include_node: horeca-food-service/commercial-refrigeration
      - include_node: horeca-food-service/bar-beverage-service
      - include_node: horeca-food-service/restaurant-furniture
      - include_node: cleaning-janitorial
      # ... total ~12 kit item
  haljastus:
    mode: alustajale
    emtak: [8130]
    rules:
      - include_node: outdoor-power-landscaping
      - include_node: safety-security-workwear/ppe
      # ... ~10 kit item
  autopesula:
    mode: alustajale
    emtak: [4520]
    rules:
      - include_node: outdoor-power-landscaping/pressure-washers
      - include_node: automotive-workshop/car-detailing-care
      - include_node: cleaning-janitorial
      # ... ~11 kit item
  ```
- [ ] F4.3: `scripts/materialize-verticals.mjs` — compute product sets, PATCH Meili docs `vertical_slugs`
- [ ] F4.4: Nightly cron @ 04:00 käivitama materializerit
- [ ] F4.5: Route `/[locale]/alustajale/[vertical]` — implementeerida `HomepageShell`-stiilis template
- [ ] F4.6: 7 mandatory sektsiooni (hero, kit, FAQ, financing, delivery, social proof, cross-mode escape)
- [ ] F4.7: "Lisa kõik korvi" action — bundle action, 1 median-price toode per kit item
- [ ] F4.8: `/haru/` → `/kategooriad/` 301 (Agent D)
- [ ] F4.9: Header IA uuendus: **Sirvi** ja **Alustajale** võrdse prominentsusega
- [ ] F4.10: FAQ markdown'id per vertikaal: `docs/verticals/{kohvik,haljastus,autopesula}/faq.md`

**Exit criteria:** INV-17 pass. 3 vertikaali serve 200, "Lisa kõik korvi" töötab.

### Faas 5 — SEO schema & enforcement (0,5 päeva)

**Eesmärk:** JSON-LD kõigil lehetüüpidel + invariants live + health dashboard.

- [x] F5.1: Product JSON-LD `/toode/[handle]` (sku + hasMerchantReturnPolicy + shippingDetails)
- [x] F5.2: CollectionPage + BreadcrumbList `/kategooriad/[handle]`
- [x] F5.3: CollectionPage + ItemList `/alustajale/[vertical]`
- [x] F5.4: WebSite + SearchAction homepage'il
- [x] F5.5: Meta descriptions dünaamiliselt per L1/L2 (taxonomy.yaml description_et/en)
- [x] F5.6: 23 invariant checker `scripts/check-taxonomy-invariants.mjs` (CLI + --json output)
- [x] F5.7: `/xl-admin/taxonomy-health` dashboard (live re-run, green/red rida per INV)
- [ ] F5.8: Slack `#xl` alerting per failing INV (deferred — hook when ops-cron wired)
- [x] F5.9: Runbook: `docs/runbooks/taxonomy-invariant-failures.md` — "mis teha kui INV-XX kukub"

### Faas 5b — Category UX + SSoT enforcement (2026-04-18 õhtu)

**Eesmärk:** kasutaja raporteeritud 4 drift-punkti (MegaMenu L2-only, L1 layout, breadcrumb drift, pildid kadunud) — kõik taandusid ühele juurpõhjusele: 3 paralleelset andmeallikat. Fix: ainult `category-tree.generated.json` loeb midagi.

- [x] F5b.1: `gen-category-tree.mjs` laiendus — `image_path` + `image_source` iga sõlme kohta, resolveerimine direct→alias→fuzzy→none
- [x] F5b.2: `backend/src/data/taxonomy-image-aliases.yaml` — manuaalne editorial image map v3 handle → legacy slug. 176/176 kate
- [x] F5b.3: `storefront/lib/category-tree.ts` laiendus — `getL1Ancestor`, `getBreadcrumbTrail`, `firstKnownHandle` helpers
- [x] F5b.4: `storefront/components/CategoryThumb.tsx` — ühtne thumb-komponent (image_path → SVG L1-ikooni fallback)
- [x] F5b.5: MegaMenu täielikult ümber — SSoT-põhine N-level rekursioon, eemaldatud subSlugs + THUMB_OVERRIDES + /api/header-categories fetch
- [x] F5b.6: Kategoorialeht layout — subcategory grid viidud main-veergu (spec §3.5), filter sidebar sticky vasakul
- [x] F5b.7: Tooteleht breadcrumb SSoT-ist — `firstKnownHandle(meili.category_handles ∪ medusa.categories)` + `getBreadcrumbTrail()`, eemaldatud Medusa `parent_category` walk
- [x] F5b.8: HomepageShell L2 thumb lookup — `child.image_path` otse, mitte category-images.json
- [x] F5b.9: INV-20/21/22/23 — image coverage + file existence + alias integrity + parent chain validity

**Exit criteria:** kõik 23 invariants green, MegaMenu avaneb L3-ni piltidega, category page `/kategooriad/{l1}` näitab L2-grid + filter + tooted kõrvuti, tooteleht breadcrumb lõppeb alati v3 L1-s.

**Exit criteria:** Kõik 19 invariants rohelised. Google Rich Results Test pass 10 juhuslikul PDP-l.

### Faas 5c — Category page UX täielik implementatsioon (2026-04-18+, kasutaja QA-põhine)

**Eesmärk:** kasutaja audit leidis, et 10/10 linki ei tööta õigesti. §3.5 (uus) defineerib täpse layouti. See faas viib selle tootmisse convergence-loopiga (§15 Santa Method laiendus).

- [ ] F5c.1: `storefront/lib/category-tree.ts` — lisa `getChildrenWithProductCounts(handle)` (Meili batch facet-count)
- [ ] F5c.2: `storefront/components/category/SubcategoryCarousel.tsx` — full-width horisontaalne karusell, pildid kohustuslikud, snap-to-item, keyboard a11y
- [ ] F5c.3: `storefront/app/[locale]/kategooriad/[handle]/page.tsx` — layout ümber spec §3.5.1 järgi (breadcrumb → karusell → H1 → sidebar+grid → history/deals/best-sellers)
- [ ] F5c.4: Filter sidebar — adaptiivsed facetid ainult, vasak veerg; alamkategooria-filter **eemaldatakse** kui karusell katab sama tasme
- [ ] F5c.5: Product grid — 4 veergu ≥1280px (CSS grid-template-columns: repeat(4, 1fr))
- [ ] F5c.6: Breadcrumb — kasutab `getBreadcrumbTrail()` SSoT-ist; kõik sõlmed klikitavad; ei kuva toote nime kunagi
- [ ] F5c.7: Päring — kasutab `taxonomy.ancestors` asemel `category_handles` (migration toote-indekseerimise ajal, §6)
- [ ] F5c.8: Tühjade peitmine — karusell ei näita 0-tootearvuga sõlmi; L1-ikooni fallback kunagi hüpoteetilise sõlme jaoks
- [ ] F5c.9: `storefront/components/category/CategoryBottomRibbons.tsx` — History + Deals + Best sellers kolm karusellit, sama L1 seest (`getL1Ancestor(handle)`)
- [ ] F5c.10: Recently viewed — client-side local-storage hook `useRecentlyViewed()` + ID-list fetch Meili'st
- [ ] F5c.11: INV-24 kuni INV-31 — kirjuta check-taxonomy-invariants.mjs laiendused + 22 L1 Playwright smoke-suite
- [ ] F5c.12: E2E — Playwright test iga 22 L1 kohta: karusell kuvab, klikk drillib, breadcrumb kasvab, tagasi klikk lühendab
- [ ] F5c.13: MegaMenu — veenda, et L1→Ln drill töötab (Faas 5b juba tegi, aga INV-30 smoke validation)
- [ ] F5c.14: Santa convergence loop (§15) — ebakõlad liiguvad tagasi algusesse, seni kuni kõik 0

**Exit criteria:**
- 23 vana + 8 uut invariants (kokku 31) kõik green
- Playwright smoke 22/22 L1 kohta pass (4-col grid, karusell, breadcrumb, bottom ribbons)
- Santa-method dual review 2 korda järjest PASS (§15)
- Kasutaja (Risto) manuaalse 10-lingi sanity-testi kõik 10/10 õiged

### Faas 6 — Laienemine (6-8 nädalat)

**Eesmärk:** ülejäänud 21 vertikaali (3-4 per nädal), ES i18n valmidus, L3 kaetus kus >50 toodet.

- [ ] Vertikaalid 4-24: kasuta Faas 4 malli, 3-4 per nädal
- [ ] Translation fixtures ES (22 L1 + 132 L2 + 24 vertikaali slug+nimi)
- [ ] L3 expansion kus kategooria >50 toodet (audit per kvartal)
- [ ] Cross-reference lingid ("See also") — `related_categories` junction table
- [ ] Meili vector search POC (embedding-based NN) — ainult kui rule-based accuracy <80%

---

## 11. Rollback strateegia

| Faas | Rollback action |
|---|---|
| Faas 1 | `git revert` — zero DB impact |
| Faas 2 | `docker exec -i xlmarket-postgres-1 psql -U xlmarket xlmarket < ~/backups/xlmarket-YYYY-MM-DD.sql` + Meili reindex |
| Faas 3 | Revert `import-vevor-feed.mjs` → fallback `resolveV3Slug()` (säilitame 3 kuud) |
| Faas 4 | Drop `vertical_collection*` tabelid; `/alustajale/*` route'd 404 (acceptable — storefront pole neid veel kriitiliselt kasutanud) |
| Faas 5 | Disable JSON-LD injection; invariants monitoring jääb alles (passive) |

**Trigger for rollback:**
- Error rate >2% Sentry'is >15 min
- Category page 500 rate >0,5%
- Meili hit count drop >5% vs baseline
- Tarmo või Risto sõnum "Pöörame tagasi"

---

## 12. Lahtised küsimused (Risto otsustab)

1. **Madala-tootearvuga L1-d — klassifikatsioon A/B/C (§3.1.1):** ettepanek:
   - **A — STRATEEGILINE** (jääb nähtavaks, investeerime): `laser-cnc-digital-fabrication` (uuringu prioriteet #2)
   - **B — HOOLDA** (jääb nähtavaks, passiivne): `woodworking-carpentry`
   - **C — PEIDA** (`showInMegaMenu: false` kuni >30): `salon-spa-wellness`, `music-entertainment`
   
   **Kas kinnitad A/B/C klassifikatsiooni?** Erijuhul: kas `woodworking-carpentry` peaks olema A (kui investeerime resolveri-laiendusse feedi `Tools|Woodworking Tools` parema tabamuse jaoks) või jääb B?

2. **`/alustajale` ES vertikaali slug:** `/es/empezar/cafeteria` vs `/es/alustajale/cafeteria` (keel-native vs stabiilsus)? **Minu soovitus: localised (`empezar`) — vertikaal on marketing, ES ostja otsib hispaania keeles.** Kinnitus Ristolt kui ES käivitub.

3. **Vertikaali reegli-omanik:** kes kirjutab `vertical_collection_rule` kirjed — Tarmo admin UI kaudu, XL PR-iga, või Claudia? **Minu soovitus: XL PR + review Ristolt, 6 nädala jooksul kuni muster settled; siis üle Tarmole.**

4. **Review-queue SLA:** 14 päeva → draft? Kas sobib või sooviksid 7 või 30? **Minu soovitus: 14 päeva — piisav aega reageerimiseks, aga mitte nii pikk, et tooted kogunevad limbo'sse.**

5. **`hand-power-tools` 2 000 toodet**: lisa L2 tase sisse või jäta lahtiseks (flat)? **Minu soovitus: investeeri L2-sse (7 L2: power-tools, hand-tools, air-compressors-pneumatic, measuring-layout-tools, power-tool-accessories, tool-storage-cases, workbenches) — hajutab ~285 toodet per L2, usable.**

6. **LLM stage S7 timing:** kas kunagi? **Minu soovitus: implementeeri kui review queue stabilises >500. Eeldatav: 2-3 kuud pärast Faas 3 käivitamist. Cost cap $1/päev Claude Haiku.**

---

## 13. Edu-kriteeriumid (3 kuu pärast)

- [ ] 0 invariant-rikkumist 30 päeva jooksul
- [ ] ≥8/24 vertikaali live, igaüks ≥1% conversion rate
- [ ] Review queue stabiilselt <100 toodet
- [ ] Google Search Console: ≥3 v3 L1 lehekülge top-5 seal keyword'idele (`jäämasin`, `laser graveerija`, `survepesur`)
- [ ] `/alustajale/kohvik` top-3 Google'is "kohviku avamine seadmed"
- [ ] VEVOR feedi unmapped new path <10 per import

---

## 14. Failid, mida see spec puudutab

**Loo uued:**
- `backend/src/data/taxonomy.yaml` — SSoT
- `backend/src/taxonomy/` — resolver v2 moodul
- `backend/src/migrations/YYYYMMDD-slug-redirect.ts`
- `backend/src/migrations/YYYYMMDD-vertical-collection.ts`
- `backend/src/migrations/YYYYMMDD-classification-audit.ts`
- `backend/src/migrations/YYYYMMDD-taxonomy-health.ts`
- `scripts/gen-branches.mjs`
- `scripts/seed-taxonomy-from-yaml.mjs`
- `scripts/cleanup-legacy-categories.mjs`
- `scripts/materialize-verticals.mjs`
- `scripts/drain-review-queue.mjs`
- `scripts/check-taxonomy-invariants.mjs` (19 INV)
- `storefront/middleware.ts` (slug_redirect reader)
- `storefront/app/[locale]/alustajale/[vertical]/page.tsx`
- `storefront/app/admin/categorization-queue/*`
- `storefront/app/admin/taxonomy-health/page.tsx`
- `docs/verticals/{kohvik,haljastus,autopesula}/faq.md`
- `docs/runbooks/taxonomy-invariant-failures.md`

**Muuda:**
- `storefront/lib/branches.ts` — **generated**, ära käsitsi muuda
- `storefront/lib/taxonomy-v3.ts` — rename `playground-sets` → `playground-outdoor-play`
- `storefront/next.config.ts` — redirect block tühjenda
- `storefront/app/[locale]/kategooriad/[handle]/page.tsx` — `CATEGORY_NAMES` → v3 lookup, lisa schema
- `storefront/app/[locale]/toode/[handle]/page.tsx` — lisa Product JSON-LD
- `storefront/app/sitemap.ts` — excludes `slug_redirect.from_slug`
- `scripts/import-vevor-feed.mjs` — kasuta uut `classifyProduct()`-i
- `backend/scripts/index-meilisearch.mjs` — uued `taxonomy.*` + `vertical_slugs` väljad
- `backend/src/scripts/vevor-to-v3.json` — laienda L2/L3, fix 3D printer path

**Kustuta:**
- `storefront/lib/menu-order.ts`
- `storefront/lib/featured-categories.ts`
- `storefront/components/SubcategoryPills.tsx`
- `data/feeds/sitemap.xml` (→ `.stale`)
- nginx `location = /sitemap.xml` rule

---

## 15. Multi-agent workflow + convergence loop (Faas 5c täideviimiseks)

Kasutaja nõudis laia meeskonda ja loopi, mis saadab workflow algusesse tagasi, kuni puudusi enam pole. See §15 defineerib selle orkestratsiooni.

### 15.1 Rollid ja agendid (7 rolli, paralleelsed kus võimalik)

| # | Roll | Agent (subagent_type) | Vastutus |
|---|------|------------------------|----------|
| 1 | **Architect** | `code-architect` | Defineerib struktuuri: mis faile luua, andmevoog §3.5 põhjal, interface'id |
| 2 | **Code Explorer** | `code-explorer` | Mappeerib olemasoleva koodi (category-tree, MegaMenu, page.tsx, Meili), väldib rekonstrueerimist |
| 3 | **Implementer** | `general-purpose` (2 paralleelselt, eri skoop) | Kirjutab F5c.1–F5c.10 vastavalt architect'i blueprint-ile |
| 4 | **Frontend Reviewer** | `typescript-reviewer` + `frontend-design` skill | Vaatab UI/UX, spec §3.5 vastavus, 4-col grid, karuselli pildid, a11y |
| 5 | **Functional Reviewer** | `code-reviewer` | Äriloogika, Meili päringud, SSoT-põhisus, INV-28 (pole VEVOR lekkeid) |
| 6 | **E2E Tester** | `e2e-runner` | Playwright smoke: 22 L1 URL-i, karusell, breadcrumb, drill, bottom ribbons |
| 7 | **Invariants Tester** | `general-purpose` | Käivitab `check-taxonomy-invariants.mjs`, kõik 31 INV peavad green olema |
| 8 | **Gatekeeper** | `gatekeeper` | Lõplik kvaliteedikontroll enne "Done". Blokeerib kui kasvõi üks INV punane või review leidis CRITICAL/HIGH |

### 15.2 Convergence loop (Santa Method laiendus)

```
┌───────────────────────────────────────────────────────────────┐
│ ROUND N (start N=1)                                            │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step A — ARCHITECT                                            │
│    code-architect reads §3.5 + §15.3 + olemasolev kood        │
│    → blueprint.md (faili-list, interfaces, data flow)          │
│                                                                 │
│  Step B — EXPLORE (parallel with A, feeds A)                   │
│    code-explorer mappib category-tree, MegaMenu, page.tsx      │
│    → inventory.md (mis on olemas, mis vaja muuta)              │
│                                                                 │
│  Step C — IMPLEMENT                                            │
│    2× general-purpose implementer paralleelselt:               │
│      - Implementer-A: F5c.1–F5c.6 (andmed + karusell + grid)  │
│      - Implementer-B: F5c.7–F5c.10 (päring, ribbons, history) │
│                                                                 │
│  Step D — BUILD                                                │
│    npm run build storefront'is; kui fail → Implementer fix     │
│                                                                 │
│  Step E — DUAL REVIEW (paralleelne, isolated context)          │
│    Reviewer-UI (typescript-reviewer + frontend-design):        │
│      Rubric: §3.5 + §3.6 + design-quality.md                   │
│    Reviewer-Func (code-reviewer):                              │
│      Rubric: §3.5.8 (SSoT), §3.5.9 INV-24..31, Meili query    │
│                                                                 │
│  Step F — INVARIANT + E2E                                      │
│    Invariants-Tester: node scripts/check-taxonomy-invariants   │
│    E2E: Playwright smoke 22 L1 URL                             │
│                                                                 │
│  Step G — GATEKEEPER VERDICT                                   │
│    Sisend: 2 review-i + invariants + E2E                       │
│                                                                 │
│    ALL of:                                                     │
│      - Reviewer-UI: PASS                                       │
│      - Reviewer-Func: PASS                                     │
│      - Invariants: 31/31 GREEN                                 │
│      - E2E: 22/22 L1 pass                                      │
│      - Zero CRITICAL, zero HIGH                                │
│                                                                 │
│    ⇒ NICE → deploy + commit + PR                               │
│                                                                 │
│    Muidu → NAUGHTY → kogu leidmised → Step A (Round N+1)       │
│                                                                 │
└───────────────────────────────────────────────────────────────┘

Max iterations: 5. Kui 5-ga mitte convergent → eskaleeri Ristole.
Iga round kasutab **värskeid review-agente** (context isolation).
```

### 15.3 Review rubrics (igal reviewer'il identne)

**UI rubric (Reviewer-UI):**
- [ ] Breadcrumb vastab §3.5.3 (Avaleht › L1 › … › Ln, ei toote nime)
- [ ] Karusell full-width, pildid igal kaardil, tühjad peidetud (§3.5.4)
- [ ] Filtrid vasakus veerus, adaptiivsed (§3.5.5)
- [ ] Grid 4 veergu ≥1280px (§3.5.6)
- [ ] Bottom ribbons: history + deals + best sellers sama L1 seest (§3.5.7)
- [ ] MegaMenu drillib Ln-ni, mitte ainult L2 (§3.6)
- [ ] Ei kasuta VEVOR nimesid/slug'e UI-s (INV-31)
- [ ] Design-quality: pole generic template look (web/design-quality.md)

**Functional rubric (Reviewer-Func):**
- [ ] Ainus SSoT: `category-tree.generated.json` (§3.5.8). Ei Medusa parent walk. Ei hardcoded list.
- [ ] Meili päring kasutab `taxonomy.ancestors` (§3.5.6, INV-28)
- [ ] 0-toote alamsõlmed filtreeritakse karuselliast välja (§3.5.4, INV-25)
- [ ] `getL1Ancestor()` kasutusel bottom ribbons jaoks (§3.5.7)
- [ ] Build edukas, TypeScript types ok
- [ ] Invariants INV-24..31 kirjutatud `check-taxonomy-invariants.mjs`-i
- [ ] Recently-viewed elab localStorage'is, mitte cookies (§3.5.7)

### 15.4 Orchestration command

XL (orchestrator) käivitab ühe käsuga:

```
invoke santa-method with spec=§3.5+§3.6+§15.3, rounds_max=5
```

Iga round logib Sleak `#xl`-i digesti: "Round N, issues: X, converged: no/yes".

### 15.5 Stop conditions

- **Convergence (NICE):** kõik 4 sisendit PASS 1 roundis järjest.
- **Escalation:** 5 rounds ei convergent → Slack `@risto` + Huly issue (blockers list).
- **Emergency halt:** Risto sõnum "STOP" → kogu loop peatub, state commit'itakse WIP-branch'i.

---

## 16. Kokkuvõte (üks lõik)

Säilita v3 22-L1 struktuurselt, tee `taxonomy.yaml`-st üks ainus tõe allikas (portaalis on täpselt üks taksonoomia; VEVOR oma portaali ei tooda) ja genereeri sealt kõik: DB, `branches.ts`, sitemap, Meili indeks, redirect'id, MegaMenu (L1→Ln piltidega), kategooria-leht (breadcrumb + full-width alamkat-karusell + vasakul filtrid + 4-veeruline grid + history/deals/best-sellers L1 seest). Paiguta iga toode täpselt ühte kanoonilisse rada 8-etapilise determineerituga resolveri kaudu (override → path → keyword → NN → [later LLM] → review bucket), logi kõik `categorization_audit`-i. Ehita paralleelne vertikaalide kiht (`/alustajale/{vertikaal}`) rule-based `vertical_collection` tabeli peal — tooteid ei dubleerita, lihtsalt päringud eri nurgast. Redirect'id tabelist, mitte käsitsi config'ist. Iga invariant CI/cron-iga kontrollitud, rikkumised Slack'i. Käivita 3 pilot vertikaali (kohvik, haljastus, autopesula), veendu et muster töötab, skaleeri ülejäänud 21-le. 6 faasi, iga iseseisvalt revertitav. 3 kuu pärast: 8+ vertikaali live, top-3 Google rank 3+ L1 keyword'ile, review queue <100 stabiilne.
