# XLMarket QA Status
Viimane kontroll: 2026-04-12T15:45Z
Tervis: 5/10

## Parandatud selles tsüklis
- [homepage] MeiliSearch fallback: Enimmüüdud ja Uued tooted sektsioonid
  kasutavad nüüd MeiliSearchi (Medusa API ei tagasta tooteid ilma filtrita)
- [homepage] 16 VEVOR EN kategooria handle → eestikeelne nimi
- [homepage] Sektsiooni pealkirjad locale-teadlikud (ET/EN)
- [kategooriad] 18 L1 kategooria eestikeelne nimi lisatud

## Eelmistes tsüklites parandatud (repos, pole deployitud)
- VevorHeader nav lingid tõlgitud
- VevorProductCard: In Stock → Laos, No image → Pilt puudub
- Kategoorialeht: tootepealkirjad, loendur, tühja kategooria tekst
- ProductPurchasePanel: hind, laoseis, nupp, tarne info
- ProductInfoAccordion: kõik 4 sektsiooni tõlgitud
- Toote leht: kõik sektsioonipealkirjad tõlgitud
- AddToCartButton, StickyBuyBar tõlgitud
- VevorFooter: trust badge'd, jaluse lingid tõlgitud
- VevorSearchFilters: sorteerimise valikud, filtrid tõlgitud
- BranchFilters: In Stock → Laos
- BannerCarousel: 4 banneri slaidi tõlgitud
- Homepage DISPLAY_NAMES: 11 kategoorianime
- Otsinguleht: breadcrumb, pealkiri, tulemused, tühjad seisundid

## Teadaolevad probleemid
- KRIITILINE: VPS vajab redeploymenti! Kõik tõlked + MeiliSearch fix
  on repos aga pole live lehel.
- KRIITILINE: Tootepildid kategoorialehtedel — Next.js Image proxy
  probleem (VEVOR CDN blokeerib) — osaliselt lahendatud unoptimized propiga
- KESKMINE: L2/L3 subcategory nimed inglise keeles — data-tasandi probleem
- KESKMINE: Breadcrumb kategooria nimed inglise keeles — Medusa data
- KESKMINE: Mõned tootekirjeldused inglise keeles — VEVOR feedist
- MADAL: xlmarket.ee SSL sertifikaat puudub. xlmarket.eu → VEVOR redirect.
- MADAL: Tarne/tagastamise lehed inglise keeles

## Statistika
- Kontrollitud lehti: 4 (avaleht, kategooria, toode, footer)
- Leitud vigu: 8
- Parandatud: 4 koodiparandust 2 failis
- Kogu parandusi kolme tsükli peale: 30+ parandust 17+ failis
