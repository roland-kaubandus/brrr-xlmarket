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

## xlmarket-preview.yaml (hardened 2026-06-12)
`xl_preview=<secret>` küpsis → PROD storefront (gate-bypass, prio 260 > gate 200). Backend = **stabiilne
prod-unikaalne alias `xlmarket-storefront`** (STOREFRONT_ALIAS env; staging=*-unset → prod-only). Oli bare
`storefront` → round-robin staging↔prod; nüüd deterministlik prod. Origin /et küpsisega → pärispood ✓.
NB: AVALIK /et küpsisega võib näidata Cloudflare-cache'itud coming-soon (cf-cache-status HIT) — routing on
korras, aga CF cache'ib lehte. Päris-leht-preview vajab CF cache-bypass reeglit xl_preview-küpsisele
(Tarmo CF dashboard) VÕI CF purge. API (cart) töötab avalikult (POST ei cache'ita).

## xlmarket-api-lockdown.yaml
api.xlmarket.ee public /store+/hooks → 403 (ipAllowList middleware 192.0.2.1/32 blokeerib ENNE backend'i →
bare medusa:9000 kasutu, robustne). Admin-pathid (/health,/app,/auth) jäävad — Coolify-docker-router.
