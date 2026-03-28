#!/bin/bash
# Installib xlmarket systemd teenused
# Käivita: sudo bash scripts/install-services.sh

set -e

echo "=== XLMARKET systemd teenuste installimine ==="

# Kopeeri unit failid
cp /home/brrr/brrr-xlmarket/systemd/xlmarket-medusa.service /etc/systemd/system/
cp /home/brrr/brrr-xlmarket/systemd/xlmarket-storefront.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable auto-start
systemctl enable xlmarket-medusa.service
systemctl enable xlmarket-storefront.service

echo ""
echo "Teenused installitud. Kasutamine:"
echo "  sudo systemctl start xlmarket-medusa"
echo "  sudo systemctl start xlmarket-storefront"
echo "  sudo systemctl status xlmarket-medusa"
echo "  sudo journalctl -u xlmarket-medusa -f"
echo ""
echo "NB: Enne käivitamist peata nohup protsessid:"
echo "  pkill -f 'medusa.*start.*9001'"
echo "  pkill -f 'next start.*3030'"
