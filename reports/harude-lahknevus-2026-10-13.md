# Harude lahknevus: main ↔ taxonomy-v4 (read-only analüüs, 2026-10-13)

> Tarmo palve (Task 2): `git cherry`/range-diff — mitu main-commit'it on sisuliselt juba v4-s vs päriselt
> ainult main-is; mis on päriselt main-only muudatused; kas v4-s puudub midagi vajalikku; soovitus cutover'iks.
> **AINULT LUGEMINE — harusid EI muudetud.**

Harude tipud analüüsi hetkel:
- `origin/main`: `de7f5c50`
- `origin/taxonomy-v4`: `6749fca1` (Coolify buildib SEDA)

---

## 1. Commit-tasand (`git cherry origin/taxonomy-v4 origin/main`)

| Mõõt | Arv | Tähendus |
|---|---|---|
| `+` (päris main-only) | **412** | commit'i, mille patch-id EI ole v4-s |
| `-` (juba v4-s) | **285** | commit'i, mis on v4-sse cherry-pick'itud (patch-ekvivalent) |

**412 main-only commit'i sisu (failipuuete kaupa):**
- `reports/**` — **1793** puudet (raportid, kaardid, spec-mallid)
- `memory/sessions/**` — **369** puudet (sessioonilogid)
- `CLAUDE.md` — 23 puudet
- **Kood/SSoT/config — ~130 puudet** (allpool lahti seletatud)

→ **Main-only on ~99% dokumentatsioon** (raportid + logid). Kood-lahknevus on väike ja täpselt piiritletud.

---

## 2. Puu-tasand (mis TIPUDE vahel erineb — see loeb cutoveriks, mitte commit-ajalugu)

### A) Kood ainult MAIN-is (v4-l PUUDU) — 21 faili

**Manuaalsed taksonoomia-QA / dev-tööriistad (18):** `inv-taxonomy.mjs`, `grab-bag-judge.mjs`, `merge-judge.mjs`,
`intra-qa-judge.mjs`, `domain-placement-judge.mjs`, `l2-domain-judge.mjs`, `l3-l2-misfit-judge.mjs`,
`l3-order-judge.mjs`, `l3-profile-gen.mjs`, `spec-mall-gen.mjs`, `spec-extract-llm.mjs`, `spec-backfill-malls.mjs`,
`backfill-content-fields.mjs`, `lib/vevor-content.mjs`, `vevor-description-cleaner.mjs`, `reprice-existing.mjs`,
`apply-956-categories.mjs` + whitelist'id `inv-whitelist.json`, `merge-whitelist.json`.
→ **Verstaposti-/käsitsi-tööriistad.** Öine cron (`import-pipeline.sh`) neid EI kutsu (vt §3).

**RUNTIME (1) — ⚠️ ainus deploy'd saiti mõjutav lünk:** `storefront/components/UmamiAnalytics.tsx` + `layout.tsx`
import/render (`<UmamiAnalytics />`). **v4 = Coolify-build → staging/tulevane prod-sait on ILMA Umami-analüütikata.**

**Prügi (1):** `selgesti` — tühi (0-baidine) kogemata-commit'itud fail main-is. v4-s pole (hea). **Ära too v4-sse; kustuta main-ist.**

### B) Kood mis ERINEB (mõlemas olemas, eri sisu) — 2 faili
- `scripts/import-vevor-feed.mjs` — main refaktooris (eraldas loogika `lib/vevor-content.mjs`-i, mis on ise main-only). v4-l vana monoliit-versioon.
- `storefront/app/[locale]/layout.tsx` — ainus erinevus = Umami-import + render (ülal A).

### C) Kood ainult V4-s (main-il PUUDU)
**TÜHI.** v4-l ei ole ühtegi koodi-faili, mida main-il pole.

### D) Taksonoomia-SSoT (`backend/src/data/taxonomy.yaml`, `category-tree.generated.json`)
**IDENTNE mõlemal tipul** (0 diff). v4 jõudis sama seisuni cherry-pick-mustriga (HARD RULE #4). Kategooriapuu
on harude vahel sama → cutover ei too taksonoomia-üllatusi.

---

## 3. Runtime-ohutus: kas öine pipeline (v4) sõltub main-only tööriistadest?

`import-pipeline.sh` (v4, mida host-cron 03:00 jooksutab) kutsub **15 `pipeline-*` + abi-skripti** — KÕIK v4-s olemas:
`pipeline-strip-titles`, `-glossary-terms`, `-content-gen`, `-classify-chain`, `-neighbor-chain`, `-reprice`,
`-synonyms`, `-review-digest`, `outlet-crossdisplay`, `synonym-backfill`, `spec-extract-skus`, `credit-probe`,
`credit-outage-state`, `lib/notify-telegram.sh`, `lib/stack-lock.sh`.

**Main-only tööriistu (inv-taxonomy, grab-bag-judge, merge-judge, l3-*, spec-mall-gen jne) öine pipeline EI kutsu.**
Klassifikaatori + lukk-harness'i kriitilised moodulid (`genyM`, `lock-harness`, `check-taxonomy-invariants`,
`gen-category-tree`, `classifier-undo`, `lib/classify-chain`, `lib/l3-gates`, `lib/shadow-ledger`) on **mõlemal harul**.

→ **v4 öine runtime on täielik ja ohutu.** Ainus runtime-lünk = Umami-analüütika (mittekriitiline jälgimine).

---

## 4. Soovitus cutover'iks (sammudena)

**Vastus Tarmo küsimusele: JAH — prod ehitatakse `taxonomy-v4`-st** (testitud staging, Coolify buildib seda,
taksonoomia-SSoT identne, öine runtime täielik). Põhjendus: C) on tühi (v4 ei kaota midagi), D) identne.

**ENNE cutover'it (v4-sse, dual-commit HARD RULE #4):**
1. **Umami runtime v4-sse** — too `UmamiAnalytics.tsx` + `layout.tsx` 2 rida v4-le (ainus deploy'd saiti mõjutav lünk). *(VÕI teadlik otsus, et analüütika ootab — aga siis staging-l jälgimist pole.)*
2. **`import-vevor-feed.mjs` + `lib/vevor-content.mjs` paar** — vii v4 feed-importer main'i refaktooritud versiooniga kooskõlla (koos sõltuvusega). Kontrolli, et feed-sync (Coolify 4h + host) kasutab õiget versiooni.
3. **Dev-tööriistad v4-sse** (operatiivne pariteet, MITTE cutover-blokeerija) — 18 QA-tööriista + 2 whitelist, et `/opt/xlmarket-github` (v4-checkout) saaks manuaalseid verstaposti-kontrolle jooksutada. Öine cron ei vaja, aga käsitsi-ops vajab.
4. **`selgesti` prügifail** — kustuta main-ist (ära too v4-sse).

**CUTOVER (strateegia A, k33g domeeni-swap):**
5. Ehita prod `taxonomy-v4`-st (sammud 1–3 sees) → E2E smoke prod-domeenil.
6. `.eu→.ee` 301 + handle-redirect (cutover A8, veel ALUSTAMATA — vt ankur §4.4d).

**PÄRAST cutover'it (harude joondus — lõpetab dual-commit koormuse):**
7. Kuna C) on tühi ja SSoT identne, vii harud **KOKKU üheks**: merge/fast-forward nii, et `main == taxonomy-v4 == prod`.
8. Pärast seda **lõpeta eraldi taxonomy-v4 haru** (HARD RULE #4 kehtib "kuni harud on eraldi" → üks haru = reegel täidetud, dual-commit kaob). Edaspidi üks haru = ei lahkne enam.

**Risk kui EI tee:** harud lahknevad edasi (eriti docs); Umami jääb prod-ist puudu; v4-checkoutilt manuaalsed QA-tööriistad ei jookse (fail: "Cannot find module").
