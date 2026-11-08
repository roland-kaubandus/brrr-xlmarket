# Runbook — DB-taaste + taaste-test (xlmarket)

> Viimati valideeritud: **2026-11-08** (ajutise konteineri taaste-test, Storage Box staging dump).
> Seotud: `docs/restore-instructions.md` (lokaalne arhiiv), `/opt/eumotors-tasks/VARUNDUS-PLAAN-2026-08-31.md` (topoloogia).

## 1. Varunduse topoloogia (3 koopiat)

| # | Koht | Mis | Sagedus | Taaste-tööriist |
|---|---|---|---|---|
| 1 | **Hetzner Storage Box** `u584693@u584693.your-storagebox.de:23` (võti `/root/.ssh/storagebox`) | `backups/databases/medusa-db-<date>.sql` (PROD, plain ~593M) · `medusa-staging-db-<date>.dump` (STAGING, custom ~122M) · coolify/wordpress/umami/nextcloud | iga päev **01:00** (`backup-retention.sh`, timer 02:01 pügab vanu) | `psql -f` (plain) / `pg_restore` (custom) |
| 2 | **Storage Box `.zfs/snapshot/`** | 10 päevast ZFS-snapshot'i | ~02:15 (Hetzner Robot) | kopeeri snapshot'ist + nagu #1 |
| 3 | **restic → Scaleway** (append-only; `/root/.restic-env` + `/root/.restic-pass`, allikad `/etc/restic-sources.conf` sh `/opt/eumotors-tasks`) | kolmas off-site koopia, tag `nightly` | igaöine (`restic-backup.sh`); enesetest `restic-selftest.sh` | `restic restore` |
| 4 | **Lokaalne arhiiv** `archive/backup_<label>_<ts>/` | ühekordsed enne-riskantset-tööd dumbid (`scripts/backup.sh`) | käsitsi | `pg_restore` — vt `docs/restore-instructions.md` |

> ⚠️ restic retention-lock Scaleway'l — `s3:DeleteObject` locks/* prefiksil keelatud (issue #13, **Tarmo IAM-tegevus**). Varundus ise töötab; prune-lock lahtine.

## 2. Taaste-TEST (mittepurustav — kohustuslik enne cutover'it ja perioodiliselt)

**Põhimõte:** taaste-testi EI tehta kunagi prod/staging DB vastu. Taasta **throwaway postgres:16-alpine** konteinerisse (volumeta, `--rm`), verifitseeri rea-arvud, hävita. Üks skript, kõik 3 allikat:

```bash
cd /opt/xlmarket-github
scripts/db-restore-test.sh storagebox staging 2026-11-08   # Storage Box staging dump
scripts/db-restore-test.sh storagebox prod   2026-11-08    # Storage Box prod dump (plain SQL)
scripts/db-restore-test.sh restic    staging               # restic Scaleway viimane snapshot
scripts/db-restore-test.sh local archive/backup_pre-C-dreen_20260824_094127/xlmarket_pg.dump
```

Skript: tõmbab varukoopia → käivitab throwaway konteineri → `pg_restore`/`psql` → verifitseerib `products/cms_page/orders/categories` → hävitab konteineri + ajutise dumbi (trap EXIT). **Mittepurustav, ei võta stack-lukku** (ei kirjuta prod/staging DB-sse — HARD RULE #9: DRY/read-only EI lukusta).

**✅ Valideerimise etalon (2026-11-08, Storage Box staging dump):**
```
scp 122M 3s → pg_restore rc=0 23s (kokku ~30s)
products=19451 · cms_page=20 · orders=21 · categories=17904
throwaway hävitatud, dump kustutatud.
```
Roheline = varukoopia on terviklik JA taastatav. Rea-arvud peavad olema mõistlikus suurusjärgus (products ~19k, mitte 0).

## 3. PÄRIS taaste (katastroof — PURUSTAV, nõuab kinnitust)

> 🛑 **HARD RULE #9:** päris-taaste kirjutab DB-sse → võtab stack-luku, deploy ootab. **HARD RULE #12:** prod uo28 taaste = **ainult Tarmo loal samast vestlusest**.

**Staging (k33g) taaste Storage Boxist:**
```bash
cd /opt/xlmarket-github
source scripts/lib/stack-lock.sh; xl_lock_acquire db-restore-staging 60; trap xl_lock_release EXIT
scp -P 23 -i /root/.ssh/storagebox \
  u584693@u584693.your-storagebox.de:backups/databases/medusa-staging-db-<date>.dump /tmp/r.dump
DBC=$(docker ps --format '{{.Names}}' | grep '^db-k33g510dw19uyjau3ca7dqpi' | head -1)
docker cp /tmp/r.dump "$DBC:/tmp/r.dump"
docker exec "$DBC" pg_restore -U xlmarket -d xlmarket --clean --if-exists --no-owner /tmp/r.dump
# seejärel Meili reindex (vt docs/restore-instructions.md §Meili)
```
**Prod (uo28):** sama, konteiner `db-uo28ovobnflauslqjgxeohl0-*`, allikas `medusa-db-<date>.sql` (**plain** → `psql -f`, mitte pg_restore). **AINULT Tarmo loal.**

## 4. Meili + cache pärast taastet
Meili on tuletatud Postgres'ist → reindex (vt `docs/restore-instructions.md §Meili taaste`):
`node backend/scripts/index-meilisearch.mjs && node scripts/sync-existing-synonyms.mjs` + cache-puhastus + redeploy.
