# WO-XLM-109 — MeiliSearch mitmekeelne indeks

**Staatus:** DEPLOYED ✅
**Prioriteet:** KRIITILINE — otsing katkine tõlgitud toodete jaoks
**Täitja:** Claudia
**Kuupäev:** 2026-04-09

## Probleem

Tõlkeskriptid kirjutavad ET pealkirja `product.title` välja üle,
kuid MeiliSearch indeks sisaldab ainult ühe `title` välja.
Tulemus: EN otsing ei leia ET tooteid ja vastupidi. ~150 toodet mõjutatud.

## Arhitektuuriotsus

`product.title` = alati originaal EN (VEVOR feed). EI kirjutata üle.
Tõlge läheb `metadata.title_et` + `metadata.description_et`.
MeiliSearch: `title_en` + `title_et` (+ tulevikus `title_ru` jne) kõik paralleelselt.
Storefront: kuva locale järgi õige väli, EN fallback.

## Muudetavad failid

1. `backend/scripts/index-meilisearch.mjs`
2. `backend/src/scripts/translate-claude.mjs`
3. `backend/src/scripts/translate-products.mjs`
4. `storefront/lib/meilisearch.ts`

## Pärast muudatusi VPS-il käivitada

```bash
cd /home/brrr/brrr-xlmarket/backend
node scripts/index-meilisearch.mjs
```
