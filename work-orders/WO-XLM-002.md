# WO-XLM-002: Medusa backend konfiguratsioon
**Created:** 2026-03-27
**Author:** W-CC (HQ)
**Assignee:** XL
**Department:** xlmarket
**Priority:** P0
**Status:** TODO

---

## Eesmärk
Konfigureerida Medusa.js backend nii, et see toetab xlmarket.eu äriloogikat: Eesti regioon, EUR valuuta, 20% käibemaks, Tarmo admin kasutaja.

## Kontekst
WO-XLM-001 loob infrastruktuuri aluse. See WO seadistab Medusa backendi äriloogika — regioonid, valuutad, maksud, admin kasutaja. Ilma selleta ei saa feedi importerit ega storefront'i ehitada.

## Sammud
1. Medusa konfiguratsiooni seadistamine (`medusa-config.js`)
   - PostgreSQL + Redis ühendused
   - CORS seaded storefront ja admin jaoks
   - File storage (local või S3)
2. Eesti regiooni loomine
   - Regioon: "Estonia" (ee)
   - Valuuta: EUR
   - Riik: EE
   - Käibemaks: 22% (Eesti standard)
3. Tarmo admin kasutaja loomine
   - Email: tarmo@xlmarket.eu
   - Roll: admin
4. Medusa moodulite aktiveerimine
   - Inventory module (laoseisu jälgimine)
   - Product module (tooted, kategooriad)
   - Pricing module (hinnareeglid)
   - Order module (tellimused)
5. Alg-kategooriate loomine (10-15 peakategooriat eesti keeles)
6. Testida API endpointid

## Acceptance Criteria
- [ ] `GET /store/regions` tagastab Eesti regiooni EUR valuutaga
- [ ] Admin paneelis saab sisse logida Tarmo kontoga
- [ ] Admin paneelis on näha kategooriate struktuur
- [ ] `GET /store/products` tagastab tühja loendi (tooted tulevad WO-003-ga)
- [ ] Inventory moodul on aktiivne

## Turvanõuded
- [ ] Admin kasutaja parool on tugev (min 16 tähemärki)
- [ ] API rate limiting on seadistatud

## Handoff märkmed
- Regiooni ID on vajalik WO-003 (feedi import) ja WO-005 (storefront) jaoks
- Kategooriate ID-d on vajalikud WO-004 (kategooriate mapping) jaoks
- Järgmine WO: WO-XLM-003 (XLSX feedi importer)
