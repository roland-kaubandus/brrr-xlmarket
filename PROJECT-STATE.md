# xlmarket — projekti seis

> Viimati uuendatud: 2026-06-03. Metoodika: `/opt/dev-workflow/HANDBOOK.md`. Reeglid+severity: `CLAUDE.md`.

## Stack
Medusa 2.13.5 (backend, port 9000) · Next.js 16 storefront (3030) · PostgreSQL 16 · Redis 7 · MeiliSearch 1.41 · Docker Compose (Coolify-managed).

## Hosting / juurdepääs
- **Server:** 65.21.126.235 (Coolify host, `localhost` destination)
- **Coolify:** projekt `xlmarket` (Root Team), app `brrr-xlmarket:main`, UUID `uo28ovobnflauslqjgxeohl0`
- **Repo:** `/opt/xlmarket-github` ↔ GitHub `roland-kaubandus/brrr-xlmarket` (remote `origin`, main)
- **Secrets:** Vaultwarden `vault.xlrent.eu` (HANDBOOK TR2) — MITTE koodis. Coolify env (Is Secret) + .env.example placeholder'id.
- Redeploy: AINULT Coolify UI (API tokenit pole)

## Live URL-id + seis
| URL | Mis | Seis |
|---|---|---|
| https://xlmarket.ee | storefront (PROD) | ✅ 200 |
| https://api.xlmarket.ee/app | Medusa admin (Coolify-native) | ✅ 200 |
| https://admin.xlmarket.ee/app | Medusa admin (manuaalne Traefik yaml → `medusa` alias) | ✅ 200 |
| https://meili.xlmarket.ee | Meili | ✅ |
| https://staging.xlmarket.ee | storefront (STAGING) | ✅ noindex, email OFF |
| https://staging-api.xlmarket.ee/app | Medusa admin (staging) | ✅ |
| https://staging-meili.xlmarket.ee | Meili (staging) | ✅ |

## Staging keskkond (loodud 2026-06-03)
- **Coolify resource:** `brrr-xlmarket-staging`, UUID `k33g510dw19uyjau3ca7dqpi`, projekt xlmarket, branch `main`, server localhost
- **Isoleeritud:** oma volumes (`k33g510..._xlmarket-{pgdata,meili,redis}`) — EI jaga prod andmeid
- **Kaitsed:** `EMAIL_DISABLED=true` (prod-koopia andmed → ei saada maile), noindex robots (base URL sisaldab "staging"), Montonio sandbox
- **Secrets:** uued POSTGRES/JWT/COOKIE; MEILI_MASTER_KEY + publishable key prod'iga samad. **NB: NEXT_PUBLIC_MEILI_KEY = staging meili OMA search-key** (`7714aed0...`), MITTE prod'i oma — meili default-võtmed on per-instance juhuslikud (mitte master'ist tuletatud). Kõik → Vaultwarden
- **Refresh:** `scripts/staging-refresh.sh` (prod pg → staging + meili reindex). AINULT prod→staging
- **Promote-flow (HANDBOOK §7):** arenda → staging → verify → backup prod → main → prod
- **Coolify API:** token `claude-api` (Root Team, abilities *), instance API lubatud. Token → Vaultwarden. Võimaldab CLI deploy/halduse

## Konteinerid (kõik Coolify-managed, healthy)
`storefront/medusa/db/redis/meili -uo28ovobnflauslqjgxeohl0-144011*`. Medusa cold-boot ~373s (healthcheck start_period 600s). Medusa on lisaks `mailcowdockerized_mailcow-network`'is (email relay).

## Custom kood — võtmefailid
Vt `CLAUDE.md` "Key files". Olulisemad: `scripts/import-vevor-feed.mjs`, `storefront/lib/sanitize.ts` (bounded regex!), `lib/meilisearch.ts`, `backend/medusa-config.ts`, `backend/src/lib/email.ts`, `backend/src/subscribers/order-{placed,shipped}.ts`.

## Email (töötab, 2026-06-03)
Relay = Mailcow smarthost `mail.xlrent.eu:587` (auth `server@xlrent.eu`, parool Vaultwardenis). From `info@xlmarket.ee`, admin+arved `tarmo@naissaar.eu`. SPF+DKIM+DMARC kõik pass (DKIM selector `dkim`, võti mailcow redis'es). Medusa peab olema mailcow-võrgus.

## Tehtud funktsionaalsus (kronoloogiliselt)
- Vt `memory/sessions/` (detailne tööpäevik)
- **2026-06-03:** täielik audit; .ee consistency; admin/medusa routing fix; Coolify ownership-migratsioon Risto tiimist Root Team'i + **Risto täielik offboard**; **Variant 2 redeploy** (esimene edukas Coolify-managed deploy); email relay + DKIM/SPF/DMARC

## Otsused
| Otsus | Põhjendus |
|---|---|
| Coolify destination `localhost` (mitte victorious-vendace) | Vana remote-server SSH katki → redeployd kukkusid; localhost reachable |
| healthcheck start_period 600s | Medusa boot ~373s |
| DKIM ilma domeeni mailcow'sse lisamata | xlmarket.ee MX=Elkdata; lisamine lõhuks inbound'i |
| .eu → .ee kõikjal | xlmarket.ee = canonical live |

## Teadaolevad lõksud / gotchas
Vt `CLAUDE.md` "Gotchas" + `memory/sessions/2026-06-03-xl.md` (Coolify/email gotchas). Peamine: Coolify redeploy = whole-stack downtime ~7min, named volumes püsivad.
