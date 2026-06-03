#!/usr/bin/env bash
# Kopeerib PROD andmed → STAGING (pg + meili reindex). AINULT suund prod→staging.
# HANDBOOK §7: staging on prod-koopia (realistlik test). Email staging'us VÄLJAS (EMAIL_DISABLED).
#
# Kasutus: ./staging-refresh.sh
set -uo pipefail

PROD_UUID="uo28ovobnflauslqjgxeohl0"
STG_UUID="k33g510dw19uyjau3ca7dqpi"
PGUSER="xlmarket"; PGDB="xlmarket"

# --- SAFETY: prod ja staging EI tohi olla sama ---
if [[ "$PROD_UUID" == "$STG_UUID" ]]; then echo "❌ ABORT: prod==staging uuid"; exit 1; fi

PROD_DB=$(docker ps --format '{{.Names}}' | grep "^db-${PROD_UUID}" | head -1)
STG_DB=$(docker ps  --format '{{.Names}}' | grep "^db-${STG_UUID}"  | head -1)
STG_MED=$(docker ps -a --format '{{.Names}}' | grep "^medusa-${STG_UUID}" | head -1)
STG_MEILI=$(docker ps --format '{{.Names}}' | grep "^meili-${STG_UUID}" | head -1)
echo "prod_db=$PROD_DB  staging_db=$STG_DB  staging_medusa=$STG_MED"
[[ -z "$PROD_DB" || -z "$STG_DB" ]] && { echo "❌ konteinerid puudu"; exit 1; }

# --- SAFETY: staging db volume PEAB sisaldama staging uuid'd (mitte prod) ---
STG_VOL=$(docker inspect "$STG_DB" -f '{{range .Mounts}}{{.Name}}{{end}}' 2>/dev/null)
if [[ "$STG_VOL" != *"$STG_UUID"* ]]; then echo "❌ ABORT: staging db volume ($STG_VOL) ei sisalda staging uuid'd!"; exit 1; fi
echo "✓ isolatsioon OK: staging volume=$STG_VOL"

# --- [1/3] Stop staging medusa (et ei segaks restore't) ---
echo "[1/3] peatan staging medusa..."
docker stop "$STG_MED" >/dev/null 2>&1 && echo "  stopped" || echo "  (polnud running)"

# --- [2/3] pg: prod dump → staging restore ---
echo "[2/3] pg dump prod → restore staging..."
docker exec "$PROD_DB" pg_dump -U "$PGUSER" -Fc "$PGDB" 2>/dev/null \
  | docker exec -i "$STG_DB" pg_restore -U "$PGUSER" -d "$PGDB" --clean --if-exists --no-owner --no-acl 2>&1 \
  | grep -iE "error" | grep -viE "already exists|does not exist|must be owner" | head -10
echo "  pg restore valmis (ülal ainult reaalsed error'id, tühi=OK)"

# --- [3/3] Start staging medusa + meili reindex ---
echo "[3/3] start staging medusa..."
docker start "$STG_MED" >/dev/null 2>&1 && echo "  started (boot ~6min)"

echo "  meili reindex (bundle src+scripts → konteiner, symlink node_modules, run)..."
REPO="/opt/xlmarket-github/backend"
tar czf /tmp/reindex-bundle.tgz -C "$REPO" src scripts 2>/dev/null
docker exec "$STG_MED" sh -c 'rm -rf /tmp/reindex && mkdir -p /tmp/reindex' 2>/dev/null
docker cp /tmp/reindex-bundle.tgz "$STG_MED":/tmp/reindex/bundle.tgz 2>/dev/null
docker exec "$STG_MED" sh -c 'cd /tmp/reindex && tar xzf bundle.tgz && ln -sfn /app/node_modules /tmp/reindex/node_modules' 2>/dev/null
# ESM vajab node_modules script'i dir'i kohal → symlink. DATABASE_URL/MEILISEARCH_KEY tulevad konteineri env'ist.
docker exec -w /tmp/reindex/scripts "$STG_MED" node index-meilisearch.mjs 2>&1 | tail -5
rm -f /tmp/reindex-bundle.tgz

echo ""
echo "Valmis. Kontrolli: https://staging.xlmarket.ee (noindex + email OFF)"
