-- review-bucket-26-migrate.sql — 2026-08-24
-- Tarmo otsused: 26 review-bucket toodet → kodu (Grupp A käsitsi + Grupp B kinnita proposed_l3).
-- Propose-not-create: uut L3 loodi AINULT A4+A5 (Auto konsoolid ja hoiukastid, pcat_autokonsool, create-l3.mjs).
-- A2 = DUP-värav: caddy läks OLEMAS L3-sse (pcat_ag2_2x4_2, 25 identset), MITTE uus L3.
-- Idempotentne: ON CONFLICT DO NOTHING + status-guard.
BEGIN;

-- ═══════════ GRUPP A (override sihtkoht) ═══════════
-- A1 Fritüüri filterpaber → Fritüüriõli filtreerimistarvikud (kulumaterjal, EI uut L3)
INSERT INTO product_category_product (product_id, product_category_id)
SELECT cr.product_id, 'pcat_ks_5x2_25' FROM classification_review cr
WHERE cr.status='pending' AND cr.title ILIKE '%Fryer Filter Paper%' ON CONFLICT DO NOTHING;

-- A2 Fuel Gas Caddy → Kütusemahutid ja -konteinerid ratastega [DUP-VÄRAV: 25 identset olemas]
INSERT INTO product_category_product (product_id, product_category_id)
SELECT cr.product_id, 'pcat_ag2_2x4_2' FROM classification_review cr
WHERE cr.status='pending' AND cr.title ILIKE '%Fuel Gas Caddy%' ON CONFLICT DO NOTHING;

-- A3 Trimmer Rack → Aiatööriistade hoidikud (olemas, EI uut L3)
INSERT INTO product_category_product (product_id, product_category_id)
SELECT cr.product_id, 'pcat_ag2_2x2_11' FROM classification_review cr
WHERE cr.status='pending' AND cr.title ILIKE '%Trimmer Rack%' ON CONFLICT DO NOTHING;

-- A4+A5 Center Console → UUS L3 Auto konsoolid ja hoiukastid (create-l3.mjs-ga loodud)
INSERT INTO product_category_product (product_id, product_category_id)
SELECT cr.product_id, 'pcat_autokonsool' FROM classification_review cr
WHERE cr.status='pending' AND cr.title ILIKE '%Center Console%' ON CONFLICT DO NOTHING;

-- A6 Topiaar Cedar Bush → Privaatsusekraanid ja kunsthekid (Tarmo otsus, koos B5-ga, väldi killustust)
INSERT INTO product_category_product (product_id, product_category_id)
SELECT cr.product_id, pc.id FROM classification_review cr
JOIN product_category pc ON pc.handle='v4-aed-ja-aiatehnika-l10-privaatsusekraanid-ja-kunsthekid' AND pc.deleted_at IS NULL
WHERE cr.status='pending' AND cr.title ILIKE '%Cedar Bush%' ON CONFLICT DO NOTHING;

-- ═══════════ GRUPP B (kinnita proposed_l3 olemas-kodusse) ═══════════
-- Kõik pending kus proposed_l3 handle resolvub olemas-L3-ks, VÄLJA A-grupi override'id
INSERT INTO product_category_product (product_id, product_category_id)
SELECT cr.product_id, pc.id FROM classification_review cr
JOIN product_category pc ON pc.handle = cr.proposed_l3 AND pc.deleted_at IS NULL
WHERE cr.status='pending' AND cr.proposed_l3 IS NOT NULL AND cr.proposed_l3 <> ''
  AND cr.title NOT ILIKE '%Cedar Bush%'      -- A6 override (proposed oli taimetoed)
  AND cr.title NOT ILIKE '%Center Console%'  -- A4/A5 override (proposed oli porandamatid, vale)
ON CONFLICT DO NOTHING;

-- ═══════════ Publitseeri + resolvi review ═══════════
-- publitseeri kõik 26 (review-bucket draftid)
UPDATE product SET status='published', updated_at=now()
WHERE id IN (SELECT product_id FROM classification_review WHERE status='pending')
  AND status='draft' AND deleted_at IS NULL;

-- märgi review resolved (audit-jälg jääb, pending → 0)
UPDATE classification_review SET status='resolved', updated_at=now() WHERE status='pending';

COMMIT;
