# RAPORT — OTSUSED kalibreerimise põhjal (2026-10-06)

> Tarmo direktiiv: **A. Sünonüümid → tootmisse KONSENSUSE reegliga** · **B. Klassifikaator → jääb DRY, parandused**.
> HARD RULE #6 (masin ise) · #5 (backfill+hook) · #8 (test-identiteet) järgitud. **Midagi EI rakendatud päriselt** — sünonüüm-execute gated, klassifikaator DRY.

---

## A — SÜNONÜÜMID: konsensus-reegel + kogu 3854 DRY jaotus + kuluhinnang

### A1 Tootmisreegel (ehitatud, `judge.mjs#synConsensus`)
Sünonüüm → `product_synonym` **AINULT kui Sonnet-kohtunik = OK JA Opus-referents = OK**.
Kõik muu → **ohutu vaikimisi** (EI lähe otsingusse), MITTE inimese järjekord:
- kumbki mudel **VALE** → `rejected` (kindel müra)
- lahkheli / **EBAKINDEL** → `safe_default`

### A3 Kogu 3854 pending DRY — JAOTUS

| bucket | kirjeid | % | tegevus execute'il |
|---|---|---|---|
| ✅ **consensus_ok** (mõlemad OK) | **2675** | **69.4%** | → `product_synonym` (otsingusse) |
| 🟡 **disagreement** (lahkheli/EBAKINDEL) | 365 | 9.5% | → `safe_default` (EI otsingusse) |
| ❌ **vale** (kumbki VALE) | 814 | 21.1% | → `rejected` |
| mudelite kokkulangevus | 3049/3854 | 79.1% | — |

**Mida reegel püüab (näited VALE-bucketist — õigesti filtreeritud müra):**
- `pneumaatiline õlipump` → sünonüüm "õhupump" (air pump) — õlipump ≠ õhupump → Opus VALE ✓
- `kohvimasin alus` → "seadmete käru" (equipment cart) — vale kategooria → Opus VALE ✓
- `pliidiämber` → "fireplace ash bucket" — vale kontekst → Opus VALE ✓

**consensus_ok näited (puhtad, mõlemad OK):** `kaitsekohver`→protective/equipment case · `roostevaba veefiltri paak`→water purification system · `arcade hoki laud`→air hockey.

### A2 Kuluhinnang (tegelik usage sellest DRY-jooksust)

| mudel | kutseid | input tok | output tok | sünkroon | **batch API (−50%)** |
|---|---|---|---|---|---|
| kohtunik `claude-sonnet-5` | 322 | 1 248 960 | 773 374 | $15.35 | $7.67 |
| referents `claude-opus-4-8` | 322 | 1 218 402 | 300 534 | $13.61 | $6.80 |
| **KOKKU (3854 backfill)** | 644 | — | — | **$28.95** | **$14.48** |

- **~$0.0075 / kirje.** Täis-backfill: **~$29 sünkroon / ~$14 batch API**.
- **Öine hook** (~100 uut terminit/öö): **~$0.75/öö sünkroon · ~$0.38/öö batch** (~$11–23/kuu).
- NB: DRY tegi sünkroon-kutsed (batch API = pool hinnast). Backfill saab batch-API kaudu ajada.

### A4 Tagasivõetavus (ehitatud)
`--execute` logib ÜHE koond-rea `review_decision_log` (actor_detail=`auto-judge`, channel=`pipeline`, batch_id, affected=kõik puudutatud).
Täispartii tagasivõtt: `node scripts/synonym-backfill-undo.mjs <batch_id>` (kustutab ainult partii lisatud read, taastab synonym_review pending).

### A5 Pärast execute (runbook, EI jooksnud veel)
`[7.5] sync-synonyms` (Meili) + otsingu-kontroll: `tankur · rollaator · õhktõstuk · ohktostuk` + 5 juhuslikku uut → kas tulemused paranesid, 0 müra.

### A6 Öine hook (ehitatud) — `import-pipeline.sh [6.7]`
SAMA runner (`synonym-backfill.mjs`), **delta** (`--skus classify-skus.txt` = ainult öö-delta, MITTE backlog), fail-loud (süsteemne→`fail()`/Telegram; krediit→degrade-skip), per-bränd-agnostiline (töötab review-ridade peal, mis [6.6] lõi).

> **OOTAB KINNITUST:** `--execute` jooksutamiseks kogu 3854 peal. Praegu DB puutumata.

---

## B — KLASSIFIKAATOR: jääb DRY, parandused

### B1 Sõltumatu referents (ehitatud)
Kohtunik = **Opus** → referents MUST olla ei-Opus. **Valitud `claude-sonnet-5`.**
Kaalutud: Fable-5 (kallim + eri API — thinking always-on), Haiku-4.5 (liiga nõrk arbitreerimiseks). Sünonüümi-referents jääb Opus (sünonüümi-kohtunik on Sonnet → juba sõltumatu).

### B2 Tugevdatud DUP-värav (ehitatud) — MÕÕDETUD MÕJU
Kohtunik peab enne `new_l3` täitma `considered_l3s` (2–5 olemas-L3 handle) + `considered_reason` (miks ükski ei sobi). Tühi considered → peab olema `assign_existing`.

| tegevus (40-valim, seed=xlm) | PRE DUP-värav | POST DUP-värav |
|---|---|---|
| `new_l3` | 21 | **7** |
| `assign_existing` | 19 | **33** |

→ kohtunik lõpetas üle-pakkumise, taaskasutab olemas-L3-sid. Kõik 7 new_l3 kannavad nüüd `considered_l3s`.

### B3 Taksonoomia-kattuvuse signaal (ehitatud) — `taxonomy_overlap_signal`
Kui kohtunik + referents valivad SAMALE tootele **eri olemas-L3** → paar salvestatakse automaatselt (sümmeetriline dedup, hits++), digestisse — **MITTE inimese järjekord**.

**🔗 Leitud kattuvus:**

| L3 A | L3 B | hits |
|---|---|---|
| `…kokteili-ja-baaritarvikud` | `…peo-serveerimisdispenserid` | 2 |

(Vahukoore-dosaator: kohtunik→baaritarvikud, referents→serveerimisdispenserid → sama ostja-mõiste kahes L3-s = merge/selgituse kandidaat.)

### B4 Re-kalibreerimine (sõltumatu Sonnet-5 referents, 40-valim)

| mõõdik | väärtus | lävi |
|---|---|---|
| kokkulangevus (tegevus) | 25/40 (62.5%) | — |
| VALE-assign | 17/40 (42.5%) | ≤2,5% → 🔴 |
| ohutu vaikimisi | 17 | mitte inimene |

**42.5% EI ole regressioon vs vana 22.5%** — vana oli Opus-hindab-Opust (sama-mudel-korrelatsioon peitis lahkhelid). Sõltumatu referents paljastab **4 päris taksonoomia-auku**, mitte juhuslikke vigu:

1. **Lumber rack (konsool/cantilever) ×9** — kohtunik taaskasutab `seinale-kinnitatavad-hoiususteemid` (DUP-värav surus), referents tahab eraldi L3. → **kandidaat: uus L3 "Puidu-/materjaliriiulid (konsool)"**.
2. **LiFePO4 suuraku ×3** — RV/päike/paat energiasalvestus ≠ sõiduki/tööriista-aku. → **kandidaat: uus L3 "Energiasalvestus-/päikeseakud"**.
3. **Mängu-/söögilaud hübriid ×2** · **laste mänguostukäru ×1** — referents tahab new_l3.
4. **Vahukoore-dosaator ×2** → kattuvus-signaal (B3), ülal.

**Klassifikaator jääb DRY.** Need kandidaadid kogutakse (overlap-signal + kalibreerimis-lahknevused) → digest, mitte käsitsi-otsus.

---

## Failid + harud
Kood: `scripts/lib/judge.mjs` · `scripts/lib/overlap-signal.mjs` · `scripts/calibration-reference.mjs` · `scripts/synonym-backfill.mjs` · `scripts/synonym-backfill-undo.mjs` · `scripts/import-pipeline.sh [6.7]`.
Raportid: see fail · `reports/syn-backfill-dry-full.json` · `reports/calib-reference-classify-POST.md` · `reports/calib-classify.PRE-dupgate.json`.
