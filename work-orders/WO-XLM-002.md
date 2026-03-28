# WO-XLM-002: Medusa backend konfiguratsioon
**Created:** 2026-03-27
**Author:** W-CC (HQ)
**Assignee:** XL
**Department:** xlmarket
**Priority:** P0
**Status:** DONE

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
- [x] `GET /store/regions` tagastab Eesti regiooni EUR valuutaga (reg_01KMRXWSNXSYE4530A3K2BK86W)
- [x] Admin paneelis saab sisse logida Tarmo kontoga (tarmo@xlmarket.eu, JWT auth)
- [x] Admin paneelis on näha 11 kategooriat eesti keeles
- [x] `GET /store/products` tagastab tooted (14 310 toodet — imporditud WO-003-ga)
- [x] Inventory moodul on aktiivne (manage_inventory: true, stocked_quantity töötab)

## Turvanõuded
- [x] Admin kasutaja parool on tugev (20+ tähemärki)
- [ ] API rate limiting on seadistatud — TODO: lisada nginx rate limiting

## Handoff märkmed
- Regiooni ID on vajalik WO-003 (feedi import) ja WO-005 (storefront) jaoks
- Kategooriate ID-d on vajalikud WO-004 (kategooriate mapping) jaoks
- Järgmine WO: WO-XLM-003 (XLSX feedi importer)
