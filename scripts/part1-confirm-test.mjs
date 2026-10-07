#!/usr/bin/env node
/* part1-confirm-test.mjs — Part 1 kinnitus-test (Tarmo DIRECTIVE punkt 1, 2026-10-07).
 * Impordib PÄRIS tootmiskoodi (ei mock'i loogikat), mock'ib ainult q (DB) → kinnitab 2 asja:
 *   TEST A — evaluateTransition VÄRAV: clean≥3 + bug=0 AGA verified=false → BLOKEERIB (ei flipi auto_create).
 *            verified=true → flipib. (ohutus-värav töötab.)
 *   TEST B — naabrite-hook PÄRIS-HANDLE: simuleeritud created_l3 (summary.created_l3s) → loadNewL3s
 *            tagastab PÄRIS DB-handle (synthetic:false), MITTE sünteetiline shadow: handle.
 */
import { evaluateTransition } from "./lib/shadow-ledger.mjs";

let pass = 0, fail = 0;
const ok = (name, cond, detail) => { (cond ? pass++ : fail++); console.log(`  ${cond ? "✅" : "🔴"} ${name}${detail ? " — " + detail : ""}`); };

// ── mock q: parameetristatav DB-vastus (clean/bug/config) ──
function mockQ({ clean, bug, auto, verified, updatedAt = "2026-10-06 00:00:00+00" }) {
  return (sql) => {
    if (/FROM classifier_config WHERE id='singleton'/.test(sql) && /auto_create_enabled::text/.test(sql))
      return `${auto ? "t" : "f"}\t${verified ? "t" : "f"}\t\t${updatedAt}`;
    if (/UPDATE classifier_config/.test(sql)) { mockQ._lastUpdate = sql; return ""; }
    if (/count\(DISTINCT cluster_key\)/.test(sql)) return String(clean);       // cleanCount — ENNE bug-regexit
    if (/code_bug AND/.test(sql)) return String(bug);                           // bugSince
    return "";
  };
}

console.log("TEST A — evaluateTransition OHUTUS-VÄRAV (minClean=3):");
// A1: clean=3, bug=0, verified=FALSE → peab BLOKEERIMA
let q = mockQ({ clean: 3, bug: 0, auto: false, verified: false });
let r = evaluateTransition(q, { minClean: 3 });
ok("clean=3,bug=0,verified=FALSE → ei flipi (blockedUnverified)", r.blockedUnverified === true && r.enabled === false && r.changed === false, `enabled=${r.enabled} blocked=${r.blockedUnverified}`);
ok("  → UPDATE classifier_config EI kutsutud (auto_create puutumata)", !/SET auto_create_enabled=true/.test(mockQ._lastUpdate || ""), "setAutoCreate(true) ei jooksnud");

// A2: clean=3, bug=0, verified=TRUE → peab FLIPPIMA
mockQ._lastUpdate = "";
q = mockQ({ clean: 3, bug: 0, auto: false, verified: true });
r = evaluateTransition(q, { minClean: 3 });
ok("clean=3,bug=0,verified=TRUE → FLIPIB (enabled=true)", r.changed === true && r.enabled === true, `changed=${r.changed} enabled=${r.enabled}`);
ok("  → UPDATE SET auto_create_enabled=true kutsutud", /SET auto_create_enabled=true/.test(mockQ._lastUpdate || ""), "setAutoCreate(true) jooksis");

// A3: clean=2 (<min), verified=TRUE → ei flipi (akna kriteerium täitmata)
q = mockQ({ clean: 2, bug: 0, auto: false, verified: true });
r = evaluateTransition(q, { minClean: 3 });
ok("clean=2,verified=TRUE → ei flipi (clean<min)", r.changed === false && r.enabled === false, `clean=${r.cleanCount}`);

// ── TEST B — naabrite-hook päris-handle (FUNKTSIONAALNE: päris neighbor-chain, RESOLVE-ONLY, 0 API-kulu) ──
console.log("\nTEST B — naabrite-hook PÄRIS-HANDLE resolutsioon (simuleeritud auto_create=true):");
import fs from "node:fs";
import { execSync } from "node:child_process";
const REAL = process.argv[2] || "v4-tervis-hooldus-ja-ilu-isikuhooldusseadmed-hammaste-valgendusvahendid";
// simuleeri classify-väljund: (0) created_l3s = PÄRIS loodud L3 (päris handle), + shadow_names olematu tüüp
const classifyOut = { summary: {
  created_l3s: [{ handle: REAL, name: "Test loodud L3", parentL2: "pcat_v4_l15_1" }],
  shadow_names: [{ name: "Täiesti-olematu-tüüp-zzz-" + Date.now(), ck: "test-ck", parentL2: "pcat_v4_l15_1" }],
} };
const inFile = "/tmp/part1-classify-sim.json", outFile = "/tmp/part1-neighbor-out.json";
fs.writeFileSync(inFile, JSON.stringify(classifyOut));
try {
  execSync(`NEIGHBOR_HOOK_FORCE_AUTOCREATE=1 NEIGHBOR_HOOK_RESOLVE_ONLY=1 CLASSIFY_HOOK_NO_TELEGRAM=1 node ${new URL(".", import.meta.url).pathname}pipeline-neighbor-chain.mjs --from-classify ${inFile} --out ${outFile} --dry`,
    { encoding: "utf8", stdio: "pipe" });
} catch (e) { console.log("  (neighbor-chain stderr: " + String(e.stderr || e.message).slice(0, 200) + ")"); }
const res = JSON.parse(fs.readFileSync(outFile, "utf8"));
ok("RESOLVE-ONLY režiim käivitus + simuleeris auto_create=true", res.resolveOnly === true && res.autoCreate === true, `autoCreate=${res.autoCreate}`);
const real = (res.newL3s || []).find((x) => x.handle === REAL);
ok("created_l3s PÄRIS handle jõudis hooki + märgiti isReal:true (synthetic:false)", !!real && real.isReal === true && real.synthetic === false, real ? `handle=${real.handle} isReal=${real.isReal}` : "EI LEITUD");
ok("created_l3s autoriteetne → early-return (shadow_names ei töödelda, õige)", (res.newL3s || []).length === 1, `${(res.newL3s || []).length} L3 (ootus 1)`);
// B2 — sünteetilise tee OHUTUS-VÄRAV (created_l3s TÜHI, olematu shadow_name + auto_create=true):
//   loadNewL3s teeb sünteetilise `shadow:` handle (resolvimata), LIVE-värav tuvastab + SKIP + Telegram →
//   RESOLVE-ONLY väljund tühi (sünteetilist EI targetita). See ON tootmiskaitse (rida 178-186).
const classifyOut2 = { summary: { created_l3s: [], shadow_names: [{ name: "Täiesti-olematu-tüüp-zzz-" + Date.now(), ck: "test-ck", parentL2: "pcat_v4_l15_1" }] } };
fs.writeFileSync(inFile, JSON.stringify(classifyOut2));
let stderr2 = "";
try { execSync(`NEIGHBOR_HOOK_FORCE_AUTOCREATE=1 NEIGHBOR_HOOK_RESOLVE_ONLY=1 CLASSIFY_HOOK_NO_TELEGRAM=1 node ${new URL(".", import.meta.url).pathname}pipeline-neighbor-chain.mjs --from-classify ${inFile} --out ${outFile} --dry`, { encoding: "utf8", stdio: "pipe" }); }
catch (e) { stderr2 = String(e.stderr || ""); }
const r2so = (() => { try { return execSync(`NEIGHBOR_HOOK_FORCE_AUTOCREATE=1 NEIGHBOR_HOOK_RESOLVE_ONLY=1 CLASSIFY_HOOK_NO_TELEGRAM=1 node ${new URL(".", import.meta.url).pathname}pipeline-neighbor-chain.mjs --from-classify ${inFile} --out ${outFile} --dry 2>&1`, { encoding: "utf8" }); } catch (e) { return String(e.stdout || e.stderr || ""); } })();
const res2 = JSON.parse(fs.readFileSync(outFile, "utf8"));
ok("olematu shadow_name + auto_create=true → sünteetiline tuvastatud + SKIP (ohutus-värav)", /jäi sünteetiliseks|SKIP/.test(r2so), r2so.match(/🛑 LIVE:[^\n]*/)?.[0]?.slice(0, 90) || "SKIP-logi puudub");
ok("sünteetiline EI jõua naaber-liigutusse (RESOLVE-ONLY väljund tühi)", (res2.newL3s || []).length === 0, `${(res2.newL3s || []).length} L3 (ootus 0 — filtreeritud)`);
// B3 — eristus loadNewL3s-is (auto_create VÄLJAS → värav ei filtreeri → näeme sünteetilist isReal:false)
fs.writeFileSync(inFile, JSON.stringify(classifyOut2));
try { execSync(`NEIGHBOR_HOOK_RESOLVE_ONLY=1 CLASSIFY_HOOK_NO_TELEGRAM=1 node ${new URL(".", import.meta.url).pathname}pipeline-neighbor-chain.mjs --from-classify ${inFile} --out ${outFile} --dry`, { encoding: "utf8", stdio: "pipe" }); } catch {}
const res3 = JSON.parse(fs.readFileSync(outFile, "utf8"));
const synth = (res3.newL3s || []).find((x) => x.handle.startsWith("shadow:"));
ok("olematu shadow_name (auto_create väljas) → sünteetiline isReal:false — eristus loadNewL3s-is", !!synth && synth.isReal === false, synth ? `handle=${synth.handle}` : "puudub");
ok("pipeline-classify-chain summary.created_l3s väli deklareeritud (loomiskood täidab)", /created_l3s/.test(fs.readFileSync(new URL("./pipeline-classify-chain.mjs", import.meta.url), "utf8")), "väli olemas");

console.log(`\n${fail === 0 ? "🟢 KÕIK LÄBITUD" : "🔴 KUKKUS"} — ${pass} ok, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
