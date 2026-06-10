# xlmarket.ee coming-soon gate (maintenance-konteiner)

**Eesmärk:** xlmarket.ee (avalik) PEAB olema coming-soon-värava taga kuni launch.
dev.xlmarket.ee = Tarmo eelvaade (pärispood). staging.xlmarket.ee = k33g staging-pood.

## Mehhanism
`xlmarket-maintenance` (nginx:alpine) Traefik `Host(xlmarket.ee) || Host(www.xlmarket.ee)`
**priority=200** → võidab uo28 storefront'i route'i (priority pole) → serveerib coming-soon.
Võrk: `coolify` (stabiilne, coolify-proxy ulatub; ei kao uo28-redeploy'l).

## Käivitamine (taaste)
docker run -d --name xlmarket-maintenance --restart unless-stopped --network coolify \
  -v /opt/xlmarket-github/ops/maintenance/index.html:/usr/share/nginx/html/index.html:ro \
  -v /opt/xlmarket-github/ops/maintenance/default.conf:/etc/nginx/conf.d/default.conf:ro \
  --label traefik.enable=true \
  --label 'traefik.http.routers.xlmaint-https.entryPoints=https' \
  --label 'traefik.http.routers.xlmaint-https.rule=Host(`xlmarket.ee`) || Host(`www.xlmarket.ee`)' \
  --label traefik.http.routers.xlmaint-https.priority=200 \
  --label traefik.http.routers.xlmaint-https.tls=true \
  --label traefik.http.routers.xlmaint-https.tls.certresolver=letsencrypt \
  --label traefik.http.routers.xlmaint-https.service=xlmaint \
  --label traefik.http.services.xlmaint.loadbalancer.server.port=80 \
  --label 'traefik.http.routers.xlmaint-http.entryPoints=http' \
  --label 'traefik.http.routers.xlmaint-http.rule=Host(`xlmarket.ee`) || Host(`www.xlmarket.ee`)' \
  --label traefik.http.routers.xlmaint-http.priority=200 \
  --label traefik.http.middlewares.xlmaint-redirect.redirectscheme.scheme=https \
  --label traefik.http.routers.xlmaint-http.middlewares=xlmaint-redirect \
  nginx:alpine

## LAUNCH'IL (gate maha)
docker stop xlmarket-maintenance && docker rm xlmarket-maintenance
# → uo28 storefront hakkab xlmarket.ee't serveerima (pärispood läheb avalikuks).
#
# ⚠️ KOHUSTUSLIK PÄRAST: PURGE CLOUDFLARE CACHE (Tarmo CF-konto → Caching → Purge Everything).
#    CF cache'ib coming-soon-lehte (~1.5h age) → ilma purge'ita näevad kliendid VEEL cache'itud
#    coming-soon't kuni cache aegub. (2026-06-10 leid: cf-cache-status HIT /et lehel.)
#
# WEBHOOK-NOOT: xlmarket.ee/hooks → storefront (docker-provider router xlhooks, prio 250 > gate 200,
#   storefront compose-label) → /hooks-proxy → medusa. Töötab gate-olekus + peale launchi. ÄRA eemalda
#   seda routerit. (NB: file-provider dünaamiline router EI tööta Next.js route'iga — kasuta docker-labelit.)

## Ajalugu
- Originaalne gate (loodud 2026-05-10) STOPPITI 2026-06-05 (eelmine sessioon pidas seda
  route-kaaperdamise-bugiks: docker stop + --restart=no) → pärispood paljastus avalikult.
- Taastatud 2026-06-09.
