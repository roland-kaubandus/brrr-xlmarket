/**
 * Enesetest — addMetric deterministlik ühiku-teisendus, rõhk VAHEMIKE aatomsusel.
 * Jooksuta: cd scripts && node lib/en-master-clean.test.mjs
 *
 * Tarmo 2026-11-19 (parandus B): kriips- ja "to"-vahemik teisenevad TERVIKUNA, mitte pooleldi.
 * Varem lõhkus addMetric vahemiku ("28-32 inch" → "28–81.3 cm (32 inch)") → ebasidus/vale ühik.
 */
import { addMetric, rangeCoherenceOffenders, rangeCoherenceGate, accuracyGate, unitGate, numSet, srcUnitPairs, sourceCorpus, dimsLines, degNorm, isGroundedDimClaim, filterJudgeClaims, stripToolMarkup, normalizeClean, cleanFromMessage, CLEAN_TOOL } from "./en-master-clean.mjs";

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
// NEGATIIVNE temp (2026-11-19 parandus): märk haaratakse, väärtus õige, EI topelt-miinust ("−-16")
eq("b: temp negatiivne üksik", "cools to -4°F inside", "cools to -20 °C (-4°F) inside");
eq("b: temp negatiivne vahemik", "operating -22 to 122°F range", "operating -30 to 50 °C (-22 to 122°F) range");
eq("b: temp neg U+2212 allikas", "reaches −"+"22°F cold", "reaches -30 °C (−"+"22°F) cold");
eq("b: temp duaal allikas (°C/°F) puutumata", "rated -20°C/-4°F low", "rated -20°C/-4°F low");
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

console.log("\n=== PARANDUS 2026-11-19: gate DIMENSIOONI-perekond (mm≡cm≡m) ===");
// allikas annab mm — dimensiooniliselt ÕIGE (1100mm=43.3\"), värav EI tohi "cm ootasin" valepositiivi anda
coh("sidus: mm allikas-duaal", '1100 mm (43.3")', false);
coh("sidus: m allikas-duaal", "2000 mm (78.7 in)", false);
coh("sidus: mL maht-perekond", "500 mL (0.13 gal)", false); // 0.13 gal=0.49 L=490 mL ≈ 500 (tol 4%... 500 vs 492, 1.6%)
// AGA vale VÄÄRTUS mm-is peab ikka lipuma (perekond ok, arv vale):
coh("katki: mm vale väärtus", '50 mm (43.3")', true);     // 50mm=5cm ≠ 110cm

console.log("\n=== PARANDUS 2026-11-19: gate MÄRGI-teadlik (negatiivne temp) ===");
coh("sidus: temp negatiivne", "-16 °C (4°F)", false);      // 4°F=-15.56°C, miinus SÄILIB
coh("sidus: temp neg vahemik", "-18 to 4 °C (0 to 40°F)", false);
coh("katki: temp neg vale", "16 °C (4°F)", true);          // märgi-kadu simul: 16 ≠ -15.56 → ikka lipub

console.log("\n=== PARANDUS 2026-11-19: addMetric allikas-duaal PIKKUS (ei topelt-teisenda) ===");
eq("allikas toll+mm sulus", 'wheel 12" (320 mm) solid', 'wheel 12" (320 mm) solid');
eq("allikas x-grupp toll+cm sulus", "frame 60 x 24 in (152 x 61 cm) steel", "frame 60 x 24 in (152 x 61 cm) steel");
eq("toll / cm kaldkriips", "spaced 2 in / 5 cm apart", "spaced 2 in / 5 cm apart");
// AGA eri perekond (kaal) kõrval EI tohi pikkuse teisendust blokeerida:
eq("eri mõõt: inch + kg (teisenda ikka)", "blade 20 inch, 5 kg weight", "blade 50.8 cm (20 inch), 5 kg weight");

console.log("\n=== PARANDUS 2026-11-19: gate MURD-toll üks väärtus (1/8\"=3.2mm) ===");
coh("sidus: murd-toll", '3.2 mm (1/8")', false);              // 1/8"=3.175mm
coh("sidus: murd-vahemik", "6.4 to 8.0 mm (1/4 to 5/16 in)", false); // 1/4=6.35, 5/16=7.94
coh("sidus: murd 5/8", '15.9 mm (5/8")', false);               // 5/8"=15.875mm
coh("katki: murd vale väärtus", '9 mm (1/8")', true);          // 1/8"=3.2mm ≠ 9mm

console.log("\n=== PARANDUS 2026-11-19: gate RUUT-toll (sq in → cm²) ===");
coh("sidus: ruut-toll", "7432 cm² (1152 square inches)", false); // 1152×6.4516=7432
coh("sidus: sümbol-vahemik tagasiarv", '19.7-21 cm (7.75"-8.25")', false); // kriips vahemik, mitte märk

console.log("\n=== PARANDUS 2026-11-19: korduv sulg AINULT lähestikku (≤60) ===");
coh("sidus: kaug-paren-kordus (proosa)", "Rated (10 lbs) for light tasks around the home and the garden every single day, also holds (10 lbs) elsewhere", false);
coh("katki: lähi-paren-kordus (artefakt)", "capacity (10 lbs) weight (10 lbs) listed", true);
{
  const g = rangeCoherenceGate({ title_en_clean: "ok 71.1-81.3 cm (28-32 inch)", description_en_clean: "bad 28–81.3 cm (32 inch)" });
  const ok = g.pass === false && g.offenders.length === 1;
  console.log(`${ok ? "✓" : "✗"} gate clean-objektil: pass=${g.pass} offenders=${g.offenders.length}`);
  if (!ok) fails++;
}

console.log("\n=== Samm 4.2 (Tarmo 2026-11-21): BASE allika-värav — iga number+ühik base'is allikas ===");
// srcg: jooksuta accuracy+unit BASE-tekstil allika vastu (= remetric SRC_GATE + GEN-aja runDetGates).
//   wantPass=true → base on allika-truu (kirjutus ok); false → number/ühik pole allikas (skip).
function srcg(label, src, baseTitle, baseDesc, wantPass) {
  const srcText = sourceCorpus(src);
  const base = { title_en_clean: baseTitle, description_en_clean: baseDesc };
  const off = [...accuracyGate(base, numSet(srcText)).offenders, ...unitGate(base, srcUnitPairs(srcText), null).offenders];
  const pass = off.length === 0;
  const ok = pass === wantPass;
  console.log(`${ok ? "✓" : "✗"} ${label} → pass=${pass}${ok ? "" : ` (OODATUD ${wantPass}) off=${off[0] || ""}`}`);
  if (!ok) fails++;
}
// PANINI-GRILL (tegelik juht): allikas ANNAB "529 cm² (9"×9")" + 1800 W → base-koopia PEAB läbima (ei fabrikatsioon)
srcg("panini 529 cm² = allika-truu (läbib)",
  { title: 'Panini Maker 9"x9" Plate', selling_points: ["1800W stainless steel"], specs: { plaat_pindala: '529 cm² (9"×9")', voimsus: "1800 W" } },
  "Commercial Electric Panini Grill",
  'Enamel plate with 529 cm² (9"x9") cooking surface and 1800 W element.', true);
// FABRIKATSIOON: base leiutab numbri, mida allikas EI ütle → accuracy-värav püüab
srcg("leiutatud pindala 720 cm² (skip)",
  { title: 'Panini Maker 9"x9" Plate', specs: { plaat_pindala: '529 cm² (9"×9")' } },
  "Panini Grill", "Large 720 cm² cooking surface.", false);
// ISE-TEISENDUS: allikas annab 5 kg, base kirjutab 5 lbs (sama arv, VALE ühik) → unit-värav püüab
srcg("ise-teisendus 5 kg→5 lbs (skip)",
  { title: "Tool", specs: { kaal: "5 kg" } }, "Tool", "Weighs 5 lbs.", false);
// LUBATUD: ainult allika ühikud (imperiaal jäetakse, addMetric lisab hiljem meetrilise)
srcg("imperiaal allikast = ok (läbib)",
  { title: "Hose", specs: { pikkus: "25 ft", labimoot: "12 inch" } }, "PVC Duct Hose", "Flexible hose, 25 ft long, 12 inch diameter.", true);

console.log("\n=== Samm 4.3 (Tarmo 2026-11-21): TOOL-MARKUP lekke saniteerimine (tool_use parse-artefakt) ===");
function tm(label, inVal, wantOut) {
  const got = stripToolMarkup(inVal);
  const ok = got === wantOut;
  console.log(`${ok ? "✓" : "✗"} ${label}${ok ? "" : ` → sain ${JSON.stringify(got)} OODATUD ${JSON.stringify(wantOut)}`}`);
  if (!ok) fails++;
}
// TÄPNE vaadeldud leke: data_quality sulu-markup lekib description-stringi lõppu
tm("desc + </description_en_clean><parameter> leke",
  'Pressure rating is 82.7 bar (40-120 PSI).</description_en_clean>\n<parameter name="data_quality">[]',
  "Pressure rating is 82.7 bar (40-120 PSI).");
tm("title + </title_en_clean> leke", "Rolling Garment Rack</title_en_clean>", "Rolling Garment Rack");
tm("antml:parameter variant", 'Clean text.</description_en_clean><parameter name="x">y', "Clean text.");
tm("puhas tekst muutumatu", "Weighs 16.2 kg and rolls on casters.", "Weighs 16.2 kg and rolls on casters.");
// päris < allika-tekstis (nt "<5 mm") EI tohi kärpida — marker nõuab nime-tagi
tm("päris võrdlusmärk säilib", "Tolerance <5 mm on each panel.", "Tolerance <5 mm on each panel.");
// normalizeClean rakendab saniteerimist mõlemal väljal + taastab data_quality
{
  const n = normalizeClean({ title_en_clean: "Anvil 11.5 kg", description_en_clean: 'Cast steel anvil.</description_en_clean>\n<parameter name="data_quality">["note"]', data_quality: ["note"] });
  const ok = n.description_en_clean === "Cast steel anvil." && n.title_en_clean === "Anvil 11.5 kg";
  console.log(`${ok ? "✓" : "✗"} normalizeClean saniteerib description-lekke → ${JSON.stringify(n.description_en_clean)}`);
  if (!ok) fails++;
}
// cleanFromMessage: tool_use plokk lekke-sisuga → saniteeritud tulemus
{
  const msg = { content: [{ type: "tool_use", name: CLEAN_TOOL.name, input: { title_en_clean: "Bread Box", description_en_clean: 'Wood bread box, 41 x 40 x 11.5 cm.</description_en_clean>\n<parameter name="data_quality">[]', data_quality: [] } }] };
  const c = cleanFromMessage(msg);
  const ok = c.description_en_clean === "Wood bread box, 41 x 40 x 11.5 cm." && !/<\/?(parameter|description_en_clean)/.test(c.description_en_clean);
  console.log(`${ok ? "✓" : "✗"} cleanFromMessage(tool_use) saniteerib → ${JSON.stringify(c.description_en_clean)}`);
  if (!ok) fails++;
}

console.log("\n=== Samm 4.4 (Tarmo 2026-11-21): dimensions kõrvuti-render — väär-positiivse skip'i parandus ===");
// dimsLines renderdab iga mõõdu kõrvuti "N ühik" → unitGate saab paari panna.
{
  const dl = dimsLines({ high: 11.5, long: 41, wide: 40, unit: "cm" });
  const ok = dl.includes("11.5 cm") && dl.includes("41 cm") && dl.includes("40 cm") && dl.length === 3;
  console.log(`${ok ? "✓" : "✗"} dimsLines(flat {high,long,wide,unit}) → ${JSON.stringify(dl)}`);
  if (!ok) fails++;
}
{
  // pesastus + päritav ühik
  const dl = dimsLines({ box: { a: 5, b: 6 }, unit: "mm" });
  const ok = dl.includes("5 mm") && dl.includes("6 mm");
  console.log(`${ok ? "✓" : "✗"} dimsLines(pesastus, päritav unit) → ${JSON.stringify(dl)}`);
  if (!ok) fails++;
}
{
  // ühikuta → ei emiti paari (accuracy katab JSON-ist)
  const dl = dimsLines({ high: 11.5, long: 41 });
  const ok = dl.length === 0;
  console.log(`${ok ? "✓" : "✗"} dimsLines(ilma unit'ita) → ${JSON.stringify(dl)}`);
  if (!ok) fails++;
}
// ENDINE VÄÄR-POSITIIVNE: allikas AINULT dims'is "11.5 cm", base kordab → nüüd LÄBIB (varem skip)
srcg("dims 11.5 cm = allika-truu (läbib, varem väär-skip)",
  { title: "Wooden Bread Box", dimensions: { high: 11.5, long: 41, wide: 40, unit: "cm" } },
  "Wooden Bread Box",
  "Compact wooden bread box, 11.5 cm tall, 41 cm long and 40 cm wide.", true);
// KINDLUS: dims ei muuda fabrikatsiooni lubatuks — number väljaspool dims'i endiselt skip
srcg("dims olemas, aga 99 cm leiutatud (skip)",
  { title: "Box", dimensions: { high: 11.5, long: 41, wide: 40, unit: "cm" } },
  "Box", "Stands 99 cm tall.", false);

console.log("\n=== Samm 5.1 (Tarmo 2026-11-21): ℃/℉ ligatuuri normaliseerimine ===");
{
  const ok = degNorm("0℃-240℃") === "0°C-240°C" && degNorm("32℉-464℉") === "32°F-464°F";
  console.log(`${ok ? "✓" : "✗"} degNorm ligatuur → ${JSON.stringify(degNorm("0℃-240℃"))}`);
  if (!ok) fails++;
}
// allikas ℃-ligatuuriga, base tavalise °C-ga → nüüd LÄBIB (varem det-väär-positiivne)
srcg("℃-ligatuur allikas, 240 °C base (läbib, varem väär-skip)",
  { title: "Rotisserie Oven", specs: { temp: "0℃-240℃ / 32℉-464℉" } },
  "Rotisserie Oven", "Adjustable temperature up to 240 °C for roasting.", true);
// leiutatud temp (üle allika max) → endiselt skip
srcg("leiutatud 300 °C (üle allika, skip)",
  { title: "Oven", specs: { temp: "0℃-240℃" } }, "Oven", "Reaches 300 °C.", false);

console.log("\n=== Samm 5.2 (Tarmo 2026-11-21): kohtuniku KITSAS dim-lõdvendus ===");
{
  const srcPairs = srcUnitPairs(sourceCorpus({ dimensions: { high: 76, long: 46, wide: 41, unit: "cm" } }));
  // allika-truu mõõt-kompositsioon → DROP (pole fabrikatsioon)
  const g1 = isGroundedDimClaim("measures 76 x 46 x 41 cm", srcPairs);
  console.log(`${g1 ? "✓" : "✗"} grounded dim 76x46x41 cm → drop=${g1}`);
  if (!g1) fails++;
  // üks number leiutatud (99 pole allikas) → EI drop (jääb fail)
  const g2 = isGroundedDimClaim("measures 76 x 46 x 99 cm", srcPairs);
  console.log(`${!g2 ? "✓" : "✗"} fabrik 76x46x99 cm → drop=${g2} (OODATUD false)`);
  if (g2) fails++;
  // TARMO NÕUTUD: temperatuurivahemik EI vasta mustrile → EI drop (jääb fail)
  const g3 = isGroundedDimClaim("operating range -10°C to 40°C", srcPairs);
  console.log(`${!g3 ? "✓" : "✗"} temp -10…40°C → drop=${g3} (OODATUD false — fabrikatsioon jääb)`);
  if (g3) fails++;
  // filterJudgeClaims: segu → ainult grounded dim eemaldatakse
  const filtered = filterJudgeClaims([
    { claim: "measures 76 x 46 x 41 cm", field: "description" },
    { claim: "operating range -10°C to 40°C", field: "description" },
    { claim: "includes a titanium blade", field: "description" },
  ], srcPairs);
  const ok = filtered.length === 2 && filtered.every((x) => !/76 x 46 x 41/.test(x.claim));
  console.log(`${ok ? "✓" : "✗"} filterJudgeClaims jätab temp+blade (${filtered.length}/3), eemaldab dim`);
  if (!ok) fails++;
}

console.log("\n=== Samm 4-A (Tarmo 2026-11-21): kõrval-meetriline VAHEMIK → ära topelt-teisenda ===");
// allikas "imperiaal (meetriline-VAHEMIK)" → addMetric EI tohi lisada teist °C-teisendust (topelt-sulg)
eq("A: temp vahemik-annotatsioon kõrval",
   "range of 122-572°F (50-300°C) lets you",
   "range of 122-572°F (50-300°C) lets you");
eq("A: skalaar vahemik-annotatsioon kõrval (ühik eest)",
   "operating 50-300°C (122-572°F) heat",      // °F sulgudes → parenDepth skip; °C jääb
   "operating 50-300°C (122-572°F) heat");
// REGRESSIOON-kaitse: kui kõrval-meetrilist POLE, teisenda ikka normaalselt
eq("A: ilma kõrval-meetriliseta teiseneb ikka",
   "range of 122-572°F only",
   "range of 50-300 °C (122-572°F) only");
// kõrval-meetriline ÜKSIK (mitte vahemik) töötab endiselt
eq("A: üksik meetriline kõrval",
   "heats to 205°F (96°C) max",
   "heats to 205°F (96°C) max");

console.log("\n=== Patch-ring A+B+C (Tarmo 2026-11-21): tilde · CJK-ligatuur · °F/°C paar · fail-closed ===");
// (A) tilde kõrval-meetriline → allikatruu (slush-masina fail: "5~50°F / -15~10°C")
eq("A: tilde-vahemik + kõrval-°C → ära teisenda",
   "range of 5~50°F / -15~10°C lets you",
   "range of 5~50°F / -15~10°C lets you");
// (A) tilde-vahemik ILMA kõrval-meetriliseta → teiseneb vahemikuna (mitte garbled)
eq("A: tilde-vahemik üksi → teiseneb tervikuna",
   "operates 50~100°F zone",
   "operates 10~38 °C (50~100°F) zone");
// (B) CJK ruut-meeter ligatuur → m², kõrval-ft² → allikatruu (diisel-soojendi fail: "215ft²/20㎡")
eq("B: ㎡ ligatuur normaliseeritud + kõrval-ft² skip",
   "keep a 215ft²/20㎡ area warm",
   "keep a 215ft²/20m² area warm");
// (B) kuup-meeter ligatuur paljas normaliseerimine
eq("B: ㎥ ligatuur normaliseeritud",
   "tank volume 3㎥ total",
   "tank volume 3m³ total");
// (C) negatiivne kaldkriipsuga °F/°C paar → ära lisa fabritseeritud teisendust (blast-freezer fail)
eq("C: -0.4°F/-18°C kõrval → allikatruu",
   "drops down to -0.4°F/-18°C within 240 min",
   "drops down to -0.4°F/-18°C within 240 min");
// (C) negatiivne tühikuga °F / °C paar (ice-shelter fail: "-22°F / -5.5°C", allikas ise vastuoluline)
eq("C: -22°F / -5.5°C kõrval → ära fabritseeri -30°C",
   "comfortable down to -22°F / -5.5°C keeping",
   "comfortable down to -22°F / -5.5°C keeping");
// REGRESSIOON: negatiivne üksik °F ILMA kõrval-°C-ta teiseneb endiselt
eq("C: negatiivne üksik °F ilma kõrvalita → teiseneb",
   "freezes at -4°F solid",
   "freezes at -20 °C (-4°F) solid");
// FAIL-CLOSED: osaliselt parsitav mitmik-tilde ("100~200~300°F") → ei teisenda, allikatruu
eq("FC: mitmik-tilde fragment → ära teisenda",
   "cycles 100~200~300°F test",
   "cycles 100~200~300°F test");

console.log(fails === 0 ? "\n✅ KÕIK LÄBIS" : `\n❌ ${fails} EBAÕNNESTUS`);
process.exit(fails === 0 ? 0 : 1);
