#!/usr/bin/env bash
# db-restore-test.sh — DB-taaste-test AJUTISSE (throwaway) konteinerisse.
#
# MITTEPURUSTAV: ei puuduta prod/staging DB-d. Taastab valitud varukoopia
# throwaway postgres:16-alpine konteinerisse (volumeta, --rm), verifitseerib
# rea-arvud, hävitab konteineri + kustutab ajutise dumbi (trap EXIT).
#
# Kasutus:
#   db-restore-test.sh storagebox [prod|staging] [YYYY-MM-DD]   # vaikim: staging, täna
#   db-restore-test.sh restic      [prod|staging]               # viimane restic-snapshot Scaleway'st
#   db-restore-test.sh local <archive/backup_<label>_<ts>/xlmarket_pg.dump>
#
# Allikad (vt docs/runbooks/db-taaste.md):
#   storagebox — Hetzner Storage Box u584693:backups/databases/ (igapäevane 01:00)
#                prod   = medusa-db-<date>.sql        (plain SQL, psql)
#                staging= medusa-staging-db-<date>.dump (custom, pg_restore)
#   restic     — Scaleway append-only repo (/root/.restic-env + .restic-pass)
#   local      — lokaalne scripts/backup.sh arhiiv (archive/…/xlmarket_pg.dump)
set -uo pipefail
SRC="${1:?allikas: storagebox|restic|local}"
WORK="${XL_RESTORE_TMP:-/tmp/xl-restore-test}"; mkdir -p "$WORK"
TS=$(date +%s); CT="xl-restore-test-$TS"; DUMP="$WORK/restore-$TS.dump"
SB_HOST="u584693@u584693.your-storagebox.de"; SB_PORT=23; SB_KEY=/root/.ssh/storagebox
log(){ echo "[$(date +%H:%M:%S)] $*"; }
cleanup(){ docker rm -f "$CT" >/dev/null 2>&1; rm -f "$DUMP"; }
trap cleanup EXIT

FMT=custom   # custom → pg_restore ; plain → psql -f
case "$SRC" in
  storagebox)
    WHICH="${2:-staging}"; DATE="${3:-$(date +%F)}"
    if [ "$WHICH" = prod ]; then REMOTE="backups/databases/medusa-db-$DATE.sql"; FMT=plain
    else REMOTE="backups/databases/medusa-staging-db-$DATE.dump"; FMT=custom; fi
    log "1) scp Storage Boxist: $REMOTE"
    scp -q -P "$SB_PORT" -i "$SB_KEY" -o BatchMode=yes -o ConnectTimeout=30 "$SB_HOST:$REMOTE" "$DUMP" \
      || { echo "scp FAIL ($REMOTE puudub?)"; exit 1; }
    ;;
  restic)
    WHICH="${2:-staging}"
    [ -r /root/.restic-env ] && [ -r /root/.restic-pass ] || { echo "restic env/pass puudub"; exit 1; }
    set -a; . /root/.restic-env; set +a
    export RESTIC_PASSWORD_FILE=/root/.restic-pass
    log "1) restic: otsin viimast snapshot'i, taastan dumbi…"
    # restic varundab /opt/eumotors-tasks (sisaldab DB-dumpe); täpne tee repos:
    PAT="medusa-staging-db"; [ "$WHICH" = prod ] && PAT="medusa-db"
    restic restore latest --target "$WORK/restic-out" --include "*/$PAT-*" >/tmp/restic-r.log 2>&1 \
      || { echo "restic restore FAIL — vt /tmp/restic-r.log"; exit 1; }
    F=$(find "$WORK/restic-out" -name "$PAT-*" | sort | tail -1)
    [ -n "$F" ] || { echo "restic: dumpi ei leitud ($PAT)"; exit 1; }
    cp "$F" "$DUMP"; case "$F" in *.sql) FMT=plain;; *) FMT=custom;; esac
    ;;
  local)
    F="${2:?local dump tee}"; [ -r "$F" ] || { echo "ei leia: $F"; exit 1; }
    cp "$F" "$DUMP"; case "$F" in *.sql) FMT=plain;; *) FMT=custom;; esac
    ;;
  *) echo "tundmatu allikas: $SRC"; exit 1;;
esac
log "   dump $(du -h "$DUMP" | cut -f1), formaat=$FMT"

log "2) throwaway postgres:16-alpine ($CT, volumeta --rm)…"
docker run -d --rm --name "$CT" -e POSTGRES_PASSWORD=x -e POSTGRES_USER=xlmarket -e POSTGRES_DB=xlmarket postgres:16-alpine >/dev/null \
  || { echo "docker run FAIL"; exit 1; }
for i in $(seq 1 30); do docker exec "$CT" pg_isready -U xlmarket -d xlmarket >/dev/null 2>&1 && break; sleep 1; done

log "3) taaste throwaway'sse ($FMT)…"; t0=$(date +%s)
docker cp "$DUMP" "$CT:/tmp/d.dump"
if [ "$FMT" = custom ]; then
  docker exec "$CT" pg_restore -U xlmarket -d xlmarket --no-owner --no-privileges /tmp/d.dump >/tmp/pgr.log 2>&1; RC=$?
else
  docker exec "$CT" sh -c 'psql -U xlmarket -d xlmarket -v ON_ERROR_STOP=0 -f /tmp/d.dump' >/tmp/pgr.log 2>&1; RC=$?
fi
log "   taaste rc=$RC ($(($(date +%s)-t0))s) — rc!=0 võib olla kahjutud owner/role warnid"

log "4) verifitseerin rea-arvud (tõe-allikas = taastatud andmed):"
docker exec "$CT" psql -U xlmarket -d xlmarket -tAc \
  "SELECT 'products='||count(*) FROM product WHERE deleted_at IS NULL
   UNION ALL SELECT 'cms_page='||count(*) FROM cms_page
   UNION ALL SELECT 'orders='||count(*) FROM \"order\"
   UNION ALL SELECT 'categories='||count(*) FROM product_category;" 2>&1 | sed 's/^/     /'
log "5) hävitan throwaway + kustutan dumbi (trap EXIT)."
