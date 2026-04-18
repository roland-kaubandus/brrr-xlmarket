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
node scripts/import-vevor-feed.mjs --execute --update

# Backfill sanitized HTML (kiire, ilma XLSX-ita)
node scripts/backfill-sanitized-html.mjs --execute

# VPS deploy
cd storefront && npm run build
cp -r .next/static .next/standalone/.next/static
pm2 reload xlmarket-storefront
```

---

## Gotchas

- **sanitizeHtml regex:** PEAB kasutama bounded quantifiers! `{0,50}[^{}]{0,300}\{[^}]{0,5000}\}`. Vana nested regex `(?:\s+[charclass]*)*` põhjustas catastrophic backtracking ja kogu serveri hangumise.
- **MeiliSearch otse brauserist:** ProductGrid küsib `/meili/indexes/products/search` (nginx proxy). Ära kunagi tõsta MeiliSearch päringuid tagasi Next.js API route'i — see oli hangumise põhjus.
- **sanitizeHtml pre-compute:** Feed import salvestab `sanitized_description` + `sanitized_rich_description` Medusa metadata'sse. Product API route loeb neid, fallback runtime sanitize'ile.
- **Standalone build static copy:** `npm run build` järel PEAB tegema `cp -r .next/static .next/standalone/.next/static` — muidu CSS puudub!
- **PM2 deploy:** Kasuta `pm2 reload xlmarket-storefront`, mitte `fuser -k`. 5 cluster workerit, graceful reload.
- **Next.js fetch cache:** Medusa API update järelt storefront serveerib vana data. Fix: `rm -rf .next/cache/fetch-cache` + rebuild
- **MeiliSearch facetDistribution:** Tagastab KÕIK category_handles. Filtreeri L1 branch handles manuaalselt (`lib/branches.ts`)
- **VEVOR CDN %2B:** Mõned failinimed sisaldavad `+` (%2B). ÄRA decodeURIComponent — CDN nõuab kodeeritud URL-e
- **Medusa admin (Vite):** `allowedHosts: ["xlmarket.store"]` + `backendUrl: "https://xlmarket.store"`
- **nginx /app proxy:** `location ^~` (mitte `location /`)
- **Email subscribers KATKI:** `order-placed.ts` ja `order-shipped.ts` kommenteeritud välja
- **CORS:** STORE_CORS, ADMIN_CORS, AUTH_CORS peavad sisaldama `https://xlmarket.store`

---

## Key files

- `scripts/import-vevor-feed.mjs` — VEVOR XLSX importer (SPU grouping, image dedup, sanitizeHtml pre-compute)
- `scripts/backfill-sanitized-html.mjs` — Kerge backfill: sanitized HTML kõigile toodetele (ilma XLSX-ita)
- `scripts/feed-sync.sh` — Cron sync (4h): download, cache, reindex, stock, feeds
- `storefront/lib/sanitize.ts` — HTML sanitizer (KRIITLINE: bounded quantifiers regex!)
- `storefront/lib/meilisearch.ts` — MeiliSearch client + compound word expansion
- `storefront/lib/map-meili-hit.ts` — MeiliSearch hit → Product mapper (shared)
- `storefront/components/ProductGrid.tsx` — Client-side tooteloend, küsib MeiliSearch'i otse brauserist
- `storefront/components/SafeLink.tsx` — Link wrapper, prefetch=false + 300ms throttle
- `storefront/app/api/product/[handle]/route.ts` — Toote andmete koondamine (Medusa + MeiliSearch + sanitizeHtml)
- `storefront/app/api/products/route.ts` — Toote otsingu API (fallback)
- `storefront/app/[locale]/toode/[handle]/page.tsx` — Toote detail (kerge SSR shell)
- `storefront/app/[locale]/toode/[handle]/ProductPageClient.tsx` — Bridge: fetchib API, renderdab client-side
- `storefront/app/[locale]/toode/[handle]/ProductContent.tsx` — Toote UI (client-only)
- `storefront/app/[locale]/kategooriad/[handle]/page.tsx` — Kategooria leht (L1/L2/L3, spec §3.5)
- `storefront/app/xl-admin/taxonomy-health/page.tsx` — Live invariants dashboard (F5.7)
- `storefront/app/xl-admin/categorization-queue/page.tsx` — Review queue UI (F3.5)
- `storefront/components/CategoryThumb.tsx` — Ühtne kategooria pilt/SVG fallback (F5b)
- `storefront/components/MegaMenu.tsx` — N-level SSoT drill (F5b)
- `storefront/lib/category-tree.ts` — SSoT helpers (getBreadcrumbTrail, firstKnownHandle, getL1Ancestor)
- `backend/src/data/taxonomy.yaml` — SSoT (F2.1)
- `backend/src/data/taxonomy-image-aliases.yaml` — Image alias map (F5b, 176/176 kate)
- `scripts/gen-category-tree.mjs` — YAML → JSON snapshot (`--check`, `--report`)
- `scripts/check-taxonomy-invariants.mjs` — 23 invariants, `--json` CI mode
- `docs/runbooks/taxonomy-invariant-failures.md` — per-INV remediation steps
- `storefront/lib/branches.ts` — Branch definitsioonid
- `storefront/ecosystem.config.js` — PM2 cluster config (5 workerit)
- `nginx/microcache.conf` — nginx microcache konfiguratsioon

---

## Reeglid

- Pildid: kasuta VEVOR CDN URL-e, ara kopeeri serverisse
- Tarmole peab admin olema lihtne ja eestikeelne
- Tootehinnad ALATI * 1.15
