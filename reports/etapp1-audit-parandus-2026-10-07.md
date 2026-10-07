# ETAPP 1 — Auditi parandus (ohutud toote-liigutused)

> Kuupäev: 2026-10-07 · batch_id: **e1-2026-10-07T1200** · staging (k33g)
> Allikas: `reports/audit-full-decisions-2026-10-07.json` (0 API-kutset — ehitatud audit-otsustest).
> Undo: `node scripts/etapp1-move-undo.mjs e1-2026-10-07T1200`

## Kokkuvõte

| Mõõt | Väärtus |
|---|---|
| Liigutatud klastreid | **246** |
| Liigutatud tooteid | **604** |
| Cross-main klastreid / tooteid | 69 / 184 |
| review_decision_log read | 246 (actor=`claude-code-test`, actor_detail=`auto-judge-audit`, channel=`pipeline`, action=`move`) |
| Tootekadu | **0** (distinct=19273 enne ja pärast) |
| Orb / multi-kategooria | **0 / 0** |

**Vahe plaani (728) ja tegeliku (604) vahel:** klastri `currentL3_split` — osa tooteid oli juba sihtkohas või kolmandas kategoorias (relink guard `product_category_id=from` jätab need puutumata). Liigutati AINULT tooted, mis olid praegu `from`-kategoorias.

## Tingimus 1 — HANDLE-TRIIV (nime järgi lahendus)

Reegel: lahenda nime järgi AINULT kui live-taksonoomias on TÄPSELT ÜKS sama nimega L3. Kaks juhtumit, mõlemad lahendatud (täpselt üks vaste):

| Klaster | Audit-handle (kohtunik, stale) | Live-handle (lahendatud) | Nimi |
|---|---|---|---|
| spu:01238 | `v4-elektritarvikud-ja-valgustus-elektroonika-serverikapid-raamid` | `v4-elektritarvikud-ja-valgustus-serverikapid-raamid` | Serverikapid ja -raamid |
| spu:02173 | `v4-pollumajandus-ja-loomakasvatus-talutehnika-pinnasetoo-greiderdamine` | `v4-pollumajandus-talutehnika-pinnasetoo-greiderdamine` | Pinnasetöö ja greiderdamine |

Mitu- või null-vastet EI esinenud (0 dropped). Mõlema puhul täpselt üks live-L3 sama nimega → parandatud + logitud.

## Tingimus 2 — 🔴 48 kõik-eri

Kinnitatud: 48 kõik-eri klastrit (109 toodet) **jäid paigale + signaal** (ei liigutatud). Kuuluvad JÄÄB-PAIGALE hulka, mitte liigutamisse.

## Tingimus 3 — JUURPÕHJUSE PARANDUS (judge.mjs)

**Lisatud `validateTargetHandles(byKey, ctx)` — PUHAS, I/O-ta funktsioon `scripts/lib/judge.mjs`-s.** Ühendatud MÕLEMASSE teesse (HARD RULE #5, üks transform, kaks kutsujat):
- `resolveJudgeBatch` (audit-tee) — valikuline `validate`-kontekst.
- `resolveClustersSyncVerified` (öine [4] hook) — valikuline `validate`-kontekst.

**Reegel (ainult `assign_existing`):**
1. target_handle ∈ live → OK.
2. olematu handle → ühene nimevaste (kandidaat-nimi → live-nimekiri; täpselt üks) → **parandus + logi `corrected`**.
3. muidu (0/mitu vastet / nimi puudub) → **otsus KEHTETU → action=keep → review-bucket** (otsuseta, OHUTU VAIKIMISI — MITTE kodutu toode).

**Öine hook (`pipeline-classify-chain.mjs`):** ehitab `validateCtx` (liveHandleSet + nameToHandles LIVE product_category-st; handleToName SSoT-kandidaatidest), edastab mõlemasse resolve-kutsesse. Digesti loendur: **`kehtetu handle: N`** + `handle-triiv parandatud: N` (Telegram + `key_integrity`).

**Kontroll — kas tänane öine [4] (03:03, batch hook-2026-10-07T0102) andis kehtetut handle'it?**
→ **EI.** Kõik 5 assign-sihtkohta kehtivad live-DB-s (live=1):
- `v4-sport-ja-vaba-aeg-jaht-ja-jahivarustus-jaakalastustelgid` ✓
- `v4-santehnika-kute-ja-ventilatsioon-elektrilised-veesoojendid` ✓
- `v4-sport-ja-vaba-aeg-manguasjad-lastele-ronimismanguasjad-ja-ronimiskomplektid` ✓
- `v4-aed-ja-aiatehnika-l4-valiskoogi-sahtlid-ja-kapid` ✓
- `v4-meditsiin-meditsiinikarud-lauad` ✓

Handle-triiv oli spetsiifiline audit-kohtuniku otsustele (stale SSoT-snapshot vs lagunenud live-DB vahe); öine hook loeb kandidaadid samast SSoT-st, aga valideerib nüüd live-DB vastu vastuvõtmisel.

## Tingimus 4 — EXECUTE väravad (kõik läbitud)

- ✅ backup → `reports/backups/etapp1-undo-e1-2026-10-07T1200.json` (gitignore'is)
- ✅ batch_id + üks transaktsioon (ON_ERROR_STOP)
- ✅ review_decision_log 246 rida (actor_detail=`auto-judge-audit`, channel=`pipeline`)
- ✅ undo-skript: `scripts/etapp1-move-undo.mjs`
- ✅ INV (`check-taxonomy-invariants.mjs --ci`) 0 FAIL
- ✅ lock-harness POST 🟢 PASS: distinct=19273 (0 kadu), mpath terve, struktuur muutumatu (L3 1684)
- ✅ Meili reindeks: 18910 doc (= oodatud), rc=0
- ✅ Telegram teade saadetud

**DEPLOY-NÜANSS:** ainult toote-lingid liikusid (0 L3 lisatud/kustutatud/nimetatud) → piisab AINULT Meili reindeksist (EI SSoT-regen/push/redeploy).

## Tingimus 5 — Raport pärast execute'i

### 5 juhuslikku liigutatud toodet — leitavad otsingus + nähtavad uues kategoorias

Kõik 5 (DB: published + sihtkohas; Meili: sihtkoht esimene `category_handle`):

| Toode | Uus kategooria | Meili |
|---|---|---|
| Kaherattaline joonevärvimisvahend | Väljakumärgistajad (`...valjakumargistajad`) | ✓ |
| Ajamisidur 2-8HP | Golfikäru ja go-kart osad (`...golfikaru-ja-go-kart-osad`) | ✓ |
| Hüdrauliline torupressimistööriist | Hüdraulilised pressimistööriistad (`...hudraulilised-pressimistooriistad`) | ✓ |
| Seinale kinnitatav dušitool | Dušipingid ja -istmed (`...dusipingid-ja-istmed`) | ✓ |
| Lapse jooksuratas 12" | Tasakaalu- ja liikumismänguasjad (`...tasakaalu-ja-liikumismanguasjad`) | ✓ |

### Tühjaks jäänud L3-d (11) — EI kustuta, ainult logi (struktuurimuutus = eraldi samm)

Need L3-d jäid pärast liigutust 0 tootega (pub=0, total=0):

1. `v4-garaaziseadmed-rehvitood-rehvivahetusseadmed-ja-vahetid` — Rehvivahetusseadmed ja -vahetid
2. `v4-tooriistad-ja-tarvikud-viimistlus-joonte-margistus` — Joonte märgistusmasinad
3. `v4-tooriistad-ja-tarvikud-metallitoo-ja-sepatoo-keermestusmasinad` — Keermestusmasinad
4. `v4-suurkook-kaalud-ja-mootevahendid` — Kaalud ja mõõtevahendid
5. `v4-saunatarvikud` — Saunatarvikud
6. `v4-santehnika-kute-ja-ventilatsioon-ventilatsioon-ja-ventilaatorid-kuivatuspuhurid` — Kuivatuspuhurid
7. `v4-santehnika-kute-ja-ventilatsioon-kanal-ja-renn-aravool` — Kanal- ja renn-äravool
8. `v4-aed-ja-aiatehnika-l1-komposti-tarvikud` — Komposti tarvikud
9. `v4-varjualused-telgid-ja-kasvuhooned-varikatused-ja-pergolad-katete-ja-tarpide-tarvikud` — Katete ja tarpide tarvikud
10. `v4-tooriistad-tuubliliite-puurimissabloonid` — Tüübliliite puurimisšabloonid
11. `v4-lastekaubad-kiikautud` — Kiikautud

### Undo

```bash
node scripts/etapp1-move-undo.mjs e1-2026-10-07T1200
```
Taastab 604 toote algkategooria (to→from guard), logib undo, jooksutab Meili reindeksi.
