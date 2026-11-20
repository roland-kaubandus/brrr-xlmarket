/**
 * brand-derive.test.mjs — brändi-tuletuse SSoT testid. VÕRGUTA, STATE'ita.
 *   Jooks: node backend/scripts/lib/brand-derive.test.mjs
 *
 * KESKNE INVARIANT (Tarmo DIRECTIVE 2026-11-20): bränd-agnostiline — TUNDMATU metadata
 *   → null/"" , MITTE "VEVOR". Kaitseb regressiooni, mis märgiks muu-tarnija tooted
 *   (BlackTools/GEKO/Powermat) valesti VEVORiks filter_tokens'is/brand_name'is/Google JSON-LD's.
 */
import assert from "node:assert";
import { BRAND_NAMES, deriveBrandSlug, deriveBrandName } from "./brand-derive.mjs";

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`  ✅ ${name}`); }
  catch (e) { fail++; console.log(`  ❌ ${name}\n       ${e && e.message || e}`); }
}

console.log("brand-derive testid:");

// --- KESKNE: tundmatu → MITTE VEVOR ---
t("deriveBrandSlug: tühi metadata → null (MITTE vevor)", () => {
  assert.strictEqual(deriveBrandSlug({}), null);
  assert.strictEqual(deriveBrandSlug(null), null);
  assert.strictEqual(deriveBrandSlug(undefined), null);
});
t("deriveBrandName: tühi metadata → '' (MITTE 'VEVOR')", () => {
  assert.strictEqual(deriveBrandName({}), "");
  assert.strictEqual(deriveBrandName(null), "");
  assert.notStrictEqual(deriveBrandName({}), "VEVOR");
});
t("tundmatu tarnija (ainult random väljad) → null/'' (MITTE vevor)", () => {
  const meta = { some_other_field: "x", title: "BlackTools saeketas" };
  assert.strictEqual(deriveBrandSlug(meta), null);
  assert.strictEqual(deriveBrandName(meta), "");
});

// --- source (multi-feed) ---
t("source → slug otse; kuvanimi kaardilt", () => {
  assert.strictEqual(deriveBrandSlug({ source: "blacktools" }), "blacktools");
  assert.strictEqual(deriveBrandName({ source: "blacktools" }), "BlackTools");
  assert.strictEqual(deriveBrandName({ source: "VEVOR" }), "VEVOR"); // case-insensitive slug
});
t("source tundmatu slug (pole kaardil) → slug ise kuvanimeks", () => {
  assert.strictEqual(deriveBrandSlug({ source: "geko" }), "geko");
  assert.strictEqual(deriveBrandName({ source: "geko" }), "geko");
});

// --- supplier_sku prefiks ---
t("supplier_sku PM- → powermat", () => {
  assert.strictEqual(deriveBrandSlug({ supplier_sku: "PM-123" }), "powermat");
  assert.strictEqual(deriveBrandName({ supplier_sku: "pm-123" }), "Powermat");
});
t("supplier_sku VV- → vevor", () => {
  assert.strictEqual(deriveBrandSlug({ supplier_sku: "VV-999" }), "vevor");
  assert.strictEqual(deriveBrandName({ supplier_sku: "VV-999" }), "VEVOR");
});
t("supplier_sku tundmatu prefiks (XX-) → null (MITTE vevor)", () => {
  assert.strictEqual(deriveBrandSlug({ supplier_sku: "XX-1" }), null);
  assert.strictEqual(deriveBrandName({ supplier_sku: "XX-1" }), "");
});

// --- vevor_* legacy markerid ---
t("vevor_sku/vevor_product_type/vevor_upc → vevor", () => {
  assert.strictEqual(deriveBrandSlug({ vevor_sku: "ABC" }), "vevor");
  assert.strictEqual(deriveBrandSlug({ vevor_product_type: "Cat Cage" }), "vevor");
  assert.strictEqual(deriveBrandSlug({ vevor_upc: "12345" }), "vevor");
  assert.strictEqual(deriveBrandName({ vevor_sku: "ABC" }), "VEVOR");
});

// --- prioriteet: source võidab ---
t("source võidab supplier_sku/vevor_* üle", () => {
  assert.strictEqual(deriveBrandSlug({ source: "powermat", vevor_sku: "ABC", supplier_sku: "VV-1" }), "powermat");
});

// --- kaart terviklik ---
t("BRAND_NAMES sisaldab teadaolevaid brände", () => {
  assert.strictEqual(BRAND_NAMES.vevor, "VEVOR");
  assert.strictEqual(BRAND_NAMES.powermat, "Powermat");
  assert.strictEqual(BRAND_NAMES.kraftdele, "KraftDele");
  assert.strictEqual(BRAND_NAMES.blacktools, "BlackTools");
});

console.log(`\n${fail === 0 ? "✅ KÕIK LÄBIS" : "❌ KUKKUS"}: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
