# Review-bucket UI plaan (SAMM 2a — ainult plaan, koodi pole)

> Koostatud 2026-09-24. Sihtleht: `storefront/app/xl-admin/review-bucket/`.
> Eesmärk: teha 3854 ootavat ettepanekut (3828 sünonüümi + 26 klassifikaatorit) inimesele
> **klastri/valimi-põhiselt otsustatavaks** — mitte 3854 rida ükshaaval.
> Aluseks SAMM 0 kaardistus + SAMM 1 digest (juba live).

---

## ✅ OTSUSED (Tarmo, 2026-09-24 — kinnitatud)

1. **Sünonüümi-lävi:** valim **100** suurtel vahemikel, hulgi-kinnitus kui **VALE ≤ 3/100**. Vahemik < valimi suurus → **näita kõik read** (täisülevaatus). Lävi + valimi suurus = **seadistatavad** (mitte koodis fikseeritud).
2. **"VALE" definitsioon UI-s nähtav:** *"Klient, kes seda sõna otsib, ei ootaks seda toodet"* + 2 näidet.
3. **1330 "≥0.85+review:true":** **SAMA lävi** mis teistel (mitte leebem). Hook-häälestus **alles pärast valimi andmeid**.
4. **Sync:** öine [7.5] + valikuline "sünkri kohe". ✅ Kontrollitud: [7.5] `PUT settings/synonyms` = täis-replace → **eemaldab DB-st kustutatud sünonüümid automaatselt**. Ei vaja parandust.
5. **Vana categorization-queue:** pärandi-bänner + navist ära, route jääb.
6. **Ehituse järjekord:** **2c (klassifikaator) → 2b (sünonüümid) → 2d (vana leht + digesti-link).**

---

## 1. SÜNONÜÜMIDE ÜLEVAATUSE MEETOD — valimi-põhine vastuvõtt

**Põhiidee:** ämber jagatakse kindluse-vahemikeks; iga vahemiku kohta hindab inimene JUHUSLIKU VALIMI, mitte kõiki ridu. Kui valim on piisavalt puhas → ülejäänud vahemik kinnitatakse hulgi.

### Vahemikud (praegused arvud)
| Vahemik | Arv | Iseloom | Vaikimisi käitlus |
|---|---|---|---|
| **0.00 praht** | 9 | segakeel/fragmendid | Eraldi "lükka kõik tagasi" nupp + nimekiri |
| **<0.7** | 53 | ebakindel | Valim 100, VALE-määr otsustab |
| **0.7–0.85** | 2436 | piiripealne-hea (suurim mass) | Valim 100, VALE-määr otsustab |
| **≥0.85 + review:true** | 1330 | LLM ise kahtles, aga kindlus kõrge | Valim 100, **SAMA lävi** (vt allpool) |

> **"VALE" definitsioon (UI-s nähtav, iga valimi-rea juures):** *"Klient, kes seda sõna otsib, ei ootaks seda toodet."* Näited:
> - `"õhukonditsioneeri remont"` → **AC Recovery Machine** = **VALE** (otsija tahab remonditeenust/varuosa, mitte külmaaine-taastusmasinat).
> - `"mootorsaag"` → **kettsaag** = **OK** (sama toode, teine nimi).

### Valimi-töövoog (vahemiku kohta)
1. Kuva **juhuslik valim N** (vaikimisi **N=100**, või **kogu vahemik kui väiksem kui N** → täisülevaatus).
2. Inimene märgib iga rea **OK / VALE** (klaviatuuri-kiirus: `j`=OK, `k`=VALE, nool edasi).
3. Arvuta **VALE-määr** = VALE / N (lubatud piir: **≤ 3/100**).
4. **Kui VALE-määr ≤ lubatud piir** → nupp **"Kinnita ülejäänud vahemik hulgi"** (kõik selle vahemiku pending, v.a valimis VALEks märgitud, lähevad `product_synonym`-i). Valimi VALE-read → tagasi lükatud.
5. **Kui VALE-määr > piir** → vahemik jääb avatuks. UI pakub **väiksemat alamjaotust: L3-kategooria kaupa** (iga L3-klaster oma valim + oma otsus). Nii isoleeritakse "halb" L3 puhastest.

### Lubatud VALE-määr + valimi suurus = seadistatavad (MITTE koodis fikseeritud) — Tarmo otsus
- Hoitakse `review_bucket_config` real (või env `SYN_ACCEPT_MAX_VALE` + `SYN_SAMPLE_N`), UI-s liugur/väli.
- **Kinnitatud lävi: VALE ≤ 3/100** (valim N=100). Põhjendus: vale sünonüüm = otsingu-müra (leebe tagajärg, mitte data-corruption), aga 2436 hulgi-kinnitust 3 %-ga = kuni ~73 võimalikku müra-sünonüümi live — rangem kui varasem 8 % ettepanek. Mõlemad väärtused **seadistatavad**, mitte koodis fikseeritud.
- **0.00 praht (9 tk):** ei kuulu valimi-loogikasse — otse "lükka kõik tagasi" + nimekiri (inimene võib üksikuid päästa enne).

### 1330 "≥0.85 aga review:true" — SAMA lävi (mitte leebem)
**Käsitle eraldi vahemikuna, AGA SAMA läviga (≤ 3/100).** Need on kõrge-kindlusega, review'sse sattunud AINULT LLM enda `review:true` lipu tõttu — enamik on tõenäoliselt korras (LLM üle-ettevaatlik). **Töövoog:** üks 100-valim; kui VALE ≤ 3 → hulgi-kinnita.
**Follow-up (hook-häälestus, eraldi — ALLES pärast valimi andmeid):** kui valim kinnitab, et ≥0.85+review:true on valdavalt hea, kaalu [6.6] hooki muutust — ära marsruudi ≥0.85 review'sse ainult `review:true` pärast (vähendab tulevast bucketi-täitumist). See on **eraldi otsus pärast esimest valimit**, mitte osa UI-st, ja seni **lävi jääb SAMAKS**.

---

## 2. KLASSIFIKAATORI ÜLEVAATUS — klastrite kaupa

26 toodet / 13 klastrit (14 new_l3 · 9 review · 3 quarantine). Klaster = sama pakutud tüüp.

### DUP-värav (KRIITILINE — sunnib enne L3-loomist)
Sama kontseptsioon võib olla mitmes klastris eri sihtkohaga:
- **lumber rack:** 6 tk → `Ladu > Riiulid ja restid` **JA** 2 tk → `Garaaž > Garaaži-hoiustamine` (+ 1 quarantine).
- **paracord:** new_l3 (`Sport > Matkavarustus`) **JA** 3 quarantine.

UI **grupeerib need üheks DUP-plokiks** ("lumber rack — 9 toodet, 2 pakutud kodu + 1 quarantine") ja **sunnib valima ÜHE sihtkoha**, enne kui "Loo L3" lubatakse. Nii ei teki topelt-kodu (HARD RULE meetodi dup-värav UI-s jõustatud).

### Otsused (klastri/DUP-ploki kohta)
`[Loo L3 valitud L2 alla]` · `[Määra olemas-L3-sse]` (DUP-värav pakub lähima) · `[Quarantine]` · `[Lükka tagasi]`

**propose-not-create säilib:** UI ei loo ega liiguta midagi ilma inimese klõpsuta. Vaikeväärtus on alati "ei tee midagi".

---

## 3. MIS JUHTUB PÄRAST OTSUST (HARD RULE #5 vaates)

### Kinnitatud sünonüüm → `product_synonym`
- **Soovitus: vaikimisi JÄRGMINE öine [7.5] sync** + valikuline nupp **"Sünkri kohe"**.
- **Põhjendus:** [7.5] sync ehitab Meili synonym-graafi tervikuna (batch); teha seda iga klõpsu peale = raiskav ja tekitab Meili churn'i. Öine [7.5] jookseb niikuinii peale [7] reindeksit. **"Sünkri kohe"** (jooksutab `sync-synonyms.mjs`) on olemas kiireloomuliseks — tulemus püsib live kuni järgmine reindeks[7], siis [7.5] taastab. Seega kohene sync on ohutu, lihtsalt tavaliselt tarbetu.
- **✅ SYNC EEMALDAB KA (punkt 4 kontrollitud):** `sync-synonyms.mjs` teeb **`PUT /indexes/products/settings/synonyms`** täis-ehitatud graafiga DB `product_synonym` tabelist. **PUT ASENDAB kogu Meili synonyms-seade** (mitte merge/PATCH) → **DB-st kustutatud/tagasi-lükatud sünonüüm kaob Meilist automaatselt** järgmisel synkil. Lisaks öine [7] reindeks kustutab kõik synonyms, [7.5] ehitab DB-st uuesti → iga öö = täis-vastavus DB-ga. **Ei vaja parandust enne 2b-d.** (Tagasivõtmine kustutab `product_synonym` rea → järgmine sync eemaldab Meilist.)

### Kinnitatud L3 → kas öine korjab ülejäänud sarnased automaatselt?
- **JAH, osaliselt.** Kui L3 on loodud, muutub see [4] classify jaoks kehtivaks koduks → **tulevased feed-tooted (öine [4], ≥0.85) marsruutuvad sinna automaatselt**, DUP-värav väldib taasettepanekut.
- **AGA praegu bucketis olevad sama-tüüpi tooted** (valimis + quarantine peidus) ei liigu ise → **klastri kinnitamine liigutab NEED tooted kohe** (need, mis klastris/DUP-plokis on). Ülejäänud korpuse sama-tüüpi (kui peidus mujal) → järgmine öine [4] või käsitsi intra-QA skänn.

### Otsuste logi + tagasivõtmine
- **Tabel `review_decision_log`** (append-only): `kes` (admin-session), `millal`, `ämber`, `otsus`, `mõjutatud_tooted[]`, hulgi puhul **`valimi_alus`** (vahemik, N, VALE-määr, kasutatud lävi).
- **TAGASIVÕTMINE (eriti hulgi):** iga logikirje on pööratav.
  - Sünonüüm-hulk: undo → mõjutatud `synonym_review` read tagasi `pending`, loodud `product_synonym` read kustuta (kasutab logitud SKU-nimekirja + `synonym_gen_backup`).
  - Klassifikaator: undo → toote kategooria-seos tagasi, `classification_review` tagasi `pending` (kasutab `category_classification_audit` before-state'i).
- **Nähtavus:** logi-vaade lehe allservas ("viimased 20 otsust + [võta tagasi]").

---

## 4. VANA `xl-admin/categorization-queue` (loeb surnud v_review_queue 11505)

**Soovitus: MÄRGI "pärand" + suuna uuele lehele. ÄRA kustuta selles etapis.**
- Route jääb alles (audit), aga lehe päisesse **kollane bänner:** *"⚠️ See on vana v3→v4 järjekord (surnud, viimane kirje 2026-07-22). Aktiivne ülevaatus → Review-bucket."* + link.
- **Nav:** asenda päise link `Categorization Queue` → `Review-bucket` (uus). Vana route jääb kättesaadavaks otse-URL-iga, aga navist eemaldatud (või "Pärand (vana)" alamlingina).
- Andmete/tabeli kustutamine = **eraldi hilisem otsus**, mitte nüüd.

---

## 5. TEHNIKA

### Kus leht elab + muster
- `storefront/app/xl-admin/review-bucket/page.tsx` — server-komponent (nagu `taxonomy-health`), read läbi `/api/admin/review-bucket` (DB-päring), otsused läbi `/api/admin/review-bucket/decision` (POST). Järgib olemasolevat `/api/admin/categorization-queue` mustrit.
- Cache: 60s module-level (nagu taxonomy-health), et vältida iga refreshi peale rasket päringut.

### Autentimine (praegune seis — kinnitatud)
- `xl-admin/layout.tsx` **jõustab auth'i** (2026-06-05): `readAdminSession()` server-side, redirect `/admin-login` kui sessiooni pole → **gate'ib KÕIK `/xl-admin/*` lehed**.
- Write-API'd `/api/admin/*` on **juba eraldi gate'itud**.
- **Praktikas: ainult admin-login sessiooniga (Tarmo) pääseb ligi.** Uus leht + selle write-API pärivad sama kaitse automaatselt.

### Digesti lingirea aktiveerimine
- Koos lehe deploy'ga: eemalda `void linkLine`, kuva `linkLine`; lisa `.env`-i `XL_ADMIN_BASE_URL=https://staging.xlmarket.ee`. Fail-loud loogika on juba koodis. (Tehakse **2d** all.)

### Multi-feed (KINNITATUD)
- Uue feedi (Powermat/BlackTools/KraftDele) ettepanekud läbivad **sama [6.6] sünonüümi-hooki + [4] classify'd** (mõlemad `deriveBrandSlug`-põhised, bränd-agnostilised) → maanduvad **samadesse `synonym_review` / `classification_review` tabelitesse** → ilmuvad **samadesse vaadetesse ILMA koodimuudatuseta**. UI loeb tabelist, mitte feed-spetsiifiliselt.

---

## 6. PAIGUTUS — ASCII-visand

### Ülariba + ämbrite kaardid (avavaade)
```
┌─ XL Admin ─ Taxonomy Health · Review-bucket · Kategooriad ──────────────────┐
│                                                                              │
│  📋 Review-bucket — 2026-09-24            Lävendid: sünon 🟠 · klass 🟠      │
│                                                                              │
│  ┌───────────────────────────┐   ┌───────────────────────────┐              │
│  │ 🔤 SÜNONÜÜMID       3828   │   │ 🏷 KLASSIFIKAATOR     26   │              │
│  │  praht 0.00 ....... 9      │   │  🆕 uus tüüp ........ 14   │              │
│  │  <0.7 ............. 53     │   │  ❓ madal kindlus ... 9    │              │
│  │  0.7–0.85 ........ 2436    │   │  ⚠️ quarantine ...... 3    │              │
│  │  ≥0.85+review .... 1330    │   │                            │              │
│  │  vanim 3p · lahend. 100%   │   │  vanim 4p · trend 6.1×     │              │
│  │  [ Ava valimi-vaade → ]    │   │  [ Ava klastri-vaade → ]   │              │
│  └───────────────────────────┘   └───────────────────────────┘              │
│                                                                              │
│  🏚 Kodutud (kategooriata, navis nähtamatu): 0                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Sünonüümi valimi-vaade (vahemik 0.7–0.85, valim 10 reaalse reaga)
```
┌ SÜNONÜÜMID · vahemik 0.7–0.85 · 2436 kirjet · valim 100 (näidatud 10) ───────┐
│ Lubatud VALE: [ ≤3/100 ] ▼   Valim: [ 100 ] ▼   VALE seni: 1/10              │
│                                                                              │
│  conf  termin                    sünonüümid                     L3           │
│  0.70  trummiharjutuste taldrik  —                              Trummikompl. │ [OK][VALE]
│  0.80  koorijad                  juhtmekoorijad, vasktr. koori. Juhtmekoorim. │ [OK][VALE]
│  0.80  jooniste hoidik           roll file organizer            Joonistehoidj │ [OK][VALE]
│  0.75  nahavoolitus seade        —                              Mikronõelamis │ [OK][VALE]
│  0.82  pudeli märkimasin         labeler, autom etiketimasin    Etiketimasin. │ [OK][VALE]
│  0.80  traat                     kaabel, wire cable             Terastrossid  │ [VALE] ◄ liiga üldine
│  0.80  liikumisabi               lift assist bar, mobility bar  Voodi-trapets │ [OK][VALE]
│  0.80  küpsetuse riiulid         õikõrgi riiulid                Põrandariiulid │ [OK][VALE] ◄ "õikõrgi"=katki?
│  0.80  tõmmetvoolik              pressure hose, flex hose       Hüdrovoolikud  │ [OK][VALE]
│  0.75  lihvija tolmukogumisel    grinding dust collector,...    Nurklihvija   │ [OK][VALE]
│                                                                              │
│  [ Kinnita ülejäänud 2426 hulgi ]   [ Jaga L3 kaupa ]   [ Tühista ]          │
│   ↑ lubatud ainult kui VALE-määr ≤ 3/100                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Klassifikaatori klastri-vaade (DUP-plokk: lumber rack)
```
┌ KLASSIFIKAATOR · DUP-plokk: "lumber rack / puiduhoiuriiul" · 9 toodet ───────┐
│  ⚠️ Sama kontseptsioon 2 pakutud kodus + quarantine — vali ÜKS sihtkoht:     │
│                                                                              │
│   ( ) Ladu > Riiulid ja restid              6 toodet   conf 0.55            │
│   ( ) Garaaž > Garaaži-hoiustamine          2 toodet   conf 0.40            │
│   ( ) quarantine                            1 toode    conf 0.55            │
│                                                                              │
│   Tooted:  Lumber Rack 4-Tier 2-Pack 50kg · 3-Tier 6-Pack · 6-Tier 2-Pack…  │
│                                                                              │
│   Otsus:  [ Loo L3 valitud L2 alla ]  [ Määra olemas-L3-sse ]               │
│           [ Quarantine ]              [ Lükka tagasi ]                        │
│   ( "Loo L3" lubatud alles kui üks sihtkoht valitud — DUP-värav )            │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. EHITUSE TÜKELDUS (igaüks eraldi näita→kinnita)

| Osa | Sisu | Testitav tulem |
|---|---|---|
| **2b** | Sünonüümide valimi-vaade + hulgi-kinnita + L3-alamjaotus + 0.00-reject + otsuste logi/undo | Kinnita üks vahemik valimiga, kontrolli `product_synonym` + undo töötab |
| **2c** | Klassifikaatori klastri-vaade + DUP-värav + 4 otsust + propose-not-create | Loo üks L3 DUP-plokist, kontrolli et 2. sihtkoht blokeeritud enne valikut |
| **2d** | Vana categorization-queue → "pärand" bänner + nav-vahetus + digesti lingirea aktiveerimine (`.env` + kuva) | Vana leht näitab bännerit, uus link navis, digest näitab linki |

Iga osa: eraldi commit (HARD RULE #4 mõlemale harule), näita→kinnita enne järgmist.

---

## KÜSIMUSED — ✅ LAHENDATUD (Tarmo, 2026-09-24)

1. ~~Lubatud VALE-määr~~ → **≤ 3/100**, seadistatav. Ühine lävi kõigile vahemikele (mitte per-vahemik).
2. ~~Valimi suurus N~~ → **100** (suurtel vahemikel; vahemik < N → näita kõik). Seadistatav.
3. ~~1330 "≥0.85+review:true"~~ → **SAMA lävi** (mitte leebem). Hook-häälestus **alles pärast valimi andmeid**.
4. ~~Sünonüümi sync~~ → öine [7.5] + valikuline "sünkri kohe". ✅ Kontrollitud: [7.5] eemaldab ka kustutatud (täis-PUT).
5. ~~Vana categorization-queue~~ → "pärand"-bänner + navist eemaldus (route jääb).
6. ~~Ehituse järjekord~~ → **2c (klassifikaator) → 2b (sünonüümid) → 2d**.
