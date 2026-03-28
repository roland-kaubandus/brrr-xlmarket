# Aktiivne WO: WO-XLM-007 (BLOKEERITUD)

## Montonio makselahendus — OOTAB API VÕTMEID

### Mis on tehtud
- WO-XLM-001 kuni WO-XLM-006: kõik DONE
- Checkout leht: /tellimus — kliendi andmed, aadress, tarneviis, kokkuvõte, kinnitus
- Cart → Order flow töötab (address → shipping → complete)
- osta.ee XML feed: 10,719 toodet, /feeds/osta-ee.xml (cron iga 4h)
- sitemap.xml: 10,733 URLi (cron iga 4h)
- SEO meta tags kõigile lehtedele (OG + Twitter Card)
- nginx rate limiting konfigureeritud (vajab sudo install)
- error.tsx + robots.txt
- Bug fix XLM-19: toote laoseisu kuvamine parandatud (unreachable kood eemaldatud)
- Bug audit: XLM-17, XLM-20, XLM-21, XLM-23 verifitseeritud kui juba parandatud

### Mis on järgmine
WO-XLM-007: Montonio makselahendus — **BLOKEERITUD**
- MONTONIO_ACCESS_KEY ja MONTONIO_SECRET_KEY on tühjad .env-s
- Risto/Tarmo peab andma API võtmed
- Kui võtmed olemas:
  - Montonio SDK integratsioon Medusa backendisse
  - Pangalingid: Swedbank, SEB, LHV, Luminor, Coop
  - Kaardimaksed
  - Payment flow: checkout → Montonio → callback → order complete
  - Montonio webhook handler

### Installimisel vajalik (sudo)
```bash
# Rate limiting nginx zones
sudo cp nginx/rate-limit.conf /etc/nginx/conf.d/xlmarket-rate-limit.conf
sudo nginx -t && sudo systemctl reload nginx
```

### Kriitilised andmed
- **Medusa backend:** http://127.0.0.1:9001
- **Publishable API key:** pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3
- **Region ID:** reg_01KMRXWSNXSYE4530A3K2BK86W
- **Sales channel:** sc_01KMRWP84555JPGA6M0QMG409M
- **Shipping option:** so_01KMS054YHHMRH51TQR384Y37A (Tavaline tarne, 4.99€)
- **Admin login:** tarmo@xlmarket.eu / [PAROOL .env FAILIS]
- **Storefront port:** 3030
- **nginx port:** 8090
