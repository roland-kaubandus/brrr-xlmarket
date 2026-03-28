---
name: audit-report-2026-03-28
description: Koodibaasi kvaliteediaudit + parandused
type: reference
---

# XLMARKET.EU — Kvaliteediaudit 2026-03-28

## Kokkuvõte

4-faasiline audit (AUDIT → FIX → REVIEW → GATEKEEPER) läbitud.
**13 bugi leitud ja parandatud. Gatekeeper: APPROVE.**

## FAAS 1: Audit — leitud probleemid

### Kriitilised (CRITICAL)
1. **sitemap.xml puudub** — robots.txt viitab, aga faili ei eksisteeri
2. **Hardcoded API keys** — feed skriptides oli publishable key hardcoded fallback'ina
3. **Feed skriptidest puudus region_id** — Medusa 2.0 nõuab region_id hinna arvutamiseks

### Kõrge (HIGH)
4. **CMS admin POST autentimata** — `/api/admin/cms` POST lubas igaüht sisu muuta
5. **Email XSS** — kasutajaandmed renderiti HTML-i ilma escape'imata
6. **Cart POST error handling puudub** — ainus API route ilma try/catch
7. **Checkout validatsioon puudulik** — telefon ja postiindeks polnud formaadis kontrollitud

### Keskmine (MEDIUM)
8. **Tarneviisi error ei nähtav** — shipping API vea korral nupp jäi disabled ilma selgituseta
9. **Ostukorvis puudub tarne vihje** — kasutaja ei teadnud, et tarne lisandub checkout'is
10. **sync-vevor-feed.ts placeholder** — schedulerd job logis segadusse ajavat teadet
11. **OG type puudub kategoorialehtedel** — openGraph metadata puudulik
12. **Checkout näitas ingliskeelseid API veateateid** — serveripoolsed teated jõudsid kasutajale
13. **Sitemap kategooriate paginatsioon** — limit=200 kattis ainult ~12% kategooriatest

## FAAS 2: Parandused

### 1. sitemap.ts (UUS FAIL)
- `storefront/app/sitemap.ts`
- Dünaamiline Next.js sitemap kategooriate + toodete paginatsiooniga
- Fallback: kui Medusa maas, tagastab ainult staatilised lehed

### 2. Feed skriptid — region_id + env var kontroll
- `scripts/generate-osta-feed.mjs` — lisatud MEDUSA_REGION_ID nõue + region_id URL-i
- `scripts/generate-facebook-feed.mjs` — sama fix
- Mõlemast eemaldatud hardcoded API key fallback

### 3. CMS admin auth
- `backend/src/api/admin/cms/route.ts` — POST kontrollib auth_context.actor_id olemasolu

### 4. Email HTML escaping
- `backend/src/lib/email.ts` — lisatud escapeHtml() funktsioon
- Kasutatud: item.title, name, email, shipping_address väljad, trackingNumber

### 5. Cart POST error handling
- `storefront/app/api/cart/route.ts` — try/catch + res.ok kontroll

### 6. Checkout validatsioon
- `storefront/app/tellimus/page.tsx`:
  - Telefon: `/^[\d\s+()-]{7,20}$/`
  - Postiindeks: `/^\d{5}$/` (Eesti formaat)
  - Shipping error: veateade kasutajale
  - API error'id: ainult eestikeelsed teated (mitte serveri ingliskeelsed)

### 7. Ostukorvi tarne vihje
- `storefront/app/ostukorv/page.tsx` — "Tarne lisandub tellimuse vormistamisel"

### 8. sync-vevor-feed.ts
- `backend/src/jobs/sync-vevor-feed.ts` — no-op + cron disabled (Feb 31)

### 9. Kategooria og:type
- `storefront/app/kategooriad/[handle]/page.tsx` — openGraph type: "website"

### 10. Sitemap paginatsioon
- Kategooriate paginatsioon lisatud (while-loop, limit=200 batch'id)

## FAAS 3: Review tulemused

Funktsionaalsuse reviewer + UI reviewer käivitatud paralleelselt.

**Leitud lisakriitilised:**
- Feed skriptide region_id puudumine (PARANDATUD)
- Sitemap kategooriate paginatsioon (PARANDATUD)
- Checkout ingliskeelsed API error'id (PARANDATUD)

**Soovitused (LOW — mitte parandatud):**
- Inline vormivalidatsiooni visuaalne tagasiside
- Loading spinner checkout submit nupul
- "Tagasi ostukorvi" link checkout'is
- Cart GET handler'il puudub try/catch (konsistentsuse probleem)

## FAAS 4: Gatekeeper

**APPROVE** — kõik 10 muudetud faili kontrollitud:
- TypeScript süntaks: OK
- Loogika: OK
- Turvalisus: OK (XSS, auth, input validation adresseeritud)
- Eesti keel: OK
- Unustatud: ei

## Muudetud failid

| Fail | Muutus |
|------|--------|
| storefront/app/sitemap.ts | UUS — dünaamiline sitemap |
| backend/src/api/admin/cms/route.ts | Auth kontroll POST'ile |
| backend/src/lib/email.ts | escapeHtml() + kasutamine |
| backend/src/jobs/sync-vevor-feed.ts | No-op + disabled cron |
| storefront/app/api/cart/route.ts | POST error handling |
| storefront/app/tellimus/page.tsx | Validatsioon + shipping error + ET veateated |
| storefront/app/ostukorv/page.tsx | Tarne vihje |
| scripts/generate-osta-feed.mjs | region_id + env var |
| scripts/generate-facebook-feed.mjs | region_id + env var |
| storefront/app/kategooriad/[handle]/page.tsx | og:type |

## Järelejäänud (LOW priority / skip)

- Montonio (XLM-7) — BLOKEERITUD, API keys puuduvad
- Cart GET try/catch — konsistentsuse probleem, ei crashiks
- Inline form validation UI — UX parandus, funktsionaalselt töötab
- Loading spinner — UX polish
