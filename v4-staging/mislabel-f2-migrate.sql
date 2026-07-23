-- Mislabel-fix FAAS 2: terrassisoojendid #10->#7; whiteboard + fabric cutter FLAG-id
BEGIN;

-- 1) REPARENT kogu "Terrassisoojendid" L3 (pcat_7terrL3, 3 õue-toodet) #10 Radiaatorid -> #7 Lõkkekolded & tuleasemed
--    rename "Terrassi- & infrapunasoojendid" -> "Terrassisoojendid" (0 sise-paneeli jäänud)
UPDATE product_category SET
  name='Terrassisoojendid',
  parent_category_id='pcat_v4_l7_9',
  mpath='pcat_v4_l7.pcat_v4_l7_9.pcat_7terrL3',
  handle='v4-aed-ja-aiatehnika-terrassisoojendid',
  rank=1
WHERE id='pcat_7terrL3';

-- 2) Whiteboard #6 "Kirjutus- & arvutilauad" -> "Tahvlid & teadetetahvlid"
UPDATE product_category_product SET product_category_id='pcat_mv_6x3_7'
WHERE product_category_id='pcat_mv_6x3_3' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='CXGCBLBGHBL7KFTA9V0');

-- 3) Fabric Cutter #18 "Muud talutehnika" (vale main) -> #13 "Lõikemasinad & -tarvikud" (Tekstiili- & rõivatrükk)
UPDATE product_category_product SET product_category_id='pcat_f4_13xtex_13'
WHERE product_category_id='pcat_ag_3_7' AND product_id IN (SELECT id FROM product WHERE upper(metadata->>'vevor_sku')='WXCJJ125LDCJD0001V2');

COMMIT;
