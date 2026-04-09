# WO-XLM-106: Ostukorv + Checkout Flow (VEVOR 1:1)
**Created:** 2026-04-08
**Author:** Cowork (Claudia)
**Assignee:** CC (XL agent, VPS)
**Priority:** P1
**Status:** TODO
**Parent:** WO-XLM-100
**Sõltub:** WO-XLM-101, WO-XLM-104 (Add to Cart)

---

## EESMÄRK

VEVOR-stiilis ostukorv ja checkout flow. See on P1 kuna Montonio pole veel integreeritud.

---

## STRUKTUUR

### 1. MINI-CART (parem sidebar, VEVOR stiil)
- Avaneb "Add to Cart" klikiga
- Slide-over paremalt
- Tooted: pilt + nimi + kogus + hind
- "Subtotal: €XX.XX"
- "Go to Cart" nupp
- "Continue Shopping" link

### 2. CART PAGE (/en/cart)
- Tabel: Pilt | Toode | Hind | Kogus [-][+] | Kokku | 🗑️ Kustuta
- Kokku: Subtotal + Shipping estimate + Total
- "Proceed to Checkout" nupp (oranž, suur)
- "Continue Shopping" link

### 3. CHECKOUT (placeholder)
- Shipping info vorm
- Makseviis (Montonio placeholder)
- Order summary

---

## ACCEPTANCE CRITERIA

- [ ] Add to Cart lisab toote korvi
- [ ] Mini-cart slide-over töötab
- [ ] Cart page näitab tooteid
- [ ] Koguse muutmine töötab
- [ ] Kustutamine töötab
- [ ] Checkout placeholder olemas
