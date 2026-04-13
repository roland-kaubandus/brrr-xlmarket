# XLMarket Design Audit — 2026-04-13

## Koondhinne: 4/10

Leht toimib, aga tundub nagu Tailwind template pooleli. Puudub disaineri pilk — kõik on "piisavalt", aga midagi pole "hästi".

---

## HEADER (VevorHeader.tsx)

### Probleemid
- **Keelevalik** on pill-nupp mis ei erine visuaalselt auth nupust — kasutaja ei leia seda
- **Logo** on lihtsalt tekstipõhine "XL Market" — professionaalses e-poes peaks olema proper logo
- **Delivery indicator** "Tarne Eestisse" — raiskab ruumi, info on footerisse parem
- **Mobiilis** puudub keelevalik täielikult (hidden)
- **Oranž nav-riba** on liiga paks (44px) — sööb ekraaniruumi, sticky header on ~140px kõrge mobiilis
- **Nav lingid** (Deals, New, Best Sellers, Clearance, About) — liiga palju samasugust stiili, pole hierarhiat

### Puuduv
- Account dropdown (praegu lihtsalt link)
- Mobiili hamburger menu (nav lingid pole mobiilis nähtavad)
- Search suggestions / autocomplete preview

---

## BANNER CAROUSEL (BannerCarousel.tsx)

### Probleemid
- **Kõrgus liiga väike mobiilis** (200px) — pilt on nähtamatu, tekst on kitsas
- **4 bannerit** on liiga palju — kasutaja ei vaata üle 2
- **CTA nupud** on kõik sama stiiliga — pole visuaalset eristust
- **Dot indicators** (3px kõrge) on peaaegu nähtamatud
- **Autoplay 6s** — liiga kiire, kasutaja ei jõua lugeda
- **Tekst** on ainult inglise keeles, locale ei mõjuta sisu

### Puuduv
- Swipe gesture mobiilis
- Progress bar selle asemel et dotid

---

## KATEGOORIAD AVALEHEL (CategoryExploreGrid.tsx)

### Probleemid — KRIITILISED
- **Horisontaalne scroller** 22 kategooriaga — kasutaja ei näe enamikku kunagi
- **90x90px ruudud** on liiga väikesed, pildid on äratundmatud
- **Üksluine grid** — kõik on sama suuruses, pole hierarhiat ega fookust
- **Taust #F8FAFC** on peaaegu valge — sektsioon ei eristu
- **Tekst 12px** on liiga väike — eriti mobiilis
- **Scroll arrows** ilmuvad ainult hover'il — mobiilis ei tööta
- **Kõik kategooriad on võrdsed** — kasutaja ei tea kust alustada

### Lahendus peaks olema
- Top 6-8 kategooriat suurte kaartidena (bento/grid)
- Ülejäänud "View All Categories" lingi all
- Pildid vähemalt 200x200

---

## TOOTEKAART (VevorProductCard.tsx)

### Probleemid
- **Fake star ratings** (deterministic hash) — ebaprofessionaalne, kasutaja kahtlustab
- **Compare ja Wishlist nupud** ilmuvad ainult hover'il — mobiilis pole ligipääsu
- **Padding 12px** on liiga kitsas
- **Font 13px** title jaoks on liiga väike
- **"In Stock" badge** on alati roheline — pole tõeline (hardcoded)
- **Discount badge** on punane box aga pole kunagi kasutusel (kõik hinnad on samad)

### Hea
- Image hover zoom on sujuv
- Hinnakujundus on selge

---

## FILTRID (BranchFilters.tsx)

### Probleemid — KRIITILISED
- **Mobiilis on filter bar** 48px kõrge horisontaalne riba — tekst on 12px, vajad mikroskoopi
- **Sort pills** (Newest, Cheapest, Most Expensive) — mobiilis lähevad üle ääre, no overflow handling
- **Price display** näitab "Price: 0EUR - infinity" — mõttetu kui pole filtrit rakendatud
- **"In Stock" toggle** on ainult inglise keeles
- **"Filters" nupp** avab drawer mis on desktop-only disainiga — mobiilis on kasutamatu
- **Kogu filter bar on ühe reana** — mobiilis peaks olema vertikaalne

### Puuduv
- Mobiili filter sheet (bottom drawer / full screen)
- Range slider hinna jaoks
- Aktiivsete filtrite clear ühe nupuga

---

## FOOTER (VevorFooter.tsx)

### Probleemid
- **Maksekaardi logod** on lihtsalt tekst ("VISA", "MC", "SEB") — peaks olema pärised ikoonid/logod
- **Trust badges** (free shipping, 30-day returns) — on footeri kohal eraldi ribal, aga see riba on #334155 vs footer #1E293B — peaaegu sama värv, ei eristu
- **Mobiilis** on 5-column grid kokkusurutud — väga kitsas

### Hea
- Struktuur on loogiline
- Kontaktinfo on kohal

---

## CSS / DESIGN SYSTEM (globals.css)

### Probleemid
- **Ainult 1 font** (DM Sans) — pole kontrasti headlines vs body
- **Värvid on OK** aga monotoonnsed — kogu leht on navy + amber, ei ole visuaalset vaheldust
- **Puudub typographic scale** — font suurused on ad-hoc (13px, 14px, 17px, 22px)
- **Noise overlay** on olemas aga nii nõrk (0.025 opacity) et pole nähtav
- **Puudub grid system** — max-width kõigub 1360px ja 1400px vahel

### Hea
- Custom properties on defineeritud
- Transition timing on ühtlane (cubic-bezier)
- Focus-visible on kohal

---

## MOBILE UX KOKKUVOTE

| Komponent | Hinne | Probleem |
|-----------|-------|----------|
| Header | 3/10 | Liiga kõrge (140px), keelevalik puudub |
| Banner | 4/10 | Liiga madal (200px), tekst loetamatu |
| Categories | 2/10 | Horiz scroll 22 itemit, pildid 90px |
| Products | 5/10 | OK, aga wishlist/compare pole kättesaadav |
| Filters | 2/10 | Üherealine bar ei tööta mobiilis |
| Footer | 5/10 | OK, veidi kitsas |

---

## DESKTOP UX KOKKUVOTE

| Komponent | Hinne | Probleem |
|-----------|-------|----------|
| Header | 5/10 | Tööks, aga pole polished |
| Banner | 6/10 | OK, aga liiga palju slaide |
| Categories | 3/10 | Scroller vs grid — vale valik |
| Products | 6/10 | OK grid, hover states head |
| Filters | 4/10 | Tööks desktop'il, aga pole intuitiivne |
| Footer | 6/10 | Struktuur hea, execution keskmine |

---

## TOP 5 PRIORITEETI

1. **Kategooriad avalehel** — bento grid suurte kaartidega, mitte horisontaalne scroller
2. **Mobiili filter sheet** — bottom drawer, mitte horisontaalne pill bar
3. **Header kõrguse vähendamine** — eriti mobiilis, sticky header sööb 140px
4. **Keelevalik** — silmapaistev, mõlemas vaates kättesaadav
5. **Fake ratings eemaldamine** — ebaprofessionaalne
