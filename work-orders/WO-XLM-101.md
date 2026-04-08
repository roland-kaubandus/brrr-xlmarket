# WO-XLM-101: Header + Mega-menüü + Footer (VEVOR 1:1)
**Created:** 2026-04-08
**Author:** Cowork (Claudia)
**Assignee:** CC (XL agent, VPS)
**Priority:** P0
**Status:** TODO
**Parent:** WO-XLM-100
**Referents:** https://eur.vevor.com — ava ALATI kõrvale ja võrdle!

---

## EESMÄRK

Asendada praegune XLMarket header, navigatsioon ja footer VEVOR-identse versiooniga.

---

## 1. TOP BAR (must riba, ~40px kõrge)

VEVOR struktuur ülevalt alla:

### Rida 1: Must ülariba
- **Vasak:** Logo "XL Market" (valge, bold) + tagline "Upgrade The Home Creator Way" (väiksem, valge/hall)
- **Keskmine:** Otsinguriba (valge, rounded, search icon paremal, oranž submit nupp)
  - Placeholder tekst roteerub (nt "welding helmet", "lathe", "fan" jne) — VEVOR stiilis animeeritud placeholder
- **Parem:**
  - Keelevalik (EU lipp + "EN" + dropdown nool)
  - "Delivery to **Estonia**" (bold riigi nimi)
  - "Hello, Sign In" / "Account & Order" (dropdown nool)
  - Ostukorvi ikoon (cart icon + badge)

### Rida 2: Oranž navigatsiooniriba (~44px)
- **Vasakul:** ☰ Categories (hamburger + tekst, valge, bold)
- **Siis järjest:** Deals | New | Best Sellers | Clearance | Inspiration | Member Club
- Kõik lingid valge tekst oranžil taustal
- Hover: underline või tume taust

**XLMarket kohandus:**
- Logo: "XL Market" (mitte VEVOR)
- "Deals" → "Deals" (jätame, tulevikus sisu)
- "Member Club" → jätame välja või asendame "About Us"-iga
- "Delivery to Estonia" jääb

---

## 2. MEGA-MENÜÜ (Categories hover/click)

See on KÕIGE KRIITILISEM komponent. 3-tasemeline flyout.

### L1 — Vasak paneel (~240px lai)
- Pealkiri: "Shop by Categories" (bold)
- Nimekiri ikoonidega (SVG/emoji):
  - Lawn & Garden 🌱
  - Tools 🔧
  - Automotive 🚗
  - Outdoor Living & Patio 🏡
  - Plumbing 🔩
  - Appliances 🏠
  - Building Materials 🧱
  - Heating Venting & Cooling ❄️
  - Electrical ⚡
  - Sports & Outdoors ⚽
  - Storage & Organization 📦
  - Kitchen & Kitchenware 🍳
  - Lumber & Composites 🪵
  - Flooring Tile & Rugs 🏗️
  - Furniture 🪑
  - Paint 🎨
  - Hardware 🔨
  - Lighting & Ceiling fans 💡
  - Cleaning 🧹
  - Health And Wellness 💊
  - Home Decor 🖼️
  - Doors & Windows 🚪
  - Bath & Faucets 🚿
  - Safety Equipment 🦺
  - Industrial & Scientific 🏭
  - Playground Sets 🎪
  - Musical Instruments 🎸
  - Workwear 👷
  - Holiday Decorations 🎄
  - Smart Home 📱
  - Blinds & Window Treatments 🪟
- Iga rida: ikoon + tekst + > nool paremal
- Hover: highlight taust, ava L2 paneel

**NB:** Need kategooriad peavad tulema Medusa API-st (category tree). Ikoonid mapping'uga.

### L2 — Keskmine paneel (~240px lai)
- Pealkiri: "Shop All [L1 nimi]" (bold)
- Nimekiri pisipiltidega (thumbnail ~40x40px):
  - Iga alamkategooria saab pildi (esimese toote pilt või kategooria pilt)
  - Tekst + > nool paremal
- Hover: ava L3

### L3 — Parem paneel (~240px lai)
- Pealkiri: "Shop All [L2 nimi]" (bold)
- Nimekiri pisipiltidega
- Promo banner paremal ülanurgas (nt "Spring Black Friday" vms)

### Käitumine:
- Desktop: hover avab (300ms delay)
- Mobile: tap avab, back-nool suleb
- Klikk kategoorial navigeerib kategooria lehele
- ESC suleb menüü
- Klikk väljaspool suleb menüü

---

## 3. FOOTER

VEVOR footer on tume (must/tumehall taust):

### Ülemine osa — "Benefits" riba
- Ikoonidega lubadused (nagu VEVOR footerSlogan):
  - 🚚 Free Shipping (orders over €X)
  - 🔄 30-Day Returns
  - 🛡️ 2-Year Warranty
  - 📞 24/7 Support

### Alumine osa — 4-5 veergu
- **Customer Service:** Contact Us, Shipping, Returns, FAQ
- **About:** About XL Market, Careers, Blog
- **Legal:** Privacy Policy, Terms, Cookies
- **Connect:** Email, Phone, Social media ikoonid
- **Payment:** Visa, MC, SEB, LHV, Swedbank, Luminor logod

### Kõige all
- "© 2026 XL Market. All rights reserved."
- "Roland Kaubandus OÜ"

---

## 4. FLOATING ELEMENDID

VEVOR-il on paremal serval:
- **"SAVE 5€"** tab (vasak serv, vertikaalne, punane/oranž)
- **Live Chat** ikoon (parem ülanurk floating)
- **Contact Us** ikoon (parem, all live chati)
- **Sticky header** (header jääb üles scrollimisel)

XLMarket kohandus:
- "SAVE 5€" → jätame esialgu välja (pole kupongisüsteemi)
- Live Chat → meie MuujaWidget (juba olemas)
- Sticky header → JA, peab olema

---

## TEHNILINE JUHIS

1. Praegune header `storefront/app/[locale]/layout.tsx` tuleb TÄIELIKULT ümber kirjutada
2. Uued komponendid:
   - `components/VevorHeader.tsx` — top bar + nav bar
   - `components/MegaMenu.tsx` — 3-tasemeline flyout
   - `components/VevorFooter.tsx` — tume footer
   - `components/SearchBar.tsx` — animeeritud placeholder otsing
3. Kategooriate andmed: `getCategories()` Medusa API-st, kuni 3 taset
4. Tailwind värvid: lisa `tailwind.config` faili VEVOR värvid

---

## ACCEPTANCE CRITERIA

- [ ] Header on visuaalselt identne eur.vevor.com headeriga
- [ ] Mega-menüü avaneb hover'iga, näitab 3 taset kategooriaid
- [ ] L1 kategooriad on ikoonidega
- [ ] L2 ja L3 kategooriad on pisipiltidega
- [ ] Otsinguriba on animeeritud placeholder'iga
- [ ] Footer on tume, VEVOR-sarnane
- [ ] Sticky header scrollimisel
- [ ] Mobile: hamburger menüü 3 tasemega
- [ ] Kõik andmed tulevad Medusa API-st
