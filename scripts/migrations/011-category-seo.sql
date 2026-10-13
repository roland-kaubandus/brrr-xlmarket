-- Migration 011 — kategooria SEO püsiv SSoT (description + tagline, ET+EN)
-- Konteksti: taxonomy_node_translation (migration 001) hoiab per-locale NIME.
-- SEO-tekstidel (description/tagline) EI OLNUD DB-kodu — classify-etapp2-create
-- genereeris need (l3-gates.genAssetsGated), aga viskas plaani-raportisse.
-- See tabel = püsiv kodu; genyM.mjs loeb siit (fallback stub); backfill + hook
-- kirjutavad siia (HARD RULE #5 üks SSoT, kaks kutsujat).
--
-- node_id = product_category.id (sama FK-muster kui taxonomy_node_translation).
-- Kirjeldus/tagline = KATEGOORIA tervikuna (seoClaimGate: 0 numbrit/lubadust).

BEGIN;

CREATE TABLE IF NOT EXISTS taxonomy_node_seo (
  node_id        TEXT NOT NULL
                 REFERENCES product_category(id) ON DELETE CASCADE,
  description_et TEXT,
  description_en TEXT,
  tagline_et     TEXT,
  tagline_en     TEXT,
  source_batch   TEXT,          -- backfill/hook batch-id (undo + päritolu)
  seo_gate_pass  BOOLEAN,       -- seoClaimGate tulemus (nähtavus)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (node_id)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_node_seo_batch
  ON taxonomy_node_seo(source_batch)
  WHERE source_batch IS NOT NULL;

-- Auto-update updated_at (taasuta migration 001 funktsiooni taxonomy_touch_updated_at).
DROP TRIGGER IF EXISTS trg_taxonomy_node_seo_updated ON taxonomy_node_seo;
CREATE TRIGGER trg_taxonomy_node_seo_updated
  BEFORE UPDATE ON taxonomy_node_seo
  FOR EACH ROW EXECUTE FUNCTION taxonomy_touch_updated_at();

COMMIT;
