# Aktiivne WO: WO-XLM-006

## Ostukorv ja checkout

### Mis on tehtud
- WO-XLM-001: Infra ready (DONE)
- WO-XLM-002: Store config (DONE)
- WO-XLM-003: Feed import (14 280 toodet, 10 719 laos)
- WO-XLM-004: Kategooriate mapping (DONE)
- WO-XLM-005: Storefront lehed (DONE — avaleht, kategooriad, tooted, otsing, filtrid)

### Ostukorv seis
- Ostukorv leht: /ostukorv — DONE (items, qty controls, remove, summary)
- Lisa korvi nupp: /toode/[handle] — DONE (koguse valik, localStorage cart_id)
- Cart API routes: /api/cart/* — DONE (create, get, add/update/remove items, checkout, shipping, complete)
- Checkout nupp on DISABLED — "Tellimuse vormistamine tuleb peagi"

### Mis on järgmine
WO-XLM-006: Checkout leht
- Checkout form: nimi, email, aadress, telefon
- Tarneviisi valik (Medusa shipping options)
- Makseviisi valik → WO-XLM-007 (Montonio integratsioon)
- Tellimuse kinnitamise leht

### Kriitilised andmed
- **Medusa backend:** http://127.0.0.1:9001
- **Publishable API key:** pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3
- **Region ID:** reg_01KMRXWSNXSYE4530A3K2BK86W
- **Sales channel:** sc_01KMRWP84555JPGA6M0QMG409M
- **Admin login:** tarmo@xlmarket.eu / [PAROOL .env FAILIS]
- **Storefront port:** 3030
- **nginx port:** 8090

### Cart API routes
```
POST   /api/cart           — uus cart
GET    /api/cart?cart_id=X  — fetch cart
POST   /api/cart/items     — lisa toode (cart_id, variant_id, quantity)
PATCH  /api/cart/items     — muuda kogust
DELETE /api/cart/items     — eemalda toode
POST   /api/cart/checkout  — set address + email
GET    /api/cart/shipping  — shipping options
POST   /api/cart/shipping  — select shipping
POST   /api/cart/complete  — finalize order
```

### Disaini juhised
- Font-based logo "XLMARKET" (Inter/Space Grotesk)
- Minimalistlik, ilma ikoonideta
- Värvid: tume navy/must + valge + amber/oranž CTA
- Mobile responsive
- Eestikeelne UI
