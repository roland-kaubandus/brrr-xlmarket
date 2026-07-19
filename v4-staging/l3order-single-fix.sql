BEGIN;
-- single-L3 L2-de ainus L3 → rank 1 (polnud ümber-järjestatud, hoidsid rank 0)
UPDATE product_category l3 SET rank=1, updated_at=now()
WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
  AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
  AND (SELECT count(*) FROM product_category s WHERE s.parent_category_id=l3.parent_category_id AND s.deleted_at IS NULL)=1
  AND l3.rank<>1;
COMMIT;
