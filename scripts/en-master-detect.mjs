#!/usr/bin/env node
/**
 * en-master-detect.mjs — DETERMINISTLIK tuvastus: juba-puhastatud tooted, mida A/B-muster mõjutab.
 * (Tarmo 2026-11-19: "Leia KÕIK … mitte ainult need 7 → sihitud re-clean".)
 *
 * READ-ONLY. Ei kirjuta DB-sse, ei võta stack-lukku. Väljund: ID-loend + põhjus → en-master-backfill --skus.
 *
 * MUSTRID (deterministlik, SSoT addMetric/srcUnitPairs):
 *   A1 TOLL / TEISENDAMATA: addMetric(clean) MUUDAB teksti → imperiaalne (toll/jalg/lbs/…) jäi sulgude-väliselt
 *      teisendamata (vana transform ei osanud tolle). Idempotentne → korrektsed EI lipu.
 *   A2 OSALINE TEISENDUS: meetriline mõõtme-grupp "A x B <m/cm/mm> (imperiaalne)" kus grupi number-arv ≠
 *      sulu imperiaal-arv (nt "5 x 2.13 m (7 ft)" → 2 vs 1) → osaline (keelatud).
 *   B PER-VARIANT ÜLDISTUS: clean sisaldab "each/every/all N" + number+ühik, ja ALLIKAS annab samale ühikule
 *      ≥2 ERINEVAT väärtust (variantidel erinevad mõõdud) → üks mõõt vale-üldistatud kõigile.
 *
 * Käsk:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/en-master-detect.mjs                 # kokkuvõte + kirjuta ID-fail
 *   node scripts/en-master-detect.mjs --out FILE      # ID-fail (vaikimisi reports/en-master-affected-<ts>.txt)
 *   node scripts/en-master-detect.mjs --limit 50 --show  # näita esimesi näiteid (silumine)
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { addMetric, srcUnitPairs, sourceCorpus, metricOffenders } from "./lib/en-master-clean.mjs";

const REPO = "/opt/xlmarket-github";
const argv = process.argv.slice(2);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const SHOW = argv.includes("--show");
const LIMIT = val("--limit") ? Number(val("--limit")) : null;
const TS = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUT = val("--out") || `${REPO}/reports/en-master-affected-${TS}.txt`;

function resolveDB() {
  const n = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
  if (!n) { console.error("🔴 db-k33g konteiner ei leitud"); process.exit(2); }
  return n;
}
const DB = resolveDB();
function psqlJson(sql) {
  const out = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At`, { input: sql, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 }).trim();
  return out ? JSON.parse(out) : [];
}

const rows = psqlJson(`SELECT coalesce(json_agg(obj),'[]') FROM (
  SELECT json_build_object(
    'id', p.id,
    'title', p.title, 'description', p.description,
    'selling_points', p.metadata->'selling_points', 'specs', p.metadata->'specs',
    'dimensions', p.metadata->'dimensions', 'vptype', p.metadata->>'vevor_product_type',
    'tc', p.metadata->>'title_en_clean', 'dc', p.metadata->>'description_en_clean'
  ) AS obj
  FROM product p
  WHERE p.status='published' AND p.deleted_at IS NULL
    AND (p.metadata->>'title_en_clean') IS NOT NULL
  ORDER BY p.id ${LIMIT ? `LIMIT ${LIMIT}` : ""}
) s;`);

console.log(`🔎 DETEKTOR · ${rows.length} puhastatud toodet · DB=${DB}`);

// ── A2: osalise teisenduse detektor (meetriline grupp + sulu-imperiaal arv erineb) ──
const PARTIAL_RE = /(\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)+)\s*(mm|cm|m)\b\s*\(([^)]*)\)/gi;
const IMP_IN_PARENS = /\b(in|inch|inches|ft|foot|feet|lbs|lb|gal|oz|psi)\b|["″]/i;
const numCount = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) || []).length;
function partialMismatch(text) {
  let m; PARTIAL_RE.lastIndex = 0;
  while ((m = PARTIAL_RE.exec(text))) {
    if (!IMP_IN_PARENS.test(m[3])) continue;       // sulg peab sisaldama imperiaalset (muidu pole mõõtme-paar)
    if (numCount(m[1]) !== numCount(m[3])) return m[0]; // grupi vs sulu number-arv erineb → osaline
  }
  return null;
}

// ── B: "each/every/per <…> <arv><ühik>" LÄHEDUS (≤30 tähe sees) + allikas annab samale ühikule ≥2 erinevat väärtust.
//   Lähedus väldib valepositiivse "each" (kusagil tekstis) + juhusliku teise ühik-väärtuse (eri atribuut).
const B_PROX = /\b(?:each|every|per)\b[^.;!?]{0,30}?(\d+(?:[.,]\d+)?)\s*(mm|cm|m|kg|g|lbs|in|ft|l|ml|oz)\b/gi;
// allika ühikud, millel ≥2 ERINEVAT väärtust (= variantidel erinevad mõõdud/kaalud)
function multiValUnits(srcPairs) {
  const byUnit = new Map();
  for (const pr of srcPairs) { const [n, u] = pr.split("|"); if (!byUnit.has(u)) byUnit.set(u, new Set()); byUnit.get(u).add(n); }
  const out = new Set();
  for (const [u, vals] of byUnit) if (vals.size >= 2) out.add(u);
  return out;
}
function bProxUnits(text) {
  const s = new Set(); let m; B_PROX.lastIndex = 0;
  while ((m = B_PROX.exec(text))) s.add(m[2].toLowerCase());
  return s;
}

const affected = [];
for (const p of rows) {
  const tc = p.tc || "", dc = p.dc || "";
  const both = `${tc}\n${dc}`;
  const reasons = [];

  // G — PÜSIV VÄRAV (SSoT metricOffenders, sama mis kirjutus-värav): struktuurselt-kindel korruptsioon
  //   (topelt-sulg, kardinaalsus, vale tagasiarvutus, pindala/maht lineaarsena). Rule #5.
  const goff = [...metricOffenders(tc), ...metricOffenders(dc)];
  if (goff.length) reasons.push(`G:värav«${goff[0].slice(0, 36)}»`);
  // A1 — addMetric muudaks (teisendamata imperiaalne sulgude-väliselt)
  const ap = new Set();
  if (addMetric(tc, ap) !== tc || addMetric(dc, new Set()) !== dc) reasons.push("A1:teisendamata-imperiaal");
  // A2 — osaline teisendus
  const pm = partialMismatch(tc) || partialMismatch(dc);
  if (pm) reasons.push(`A2:osaline«${pm.slice(0, 40)}»`);
  // B — per-variant üldistus (lähedus: "each … arv+ühik" + allikas ≥2 erinevat sama-ühiku väärtust)
  const proxUnits = bProxUnits(both);
  if (proxUnits.size) {
    const mv = multiValUnits(srcUnitPairs(sourceCorpus(p)));
    const hit = [...proxUnits].filter((u) => mv.has(u));
    if (hit.length) reasons.push(`B:per-variant-üldistus(${hit.join(",")})`);
  }

  if (reasons.length) affected.push({ id: p.id, tc, reasons });
}

const byPat = { G: 0, A1: 0, A2: 0, B: 0 };
for (const a of affected) for (const r of a.reasons) { if (r.startsWith("G")) byPat.G++; else if (r.startsWith("A1")) byPat.A1++; else if (r.startsWith("A2")) byPat.A2++; else if (r.startsWith("B")) byPat.B++; }
const gateOnly = affected.filter((a) => a.reasons.some((r) => r.startsWith("G"))).length;

console.log(`\n════════ MÕJUTATUD: ${affected.length} / ${rows.length} ════════`);
console.log(`  G  värav (struktuurne korruptsioon): ${byPat.G}   ← kindel regen-sihtmärk`);
console.log(`  A1 teisendamata-imperiaal: ${byPat.A1}`);
console.log(`  A2 osaline-teisendus:      ${byPat.A2}`);
console.log(`  B  per-variant-üldistus:   ${byPat.B}`);
console.log(`  (G-värava tooteid kokku: ${gateOnly})`);

if (SHOW) {
  console.log("\n── näited (max 25) ──");
  for (const a of affected.slice(0, 25)) console.log(`  ${a.id} [${a.reasons.join(" ")}]\n     «${(a.tc || "").slice(0, 80)}»`);
}

if (!LIMIT) { // ID-faili kirjutame ainult täisjooksul (mitte --limit silumisel)
  fs.writeFileSync(OUT, affected.map((a) => a.id).join("\n") + (affected.length ? "\n" : ""));
  fs.writeFileSync(OUT.replace(/\.txt$/, ".json"), JSON.stringify({ generated_at: new Date().toISOString(), total_cleaned: rows.length, affected: affected.length, byPat, items: affected }, null, 2));
  console.log(`\n📄 ID-fail: ${OUT}`);
  console.log(`📄 detail:  ${OUT.replace(/\.txt$/, ".json")}`);
  console.log(`\n→ re-clean: node scripts/en-master-backfill.mjs --skus ${OUT} --execute`);
}
