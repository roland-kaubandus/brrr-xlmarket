# CLAUDE.md — XL: BRRR xlmarket.eu e-pood

> Viimati uuendatud: 2026-04-09
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
MeiliSearch    — full-text search + facets (port 7700)
Medusa Admin   — admin paneel (port 7001)
nginx          — reverse proxy + SSL
Docker Compose — kõik teenused konteinerites
```

### Tootefeed
- 
- **Sync:** iga 4 tundi
- **Hinnavalem:** algne_hind * 1.15 = lõpphind (käibemaksuga)
- **Tooted:** ~16 046, 1 688 kategooriat

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

## Commands

### Storefront (Next.js)
- `npm run dev` — dev server (port 3000)
- `npm run build && npm run start` — production build (port 3030)

### Backend (Medusa)
- `npm run dev` — medusa dev server (port 9001)
- `npm run build && npm run start` — production
- `npm run seed` — seed database

### Import
- `node backend/src/scripts/import-vevor-feed.mjs --execute --update` — full VEVOR import (16K products)

### VPS Deploy
- `ssh brrr` then `cd /home/brrr/brrr-xlmarket/storefront && npm run build && sudo systemctl restart xlmarket-storefront`
- Clear stale cache: `rm -rf .next/cache/fetch-cache`

---

## Gotchas

- **Next.js fetch cache:** After updating product metadata via Medusa API, storefront serves stale data. Fix: `rm -rf storefront/.next/cache/fetch-cache && restart next-server`
- **MeiliSearch facetDistribution:** Returns ALL category_handles across products, not filtered by current domain. Must filter out L1 branch handles manually (see `lib/branches.ts`).
- **Multiple next-server processes:** After `npm run build`, old process still serves old build. Kill old PID before starting new one. Check with `ss -tlnp | grep 3030`.

---

## Key files

- `backend/src/scripts/import-vevor-feed.mjs` — VEVOR XLSX importer (`--execute --update`)
- `backend/src/scripts/category-map.json` — VEVOR L1 → Medusa category handle mapping
- `storefront/components/ProductGallery.tsx` — Image gallery with ResizeObserver thumb fitting + lightbox
- `storefront/components/CollapsibleDescription.tsx` — Rich HTML description with gradient fade + "Vaata rohkem"
- `storefront/app/[locale]/toode/[handle]/page.tsx` — Product detail page
- `storefront/app/[locale]/haru/[handle]/page.tsx` — Domain/branch category page
- `storefront/lib/branches.ts` — Branch definitions with categoryHandle

---

## VEVOR feed metadata (product.metadata)

- `selling_point_1` … `selling_point_5` — Feature bullet points (title: description format)
- `rich_description` — Full HTML with embedded images (max 15KB), collapsible on frontend
- `vevor_product_type` — L1 > L2 > L3 hierarchy string
- `gallery_images` — Additional product images beyond thumbnail
- `vevor_sku`, `vevor_model`, `item_dimensions`, `item_weight`, `upc`

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
├── backend/               ← Medusa.js projekt
├── storefront/            ← Next.js storefront
├── data/
│   └── feeds/             ← XLSX feedid, XML eksport
├── docs/
│   └── cc-vps/
│       └── memory/        ← päevalogid
├── kavandid/              ← UI mockupid (HTML)
├── nginx/                 ← reverse proxy config
├── scripts/               ← utility scripts
├── systemd/               ← service unit failid
├── work-orders/           ← WO failid
└── templates/
```

---

*"XL — suur valik, väike hind!"*

---

## HULY (KOHUSTUSLIK)

Project: **XLM** | Konto: xl@brrr.ee

1. Sessiooni algus: `list_issues` → võta töösse (`update_issue` → "In Progress")
2. Olulised sammud: `add_comment` → sisuline progress
3. Sessiooni lõpp: `update_issue` → "Done" või jäta "In Progress"
4. Ära spämmi — Huly logib staatuse muutused automaatselt

Tööta iseseisvalt, küsi ainult kui päriselt kinni.
