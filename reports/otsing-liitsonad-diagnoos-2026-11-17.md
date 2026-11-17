# Otsingu liitsõnade + sõnavara diagnoos ja lahendus-ettepanek

> 2026-11-17 · staging (k33g, staging.xlmarket.ee) · AINULT LUGEMINE tehtud, MIDAGI EI MUUDETUD.
> Sisaldab: (1) ajalugu, (2) mõõtmine enne, (3) lahendus (deterministlik, 2 kihti), (4) Google/SEO
> sõnavara = sama süsteem, (5) backfill+hook, (6) regressioonitest, (7) kuluhinnang, (8) otsuskohad.

---

## 0. KOKKUVÕTE (TL;DR)

- **Juur pole "Meili katki".** Meili tõesti sobitab **sõna ALGUST**, mitte liitsõna teist poolt ega käändeid. AGA seda auku **lappib praegu suur KÄSITSI/LLM-sünonüümi-graaf** — `product_synonym` **37 125 rida → 105 781 Meili-sõna** (`sg-v1` 34 354 + `auto-judge-consensus` 2 769). Sellepärast leiab enamik testsõnu midagi (nt `kõrgsurvepesur`=70, `õhksoojuspump`=88 **kuigi ükski toote-pealkiri neid ei sisalda** — puhtalt sünonüümist).
- **Probleem: lapp on AUGULINE ja EI SKALEERU (rikub HARD RULE #6).** Augud on ettearvamatud: `praeahi`=**0**, `mikrolaineahi`=**2**, `aurupesur`=**2**, `ahi` leiab 38/108 (⅔ liitsõna-tooteid kaob). Iga uus feed-toode on leitav **ainult siis, kui LLM-sünonüümi-jooks talle sõnad genereeris** — vahele jäänud = vaikselt otsingust väljas. See on täpselt "kaks paralleelset süsteemi", mida sa kardad.
- **Lahendus = 2 selget kihti, mõlemad DETERMINISTLIKUD, mitte LLM päringu ajal:**
  - **KIHT 1 — eesti morfoloogia (Vabamorf/EstNLTK), deterministlik.** Liitsõna jagamine + algvormid, **indeksis JA päringus**. Lahendab: `ahi`↔`elektriahi`/`praeahi`, käänded (`ahjud`→`ahi`, `pumbad`→`pump`), kokku/lahku (`akutrell`↔`aku trell`). **Tasuta, skaleerub, augutu.**
  - **KIHT 2 — üks sõnavara L3 kohta (SSoT).** Päris-sünonüümid, mida morfoloogia EI tuleta (`softijäätis`↔`pehme jäätis`, `torpeedo`↔`soojapuhur`). **See ON sinu Google-sõnavara idee** ja see **ASENDAB** praeguse laialipillutatud toote-skoobis sünonüümi-graafi ühe korrastatud per-L3 allikaga. Toidab korraga: (a) Meili sünonüümid, (b) kategooria SEO-tekst (Google), (c) tootekirjeldused.
- **Kaks süsteemi EI teki:** KIHT 2 sõnavara on **üks ülesvoolu-allikas**, mida olemasolevad kaks väljundit (`product_synonym`→Meili ja `taxonomy_node_seo`→Google) tarbivad. Praegune per-toode sünonüümi-graaf kahaneb **päris-sünonüümideks** (käänded/liitsõnad lähevad KIHT 1 alla).
- **Kuluhinnang:** KIHT 1 ≈ **0 € API** (lokaalne morfoloogia, CPU-minutid). KIHT 2 ≈ **3–8 € ühekordne** (konsensus ~1 721 L3 peal, Haiku/Sonnet) + öine delta sendid. Vt §7.
- **MIDAGI EI TEHTUD.** DRY enne/pärast all §6. Ootan kinnitust enne ehitust.

---

## 1. AJALUGU — mis on olemas, miks ei tööta täielikult

| Komponent | Asukoht | Mida teeb | Miks ei lahenda |
|---|---|---|---|
| `expandCompoundWords(q)` | `storefront/lib/meilisearch.ts:105` | Liitsõna-sõnastik päringus | **AINULT INGLISE**, ~28 kirjet (powertools→power tools). Eesti sõnadele **no-op**. |
| `product_synonym` + `sync-synonyms.mjs` | DB + medusa | 37 125 rida → globaalne Meili sünonüümi-graaf (105 781 sõna) | **Käsitsi/LLM per-toode** (generate-synonyms.mjs, Haiku + konsensus). Lappib, aga **auguline + ei skaleeru** (iga uus toode vajab oma LLM-jooksu). |
| `stem()` | `scripts/lib/concept-gate.mjs:35` | Kerge eesti tüve-lõikaja | **Ainult klassifikaatori near-dup recall'iks**, EI ole otsingus. "Pole täielik morfoloogia." |
| `taxonomy_node_seo` | DB (1 966 rida) | Per-kategooria `description_et/en` + `tagline_et/en` + `seo_gate_pass` | Google-pool OLEMAS, aga **ei saa sõnavara** süstemaatiliselt (käsitsi/placeholder). |

**Järeldus:** eesti morfoloogiat otsingus **pole kunagi olnud**. "Lahendus" on de facto olnud suur LLM-sünonüümi-graaf — see on toonud leitavuse ~OK tasemele, aga ettearvamatute aukudega ja käsitsi-sõltuvusega.

---

## 2. MÕÕDA (enne parandust) — 52 sõna, toores Meili = matching-tõde

> Meetod: `hits` = mida otsing NÜÜD leiab (`estimatedTotalHits`). `title sisaldab` = mitu distinct
> toote-pealkirja sisaldab sõna substringina = **ülempiir, mida korrektne komponent/lemma-väli leiaks**.
> Prod `/api/ai-search` + `/api/products` kasutavad SAMA indeksit (kinnitatud live: `ahi`=12 cap, `praeahi`=0).

**Täistabel:** vt `/tmp/.../proj-tulemus.txt` (52 rida). Olulisemad:

| sõna | ENNE (hits) | title sisaldab | tõlgendus |
|---|---|---|---|
| `ahi` | 38 | **108** | 🟠 liitsõna teine pool kaob (elektri\|ahi, prae\|ahi) — ⅔ kaob |
| `laud` | 375 | **787** | 🟠 töö\|laud, lõike\|laud jne — pool kaob |
| `praeahi` | **0** | 0 | 🔴 auk — vajab query-split `prae+ahi` |
| `mikrolaineahi` | **2** | 0 | 🔴 peaaegu auk — sünonüüm puudulik |
| `aurupesur` | **2** | 0 | 🔴 peaaegu auk |
| `kõrgsurvepesur` | 70 | 0 | 🟢 TÖÖTAB — aga **ainult sünonüümist** (ükski title ei sisalda) |
| `õhksoojuspump` | 88 | 0 | 🟢 TÖÖTAB — ainult sünonüümist |
| `ahjud`/`pumbad`/`generaatorid`/`kompressorid` | 29/59/160/22 | 0 | 🟢 käänded — töötavad sünonüümist, EI deterministlikult |
| `aku trell` ↔ `akutrell` | 581 / 10 | 0 | 🟠 kokku/lahku ebajärjekindel (lahku 581, kokku 10) |

**Võtme-leid:** leitavus **sõltub sünonüümi-graafist**, mitte matchingust. Kus graaf katab → töötab; kus ei → vaikne 0. **Ettearvamatu kasutajale ja ei skaleeru feed-kasvul.**

---

## 3. LAHENDUS — kaks deterministlikku kihti (mitte LLM päringu ajal)

### KIHT 1 — eesti morfoloogia (Vabamorf / EstNLTK)

**Tööriist:** EstNLTK (Vabamorf C-tuum) — kanooniline eesti morfoloogia, deterministlik, lokaalne, 0 € API. Liitsõna-piirid + lemma tulevad **determineeritult** morfoloogia-analüüsist (mitte heuristiliselt).

- **INDEKSI pool (backfill + hook):** iga `title_et` (+ L3 nimi) → **komponendid + lemmad** uude otsinguvälja `morph_et`. Nt "Sisseehitatud elektriahi" → `[sisseehitatud, sisse, ehitatud, elektriahi, elektri, ahi]`. Lisatakse `index-meilisearch.mjs` `searchableAttributes` hulka (madalama kaaluga kui `title_et`, et mitte lörtsida relevantsust).
- **PÄRINGU pool:** kasutaja sõnad → lemma + liitsõna split/join. "praeahi" → `[praeahi, prae, ahi]` → komponent `ahi` sobitab 108 toodet. "ahjud" → `ahi`. "aku trell" → ka `akutrell`.
- **ÜLE-LAIUSE VÄRAV (kriitiline, sinu nõue):** split AINULT **päris liitsõna-piiril**, mida morfoloogia-analüüs märgib (mitte igast substringist). Komponent **≥3–4 tähte**; üksik-morfeemi (nt "ahi" ise) EI splitita; stoppsõnad (ja, ning, с) välja. **DRY-kontroll:** mõõda vale-positiivide juurdekasv (nt kas "laud" hakkab tooma "laudkõlar" müra) — kui relevantsus langeb, kitsenda.

**Mida KIHT 1 lahendab (deterministlikult, feed-kindlalt):** liitsõna teine pool · käänded/mitmus · kokku/lahku. = **enamik sinu näiteid.**

### KIHT 2 — üks sõnavara L3 kohta (per-L3 SSoT)

**Probleem, mida morfoloogia EI lahenda:** päris-sünonüümid — eri sõna, sama asi — mida ei saa tuletada (`softijäätis`↔`pehme jäätis`, `torpeedo`↔`soojapuhur`, `webasto`↔`parkimissoojendi`, `mikser`↔`segisti`).

**Mudel:** iga L3 saab **ühe sõnavara-kirje** (nimed, mida eesti ostjad päriselt kasutavad) — konsensus (Sonnet+Opus) + **värav (ainult päris kasutatavad nimed, mitte spämm)**. See on **sinu Google-sõnavara idee 1:1.**

---

## 4. GOOGLE / SEO = SAMA KIHT 2 (overlap-vastus — ÜKS süsteem, mitte kaks)

Sinu küsimus: "kas kattub olemasoleva sünonüümisüsteemi või L3 kirjeldustega? Ära ehita kaks paralleelset süsteemi."

**Vastus: KIHT 2 sõnavara on ülesvoolu-SSoT, mida KÕIK olemasolevad väljundid tarbivad — paralleelsust EI teki:**

```
                    ┌─────────────────────────────┐
                    │  KIHT 2: per-L3 SÕNAVARA SSoT │  (uus, väike tabel: node_id → sõnad[])
                    │  konsensus + värav            │
                    └──────────────┬──────────────┘
                 ┌─────────────────┼────────────────────┐
                 ▼                 ▼                    ▼
     (a) product_synonym    (b) taxonomy_node_seo   (c) tootekirjeldused
         → Meili sünon.         description_et          (kus sobib)
         (OLEMAS)               tagline_et (OLEMAS)
         pood-sisene otsing     LOOMULIKUD LAUSED        
                                mitte nimekiri (Google
                                ei karista toppimist)
```

- **(a) Pood-sisene otsing:** sõnavara → `product_synonym` sünk (olemasolev `sync-synonyms.mjs` graaf). **Käänded/liitsõnad KADUVAD sünonüümidest** (KIHT 1 katab) → graaf **kahaneb** 37k→päris-sünonüümid, muutub hallatavaks per-L3.
- **(b) Google:** sõnavara → `taxonomy_node_seo.description_et/tagline_et` **loomulikes lausetes** (olemasolev `seo_gate_pass` värav + §CLAUDE.md SEO-REEGEL: ei konkreetseid numbreid/lubadusi). Generaator OLEMAS — saab lihtsalt sõnavara sisendiks.
- **(c) Tootekirjeldused:** sisu-generaator saab sõnavara vihjeks (Phase-2, kui sobib).

**Seega: üks sõnavara-SSoT, kolm tarbijat, null paralleelset süsteemi.** Praegune per-toote sünonüümi-graaf **ei dubleeri** — ta muutub ühe tarbija (a) väljundiks.

---

## 5. HARD RULE #5 — backfill + hook (üks transform, kaks kutsujat)

- **Transform SSoT:** üks moodul `scripts/lib/morph-et.mjs` (KIHT 1: title→komponendid+lemmad) + `scripts/lib/l3-vocab.mjs` (KIHT 2: L3→sõnavara konsensus+värav). Kirjutatud **üks kord**, kutsutud backfillist JA hookist.
- **BACKFILL (ühekordne, kogu korpus):** KIHT 1 → kõik 19 612 toodet `morph_et` + 1 721 L3 nime. KIHT 2 → kõik L3 sõnavara.
- **HOOK (öine `import-pipeline.sh`, DELTA peal):** uus toode → `morph_et` arvutatakse (KIHT 1, deterministlik, delta ~100 SKU). Uus L3 → sõnavara **sünnil** (KIHT 2, konsensus+värav) — osa klassifikaatori täielikkus-väravast (HARD RULE #5 gate #3.5). **Per-bränd** (deriveBrandSlug SSoT).
- **FAIL-LOUD:** morfoloogia-viga / sõnavara-miss → samm exit≠0 → **Telegram**; üksik toode kukub → skip+jätka, süsteemne viga → peata.

---

## 6. PÜSIV REGRESSIOONITEST (sinu nõue #5)

- **Fail:** `reports/otsing-regress-sonad.txt` — lihtne tekst, **Tarmo saab ridu lisada**. Formaat: `sõna <TAB> oodatud (L3-handle VÕI toote-SKU VÕI min-arv)`. Nt `praeahi	v4-...-ahjud	min:5`.
- **Jooks:** öise `import-pipeline.sh` LÕPUS → iga sõna päri Meili (prod-tee) → kui oodatud toode/L3 EI tule tulemustes → **Telegram** ("REGRESS: 'praeahi' ei leia oodatud X").
- **Seeme nüüd:** need 52 sõna + sinu lisad. Deterministlik, inimest ei vaja (HARD RULE #6).

---

## 7. KULUHINNANG

| Osa | Ühekordne | Jooksev | Märkus |
|---|---|---|---|
| KIHT 1 morfoloogia (EstNLTK install + backfill 19 612) | **~0 € API** + CPU-minutid | ~0 € (delta lokaalne) | Python-teenus/CLI index-ajal; päring-pool JS-lookup (pole runtime-Pythonit) |
| KIHT 2 sõnavara konsensus (~1 721 L3, Sonnet+Opus) | **~3–8 €** | öine delta ~sendid | Haiku odavam (~1–2 €), aga kvaliteet madalam; soovitus Sonnet+konsensus |
| SEO-tekst regen (olemasolev generaator, sõnavara sisend) | kaetud olemasolevaga | — | ainult sõnavara lisandub |
| Ehitustöö (minu aeg) | KIHT 1 ~pool päeva, KIHT 2 ~pool päeva, regress ~1h | — | DRY prototüüp enne live-t |

**Runtime-arhitektuur (oluline):** morfoloogia (Python/Vabamorf) jookseb **AINULT index/backfill-ajal**. Päringu-pool kasutab **korpusest eelarvutatud komponendi-sõnastikku** (puhas JS, kiire, deterministlik) → **pole Pythonit Next.js runtime'is**, pole latentsust.

---

## 8. ENNE/PÄRAST (DRY projektsioon) + mida prototüüp tõestaks

**Praegu mõõdetud (enne):** §2. Augud: `praeahi`=0, `mikrolaineahi`=2, `aurupesur`=2; `ahi` 38/108; `laud` 375/787.

**Projektsioon (pärast KIHT 1):** komponent/lemma-väli tõstab `ahi` 38→~108, `laud` 375→~787, ja **query-split** teeb `praeahi`→`ahi`(108), `mikrolaineahi`→`ahi`, `ahjud`→`ahi`, `aku trell`↔`akutrell` deterministlikult (mitte sünonüümi-õnnest).

**DRY-prototüüp, mille ehitan sinu kinnitusel (ei puuduta prodi):** EstNLTK backfill **ajutisse Meili-indeksisse/välja** → jooksutan samad 52 sõna → **päris enne/pärast arvud** + vale-positiivide kontroll (relevantsuse langus). Alles siis live-deploy (4-sammu, undo, Telegram).

---

## 9. OTSUSKOHAD TARMOLE

1. **Kas KIHT 1 + KIHT 2 kahekihiline mudel on õige suund?** (morfoloogia determineerib käänded/liitsõnad; sõnavara ainult päris-sünonüümid + Google/SEO)
2. **Morfoloogia-tööriist:** EstNLTK/Vabamorf (soovitus, eesti-natiivne) vs kerge oma-reeglid (odavam, nõrgem). Soovitus: **EstNLTK**.
3. **KIHT 2 mudel:** Sonnet+Opus konsensus (~3–8 €, soovitus) vs Haiku (~1–2 €, nõrgem).
4. **Kas ehitan DRY-prototüübi** (ajutine indeks, päris enne/pärast 52 sõnaga + vale-positiiv) enne live-otsust? (soovitus: JAH)
5. Sünonüümi-graafi **kahandamine** päris-sünonüümideks (käänded/liitsõnad → KIHT 1) — kas kohe või Phase-2?

**Midagi ei ehitata/muudeta enne sinu kinnitust. Commit tuleb mõlemale harule (HARD RULE #4).**
