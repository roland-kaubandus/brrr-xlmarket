#!/bin/bash
# ops/proxy/setup-dynamic.sh — Traefik file-provider dünaamiliste configide + proxy-võrgu taaste.
#
# MIKS: Coolify-proxy (Traefik) loeb dünaamilisi confige kaustast /data/coolify/proxy/dynamic/
# (watch=true). Need EI ole Coolify-hallatavad → server-rebuild'il / proxy-recreate'il kaovad.
# See skript taastab need git'ist + ühendab proxy õigetesse võrkudesse. Käivita pärast proxy-recreate'i.
#
# KUS LIVE-CONFIGID ELAVAD: /data/coolify/proxy/dynamic/*.yaml
#   - medusa-admin.yaml   → admin.xlmarket.ee → PROD medusa (stabiilne alias xlmarket-medusa)
#   - xlmarket-api-lockdown.yaml → api.xlmarket.ee public /store+/hooks → 403 (middleware)
#   - xlmarket-preview.yaml → xl_preview-cookie gate-bypass (TODO: harden bare 'storefront' alias)
set -e
DYN=/data/coolify/proxy/dynamic
HERE="$(cd "$(dirname "$0")" && pwd)"

# 1) Proxy peab ulatuma PROD-unikaalsetele stabiilsetele aliasedele (uo28_default-võrgul):
#    xlmarket-medusa (admin), xlmarket-storefront (tulevikus preview). Staging = *-unset → prod-only.
docker network connect uo28ovobnflauslqjgxeohl0_default coolify-proxy 2>/dev/null \
  && echo "proxy ühendatud uo28_default" || echo "proxy juba uo28_default-võrgul"

# 2) Kopeeri git-tracked configid live-kausta (Traefik watch=true → hot-reload):
cp "$HERE/dynamic/medusa-admin.yaml" "$DYN/medusa-admin.yaml"
echo "medusa-admin.yaml taastatud → $DYN"
echo "VALMIS. Kontrolli: curl -o /dev/null -w '%{http_code}' https://admin.xlmarket.ee/health (peab 200)"
