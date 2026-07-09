# STAGING SKEEMI-AUDIT (FAAS 1.5) — 2026-07-09

**DB: k33g staging.** Backup: reports/backups/FULLDB-20260709-234823-k33g.dump (96 MB, custom-format, pg_restore --list verifitseeritud, 809 objekti).

## ⚠️ PREMISS EI KLAPPINUD LIVE-SEISUGA
Kontekst väitis "41/147 PK (degradeerunud)". **Live staging: 119/147 PK = prod-väide.** Skeem EI OLE degradeerunud.

## AUDIT (live)
- **PK: 119/147** (= prod). Unique-constraint: 1. Check: 35. **FK: 0** (Medusa 2.0 kasutab link-mooduleid, mitte DB-FK-sid — tõenäoliselt normaalne, ka prod-is 0).
- Indekseid: 448 (unique-jõustus indeksite kaudu).
- **Kriitilised tabelid (product, product_category, product_category_product, product_variant): KÕIK PK-ga.**

## DUP-KONTROLL (kriitiline — kas suured lukud tekitasid dupe?)
- **product_category_product: 0 dup** (PK + unique-indeks kaitses — taksonoomia-lukud OLID OHUTUD).
- **taxonomy_node_meta: 0 dup node_id** (INSERT'id ohutud).
- product_shipping_profile 0 · product_variant_price_set 0 · product_synonym "5791" = legitiimne 1-mitmele (mitte dup).

## TEHTUD (1 ohutu, sihitud parandus)
- **taxonomy_node_meta: lisatud UNIQUE-indeks node_id-le** (uq_taxonomy_node_meta_node_id) — tabel oli 0-indeksiga, kaitseb tulevasi taksonoomia-INSERT'e dup-node_id eest. 0 dup → õnnestus.

## FLAG (EI SURUNUD — vajaks prod-DDL-i + risk):
- **FK-de lisamine (0→N):** Medusa 2.0 kasutab app-tasandi link-mooduleid, mitte DB-FK-sid. Blind-FK võib rakenduse katki teha. **Ei tee ilma prod-DDL kinnituseta.** Prod tõenäoliselt ka 0 FK.
- **28 PK-ta tabelit:** peamiselt Medusa link/join (product_shipping_profile, product_variant_price_set, vertical_collection_*, region_country jne) — standard Medusa 2.0, ei vaja tingimata PK-d. Prod-DDL puudub võrdluseks.

## VERIFIKATSIOON: PK 119/147 · distinct 17425 · inv 0 FAIL · Meili vastab (leht töötab).
**JÄRELDUS: skeem terve, taksonoomia-töö ohutu. Riskantset constraint-kirurgiat EI vaja.**
