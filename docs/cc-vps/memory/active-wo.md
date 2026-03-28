# Aktiivne WO: Kõik põhitöö tehtud — ootab Montonio API võtmeid

## Valmis
- WO-XLM-001 kuni WO-XLM-006: kõik DONE
- Õiguslikud lehed: privaatsus, tingimused, tagastamine, tarne, kontakt, meist, küpsised
- GDPR: küpsiste nõusoleku bänner (CookieConsent)
- Footer: 4 veergu (firma, pood, info, õiguslik) + copyright
- Facebook Commerce XML feed: 10,714 toodet (cron iga 4h)
- Meta Pixel: integratsioon valmis (vajab PIXEL_ID-d .env-s)
- JSON-LD: Organization, Product, BreadcrumbList
- Interaktiivne pildigalerii (klikitavad thumbnailid)
- HTML sanitizer XSS kaitseks
- SVG favicon
- osta.ee feed, sitemap, robots.txt, SEO meta tags
- Bug fixes: XLM-19 parandatud, XLM-17/20/21/23 verifitseeritud

## Blokeeritud
WO-XLM-007: Montonio makselahendus — **BLOKEERITUD**
- MONTONIO_ACCESS_KEY ja MONTONIO_SECRET_KEY on tühjad .env-s
- Risto/Tarmo peab andma API võtmed
- Kui võtmed olemas:
  - Montonio SDK integratsioon Medusa backendisse
  - Pangalingid: Swedbank, SEB, LHV, Luminor, Coop
  - Kaardimaksed
  - Payment flow: checkout → Montonio → callback → order complete
  - Montonio webhook handler

## Vajab seadistamist (ei blokeeri)
- NEXT_PUBLIC_META_PIXEL_ID — Meta Pixel ID .env.local-is
- nginx rate limiting — vajab sudo installimist
- XLM-18, XLM-22, XLM-24, XLM-25 — bugid vajavad täpsustamist

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
