-- Staging DB-l puudus product_variant_price_set UNIQUE (price_set_id, variant_id) — prod'il on
-- (uq_product_variant_price_set_link). Ilma selleta createProductsWorkflow upsert (ON CONFLICT)
-- ebaõnnestub → TOOTE-LOOMINE KATKI staging'is. Dubleerid=0. Replikeerin prod-ist (mitte-partial).
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variant_price_set_link
  ON product_variant_price_set USING btree (price_set_id, variant_id);
