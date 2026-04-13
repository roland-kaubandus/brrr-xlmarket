# CLAUDE.md — XL: xlmarket.eu e-pood

> Viimati uuendatud: 2026-04-14

---

## Kes sa oled

**XL** — xlmarket.eu e-poe arendusagent.
Huly projekt: **XLM** | Konto: xl@brrr.ee

---

## Stack

```
Medusa.js 2.0  — e-poe backend (port 9001)
Next.js 16     — storefront (port 3030)
PostgreSQL 16  — andmebaas (port 5435)
Redis 7        — cache/sessions (port 6380)
MeiliSearch    — full-text search + facets (port 7700)
Medusa Admin   — admin paneel (port 7001)
nginx          — reverse proxy + SSL
Docker Compose — kõik teenused konteinerites
```

### Tootefeed
- **Sync:** iga 4 tundi
- **Hinnavalem:** algne_hind * 1.15 = lõpphind (käibemaksuga, erandit ei ole)
- **Tooted:** ~16 046, 1 688 kategooriat

### Makselahendus
- **Montonio** — pangalingid + kaardimaksed

### Integratsioonid
- osta.ee (XML feed), Facebook Commerce + Pixel, X Twitter Cards

---

## Commands

```bash
# Storefront
npm run dev                     # dev (port 3000)
npm run build && npm run start  # prod (port 3030)

# Backend
cd backend && npm run dev       # medusa (port 9001)

# VEVOR import
node backend/src/scripts/import-vevor-feed.mjs --execute --update

# VPS deploy
rm -rf storefront/.next/cache/fetch-cache
cd storefront && npm run build
fuser -k 3030/tcp && nohup npx next start -p 3030 &
```

---

## Gotchas

- **Next.js fetch cache:** Medusa API update jarelt storefront serveerib vana data. Fix: `rm -rf .next/cache/fetch-cache` + restart
- **MeiliSearch facetDistribution:** Tagastab KOIK category_handles. Filtreeri L1 branch handles manuaalselt (`lib/branches.ts`)
- **Multiple next-server protsessid:** Vana protsess jaab kuulama. `ss -tlnp | grep 3030` ja kill vana PID
- **Next.js hangib perioodiliselt:** Kuulab pordil aga ei vasta. Fix: `fuser -k 3030/tcp && sleep 3 && nohup npx next start -p 3030 &`
- **VEVOR CDN %2B:** Moned failinimed sisaldavad `+` (%2B). ARA decodeURIComponent — CDN nouab kodeeritud URL-e
- **Medusa admin (Vite):** `allowedHosts: ["xlmarket.store"]` + `backendUrl: "https://xlmarket.store"`
- **nginx /app proxy:** `location ^~` (mitte `location /`)
- **Email subscribers KATKI:** `order-placed.ts` ja `order-shipped.ts` kommenteeritud valja
- **CORS:** STORE_CORS, ADMIN_CORS, AUTH_CORS peavad sisaldama `https://xlmarket.store`

---

## Key files

- `scripts/import-vevor-feed.mjs` — VEVOR XLSX importer (SPU grouping, image dedup)
- `scripts/feed-sync.sh` — Cron sync (4h): download, cache, reindex, stock, feeds
- `storefront/components/ProductGallery.tsx` — Image gallery + lightbox
- `storefront/components/BannerCarousel.tsx` — Branch fotod bannerid
- `storefront/app/[locale]/toode/[handle]/page.tsx` — Toote detail
- `storefront/app/[locale]/haru/[handle]/page.tsx` — Kategooria leht
- `storefront/lib/branches.ts` — Branch definitsioonid
- `storefront/lib/meilisearch.ts` — MeiliSearch client + compound word expansion

---

## Reeglid

- Pildid: kasuta VEVOR CDN URL-e, ara kopeeri serverisse
- Tarmole peab admin olema lihtne ja eestikeelne
- Tootehinnad ALATI * 1.15
