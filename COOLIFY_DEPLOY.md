# XLMarket — Relocation to Coolify

> Goal: move xlmarket main from old VPS (`65.109.86.254`) to Tarmo's Coolify host. Old VPS gets shut down after the move.
>
> Pood pole avatud — null kliente, null tellimusi. Downtime pole oluline. Lõpus on vana VPS lihtsalt välja lülitatud.

This is a **single linear move**, not parallel hosting. Do steps in order.

---

## Phase 0 — preparation (~10 min)

- [ ] Decide repo location. Two options:
  - **Stay on `oitmaaristo/brrr-xlmarket`** — fastest. No transfer needed.
  - **Transfer to `roland-kaubandus/xlmarket`** — cleaner long-term ownership.

  If transferring: GitHub repo Settings → Transfer ownership → confirm. Then locally:
  ```bash
  git remote set-url origin git@github.com:roland-kaubandus/xlmarket.git
  ```

- [ ] Push `main`:
  ```bash
  git push origin main
  ```

- [ ] Generate four 64-char secrets (keep in password manager):
  ```bash
  for v in POSTGRES_PASSWORD JWT_SECRET COOKIE_SECRET MEILI_MASTER_KEY; do
    echo "$v=$(openssl rand -hex 32)"
  done
  ```

- [ ] Plan DNS targets (point at Tarmo's Coolify host IP — get IP from Tarmo):
  - `xlmarket.eu` → storefront
  - `api.xlmarket.eu` → Medusa (admin lives at `/app`)
  - `meili.xlmarket.eu` → Meili (browser-side search)

  **Don't change DNS yet** — last step.

---

## Phase 1 — connect repo as Coolify Source (~5 min)

1. Coolify → **Sources** → **+ New** → **GitHub App**.
2. Install on the org/account that owns the repo. Limit access to **only the xlmarket repo**.
3. Confirm repo appears in source list.

Fallback (if GitHub App is blocked): use **Deploy Key** — Coolify shows a public key, paste into GitHub → repo Settings → Deploy keys → read access.

---

## Phase 2 — create Coolify project + first deploy (~15 min)

1. Dashboard → **Projects → +** → name `xlmarket`.
2. Open project → **+ Add Resource** → **Private Repository (with GitHub App)** → pick repo → branch `main` → it auto-detects `docker-compose.yml`.
3. Confirm 5 services parsed: `db`, `redis`, `meili`, `medusa`, `storefront`.

### Set environment variables

Project → **Environment Variables**. Mark `Is Build Variable` for `NEXT_PUBLIC_*` ones. Mark `Is Secret` for the four random secrets, `MEDUSA_ADMIN_PASS`, and the search-only key.

```
POSTGRES_PASSWORD=<random 64 hex>
JWT_SECRET=<random 64 hex>
COOKIE_SECRET=<random 64 hex>
MEILI_MASTER_KEY=<random 64 hex>
MEILISEARCH_API_KEY=<same value as MEILI_MASTER_KEY>
MEDUSA_ADMIN_PASS=<strong admin login password>

STORE_CORS=https://xlmarket.eu
ADMIN_CORS=https://xlmarket.eu,https://api.xlmarket.eu
AUTH_CORS=https://xlmarket.eu

NEXT_PUBLIC_BASE_URL=https://xlmarket.eu
NEXT_PUBLIC_MEILI_URL=https://meili.xlmarket.eu
NEXT_PUBLIC_DEFAULT_REGION=ee

# Leave blank for now — fill in Phase 4 after Medusa boots
NEXT_PUBLIC_MEDUSA_KEY=
NEXT_PUBLIC_REGION_ID=
NEXT_PUBLIC_MEILI_KEY=
```

### Set domains per service

For each web-reachable service:

| Service     | Domain                  | Port  |
|-------------|-------------------------|-------|
| storefront  | https://xlmarket.eu     | 3030  |
| medusa      | https://api.xlmarket.eu | 9000  |
| meili       | https://meili.xlmarket.eu | 7700 |

`db` and `redis` stay internal.

### Click Deploy

Watch Coolify → Deployments. First build: **8–15 min**. Order: `db` → `redis` → `meili` → `medusa` → `storefront`.

If `medusa` fails on missing tables:
- Coolify → `medusa` service → Terminal → `npx medusa db:migrate` → redeploy.

---

## Phase 3 — export data from old VPS (~10 min)

SSH into old VPS:
```bash
ssh -i ~/.ssh/dc_ed25519 brrr@100.93.186.17
cd brrr-xlmarket
git pull   # gets the new export script
bash scripts/coolify-migrate-export.sh
```

Output: `/tmp/xlmarket-coolify-migration-<ts>.tar.gz` (Postgres dump + Meili dump + uploads).

Move to your laptop or directly to the new Coolify host:
```bash
# from your laptop
scp brrr@100.93.186.17:/tmp/xlmarket-coolify-migration-*.tar.gz .
scp xlmarket-coolify-migration-*.tar.gz <user>@<coolify-host>:/tmp/
```

---

## Phase 4 — import data into Coolify stack (~15 min)

SSH into the Coolify host. Find the Coolify-generated container names:
```bash
docker ps --format '{{.Names}}' | grep -E '(xlmarket|coolify)' | head -20
```

Note the Postgres and Medusa container names — they look like `db-<uuid>` and `medusa-<uuid>`.

Find the Meili volume mount path:
```bash
docker volume ls | grep meili
docker volume inspect <volume-name> --format '{{.Mountpoint}}'
```

Run import:
```bash
export COOLIFY_DB_CONTAINER=db-xxxxx
export COOLIFY_MEDUSA_CONTAINER=medusa-xxxxx
export COOLIFY_MEILI_VOLUME=/var/lib/docker/volumes/xxxxx_xlmarket_meili/_data
export MEILI_MASTER_KEY=<the value you set in Coolify env>

bash scripts/coolify-migrate-import.sh /tmp/xlmarket-coolify-migration-*.tar.gz
```

The script:
1. Restores Postgres (drops public schema first, clean slate)
2. Drops Meili dump file into the volume + tells you to set `MEILI_IMPORT_DUMP` env var on the meili service in Coolify and redeploy it once
3. Copies uploads/static into the Medusa container

After Meili import completes, **remove the `MEILI_IMPORT_DUMP` env var** from Coolify and redeploy Meili once more (so it doesn't re-import on every restart).

---

## Phase 5 — wire publishable key + Meili search key (~10 min)

### Medusa publishable key + region

1. Visit `https://api.xlmarket.eu/app` (or Coolify-generated URL if DNS still pending) → log in with `admin@xlmarket.eu` + `MEDUSA_ADMIN_PASS`.
2. **Settings → Regions** → confirm `Estonia (EUR)` exists → copy `reg_...`.
3. **Settings → Publishable API Keys** → confirm `Storefront key` exists or create one → assign to a Sales Channel → copy `pk_...`.
4. Coolify env vars:
   - `NEXT_PUBLIC_REGION_ID=reg_...`
   - `NEXT_PUBLIC_MEDUSA_KEY=pk_...`
5. Redeploy storefront (these are build-time, must rebuild).

### Meili search-only key

Coolify → `meili` service → Terminal:
```bash
wget -qO- --header="Authorization: Bearer $MEILI_MASTER_KEY" \
  http://localhost:7700/keys
```

Copy the `key` value of the entry whose `actions: ["search"]`. Paste into:
- `NEXT_PUBLIC_MEILI_KEY=<search-only key>`

Redeploy storefront.

---

## Phase 6 — DNS cutover (~5 min)

1. Update DNS A records to point at Tarmo's Coolify host IP:
   - `xlmarket.eu` → A record
   - `api.xlmarket.eu` → A record
   - `meili.xlmarket.eu` → A record
2. Wait ~2–5 min. Coolify auto-issues Let's Encrypt certs once DNS resolves.
3. Verify:
   ```bash
   curl -I https://xlmarket.eu
   curl -I https://api.xlmarket.eu/health
   curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" https://meili.xlmarket.eu/indexes/products/stats | python3 -m json.tool
   ```

---

## Phase 7 — feed sync cron

The 4-hourly VEVOR sync must run somewhere. Options:

- **A** Coolify Scheduled Task on `medusa` service:
  - Schedule: `0 */4 * * *`
  - Command: `bash scripts/feed-sync.sh`
- **B** External cron pointing at the new API URL.

Pick A — it lives with the app.

---

## Phase 8 — shut down old VPS

Once the new site is verified working for 24h:

1. Stop services: `pm2 stop all && docker compose -f /home/brrr/brrr-xlmarket/docker-compose.yml down`.
2. Snapshot the disk (Hetzner UI → Server → Snapshots) — kept as cold backup, in case something turns up missing later.
3. Cancel the server.

Old VPS hosts other things too (autoradar, wingit, printer2, huly, declar, canaryparts) — **don't cancel until those are migrated separately**. Just stop the xlmarket-related processes:
```bash
pm2 stop xlmarket-storefront
docker compose down  # in /home/brrr/brrr-xlmarket
sudo systemctl stop xlmarket-feed-sync.timer 2>/dev/null || true
sudo rm /etc/nginx/sites-enabled/xlmarket.store
sudo systemctl reload nginx
```

---

## Files in this migration

| File                                        | Purpose                                  |
|---------------------------------------------|------------------------------------------|
| `docker-compose.yml`                        | Coolify stack (5 services)               |
| `storefront/Dockerfile`                     | Next.js 16 standalone, multi-stage       |
| `backend/Dockerfile`                        | Medusa multi-stage, dumb-init            |
| `.env.example`                              | All required env vars documented         |
| `.dockerignore` (root, backend, storefront) | Keep build context small                 |
| `scripts/coolify-migrate-export.sh`         | Run on old VPS — produces tarball        |
| `scripts/coolify-migrate-import.sh`         | Run on Coolify host — restores tarball   |
| `COOLIFY_DEPLOY.md`                         | This file                                |

---

## Rollback (if something blocks)

Until DNS is flipped (Phase 6), the old VPS is still serving everything as before. Rollback = "do nothing different." If Phase 6 reveals a problem, flip DNS back to `65.109.86.254` — the old stack is still running.

After Phase 8 (old VPS stopped), rollback means restarting the old PM2 + nginx + Docker stack. The old data is still there, just idle. Restart with:
```bash
ssh brrr@100.93.186.17
cd brrr-xlmarket
docker compose up -d db redis
pm2 start ecosystem.config.js
sudo systemctl reload nginx
```
