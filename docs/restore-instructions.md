# xlmarket — Restore-juhend

> Backup tehakse: `scripts/backup.sh [label]` → `archive/backup_<label>_<timestamp>/`. HANDBOOK §5.
> Backup'id EI ole git'is (archive/ ignore'is). Asukoht: serveris `/opt/xlmarket-github/archive/`.

## Backup sisu
| Fail | Mis |
|---|---|
| `xlmarket_pg.dump` | Postgres custom-format dump (kogu DB: tooted, tellimused, CMS, tõlked) |
| `meili_dump_task.json` | Meili dump-task ID (dump läheb meili volume'i) |
| `meili_stats.json` | Doc count verifitseerimiseks (peaks olema ~17105) |
| `metadata.txt` | Konteinerid, volumes, git commit backup hetkel |

## Postgres taaste
```bash
DBC=$(docker ps --format '{{.Names}}' | grep '^db-uo28ovobnflauslqjgxeohl0' | head -1)
docker exec -i "$DBC" pg_restore -U xlmarket -d xlmarket --clean --if-exists \
  < /opt/xlmarket-github/archive/backup_<label>_<ts>/xlmarket_pg.dump
```
⚠️ `--clean` kustutab olemasoleva. **HANDBOOK TR1: küsi kinnitust enne tootmis-DB taastet.**

## Meili taaste (lihtsaim: reindex Postgres'ist)
Meili on tuletatud Postgres'ist → kiireim taaste = reindex:
```bash
cd /opt/xlmarket-github && set -a && source .env && set +a && unset DATABASE_URL
node backend/scripts/index-meilisearch.mjs        # ~150s, taastab 17105 dok
node scripts/sync-existing-synonyms.mjs
# seejärel: find storefront/.next/cache -type f -delete + redeploy/reload
```

## DKIM võti (mailcow) taaste
DKIM privaatvõti on mailcow redis'es (`DKIM_PRIV_KEYS[dkim.xlmarket.ee]`), MITTE git'is. Kui mailcow taastatakse ja võti kaob:
- Genereeri uus võtmepaar, pane redis'esse (DKIM_SELECTORS/PRIV_KEYS/PUB_KEYS), **uuenda DNS** `dkim._domainkey.xlmarket.ee`
- Vt `memory/sessions/2026-06-03-xl.md` DKIM osa

## Coolify resource taaste
Coolify DB backup: `/tmp/coolify-db-backup-*.dump` (tehtud migratsiooni ajal). xlmarket app = projekt "xlmarket" (Root Team), UUID `uo28ovobnflauslqjgxeohl0`, destination localhost.
