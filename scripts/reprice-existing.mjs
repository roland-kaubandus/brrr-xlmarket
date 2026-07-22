#!/usr/bin/env node
// reprice-existing.mjs — olemasolevate toodete HINNA-only uuendus uue mootoriga (kulu+astmed).
// TÄIELIK OVERRIDE loogika: EI puutu kategooriaid/staatust/metadata't (erinevalt importeri --update'ist,
//   mis kirjutab resolver-v2 kategooriad üle). Ainus kirjutus = price.amount olemasolevatele variantidele.
//
// Sisend: feed-XLSX (MAP) → computeRetail → uus sent. Match: metadata.vevor_sku = feed SKU.
//   Puudutab AINULT enne täna (created_at < CUTOFF) loodud tooteid (uued 956 juba uue mootoriga).
//
// Kasutus:
//   set -a; . /tmp/xl-import.env; set +a
//   node scripts/reprice-existing.mjs [--execute]
// Ilma --execute = dry-run (mõju-raport, EI kirjuta). --execute = backup-tabel + UPDATE.
import XLSX from "xlsx";
import pg from "pg";
import { computeRetail } from "./lib/pricing-engine.mjs";
import { parsePrice } from "./lib/cost-engine.mjs";

const EXECUTE = process.argv.includes("--execute");
const CUTOFF = "2026-07-22";                       // uued täna-tooted juba uue mootoriga → jäta puutumata
const FEED = new URL("../backend/data/feeds/vevor-571.xlsx", import.meta.url).pathname;
const BACKUP_TABLE = "price_backup_reprice_20260722";

const wb = XLSX.readFile(FEED);
const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
const feedNew = new Map();
for (const r of raw) {
  const sku = String(r["SKU"] || "").trim();
  if (!sku) continue;
  const price = parsePrice(r["MAP (Minimum Advertised Price)"] || r["after coupon price"]);
  if (!price) continue;
  const weight = parseFloat(r["Product weight(KG)"]) || 0;
  const res = computeRetail({ priceRaw: price, supplierId: "vevor", weight });
  if (res) feedNew.set(sku, res.amount_cents);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Praegused eur-hinnad olemasolevatele (pre-CUTOFF) toodetele: 1 price-rida/variant (kinnitatud)
const cur = await client.query(`
  SELECT pr.id AS price_id, p.metadata->>'vevor_sku' AS sku, pr.amount AS cents
  FROM product p
  JOIN product_variant pv ON pv.product_id = p.id
  JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
  JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.currency_code = 'eur'
  WHERE p.deleted_at IS NULL AND p.created_at::date < '${CUTOFF}'
    AND p.metadata->>'vevor_sku' IS NOT NULL`);

const updates = [];       // {price_id, old, neu, sku, pct}
let noFeed = 0, same = 0;
for (const row of cur.rows) {
  const neu = feedNew.get(row.sku);
  const old = Number(row.cents);
  if (neu == null) { noFeed++; continue; }         // churn'inud feedist → EI puutu
  if (!old) continue;
  const pct = (neu - old) / old * 100;
  if (Math.abs(pct) < 0.5) { same++; continue; }
  updates.push({ price_id: row.price_id, old, neu, sku: row.sku, pct });
}

const up = updates.filter(u => u.pct > 0).length;
const drastic = updates.filter(u => Math.abs(u.pct) > 20).sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct));
console.log(`=== REPRICE EXISTING (hind-only) ${EXECUTE ? "EXECUTE" : "DRY-RUN"} ===`);
console.log(`Olemasolevaid (pre-${CUTOFF}) eur-hinnaga: ${cur.rows.length}`);
console.log(`Feedist puudu (churn, EI puutu):          ${noFeed}`);
console.log(`Sama (<0.5%, EI puutu):                   ${same}`);
console.log(`UUENDATAKSE:                              ${updates.length}  (kallineb ${up} / odavneb ${updates.length-up})`);
console.log(`Drastilisi (>20%): ${drastic.length}  |  >50%: ${drastic.filter(d=>Math.abs(d.pct)>50).length}`);
for (const d of drastic.slice(0,8)) console.log(`   ${d.sku.padEnd(24)} €${(d.old/100).toFixed(2)} → €${(d.neu/100).toFixed(2)} (${d.pct>0?"+":""}${d.pct.toFixed(1)}%)`);

if (!EXECUTE) { console.log(`\n[DRY-RUN] EI kirjutatud. ${updates.length} rida valmis.`); await client.end(); process.exit(0); }

// BACKUP: kõik pre-CUTOFF eur-hinnad (idempotentne — loo ainult kui puudub)
await client.query(`CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} AS
  SELECT pr.id AS price_id, pr.amount AS old_amount, p.metadata->>'vevor_sku' AS sku, now() AS backed_up
  FROM product p
  JOIN product_variant pv ON pv.product_id=p.id
  JOIN product_variant_price_set pvps ON pvps.variant_id=pv.id
  JOIN price pr ON pr.price_set_id=pvps.price_set_id AND pr.currency_code='eur'
  WHERE p.deleted_at IS NULL AND p.created_at::date < '${CUTOFF}' AND p.metadata->>'vevor_sku' IS NOT NULL`);
const bchk = await client.query(`SELECT count(*) FROM ${BACKUP_TABLE}`);
console.log(`\n✓ Backup-tabel ${BACKUP_TABLE}: ${bchk.rows[0].count} rida (tagasipööre: UPDATE price FROM backup).`);

// AINUS KIRJUTUS: batch UPDATE price.amount
await client.query("BEGIN");
let written = 0;
const CH = 500;
for (let i = 0; i < updates.length; i += CH) {
  const batch = updates.slice(i, i + CH);
  // UPDATE ... FROM (VALUES ...) — $odd=price_id, $even=amount
  const vals = batch.map((_, j) => `($${j*2+1}::text, $${j*2+2}::numeric)`).join(",");
  const flat = batch.flatMap(u => [u.price_id, u.neu]);
  const res = await client.query(
    `UPDATE price SET amount = v.amt, updated_at = now()
     FROM (VALUES ${vals}) AS v(id, amt) WHERE price.id = v.id`, flat);
  written += res.rowCount;
}
await client.query("COMMIT");
console.log(`\n✅ UUENDATUD: ${written} hinda (${updates.length} kavandatust).`);
await client.end();
