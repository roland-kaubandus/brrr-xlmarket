BEGIN;
-- Kuumaõhu-keevituspüstolid L3: Elektrilised tööriistad → Keevitus & jootmine L2 (funktsiooni-domeen)
UPDATE product_category
SET parent_category_id='pcat_t3l2_7',
    mpath='pcat_v4_l1.pcat_t3l2_7.pcat_t3f_2_16',
    rank=(SELECT COALESCE(max(rank),0)+1 FROM product_category WHERE parent_category_id='pcat_t3l2_7' AND deleted_at IS NULL),
    updated_at=now()
WHERE id='pcat_t3f_2_16';
COMMIT;
