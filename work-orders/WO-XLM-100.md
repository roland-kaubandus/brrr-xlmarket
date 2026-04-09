# WO-XLM-100: VEVOR 1:1 Kloon — Master Work Order
**Created:** 2026-04-08
**Author:** Cowork (Claudia)
**Assignee:** CC (XL agent, VPS)
**Department:** xlmarket
**Priority:** P0 — KÕIGE TÄHTSAM
**Status:** TODO

---

## EESMÄRK

Muuta xlmarket.eu storefront **100% identses** eur.vevor.com lehega — layout, UX, visuaal, funktsionaalsus.
Ainult ingliskeelne versioon. Eestikeelne tuleb hiljem eraldi WO-ga.

**NB: See on Risto #1 prioriteet. MITTE MIDAGI ei tohi teha "lihtsustatud" versiooni. Kui VEVOR-il liigub, siis liigub ka meil. Kui kategoorial on pilt, siis on ka meil. 100% 1:1.**

---

## ENNE ALUSTAMIST — KOHUSTUSLIKUD SKILLID

CC PEAB installima järgmised skillid enne tööle hakkamist:
1. **nano banana**
2. **frontend design skill**
3. **taste skill**

Kui neid ei leia, küsi Ristolt.

---

## ÜLDINE ARHITEKTUUR

- **Stack:** Next.js 15 + Tailwind CSS (olemasolev storefront)
- **Backend:** Medusa.js 2.0 (olemasolev, port 9001)
- **Keel:** Ainult EN (locale `en`). ET jääb hilisemaks.
- **Andmed:** ~14 356 toodet Medusa API-st, VEVOR CDN pildid
- **Referents:** https://eur.vevor.com (ALATI ava ja võrdle!)

---

## SUB-WO NIMEKIRI

| # | WO | Leht/Komponent | Prioriteet |
|---|-----|----------------|-----------|
| 1 | WO-XLM-101 | Header + Mega-menüü + Footer | P0 |
| 2 | WO-XLM-102 | Avaleht (Homepage) | P0 |
| 3 | WO-XLM-103 | Otsingutulemuste leht | P0 |
| 4 | WO-XLM-104 | Tooteleht (Product Detail Page) | P0 |
| 5 | WO-XLM-105 | Kategooria leht | P0 |
| 6 | WO-XLM-106 | Ostukorv + Checkout flow | P1 |

**JÄRJEKORD:** 101 → 102 → 103 → 104 → 105 → 106

---

## VÄRVISKEEM (VEVOR-ist)

```
Primaarne (oranž):    #FF6A00 (VEVOR brand orange)
Must header:          #1A1A1A
Taust (helehall):     #E8ECF0 (body bg)
Valge:                #FFFFFF (kaardid, content)
Tekst must:           #1A1A1A / #222222
Hall tekst:           #666666
Punane (deals):       #E53E3E / #FF4444
Roheline (In Stock):  #16A34A
Border hall:          #E5E5E5
```

## FONDID

VEVOR kasutab system fonts + oma custom fonte. Meie kasutame:
- Headings: **Inter** või **system-ui** (sans-serif, bold)
- Body: **Inter** või **system-ui**
- Hind: Tabular nums, bold

---

## ACCEPTANCE CRITERIA (KOGU WO-100 JAOKS)

- [ ] Avaleht on visuaalselt identne eur.vevor.com-iga
- [ ] Kategooriate mega-menüü töötab 3 taseme sügavuti (L1 ikoonidega, L2 piltidega, L3 piltidega)
- [ ] Otsingutulemuste leht on identne — filtrid, sortimine, kaardid, kategooria carousel
- [ ] Tooteleht on 100% identne — galerii, variandid, kirjeldus, specs, pildirohke kirjeldus
- [ ] Kõik tootekaardid näitavad pilti, pealkirja, hinda, reitingut
- [ ] Kõik andmed tulevad Medusa API-st (mitte mock data!)
- [ ] Mobile responsive (VEVOR on mobile-first)
