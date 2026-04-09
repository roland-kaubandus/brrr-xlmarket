# WO-XLM-102: Avaleht / Homepage (VEVOR 1:1)
**Created:** 2026-04-08
**Author:** Cowork (Claudia)
**Assignee:** CC (XL agent, VPS)
**Priority:** P0
**Status:** TODO
**Parent:** WO-XLM-100
**Sõltub:** WO-XLM-101 (header/footer peavad olema valmis)
**Referents:** https://eur.vevor.com — ava ALATI kõrvale!

---

## EESMÄRK

Asendada praegune XLMarket avaleht (HeroSection, BranchShowcase, ThreePathsSection jne) VEVOR-identse avalehega.

**PRAEGUNE AVALEHT KUSTUTADA TÄIELIKULT:** HeroSection, BranchShowcase, ThreePathsSection — kõik välja.

---

## AVALEHE SEKTSIOONID (ülevalt alla, VEVOR järjekorras)

### 1. BANNER CAROUSEL (kohe headeri all)

- **Suurus:** Full-width (max-width ~1360px centered), ~250px kõrge
- **Karussell:** Automaatselt kerib (5-6s intervall)
- **Kontrollid:**
  - Dot indicators all-keskel (täidetud = aktiivne, tühi = mitte)
  - < > nooled paremal (ümmargused nupud)
- **Sisu:** 2-3 banner-pilti (CMS-ist tulevikus, esialgu hardcode)
  - Banner 1: "XL Market Spring Sale" + "Shop Now" nupp
  - Banner 2: "Free Shipping on Orders Over €99"
  - Banner 3: "New Arrivals — Tools & Equipment"
- **Taust:** Helehall (#E8ECF0) lehel, banner ise valge/värviline
- **NB:** VEVOR-il EI OLE hero sektsiooni ega suuri lifestyle-pilte. Ainult banner carousel!

### 2. "Categories to Explore" sektsioon

- **Pealkiri:** "Categories to Explore" (bold, ~24px, must)
- **Grid:** 4 veergu, 3+ rida
- **Kaart:**
  - Helehall taust (#F5F5F5), rounded corners
  - Vasak: kategooria nimi (bold, ~16px)
  - Parem: kategooria pilt (~80x80px, toote pilt)
  - Mõnel kaardil "For you" punane badge ülanurgas (vasakul)
  - Hover: kerge shadow või border
- **Andmed:** Medusa L1 + populaarsed L2 kategooriad
- **Kaartide arv:** 12-16 (3-4 rida × 4 veergu)

### 3. "Best Sellers" sektsioon (VEVOR-il on "Popular Products")

- **Pealkiri:** "Best Sellers" (bold)
- **Tab-id:** kategooriate kaupa (nt "All", "Tools", "Garden", "Kitchen" jne)
- **Tootekaardid:** 5 veergu, VEVOR-stiilis kaardid (vt allpool TOOOTEKAARDI DISAIN)
- **"View All" link** paremal üleval

### 4. "New Arrivals" sektsioon

- **Pealkiri:** "New Arrivals"
- **Sama grid:** 5-veeruline tootekaartidega
- **Andmed:** order=-created_at, limit 10

### 5. "Why Shop With Us" / Trust sektsioon

- **4 ikooni reaga:**
  - 🚚 Fast Delivery (2-5 business days)
  - 🛡️ 2-Year Warranty
  - 🔄 30-Day Free Returns
  - 📞 Customer Support
- **Iga element:** ikoon + pealkiri + lühikirjeldus
- **Taust:** valge või helehall

### 6. "Benefits Down Every Aisle" / Sign-in promo (VEVOR stiil)

- Sektsioon mis kutsub registreeruma
- "Sign in for exclusive deals" + "Save more with exclusive offers"
- Nupp: "Sign In" / "Register"

---

## TOOTEKAARDI DISAIN (kasutatakse kõikjal — avaleht, otsing, kategooria)

See on ÜLIKRIITILINE komponent. VEVOR tootekaart:

```
┌─────────────────────────┐
│ [♡ wishlist]      parem │  ← Wishlist südame ikoon ülanurk
│                         │
│     [TOOTE PILT]        │  ← Valge taust, toode keskel
│     (ruut, ~1:1)        │
│                         │
├─────────────────────────┤
│ VEVOR Welding Screen... │  ← Pealkiri (2-3 rida, ~14px, #222)
│ with Frame, 1.8 x 1.8  │
│                         │
│ ★★★★☆ 4.0 (4 Reviews)  │  ← Tähed (oranž) + arvustuste arv
│                         │
│ $82.11                  │  ← Hind (bold, ~18px, must)
│ $66.75 Deal price       │  ← Soodushind (oranž/punane, läbikriips)
│                         │
│ 🚚 Free Shipping        │  ← Kui rakendub
│ ⬤ In Stock              │  ← Roheline laoseisu indikaator
└─────────────────────────┘
```

### Kaardi detailid:
- **Suurus:** ~270px lai (5-column grid) või ~330px (4-column)
- **Pilt:** Lazy load, aspect-ratio 1:1, object-fit contain, valge taust
- **Pealkiri:** max 2-3 rida, overflow ellipsis
- **Reiting:** Oranžid tähed + hall tekst "(X Reviews)"
- **Hind:** EUR, bold, suur. Kui on soodushind, siis läbikriipsutatud vana hind
- **Hover:** Kerge shadow, pildi zoom (scale 1.05)
- **Klikk:** Navigeerib tootelehele

**NB: Praegune ProductCard.tsx KUSTUTADA ja ASENDADA VEVOR-stiilsega!**

---

## TEHNILINE JUHIS

1. KUSTUTA praegused komponendid:
   - `components/HeroSection.tsx`
   - `components/BranchShowcase.tsx`
   - `components/ThreePathsSection.tsx`
   - `components/PromoBanner.tsx`
2. UUE komponendid:
   - `components/BannerCarousel.tsx` — autorotating banner
   - `components/CategoryGrid.tsx` — "Categories to Explore"
   - `components/ProductGrid.tsx` — reusable 5-col grid
   - `components/VevorProductCard.tsx` — VEVOR-stiilis kaart
   - `components/TrustBadges.tsx` — "Why Shop With Us"
3. Praegune `app/[locale]/page.tsx` — kirjuta TÄIELIKULT ümber

---

## ACCEPTANCE CRITERIA

- [ ] Avaleht näeb välja nagu eur.vevor.com (KÕRVU VAADATA!)
- [ ] Hero/lifestyle sektsioon on KADUNUD
- [ ] Banner carousel autoroteerub ja on navigeeritav
- [ ] "Categories to Explore" grid koos piltidega
- [ ] Best Sellers tooted VEVOR-stiilis kaartidega
- [ ] Tootekaardid näitavad: pilt, pealkiri, reiting, hind, laoseis
- [ ] Trust badges sektsioon
- [ ] Mobile: 2 veergu kaardid, 2 veergu kategooriad
- [ ] Kõik andmed Medusa API-st
