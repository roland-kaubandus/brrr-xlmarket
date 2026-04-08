# WO-XLM-105: Kategooria leht (VEVOR 1:1)
**Created:** 2026-04-08
**Author:** Cowork (Claudia)
**Assignee:** CC (XL agent, VPS)
**Priority:** P0
**Status:** TODO
**Parent:** WO-XLM-100
**Sõltub:** WO-XLM-101, WO-XLM-102 (ProductCard), WO-XLM-103 (filtrid, sort)
**Referents:** https://eur.vevor.com — kliki mis tahes kategooriat mega-menüüst

---

## EESMÄRK

Luua VEVOR-identne kategooria leht, mis näitab alamkategooriaid ja tooteid.

---

## LEHE STRUKTUUR

### 1. BREADCRUMB
- "Home > [L1 Category]" või "Home > [L1] > [L2]"

### 2. KATEGOORIA PEALKIRI
- Suur, bold, ~28px: "Lawn & Garden" (või mis iganes kategooria)

### 3. ALAMKATEGOORIATE GRID (kui on alamkategooriaid)
- **Grid:** 4 veergu (desktop), 2 veergu (mobile)
- **Kaart:** Pilt + kategooria nimi
  - Pilt: esimese toote thumbnail VÕI kategooria pilt
  - Nimi: bold, ~14px
  - Hover: shadow
- Kui L2 kategooria → näita L3 alamkategooriaid
- Kui L3 (leht-kategooria) → näita ainult tooteid

### 4. FILTRID + SORT (sama mis WO-103)
- Pill-stiilis filtrid: Categories, Price, Stars, In Stock
- Sort dropdown: Popular, Price, Newest, Rating

### 5. TOOTEGRID
- 5 veergu desktop, 2 mobile
- VevorProductCard
- Pagination

---

## TEHNILINE JUHIS

1. Praegune `app/[locale]/kategooriad/` — ÜMBER KIRJUTADA
2. Praegune `app/[locale]/haru/` — SULANDADA kategooriadega
3. Route: `/en/category/[handle]` (uus) VÕI jätta `/en/kategooriad/[handle]`
4. Reusable: SearchFilters, SortDropdown, VevorProductCard, CategoryCarousel
5. Andmed: Medusa `getProductsByCategory()` + `getSubcategories()`

---

## ACCEPTANCE CRITERIA

- [ ] Kategooria leht näitab alamkategooriaid piltidega
- [ ] Tootegrid VEVOR stiilis
- [ ] Filtrid ja sortimine töötavad
- [ ] Breadcrumb korrektne
- [ ] Pagination töötab
- [ ] Mobile responsive
