# 2026-06-12 — Host-ops: mailcow netfilter crash-loop (LAHENDATUD + boot-valideeritud)

**Host:** 65.21.126.235 (jagatud: eumotors + xlmarket + coolify + mailcow `/opt/mailcow-dockerized`).
**Roll:** eumotors.es Claude Code instants (host-ops).

## Probleem
`mailcowdockerized-netfilter-mailcow-1` crash-loop — **RestartCount 255 538**, ~11s tsükkel, logi `CRIT: MAILCOW target is in position 4 in the ip forward table, restarting...`.

## Juurpõhjus
MITTE Docker live'is — **`/etc/iptables/rules.v4`-sse oli salvestatud katkine FORWARD-snapshot** (netfilter-persistent taastas buudil): 3 ACCEPT-i + **duplikaat MAILCOW** + ufw-jäägid mailcow MAILCOW-jumpi kohal. mailcow netfilter nõuab MAILCOW pos 1 → lõputu restart. Docker 29.4.3 + netfilter:1.64; mailcow update ei aitaks (netfilter-image muutumatu). **Docker downgrade POLNUD vaja.**

## Lahendus (read-only diagnoos → kinnitatud sammud)
0. Backup: `/root/fw-backup-2026-06-12-1129.v4`, `/root/rules.v4.bak-2026-06-12-1129`
1. `docker compose stop netfilter-mailcow`
2. Live FORWARD-ist eemaldatud 2× MAILCOW (duplikaat) + 6× surnud ufw-jump (br-mailcow/Docker PUUTUMATA)
3. `/etc/iptables/rules.v4` → minimaalne puhas (`*filter` base + 4 ehtsat host-IP-blokki; 0 docker/mailcow/ufw dünaamikat). Reload/save EI joostud.
4. `docker compose start netfilter-mailcow` → MAILCOW pos 1
5. Monitor 2 min: RC=0, 0 CRIT, pos 1 püsib.

## ✅ Boot-valideeritud (reboot 2026-06-12 12:56, kernel 6.8.0-124)
RC=0 · 0 CRIT · MAILCOW FORWARD pos 1 (üks) · **INPUT-dedup tehtud** (duplikaat kadus boot'il) · postfix:25 kuulab · 48 konteinerit healthy (0 restarting/exited) · egress 200 · rules.v4 = 9 rida (boot-kindel) · reboot-required kustus.

## ⚠️ HARD-RULE (durable — vt mälu [[host-mailcow-netfilter-loop]])
**`netfilter-persistent save` / `reload` dirty live'is on KEELATUD** — see küpsetaks docker/mailcow dünaamilised reeglid uuesti `rules.v4`-sse → loop taastub. `rules.v4` peab sisaldama AINULT ehtsaid host-reegleid; nat/raw/docker/mailcow haldavad end live'is.

**STAATUS: host-ops 100% suletud.** Kordumisrisk: Docker auto-update (host 29.4.3, väga uus) võib mailcow netfilteri uuesti murda.
