/**
 * Kiire enesetest — mootor vs KINNITATUD valem (reports §0).
 * Jooksuta: cd scripts && node lib/pricing-engine.test.mjs
 */
import { computeRetail } from "./pricing-engine.mjs";
import { computeCost, getSupplier, parsePrice } from "./cost-engine.mjs";
import { computePrice } from "./pricing-engine.mjs";

let fails = 0;
function near(label, got, want, tol = 0.05) {
  const ok = Math.abs(got - want) <= tol;
  console.log(`${ok ? "✓" : "✗"} ${label}: ${got} (oodatud ~${want})`);
  if (!ok) fails++;
}
function eq(label, got, want) {
  const ok = got === want;
  console.log(`${ok ? "✓" : "✗"} ${label}: ${JSON.stringify(got)} (oodatud ${JSON.stringify(want)})`);
  if (!ok) fails++;
}

console.log("=== KINNITATUD VALEM: MAP 330,90 → kliendi hind 367,44 ===");
const r = computeRetail({ priceRaw: "330.90", supplierId: "vevor", weight: 5 });
near("net_purchase (÷1,22)", r.net_purchase, 271.23);
near("cost_net (×0,95)", r.cost_net, 257.67);
near("retail_net (×1,15)", r.retail_net, 296.32);
near("retail_gross (×1,24)", r.retail_gross, 367.44);

console.log("\n=== parsePrice variandid ===");
near('"330.90EUR"', parsePrice("330.90EUR"), 330.90);
near('"1,299.00"', parsePrice("1,299.00"), 1299.00);
near('"1299,00" (EU koma)', parsePrice("1299,00"), 1299.00);
near('"1.299,50" (EU)', parsePrice("1.299,50"), 1299.50);

console.log("\n=== Astmed VÄLJAS → default 1.15 kehtib ===");
const cheap = computePrice({ cost_net: 20, map: 30, supplier: "vevor" });
eq("odav toode rule_id (astmed väljas)", cheap.rule_id, "default");
near("odav markup = 1.15 (mitte 1.35)", cheap.markup, 1.15);

console.log("\n=== EUR passthrough (VEVOR — fx vahele) ===");
const c = computeCost({ priceRaw: 100, supplier: getSupplier("vevor") });
near("100 EUR MAP → net 81.97", c.net_purchase, 81.97);

console.log(fails === 0 ? "\n✅ KÕIK OK" : `\n❌ ${fails} testi kukkus`);
process.exit(fails === 0 ? 0 : 1);
