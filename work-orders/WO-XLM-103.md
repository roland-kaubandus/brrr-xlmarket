# WO-XLM-103: Otsingutulemuste leht (VEVOR 1:1)
**Created:** 2026-04-08
**Author:** Cowork (Claudia)
**Assignee:** CC (XL agent, VPS)
**Priority:** P0
**Status:** TODO
**Parent:** WO-XLM-100
**Sõltub:** WO-XLM-101 (header), WO-XLM-102 (VevorProductCard)
**Referents:** https://eur.vevor.com/s/welding-helmet — otsi midagi ja vaata!

---

## EESMÄRK

Asendada praegune otsingu leht (`app/[locale]/otsing/`) VEVOR-identse otsingutulemuste lehega.

---

## LEHE STRUKTUUR (ülevalt alla)

### 1. BREADCRUMB rida
- "Home > [Detected Category] > [Subcategory]"
- Hall tekst, väike font (~13px)
- Viimane element ei ole link (current page)

### 2. PEALKIRI
- **"Search for "[query]""** — suur, bold, ~28px
- Jutumärkides query

### 3. KATEGOORIATE CAROUSEL (horisontaalne)
- Rida kategooriate piltidega (circulaarne või rounded square)
- Iga element: kategooria pilt (~80x80) + nimi all (~13px)
- Horisontaalselt keritav (> nool paremal)
- Need on otsinguterminiga seotud kategooriad
- ~10-12 elementi rivis

### 4. TULEMUSTE RIBA
- Vasakul: **"100+ Results"** (või täpne arv) — bold
- Paremal: **"Sort by: Popular ▼"** dropdown
  - Valikud: Popular, Price Low to High, Price High to Low, Newest, Best Rating

### 5. FILTRID (pill/chip stiil, horisontaalne rida)
- **Categories ▼** — dropdown multiselect
- **Price Discounts ▼** — dropdown (10%+, 20%+, 30%+ jne)
- **Stars ▼** — dropdown (4+, 3+, 2+, 1+)
- **Price ▼** — dropdown/slider (min-max EUR)
- **In Stock** — toggle pill (ikooniga 📦)
- **Pickup** — toggle pill (ikooniga 🏠)

Iga filter on pill-kujuline nupp hallil taustal. Aktiivsel filtril oranž ääris/taust.

### 6. TOOTEGRID
- **5 veergu** (desktop), 2 veergu (mobile)
- **VevorProductCard** (WO-102-st)
- **Infinite scroll** VÕI pagination all
  - VEVOR kasutab lazyload/infinite scroll
  - Meie: paginated (24 toodet per leht) + "Load More" nupp
- Kaartide vahel: ~16px gap

### 7. PAGINATION (lehe all)
- "1 2 3 4 5 ... 50 >" stiil
- Aktiivne leht: oranž taust
- Hover: hall taust

---

## OTSINGU TEHNILINE POOL

### Instant Search (dropdown otsinguribal)
VEVOR-il avaneb otsinguribal kirjutades dropdown:
- **Soovitused:** "welding helmet", "welding machine" jne
- **Tooted:** 3-4 toodet piltidega
- **Kategooriad:** 2-3 seotud kategooriat

Praegu on `components/search/InstantSearch.tsx` olemas — seda tuleb VEVOR stiilile kohandada.

### Otsingu backend
- Praegune: MeiliSearch
- Jääb samaks, aga tulemuste kuvamine muutub VEVOR-stiilseks

---

## TEHNILINE JUHIS

1. Praegune `app/[locale]/otsing/page.tsx` — ÜMBER KIRJUTADA
2. Uued komponendid:
   - `components/search/SearchResults.tsx` — tulemuste leht
   - `components/search/SearchFilters.tsx` — pill filtrid
   - `components/search/CategoryCarousel.tsx` — horisontaalne kategooriate rida
   - `components/search/SortDropdown.tsx` — sortimise valik
3. URL formaat: `/en/search?q=welding+helmet` (VEVOR: `/s/welding-helmet`)
4. Reusable: VevorProductCard (WO-102-st)

---

## ACCEPTANCE CRITERIA

- [ ] Otsing näitab tulemusi VEVOR stiilis
- [ ] Breadcrumb rida olemas
- [ ] Kategooriate horisontaalne carousel olemas piltidega
- [ ] Filtrid (Categories, Price, Stars, In Stock) töötavad
- [ ] Sort dropdown töötab (Popular, Price asc/desc, Newest, Rating)
- [ ] Tulemuste arv kuvatakse
- [ ] 5-veeruline grid desktop, 2-veeruline mobile
- [ ] Pagination töötab
- [ ] Instant search dropdown otsinguribal
- [ ] Andmed MeiliSearch API-st
