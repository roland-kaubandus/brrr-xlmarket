# Aktiivne WO: Kõik peamised WO-d DONE

## Valmis (Huly: Done)
- WO-XLM-001: Infrastruktuur
- WO-XLM-002: Store konfiguratsioon
- WO-XLM-003: XLSX Feed Import
- WO-XLM-004: Kategooriate mapping
- WO-XLM-005: Storefront lehed
- WO-XLM-006: Ostukorv ja checkout
- WO-XLM-008: Email teavitused (Nodemailer + subscribers)
- WO-XLM-009: Brändi disain (Inter font, brand värvid, logo)
- WO-XLM-010: Eesti lokaliseerimine (UI 100% ET)
- WO-XLM-011: Domeen, SSL, nginx (config valmis, DNS ootel)
- WO-XLM-012: SEO ja jõudlus (sitemap, JSON-LD, meta tags)
- WO-XLM-013: osta.ee XML feed
- WO-XLM-014: Facebook feed + Meta Pixel
- WO-XLM-015: CMS sisublokid (JSON CMS + admin API)
- WO-XLM-016: Turundusplaan (dokument)
- XLM-17..XLM-23, XLM-25: Bugid parandatud/verifitseeritud

## Blokeeritud
- WO-XLM-007: Montonio makselahendus — BLOKEERITUD (API keys puuduvad)
- XLM-24: CDN blocked images — Done (hotlink protection puudub, OK)

## Taustal jooksev protsess
- Tootetõlge: backend/src/scripts/translate-products.mjs (~14K toodet EN→ET)
- Logi: data/translate-log.txt

## Risto/Tarmo tegevused (blokeerivad)
1. DNS A record: xlmarket.eu → 65.109.86.254 (praegu vale IP)
2. Montonio API keys → .env faili
3. SMTP parool → .env (emailide saatmiseks)
4. Meta Pixel ID → .env.local
5. sudo bash scripts/setup-ssl.sh (pärast DNS)
6. sudo bash scripts/install-services.sh (systemd)

## Kriitilised andmed
- **Server IP:** 65.109.86.254
- **Medusa backend:** http://127.0.0.1:9001
- **Publishable API key:** pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3
- **Region ID:** reg_01KMRXWSNXSYE4530A3K2BK86W
- **Sales channel:** sc_01KMRWP84555JPGA6M0QMG409M
- **Shipping option:** so_01KMS054YHHMRH51TQR384Y37A (Tavaline tarne, 4.99€)
- **Admin:** tarmo@xlmarket.eu / admin@xlmarket.eu (XlmAdmin2026)
