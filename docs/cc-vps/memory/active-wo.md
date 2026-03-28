# Aktiivne WO: WO-XLM-005

## Storefront: avaleht, kategooriad, tooted, otsing

### Mis on tehtud
- WO-XLM-001: Infra ready (Medusa 9001, Storefront 3030, PG 5435, Redis 6380, nginx 8090)
- WO-XLM-002: Store config (XLMARKET, Eesti regioon EUR, 22% KM, 11 kategooriat, API key)
- WO-XLM-003: Feed import (14 280 toodet, 10 719 laos, 0 viga)
- WO-XLM-004: Kategooriate mapping (60 VEVOR L1 -> 11 ET kategooriat)

### Mis on järgmine
WO-XLM-005: Storefront lehed
- Avaleht: hero + kategooriate grid + populaarsed tooted
- Kategooria leht: tooted filtritega (hind, laoseis), pagination
- Toote leht: pilt, pealkiri, hind, laoseis, kirjeldus, lisa korvi
- Otsing: toodete otsimine

### Kriitilised andmed
- **Medusa backend:** http://127.0.0.1:9001
- **Publishable API key:** pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3
- **Region ID:** reg_01KMRXWSNXSYE4530A3K2BK86W
- **Sales channel:** sc_01KMRWP84555JPGA6M0QMG409M
- **Admin login:** tarmo@xlmarket.eu / XLmarket2026!secure
- **Storefront port:** 3030
- **nginx port:** 8090

### Store API näited
```bash
# Tooted (laos olevad)
curl -H "x-publishable-api-key: pk_d8dce98d..." "http://127.0.0.1:9001/store/products?limit=20&region_id=reg_01KMRXWSNXSYE4530A3K2BK86W"

# Kategooriad
curl -H "x-publishable-api-key: pk_d8dce98d..." "http://127.0.0.1:9001/store/product-categories"

# Otsing
curl -H "x-publishable-api-key: pk_d8dce98d..." "http://127.0.0.1:9001/store/products?q=welder&region_id=reg_01KMRXWSNXSYE4530A3K2BK86W"
```

### Disaini juhised
- Font-based logo "XLMARKET" (Inter/Space Grotesk)
- Ilma ikoonideta, minimalistlik
- Värvid: tume navy/must + valge + amber/oranž CTA
- Mobile responsive
- Eestikeelne UI

### Protsessid mis jooksevad
- Medusa: `npx medusa develop --port 9001` (nohup)
- Storefront: `npm run start` port 3030 (nohup)
- PostgreSQL: Docker container xlmarket-db (port 5435)
- Redis: Docker container xlmarket-redis (port 6380)
- nginx: port 8090 -> storefront/medusa

### Failid
- Storefront: `/home/brrr/brrr-xlmarket/storefront/`
- Layout: `storefront/app/layout.tsx`
- Avaleht: `storefront/app/page.tsx`
- Config: `storefront/next.config.ts`
- Medusa config: `backend/medusa-config.js`
- Import script: `backend/src/scripts/import-feed.mjs`
