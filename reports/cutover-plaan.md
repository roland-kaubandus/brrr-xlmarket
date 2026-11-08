# XL CUTOVER-PLAAN — xlmarket.ee PROD live

> Koostatud: 2026-11-07 · Strateegia **A** (KINNITATUD: k33g domeeni-swap samal boxil + .eu→.ee 301).
> **Koodita dokument** — sammud, järjekord, vastutajad. Tehniline teostus: `/opt/eumotors-tasks/CUTOVER-RUNBOOK.md`.
> Severity (HARD RULE #2): **CRITICAL / BLOCKER** või **VAJA ÄRA TEHA**. Muud taset ei ole.

---

## 0. LÄHTESEIS (2026-11-07)

| Komponent | Seis | Märkus |
|---|---|---|
| Staging (k33g, 65.21.126.235) | ✅ töös, kõik 7 konteinerit healthy (2 näd) | kogu töö siin |
| PROD (uo28, xlmarket.ee) | ⚠️ coming-soon, KÜLMUTATUD | ~3 kuud stale → cutover peab üle kandma kogu staging'u |
| Öine pipeline | ✅ LIVE, rc=0 kõik ööd | 24–31.10 krediit-degrade (taastus 01.11) |
| Glossary-hook | ✅ auto-live (07.11 02:47) | HARD RULE #6 auto-üleminek töötas |
| Classifier auto-create | ⏸ SHADOW (ei lülitunud) | **Task 1 (07.11):** 14.10 infravead reklassitud `infra_transient` (ei blokeeri). Nüüd KVALIFITSEERUB (12 puhast klastrit, 0 koodiviga) AGA hoiab `neighbor_realhandle_verified=false` (ohutus-värav) — EI sunnitud |
| Backup | ✅ päevane, 0 errors (07.11) | **Task 2b (07.11): taaste-test LÄBIS mõlemal** — Scaleway restic 13/0 ~4min · Storage Box staging 19780 toodet/19 tellimust ~16s · ⚠️ restic retention-lukk Access Denied (vt #13) |

---

## 1. CUTOVER-SAMMUD JÄRJEKORRAS

| # | Samm | Millal | Kes | Seisak? |
|---|---|---|---|---|
| **A. HARUDE ETTEVALMISTUS** |||||
| A1 | Umami (analytics) v4-harusse | ENNE | Claude | ei |
| A2 | Kõik tööriistad (genyM, inv, lock-harness, judge'id) v4-s git-is | ENNE | Claude | ei |
| A3 | main ↔ taxonomy-v4 sünk (HARD RULE #4, mõlema SHA võrdne/teadlik) | ENNE | Claude | ei |
| A4 | Õiguslikud lehed CMS-i (tingimused/privaatsus/tagastus/tarne) | ENNE | Claude + **Tarmo** (tekst) | ei |
| **B. PROD INFRA** |||||
| B1 | Coolify prod-projekt k33g-stacki pealt (sama 5+2 konteinerit) | ENNE | **Tarmo** (Coolify) | ei |
| B2 | Wildcard DNS `*.xlmarket.ee → 65.21.126.235` + Let's Encrypt cert | ENNE | **Tarmo** (DNS) | ei |
| B3 | Env-muutujad prodi: DATABASE_URL, Meili, Redis, CORS = .ee domeenid | ENNE | Claude + Tarmo | ei |
| **C. ANDMED** |||||
| C1 | Värske pg dump + Meili dump staging'ust prodi (DB + 18k toodet + tõlked) | CUTOVER-PÄEV | Claude | **JAH** (külmuta kirjutamised) |
| C2 | Meili reindeks prodis (`index-meilisearch.mjs`) | CUTOVER-PÄEV | Claude | osa seisakust |
| **D. E-POST (CRITICAL — vt §4)** |||||
| D1 | Prod SMTP-mandaat parandada (mailcow mail.xlrent.eu) + mõõta (mitte 553) | ENNE | Claude + Tarmo | ei |
| D2 | Prod env: EMAIL_DISABLED kill-switch olemas + allowlist eemaldada live'iks | CUTOVER-PÄEV | Claude | ei |
| D3 | Prod e-posti test (päris tellimus → kinnitus + arve saabub) | CUTOVER-PÄEV | Claude + **Tarmo** | ei |
| **E. MAKSE (CRITICAL — vt §4)** |||||
| E1 | Montonio PÄRIS (live) võtmed Vaultwardenist prodi | CUTOVER-PÄEV | **Tarmo** (võtmed) | ei |
| E2 | Montonio live checkout end-to-end (päris 1€ makse → webhook → order → capture) | CUTOVER-PÄEV | Claude + **Tarmo** | ei |
| **F. DNS CUTOVER** |||||
| F1 | `xlmarket.ee` A-kirje → 65.21.126.235 (prod storefront) | CUTOVER-PÄEV | **Tarmo** (DNS) | **JAH** (TTL-aken) |
| F2 | `xlmarket.eu` → 301 redirect `xlmarket.ee`-le (kõik URL-id) | CUTOVER-PÄEV | Claude + Tarmo | ei |
| **G. DEPLOY + KONTROLL** |||||
| G1 | Coolify prod storefront redeploy (v4 SHA) | CUTOVER-PÄEV | Claude | osa seisakust |
| G2 | Suitsutestid: avaleht, kategooria, toode, otsing, kassa, hinnad €, pildid | CUTOVER-PÄEV | Claude | ei |
| G3 | invariandid (`inv-taxonomy.mjs`) + Meili doc-count vs elus-tooted | CUTOVER-PÄEV | Claude | ei |
| G4 | Monitooring/uptime väline alert .ee peale | CUTOVER-PÄEV | Claude | ei |

---

## 2. ENNE vs CUTOVER-PÄEV

| ENNE cutover-päeva (riskivaba, taustal) | CUTOVER-PÄEVAL (seisaku-aken) |
|---|---|
| A1–A4 harud + õiguslikud lehed | C1 DB+Meili dump→restore prodi |
| B1–B3 prod infra + DNS wildcard + cert + env | C2 Meili reindeks |
| D1 SMTP parandus + mõõtmine | D2–D3 e-posti live + test |
| **Kogu testimine staging'us valmis** | E1–E2 Montonio live võtmed + makse-test |
|  | F1–F2 DNS swap + .eu→.ee 301 |
|  | G1–G4 redeploy + kontrollid + monitooring |

---

## 3. HINNANGULINE SEISAK

| Faas | Aeg | Selgitus |
|---|---|---|
| DB kirjutamiste külmutus (C1 algus) | — | stack-lukk (HARD RULE #9) |
| pg dump + restore (C1) | ~5–10 min | 18k toodet + tõlked |
| Meili reindeks (C2) | ~3–5 min | ~18k dokumenti |
| Redeploy + suitsutest (G1–G2) | ~5 min | Coolify recreate async |
| **Storefront kogu-seisak** | **~15–20 min** | DNS TTL-aken lisandub (sõltub Tarmo TTL-ist) |
| **Soovitus** | madala liiklusega aken (öö/varahommik), TTL alanda 300s-ni päev ENNE |

---

## 4. LAHTISED LAUNCH-BLOKEERIJAD (ankrust — KÕIK)

### CRITICAL / BLOCKER

| # | Blokeerija | Seis | Vaja |
|---|---|---|---|
| 1 | **Montonio PÄRIS võtmed + live checkout e2e testimata** | test-võtmed olemas, live puudub | **Tarmo** live-võtmed + 1€ päris-makse test |
| 2 | **Prod SMTP-mandaat VALE (553)** — kinnituskiri EI lähe, prodis puudub EMAIL_DISABLED kill-switch | **553 päritolu kinnitatud (07.11):** mõõdetud 17.10 `testi-saatmine.sh` testiga, vana `server@xlrent.eu` mandaat (14-märg parool) → asendatakse cutover'il D1. Runbooki E2 lisatud GATE: testkiri ENNE poe avamist | SMTP parandus (mail.xlrent.eu) + prod e-posti test (runbook E2 värav) |
| 3 | ~~**Täis tellimusvoog testimata**~~ (cart→makse→webhook→order→email) | ✅ **LAHENDATUD 08.11 (D-test):** täis tellimusvoog tõestatud **eraisik (#30) + ettevõte (#31)** — kõik 3 kirja (kinnitus + arve + admin) kohal mõlemal. Parandatud 2 bugi (BUG #1 bcc-drop ettevõtte-arvel, BUG #2 kirjade kaskaad ühes try/catch-is) → iseseisvad kirjad (iga kiri eraldi try/catch, fail-loud Telegram + tellimuse-nr) deploy'tud k33g. Ettevõtte-arve + BCC-raamatupidaja-koopia toimib | ✅ staging done; prodis E2 lõpp-suitsutest (kinnitus ENNE poe avamist) |
| 4 | **Õiguslikud lehed** (tingimused/privaatsus/küpsised/tagastus/tarne) | **Task 3 (07.11): staging VALMIS** — 10/10 lehte HTTP 200 + päris-sisu renderdub (staging.xlmarket.ee, et+en). DB cms_page 10 juriidilist rida sisuga. Prod uo28 = coming-soon (EI OLE neid) → **C1 täis-DB dump kannab üle, eraldi sünki pole vaja** | ✅ staging done; prodi jõuab cutover C1-ga |

### VAJA ÄRA TEHA

| # | Punkt | Märkus |
|---|---|---|
| 5 | order-shipped.ts tarne-teavitus test | D-test koos D1/D2 arve-tööga (faas 1 edasi lükatud) |
| 6 | D3 arve-seeria live | vajab raamatupidaja kinnitust + `INVOICE_SERIES_ENABLED=true` |
| 7 | Monitooring/uptime väline alert | Coolify sentinel + väline |
| 8 | Analytics/Pixel (PostHog) kontroll | setup olemas, kontrolli |
| 9 | Mobiilivaade test | brauseris |
| 10 | Admin basic-auth (xl-admin) | — |
| 11 | osta.ee XML + Facebook Commerce | kui vaja |
| 12 | ~~Backup restore-test~~ | ✅ **LAHENDATUD 07.11 (Task 2b):** mõlemad varukoopiad taastatud eraldi/throwaway'sse — Scaleway restic 13 korras/0 prob (~4min, sha256 5/5, 6/6 dumpi), Storage Box staging-dump→throwaway postgres (169 tabelit/19780 toodet/19 tellimust/19718 title_et, ~16s). Taaste TÕESTATUD |
| 13 | **restic retention-lukk Access Denied** | **Diagnoos (07.11):** append-only server-võtmel POLE DeleteObject (O-23, teadlik ransomware-kaitse) → restic ei saa oma lukke eemaldada → "Access Denied" (snapshot salvestub ikka, exit 0, mittefataalne). **Fix = Scaleway IAM: lisa `s3:DeleteObject` AINULT `locks/*` prefiksile** (andmed/snapshot'id jäävad muutumatuks) → restic haldab lukke ise iga jooks. **Tarmo tegevus** (Scaleway konsool; admin-võtit serveris pole/ei tohi olla). Retention (forget/prune) ise = kvartaalne admin-võti off-server, mitte katki |
| 14 | Classifier auto-create shadow→live | **Task 1 (07.11):** 14.10 infravead (Fable usage-limit 400) ei ole koodiviga → `infra_transient` kategooria lisatud, ei blokeeri. Nüüd KVALIFITSEERUB (12 puhast klastrit ≥3, 0 koodiviga), AGA hoiab `neighbor_realhandle_verified=false` (eraldi ohutus-värav) → auto-create jääb VÄLJAS, EI sunnitud. Uued tüübid jäävad shadow'sse kuni naabrite-tee testitud |

---

## 5. TAGASIPÖÖRAMISE PLAAN (rollback)

| Stsenaarium | Tegevus | Aeg |
|---|---|---|
| Storefront katki pärast redeploy | Coolify → eelmine deploy (one-click rollback) | ~2 min |
| DB restore vigane | vana prod-DB puutumata (uus = eraldi restore) → pööra DNS tagasi uo28-le | ~TTL |
| DNS swap vale | A-kirje tagasi uo28 IP → coming-soon naaseb | ~TTL-aken |
| Montonio live katki | lülita makse-meetod admin'is välja → tellimusi ei teki, sait töötab | kohene |
| E-post katki | `EMAIL_DISABLED=true` prod env (kill-switch) → sait töötab, kirju ei lähe | ~1 redeploy |
| **Üldreegel** | vana PROD (uo28) jääb **30 päeva backupiks** — DNS tagasi = kohene taaste |

---

## 6. MIS VAJAB TARMOT

| Vastutus | Samm |
|---|---|
| **Coolify** | prod-projekt (B1), redeploy'de kinnitus |
| **DNS (Cloudflare)** | wildcard `*.xlmarket.ee` (B2), A-swap (F1), .eu→.ee (F2), TTL alandus |
| **Montonio** | live-võtmed Vaultwardenist (E1), päris-makse test (E2) |
| **Raamatupidaja** | arve-seeria D3 kinnitus (VAJA ÄRA TEHA, mitte blokeerija) |
| **Õiguslik tekst** | tingimused/privaatsus/tagastus/tarne sisu (A4, blokeerija) |
| **E-posti test** | prod kinnituskirja vastuvõtt (D3) |

---

**JÄRELDUS:** infra + andmed + deploy on tehniliselt valmis (strateegia A). **3 CRITICAL blokeerijat** (Montonio live, prod SMTP, õiguslikud lehed) peavad ENNE live'i lahenema — **täis-voog test LAHENDATUD 08.11 (D-test, eraisik + ettevõte)**. Seisak ~15–20 min + DNS TTL. Rollback = DNS tagasi uo28-le (vana prod 30p puutumata).
