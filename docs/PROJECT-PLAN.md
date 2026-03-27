# xlmarket.eu — Projekti plaan

**Tellija:** Roland Kaubandus OÜ (kontakt: Tarmo)
**Algus:** 2026-03-27
**Projekt:** brrr-xlmarket

---

## Ülevaade

xlmarket.eu on Eesti e-pood, mis müüb VEVOR tooteid 15% juurdehindlusega. Tooted imporditivad automaatselt VEVOR XLSX feedist (~14 356 toodet). Pood on eestikeelne, minimalistliku disainiga ja Montonio makselahendusega.

## Tehniline stack

| Komponent | Tehnoloogia | Port |
|-----------|-------------|------|
| Backend | Medusa.js 2.0 | 9001 |
| Storefront | Next.js 15 + Tailwind | 3030 |
| Admin | Medusa Admin | 7001 |
| Andmebaas | PostgreSQL 16 | 5435 |
| Cache | Redis 7 | 6380 |
| Reverse proxy | nginx | 80/443 |

## Faasid

### Faas 0: Alus (nädal 1)
| # | WO | Pealkiri | Prioriteet | Staatus |
|---|-----|----------|-----------|---------|
| 1 | WO-XLM-001 | Repo, Docker, infrastruktuur | P0 | IN PROGRESS |
| 2 | WO-XLM-002 | Medusa backend konfig | P0 | TODO |

### Faas 1: MVP (nädalad 2-4)
| # | WO | Pealkiri | Prioriteet | Staatus |
|---|-----|----------|-----------|---------|
| 3 | WO-XLM-003 | XLSX feedi importer + hinnaarvutus | P0 | TODO |
| 4 | WO-XLM-004 | Kategooriate mapping | P0 | TODO |
| 5 | WO-XLM-005 | Storefront: avaleht, kategooriad, tooted, otsing | P0 | TODO |
| 6 | WO-XLM-006 | Ostukorv ja checkout | P0 | TODO |
| 7 | WO-XLM-007 | Montonio maksete integratsioon | P0 | TODO |
| 8 | WO-XLM-008 | Email teavitused | P1 | TODO |

### Faas 2: Viimistlus ja käivitus (nädalad 5-6)
| # | WO | Pealkiri | Prioriteet | Staatus |
|---|-----|----------|-----------|---------|
| 9 | WO-XLM-009 | Brändi disain (font-based, ilma ikoonideta) | P1 | TODO |
| 10 | WO-XLM-010 | Eesti keele lokaliseerimine | P1 | TODO |
| 11 | WO-XLM-011 | Domeen, SSL, nginx lõppseadistus | P1 | TODO |
| 12 | WO-XLM-012 | SEO ja jõudluse optimeerimine | P1 | TODO |

### Faas 3: Integratsioonid ja turundus (nädalad 7-8)
| # | WO | Pealkiri | Prioriteet | Staatus |
|---|-----|----------|-----------|---------|
| 13 | WO-XLM-013 | osta.ee XML feed | P1 | TODO |
| 14 | WO-XLM-014 | Facebook toote feed + Pixel | P1 | TODO |
| 15 | WO-XLM-015 | CMS sisublokid (bannerid, reklaam) | P1 | TODO |
| 16 | WO-XLM-016 | Turundus- ja kommunikatsiooniplaan + SEO | P2 | TODO |

### Faas 4: Laiendamine (tulevikus)
- Läti ja leedu keeletugi
- Multi-regioon hinnakujundus
- Kampaaniad ja automaatturundus

## Sõltuvusgraaf

```
001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → MVP ✓
                                009 (paralleelselt)
MVP → 010, 011, 012 → 013, 014, 015 → 016
```

## Tootefeedi pipeline

```
S3 XLSX → Download (iga 4h) → Parse → Hind * 1.15 → Upsert Medusasse
```

- 14 356 toodet, 1 688 kategooriat
- Laoseis: reaalajas kogused
- Pildid: VEVOR CDN URL-id

## Hinnavalem

```
lõpphind = algne_hind * 1.15
```

Algne hind feedis sisaldab juba käibemaksu. Korrutame 1.15-ga ja see ongi meie lõpphind.

## Kvaliteedikontroll

Iga WO läbib:
```
Kirjutaja(d) → Review 1 (funk.) + Review 2 (UI) → Testija → Gatekeeper
```

## MVP definitsioon

MVP on valmis kui:
- [ ] Tooted on imporditud feedist õigete hindadega
- [ ] Kategooriad on kureeritud ja loogilised
- [ ] Saab tooteid sirvida ja otsida
- [ ] Ostukorv ja checkout töötavad
- [ ] Montonio makse läbib
- [ ] Tellimuse email jõuab kohale
- [ ] Admin paneel on Tarmole ligipääsetav
