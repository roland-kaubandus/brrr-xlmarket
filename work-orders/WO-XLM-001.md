# WO-XLM-001: Repo, Docker ja infrastruktuuri alus
**Created:** 2026-03-27
**Author:** W-CC (HQ)
**Assignee:** XL
**Department:** xlmarket
**Priority:** P0
**Status:** DONE

---

## Eesmärk
Luua brrr-xlmarket repo täisstruktuur, Docker Compose keskkond ja nginx config nii, et Medusa backend + PostgreSQL + Redis + Next.js storefront käivituvad ühekorraga.

## Kontekst
See on xlmarket.eu e-poe esimene WO. Ilma toimiva infrastruktuurita ei saa ühtegi järgnevat WO-d alustada. Repo struktuur, CLAUDE.md ja settings.json on juba loodud W-CC poolt.

## Sammud
1. Initsialiseerida Medusa.js 2.0 projekt `backend/` kausta
   - `npx create-medusa-app@latest` või käsitsi setup
   - Konfigureerida PostgreSQL ja Redis ühendused
   - Seadistada Eesti regioon (EUR, et-EE)
2. Luua Next.js 15 storefront `storefront/` kausta
   - Medusa Next.js starter template
   - Tailwind CSS konfig
   - Eesti locale seadistus
3. Seadistada Medusa admin `admin/` kausta
   - Admin UI build
   - Tarmo kasutaja loomine
4. Kirjutada Dockerfile-id kõigile teenustele
5. Testida `docker compose up` — kõik teenused käivituvad
6. Seadistada nginx config (IP-based)
   - `sudo ln -s /home/brrr/brrr-xlmarket/nginx/xlmarket.conf /etc/nginx/sites-enabled/xlmarket.eu`
   - `sudo nginx -t && sudo systemctl reload nginx`

## Acceptance Criteria
- [x] `docker compose up -d` käivitab DB + Redis; Medusa ja storefront jooksevad hostil dev-režiimis
- [x] `curl http://127.0.0.1:9001/health` tagastab 200
- [x] Medusa admin (port 9001/app — Medusa 2.0 built-in) avaneb ja saab sisse logida
- [x] Next.js storefront (port 3030) näitab avalehte
- [x] nginx (port 8090) proxib /store/, /admin/, /app, /auth/, /health → Medusa; / → storefront

## Turvanõuded
- [x] .env fail EI OLE gitis (lisatud .gitignore-sse)
- [x] PostgreSQL kuulab AINULT localhost (127.0.0.1:5435)
- [x] Redis kuulab AINULT localhost (127.0.0.1:6380)
- [x] Admin paneel on kaitstud autentimisega (JWT auth)

## Handoff märkmed
- Docker Compose on juba olemas: `docker-compose.yml`
- nginx config on juba olemas: `nginx/xlmarket.conf`
- .env.example on juba olemas: `.env.example`
- Järgmine WO (WO-XLM-002) seadistab Medusa backendi detailid
