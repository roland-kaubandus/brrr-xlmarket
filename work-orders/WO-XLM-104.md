# WO-XLM-104: Tooteleht / Product Detail Page (VEVOR 1:1)
**Created:** 2026-04-08
**Author:** Cowork (Claudia)
**Assignee:** CC (XL agent, VPS)
**Priority:** P0
**Status:** TODO
**Parent:** WO-XLM-100
**Sõltub:** WO-XLM-101 (header), WO-XLM-102 (ProductCard)
**Referents:** Ava ÜKSKÕIK MILLINE toode eur.vevor.com-is ja vaata!

---

## EESMÄRK

Asendada praegune tooteleht (`app/[locale]/toode/`) VEVOR-identse tootelehega.
KURAT KÜLL 100% 1:1 — MITTE MIDAGI TEISITI.

---

## LEHE STRUKTUUR

### 1. BREADCRUMB
- "Home > [L1 Category] > [L2] > [L3] > [Product Name]"
- Hall, väike tekst, lingitav kuni viimase elemendini

### 2. ÜLEMINE POOL (above-the-fold, 2 veergu)

#### VASAK VEERG (~60%): PILDIGALERII
- **Thumbnail strip:** Vertikaalne rida vasakul (6-8 pisipilti, ~80x80)
  - Aktiivne thumbnail: oranž border
  - Scroll üles/alla kui pilte rohkem
  - Viimane: "+12 More" badge (avab kõik pildid)
- **Peamine pilt:** Suur, ~500x500px, valge taust
  - Klikk/hover: zoom-in (magnifying glass efekt)
  - Vasakul/paremal: < > navigeerimise nooled
- **Pildid peavad tulema Medusa toote thumbnail + metadata piltidest**
- **VEVOR-il on toodete kohta 10-20+ pilti.** Meie näitame KÕIKI mis Medusa-s olemas

#### PAREM VEERG (~40%): TOOTE INFO
Järjestus ülevalt alla:

1. **Pealkiri** — Bold, ~20px, must. Täispikk nimi nagu VEVOR-il.
   - "VEVOR Welding Screen with Frame, 1.8 x 1.8 m Welding Curtain Screen..."

2. **Reiting** — ★★★★☆ 4.0 (oranžid tähed) + "4 Reviews" link + ♡ wishlist

3. **Hind** — SUUR, bold, ~36px
   - "€82.11" (meie hind = vevor * 1.15)
   - All: "€66.75 Deal after registering" (oranž/punane, väiksem)
   - "VAT included ℹ️"
   - "Earn at least 2% points..." (väike hall tekst)

4. **Tarne info**
   - 🚚 "€11.74 Shipping Fees"
   - "Delivery to **Estonia**. Get it **Mon. Apr. 13 - Tues. Apr. 14**"
   - "Details" link

5. **VARIANDIVALIKUD** (KRIITILISELT TÄHTIS!)
   
   VEVOR toodtel on MITU valikut, nt:
   - **Size:** "6 × 8 ft" / "6 × 6 ft" — piltidega nupud, "Out of Stock" märge
   - **Color:** "Yellow" / "Green" / "Red" — teksti nupud, aktiivne oranž border
   - **With Window or Not:** "Without Window" / "With Window" — teksti nupud
   
   Iga variandivalik:
   - Label (bold): "Size:", "Color:", "With Window or Not:"
   - Valikute nupud: pildiga VÕI tekstiga, oranž border aktiivsel
   - Hind muutub valikuga
   - "Out of Stock" = hall, klikitamatu

6. **Laoseis** — "In Stock" (roheline, bold) VÕI "Out of Stock" (punane)

7. **Quantity selector** — [-] 1 [+] (number input)

8. **Add to Cart nupp** — Suur, oranž, full-width, bold
   - "Add to Cart"
   - Hover: tumedam oranž

9. **Buy Now nupp** — Suur, must, full-width
   - "Buy Now"

### 3. STICKY SIDEBAR (parem serv, VEVOR stiil)
- Mini-ostukorv: "Subtotal: €0.00" + "Go to Cart"
- Kui midagi korvis: näitab tooteid

### 4. "Features & Details" sektsioon (below fold)
- **Bullet-point nimekiri** toote põhiomadustest
- Iga punkt: ✅ ikoon + tekst
- Nt: "Super Large Size", "Flame-Resistant Material", "4 Swivel Wheels"
- Need tulevad Medusa toote `description` väljast (parsida)

### 5. RIKKALIK KIRJELDUS (VEVOR description images)
- **SUUR SEKTSIOON piltidega**
- VEVOR-il on iga toote kohta 10-20 lifestyle/detail pilti tekstiga
- Need on HTML content Medusa `description` väljal
- Pildid: VEVOR CDN URL-id
- Tekst: toote omaduste kirjeldused piltide vahel
- **SEE ON KÕIGE TÄHTSAM OSA TOOTELEHEST — need pildirohked kirjeldused!**

### 6. SPETSIFIKATSIOONID (tabel)
- 2-veeruline tabel: Omadus | Väärtus
- Nt: "Material: Vinyl", "Size: 6 × 6 ft", "Color: Red", "Weight: 15 kg"
- Need tulevad Medusa toote `metadata` väljast

### 7. REVIEWS / ARVUSTUSED
- Reiting kokkuvõte: suured tähed + arv
- Individuaalsed arvustused: nimi, tähed, kuupäev, tekst, pildid
- **NB:** Meil pole veel review süsteemi. Tee placeholder "No reviews yet. Be the first!"
- Tulevikus: integratsioon

### 8. "You May Also Like" / Related Products
- Horisontaalne carousel samast kategooriast
- VevorProductCard kaardid
- < > nooled

---

## TEHNILINE JUHIS

1. Praegune `app/[locale]/toode/[handle]/page.tsx` — ÜMBER KIRJUTADA
2. Praegused komponendid KUSTUTADA ja ASENDADA:
   - `ProductGallery.tsx` → `VevorProductGallery.tsx`
   - `ProductInfoAccordion.tsx` → `VevorProductInfo.tsx`
   - `CollapsibleDescription.tsx` → `VevorRichDescription.tsx`
   - `StickyBuyBar.tsx` → `VevorStickyCart.tsx`
3. Uued komponendid:
   - `VevorVariantSelector.tsx` — variandivalikud piltide/tekstiga
   - `VevorSpecsTable.tsx` — spetsifikatsioonide tabel
   - `VevorReviews.tsx` — arvustuste sektsioon
   - `RelatedProducts.tsx` — carousel
4. Variant handling: Medusa variant API — iga variant = size+color+option combo

---

## ACCEPTANCE CRITERIA

- [ ] Tooteleht on visuaalselt identne eur.vevor.com tootelehega
- [ ] Pildigalerii: thumbnailid vasakul, suur pilt keskel, zoom hoveril
- [ ] "+N More" piltide badge
- [ ] Variandivalikud: Size (piltidega), Color (tekstiga), muud valikud
- [ ] Hind muutub variandi valikuga
- [ ] "Out of Stock" variandid on hallid
- [ ] Add to Cart + Buy Now nupud
- [ ] "Features & Details" bullet-list
- [ ] RIKKALIK KIRJELDUS piltidega (HTML content)
- [ ] Spetsifikatsioonide tabel
- [ ] Reviews sektsioon (placeholder)
- [ ] Related Products carousel
- [ ] Breadcrumb navigatsioon
- [ ] Mobile: ühe veeru layout, galerii on swipeable
