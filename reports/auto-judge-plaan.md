# AUTO-JUDGE plaan — review-ämbrid masin otsustab, inimene ainult erandid

> Koostatud 2026-10-06. **AINULT PLAAN — koodi ei kirjutatud.** Otsustajale (Tarmo: punktid 4, 5, 8) + teostajale (XL).
> Suunamuutus: review-ämbreid EI töödelda käsitsi. Masin (kohtunik) otsustab, inimene kinnitab ainult uued L3-d + auditeerib. UI jääb turvavõrguks.

---

## 0. Taust ja eesmärk

**Praegune backlog (2026-10-06, keegi pole ühtki käsitsi-otsust teinud — review_decision_log = 2 rida, mõlemad testid):**

| Ämber | Pending | Vanim | Signaal |
|---|---|---|---|
| synonym_review | **3854** | 15p | 🔴 >14p, lahendamata 100% |
| classification_review | **40** (review 19 · new_l3 15 · quarantine 6) | 16p | 🔴 >14p, trend 1.6× |

**Probleem:** ämbrid täituvad öise impordiga, aga käsitsi-läbivaatuseni ei jõua kunagi → vaikne kvaliteedi-lagunemine (sünonüümid puudu otsingust, tooted kodutud = navis nähtamatud). **Lahendus:** kaks LLM-kohtunikku, mis otsustavad automaatselt olemasoleva review-bucket API kaudu (kõik tagasivõetav), ja jätavad inimesele ainult (a) uue L3 kinnituse ja (b) tõeliselt ebakindla jäägi.

**Võtmepõhimõte säilib — PROPOSE-NOT-CREATE:** kohtunik paigutab AINULT olemas-L3-desse ja kirjutab sünonüüme; **uut struktuuri (L3/L2) kohtunik ISE ei loo** — see läbib inimese-kinnituse (punkt 4). INV-STRUCT-01 (tühja L3 keeld) jõustab seda andmetasandil.

---

## 1. Arhitektuuri ülevaade — kaks kohtunikku, kus pipeline-s

```
                       GENERAATOR (olemas)              KOHTUNIK (uus)
  sünonüümid   Haiku → conf≥0.85 → product_synonym      Sonnet → KOGU synonym_review pending üle:
  [6.6]               conf<0.85 → synonym_review ─────→   OK→product_synonym / VALE→rejected / ebakindel→jääb
  klassifikaator  Opus → auto≥0.85 → assign+publish      Opus → review/new_l3/quarantine üle:
  [4]                  muu → classification_review ───→    assign_existing / grupeeri / new_l3- ettepanek / jääb
```

- **Kohtunik = TEINE kiht generaatori järel.** Odav generaator teeb massi; targem kohtunik adjudikeeerib ebakindla sabaosa. Kohtunik töötab ämbrisse-jäänud kirjete peal (mitte kogu korpust uuesti).
- **⭐ Sünonüümi-kohtunik katab KOGU synonym_review pending ämbri** (Tarmo parandus 2026-10-06) — mitte ainult generaatori sub-0.85 jääki, vaid KA 1344 kirjet, mis on `≥0.85 + review:true` (generaator oli kindel, aga märkis ülevaatuseks). Ehk kõik 3854 pending-terminit läbivad kohtuniku, mitte ainult madal-kindluse osa.
- **Kaks kutsujat, sama kood (HARD RULE #5):** backfill-runner (kogu praegune backlog, ühekordne, Batch API) + öine pipeline-hook (ainult delta, synchroonne). Sama transform-funktsioon mõlemale.
- **Sünonüümi-kohtunik mudel ≠ generaator:** generaator Haiku → kohtunik **Sonnet** (teine mudel = sõltumatu teine arvamus, mitte sama viga; + odavam kui Opus suure mahu juures).
- **Klassifikaatori-kohtunik = Opus** (sama mudel kui klassifikaator, aga **teine ülesanne**): klassifikaator näeb 6 toodet/batch; kohtunik näeb **kõiki ämbri-kirjeid korraga** + loeb kandidaat-L3-de kirjeldusi → suudab grupeerida cross-klastri dupe (lumber rack ×2, paracord) ja rakendada eksklusiivsus-/dup-väravaid, mida ühe-batchi klassifikaator ei näe.

---

## 2. SÜNONÜÜMI-KOHTUNIK

**Ulatus (Tarmo parandus):** katab **KOGU synonym_review pending ämbri** = 3854 kirjet, sh 1344 "≥0.85 + review:true" (mitte ainult sub-0.85). Generaatori kindlus on sisend-signaal, aga EI vabasta kirjet kohtunikust.

**Sisend (per termin, synonym_review-st):** `word` + toote EN pealkiri + ET pealkiri (`title_et`) + L3 nimi/path + lühikirjeldus (~1-2 lauset) + generaatori `confidence` + `reason`.

**Kriteerium (prompt-süda):** *"Kas klient, kes otsingusse kirjutab selle sõna, ootaks NÄHA seda toodet?"* → `OK` / `VALE` + lühi-põhjus eesti keeles.

**Väljund → tegevus:**
| Verdikt | Tegevus |
|---|---|
| OK (kõrge kindlus) | → `product_synonym` (sama kirje, mida auto≥0.85 oleks kirjutanud); synonym_review.status='resolved' |
| VALE | → synonym_review.status='rejected' + põhjus (ei kirjutata product_synonym'i) |
| EBAKINDEL | → jääb pending (väike jääk — see on ainus, mis inimeseni jõuab) |

**Mudel:** `claude-sonnet-5`. **Maht:** grupeeri ~10 terminit päringu kohta (prompt-cache süsteemi-osale). **Fail-loud:** kui kohtunik-batch kukub (API/krediit) → termin jääb pending, Telegram raporteerib skipitud-arvu (ei peata pipeline'i üksiku pärast — HARD RULE #5 kukkumis-granulaarsus).

**NB sünonüümide eripära:** generaator genereerib ainult sünonüüme, variandid (kirjapildi-kombinatsioonid) tulevad koodist (100% õiged, `buildRows`). Kohtunik hindab AINULT sünonüüme, variante ei puutu.

---

## 3. KLASSIFIKAATORI-KOHTUNIK

**Sisend:** toote andmed (title_en, title_et, kirjeldus, tehniline spets, pilt-URL, praegune bucket + classifier `proposed_l3`/`suggest_name`/`suggest_l2`/`confidence`) + **KOGU v4-taksonoomia** (L3-handle + nimi + kirjeldus-profiil, prompt-cache'itud).

**Otsustusloogika (9-punkti sisu-reegel + reegli-pingerida CLAUDE.md-st):**
1. **assign_existing** — kui ämbris olev toode sobib semantiliselt OLEMAS-L3-sse (klassifikaator oli madala kindlusega, aga kohtunik kinnitab kogu-puu-vaatega). *Suurim kiirvõit: 19 "review" (olemas-L3, conf 0.60–0.85) + osa quarantine'st.*
2. **Grupeeri ise** — sama kontseptsioon mitmes klastris (nt "Puidu hoiuriiulid" + "Puiduhoiuriiulid" lumber rack; paracord ×N) → üks ühine otsus, mitte N eraldi. DUP-värav ENNE new_l3.
3. **new_l3-ettepanek** — AINULT kui kogu puus pole sobivat tüüpi (tõestatud). → **EI loo ise**, koostab ettepaneku inimesele (punkt 4).
4. **jääb** — tõeliselt ebakindel → pending (väike jääk).

**Tegevused API kaudu:** `assign_existing` (publitseerib draft'i + seob kategooria, undo taastab), `create_l3` ainult ettepaneku-logina (PROPOSE-NOT-CREATE — ei muuda live-puud).

**⚠️ QUARANTINE-REEGEL (Tarmo parandus 2026-10-06):** kohtunik tohib quarantine-kirje (6 tk) määrata assign/new_l3-ettepanekuks **AINULT kui quarantine põhjus on klassifitseerimise ebakindlus** (classifier ei suutnud otsustada). **Kui põhjus on FEEDI ANDMEKVALITEET** (puudu/katki title, tühi kirjeldus, vigane spets) → **jääb välja** (kohtunik ei arva andmeauku täis) + **eraldi märge digestis** ("⚠️ N quarantine = feedi andmekvaliteet, vajab andme-parandust, mitte paigutust"). Kohtunik peab seega quarantine puhul esmalt **klassifitseerima põhjuse** (ebakindlus vs andmeviga) ja alles siis otsustama.

**Mudel:** `claude-opus-4-8`. **Maht:** batch ~6 toodet/päring (nagu klassifikaator), kogu-ämbri grupeerimine tehakse eel-sammus (kõik 40 korraga ühte prompti → leia klastrid → siis adjudikeeri).

---

## 4. UUE L3 LOOMINE — variant (b), Tarmo valitud

**Masin koostab ettepaneku-paketi, Tarmo kinnitab ühe vajutusega.** Ettepanek sisaldab:
- **Nimi** (õige eesti nimi kohe sünnihetkel — NIME-REEGEL, Eesti müüjate etalonide järgi, mitte masintõlge)
- **Vanem-L2** (kuhu alla)
- **Tooted** (mis ämbri-kirjed sinna lähevad, N tk)
- **Põhjendus** (miks olemas-L3 ei sobi — 9-punkti sisu-reegel)
- **DUP-kontroll tehtud** (kohtunik on tõestanud: ükski olemas-L3 ei kata)
- **Soovituslik merge/split-kontroll** (kas kõrval-L2-s on sama tüüp → merge-kandidaat)

### Telegrami nupp vs UI üks-nupp — soovitus: **UI üks-nupp** ✅

| | Telegrami inline-nupp | UI üks-nupp (xl-admin) |
|---|---|---|
| **Vajab uut infra?** | **JAH** — callback-vastuvõtja (webhook või long-polling bot-protsess). Praegu pipeline ainult SAADAB Telegrami (`notify-telegram.sh`, ühesuunaline) | **EI** — xl-admin UI + review-bucket API + `create_l3` tegevus + auth + undo **juba olemas** (categorization-queue leht) |
| **Audit/jälg** | Nupuvajutus pole iseenesest auditeeritav ilma lisa-logita | Logib review_decision_log'i (actor, põhjus, undo) automaatselt |
| **Konteksti-maht** | Telegram näitab lühi-teksti; pikk põhjendus + tootenimekiri kohmakas | UI näitab täis-paketi (tooted, pildid, kandidaat-L3-de kirjeldused) |
| **Turvavõrk** | — | **UI ongi see turvavõrk/audit**, mille Tarmo tahab säilitada |

**KINNITATUD (Tarmo 2026-10-06): UI üks-nupp + Telegrami teavitus lingiga.** Põhjus: kogu vajalik (API `create_l3`, auth teenuskonto, undo, queue-leht) on **juba ehitatud** — lisada tuleb vaid "Kinnita ettepanek" nupp, mis kutsub olemas-`create_l3`. Telegram **teavitab** ("🆕 3 uut L3-ettepanekut ootab kinnitust → [link UI-sse]") deep-lingiga. **Telegram teavitab, UI kinnitab** — null uut infra, täis-audit.

### 🌉 BUILD-BRIDGE — iganädalane TÄIESTI AUTOMAATNE struktuuri-build (Tarmo parandus 2026-10-06)

`create_l3` on PROPOSE-NOT-CREATE → kinnitus LOGIB kavatsuse, L3 materialiseerub alles 4-sammu deploy'ga. Tarmo otsus: **kinnitatud ettepanekute → live viimine on TÄIESTI automaatne cron, mitte käsitsi XL-töö.**

**Cron (nt pühapäeva öö) — build-bridge samm-sammult:**
1. **Loe kinnitatud ettepanekud** — review_decision_log `action='create_l3' AND status='applied'` (Tarmo kinnitas UI-s), mida pole veel live-puusse viidud (meta.built != true).
2. **genyM** — lisa uued L3-d SSoT-i (`taxonomy-*.yaml`), auto-värskendab dumbid DB-st (stale-dump gotcha lahendatud).
3. **VÄRAVAD (kõik peavad läbima):** `lock-harness.mjs pre` (kaart+backup+baseline) → DB-migratsioon → `inv-taxonomy.mjs` (0 FAIL) → `lock-harness.mjs post` (distinct säilinud, struktuur, Meili värske). Lisaks merge-judge uute L3 kõrval-L2-l (üle-fragmenteerimise kontroll).
4. **Määra klastri tooted** uude L3-sse (ettepaneku `affected` product_ids → product_category_product).
5. **4-sammu deploy:** DB-migratsioon ✓ + Meili reindeks + `git push origin taxonomy-v4` + Coolify storefront redeploy (nav-puu rebuild).
6. **Telegram tulemus:** "✅ Build: 2 uut L3 loodud, 14 toodet määratud, nav uuendatud" VÕI "🔴 Build PEATUS väraval INV-SEG-01 — midagi ei deploy'tud, vaata [link]".

**🔒 KÕIK-VÕI-MITTE-MIDAGI:** iga värav (INV/harness/merge-judge FAIL) → **peatu KOHE, ära deploy'i poolikult**, Telegram-alert. Transaktsioon (ON_ERROR_STOP) + "kas kõik 4 sammu tehtud" kontroll luku lõpus. Pooleldi-build (DB õige, nav vana) on KEELATUD seis. See on sama 4-sammu-distsipliin mis käsitsi-lukkudel, aga automatiseeritud ja väravatega kaitstud.

**Miks partii (nädalas), mitte kohe-igaüks:** SSoT-regen + redeploy on kallis (build-time bundle) → üks nädalane partii = üks deploy kõigile kinnitatud L3-dele, deterministlik, väldib N redeploy'd nädalas.

---

## 5. KALIBREERIMINE (enne kui kohtunik otsustab päriselt)

**Samm-sammult (Tarmo parandus — PIME hindamine):**
1. **Dry-run valim:** kohtunik jookseb `--dry` režiimis juhuslikul valimil — **100 sünonüümi** (synonym_review-st, kogu pending seast) + **kõik 40 klassifikaatori kirjet**. Väljund salvestatakse (verdikt + põhjus + kindlus), **EI kirjuta DB-sse**.
2. **🙈 Tarmo hindab PIMESI** — xl-admin **kalibreerimisleht**, kus iga kirje kohta on OK/VALE (sünonüüm) või assign-kuhu / new_l3 / jääk (klassifikaator) nupp. **Kohtuniku vastus on PEIDETUD**, kuni Tarmo on kõik hinnanud (väldib ankurdamist kohtuniku otsusele). Progress "47/140 hinnatud".
3. **Automaatne võrdlustabel** pärast viimast hinnangut: Tarmo vs kohtunik kõrvuti, lahkuminekud esile tõstetud, kaks veamäära arvutatud:
   - **VALE-OK määr** (kohtunik OK/assign, Tarmo VALE) — **KRIITILINE**, kirjutab vigase andmise live'i.
   - **Liiga-ettevaatlik määr** (kohtunik jättis jääki, Tarmo oleks otsustanud) — ohutu, ainult efektiivsus.
4. **Lävendid KINNITATUD (Tarmo 2026-10-06):**
   - Sünonüümi-kohtunik: **VALE-OK ≤ 5%** → luba auto-kirjutus.
   - Klassifikaatori-kohtunik: **VALE-assign ≤ 2,5%** (= **≤ 1 viga 40-st**) → luba auto-assign.
   - Üle läve → kohtunik jääb dry-run/propose-režiimi, prompti parandatakse, korratakse valim.
5. **Perioodiline triivi-kontroll:** juhuslik valim **30 kirjet kord kuus** (sama pime-leht) → kui VALE-OK/VALE-assign tõuseb üle läve → **automaatrežiim peatub + Telegram-hoiatus**.

**Kalibreerimislehe välimus** (xl-admin/kalibreerimine) — vt eraldi näidis-mockup ehitussammu raportis.

**NB:** mudeli-kulu EI ole piirav tegur (vt punkt 7) — **korrektsus on**. Kalibreerimine on selle plaani kriitiline värav, mitte formaalsus.

---

## 6. HARD RULE #5 — backfill + hook + multi-feed

**Üks transform-funktsioon, kaks kutsujat** (sama kood → backfill ja hook ei lahkne):

1. **BACKFILL (ühekordne, kogu praegune backlog):** 3854 sünonüümi + 40 klassifikaatori kirjet. Batch API (−50%, latentsus OK). Runner: `auto-judge-run.mjs --all --batch` (muster nagu `synonym-gen-run.mjs --all --batch`).

2. **ÖINE HOOK (delta):** uued kirjed, mis öine import ämbrisse lisas.
   - **Sünonüümi-kohtunik:** peale `[6.6] sünonüümid` → töötab AINULT selle öö sub-0.85 terminite peal (generaator just lisas), MITTE kogu 3854.
   - **Klassifikaatori-kohtunik:** peale `[4] classify` → töötab AINULT öö review/new_l3/quarantine kirjete peal (`/tmp/classify-skus.txt` delta).
   - **Synchroonne** (mitte batch) — pipeline peab samas jooksus assign'ima + reindekseerima; delta väike → sync-kulu tühine (batch-latentsus 24h ei sobi öisesse torusse).

3. **MULTI-FEED (bränd-agnostiline):** kohtunik otsustab **sisust** (title/spets/kirjeldus), MITTE tootja-nimest → loomu poolest bränd-immuunne (Powermat/BlackTools/KraftDele "garden wagon" = "beach cart" = sama tüüp). Title-strip (`deriveBrandSlug` SSoT, `scripts/lib/brand-strip.mjs`) toimub juba [3.5]-s ENNE classify't → kohtunik saab puhta sisendi. **Kohtunikus EI tohi olla VEVOR-hardcode't.**

4. **FAIL-LOUD:** kohtunik-samm kukub (API/krediit/timeout) → üksik kirje skip + jätka, kogu-partii kukub → exit≠0 → Telegram. Krediit-degrade: järgib olemas-mustrit ([4] CREDIT_PENDING) — kohtunik skip, laoseis+reindeks JÄTKUB.

---

## 7. KULUHINNANG

> Mudeli-hinnad (2026-10, per 1M tokenit): Sonnet 5 $3/$15 · Opus 4.8 $5/$25. **Batch API −50%:** Sonnet $1.50/$7.50 · Opus $2.50/$12.50.

| Töö | Maht | Mudel/režiim | Hinnang |
|---|---|---|---|
| Sünonüümi backfill | 3854 terminit (~150 in / 40 out per termin) | Sonnet Batch | **~€3–5** |
| Klassifikaatori backfill | 40 toodet (~18 klastrit, puu cache'itud) | Opus Batch | **~€0.5–1** |
| **BACKFILL kokku (ühekordne)** | | | **< €6** |
| Öine hook — sünonüümid | ~30–80 sub-0.85 terminit/öö | Sonnet sync | ~€0.08/öö |
| Öine hook — klassifikaator | ~18–40 kirjet/öö (puu cache) | Opus sync | ~€0.10–0.20/öö |
| **ÖINE HOOK kokku** | | | **~€6–10/kuu** |

**Järeldus:** kulu on tühine (backfill alla €6, jooksev alla €10/kuu). **Pudelikael pole raha, vaid kalibreerimise-korrektsus** (punkt 5). Batch API annab backfillil 50% kokkuhoiu latentsuse-hinnaga (≤24h) — öises torus batch EI sobi (sync vajalik reindeksi jaoks), aga seal on maht niikuinii väike.

---

## 8. DIGEST PÄRAST

Praegune digest näitab "ootab otsust X". Uus digest:

```
🤖 AUTO-JUDGE 2026-XX-XX
   🔤 sünonüümid: kohtunik OK 72 · VALE 11 · jääk 6   (jääk 🟢 kahanev)
   🏷 klassifikaator: assign 14 · grupeeritud 3 · new_l3-ettepanek 2 (ootab kinnitust) · jääk 1
   🆕 L3-ettepanekud ootavad Tarmo kinnitust: 2 → [link UI-sse]
```

- **🔴 AINULT kui:** jääk KASVAB (kohtunik ei suuda otsustada — triiv/uus tüüpide laine) VÕI kohtunik ISE ebaõnnestub (API/krediit maas, batch kukkus).
- Roheline = kohtunik töötab, jääk kahaneb/stabiilne, 0 kohtuniku-viga.
- new_l3-ettepanekud alati nähtavad (Tarmo kinnituse-ootel) — deep-link UI-sse.

---

## 9. AVATUD OTSUSED + ETAPIVIISILINE TEOSTUS

**Tarmo otsustab:**
- ☐ Punkt 5 lävendid OK? (sünonüüm VALE-OK ≤5%, klassifikaator VALE-assign ≤2-3%) — või kitsamad?
- ☐ Uue L3 kinnituse-partii sagedus (nädalas korra kõik kinnitatud → 4-sammu deploy? või kohe igaüks?)
- ☐ Kas kohtunik tohib ka quarantine (6) üle vaadata assign-kandidaadiks, või quarantine jääb alati inimesele?

**Teostus-etapid (pärast kinnitust):**
1. `lib/judge.mjs` — transform-funktsioonid (sünonüüm + klassifikaator), bränd-agnostilised, sama kood backfill+hook.
2. Dry-run runner + **kalibreerimise-valim** (punkt 5) → Tarmo hindab → lävend.
3. Lävend OK → backfill (Batch API) → audit review_decision_log'ist.
4. Öine hook pipeline'i ([4] ja [6.6] järele) + digest-uuendus.
5. UI "Kinnita L3-ettepanek" nupp (olemas-`create_l3` peale) + Telegram deep-link.
6. Perioodiline triivi-kontroll (kuine valim).

**Riskid:**
- Kohtunik-generaator sama-viga (sünonüüm): leevendus = eri mudel (Sonnet vs Haiku).
- new_l3 plahvatus: leevendus = PROPOSE-NOT-CREATE + inimese-kinnitus + INV-STRUCT-01.
- Kalibreerimine liiga väike valim: 50+40 on miinimum; kahtluse korral suurenda.
- Batch API latentsus öises torus: lahendatud (hook = sync, backfill = batch).
```
