# Aktiivne WO: WO-XLM-007

## Montonio makselahendus

### Mis on tehtud
- WO-XLM-001 kuni WO-XLM-006: kõik DONE
- Checkout leht: /tellimus — kliendi andmed, aadress, tarneviis, kokkuvõte, kinnitus
- Cart → Order flow töötab (address → shipping → complete)

### Mis on järgmine
WO-XLM-007: Montonio makselahendus
- Montonio SDK integratsioon Medusa backendisse
- Pangalingid: Swedbank, SEB, LHV, Luminor, Coop
- Kaardimaksed
- Payment flow: checkout → Montonio → callback → order complete
- Montonio webhook handler

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
