/**
 * Enesetest — addMetric deterministlik ühiku-teisendus, rõhk VAHEMIKE aatomsusel.
 * Jooksuta: cd scripts && node lib/en-master-clean.test.mjs
 *
 * Tarmo 2026-11-19 (parandus B): kriips- ja "to"-vahemik teisenevad TERVIKUNA, mitte pooleldi.
 * Varem lõhkus addMetric vahemiku ("28-32 inch" → "28–81.3 cm (32 inch)") → ebasidus/vale ühik.
 */
import { addMetric, rangeCoherenceOffenders, rangeCoherenceGate } from "./en-master-clean.mjs";

let fails = 0;
function eq(label, input, want) {
  const got = addMetric(input, new Set());
  const ok = got === want;
  console.log(`${ok ? "✓" : "✗"} ${label}\n    «${input}»\n    → «${got}»${ok ? "" : `\n    OODATUD «${want}»`}`);
  if (!ok) fails++;
}

console.log("=== VAHEMIK aatomina (parandus B) ===");
eq("kriips-vahemik (inch)", "fits most 28-32 inch TVs", "fits most 71.1-81.3 cm (28-32 inch) TVs");
eq("en-dash vahemik", "fits most 28–32 inch TVs", "fits most 71.1–81.3 cm (28–32 inch) TVs");
eq("bare vahemik lõpus", "adjustable 46-71 inch", "adjustable 117-180 cm (46-71 inch)");
eq("sümbol-vahemik", 'height range 18"-32"', 'height range 45.7-81.3 cm (18"-32")');
eq("to-vahemik (inches)", "height adjusts from 34.8 to 48.4 inches", "height adjusts from 88.4 to 123 cm (34.8 to 48.4 inches)");
eq("to-vahemik (jalg)", "spans 23 to 24 feet", "spans 7.01 to 7.32 m (23 to 24 feet)");
eq("to-vahemik lõpus", "8 to 12 inches wide", "20.3 to 30.5 cm (8 to 12 inches) wide");

console.log("\n=== x-grupp (parandus A) muutumatu ===");
eq("x-grupp kolm", "dimensions 60 x 24 x 12 in overall", "dimensions 152 x 61 x 30.5 cm (60 x 24 x 12 in) overall");
eq("meetriline x-grupp (ei puutu)", "size 5 x 2.13 m", "size 5 x 2.13 m");

console.log("\n=== ÜKSIKväärtus + mitte-pikkus ===");
eq("üksik inch", "blade 20 inch long", "blade 50.8 cm (20 inch) long");
eq("lbs üksik", "weighs 220 lbs total", "weighs 99.8 kg (220 lbs) total");
eq("gal üksik", "holds 5 gallons", "holds 18.9 L (5 gallons)");

console.log("\n=== KAITSED: ei tohi valesti teisendada ===");
eq("bare in = eessõna (skip)", "12 in the box ready", "12 in the box ready");
eq("bare-in vahemik + sõna (skip)", "pack 2-8 in boxes", "pack 2-8 in boxes");
eq("murd-toll (keere, skip)", 'thread 3/8" fitting', 'thread 3/8" fitting');
eq("'into' EI ole vahemik (üksik 3 inch ikka teisendub)", "slide 12 into 3 inch slot", "slide 12 into 7.6 cm (3 inch) slot");
eq("'onto' EI ole vahemik", "fits 5 onto 8 inch base", "fits 5 onto 20.3 cm (8 inch) base");

console.log("\n=== 7 VEAKLASSI raportitest (09:00 / 14:14 / 15:52) ===");
// (a) PINDALA/MAHT mitte lineaarsena
eq("a: pindala ft²", "covers 1500 ft² of space", "covers 139.4 m² (1500 ft²) of space");
eq("a: maht ft³", "tank holds 20 ft³ capacity", "tank holds 0.57 m³ (20 ft³) capacity");
// (b) TEMPERATUUR (°F valem, mitte lineaarne)
eq("b: temp vahemik", "operating 32-104°F range", "operating 0-40 °C (32-104°F) range");
eq("b: temp üksik", "heats up to 205°F max", "heats up to 96 °C (205°F) max");
// (c) ALLIKAS JUBA MEETRILINE → ära teisenda uuesti (topelt-sulu keeld)
eq("c: allikas kg olemas", "weight 100 kg (220 lbs) net", "weight 100 kg (220 lbs) net");
eq("c: allikas m² olemas", "area 50 m² (538 ft²) total", "area 50 m² (538 ft²) total");
// (d) VÄIKE kaal — õige ümardus (0.33 lb → 0.15 kg, mitte 0.1)
eq("d: väike lb ümardus", "net 0.33 lb item", "net 0.15 kg (0.33 lb) item");
// (e) OSALINE kaalu-vahemik → aatomne
eq("e: kaalu-vahemik", "load 132-175 lbs capacity", "load 59.9-79.4 kg (132-175 lbs) capacity");
// (f) TUHANDE-koma (17,600 ≠ 17.6) + tonn puutumata
eq("f: tuhande-koma", "supports 17,600 lbs load", "supports 7983.2 kg (17,600 lbs) load");
eq("f: tonn puutumata", "weighs 8 t total", "weighs 8 t total");
// (g) KLEEBITUD toll vahemikus (71in) → aatomne teisendus
eq("g: kleebitud in vahemik", "adjustable 46-71in bracket", "adjustable 117-180 cm (46-71in) bracket");
// (h) VEDELIK-untsid / untsid = mitmetähenduslik → PUUTUMATA (ei fabritseeri 850 g)
eq("h: vedelik-unts puutumata", "bottle holds 30 ounces (900 mL)", "bottle holds 30 ounces (900 mL)");
eq("h: unts puutumata", "spray 30 oz bottle", "spray 30 oz bottle");
// lisaks: gallonite vahemik
eq("gal-vahemik", "drains 50 to 100 gallons tank", "drains 189.3 to 378.5 L (50 to 100 gallons) tank");

console.log("\n=== PÜSIV EBASIDUSE-VÄRAV (addMetric järel, Tarmo #3) ===");
function coh(label, text, wantOffenders) {
  const n = rangeCoherenceOffenders(text).length;
  const ok = (n > 0) === wantOffenders;
  console.log(`${ok ? "✓" : "✗"} ${label}: «${text}» → ${n} offender${ok ? "" : ` (OODATUD ${wantOffenders ? ">0" : "0"})`}`);
  if (!ok) fails++;
}
coh("katki: kriips-inch", "28–81.3 cm (32 inch)", true);
coh("katki: to-inches", "34.8 to 123 cm (48.4 inches)", true);
coh("katki: to-feet (kahanev)", "23 to 7.32 m (24 feet)", true);
coh("sidus: kriips-vahemik", "71.1–81.3 cm (28–32 inch)", false);
coh("sidus: to-vahemik", "7.01 to 7.32 m (23 to 24 feet)", false);
coh("sidus: x-grupp", "152 x 61 x 30.5 cm (60 x 24 in)", false);
coh("sidus: üksik lbs", "100 kg (220 lbs)", false);
coh("sidus: meetriline vahemik", "905 to 1205 mm", false);
// 7-klassi korruptsioon (ajalooline, peab LIPUMA):
coh("katki: temp kardinaalsus", "46.4-36 °C (96.8°F)", true);
coh("katki: tonn→kg (17,600)", "8 kg (17,600 lbs)", true);
coh("katki: topelt-sulg (fabr. oz)", "850 g (30 ounces) (900 mL)", true);
coh("katki: pindala lineaarsena", "457 m (1500 ft)²", true);
coh("katki: topelt-sulg pikkus", "2.1-2.41 m (6.9-7.9 ft) (2.1-2.4 m)", true);
// uue addMetriku väljund (peab olema SIDUS):
coh("sidus: pindala m²", "139.4 m² (1500 ft²)", false);
coh("sidus: temp vahemik", "0-40 °C (32-104°F)", false);
{
  const g = rangeCoherenceGate({ title_en_clean: "ok 71.1-81.3 cm (28-32 inch)", description_en_clean: "bad 28–81.3 cm (32 inch)" });
  const ok = g.pass === false && g.offenders.length === 1;
  console.log(`${ok ? "✓" : "✗"} gate clean-objektil: pass=${g.pass} offenders=${g.offenders.length}`);
  if (!ok) fails++;
}

console.log(fails === 0 ? "\n✅ KÕIK LÄBIS" : `\n❌ ${fails} EBAÕNNESTUS`);
process.exit(fails === 0 ? 0 : 1);
