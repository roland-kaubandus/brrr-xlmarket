# Coolify Install Plan — VPS 65.109.86.254

> Auditeeritud 2026-04-30 00:20.
> Server: AMD Ryzen 5 3600, 62GB RAM, 436GB disk (76% täis), 81 päeva uptime.
> Sihtmärk: paigaldada Coolify olemasolevasse VPS-i ilma midagi katki tegemata, järk-järgult migreerida projektid.

## Audit — mis seal praegu jookseb

### Live e-poed (kolm)
- **xlmarket** (`xlmarket.eu` + `xlmarket.store`) — VEVOR e-pood Eestile. 14 842 toodet. PM2 (5 cluster worker storefront port 3030) + systemd `xlmarket-medusa.service` (port 9001) + Docker (PG port 5435, Redis port 6380) + host meilisearch.service (port 7700). Nginx reverse proxy.
- **wingit** (`wingit.ee`) — lennupiletid. Docker compose (front 3020 ei kuula praegu? backend 8002, DB 5434).
- **canaryparts** (`canaryparts.brrr.ee` + `admin.canaryparts.brrr.ee`) — Tenerife auto varuosad. PM2 (web 3032, admin 3031) + Docker (PG 5436).

### Live tooted
- **autoradar** (`autoradar.brrr.ee`) — autokuulutused. Docker compose (front 3010, back 8001, DB 5433).
- **declar.ee** (`declar.ee` + `app.declar.ee` + `api.declar.ee` + `preview.declar.ee`) — ehituse AI tooted. systemd (`declar-api`, `declar-budget-api`, `declar-web-v3` port 3012, port 8512). PG 5437.
- **huly** (port 8088, 8094) — projektihaldus. 14-container Docker compose. SISEMINE.

### Live infra
- **printer2** (port 8373, 8375, 8376) — futuuride trading dashboard + datahub. systemd (`brrr-dashboard.service`, `brrr-datahub.service`). **JÄTAME PUUTUMATA** — latency-sensitive.
- **email** — Postfix + Dovecot port 25, 143, 993.
- **Samba** — port 139, 445.
- **VS Code Server** — port 17689, 39237, 42363.
- **Cloudflare tunnel** — port 20241.

### Identifitseerimata / kahtlased
- **port 8086** — python3 skript (mis?)
- **port 8093** — python3 skript (mis?)
- **port 8095** — python3 (kavandid mockupid)
- **port 8888** — python3 (mis?)
- **port 8899** — python3 (mis?)
- **port 3000** — bun (mis?)
- **port 3002** — bun (mis?)
- **port 3035** — python3 (mis?)
- **port 3040** — next-server (mis?)

### Cron-id mis tuleks puhastada
Kõik `#PAUSED#` ja `#AUDIT_PAUSE#` read crontabist (vt user crontab) — need on lihtsalt segadust tekitavad. Kas kustutada või uuesti aktiveerida.

### Resurss
- RAM: 20GB kasutuses 62GB-st (vaba 42GB) — **rikkalik**.
- Swap: 9.9GB kasutuses 31GB-st — **liiga palju** (viitab et mingi teenus mälu surusub). Vaja uurida.
- Disk: 312GB / 436GB (76%). 102GB vaba — **piisav, kuid mitte rikkalik**.
- CPU: 6 tuum 12 thread, scaling 66%.

## Plaan — 4 faasi

### Faas 1 — puhastus (30 min, sina kinnita igaks)

1. Tuvasta identifitseerimata pordid (8086, 8093, 8888, 8899, 3000, 3002, 3035, 3040 jne) — saadan käsud, sa kontrollid.
2. Eemalda `#PAUSED#` ja `#AUDIT_PAUSE#` cron read kasutaja crontabist.
3. Eemalda `nginx/sites-enabled/xlmarket-media-temp` (kui kinnitad et pole vaja).
4. Audit swap kasutust (mis protsess seda pruugib?).

### Faas 2 — Coolify install (30 min)

- Coolify paigaldatakse port **8000** (UI) + **8443** (HTTPS gateway) peale.
- **EI** kasuta port 80/443 — need jäävad olemasolevale nginx-le.
- Ligipääs Coolify UI'sse läbi **Cloudflare Tunnel** (`coolify.brrr.ee`) või **Tailscale**.
- Install käsk: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash`.
- Olemasolev Docker daemon jagatakse Coolify'ga (Coolify ei paigalda eraldi).

### Faas 3 — kerged migratsioonid esimesena (3-4h)

Järjekord (ohutuim → keskmine):

1. **kavandid** (port 8095) — Coolify staatiline projekt, test
2. **autoradar** — Docker compose juba valmis, lihtne import
3. **wingit** — Docker compose juba valmis, lihtne import
4. **canaryparts** — vaja PM2 storefront panna ka Docker'iks, siis import

Iga migratsiooni järel:
- Veendu et töötab Coolify Traefik kaudu (port 8443)
- Vaheta DNS vana nginx → Coolify Traefik
- Eemalda nginx site
- Eemalda PM2 entry

### Faas 4 — xlmarket migratsioon (2-3h)

`docker-compose.yml` on juba valmis (vt `COOLIFY_DEPLOY.md`). Migratsioon Coolify'sse läheb sama plaani mööda.

### Mida MITTE teha

- **printer2** jätta puutumata (latency-sensitive).
- **huly** jätta lõpuni — 14-container compose, suur risk.
- **declar.ee** mitte kiirustada — 3 systemd service'it, hindaja Streamlit.
- **email + Samba** jätta täielikult puutumata.

## Riskid

| Risk | Maandus |
|---|---|
| Coolify Traefik kakeleb nginxiga port 80/443 üle | Coolify port 8000 + 8443, nginx jääb 80/443 |
| Olemasolev Docker daemon konflikt | Coolify kasutab sama daemon'i, ei paigalda uut |
| Vana xlmarket-medusa systemd jätkab kõrval | Migratsiooni järel `systemctl disable xlmarket-medusa.service` |
| DNS cutover xlmarket.eu → Coolify | Vahetu rollback nginx-le võimalik (nginx site fail jääb alles, ainult enable/disable) |
| Disk 76% täis | Coolify lisab ~2GB, jätkukski. Pre-migratsioon: kustuta vana data/feeds logi |

## Otsuste leheke

- [ ] Coolify domeen: `coolify.brrr.ee` (Cloudflare Tunnel) või `100.93.186.17:8000` (Tailscale)?
- [ ] xlmarket-media-temp — kustutada?
- [ ] Identifitseerimata pordid — mis nad on?
- [ ] `#PAUSED#` cron read — kustutada või aktiveerida?
- [ ] Migratsiooni järjekord — kavandid → autoradar → wingit → canaryparts → xlmarket?
- [ ] xlmarket DNS cutover — kohe Coolify peale või etapiti (nginx-prox-Coolify-prox)?

## Järgmised sammud

1. Sina vasta otsuste lehekül
2. Mina kirjutan iga faasi käskude listi
3. Sina jooksed käsud, kopeerid väljundit tagasi
4. Kontrollime igal sammul et midagi pole katki

---

**Audit teostatud 2026-04-30 00:20 EEST. Plaan koostatud rahulikult, mitte väsinud öösel kell 00:25.**
