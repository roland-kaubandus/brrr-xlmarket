// Jooksuta: node --test --experimental-strip-types lib/category-name.test.ts
// Testib categoryName SSoT-i (lib/i18n.ts) — ÜKS locale-nime-tuletus, mida kasutavad
// SubcategoryCarousel, MegaMenu, HomepageShell, haru-leht ja category-tree.nodeName.
// Regressioon 8291d480 (2026-04-20 "EN-only cleanup"): karussell hardcode'is name_en →
// ET-leht kuvas INGLISEKEELSEID alamkategooria-nimesid. See test lukustab käitumise.
import { test } from "node:test"
import assert from "node:assert/strict"
import { categoryName } from "./category-name.ts"

test("ET + name_et olemas → ET nimi (MITTE EN)", () => {
  assert.equal(categoryName({ name_en: "Shower Chairs & Benches", name_et: "Duššitoolid ja -pingid" }, "et"), "Duššitoolid ja -pingid")
  assert.equal(categoryName({ name_en: "Wheelchairs", name_et: "Ratastoolid" }, "et"), "Ratastoolid")
})

test("EN locale → ALATI name_en (ka kui name_et olemas)", () => {
  assert.equal(categoryName({ name_en: "Rollators", name_et: "Rollaatorid" }, "en"), "Rollators")
})

test("ET + name_et PUUDUB → fallback name_en (ei kuku undefined'i)", () => {
  assert.equal(categoryName({ name_en: "Rollators" }, "et"), "Rollators")
  assert.equal(categoryName({ name_en: "Rollators", name_et: null }, "et"), "Rollators")
  assert.equal(categoryName({ name_en: "Rollators", name_et: "" }, "et"), "Rollators")
})

test("tundmatu/tühi locale → name_en (ei garble)", () => {
  assert.equal(categoryName({ name_en: "Wheelchairs", name_et: "Ratastoolid" }, ""), "Wheelchairs")
  assert.equal(categoryName({ name_en: "Wheelchairs", name_et: "Ratastoolid" }, "de"), "Wheelchairs")
})
