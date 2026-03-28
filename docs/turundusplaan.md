# XLMARKET Turundus- ja SEO plaan

> Roland Kaubandus OÜ | xlmarket.eu
> Koostatud: 2026-03-28

---

## 1. SEO strateegia

### 1.1 Tehniline SEO (TEHTUD)
- [x] Sitemap.xml — 10,733 URLi, auto-genereerimine iga 4h
- [x] robots.txt — korrektsed disallow reeglid
- [x] JSON-LD structured data (Organization, Product, BreadcrumbList)
- [x] Meta tags (title, description, OG, Twitter Card) kõigil lehtedel
- [x] HTML lang="et" korrektne
- [x] Canonical URLs
- [x] Gzip compression nginx'is
- [x] Static asset caching (1 aasta immutable)

### 1.2 On-page SEO
- [x] Eestikeelsed URL-id (/kategooriad, /toode, /ostukorv)
- [x] H1-H3 hierarhia korras
- [x] Alt-tekstid toote piltidel
- [ ] Tootenimed eesti keeles (tõlkimine käib — ~14K toodet)
- [ ] Tootekirjeldused eesti keeles (tõlkimine planeeritud)

### 1.3 Sisustrateegia
- Blogi/uudised leht (planeeritud WO-016 scope)
- Kategooria kirjeldused (SEO tekst iga kategooria lehel)
- Ostujuhendid (nt "Kuidas valida tööriista" artiklid)

### 1.4 Tehniline jõudlus
- Next.js ISR (Incremental Static Regeneration) — 5 min revalidate
- Pildioptimeerimine: Next.js Image component + lazy loading
- VEVOR CDN pildid (ei kopeeri oma serverisse)

---

## 2. Google Ads plaan

### 2.1 Kampaanitüübid
| Kampania | Eelarve/kuu | Eesmärk |
|----------|-------------|---------|
| Shopping Ads | 500-1000€ | Toodete näitamine Google Shopping'is |
| Search Ads (brand) | 100-200€ | "xlmarket" brändi kaitsmine |
| Search Ads (generic) | 300-500€ | "tööriistad osta", "VEVOR Eesti" |
| Performance Max | 200-400€ | Automaatne optimiseeritus |

### 2.2 Esimese kuu tegevused
1. Google Merchant Center konto loomine
2. Tootefeedi ühendamine (osta.ee XML format sobib)
3. Google Ads konto + konversioonide jälgimine
4. Esimene Shopping kampania käivitamine
5. Brändi kaitse kampania

### 2.3 Märksõnastrateegia
**Kõrge prioriteet:**
- "VEVOR tooted Eesti"
- "tööriistad veebipoest"
- "VEVOR treipink"
- "metallitreimine seade"
- Kategooriapõhised: "ehitustööriistad", "aiatööriistad", "autohooldus"

**Madal prioriteet (algul välistada):**
- Liiga üldised: "pood", "osta"
- Konkurendid: Bauhaus, K-Rauta, Toool

---

## 3. Facebook/Meta Ads plaan

### 3.1 Infrastruktuur (TEHTUD)
- [x] Facebook Commerce Feed — 10,714 toodet
- [x] Meta Pixel integratsioon (nõusolekupõhine)
- [ ] Meta Pixel ID seadistamine .env-s
- [ ] Facebook Business Manager konto
- [ ] Facebook Commerce Catalog

### 3.2 Kampaanitüübid
| Kampania | Eelarve/kuu | Eesmärk |
|----------|-------------|---------|
| Dynamic Product Ads | 300-500€ | Retargeting + prospecting |
| Catalog Sales | 200-400€ | Tootekataloogi reklaam |
| Traffic | 100-200€ | Brändi tuntus |

### 3.3 Sihtrühmad
- **Retargeting:** Saidi külastajad (Pixel), ostukorvi hülgajad
- **Lookalike:** Ostjate sarnased (pärast esimesi oste)
- **Huvi:** Ehitus, remont, aiandus, autohooldus
- **Geograafiline:** Eesti

---

## 4. osta.ee integratsioon (TEHTUD)

- [x] XML feed genereeritud (10,719 toodet)
- [x] Auto-uuendamine iga 4h
- [ ] osta.ee konto registreerimine ja feedi lisamine
- [ ] Osta.ee partner API (kui saadaval)

**Feed URL:** https://xlmarket.eu/feeds/osta-ee.xml

---

## 5. E-posti turundus

### 5.1 Transaktsioonimeilid (TEHTUD)
- [x] Tellimuse kinnitus
- [x] Saatmise teavitus
- [x] Admin teavitus (uus tellimus)

### 5.2 Turundusmeili plaan
- Uudiskiri registreerimine (footer + checkout)
- Kuupakkumised (automaatne, kategooriapõhine)
- Hülgatud ostukorvi meeldetuletus (Medusa workflow)
- Tööriist: SendGrid (konto loomise ootel)

---

## 6. Ajakava — Esimesed 30 päeva

| Nädal | Tegevus |
|-------|---------|
| N1 (31.03-06.04) | DNS seadistus, SSL, osta.ee registreerimine |
| N1 | Google Merchant Center + Search Console |
| N1 | Meta Pixel ID seadistus, FB Business Manager |
| N2 (07.04-13.04) | Google Shopping esimene kampania |
| N2 | Facebook Dynamic Ads esimene kampania |
| N2 | Tootetõlked valmis (masinatõlge) |
| N3 (14.04-20.04) | Google Ads optimeerimine, A/B test |
| N3 | Uudiskirja registreerimise vorm |
| N4 (21.04-27.04) | Performance analüüs, eelarve korrigeerimine |
| N4 | Esimene turundusmeili saatmine |

---

## 7. KPI-d ja mõõdikud

| Mõõdik | Kuu 1 eesmärk | Kuu 3 eesmärk |
|--------|---------------|---------------|
| Saidi külastajad | 5,000 | 20,000 |
| Konversioonimäär | 0.5% | 1.5% |
| Keskmine tellimus | 80€ | 100€ |
| Tellimusi/kuu | 25 | 300 |
| Käive/kuu | 2,000€ | 30,000€ |
| ROAS (reklaam) | 2x | 4x |

---

## 8. Eelarve kokkuvõte

| Kanal | Kuu 1 | Kuu 2+ |
|-------|-------|--------|
| Google Ads | 500€ | 1,000-2,000€ |
| Facebook Ads | 300€ | 500-1,000€ |
| osta.ee | 0€ (tasuta feed) | 0€ |
| E-posti marketing | 0€ (SendGrid free tier) | 0-20€ |
| **Kokku** | **800€** | **1,500-3,000€** |

---

*Plaan koostatud XL agendi poolt. Kinnitab: Risto/Tarmo.*
