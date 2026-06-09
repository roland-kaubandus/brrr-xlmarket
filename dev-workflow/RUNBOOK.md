# XL Market — dev/deploy RUNBOOK

> Viimati: 2026-06-09. Seotud: `LAUNCH-CHECKLIST.md`, `tasks/2026-06-07-scaling-reliability-architecture.md` (§17-20), `ops/maintenance/README.md`.

---

## 1. Keskkonna-mudel

| Keskkond | URL | Roll | Andmed | Indekseeritav? |
|---|---|---|---|---|
| **PROD (laiv)** | **xlmarket.ee** | avalik pood — **GATE'i taga (coming-soon) kuni launch** | prod | gate=noindex; launch'il indekseerib |
| **STAGING** | **staging.xlmarket.ee** | test + **Tarmo review** (peegeldab launch-vaadet) | prod-koopia (refresh) | **EI** (robots Disallow:/, email OFF) |
| (api) | api.xlmarket.ee | Medusa admin/API (uo28) | prod | — |
| (meili) | meili.xlmarket.ee | Meilisearch | prod | — |
| ~~dev.xlmarket.ee~~ | — | **EI kasutata** (502, kahjutu kasutamata alamdomeen; staging katab review) | — | — |

**PROD-topoloogia (Variant D, Coolify-managed, persistentne):** pgbouncer + 1 medusa (server→pgbouncer) + medusa-worker (worker-mode, staggered sleep 900) + db + redis + meili + storefront. 2. web-replica edasi lükatud k6-ni (Sammas 5). Vt §20.

**Gate-mehhanism:** `xlmarket-maintenance` (nginx, Traefik `Host(xlmarket.ee)` **priority=200** > storefront) `coolify`-võrgus. Serveerib coming-soon't. Vt `ops/maintenance/README.md`. **Hoiatus:** ÄRA stopi enne launch'i (eelmine sessioon tegi seda kogemata 2026-06-05 → pärispood paljastus avalikult).

---

## 2. Arendus-voog (muudatus → laiv)

```
1. Kood → commit → push main (kõik prod+staging jälgivad main'i)
2. Deploy STAGING (Coolify k33g redeploy) → staging.xlmarket.ee
3. Tarmo REVIEW staging.xlmarket.ee'l (peegeldab launch-vaadet; prod-andmed kui refresh tehtud)
4. Tarmo kinnitab → PROD-deploy ÖÖSEL (madal liiklus, watched-aken, HARD RULE #1: oota go't)
5. Verifi prod (health, hinnad, CMS, auth, /et+toode 200) → rollback kohe kui tõrge
```

- **Praegu downtime ~13min prod-deploy'l** (medusa recreate, browse püsib CF + warm-cache). **Zero-downtime** tuleb peale 2.-replica + rolling-deploy (Sammas 4-5).
- Prod-deploy = Coolify redeploy (rebuild ~3min + medusa boot ~13min + worker staggered ~+15min). Parool ei muutu (rotatsioon B2 tehtud).

---

## 3. STAGING-refresh (prod-andmed → staging)

Et staging peegeldaks täpselt launch-vaadet:
```bash
bash scripts/staging-refresh.sh
```
Teeb: prod pg_dump → staging restore (safety: prod≠staging, volume-isolatsioon) → staging medusa restart → meili reindex. ~10min. Email staging'us OFF, robots Disallow:/ (ei Google'isse). AINULT suund prod→staging.

---

## 4. LAUNCH (gate maha → pood avalikuks)

Kui pood valmis + Tarmo OK:
```bash
docker stop xlmarket-maintenance && docker rm xlmarket-maintenance
```
→ uo28 storefront võtab xlmarket.ee üle (priority-konkurent kadunud) → **pärispood avalik**.
Peale: verifi xlmarket.ee → pood (mitte coming-soon), robots indekseerib (env-aware robots.ts), CF cache värske (`purge_everything`), sitemap, hinnad. Vt `LAUNCH-CHECKLIST.md`.

**Reversiibel:** kui vaja gate tagasi → `ops/maintenance/README.md` käivitus-käsk.

---

## 5. Rollback-praktika

- **Prod-deploy tõrge:** revert commit (`git revert` / eelmine HEAD) + Coolify redeploy. VÕI graatsiline: kui worker-fail → medusa üksi serveerib; kui medusa-fail → eelmine image.
- **Andmebaas:** parool roteeritud (B2); `docker exec <db> pg_dump` backup enne riskantset migratsiooni. Coolify-auto-DB-backup'e POLE (compose-postgres).
- **Cache:** CF `purge_everything` (token prod-medusa env CF_API_TOKEN, node-fetch konteineri seest, EI logi) + Next ISR `/api/revalidate`.
- **Stopgap (12s+retry cart-kaitse) JÄÄB** kuni k6-load-test prod-arhitektuuril kinnitab (eraldi go eemaldamiseks).

---

## 6. (Valikuline) Tarmo näeb prodi gate'i taga
Kui Tarmo tahab TÄPSELT prod-xlmarket.ee't (mitte staging) eelvaadata avaliku gate'i taga:
- **IP-bypass:** maintenance-router lisa `ClientIP` välistus Tarmo IP-le (vaja Tarmo püsi-IP).
- **Secret-cookie:** maintenance asenda nginx → kontrolli cookie't, proxy storefront'i kui õige (vaja nginx-proxy-konf, suurem muudatus).
- Muidu **staging.xlmarket.ee review piisab** (sama kood + prod-andmed).

---

## Viited
- Skaleerimine + cutover-ajalugu: `tasks/2026-06-07-scaling-reliability-architecture.md` §17-20
- Gate: `ops/maintenance/README.md`
- Launch: `LAUNCH-CHECKLIST.md` | Seis: `PROJECT-STATE.md` | Backlog: `PUNCH-LIST.md`
