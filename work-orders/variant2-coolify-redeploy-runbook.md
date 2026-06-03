# Variant 2 — Medusa Coolify redeploy runbook

> Koostatud 2026-06-03. Eeltöö TEHTUD, deploy ootab sinu valitud aega.
> Admin-otsus: **mõlemad** api.xlmarket.ee/app + admin.xlmarket.ee.
> Downtime: ~6–7 min (kogu stack rebuild + Medusa boot ~373s).

## Eeltöö (juba tehtud ✅)
- `78d1bf31` — medusa healthcheck `start_period: 300s → 600s` (push origin/main). **See on põhjus, miks varasemad redeployd kukkusid.**
- `19c69647` — audit-fixid (.ee, MEILI env, order-shipped email)
- Backup: `/tmp/xlmarket-pre-redeploy-20260603.dump` (93M, pg custom format)
- Meili baseline: **17 105 dokumenti**
- Runtime-patchid praegu LIVE (admin töötab): `medusa` alias + `medusa-admin.yaml → medusa-xlmarket-fixed:9000`

---

## DEPLOY (sina, Coolify UI)
1. Coolify UI → projekt **`brrr-xlmarket:main`** → **Redeploy**
   - Ehitab `origin/main` = `78d1bf31` (sisaldab healthcheck fixi)
2. Oota ~6–7 min. Jälgi et Medusa logi jõuab `Server is ready on port: 9000` ja konteiner muutub `healthy`
   - Healthcheck grace on nüüd 600s → ei tohiks enam "medusa unhealthy" anda

> Anna mulle märku kui Redeploy käivitatud — teen SAMM 3+4 verify & cleanup.

---

## SAMM 3 — Post-deploy verify (mina)
```bash
PROJ=uo28ovobnflauslqjgxeohl0
# uued konteineri-nimed (timestamp muutub):
docker ps --format '{{.Names}}\t{{.Status}}' | grep $PROJ
# medusa alias olemas (Coolify lisab automaatselt)?
docker inspect $(docker ps -qf "name=medusa-$PROJ") -f '{{range .NetworkSettings.Networks}}{{.Aliases}}{{end}}'
# kättesaadavus:
curl -sk -o /dev/null -w "xlmarket.ee %{http_code}\n" https://xlmarket.ee
curl -sk -o /dev/null -w "api.xlmarket.ee/app %{http_code}\n" https://api.xlmarket.ee/app
# storefront -> medusa
docker exec $(docker ps -qf "name=storefront-$PROJ") wget -qO- -T5 http://medusa:9000/health
# meili count (peab olema 17105)
```

## SAMM 3b — admin.xlmarket.ee (MÕLEMAD otsus)
- **api.xlmarket.ee/app** = Coolify-native label (SERVICE_FQDN_MEDUSA), tuleb automaatselt ✅
- **admin.xlmarket.ee** = uuenda käsitsi Traefik yaml osutama stabiilse aliase peale (vastupidav tulevastele redeployidele):
  ```
  /data/coolify/proxy/dynamic/medusa-admin.yaml:
    url: "http://medusa-xlmarket-fixed:9000"  →  "http://medusa:9000"
  ```
  (coolify-proxy on `uo28...` võrgus → lahendab service-aliase `medusa`)
  - *Alternatiiv (native):* lisa admin.xlmarket.ee Coolify UI-s medusa teenuse domeeniks → saab oma LE cert + label. Siis võib yaml üldse eemaldada.

## SAMM 4 — Cleanup (mina, alles pärast verify OK)
```bash
docker rm -f medusa-xlmarket-fixed     # orvuks jäänud käsitsi konteiner
# medusa-admin.yaml: jäta alles (osutab nüüd 'medusa' aliasele) VÕI eemalda kui native domeen lisatud
```

---

## Rollback (kui deploy kukub)
- Praegune `medusa-xlmarket-fixed` + runtime-patchid jäävad alles kuni uus verifitseeritud → sait töötab edasi
- Kui Coolify jätab storefront `Created`: `docker start <storefront-konteiner>` (vana teadaolev workaround)
- Andmed: volumes püsivad; halvim juhtum DB restore: `docker exec -i <db> pg_restore -U xlmarket -d xlmarket --clean < /tmp/xlmarket-pre-redeploy-20260603.dump`
- Meili tühi → reindex: `backend/scripts/index-meilisearch.mjs` (~150s)

## Lahtised (mitte-blokeerivad)
- Montonio makse stub (`backend/medusa-config.ts:46`)
- Admin basic-auth puudub (`storefront/app/xl-admin/layout.tsx:9`)
- Tõlked: ~10 646 toodet ilma ET
