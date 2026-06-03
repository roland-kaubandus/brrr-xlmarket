#!/usr/bin/env bash
# xlmarket stack-spetsiifiline backup (Medusa: Postgres + Meili).
# HANDBOOK TR3: jooksuta ENNE iga riskantset DB/konteineri/config muudatust.
#
# Kasutus: ./backup.sh [label]      nt ./backup.sh pre-redeploy
# Konteinerite nimed muutuvad Coolify redeploy'l → tuvastatakse dünaamiliselt mustri järgi.
set -uo pipefail

LABEL="${1:-manual}"
TS=$(date +%Y%m%d_%H%M%S)
DIR="/opt/xlmarket-github/archive/backup_${LABEL}_${TS}"
PROJ="uo28ovobnflauslqjgxeohl0"
PGUSER="xlmarket"; PGDB="xlmarket"
mkdir -p "$DIR"
echo "Backup → $DIR"

# Tuvasta konteinerid mustri järgi
DBC=$(docker ps --format '{{.Names}}' | grep "^db-${PROJ}" | head -1)
MEILIC=$(docker ps --format '{{.Names}}' | grep "^meili-${PROJ}" | head -1)
MEDUSAC=$(docker ps --format '{{.Names}}' | grep -E "^medusa-${PROJ}|^medusa-xlmarket" | head -1)
echo "  db=$DBC meili=$MEILIC medusa=$MEDUSAC"

# [1/4] Postgres dump (custom format — taastatav pg_restore'iga)
echo "  [1/4] Postgres dump..."
if [[ -n "$DBC" ]]; then
  docker exec "$DBC" pg_dump -U "$PGUSER" -Fc "$PGDB" > "$DIR/xlmarket_pg.dump" 2>/dev/null \
    && echo "    OK ($(du -h "$DIR/xlmarket_pg.dump" | cut -f1))" || echo "    FAILED"
else echo "    SKIP (db konteiner ei leitud)"; fi

# [2/4] Meili dump (API /dumps; allikas on pg, aga snapshot kiirendab taastet)
echo "  [2/4] Meili dump..."
if [[ -n "$MEILIC" && -n "$MEDUSAC" ]]; then
  KEY=$(docker inspect "$MEDUSAC" -f '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^MEILISEARCH_API_KEY=' | cut -d= -f2)
  docker exec "$MEILIC" sh -c "wget -q -O- --post-data='' --header='Authorization: Bearer $KEY' http://127.0.0.1:7700/dumps" \
    > "$DIR/meili_dump_task.json" 2>/dev/null \
    && echo "    OK (dump task käivitatud → meili volume's, vt meili_dump_task.json)" || echo "    FAILED (taaste: reindex pg'st)"
else echo "    SKIP (meili/medusa konteiner ei leitud)"; fi

# [3/4] Meili doc count (verifitseerimiseks)
echo "  [3/4] Meili doc count..."
if [[ -n "$MEILIC" ]]; then
  KEY=${KEY:-$(docker inspect "$MEDUSAC" -f '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^MEILISEARCH_API_KEY=' | cut -d= -f2)}
  docker exec "$MEILIC" sh -c "wget -qO- --header='Authorization: Bearer $KEY' http://127.0.0.1:7700/indexes/products/stats" \
    > "$DIR/meili_stats.json" 2>/dev/null && echo "    OK ($(cat "$DIR/meili_stats.json" | head -c 60))" || echo "    FAILED"
fi

# [4/4] Metaandmed (konteinerid, volumes, git commit)
echo "  [4/4] Metaandmed..."
{
  echo "label: $LABEL"; echo "timestamp: $TS"
  echo "containers:"; docker ps --format '{{.Names}}\t{{.Status}}' | grep "$PROJ"
  echo "volumes:"; docker volume ls --format '{{.Name}}' | grep -i xlmarket
  echo "git: $(cd /opt/xlmarket-github && git rev-parse --short HEAD 2>/dev/null)"
} > "$DIR/metadata.txt" 2>/dev/null && echo "    OK"

echo "Valmis: $DIR"
echo "Taaste pg: docker exec -i \$DBC pg_restore -U $PGUSER -d $PGDB --clean < $DIR/xlmarket_pg.dump"
echo "Taaste meili: node backend/scripts/index-meilisearch.mjs (reindex pg'st)"
