# AUTO-JUDGE plaan — masin otsustab ja loob ise, inimene = ainult äärmuslik erand

> Koostatud 2026-10-06. Uuendatud 2026-10-06 (õhtul) **HARD RULE #6 "masin töötab ise"** järgi — kõik korduv inimtöö eemaldatud.
> **Põhimõte (HARD RULE #6):** masin töötab ise ilma inimese sekkumiseta; inimene on AINULT äärmuslik erand; iga funktsioon peab skaleeruma 10×–100× ilma inimeseta; kui lahendus eeldab inimese *korduvat* tööd, on see VALE lahendus.

---

## 0. Taust ja eesmärk

**Backlog (2026-10-06):**

| Ämber | Pending | Vanim | Signaal |
|---|---|---|---|
| synonym_review | **3854** | 15p | 🔴 >14p, lahendamata 100% |
| classification_review | **40** (review 19 · new_l3 15 · quarantine 6) | 16p | 🔴 >14p, trend 1.6× |

**Probleem:** ämbrid täituvad öise impordiga; käsitsi-läbivaatuseni ei jõua KUNAGI (keegi pole 15p jooksul ühtki otsust teinud) → vaikne kvaliteedi-lagunemine. **Käsitsi-ämber on juba tõestatult vale lahendus** — ta ei skaleeru. **Lahendus:** kaks LLM-kohtunikku otsustavad **täisautomaatselt**, loovad vajadusel ka uued L3-d **automaatselt läbi väravate**, ja ebakindel jääk **ei lähe inimese järjekorda** vaid saab **ohutu vaikimisi** kohtlemise.

**Säilivad invariandid (jõustatud, mitte proosa):**
- **PROPOSE→AUTO-CREATE läbi väravate:** kohtunik paigutab olemas-L3-desse JA — kui sobivat pole — uue L3 loomine on **automaatne**, aga AINULT kui kõik väravad (DUP · lock-harness · INV · merge-judge) läbivad. Väravad asendavad inimese-kinnituse. Mitte "kohtunik loob suvalise L3" — "kohtunik loob L3 ainult kui andme-väravad tõestavad, et see on turvaline".
- **Tagasipööratavus:** iga automaatne tegevus (assign, L3-loomine, sünonüüm) logitakse `review_decision_log`-i + **undo** + Telegram-teade. Nähtavus + undo asendavad eel-kinnituse.
- **Ohutu vaikimisi:** kui ka tugevaim mudel (Opus) jääb ebakindlaks → **mitte-tegevus on ohutu** (sünonüüm EI lähe otsingusse; toode jääb draft'i, mitte vale koju). Ebakindlus ei jõua kunagi inimese rutiinsesse järjekorda.

---

## 1. Arhitektuuri ülevaade — kaks kohtunikku + eskalatsioon

```
                   GENERAATOR (olemas)            KOHTUNIK (Sonnet/Opus)        EBAKINDEL → ESKALATSIOON
  sünonüümid  Haiku → conf≥0.85 → synonym          Sonnet üle KOGU pending:       Opus (tugevaim) →
  [6.6]              conf<0.85 → synonym_review ──→  OK→synonym / VALE→rejected ──→  endiselt ebakindel?
                                                     ebakindel ─────────────────→   → OHUTU VAIKIMISI
                                                                                     (rejected_safe, EI otsingusse)
  klassifikaator Opus → auto≥0.85 → assign          Opus üle ämbri:                Opus-eskalatsioon (teine
  [4]                 muu → classification_review ─→  assign / grupeeri / AUTO-new_l3  prompt, täispuu) → ebakindel?
                                                     ebakindel ─────────────────→   → jääb draft (EI vale koju)
```

- **Kolm kihti, iga ebakindlus eskaleerub, mitte ei peatu inimese ees:** (1) odav generaator teeb massi → (2) kohtunik adjudikeerib → (3) **ebakindel eskaleerub tugevaimale mudelile (Opus)**; mis sealtki jääb → **ohutu vaikimisi**, MITTE inimese järjekord.
- **Sünonüümi-kohtunik katab KOGU synonym_review pending** (ka 1344 kirjet `≥0.85+review:true`), mitte ainult sub-0.85 jääki.
- **Kaks kutsujat, sama kood (HARD RULE #5):** backfill-runner (kogu backlog, ühekordne, Batch API) + öine pipeline-hook (ainult delta, sync). Sama transform mõlemale.
- **Kohtunik-mudel ≠ generaator:** generaator Haiku → kohtunik **Sonnet** (sõltumatu teine arvamus). Klassifikaatori-kohtunik **Opus** (sama mudel, teine ülesanne: näeb kogu ämbrit + kandidaat-L3-de kirjeldusi → grupeerib cross-klastri dupe + rakendab eksklusiivsus-/dup-väravaid).

---

## 2. SÜNONÜÜMI-KOHTUNIK

**Ulatus:** KOGU synonym_review pending = 3854 kirjet (sh 1344 "≥0.85+review:true"). Generaatori kindlus = sisend-signaal, ei vabasta kohtunikust.

**Sisend (per termin):** `word` + toote EN + ET pealkiri + L3 nimi/path + lühikirjeldus + generaatori `confidence` + `reason`.

**Kriteerium (prompt-süda):** *"Kas klient, kes otsingusse kirjutab selle sõna, ootaks NÄHA seda toodet?"* → `OK` / `VALE` / `EBAKINDEL` + lühi-põhjus eesti keeles.

**Väljund → tegevus (täisautomaatne):**
| Verdikt | Tegevus |
|---|---|
| OK | → `product_synonym` (sama, mida auto≥0.85 kirjutaks); status='resolved' |
| VALE | → status='rejected' + põhjus (ei kirjutata synonym'i) |
| EBAKINDEL | → **eskaleeru Opus-ile** (§2.1). **EI jää inimese järjekorda.** |

### 2.1 EBAKINDEL → automaatne eskalatsioon → ohutu vaikimisi
- Sonnet "EBAKINDEL" → **sama termin Opus-ile** (tugevam mudel, sama kriteerium).
- Opus OK → synonym kirjutatakse. Opus VALE → rejected.
- **Opus endiselt EBAKINDEL → OHUTU VAIKIMISI:** `status='rejected_safe'` — **sünonüüm EI lähe otsingusse** (konservatiivne: parem puuduv sünonüüm kui vale otsingutulemus). **Mitte** pending, **mitte** inimese järjekord. Digestis ainult trendina ("N rejected_safe — kohtunik+Opus ei suutnud kinnitada").

**Mudel:** `claude-sonnet-5` (→ eskalatsioon `claude-opus-4-8`). Grupeeri ~10 terminit/päring (prompt-cache). **Fail-loud:** batch kukub → termin jääb **pending** (API-viga ≠ ebakindlus — eristus oluline), Telegram raporteerib skip-arvu.

---

## 3. KLASSIFIKAATORI-KOHTUNIK

**Sisend:** toote andmed (title_en/title_et/kirjeldus/spets/pilt-URL/bucket + classifier `proposed_l3`/`suggest_name`/`suggest_l2`/`confidence`) + **KOGU v4-taksonoomia** (L3-handle+nimi+kirjeldus-profiil, cache'itud).

**Otsustusloogika (9-punkti sisu-reegel + reegli-pingerida CLAUDE.md-st):**
1. **assign_existing** — sobib OLEMAS-L3-sse (kohtunik kinnitab kogu-puu-vaatega). *Kiirvõit: 19 "review" + osa quarantine.*
2. **Grupeeri ise** — sama kontsept mitmes klastris → üks otsus (DUP-värav ENNE loomist).
3. **AUTO-new_l3** — sobivat tüüpi pole → **loo automaatselt läbi väravate (§4)**. Mitte inimese-kinnitus.
4. **EBAKINDEL → eskaleeru Opus-teisele-promptile** (täispuu, karmim kriteerium) → endiselt ebakindel → **jääb draft** (toode EI lähe vale koju; ohutu vaikimisi) + digest-trend.

**⚠️ QUARANTINE-REEGEL:** kohtunik vaatab quarantine-kirje üle **AINULT kui põhjus = klassifitseerimise ebakindlus**. **Kui põhjus = FEEDI ANDMEKVALITEET** (puudu/katki title, tühi kirjeldus) → **jääb välja** + digest-trend ("⚠️ N quarantine = andmekvaliteet, vajab andme-parandust"). Kohtunik klassifitseerib quarantine puhul ESMALT põhjuse.

**Mudel:** `claude-opus-4-8`.

**🔑 KLASTRI-TASANDI OTSUS (Tarmo 2026-10-06, point 3):** kohtunik otsustab **KLASTRI tasandil** — üks otsus kogu klastri kohta (`clusterKeyOf`: vevor_spu → vevor_product_type → normaliseeritud title), mis laotatakse KÕIGILE klastri liikmetele (`fanoutClusterDecisions`). Nii on klastri-sisene vastuolu **EHITUSLIKULT võimatu** (pole enam N per-toode otsust, mis lahkneksid). Kooskõlavärav (`enforceClassifyConsistency`) jääb **TURVAVÕRGUKS** — pärast klastri-fan-out'i ei saa ta enam vallanduda, aga kaitseb juhuks, kui mõni tee hoolimata per-toode otsuseid ehitaks. Klaster, millele kohtunik otsust ei anna → ohutu vaikimisi `keep`. *See on EELTINGIMUS klassifikaatori-kalibreerimisele (§5) — klastri-tasand enne, siis kalibreeri.*

---

## 4. UUE L3 LOOMINE — TÄISAUTOMAATNE läbi väravate (ei Tarmo-kinnitust)

> **Muudatus 2026-10-06 (HARD RULE #6):** varasem "UI üks-nupp, Tarmo kinnitab" on EEMALDATUD. Käsitsi-kinnitus iga uue L3 kohta EI skaleeru feed-kasvul (Powermat/BlackTools/KraftDele toovad uusi tüüpe pidevalt). **Uus L3 luuakse automaatselt — väravad asendavad inimese-kinnituse, undo + Telegram asendavad eel-ülevaate.**

**Kohtunik koostab L3-ettepaneku-paketi** (nimi õige eesti nimega sünnihetkel — NIME-REEGEL; vanem-L2; tooted; põhjendus; DUP-tõend; merge/split-signaal). Pakett läheb **otse build-bridge'i**, mitte inimese ette.

### 🌉 BUILD-BRIDGE — iganädalane täisautomaatne struktuuri-build

**Cron (nt pühapäeva öö) — samm-sammult:**
1. **Loe kohtuniku L3-ettepanekud** — `review_decision_log action='create_l3' status='proposed'`, mida pole veel ehitatud (meta.built != true). *(Kohtunik kirjutab need ise — inimese-klõpsu ei oodata.)*
2. **genyM** — lisa uued L3-d SSoT-i (`taxonomy-*.yaml`); auto-värskendab dumbid DB-st (stale-dump gotcha lahendatud).
3. **🔒 VÄRAVAD (KÕIK peavad läbima, muidu peatu):**
   - **DUP-värav** — semantiline "kas siht juba olemas mujal?" (kohtuniku tõend + cross-main re-skänn).
   - `lock-harness.mjs pre` (kaart+backup+baseline-inv).
   - DB-migratsioon (transaktsioon, ON_ERROR_STOP).
   - `inv-taxonomy.mjs` (0 FAIL — SEG/DUP/STRUCT/NAME/WIDTH/ORPHAN/COMPLETE).
   - `merge-judge.mjs` uute L3 kõrval-L2-l (üle-fragmenteerimise kontroll).
   - `lock-harness.mjs post` (distinct säilinud, mpath terve, struktuur, Meili värske).
4. **Määra klastri tooted** uude L3-sse (ettepaneku `affected` → product_category_product).
5. **4-sammu deploy:** DB-migratsioon ✓ + Meili reindeks + `git push origin taxonomy-v4` + Coolify redeploy (nav rebuild).
6. **Telegram tulemus + undo-link:** "✅ Build: 2 uut L3, 14 toodet, nav uuendatud · undo: [link]" VÕI "🔴 Build PEATUS väraval INV-SEG-01 — midagi ei deploy'tud, [link]".

**🔒 KÕIK-VÕI-MITTE-MIDAGI:** iga värav FAIL → **peatu KOHE, ära deploy'i poolikult**, Telegram-alert. Pooleldi-build (DB õige, nav vana) KEELATUD. Sama 4-sammu-distsipliin mis käsitsi-lukkudel, aga automatiseeritud + väravatega.

**Miks partii (nädalas), mitte kohe-igaüks:** SSoT-regen + redeploy kallis (build-time bundle) → üks nädalane partii = üks deploy kõigile uutele L3-dele, deterministlik.

**Inimene siin AINULT siis kui:** värav blokeerib KORDUVALT sama ettepaneku (nt merge-judge kõrge + INV konflikt, mida masin ei lahenda) → Telegram tõstab ERANDINA esile. See = äärmuslik erand, mitte töövoog.

---

## 5. KALIBREERIMINE — TÄISAUTOMAATNE Opus-REFERENTSIGA (inimene EI hinda)

> **Muudatus 2026-10-06 (HARD RULE #6, Tarmo otsus):** kalibreerimine tehakse **AUTOMAATSELT**, mitte Tarmo käsitsi. Varasem "Tarmo hindab pimesi 140 kirjet" oli korduv/pudelikaela-inimtöö → VALE lahendus (HARD RULE #6). Inimese asemel hindab **sõltumatu Opus-REFERENTS**. Inimene kaasatakse AINULT kui lävend ületatud (= äärmuslik erand).

### 5.1 Ühekordne kalibreerimine (Opus-referents — MASIN, mitte inimene)
1. **Dry-run valim:** kohtunik `--dry` juhuvalimil — **100 sünonüümi** (kogu pending seast, seed=xlm) + **40 klassifikaatorit** (klastri-tasandil, §3). Väljund salvestatud (`calib-<kind>.json`), **EI kirjuta kohtuniku-otsust DB-sse**.
2. **🤖 Opus-REFERENTS hindab SAMA valimi SÕLTUMATULT ja PIMESI** (`scripts/calibration-reference.mjs`) — ei näe Sonneti/kohtuniku vastuseid. Sama kriteerium:
   - sünonüüm: *"Kas klient, kes kirjutab selle sõna otsingusse, ootaks näha seda toodet?"* (→ OK/VALE/EBAKINDEL, mudel Opus — sõltumatu Sonnetist).
   - klassifikaator: *"Kas see toode kuulub sellesse kategooriasse?"* (→ assign_existing/new_l3/keep, pime: ei näe kohtuniku target_handle't ega klassifikaatori ettepanekut).
   - Hinnangud → `calibration_rating` **actor='opus-reference'** → korratav/auditeeritav (UNIQUE kind,seed,item,actor → eksisteerib inimese ratingute kõrval, kui neid oleks).
3. **Automaatne võrdlustabel:** kohtunik vs referents, kaks veamäära:
   - **VALE-OK/VALE-assign määr** (kohtunik OK/assign, referents mitte) — **KRIITILINE** (kirjutaks vigase live'i).
   - **Kokkulangevus** (agreed) — üldine kooskõla.
4. **Lävendid (Tarmo kinnitatud):** sünonüüm **VALE-OK ≤5%** · klassifikaator **VALE-assign ≤2,5%** (≤1/40). Üle läve → prompt paraneb, valim korratakse (ikka dry).
5. **🛡 KUS MUDELID EI NÕUSTU → OHUTU VAIKIMISI, MITTE inimene:** lahkuminek (kohtunik ≠ referents) → **ohutu vaikimisi** (sünonüüm EI lähe otsingusse; toode JÄÄB OOTELE). Lahkuminek ei jõua inimese järjekorda — see on masina konservatiivne vaikekäitumine.
6. **See on ÜKSKORDNE.** Lävend läbitud → automaatrežiim käivitub. Inimene EI hinda rutiinselt.

### 5.2 Triivikontroll — TÄISAUTOMAATNE (kord kuus, mudel auditeerib, mitte inimene)
- Cron võtab **juhuvalimi 30 live-otsust** eelmisest kuust.
- **Opus-referents (sama kui §5.1 audiitor)** hindab need samade kriteeriumitega — **inimest EI kaasata**.
- Audiitori-lahkuminek kohtunikust > lävi → **automaatrežiim peatub + Telegram-hoiatus** ("🔴 triiv: VALE-OK 8% > 5%, auto-režiim pausil, vaata [link]"). Alla läve → vaikne roheline (digest-trend).
- **Inimene kaasatakse AINULT kui triiv ületab läve** (= äärmuslik erand). Normaaljuhul kuine kontroll on nähtamatu masina-taustatöö.

**NB:** mudeli-kulu EI ole piirav (§7) — **korrektsus on**. Kalibreerimine (Opus-referents) + triivikontroll = mõlemad automaatsed; inimene ainult lävendi-ületuse erandis.

---

## 6. HARD RULE #5 — backfill + hook + multi-feed

**Üks transform, kaks kutsujat:**
1. **BACKFILL (ühekordne):** 3854 sünonüümi + 40 klassifikaatorit, Batch API (−50%). Runner `auto-judge-run.mjs --all --batch`.
2. **ÖINE HOOK (delta):**
   - Sünonüüm: peale `[6.6]` → AINULT öö sub-0.85 terminid (+ eskalatsioon), MITTE 3854.
   - Klassifikaator: peale `[4]` → AINULT öö review/new_l3/quarantine (`/tmp/classify-skus.txt` delta).
   - **Sync** (mitte batch) — pipeline assign'ib + reindekseerib samas jooksus; delta väike.
3. **MULTI-FEED (bränd-agnostiline):** kohtunik otsustab **sisust**, mitte tootja-nimest → loomu poolest bränd-immuunne. Title-strip (`deriveBrandSlug` SSoT) juba [3.5]-s ENNE classify. **Kohtunikus EI tohi olla VEVOR-hardcode't.**
4. **FAIL-LOUD:** üksik kirje kukub → skip+jätka; kogu-partii → exit≠0 → Telegram. Krediit-degrade: kohtunik skip, laoseis+reindeks JÄTKUB.

---

## 7. KULUHINNANG

> Hinnad per 1M (2026-10): Sonnet 5 $3/$15 · Opus 4.8 $5/$25. Batch −50%.

| Töö | Maht | Mudel | Hinnang |
|---|---|---|---|
| Sünonüümi backfill | 3854 (+eskalatsioon ~10%) | Sonnet+Opus Batch | **~€4–6** |
| Klassifikaatori backfill | 40 (~18 klastrit) | Opus Batch | **~€0.5–1** |
| **BACKFILL kokku** | | | **< €7** |
| Öine hook sünonüümid | ~30–80/öö | Sonnet sync | ~€0.08/öö |
| Öine hook klassifikaator | ~18–40/öö | Opus sync | ~€0.10–0.20/öö |
| Kuine triivi-audit | 30 kirjet | audiitor-mudel | ~€0.10/kuu |
| **JOOKSEV kokku** | | | **~€6–10/kuu** |

**Järeldus:** kulu tühine (backfill <€7, jooksev <€10/kuu). Eskalatsioon Opus-ile lisab marginaalselt. **Pudelikael = kalibreerimise-korrektsus, mitte raha.**

---

## 8. DIGEST — ainult trend (mitte "ootab otsust")

> **Muudatus 2026-10-06:** digest EI näita enam "ootab Tarmo kinnitust" (pole enam inimese-kinnitust). Digest näitab **trendi** — kas masin töötab tervelt.

```
🤖 AUTO-JUDGE 2026-XX-XX
   🔤 sünonüümid: OK 72 · VALE 11 · eskaleeritud→OK 4 · rejected_safe 2
   🏷 klassifikaator: assign 14 · grupeeritud 3 · auto-L3 2 (ehitatud ✓) · jäi-draft 1
   🌉 build-bridge: 2 uut L3, 14 toodet, nav ✓ · undo: [link]
   📊 triiv (viim. kuu-audit): VALE-OK 3% 🟢
```

- **🔴 AINULT kui:** jääk/rejected_safe KASVAB (triiv/uus tüüpide laine) VÕI kohtunik ebaõnnestub (API/krediit) VÕI build-bridge värav blokeeris VÕI kuine triiv > lävi.
- Roheline = masin töötab, auto-L3-d ehitatud, triiv all läve.
- **Deep-link UI-sse ainult ERANDI korral** (blokeeritud build / triiv-alarm) — mitte rutiinse kinnituse jaoks.

---

## 9. REVIEW-UI = AINULT HÄIREOLUKORRA TURVAVÕRK

> **Muudatus 2026-10-06 (HARD RULE #6, punkt 4):** review-UI (`/xl-admin/review-bucket`, categorization-queue) EI ole enam rutiinne töövoog. See on **turvavõrk äärmuslikuks juhuks**:
- Masin blokeeritud (build-bridge värav korduvalt FAIL, mida masin ei lahenda).
- Triivi-alarm (kuine audit > lävi) → auto-režiim pausil, inimene uurib + taaskäivitab.
- Andmekvaliteedi-quarantine (feed katki) → inimene parandab andmed, mitte paigutuse.

**Normaaljuhul UI-sse ei logita keegi.** Kui UI täitub rutiinselt otsustega, on disain katki (HARD RULE #6) — siis projekteeri kohtunik/eskalatsioon ümber, mitte ära lisa inimtööd.

---

## 10. OTSUSTATUD (Tarmo 2026-10-06) + ETAPIVIISILINE TEOSTUS

**Kinnitatud (HARD RULE #6 kooskõlas):**
- ☑ **Kalibreerimine TÄISAUTOMAATNE** (Opus-REFERENTS hindab pimesi, mitte inimene); kuine triivikontroll **AUTOMAATNE** (audiitor-mudel, häire ainult üle läve). Lahkuminek → ohutu vaikimisi, mitte inimese järjekord.
- ☑ **Klassifikaatori-kohtunik KLASTRI tasandil** (üks otsus/klaster, vastuolu ehituslikult võimatu) — eeltingimus kalibreerimisele.
- ☑ **Uued L3-d AUTOMAATSELT** väravatega (DUP · lock-harness · INV · merge-judge) + Telegram + undo. **Tarmo kinnitust EI nõuta.**
- ☑ **EBAKINDEL → eskaleeru Opus-ile** → endiselt ebakindel → **ohutu vaikimisi** (sünonüüm ei lähe otsingusse; toode jääb draft). **Mitte inimese järjekord.**
- ☑ **Review-UI = ainult häireolukorra turvavõrk.** Digest näitab ainult trendi.
- ☑ Lävendid: sünonüüm VALE-OK ≤5%, klassifikaator VALE-assign ≤2,5%. Kuine triivivalim 30.
- ☑ Sünonüümi-kohtunik katab KOGU pending. Kalibreerimine PIMESI, 100+40.

**Teostus-etapid:**
1. `lib/judge.mjs` — transform-funktsioonid (sünonüüm + klassifikaator + **eskalatsiooni-loogika**), bränd-agnostilised, sama kood backfill+hook.
2. Dry-run runner + **ühekordne kalibreerimis-valim** (§5.1) → **Opus-referents hindab pimesi** (`calibration-reference.mjs`) → lävend. *(Kalibreerimisleht + DB-püsivus `calibration_rating` juba ehitatud; referents-hindaja ehitatud 2026-10-06.)*
3. Lävend OK → backfill (Batch) → audit review_decision_log'ist.
4. Öine hook ([4] ja [6.6] järele) + **eskalatsioon** + digest-trend.
5. **Build-bridge cron** (§4) — automaatne L3-loomine väravatega + Telegram + undo. (Olemas `create_l3` ettepaneku-logi → laienda proposed→build.)
6. **Kuine triivi-audit cron** (§5.2) — audiitor-mudel, auto-paus + alarm.

**Riskid + leevendus:**
- Kohtunik-generaator sama-viga (sünonüüm) → eri mudel (Sonnet vs Haiku) + Opus-eskalatsioon.
- Auto-L3 plahvatus → **väravad** (DUP + INV-STRUCT-01 + merge-judge) peatavad; KÕIK-VÕI-MITTE-MIDAGI build.
- Ebakindel vale-positiiv → **ohutu vaikimisi** (konservatiivne: pigem puuduv sünonüüm / draft kui vale live).
- Triiv aja jooksul → kuine automaat-audit + auto-paus.
