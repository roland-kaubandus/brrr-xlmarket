# XLMarket QA Status
Viimane kontroll: 2026-04-12T12:00Z
Tervis: 4/10

## Parandatud selles tsüklis
- [storefront] VevorHeader nav lingid tõlgitud eesti keelde (Sooduspakkumised, Uued, Bestsellerid, Allahindlus, Meist)
- [storefront] VevorHeader "Delivery to Estonia" → "Tarne Eestisse"
- [storefront] VevorProductCard "In Stock" → "Laos", "No image" → "Pilt puudub"
- [storefront] Kategoorialeht: tootepeakirjad kasutavad nüüd getLocalizedTitle() (ET tõlked MeiliSearchist)
- [storefront] Kategoorialeht: "products" → "toodet", "You May Also Like" → "Sulle võib meeldida ka"
- [storefront] Kategoorialeht: tühi kategooria tekst tõlgitud
- [storefront] ProductPurchasePanel: "Price includes VAT" → "Hind sisaldab käibemaksu", "In Stock" → "Laos", "Buy Now" → "Osta kohe", tarne info tõlgitud
- [storefront] ProductInfoAccordion: kõik 4 sektsiooni tõlgitud (Tarne, Garantii, Tagastamine, Maksemeetodid)
- [storefront] Toote leht: "Features & Details" → "Omadused ja detailid", "Specifications" → "Tehnilised andmed", "Product Description" → "Tootekirjeldus", "Reviews" → "Arvustused", "Similar Products" → "Sarnased tooted", "Manuals & Downloads" → "Juhendid ja allalaadimised"
- [storefront] AddToCartButton: "Add to Cart" → "Lisa ostukorvi", "Added!" → "Lisatud!", "View Cart" → "Vaata ostukorvi"
- [storefront] StickyBuyBar: "Cart" → "Ostukorv", "Add to Cart" → "Lisa ostukorvi"
- [storefront] VevorFooter: kõik trust badge'd, jaluse lingid ja pealkirjad tõlgitud eesti keelde
- [storefront] VevorSearchFilters: sorteerimise valikud, "Categories" → "Kategooriad", "Price" → "Hind", "In Stock" → "Laos", "Clear filters" → "Tühjenda filtrid"
- [storefront] BranchFilters: "In Stock" → "Laos"

## Teadaolevad probleemid
- KRIITILINE: Tootepildid puuduvad kategoorialehtedel — Next.js Image proxy tagastab 0x0 pilte. Thumbnail URL-id on MeiliSearchis olemas aga /_next/image proxy ei suuda neid laadida. Tõenäoliselt VEVOR CDN blokeerib serveri-poolseid päringuid. Lahendus: kas unoptimized prop lisamine või image proxy konfiguratsiooni muutmine VPS-is.
- KRIITILINE: Paljud alamkategooria ikoonid puuduvad (nt Automotive: 6/9 tühja). Andmete probleem — MeiliSearchis pole paljudel kategooriatel tootepilte.
- KESKMINE: Koduleht tühi pärast kategooriaid — "Best Sellers" sektsioon ei laadi tooteid.
- KESKMINE: "Arts & Crafts" kategoorias puudub toodete arv kodulehel.
- KESKMINE: Mõned tootekirjeldused ("Features & Details" sisu) on endiselt inglise keeles — see tuleb VEVOR feedist ja vajab tõlkepipeline'i.
- MADAL: Tarne/tagastamise/tingimuste lehed on täielikult inglise keeles (eraldi lehed, mitte komponendid).
- MADAL: xlmarket.ee domeen annab SSL vea, xlmarket.eu suunab VEVOR-i lehele.
- INFO: Homepage pealkiri "Categories" on endiselt ingliskeelne (tuleb ilmselt eraldi home page komponendist).

## Statistika
- Kontrollitud lehti: 5 (avaleht, 2 kategooriat, 1 toode, konsool)
- Leitud vigu: 14+
- Parandatud: 14 tõlkemuudatust 10 failis
