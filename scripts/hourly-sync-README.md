# hourly-sync

Iga tund sync'ib uusi committe `main`-i, lahendab triviaalsed conflictid,
käivitab build'i. Vt `hourly-sync.sh` skripti kommentaare detailide jaoks.

## Staatus

```bash
crontab -l | grep hourly-sync
```

## Enable / disable

```bash
# ENABLE (eemalda "#PAUSED#" prefix)
crontab -l | sed 's/^#PAUSED# 7 \*/7 */' | crontab -

# DISABLE (lisa "#PAUSED#" prefix — kohustuslik enne avalikuks minekut)
crontab -l | sed '/hourly-sync.sh/ s/^7 \*/#PAUSED# 7 */' | crontab -
```

## Logid

- Cron stdout/stderr: `data/hourly-sync.log`
- Per-run build raportid: `data/sync-reports/sync-YYYY-MM-DD-HHMM.log`
- Escalation (käsitsi lahendada): `data/hourly-sync-ESCALATION.md`

## Käsitsi jooksutamine

```bash
QUIET=0 bash scripts/hourly-sync.sh
```

Setting `QUIET=0` forces verbose output even when nothing interesting
happened — useful for sanity checks.

## Kui escalation tuleb

1. Ava `data/hourly-sync-ESCALATION.md` — näed, mis branch vajab inimest
2. Lahenda conflict käsitsi: `git merge <branch>`, lahenda conflict'id, commit
3. Pärast seda kustutab järgmine sync-run ise escalation faili

## Enne avalikuks minekut

Kindlasti disable'i — uncontrolled main-muudatused ei sobi live-liiklusega.
