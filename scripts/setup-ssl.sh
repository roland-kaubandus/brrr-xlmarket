#!/bin/bash
# xlmarket.eu SSL setup script
# Käivita: sudo bash scripts/setup-ssl.sh
#
# Eeldused:
# 1. DNS A record: xlmarket.eu → 65.109.86.254
# 2. DNS A record: www.xlmarket.eu → 65.109.86.254
# 3. nginx jookseb ja kuulab porti 80

set -e

DOMAIN="xlmarket.eu"
EMAIL="tarmo@xlmarket.eu"
NGINX_CONF="/home/brrr/brrr-xlmarket/nginx/xlmarket.conf"

echo "=== XLMARKET SSL Setup ==="
echo ""

# 1. Kontrolli DNS
echo "[1/4] Kontrollimas DNS..."
RESOLVED_IP=$(dig +short $DOMAIN A 2>/dev/null | head -1)
SERVER_IP=$(hostname -I | awk '{print $1}')

if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    echo "  VIGA: $DOMAIN viitab $RESOLVED_IP, aga server on $SERVER_IP"
    echo "  Palun uuenda DNS A record enne jätkamist."
    exit 1
fi
echo "  OK: $DOMAIN → $RESOLVED_IP"

# 2. HTTP-only config (certbot vajab porti 80)
echo "[2/4] Seadistamas HTTP config..."
cp /home/brrr/brrr-xlmarket/nginx/xlmarket-http-only.conf /etc/nginx/sites-enabled/xlmarket.eu
nginx -t && systemctl reload nginx
echo "  OK"

# 3. Certbot
echo "[3/4] Hankimas SSL sertifikaati..."
certbot certonly --webroot -w /var/www/html \
    -d $DOMAIN -d www.$DOMAIN \
    --email $EMAIL --agree-tos --non-interactive
echo "  OK"

# 4. Production config
echo "[4/4] Aktiveerimas SSL config..."
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/xlmarket.eu
nginx -t && systemctl reload nginx
echo "  OK"

echo ""
echo "=== SSL seadistus lõpetatud ==="
echo "Site: https://$DOMAIN"
echo "Admin: https://$DOMAIN/app"
echo ""
echo "Certbot auto-renewal on juba seadistatud (systemd timer)."
