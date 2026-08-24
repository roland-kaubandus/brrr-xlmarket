-- kassipuurid-veljekatted-migrate.sql — 2026-08-24
-- C-dreeni killustumise parandus (Tarmo, selged vead):
--   1. KASSIPUURID: klassifikaator jagas identsed "Cat Cage" tooted 3 klastrisse
--      (närilistepuurid=VALE, mänguplatsid, quarantine). Kõik → uus L3 "Kassipuurid ja aedikud"
--      (pcat_lp_1_10 @ Puurid ja aedikud). 9 draft (review-bucket) + 4 published (ripusid otse L2 küljes).
--   2. VELJEKATTED: 3 draft Hubcaps → OLEMAS L3 "Veljekatted ja rattakatted" (pcat_ag2_3x2_8),
--      kus juba 23 sama-tüüpi toodet. Uut L3 EI loodud.
-- Idempotentne: ON CONFLICT DO NOTHING + status-guard. L3 pcat_lp_1_10 loodud create-l3.mjs-ga (meta olemas).
BEGIN;

-- ── 1. KASSIPUURID (13 toodet) ──
-- 1a. lisa link uude L3-sse (kõik cat cage/playpen tooted)
INSERT INTO product_category_product (product_id, product_category_id)
SELECT p.id, 'pcat_lp_1_10'
FROM product p
WHERE p.deleted_at IS NULL
  AND (p.title ILIKE '%cat cage%' OR p.title ILIKE '%cat playpen%')
ON CONFLICT DO NOTHING;

-- 1b. eemalda vale L2-otse-link (4 published ripusid otse "Puurid ja aedikud" L2 küljes)
DELETE FROM product_category_product
WHERE product_category_id = 'pcat_v4_l14_1'
  AND product_id IN (SELECT id FROM product WHERE title ILIKE '%cat cage%' OR title ILIKE '%cat playpen%');

-- 1c. publitseeri 9 draftit
UPDATE product SET status='published', updated_at=now()
WHERE (title ILIKE '%cat cage%' OR title ILIKE '%cat playpen%') AND status='draft' AND deleted_at IS NULL;

-- 1d. puhasta review-bucket (9 pending)
DELETE FROM classification_review
WHERE status='pending' AND (title ILIKE '%cat cage%' OR title ILIKE '%cat playpen%');

-- ── 2. VELJEKATTED (3 draft Hubcaps) ──
-- 2a. lisa link olemas-L3-sse
INSERT INTO product_category_product (product_id, product_category_id)
SELECT p.id, 'pcat_ag2_3x2_8'
FROM product p
WHERE p.status='draft' AND p.deleted_at IS NULL
  AND (p.title ILIKE '%hubcap%' OR p.title ILIKE '%wheel cover%')
ON CONFLICT DO NOTHING;

-- 2b. publitseeri
UPDATE product SET status='published', updated_at=now()
WHERE (title ILIKE '%hubcap%' OR title ILIKE '%wheel cover%') AND status='draft' AND deleted_at IS NULL;

-- 2c. puhasta review-bucket (3 pending)
DELETE FROM classification_review
WHERE status='pending' AND (title ILIKE '%hubcap%' OR title ILIKE '%wheel cover%');

COMMIT;
