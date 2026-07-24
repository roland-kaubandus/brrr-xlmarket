#!/usr/bin/env node
// pipeline-reprice.mjs — feed-cron HINNA-samm [5]. HIND = ainus SSoT-erand (Tarmo 2026-07-24):
//   ostuhind muutub → jaehind muutub kaasa (computeRetail: kulu + astmed). EI puutu
//   kategooriaid/tõlkeid/specs/staatust. Ainus kirjutus = price.amount + price_history rida.
//
// + OMNIBUS: iga muutus → price_history (30p madalaim tuletatav).
// + MARGINAALI-ALARM (DELTA): alarm kui uus marginaal langeb >= margin_alert_drop_pp
//   protsendipunkti vs EELMINE (price_history) marginaal — ka kui hind tõusis kaasa.
//   (Absoluutne läve annaks 5107 vale-alarmi — pooled juba 13% põhjal.)
//
// DB: docker exec db-k33g psql (host-run; hostil pole pg-porti). LLM-i EI kasuta.
// Kasutus:
//   node scripts/pipeline-reprice.mjs [--dry|--execute] [--feed <xlsx>]
//   Vaikimisi = --dry (mõju-raport + alarmid, EI kirjuta).
import XLSX from "xlsx";
import { execSync } from "node:child_process";
import { computeRetail, loadPricingRules } from "./lib/pricing-engine.mjs";
import { parsePrice } from "./lib/cost-engine.mjs";

const argv = process.argv;
const argVal = (n, d) => { const i = argv.indexOf(n); return i > 0 ? argv[i + 1] : d; };
const EXECUTE = argv.includes("--execute");
const DRY = !EXECUTE;
const FEED = argVal("--feed", new URL("../backend/data/feeds/vevor-571.xlsx", import.meta.url).pathname);
const DROP_PP = (loadPricingRules().margin_alert_drop_pp ?? 5);   // config, mitte hardcode
const SLACK = process.env.SLACK_WEBHOOK_URL;

const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const q = (sql, tuplesOnly = true) => execSync(
  `docker exec -i ${getDB()} psql -U xlmarket -d xlmarket ${tuplesOnly ? "-tA" : "-A"} -v ON_ERROR_STOP=1 -f -`,
  { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
const marginOf = (markup) => markup ? (1 - 1 / markup) : 0;      // 1.15 → 0.130

// --- FEED → uus sent + markup per SKU ----------------------------------------
console.log(`=== REPRICE (${DRY ? "DRY-RUN" : "EXECUTE"}) — feed ${FEED.split("/").pop()} | alarm-läve ${DROP_PP}pp ===`);
const wb = XLSX.readFile(FEED);
const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
const feedNew = new Map();
for (const r of raw) {
  const sku = String(r["SKU"] || "").trim(); if (!sku) continue;
  const price = parsePrice(r["MAP (Minimum Advertised Price)"] || r["after coupon price"]); if (!price) continue;
  const weight = parseFloat(r["Product weight(KG)"]) || 0;
  const res = computeRetail({ priceRaw: price, supplierId: "vevor", weight });
  if (res) feedNew.set(sku, { cents: res.amount_cents, markup: res.markup, margin: marginOf(res.markup) });
}
console.log(`Feed SKU (hinnaga): ${feedNew.size}`);

// --- DB: praegused eur-hinnad + eelmine marginaal (price_history) -------------
const rows = q(`SELECT jsonb_build_object('price_id',pr.id,'variant_id',pv.id,'product_id',p.id,
    'sku',p.metadata->>'vevor_sku','cents',pr.amount,
    'prev_margin',(SELECT h.margin FROM price_history h WHERE h.variant_id=pv.id AND h.margin IS NOT NULL
                   ORDER BY h.changed_at DESC LIMIT 1),
    'has_hist',(SELECT count(*)>0 FROM price_history h WHERE h.variant_id=pv.id))::text
  FROM product p
  JOIN product_variant pv ON pv.product_id=p.id
  JOIN product_variant_price_set pvps ON pvps.variant_id=pv.id
  JOIN price pr ON pr.price_set_id=pvps.price_set_id AND pr.currency_code='eur'
  WHERE p.deleted_at IS NULL AND p.status='published' AND p.metadata->>'vevor_sku' IS NOT NULL`)
  .trim().split("\n").filter(l => l.startsWith("{")).map(l => JSON.parse(l));

const updates = [], alarms = [], backfill = [];
let noFeed = 0, same = 0;
for (const row of rows) {
  if (!row.has_hist) backfill.push(row);                        // pre-Omnibus toode → baseline vaja
  const f = feedNew.get(row.sku);
  const old = Number(row.cents);
  if (!f) { noFeed++; continue; }                               // churn feedist → EI puutu
  if (!old) continue;
  const pct = (f.cents - old) / old * 100;
  if (Math.abs(pct) < 0.5) { same++; continue; }
  const u = { ...row, old, neu: f.cents, markup: f.markup, margin: f.margin, pct };
  updates.push(u);
  // DELTA-alarm: eelmine marginaal olemas JA langus >= läve
  const prev = row.prev_margin == null ? null : Number(row.prev_margin);
  if (prev != null && (prev - f.margin) * 100 >= DROP_PP)
    alarms.push({ sku: row.sku, prev, neu: f.margin, dropPp: ((prev - f.margin) * 100).toFixed(1), oldE: old, newE: f.cents });
}

const up = updates.filter(u => u.pct > 0).length;
console.log(`Olemasolevaid eur-hinnaga:  ${rows.length}`);
console.log(`Feedist puudu (churn):      ${noFeed}`);
console.log(`Sama (<0.5%):               ${same}`);
console.log(`UUENDATAKSE:                ${updates.length}  (kallineb ${up} / odavneb ${updates.length - up})`);
console.log(`Ilma price_history baseline'ita (backfill vaja): ${backfill.length}`);
console.log(`\n🔔 MARGINAALI-ALARM (langus >=${DROP_PP}pp vs eelmine): ${alarms.length}`);
for (const a of alarms.slice(0, 10))
  console.log(`   ${a.sku.padEnd(24)} marginaal ${(a.prev * 100).toFixed(1)}% → ${(a.neu * 100).toFixed(1)}% (−${a.dropPp}pp) | €${(a.oldE / 100).toFixed(2)}→€${(a.newE / 100).toFixed(2)}`);

if (DRY) { console.log(`\n[DRY-RUN] EI kirjutatud. ${updates.length} hinda + ${backfill.length} baseline valmis.`); process.exit(0); }

// ============================ EXECUTE ========================================
q(`ALTER TABLE price_history ADD COLUMN IF NOT EXISTS margin numeric;`, false);

// (1) BASELINE-BACKFILL: post-Omnibus toodete praegune hind ajalukku (Omnibus 30p-min terviklikkus)
if (backfill.length) {
  const sql = ["BEGIN;"];
  for (const b of backfill)
    sql.push(`INSERT INTO price_history(variant_id,product_id,currency_code,amount,changed_at,source)
      VALUES ('${b.variant_id}','${b.product_id}','eur',${Number(b.cents)},now(),'baseline-backfill');`);
  sql.push("COMMIT;");
  q(sql.join("\n"), false);
  console.log(`\n✓ Baseline-backfill: ${backfill.length} toodet price_history'sse.`);
}

// (2) HINNA-UUENDUS + price_history rida (uus marginaal). Ainus price.amount kirjutus.
if (updates.length) {
  const CH = 400;
  for (let i = 0; i < updates.length; i += CH) {
    const batch = updates.slice(i, i + CH);
    const sql = ["BEGIN;"];
    for (const u of batch) {
      sql.push(`UPDATE price SET amount=${u.neu},updated_at=now() WHERE id='${u.price_id}';`);
      sql.push(`INSERT INTO price_history(variant_id,product_id,currency_code,amount,changed_at,source,margin)
        VALUES ('${u.variant_id}','${u.product_id}','eur',${u.neu},now(),'reprice-cycle',${u.margin});`);
    }
    sql.push("COMMIT;");
    q(sql.join("\n"), false);
  }
  console.log(`✅ UUENDATUD: ${updates.length} hinda + price_history read.`);
}

// (3) Marginaali-alarm Slack'i
if (alarms.length && SLACK) {
  const txt = [`🔔 XLM reprice: ${alarms.length} toodet marginaal langes >=${DROP_PP}pp`];
  for (const a of alarms.slice(0, 12)) txt.push(`• ${a.sku}: ${(a.prev * 100).toFixed(1)}%→${(a.neu * 100).toFixed(1)}% (−${a.dropPp}pp)`);
  await fetch(SLACK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: txt.join("\n") }) });
  console.log("✓ Marginaali-alarm Slack'i saadetud.");
}
console.log(`\nVALMIS. HIND = ainus muudetud väli. Kategooriad/tõlked/specs/status PUUTUMATA.`);
