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
| Classifier auto-create | ⏸ SHADOW (ei lülitunud) | 3 code_bug (14.10 Fable limit) lukustab üleminekut — EI ole cutover-blokeerija |
| Backup | ✅ päevane, 0 errors (07.11) | restore-test PUUDUB · restic retention-lukk Access Denied |

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
| 2 | **Prod SMTP-mandaat VALE (553)** — kinnituskiri EI lähe, prodis puudub EMAIL_DISABLED kill-switch | mõõdetud 17.10 vale; mailcow MX liigutatud 17.10 | SMTP parandus (mail.xlrent.eu) + prod e-posti test |
| 3 | **Täis tellimusvoog testimata** (cart→makse→webhook→order→email) | subscriber aktiivne, voog testimata | brauseri-test prodis pärast E2 |
| 4 | **Õiguslikud lehed puudu** (tingimused/privaatsus/tagastus/tarne) | CMS tühjad | seadusnõue — Tarmo tekst, Claude sisestab |

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
| 12 | **Backup restore-test** | backup töötab, taaste MITTE KUNAGI testitud |
| 13 | restic retention-lukk Access Denied | snapshot salvestub, prune ei puhasta lukku |
| 14 | Classifier auto-create shadow→live | 3 code_bug (14.10 Fable limit) lukustab; EI blokeeri cutoverit, aga uued tüübid jäävad shadow'sse |

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

**JÄRELDUS:** infra + andmed + deploy on tehniliselt valmis (strateegia A). **4 CRITICAL blokeerijat** (Montonio live, prod SMTP, täis-voog test, õiguslikud lehed) peavad ENNE live'i lahenema. Seisak ~15–20 min + DNS TTL. Rollback = DNS tagasi uo28-le (vana prod 30p puutumata).
