# ops/proxy — Traefik file-provider dünaamilised configid (git-tracked)

**Live asukoht:** `/data/coolify/proxy/dynamic/*.yaml` (Coolify-proxy loeb, watch=true, hot-reload).
**Source of truth:** see kaust (`ops/proxy/dynamic/`). NB: live-configid EI ole Coolify-hallatavad →
server-rebuild'il/proxy-recreate'il kaovad → taasta `setup-dynamic.sh`-ga.

## Taaste (pärast proxy-recreate'i / server-rebuild'i)
```bash
bash ops/proxy/setup-dynamic.sh
```
Ühendab proxy `uo28_default`-võrku (stabiilsed prod-aliased) + kopeerib configid live-kausta.

## medusa-admin.yaml
`admin.xlmarket.ee` → PROD medusa admin. Backend = **stabiilne prod-unikaalne alias `xlmarket-medusa`**
(MEDUSA_ALIAS env; staging=`xlmarket-medusa-unset` → prod-only). EI vanane prod-redeploy'l (vana versioon
kasutas exact-konteinerinime → 502 iga redeploy järel). Nõuab: proxy `uo28_default`-võrgul.

## Veel live-kaustas (git'i veel toomata — TODO)
- `xlmarket-api-lockdown.yaml` — api.xlmarket.ee public /store+/hooks → 403 (ipAllowList middleware,
  blokeerib enne backend'i → robustne, bare medusa:9000 kasutu).
- `xlmarket-preview.yaml` — xl_preview-cookie gate-bypass → storefront. TODO: harden bare `storefront`
  alias → `xlmarket-storefront` (sama muster mis admin).
