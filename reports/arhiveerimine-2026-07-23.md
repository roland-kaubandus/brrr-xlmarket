# Arhiveerimis-loogika — churn'inud tooted (2026-07-23)

## Probleem
3242+ churn'inud toodet (feedist kadunud, õigesti OOS) jäid kataloogi "hõredate lehtedena".
Tarmo satub neile pidevalt. Vaja: jälg millal viimati feedis + vanuse-põhine arhiveerimine.

## Vanuse-jaotus (ENNE ehitust, "näita enne")
| Signaal | >90p | 30–90p | <30p |
|---|---|---|---|
| created_at (DB-loomiskuup) | **3249** | 4 | 0 |
| updated_at | 4 | 6 | 3243 (SAASTUNUD eilsete bulk-op'idega — kasutu) |

- Kõik churned = **üks aprilli-batch** (103 päeva vana). "Lühemat aega ära" kohorti praktiliselt ei ole.
- `last_seen_in_feed` metadata olemas: **0** → väli loodi nullist (ei kirjutanud üle midagi).
- Kõrvalleid: range "hõre leht" heuristik (≤1 pilt & desc<40) tabas ainult 1 toodet → "hõredus"
  mille Tarmo näeb = tõenäoliselt puuduv ET-tõlge/rich-content, mitte DB-tühjus. Arhiveerimist ei muuda.

## Lahendus (6 punkti, kokkulepitud)
| # | Komponent | Fail |
|---|---|---|
| 1 | `last_seen_in_feed` (ISO-kuupäev, metadata) | `feed-status-stamp.mjs` |
| 2 | `feed_status`: in_feed \| missing \| archived | `feed-status-stamp.mjs` |
| 3 | Wire feed-refresh'i (samm 3/4, EI delist'i) | `refresh-feed-cache.sh` |
| 4 | >90p → ettepanek (Tarmo kinnitab, --execute väravatud) | `archive-proposals.mjs` |
| 5 | Delist = otsingust/listingust välja, LEHT+URL alles (SEO) | `index-meilisearch.mjs` filter |
| 6 | Tagasitulek = SKU järgi un-archive, EI loo uut | `feed-status-stamp.mjs` |

## Oleku-loogika (feed-status-stamp.mjs, iga refresh'i juures)
- **in-feed** (SKU cache'is): `feed_status=in_feed`, `last_seen=TÄNA` (bump). Kui oli archived → **tagasitulek** → un-archive.
- **kadunud**: `feed_status='missing'` (VÕI säilita 'archived'). `last_seen`: puudub → **bootstrap=created_at** (ühekordne); olemas → säilita.
- Stamp ISE EI delist'i. Feed-managed = `variant.sku === vevor_sku`; custom/outlet vahele.

## SEO-säilitus (miks leht+URL jäävad)
Arhiveeritud toode jääb Medusa's `status=published`. Toote-API (`/api/product/[handle]`) loeb
`getProduct(handle)` **Medusa'st**, Meili ainult hinna/tiitli-rikastuseks fallback'iga → **leht
renderdub 200, URL püsib**. Ainult Meili-indeks jätab `feed_status='archived'` vahele → kaob
ProductGrid/otsing/kategooria-listing. Täielikult pööratav (tagasitulek un-archive'ib).

## Jooksu-tulem (2026-07-23, stamp päris)
- Feed-managed stamp'itud: **18061** (in_feed 14815, missing 3246, custom vahele 1).
- Bootstrap'itud last_seen=created_at: 3246 (ühekordne).
- **Archive-kandidaate >90p: 3242** (kõik 90–180p, 103 päeva = aprill).
- `--execute` **EI ole jooksutatud** — ootab Tarmo kinnitust.

## Tarmo otsustab
```
# Kandidaatide raport (ohutu, ei muuda midagi):
node scripts/archive-proposals.mjs
# Kinnita arhiveerimine (delist 3242, leht+URL jäävad):
node scripts/archive-proposals.mjs --days 90 --execute
# → seejärel reindeks (või oota 4h refresh cron'i):
FEED_CACHE_PATH=/data/vevor-feed-cache.json node scripts/index-meilisearch.mjs
```
