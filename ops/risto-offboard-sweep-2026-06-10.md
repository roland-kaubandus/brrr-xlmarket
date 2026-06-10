# Risto offboard — read-only security-sweep + cart-stall fix (2026-06-10)

Risto = vaenulik endine arendaja (offboard mai 2026, `userdel -r`, UID 1001). Offboard oli POOLIK.

## ✅ TEHTUD — cart-stall fix (host audit-reegel)
- **Juur:** `auditd` reegel `-S all -F uid=1001 -k risto_all` (MEIE Risto-jälgimise reegel) auditeeris KÕIK syscall'id uid 1001 jaoks. **Medusa jookseb nüüd uid 1001 all** → audit-backlog ületäitus → `backlog_wait_time` blokeeris medusa syscall'id → cart-create 5-16s (bimodaalne).
- **Validatsioon (reverditav):** `backlog_wait_time=0` → cart-create 15/15 <0.7s (oli 5-16s).
- **Fix:** eemaldatud `risto_all` + `risto_files` (uid=1001) `auditctl -d` (runtime) + `/etc/audit/rules.d/risto.rules`-failist (backup `/tmp/tr/`). `docker_commands` jäetud. backlog_wait_time taastatud 60000.
- **Tulemus:** cart-create STAGING 0/20 spike'i (<0.65s), PROD 0/10 (<0.77s). **Cart-stall LAHENDATUD mõlemal — host-fix, EI prod-app-deploy't.** + daily-report.sh Risto-sektsioonid puhastatud.
- Ajaloolised tõendid SÄILITATUD (`/opt/xlmarket-backup/risto-auth-log-backup.log.gz`, auth.log).

## 🔴 SWEEP-LEIUD — offboard-lüngad (REMEDEERIDA KOOS, EI veel parandatud)
1. **sudoers: `risto ALL=(ALL) NOPASSWD: ALL`** + docker (`/etc/sudoers.d/` või `/etc/sudoers`). Kustutatud kasutaja, AGA kirjed alles → latentne root-risk kui `risto` taasluuakse. **Eemalda.**
2. **sshd: `PermitRootLogin yes` + `PasswordAuthentication yes`** → karmista (key-only, ei root-password).
3. **`/root/.ssh/authorized_keys` 2× `root@Ubuntu-noble-latest`** (+ 1× coolify=legit). Kontrolli 2 root-võtme omanikku (võib olla Risto provisioning-võti).
4. **lib/admin-session.ts `RISTO_ADMIN_EMAIL/PASS`** → lisab Risto xl-admin-login'i KUI env seatud. **INERTNE** (env UNSET prod+staging+Coolify), aga obsoletne kood + ecosystem.config.js/.env.example viited → koristada.
5. **next.config.ts `allowedDevOrigins: ["65.109.86.254",...]`** (Risto-IP) — prod-mõjuta (ainult `next dev`), kosmeetiline → eemalda.

## ✅ PUHAS (kontrollitud)
- Cron/systemd-timerid/at: pole risto/tunnel/autossh (standard).
- Võrk: pole väljuvaid ühendusi Risto-IP'dele (100.93.186.17 / 65.109.86.254), pole reverse-tunnel/autossh.
- LD_PRELOAD / /etc/ld.so.preload / profile.d / bashrc / rc.local: puhas.
- Mailcow: ainult `server@xlrent.eu`, pole risto-mailboxi/external-forward'i.
- Coolify-keys: standardsed (localhost, github-app-roland/brrr, coolify-created). "Serveri võti" (no-desc) — verifitseerida, tõen. legit.
- uid 1001 host-passwd's PUUDUB (userdel töötas), tarmo ainus uid≥1000.
- 100.93.186.17 (Vana VPS) viited = ainult docs/session-logs (ajaloolised) + e2e-test-skriptid (xlmarket.store) — mitte aktiivne prod-sõltuvus.

## Märkused
- next-server host-port :3099 (pid 404763) — verifitseerida (kas stray dev-server).

## Lisa-leid (2026-06-10, peale cart-fix'i)
- **`docker_commands` audit-reegel** (`-w /usr/bin/docker -p x`, risto.rules's, jäeti alles) hoiab **auditd ~35% CPU** (auditeerib iga docker-exec'i; 48 konteinerit + Coolify health-checkid = pidev volüüm). EI mõjuta cart'i (lahendatud), AGA obsoletne Risto-era + raiskab CPU → kaaluda eemaldamist remedeerimisel (auditctl -d + risto.rules'ist).

## ✅ REMEDEERITUD (2026-06-10, host, ohutu)
1. **sudoers risto eemaldatud** — `/etc/sudoers.d/risto` (docker) + `/etc/sudoers.d/risto-coolify` (`NOPASSWD: ALL`, "Temporary REMOVE after" kunagi eemaldamata) kustutatud (backup /tmp/tr/), `visudo -c` = parsed OK, risto sudo PUHAS. Latentne root-risk kõrvaldatud.
2. **docker_commands audit-reegel eemaldatud** (runtime + risto.rules) → auditd hetke-CPU 0% (top), load 8.96→1.4. risto.rules nüüd ainult kommentaar (kõik Risto-audit eemaldatud).

## TUVASTATUD (#3-5, OOTAB go't enne muutmist)
3. **SSH-login'id = publickey root** (10.0.1.5 sisemine + 80.235.49.79 väline=Tarmo tõen.). **Password-auth KASUTAMATA** → `PasswordAuthentication no` + `PermitRootLogin prohibit-password` (key-only root) OHUTU (ei lukusta). [soovitus, ootab go't]
4. **authorized_keys (/root/.ssh) kasutus:**
   - `coolify` (SHA256:mHgo...) — 230× → LEGIT.
   - `AgMgO3...` root@Ubuntu — 25× → aktiivne (Tarmo/VS-Code).
   - **`xbyZuT2al/UM/P8X+kNEY/uz+0tekRNHkMcUZzcrwlI` root@Ubuntu — 0× (kasutamata)** → tõen. RISTO jäänuk-võti. **Eemaldamise kandidaat — Tarmo kinnitab et pole tema oma.** [ootab go't]
5. **:3099 next-server** (pid 404763, root, systemd, cwd `/opt/xlmarket-github/storefront/.next/standalone (deleted)`, 5+ päeva) = stray vana bare-metal storefront (pre-Coolify). Obsoletne (Coolify serveerib). Saab peatada (tuvasta systemd-unit) [ootab go't].

## Kood (eraldi, staging→prod): RISTO_ADMIN-allowlist + next.config allowedDevOrigins ["65.109.86.254"] — eemaldada repost.
