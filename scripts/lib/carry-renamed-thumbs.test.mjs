/**
 * Enesetest — carry-renamed-thumbs (HARD RULE #5: pilt liigub handle-muutusega kaasa).
 * Juurpõhjus 2026-11-18: A1 nimetas 6 kat-handle'it ümber → vana ${handle}.webp orvuks,
 * uus handle pildita → INV-20/26 FAIL → blokeeris A2. See test kaitseb regressiooni eest.
 * Jooksuta: cd scripts && node lib/carry-renamed-thumbs.test.mjs
 */
import { carryRenamedThumbs, parseRenameRows } from "./carry-renamed-thumbs.mjs";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let fails = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "✓" : "✗"} ${label}: ${JSON.stringify(got)} (oodatud ${JSON.stringify(want)})`);
  if (!ok) fails++;
}
function ok(label, cond) {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) fails++;
}

// ── fixture: puhas ajutine cat-thumbs kataloog iga testi jaoks ──
function freshDir(files = {}) {
  const d = mkdtempSync(path.join(tmpdir(), "carry-thumbs-"));
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(d, name), body);
  return d;
}
const webp = (d, h) => path.join(d, `${h}.webp`);

console.log("=== parseRenameRows ===");
eq("tab-eraldatud 2 rida", parseRenameRows("a\tb\nc\td"),
  [{ from_slug: "a", to_slug: "b" }, { from_slug: "c", to_slug: "d" }]);
eq("tühjad read filtreeritud", parseRenameRows("a\tb\n\n\nc\td\n").length, 2);
eq("tühi sisend", parseRenameRows(""), []);
eq("null sisend", parseRenameRows(null), []);

console.log("\n=== carryRenamedThumbs: happy path ===");
{
  const d = freshDir({ "vana.webp": "PILT" });
  const calls = [];
  const res = carryRenamedThumbs([{ from_slug: "vana", to_slug: "uus" }], d, (f, t) => calls.push([f, t]));
  eq("carried", res.carried, ["vana → uus"]);
  eq("skipped", res.skipped, 0);
  ok("vana orvuks liigutatud (kustus)", !existsSync(webp(d, "vana")));
  ok("uus handle olemas", existsSync(webp(d, "uus")));
  eq("sisu säilib (lossless)", readFileSync(webp(d, "uus"), "utf8"), "PILT");
  eq("onCalled", calls, [["vana", "uus"]]);
  rmSync(d, { recursive: true, force: true });
}

console.log("\n=== idempotent: uus juba olemas → vahele (ei kirjuta üle) ===");
{
  const d = freshDir({ "vana.webp": "VANA", "uus.webp": "UUS-OLEMAS" });
  const res = carryRenamedThumbs([{ from_slug: "vana", to_slug: "uus" }], d);
  eq("carried tühi", res.carried, []);
  eq("skipped 1", res.skipped, 1);
  eq("uus muutumatu", readFileSync(webp(d, "uus"), "utf8"), "UUS-OLEMAS");
  ok("vana jäi alles (ei liigutatud)", existsSync(webp(d, "vana")));
  rmSync(d, { recursive: true, force: true });
}

console.log("\n=== vana orb puudub → vahele (pole mida kanda) ===");
{
  const d = freshDir({});
  const res = carryRenamedThumbs([{ from_slug: "puudub", to_slug: "uus" }], d);
  eq("carried tühi", res.carried, []);
  eq("skipped 1", res.skipped, 1);
  ok("uus ei teki tühjalt", !existsSync(webp(d, "uus")));
  rmSync(d, { recursive: true, force: true });
}

console.log("\n=== degenereerunud read: from===to / tühjad / null-massiiv ===");
{
  const d = freshDir({ "x.webp": "X" });
  const res = carryRenamedThumbs([
    { from_slug: "x", to_slug: "x" },      // sama → vahele
    { from_slug: "", to_slug: "y" },        // tühi from → vahele
    { from_slug: "z", to_slug: "" },        // tühi to → vahele
    null,                                     // vigane rida → vahele
  ], d);
  eq("carried tühi", res.carried, []);
  eq("skipped 4", res.skipped, 4);
  ok("x puutumata", existsSync(webp(d, "x")));
  rmSync(d, { recursive: true, force: true });
  eq("null renames ei kuku", carryRenamedThumbs(null, d).carried, []);
}

console.log("\n=== mitu renamet partiis + onCarry viga ei blokeeri ===");
{
  const d = freshDir({ "a.webp": "A", "b.webp": "B" });
  const res = carryRenamedThumbs(
    [{ from_slug: "a", to_slug: "a2" }, { from_slug: "b", to_slug: "b2" }],
    d,
    () => { throw new Error("git add kukkus"); } // best-effort: ei tohi liigutust tühistada
  );
  eq("mõlemad carried", res.carried.sort(), ["a → a2", "b → b2"]);
  ok("a2 olemas vaatamata onCarry-veale", existsSync(webp(d, "a2")));
  ok("b2 olemas vaatamata onCarry-veale", existsSync(webp(d, "b2")));
  rmSync(d, { recursive: true, force: true });
}

console.log(`\n${fails === 0 ? "✅ KÕIK OK" : `❌ ${fails} testi kukkus`}`);
process.exit(fails === 0 ? 0 : 1);
