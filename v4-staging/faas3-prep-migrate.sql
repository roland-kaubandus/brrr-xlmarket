BEGIN;
-- FAAS A: eestista 4 inglise-slug'i + 301 redirect
INSERT INTO slug_redirect (from_slug, to_slug, reason, created_at) VALUES
 ('v4-suurkoogiseadmed-prep','v4-suurkoogiseadmed-ettevalmistus-ja-tootlus','rename',now()),
 ('v4-tooriistad-ja-tarvikud-hvac-ja-torudiagnostika','v4-tooriistad-ja-tarvikud-toru-kanalisatsiooni-diagnostika','rename',now()),
 ('v4-tooriistad-ja-tarvikud-hvac-inspektsioonikaamerad','v4-tooriistad-ja-tarvikud-inspektsioonikaamerad','rename',now()),
 ('v4-tooriistad-ja-tarvikud-hvac-survetestrid','v4-tooriistad-ja-tarvikud-surve-lekketestrid','rename',now());
UPDATE product_category SET handle='v4-suurkoogiseadmed-ettevalmistus-ja-tootlus', updated_at=now() WHERE id='pcat_5prep';
UPDATE product_category SET handle='v4-tooriistad-ja-tarvikud-toru-kanalisatsiooni-diagnostika', updated_at=now() WHERE id='pcat_hv1';
UPDATE product_category SET handle='v4-tooriistad-ja-tarvikud-inspektsioonikaamerad', updated_at=now() WHERE id='pcat_hv1_1';
UPDATE product_category SET handle='v4-tooriistad-ja-tarvikud-surve-lekketestrid', updated_at=now() WHERE id='pcat_hv1_3';
-- FAAS B: soft-delete 18 scaffold-maini + kõik alamad (0 toodet, mitte-v4)
DELETE FROM taxonomy_node_meta WHERE node_id IN (
  SELECT id FROM product_category WHERE deleted_at IS NULL AND split_part(mpath,'.',1) IN (
    SELECT id FROM product_category WHERE mpath NOT LIKE '%.%' AND is_active AND id NOT LIKE 'pcat_v4_l%' AND deleted_at IS NULL));
UPDATE product_category SET deleted_at=now(), is_active=false, updated_at=now()
WHERE deleted_at IS NULL AND split_part(mpath,'.',1) IN (
  SELECT id FROM product_category WHERE mpath NOT LIKE '%.%' AND is_active AND id NOT LIKE 'pcat_v4_l%' AND deleted_at IS NULL);
COMMIT;
