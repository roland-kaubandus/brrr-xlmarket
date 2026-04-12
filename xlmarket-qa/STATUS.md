# XLMarket QA Status
Viimane kontroll: 2026-04-12T22:00Z
Tervis: 7/10

## Parandatud selles tsüklis (Cowork scheduled task)
- [storefront] Otsingutulemuste leht: 15+ stringi → EN locale-aware
- [storefront] Kategoorialeht: CATEGORY_NAMES → {et, en} (20 kategooriat)
- [storefront] Tooteleht: product.title → MeiliSearch locale-aware title
- [storefront] Tooteleht: "Frequently Bought Together", "Total", "Best in" → EN
- [storefront] VevorPagination: aria-labels → EN locale-aware
- [storefront] VevorProductCard: wishlist aria-labels → EN locale-aware
- [storefront] UUS: Toodete võrdlus feature (CompareContext, CompareBar,
  AddToCompareButton, võrdlusleht /vordlus)

## Eelmistes tsüklites parandatud (repos, pole deployitud)
- VevorHeader nav lingid tõlgitud
- VevorProductCard: In Stock → Laos, No image → Pilt puudub
- Kategoorialeht: tootepealkirjad, loendur, tühja kategooria tekst
- ProductPurchasePanel, ProductInfoAccordion, StickyBuyBar tõlgitud
- VevorFooter, VevorSearchFilters, BranchFilters tõlgitud
- BannerCarousel: 4 banneri slaidi tõlgitud
- Otsinguleht: breadcrumb, pealkiri, tulemused, tühjad seisundid
- CartSlideOver, WishlistPage, RecentlyViewed, ProductReviews tõlgitud
- Login, Register, Account, 404 lehed tõlgitud
- AuthButton, SearchBar, MegaMenu, TrustBadges tõlgitud

## Teadaolevad probleemid
- KRIITILINE: VPS vajab redeploymenti! Kõik muudatused on repos.
- KESKMINE: MeiliSearch title_en fallback — kui MeiliSearch pole
  kättesaadav, näidatakse Medusa eestikeelset nime EN lehel
- KESKMINE: Comparison specs tühjad kui toode lisati kaardilt (mitte tootelehelt)
- MADAL: URL teed eestikeelsed (/en/toode, /en/otsing) — intentional?
- MADAL: xlmarket.ee SSL sertifikaat puudub

## Statistika
- Kontrollitud lehti: 30+ faili (kõik komponendid + app lehed)
- Kogu parandusi: 135+ parandust 40+ failis (7 tsükliga)
- Uusi featuure: 1 (toodete võrdlus)
