# "Parim pood" — kvaliteedi master-roadmap

**Projekt:** xlmarket.ee (vundament) → korduvkasutatav canarymotors.es, xlmarket-teised-riigid
**Kuupäev:** 2026-06-07
**Staatus:** ELUS — vundament käib
**Omanik:** Tarmo
**Eesmärk:** parim — kiire, töökindel, navigeeritav, leitav, kvaliteetse tõlke/teksti ja parima SEO-ga e-pood
**Alam-specid:** `2026-06-07-scaling-reliability-architecture.md`, `2026-06-06-02-ai-content-pipeline-spec.md`

---

## Põhimõte

"Parim" pole 10 eraldi projekti — **sambad on seotud**. Suur osa SEO-st tuleb sama tööga, mida kiirus + sisu jaoks niikuinii teeme. Ehita vundament üks kord, dokumenteeritult → teised turud pärivad playbook'i.

**Sünergia-südamik:** parim SEO ≈ kiire sait (Sammas 1) + unikaalne mitmekeelne sisu (Sammas 3) + õhuke tehniline-SEO kiht (Sammas 4).

---

## Sammas 1 — Kiirus & töökindlus

*Detail: scaling-reliability-architecture.md. SEO-sünergia: Core Web Vitals → Google reastab kiired saidid kõrgemale.*

| Töö | Staatus |
|---|---|
| Fix #1 (field-trim + Meili-hind) → prod | ✅ tehtud (commit 0119c2d3) |
| DB pool 10/50, LOG_LEVEL=error → prod | ✅ tehtud |
| Browse-cache app-tasand (Next ISR + s-maxage API + /api/revalidate) | ✅ **PROD** (samm 2a, afcad7e4) — dünaamilised no-store läbi CF kinnitatud |
| Cloudflare edge-cache | ✅ **zone AKTIIVNE** (NS-fix töötas 2026-06-07): sait läbi CF (cf-ray, SSL kehtiv), email DNS terve (MX/SPF/DKIM/DMARC alles, mail-host DNS-only). Järgmine: CF cache-reeglid (peale 2a→prod). cf-cache-status veel DYNAMIC (reegleid pole). |
| PgBouncer + replicad + Traefik-LB + worker (Coolify-compose) | ⏭️ Samm 3 (POC ✅ staging'us) |
| Resilient storefront-fallback + rolling/zero-downtime deploy | ⏭️ Samm 4 |
| Monitooring (event-loop-lag, latents, pg-conn) + alerting | ⏭️ Samm 4 |
| k6-koormustest tipp-sihi vastu → capacity-tuuning | ⏭️ Samm 5 |
| Stopgap (12s+retry) prod-cart-kaitse | ✅ jääb |

---

## Sammas 2 — Leitavus & navigatsioon

*"Kõik hästi leitav." SEO-sünergia: puhas URL-struktuur + sisemine linkimine.*

| Töö | Staatus |
|---|---|
| Taksonoomia (2731 sõlme, nav-fix, 100% leitavus) | ✅ tehtud |
| Meili-otsing (sünonüümid 7755, typo-tolerants, displayedAttrs) | ✅ olemas |
| Breadcrumb ET | ✅ tehtud |
| **Otsingu relevantsus/ranking** häälestus (boosting, sorting) | ⏭️ täiendus |
| **Faceted-filtrid** (bränd / hind / atribuut) | ⏭️ suurim leitavus-hoob |
| Mega-menu / navigatsiooni UX | ⏭️ täiendus |
| Seotud tooted / "klient vaatas ka" | ⏭️ täiendus |

---

## Sammas 3 — Sisu & tõlge

*Detail: ai-content-pipeline-spec.md. SEO-sünergia: unikaalne tekst (anti-duplicate) + AI-genereeritud meta/alt.*

| Töö | Staatus |
|---|---|
| Faas 0 — API-võti + krediit (Tarmo) | ⏭️ eeltingimus |
| ET tõlge põhiväljad (title/lühikirjeldus/müügipunktid) | ✅ tehtud |
| Rich-description tõlge (backlog 16602) | ⏭️ peale API-võtit |
| Kategooria auto-klassifikatsioon (asendab vevor/powermat reegli-failid) | ⏭️ |
| Allika-QC (originaalteksti kontroll, konservatiivne) | ⏭️ |
| Glossary (per-keel) + "ära tõlgi" nimekiri | ⏭️ |
| Multi-keel (RU eesti lehele, ES hispaania lehele — feed-first) | ⏭️ |

---

## Sammas 4 — SEO

*Suur osa kaetud Sammastest 1+3; siia jääb õhuke tehniline kiht.*

| Töö | Allikas / staatus |
|---|---|
| **Core Web Vitals** (kiirus) | Sammas 1 (cache/CDN) |
| **Unikaalne sisu** (anti-duplicate dropship-tekstile) | Sammas 3 (tõlge + QC) |
| **Meta-kirjeldused + pildi alt-tekstid** | Sammas 3 (AI-pipeline genereerib) |
| Sitemap.xml + robots.txt | ⏭️ tehniline |
| Canonical-tag'id | ⏭️ tehniline |
| **Structured data** (JSON-LD: Product + Offer + BreadcrumbList → rich-results) | ⏭️ tehniline |
| **hreflang** (rahvusvaheline: ee ET/RU, es ES) | ⏭️ multi-keel/-riik |
| Title-tag'id + H1 struktuur | ⏭️ on-page |

---

## Mobiil & UX (Sammas 1+2 all)
- Responsive (kood valmis, päris-telefonis test ⏭️)
- Checkout-voog sujuv (Montonio e2e test ⏭️)
- Usaldus-signaalid (legal-lehed ET ✅, makse-logod, tarne-info)

---

## Ühtne teostus-järjekord

> Vundament esmalt — kõik muu seisab kiire/töökindla baasi peal. ✋ = vajab Tarmo go'd (HARD RULE #1).

1. ✅ **Fix #1 → prod** (kiirus + threshold) — TEHTUD
2. ⏭️ **Browse-cache + Cloudflare CDN** — teenib korraga kiirust JA SEO-d (Core Web Vitals)
3. ✋ **Skaleerimine** (PgBouncer + replicad + worker) — cart-tee + avab zero-downtime deploy'd
4. ✋ **Töökindlus** (resilient fallback + rolling deploy + monitooring)
5. ✋ **k6-koormustest** → capacity-tuuning → lõplik prod-rollout
6. **Sisu & tõlge** (paralleelne, API-võti avab) — tõlge + klassifikatsioon + QC → ka SEO unikaalne sisu
7. **Leitavus** (faceted-filtrid + otsingu-ranking + nav-UX)
8. **SEO tehniline kiht** (sitemap + canonical + structured data + hreflang + meta/alt)
9. **Mobiil + checkout** e2e test + UX-poleerimine

---

## Korduvkasutus (canarymotors / teised turud)
Iga sammas dokumenteeritud kui **jagatud muster + per-projekt adapter**:
- Kiirus/töökindlus: sama PgBouncer/cache/CDN/scaling muster
- Sisu: sama AI-pipeline, uus glossary/keel per turg (feed-first)
- SEO: sama tehniline kiht + per-turg hreflang
- Leitavus: sama Meili/taksonoomia muster
→ canarymotors ei alusta nullist, vaid pärib valmis playbook'i + teadmised.

---

## Vundamendi staatus (mis JUBA tehtud)
- ✅ Cart-stall diagnoos lõpetatud (juur = #11922 framework, lahendus = arhitektuur)
- ✅ Fix #1 prod'is (field-trim + Meili-hind, hinnad õiged kogu 1-variant kataloogile)
- ✅ DB pool + LOG_LEVEL prod-env'is
- ✅ Skaleerimise POC staging'us tõestatud (PgBouncer + connection-math)
- ✅ Taksonoomia + Meili-otsing + ET põhitõlge
- ✅ 2 alam-speci + see master-roadmap dokumenteeritud
- ⏭️ Tuleviku-guard: multi-variant hinnastus (enne Powermat live'i)
