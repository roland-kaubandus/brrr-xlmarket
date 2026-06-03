# xlmarket — Launch-checklist (enne reaalset müüki)

> Viimati uuendatud: 2026-06-03. Sait on tehniliselt live (xlmarket.ee 200), aga REAALSEKS MÜÜGIKS vajab allolevat.

## 🔴 Blokeerivad (ilma nendeta EI tohi müüki avada)
- [ ] **Montonio makse** — provider integreeritud, test + live võtmed (Vaultwarden), checkout end-to-end testitud
- [ ] **Tellimuse vormistus** end-to-end (cart → checkout → makse → tellimus loodud Medusas)
- [x] **Email tellimuse kinnitus** — relay töötab, SPF/DKIM/DMARC pass ✅ *(order-placed aktiivne; order-shipped testida)*
- [ ] **Tarne-teavitus** email testitud (order-shipped.ts)
- [x] **Backup + restore** — `scripts/backup.sh` olemas; restore testida
- [x] **Secrets Vaultwardenis** — SMTP/DB/JWT Coolify Is Secret; .env.example placeholder'id ✅
- [ ] **SSL kehtiv** — kontrolli Let's Encrypt (mitte self-signed) kõigil domeenidel
- [ ] **Õiguslikud lehed** sisustatud — tingimused, privaatsus, tagastus, tarne (CMS)

## 🟡 Enne live'i soovituslik
- [x] SEO: sitemap, robots (.ee), canonical, JSON-LD ✅
- [ ] Monitooring / uptime alert (nt Coolify sentinel + väline)
- [ ] Analytics / Pixel (PostHog setup olemas — kontrolli)
- [x] 404/error lehed ✅
- [ ] Mobiilivaade testitud (brauseris)
- [ ] Admin basic-auth (xl-admin)

## xlmarket-spetsiifiline
- [ ] Hinnavalem *1.15 (käibemaks) kõigil toodetel õige
- [ ] Meili index täielik (17105 dok) + sünonüümid + price/taxonomy
- [ ] VEVOR feed-sync cron töötab (4h) — ei tühjenda Meili indeksit
- [ ] ET-tõlked piisavas mahus (vähemalt top-kategooriad)
- [ ] osta.ee XML feed + Facebook Commerce (kui vaja)
