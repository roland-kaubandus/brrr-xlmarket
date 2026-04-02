# Deploy

## XL Market VPS

Praegune live setup ei jookse storefronti jaoks Docker Compose all, vaid hosti peal:

- Medusa: `http://127.0.0.1:9001`
- Storefront: `http://127.0.0.1:3030`

Storefronti uuendamiseks VPS-is:

```bash
cd /home/brrr/brrr-xlmarket
bash scripts/deploy-storefront-host.sh
```

Skript teeb:

- `git fetch` + `git pull`
- `npm run build` kaustas `storefront`
- vana Next protsessi peatamise
- uue storefronti käivitamise pordil `3030`
- lühikese health checki aadressile `/et`

Logi asub siin:

```bash
/home/brrr/logs/xlmarket-storefront.log
```

PID fail kirjutatakse siia:

```bash
/home/brrr/logs/xlmarket-storefront.pid
```

## Märkus Docker Compose kohta

Repo sisaldab endiselt `docker-compose.yml`, aga vähemalt storefronti live deploy ei kasuta seda hetkel otse. Kui see tahetakse uuesti päriselt Compose peale viia, tuleb build-time ühendused Medusa/Meilisearchiga enne korda teha.
