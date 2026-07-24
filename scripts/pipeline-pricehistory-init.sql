-- price_history — Omnibus (EL direktiiv 98/6/EÜ art 6a): iga hinnamuutus salvestatud,
-- soodustus peab viitama 30 päeva madalaimale. LAUNCH-BLOKK (pre-launch kohustus).
-- Seeme = price_backup_reprice_20260722 (17106 rida) = 22.07 lähtepunkt 30p-akna jaoks.
-- Idempotentne: tabel IF NOT EXISTS; seeme ainult kui seeme-allikas veel puudub.
BEGIN;

CREATE TABLE IF NOT EXISTS price_history (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  variant_id    text NOT NULL,
  product_id    text NOT NULL,
  currency_code text NOT NULL DEFAULT 'eur',
  amount        numeric NOT NULL,            -- sentides (nagu price.amount)
  changed_at    timestamptz NOT NULL DEFAULT now(),
  source        text,                         -- 'seed-backup-20260722' | 'reprice-cycle' | 'import-new'
  margin        numeric                       -- marginaal (1-1/markup) muutuse hetkel; DELTA-alarmi baas
);
-- Idempotentne täiendus juba-loodud tabelile (margin lisatud pärast esmast seed'i)
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS margin numeric;
CREATE INDEX IF NOT EXISTS idx_ph_variant_time ON price_history(variant_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ph_product_time ON price_history(product_id, changed_at DESC);

-- Seeme (ainult üks kord): 22.07 backup-hinnad = teadaolev lähtepunkt.
INSERT INTO price_history(variant_id, product_id, currency_code, amount, changed_at, source)
SELECT pv.id, p.id, 'eur', b.old_amount, TIMESTAMPTZ '2026-07-22 00:00:00+00', 'seed-backup-20260722'
FROM price_backup_reprice_20260722 b
JOIN price pr                       ON pr.id = b.price_id
JOIN product_variant_price_set pvps ON pvps.price_set_id = pr.price_set_id
JOIN product_variant pv             ON pv.id = pvps.variant_id
JOIN product p                      ON p.id = pv.product_id
WHERE NOT EXISTS (SELECT 1 FROM price_history h WHERE h.source = 'seed-backup-20260722');

COMMIT;

-- Kontroll
SELECT 'price_history rida kokku' AS metric, count(*)::text AS v FROM price_history
UNION ALL SELECT 'seeme (22.07)', count(*)::text FROM price_history WHERE source='seed-backup-20260722'
UNION ALL SELECT 'distinct variant', count(DISTINCT variant_id)::text FROM price_history;
