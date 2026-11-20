// Jooksuta: node --test --experimental-strip-types lib/filter-safe.test.ts
// Testib REAALSET parseFilter SSoT-i (lib/filter-safe.ts) — mida /api/products tarbib.
// Põhifookus: 2026-11-20 hinnavahemiku-bug (<=/>= vaikselt kukutatud) + injection-värav.
import { test } from "node:test"
import assert from "node:assert/strict"
import { parseFilter, parseRangeValue } from "./filter-safe.ts"

test("hinnavahemik: >= läbib (REGRESSIOON — enne kukkus vaikselt)", () => {
  assert.deepEqual(parseFilter("price >= 50"), ["price >= 50"])
})

test("hinnavahemik: <= läbib", () => {
  assert.deepEqual(parseFilter("price <= 100"), ["price <= 100"])
})

test("hinnavahemik: min+max koos (AND, ';')", () => {
  assert.deepEqual(parseFilter("price >= 50;price <= 100"), ["price >= 50", "price <= 100"])
})

test("hinnavahemik: kümnend läbib", () => {
  assert.deepEqual(parseFilter("price >= 49.99"), ["price >= 49.99"])
})

test("hinnavahemik: väljaspool tühikud OK (otsing/page.tsx formaat)", () => {
  assert.deepEqual(parseFilter("price <= 50"), ["price <= 50"])
})

test("segu: hind + filter_tokens mõlemad läbivad", () => {
  assert.deepEqual(
    parseFilter('price <= 50;filter_tokens = "brand:vevor"'),
    ["price <= 50", 'filter_tokens = "brand:vevor"'],
  )
})

test("hinnavahemik ainsa filtrina ei anna enam undefined'i (grid ei tühjene → ei 400)", () => {
  const r = parseFilter("price <= 50")
  assert.ok(r && r.length === 1)
})

// --- Injection / valideerimine ---

test("injection: 'price >= 50 OR deleted = true' kukutatakse (arv ei valideeru)", () => {
  assert.equal(parseFilter("price >= 50 OR x = true"), undefined)
})

test("negatiivne hind kukutatakse", () => {
  assert.equal(parseFilter("price >= -5"), undefined)
})

test("mitte-numbriline hind kukutatakse", () => {
  assert.equal(parseFilter("price >= abc"), undefined)
})

test("teadusmärge/NaN kukutatakse", () => {
  assert.equal(parseFilter("price <= 1e5"), undefined)
  assert.equal(parseFilter("price <= NaN"), undefined)
})

test("lubamatu range-väli kukutatakse (ainult 'price')", () => {
  assert.equal(parseFilter("rating >= 3"), undefined)
  assert.equal(parseFilter("discount_pct >= 10"), undefined)
})

// --- Võrdus ei false-matchi vahemikku ja vastupidi ---

test("võrdus-filtrid töötavad endiselt (filter_tokens)", () => {
  assert.deepEqual(parseFilter('filter_tokens = "brand:vevor"'), ['filter_tokens = "brand:vevor"'])
})

test("boolean võrdus töötab (in_stock)", () => {
  assert.deepEqual(parseFilter("in_stock = true"), ["in_stock = true"])
})

test("kategooria-nimi tühikute+eesti tähtedega säilib", () => {
  assert.deepEqual(
    parseFilter('categories = "Aiatehnika ja -tarvikud"'),
    ['categories = "Aiatehnika ja -tarvikud"'],
  )
})

test("tundmatu väli (field-probe) kukutatakse", () => {
  assert.equal(parseFilter('secret_field = "x"'), undefined)
})

test("filter_tokens koolon kohustuslik; vigane kukub", () => {
  assert.equal(parseFilter('filter_tokens = "brandvevor"'), undefined)
  assert.equal(parseFilter('filter_tokens = "brand:vevor OR x"'), undefined) // tühik keelatud
})

// --- parseRangeValue otse ---

test("parseRangeValue: valid/invalid piirjuhud", () => {
  assert.equal(parseRangeValue("0"), 0)
  assert.equal(parseRangeValue("49.99"), 49.99)
  assert.equal(parseRangeValue("-1"), null)
  assert.equal(parseRangeValue("1e5"), null)
  assert.equal(parseRangeValue(" 5"), null) // trimmimine on kutsuja vastutus
  assert.equal(parseRangeValue("5.5.5"), null)
})
