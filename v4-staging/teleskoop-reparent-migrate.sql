BEGIN;
-- Teleskoobikohvrid L3: #12 Sport → #23 Elektroonika (Foto & video L2), domeeni-kodu
UPDATE product_category
SET parent_category_id='pcat_23foto',
    mpath='pcat_v4_l23.pcat_23foto.pcat_12scope',
    rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_23foto' AND deleted_at IS NULL),
    updated_at=now()
WHERE id='pcat_12scope';
COMMIT;
