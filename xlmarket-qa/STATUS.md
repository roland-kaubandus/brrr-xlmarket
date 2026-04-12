# XLMarket QA Status
Viimane kontroll: 2026-04-12T19:30Z
Tervis: 6/10

## Parandatud selles tsüklis
- [storefront] CartSlideOver: kõik ingliskeelsed stringid → eesti (10 stringi)
- [storefront] WishlistPage: pealkiri, tühja seisundi tekst, nupud → eesti (5 stringi)
- [storefront] RecentlyViewed: "Recently Viewed" → "Hiljuti vaadatud"
- [storefront] ProductReviews: arvustuste sektsiooni tekstid → eesti (5 stringi)
- [storefront] SubcategoryGrid: tootegrupid, filtrid → eesti (4 stringi)
- [storefront] NavCartButton: aria-label → eesti
- [app] not-found.tsx (root + locale): 404 leht → eesti (6 stringi)
- [app] login/page.tsx: sisselogimisleht → eesti (7 stringi)
- [app] register/page.tsx: registreerimisleht → eesti (9 stringi)
- [app] account/page.tsx: konto leht → eesti (14 stringi)

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
- Homepage DISPLAY_NAMES: 11+ kategoorianime
- Otsinguleht: breadcrumb, pealkiri, tulemused, tühjad seisundid
- CategoryExploreGrid: "Kategooriad" pealkiri, "toodet" loendur
- Homepage sektsioonid: "Enimmüüdud", "Uued tooted"
- MeiliSearch fallback homepage sektsioonidele
- AuthButton, SearchBar, MegaMenu, TrustBadges tõlgitud

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
- Kontrollitud lehti: 20+ faili (kõik komponendid + app lehed)
- Leitud vigu: 60+
- Parandatud: 95+ parandust 30+ failis (5 tsükliga)
