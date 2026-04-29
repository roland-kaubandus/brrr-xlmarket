# XLMarket — Coolify Deploy Guide

> Branch: `xl/coolify-docker-migration`
> Target: Tarmo's Coolify instance (Medusa Team)
> Status: **Migration build ready. Awaiting server slot + first deploy.**

This file is the only thing you need open while clicking through Coolify. Every step is sequenced — do them in order.

---

## 0. Pre-flight (do these before opening Coolify)

- [ ] Decide repo location: stay on `oitmaaristo/brrr-xlmarket` **or** transfer to `roland-kaubandus/xlmarket`. If transferring, do it now (GitHub repo settings → Transfer ownership). After transfer, update local remote: `git remote set-url origin git@github.com:roland-kaubandus/xlmarket.git`.
- [ ] Push the migration branch: `git push -u origin xl/coolify-docker-migration`.
- [ ] Generate four 64-char random secrets — keep them open in a password manager:
  ```bash
  for v in POSTGRES_PASSWORD JWT_SECRET COOKIE_SECRET MEILI_MASTER_KEY; do
    echo "$v=$(openssl rand -hex 32)"
  done
  ```
- [ ] Decide DNS targets — these point at Tarmo's server IP once we cut over:
  - `xlmarket.eu` → storefront
  - `api.xlmarket.eu` → Medusa
  - `admin.xlmarket.eu` → same Medusa container, path `/app`
  - `meili.xlmarket.eu` → Meili (browser uses this for live search)

Do **not** flip DNS yet. Coolify will issue Let's Encrypt certs as soon as DNS resolves; we want the first deploy to succeed first.

---

## 1. Connect repo as a Source

1. Coolify → **Sources** (left sidebar) → **+ New** → **GitHub App**.
2. Install the GitHub App on the org/account that owns the repo (`oitmaaristo` or `roland-kaubandus`). Limit access to **only the xlmarket repo**.
3. Back in Coolify, the source should now appear with the repo listed.

If GitHub App is blocked, fall back to **Deploy Key**: Coolify gives you a public key — paste into GitHub → repo Settings → Deploy keys → allow read access.

---

## 2. Create the project

1. Dashboard → **Projects → +** → name it `xlmarket` (Description: `xlmarket.eu — VEVOR storefront + Medusa`).
2. Open the project → **Production** environment is created by default. Use it.

---

## 3. Add the resource (Docker Compose)

1. Inside the `xlmarket` project → **+ Add Resource**.
2. Choose **Private Repository (with GitHub App)** → pick the repo → **Branch:** `xl/coolify-docker-migration` (later: `main` once we merge).
3. **Build Pack:** Coolify auto-detects `docker-compose.yml`. Confirm.
4. **Compose file location:** `docker-compose.yml` (root). Leave default.

Coolify now parses the file and lists 5 services: `db`, `redis`, `meili`, `medusa`, `storefront`.

---

## 4. Set Environment Variables

Project → **Environment Variables** → paste each line below. Click **"Is Build Variable"** for the `NEXT_PUBLIC_*` ones (Next.js inlines them at build time). Click **"Is Secret"** for the four random secrets, `MEDUSA_ADMIN_PASS`, and `NEXT_PUBLIC_MEILI_KEY`.

```
POSTGRES_PASSWORD=<random 64 hex>
JWT_SECRET=<random 64 hex>
COOKIE_SECRET=<random 64 hex>
MEILI_MASTER_KEY=<random 64 hex>
MEILISEARCH_API_KEY=<same value as MEILI_MASTER_KEY>
MEDUSA_ADMIN_PASS=<choose a strong admin login password>

STORE_CORS=https://xlmarket.eu,https://xlmarket.store
ADMIN_CORS=https://xlmarket.eu,https://admin.xlmarket.eu,https://xlmarket.store
AUTH_CORS=https://xlmarket.eu,https://xlmarket.store

NEXT_PUBLIC_BASE_URL=https://xlmarket.eu
NEXT_PUBLIC_MEILI_URL=https://meili.xlmarket.eu
NEXT_PUBLIC_DEFAULT_REGION=ee

# Set these AFTER first Medusa boot (Step 7) — leave blank for first build
NEXT_PUBLIC_MEDUSA_KEY=
NEXT_PUBLIC_REGION_ID=
NEXT_PUBLIC_MEILI_KEY=
```

---

## 5. Configure Domains (per service)

For each service that should be web-reachable, open the service in Coolify and set its domain + port:

| Service     | Domain                  | Port  |
|-------------|-------------------------|-------|
| storefront  | https://xlmarket.eu     | 3030  |
| medusa      | https://api.xlmarket.eu | 9000  |
| meili       | https://meili.xlmarket.eu | 7700 |

`db` and `redis` stay internal — no domain.

Coolify auto-generates Traefik labels and provisions Let's Encrypt certs once DNS resolves.

---

## 6. First deploy — but staged

> ⚠️ DNS still pointing at the old server (65.109.86.254). We deploy to Coolify's auto-generated `*.coolify.<server-domain>` URL first, verify everything works, then cut DNS.

1. Click **Deploy** on the project. Watch logs in real-time (Coolify → Deployments).
2. Order of healthy services: `db` → `redis` → `meili` → `medusa` → `storefront`.
3. Expected first-build time: **8–15 minutes** (storefront has 14k+ products' build-time data; Medusa migrations run on first boot).
4. If `medusa` fails because tables don't exist:
   - Coolify → `medusa` service → **Terminal** (one-shot exec into container)
   - Run: `npx medusa db:migrate`
   - Then redeploy.

---

## 7. Post-boot: create publishable key + region

Once `medusa` is healthy:

1. Visit `https://api.xlmarket.eu/app` → log in with `admin@xlmarket.eu` + `MEDUSA_ADMIN_PASS` (or seed if missing — see step 7b).
2. **Settings → Regions →** create `Estonia (EUR, EE)` if missing → copy `reg_...` UUID.
3. **Settings → Publishable API Keys →** create `Storefront key` → assign to a Sales Channel → copy `pk_...`.
4. Coolify → Project → Environment Variables → paste the two values into:
   - `NEXT_PUBLIC_REGION_ID`
   - `NEXT_PUBLIC_MEDUSA_KEY`
5. **Storefront service → Redeploy** (rebuild — these are build-time vars).

### 7b. If admin user does not exist

Coolify → `medusa` service → Terminal:
```bash
npx medusa user --email admin@xlmarket.eu --password "$MEDUSA_ADMIN_PASS"
```

---

## 8. Generate Meili search-only key

Meili master key is server-side only. The browser needs a search-only key.

Coolify → `meili` service → Terminal:
```bash
wget -qO- --header="Authorization: Bearer $MEILI_MASTER_KEY" \
  http://localhost:7700/keys
```

Copy the `key` value of the entry whose `actions` is `["search"]`. Paste it into Coolify env var `NEXT_PUBLIC_MEILI_KEY`. Redeploy storefront.

---

## 9. Migrate data from the old VPS

> Old VPS: `65.109.86.254` (Tailscale `100.93.186.17`). New VPS: Tarmo's Coolify host.

### 9a. Postgres (xlmarket DB)

On old VPS:
```bash
ssh -i ~/.ssh/dc_ed25519 brrr@100.93.186.17 \
  'docker exec xlmarket-db pg_dump -U xlmarket -Fc xlmarket' \
  > /tmp/xlmarket-$(date +%Y%m%d-%H%M).dump
```

Upload the dump (Coolify → `db` service → Files, or `scp` to Tarmo host then exec into container):
```bash
docker exec -i <coolify-db-container> pg_restore -U xlmarket -d xlmarket --clean --if-exists < /tmp/xlmarket-*.dump
```

### 9b. MeiliSearch index

Easiest path: re-build from scratch on the new server. It's deterministic and avoids version drift:
```bash
# Coolify → medusa service → Terminal
node ../scripts/index-meilisearch.mjs   # path may differ; adapt to your repo layout
```

If you must transfer: Meili supports dumps. On old VPS:
```bash
curl -X POST -H "Authorization: Bearer $OLD_MEILI_MASTER" http://127.0.0.1:7700/dumps
# wait, then copy /var/lib/meilisearch/dumps/*.dump to new server's volume
```

### 9c. Uploaded media

If the backend has `/uploads` (product images uploaded via admin), `rsync` to the matching Coolify volume mount path (Coolify shows the host path under each volume).

---

## 10. Smoke test on Coolify URLs

Before flipping DNS:
- `curl -I https://api-xlmarket-<hash>.coolify.<host>/health` → `200 OK`
- `curl -I https://storefront-xlmarket-<hash>.coolify.<host>/` → `200 OK`
- Browse storefront URL: hero loads, ProductGrid renders products from Meili
- Log into admin at `/app`, browse products list (should show 14k+)

---

## 11. DNS cutover

Only when steps 1–10 are green:

1. Lower TTL on the four DNS records to 300s (do this 24h before the cutover ideally).
2. Update DNS A records to Tarmo's Coolify host IP.
3. Wait ~5 min, watch Coolify → SSL Certificates → all 4 domains should turn green (Let's Encrypt issued).
4. `curl -I https://xlmarket.eu` → 200 from new infra. If you see the old server's response, flush local DNS.

---

## 12. Old VPS — leave running for 7 days

Don't tear down `65.109.86.254` immediately. Keep it for a week as instant rollback:
- DNS revert = 5 min recovery
- Keeps Postfix mail relay alive for receipts (until SMTP cutover)
- Lets you compare logs side-by-side if something looks off on Coolify

After 7 quiet days: archive Postgres dump, snapshot the disk, then decommission.

---

## 13. Feed sync (cron)

The 4-hourly VEVOR feed sync currently runs on the old VPS (`scripts/feed-sync.sh`). Two options:

- **A** Keep cron on the old VPS pointing at the new Medusa API URL (works fine while old VPS is alive).
- **B** Move to Coolify: create a **Scheduled Task** on the `medusa` service:
  - Schedule: `0 */4 * * *`
  - Command: `bash scripts/feed-sync.sh` (path inside container)
  - Requires `MEDUSA_ADMIN_USER` + `MEDUSA_ADMIN_PASS` env vars

Option B is cleaner long-term.

---

## What changed in the migration branch

| File                          | Change                                                              |
|-------------------------------|---------------------------------------------------------------------|
| `docker-compose.yml`          | Added `meili` service. Dropped `127.0.0.1:` host port bindings (Coolify Traefik handles routing). Dropped `container_name` (Coolify auto-names). Added `expose:` per service. Wired Meili env vars into Medusa + storefront. |
| `storefront/Dockerfile`       | Multi-stage (deps → builder → runner). Uses Next.js standalone output. Non-root user `nextjs:1001`. Healthcheck. |
| `backend/Dockerfile`          | Multi-stage. Non-root user `medusa:1001`. `dumb-init` PID 1. Healthcheck on `/health`. |
| `.env.example`                | Added Meili keys, full CORS list, dropped local Postfix assumption. |
| `.dockerignore` (root, backend, storefront) | Added/expanded — keeps build context small. |
| `COOLIFY_DEPLOY.md`           | This file. |

Nothing on `main` changed. Old VPS is untouched.
