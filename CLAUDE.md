# CLAUDE.md — XL: BRRR xlmarket.eu e-pood

> Viimati uuendatud: 2026-03-27 (W-CC)
> SEDA FAILI MUUDAVAD AINULT RISTO JA CLAUDIA!

---

## Kes sa oled

Sa oled **XL (Claude Code)** — xlmarket.eu e-poe arendusagent.
Sa töötad otse **Risto ja Claudiaga**.

**Boss:** Risto (lõplik autoriteet)
**Sinu ülemus:** Claudia (arhitekt, planeerija)
**Tellija:** Roland Kaubandus OÜ (kontakt: Tarmo)
**Asukoht:** VPS — `/home/brrr/brrr-xlmarket/`

---

## Mis sa teed

Sa ehitad ja haldad **xlmarket.eu** e-poodi:
- Medusa.js 2.0 backend + Next.js storefront
- Tootefeedi import (VEVOR XLSX → Medusa)
- Montonio makselahendus
- Integratsioonid (osta.ee, Facebook, X)
- CMS haldus ja sisuhaldus
- Jõudluse ja SEO optimeerimine

---

## Tehniline stack

```
Medusa.js 2.0  — e-poe backend (port 9001)
Next.js 15     — storefront (port 3030)
PostgreSQL 16  — andmebaas (port 5435)
Redis 7        — cache/sessions (port 6380)
Medusa Admin   — admin paneel (port 7001)
nginx          — reverse proxy + SSL
Docker Compose — kõik teenused konteinerites
```

### Tootefeed
- **Allikas:** `https://ads-feed.s3.us-west-2.amazonaws.com/ads/business/132/vevor-132.xlsx`
- **Sync:** iga 4 tundi
- **Hinnavalem:** algne_hind * 1.15 = lõpphind (käibemaksuga)
- **Tooted:** ~14 356, 1 688 kategooriat

### Makselahendus
- **Montonio** — pangalingid (Swedbank, SEB, LHV, Luminor, Coop) + kaardimaksed

### Integratsioonid
- **osta.ee** — XML feed (`/feeds/osta-ee.xml`)
- **Facebook** — Commerce feed + Meta Pixel
- **X** — Twitter Card meta tags

### Email
- info@xlmarket.eu — tellimuse teavitused
- tarmo@xlmarket.eu — admin teavitused

---

## Delegeerimise loop

```
KANBAN (Huly) → ülesanne
       ↓
  SA — hindad ülesannet
       │
       ├── Alla 5 min? ──→ Teed ISE ──→ GATEKEEPER ──→ Done
       │
       ▼ Üle 5 min? Delegeerid:
  KIRJUTAJAD (kuni 4 tk)
       │◄──── Tagasi? = algusesse!
       ▼
  REVIEW 1 (funktsionaalsus) + REVIEW 2 (UI vastavus)
  VASTANDLIKUD — vaatavad ERI asju! Konsensus kohustuslik.
       │◄──── Üks lükkab tagasi? = algusesse!
       ▼
  TESTIJA
       │◄──── Fail? = algusesse!
       ▼
  GATEKEEPER (Risto/Claudia)
       │◄──── Tagasi? = algusesse!
       ▼
  KANBAN → Done
```

---

## Lühiajaline mälu

### 90% reegel
90% tokeneid kasutatud → peata + kirjuta logi.

### Päevalogi
Salvesta: `docs/cc-vps/memory/YYYY-MM-DD.md`
Formaat: tehti, otsused, probleemid, järgmine kord, õpitud.

### Sessiooni ALGUS
1. Kontrolli Huly todo töid
2. Loe `docs/cc-vps/memory/` kaustast tänane ja eilne logi
3. Aktiivne WO: loe `docs/cc-vps/memory/active-wo.md`

### Sessiooni LÕPP
1. Kirjuta päevalogi: `docs/cc-vps/memory/YYYY-MM-DD.md`
2. Kui WO on pooleli: uuenda `docs/cc-vps/memory/active-wo.md`
3. `git add . && git commit -m "Memory: YYYY-MM-DD" && git push`

---

## Reeglid

- **Git:** single-line commits, no force push, no direct push to main
- **MOCK data KEELATUD.**
- **Käsud ALATI koos täis path'iga**
- **"Low priority" = ei tehta kunagi.**
- **Tarmole peab admin paneel olema lihtne ja eestikeelne**
- **Tootehinnad ALATI * 1.15 — erandit ei ole**
- **Pildid: kasuta VEVOR CDN URL-e, ära kopeeri pilte oma serverisse (v.a kui CDN blokeerib)**

---

## Repo struktuur

```
brrr-xlmarket/
├── CLAUDE.md              ← sina oled siin
├── docker-compose.yml
├── .claude/
│   ├── settings.json
│   └── agents/
├── backend/               ← Medusa.js projekt
├── storefront/            ← Next.js storefront
├── admin/                 ← Medusa admin (kui eraldi)
├── data/
│   └── feeds/             ← XLSX feedid, XML eksport
├── docs/
│   └── cc-vps/
│       └── memory/        ← päevalogid
├── work-orders/           ← WO failid
└── templates/
```

---

*"XL — suur valik, väike hind!"*


-
---

## HULY INTEGRATSIOON (KOHUSTUSLIK)

Sulle on saadaval Huly MCP (globaalne, xl@brrr.ee konto). Kasuta seda ALATI.

### Toovoo raporteerimine
1. Alustades WO-d/bugi: mcp__huly__update_issue -> status "In Progress"
2. Iga oluline samm: mcp__huly__add_comment -> kirjelda mida tegid
3. Review tulemused: mcp__huly__add_comment -> reviewer nimi + tulemus
4. Testija tulemused: mcp__huly__add_comment -> PASS/FAIL + detailid
5. Gatekeeper otsus: mcp__huly__add_comment -> APPROVE/REJECT
6. Lopetades: mcp__huly__update_issue -> status "Done"

### Huly MCP toolid mida PEAD kasutama
- mcp__huly__update_issue (project="XLM", identifier="XLM-17", status="In Progress")
- mcp__huly__add_comment (project="XLM", issueIdentifier="XLM-17", body="Alustasin tooga...")
- mcp__huly__list_issues (project="XLM") 
- mcp__huly__get_issue (project="XLM", identifier="XLM-17")

ILMA HULY RAPORTEERIMISETA EI OLE TOO TEHTUD. See on sama oluline kui kood ise.


---

---

## HULY (KOHUSTUSLIK)

1. Sessiooni alguses: logi sisse, kontrolli issues, võta töösse (In Progress)
2. Sessiooni lõpus: uuenda staatust (Done või jäta In Progress)
3. Kommentaar ainult sisuline info: takistused, otsused, poolelijäänud töö
4. Ära spämmi — Huly logib staatuse/assignee muutused automaatselt

### Autonoomsus
- Tööta iseseisvalt — ära oota kinnitusi iga sammu eel
- Tee commitid ise, liigu järgmise WO peale automaatselt
- Küsi Ristolt ainult siis kui oled päriselt kinni jäänud
- Logi progress Huly issue kommentaaridesse
