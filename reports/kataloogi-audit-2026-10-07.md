# Kataloogi klassifikatsiooni-audit — 2026-10-07 (ÖÖ)

> Ööne töö: kogu kataloogi klassifikatsiooni DRY-audit uue ahelaga (`lib/classify-chain.mjs`).
> **Seis: AUDIT EI KÄIVITUNUD — hinnanguline kulu ÜLE $50 kulupiiri.** Direktiivi värav: *"Kui hinnang > $50 → ära alusta, kirjuta raport ja oota hommikut."* Täidetud.

---

## 🛑 OTSUS — audit EI alanud (kulupiir)

| | |
|---|---|
| **Hinnang (keskmine, batch-API)** | **$61.71** |
| **Kulupiir** | $50.00 |
| **Tulemus** | üle piiri → **ei alustatud ühtegi LLM-kutset** |
| **Tehtud kulu täna öösel** | **$0.00** (ainult DB-lugemine + prompt-mõõtmine) |

Preflight-andmed (masinloetav): `reports/audit-preflight-2026-10-07.json`.

---

## Ulatus (DB-st, read-only)

| Mõõt | Arv |
|---|---|
| Klassifitseeritud tooted (draft+published, OMAB kategooriat) | **18 902** |
| Neist L3-kategooriaga | 18 893 |
| **Klastreid** (`clusterKeyOf`) | **5 226** |
| — SPU-klastrid | 18 058 toodet |
| — vevor_product_type (ilma SPU) | 843 toodet |
| — title-only | 1 toode |
| Kandidaat-L3 (ahela sihtmärgid) | 1 684 |

Üks otsus klastri kohta (direktiiv) — 18 902 toodet → **5 226 ahela-otsust**.

---

## Kulu-hinnang — miks üle piiri

Dominant-kulu = **kandidaat-L3 nimekiri (1 684 L3 ≈ 37 280 tokenit) korratakse IGA kohtunik+referents kutse sisendis.** 5 226 klastrit / 40 klastrit-kutse = 131 kohtunik + 131 referents kutset; iga kutse kannab terve 37k-tokeni kandidaatlisti.

| Komponent | Mudel | Batch $ | Standard $ |
|---|---|---|---|
| Kohtunik | Opus 4.8 | $21.72 | $43.44 |
| Referents | Sonnet 5 | $12.94 | $25.88 |
| Viigimurdja | Fable 5 | $27.04 | $54.09 |
| **KOKKU** | | **$61.71** | **$123.41** |

### Tundlikkus (otsustav teadmata = lahkheli-määr → Fable-kutsete arv)

| Klastrit/kutse | Lahkheli | Batch $ | Piiri all? |
|---|---|---|---|
| 40 | 10% | $45.47 | ✅ |
| 40 | 15% | $50.88 | 🛑 |
| 40 | 20% | $56.28 | 🛑 |
| 40 | 25% | $61.69 | 🛑 |
| 48 | 10% | $42.12 | ✅ |
| 48 | 15% | $47.53 | ✅ |
| 48 | 20% | $52.93 | 🛑 |
| 48 | 25% | $58.34 | 🛑 |

**Tõlgendus:** audit mahub $50 alla AINULT kui kohtunik↔referents lahkheli ≤ ~15%. Juba-klassifitseeritud kataloogi puhul VÕIB konsensus olla kõrge (enamik tooteid õiges kodus → vähe Fable-viigimurdmist), aga seda EI TEA ette. Aus keskmine eeldus (20–25%) jääb üle piiri → värav rakendus.

---

## ⚖️ Valikud hommikuks (Tarmo otsustab)

1. **Odav kalibreerimis-proov (~$1–2):** jooksuta kohtunik+referents AINULT ~150 juhu-klastril, mõõda tegelik lahkheli-%. Kui ≤15% → terve audit mahub $50 alla → käivita. See lahendab ebakindluse enne täiskulu.
2. **Tõsta kulupiir ~$65-ni** → käivita kohe (keskmine hinnang $61.71).
3. **Odavam 2-astme arhitektuur (VAJA ÄRA TEHA, soovitus):** auditi EI pea sõeluma iga klastrit terve 1 684-L3 nimekirja vastu. Esmane odav sõel (üks Sonnet/Haiku kutse: "kas praegune L3 õige? kui ei → top-3 alternatiivi") → täis-ahelasse (kohtunik→referents→Fable) lähevad AINULT kahtlased klastrid. See kärbib kandidaatlisti-kulu (dominant) kordades → terve audit tõenäoliselt < $15. **Ehitus = eraldi töö (mitte öösel improviseerida).**
4. **Kitsenda ulatus** (nt ainult aiatooted / ainult kahtlased vevor_product_type'id) — väiksem, aga ei kata tervet kataloogi.

---

## Aiatoodete kontroll (mururull / kultivaator)

**Seis: OOTEL** — audit ei jooksnud, seega ahel ei saanud neid esile tõsta. Kontroll tehakse kohe, kui audit (valik 1–4 järgi) käivitatakse. *(Odava eelvaate saab DB-heuristikaga: mururull/turf-roll + kultivaator/cultivator `vevor_product_type` vs praegune L3 — teen soovi korral.)*

---

## Uued L3-kandidaadid + kattuvused

**Seis: OOTEL** — need tulevad ahela väljundist (shadow-väravad: nimi/DUP/täielikkus; `taxonomy_overlap_signal`). Audit ei jooksnud → pole andmeid.

---

## Klassifikaatori seis (read-only, täna öösel)

| | |
|---|---|
| `classifier_config.auto_create_enabled` | **false** (shadow-režiim, Variant 1) |
| reason | `algseis — shadow-režiim (Variant 1)` |
| updated_at | 2026-10-06 19:42 UTC |
| `classifier_shadow_ledger` | 0 rida |

---

## Öine import-pipeline [4] tulemus

**Cron:** `0 3 * * * /opt/xlmarket-github/scripts/import-pipeline-cron.sh` (03:00 host CEST = 04:00 EE).

**Seis: OOTEL** — pipeline jookseb 03:00; DB-vaikuse aken 02:45–04:30 (ei koormata DB-d). Tulemus (kas [4] ahel-hook jooksis, auto-assign/shadow arvud, koodivead) kogutakse **pärast 04:30** ja lisatakse siia.

<!-- PIPELINE-[4]-TULEMUS-SIIA -->

---

## Ohutus (täidetud)

- ✅ Read-only: ainult DB-lugemine + prompt-suuruste mõõtmine. 0 LLM-kutset, 0 kulu.
- ✅ Väljund ainult `reports/`-i + JSON.
- ✅ Deploy EI tehtud, kood-muudatusi EI pushitud (ainult see raport + preflight JSON).
- ✅ Öise [4] hooki EI puudutatud; DB-vaikuse aken 02:45–04:30 austatakse.
