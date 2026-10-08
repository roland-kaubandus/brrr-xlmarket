#!/usr/bin/env node
/*
 * l3-desc-gen.mjs — LAINE 2: L3 TÜÜBIPROFIILI-KIRJELDUSED (SSoT, judge-loetav `product_category.description`).
 *
 * MIKS (Tarmo DIRECTIVE 2026-10-07, plaan #4): öine kohtunik loeb iga L3-kandidaadi `description` esimest 400
 * tähemärki ("↳ piir", candLine judge.mjs). Piirireegliga (ETAPP 2) L3-d ON juba kirjeldusega; ülejäänud
 * ~1361 L3 on ILMA → kohtunik otsustab ainult NIME järgi (nõrk). See generaator annab IGALE L3-le lühikese,
 * funktsioonipõhise (MITTE turundus) tüübiprofiili: mis TÜÜP kuulub + ET/EN märksõnad + naaber-piir.
 *
 * HARD RULE #5 — ÜKS TRANSFORM, KAKS KUTSUJAT:
 *   genDescBatch / validateDesc / descClaimGate = SAMA kood →
 *     (a) backfill-runner (see skript, --execute kõigile) JA
 *     (b) öine auto-create hook (uus L3 saab sünnil kirjelduse — genAssetsGated kõrval).
 *
 * HARD RULE #8 — EI kirjuta DB-d --dry režiimis. --execute kirjutab actor='claude-code-test' logiga + batch_id + undo.
 * ETAPP 2 PIIRIREEGLID (description LIKE 'PIIRIREEGEL%') EI KIRJUTATA ÜLE. Ka olemas-kirjeldusega L3 (nt kalastus) jäetakse vahele.
 *
 * KASUTUS (DRY, vaikimisi):
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/l3-desc-gen.mjs --dry --sample 10        # 10 L3 eri peakategooriast → raport, EI DB
 *   node scripts/l3-desc-gen.mjs --dry --ids pcat_x,pcat_y # kindlad L3-d
 * Väljund: reports/l3-desc-dry-<ts>.md + .json (kulu + näidised + verdiktid). EI muuda DB-d.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
// HARD RULE #5 — ÜKS TRANSFORM, KAKS KUTSUJAT: gen/gate/validate/regen = SSoT scripts/lib/l3-desc.mjs.
//   Sama moodulit impordib ka classify-etapp2-create.mjs (öine auto-create birth-hook).
import {
  GEN_MODEL, JUDGE_MODEL, REF_MODEL, FABLE_MODEL,
  makeCaller, genDescBatch, descClaimGate, validateDesc, regenGate,
} from "./lib/l3-desc.mjs";
export { descClaimGate };   // tagasiühilduvus (varasem test importis siit)

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)."); process.exit(2); }

// hinnad $/1M (in,out) — cache_r = in*0.1, cache_w = in*1.25
const PRICE = {
  "claude-opus-4-8":  { in: 5,  out: 25 },
  "claude-sonnet-5":  { in: 3,  out: 15 },
  "claude-fable-5":   { in: 10, out: 50 },
};

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => (has(f) ? args[args.indexOf(f) + 1] : d);
const DRY = !has("--execute") && !has("--undo");
const EXECUTE = has("--execute");
const UNDO = has("--undo") ? val("--undo", "") : null;   // --undo <batch_id>
const SAMPLE = has("--sample") ? +(val("--sample", "0")) : 0;   // sämpeldus AINULT kui --sample antud (muidu KÕIK sihtmärgid — EXECUTE katab 1493)
const IDS = has("--ids") ? val("--ids", "").split(",").map((s) => s.trim()).filter(Boolean) : null;
const MIN_PROD = +(val("--min", "0"));   // KÕIK kirjelduseta L3 (ka <3 tootega) — Tarmo DIRECTIVE 2026-10-07
const CAP = +(val("--cap", "40"));       // eelarve-lagi $ (fail-loud ületusel)
const REGEN_MAX = +(val("--regen", "2")); // mitu regen-katset gate-kuku korral (lib regenGate)
const TS = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const BATCH_ID = val("--batch-id", `l3desc-${TS}`);
const ACTOR = "claude-code-test";        // HARD RULE #8 — EI inimese identiteet

const REPO = "/opt/xlmarket-github";
const NOTIFY = `${REPO}/scripts/lib/notify-telegram.sh`;
const NO_TELEGRAM = process.env.CLASSIFY_HOOK_NO_TELEGRAM === "1";
function telegram(msg) {
  if (NO_TELEGRAM) { console.log(`📨 [Telegram SUPRESSITUD]\n${msg}`); return; }
  try { execSync(NOTIFY, { input: msg, encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] }); } catch {}
  console.log(`📨 Telegram:\n${msg}`);
}

let DB = "";
try { DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim(); } catch {}
if (!DB) { console.error("🔴 db-k33g konteinerit ei leitud."); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -v ON_ERROR_STOP=1 -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();
const sqlLit = (s) => `'${String(s).replace(/'/g, "''")}'`;   // turvaline string-literal (üksik-jutumärk doubled)

// ──────────────────────────── LEDGER + BACKUP + UNDO (HARD RULE #6: backup+undo kohustuslik) ────────────────────────────
function ensureLedger() {
  q(`CREATE TABLE IF NOT EXISTS l3_desc_ledger (
       id bigserial PRIMARY KEY,
       batch_id text NOT NULL,
       category_id text NOT NULL,
       old_description text,
       new_description text,
       gate_pass boolean,
       consensus text,
       written boolean NOT NULL DEFAULT false,
       reason text,
       actor text NOT NULL DEFAULT 'claude-code-test',
       created_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE INDEX IF NOT EXISTS idx_l3_desc_ledger_batch ON l3_desc_ledger(batch_id);`);
}
function doUndo(batchId) {
  ensureLedger();
  const n = q(`SELECT count(*) FROM l3_desc_ledger WHERE batch_id=${sqlLit(batchId)} AND written=true;`);
  if (!+n) { console.error(`🔴 batch_id=${batchId}: 0 kirjutatud rida (midagi tagasi pöörata pole).`); process.exit(1); }
  // taasta old_description AINULT ridadele, mille praegune description võrdub meie kirjutatud new_description'iga
  // (väldib hilisema käsitsi-muudatuse ülekirjutamist) — turvaline undo
  const res = q(`WITH restored AS (
      UPDATE product_category pc SET description = l.old_description, updated_at=now()
      FROM l3_desc_ledger l
      WHERE l.batch_id=${sqlLit(batchId)} AND l.written=true
        AND pc.id = l.category_id AND pc.description = l.new_description
      RETURNING pc.id)
    SELECT count(*) FROM restored;`);
  telegram(`↩️ XL L3-kirjeldus UNDO · batch=${batchId} · taastatud ${res}/${n} L3 (actor=${ACTOR}). Teised muudetud käsitsi → jäeti puutumata.`);
  console.log(`🟢 UNDO valmis: ${res}/${n} L3 taastatud (batch=${batchId}).`);
  process.exit(0);
}

// ──────────────────────────── 1. SIHTMÄRK-L3-d ────────────────────────────
// Kirjeldust vajavad: L3, millel description IS NULL/tühi (EI piirireegel, EI olemas-profiil). ≥MIN_PROD toodet.
function selectTargets() {
  const where = IDS
    ? `l3.id IN (${IDS.map((i) => `'${i.replace(/[^a-zA-Z0-9_]/g, "")}'`).join(",")})`
    : `(l3.description IS NULL OR l3.description='')
       AND (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) >= ${MIN_PROD}`;
  let rows = q(`SELECT l3.id, l3.name, l3.handle,
      split_part(l3.mpath,'.',1) mainid,
      (SELECT name FROM product_category WHERE id=split_part(l3.mpath,'.',1)) main,
      l3.parent_category_id l2id,
      (SELECT name FROM product_category WHERE id=l3.parent_category_id) l2,
      (SELECT count(*) FROM product_category_product WHERE product_category_id=l3.id) n
    FROM product_category l3
    WHERE l3.mpath LIKE 'pcat_v4_l%' AND l3.deleted_at IS NULL
      AND (char_length(l3.mpath)-char_length(replace(l3.mpath,'.','')))=2
      AND ${where}
    ORDER BY main, l2, l3.name;`)
    .split("\n").filter(Boolean)
    .map((r) => { const [id, name, handle, mainid, main, l2id, l2, n] = r.split("\t"); return { id, name, handle, mainid, main, l2id, l2, n: +n }; });

  // DRY --sample: 1 L3 igast eri peakategooriast (mitmekesisus), eelista rohkem-toodetega
  if (!IDS && SAMPLE && rows.length > SAMPLE) {
    const byMain = new Map();
    for (const r of [...rows].sort((a, b) => b.n - a.n)) if (!byMain.has(r.mainid)) byMain.set(r.mainid, r);
    rows = [...byMain.values()].sort((a, b) => a.main.localeCompare(b.main)).slice(0, SAMPLE);
  }
  // näidistooted + naaber-L3 nimed
  for (const r of rows) {
    r.titles = q(`SELECT left(p.title,95) FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
                  WHERE pcp.product_category_id='${r.id}' ORDER BY p.title LIMIT 8;`).split("\n").filter(Boolean);
    r.naabrid = q(`SELECT name FROM product_category WHERE parent_category_id='${r.l2id}' AND deleted_at IS NULL AND id<>'${r.id}' ORDER BY name;`).split("\n").filter(Boolean);
  }
  return rows;
}

// ──────────────────────────── 2. KULU-ARVESTUS ────────────────────────────
const USAGE = {};
function acc(model, u) {
  if (!u) return;
  const a = (USAGE[model] ||= { in: 0, out: 0, cr: 0, cw: 0 });
  a.in += u.input_tokens || 0; a.out += u.output_tokens || 0;
  a.cr += u.cache_read_input_tokens || 0; a.cw += u.cache_creation_input_tokens || 0;
}
function totalCost() {
  let c = 0;
  for (const [m, u] of Object.entries(USAGE)) {
    const p = PRICE[m] || { in: 0, out: 0 };
    c += (u.in / 1e6) * p.in + (u.out / 1e6) * p.out + (u.cr / 1e6) * p.in * 0.1 + (u.cw / 1e6) * p.in * 1.25;
  }
  return c;
}

// API-kutsuja lib'ist — usage voolab acc()-i (kulu-arvestus). gen/gate/validate/regen = lib (HARD RULE #5 SSoT).
const callApi = makeCaller({ apiKey: KEY, onUsage: acc });

// ──────────────────────────── 6. PÕHIVOOG ────────────────────────────
(async () => {
  if (UNDO) doUndo(UNDO);   // --undo <batch_id> → taasta + välju

  const targets = selectTargets();
  console.error(`Sihtmärke: ${targets.length} L3 (${DRY ? "DRY — EI DB" : `EXECUTE batch=${BATCH_ID}, lagi $${CAP}`}). Peakategooriad: ${[...new Set(targets.map((t) => t.main))].length}.`);
  if (!targets.length) { console.error("🔴 0 sihtmärki."); process.exit(1); }
  if (EXECUTE) ensureLedger();

  // ── kirjuta ÜKS L3 DB-sse (backup old → ledger → UPDATE AINULT kui tühi). Ei kirjuta poolikut. ──
  function writeOne(r, description, gate, validation) {
    const consensus = validation?.consensus || (validation?.error ? "ERROR" : "?");
    const okToWrite = gate.pass && consensus === "OK";
    const reason = !gate.pass ? "GATE: " + (gate.offenders || []).join("; ")
      : validation?.error ? "VALIDATE-VIGA: " + validation.error
      : consensus !== "OK" ? "NOT_OK: " + [validation?.judge?.issues, validation?.ref?.issues, validation?.fable?.issues].filter(Boolean).join(" | ")
      : "";
    if (!EXECUTE) return { written: false, reason: okToWrite ? "(DRY)" : reason };
    // old_description — backup (peaks olema tühi; UPDATE WHERE kaitseb igal juhul)
    const old = q(`SELECT coalesce(description,'') FROM product_category WHERE id=${sqlLit(r.id)};`);
    let written = false;
    if (okToWrite) {
      // UPDATE AINULT kui praegu tühi — EI kirjuta üle PIIRIREEGEL ega olemas-kirjeldust (race-kaitse)
      const upd = q(`WITH u AS (UPDATE product_category SET description=${sqlLit(description)}, updated_at=now()
                     WHERE id=${sqlLit(r.id)} AND (description IS NULL OR description='') RETURNING id)
                     SELECT count(*) FROM u;`);
      written = +upd > 0;
    }
    q(`INSERT INTO l3_desc_ledger (batch_id, category_id, old_description, new_description, gate_pass, consensus, written, reason, actor)
       VALUES (${sqlLit(BATCH_ID)}, ${sqlLit(r.id)}, ${sqlLit(old)}, ${sqlLit(okToWrite ? description : "")},
               ${gate.pass}, ${sqlLit(consensus)}, ${written}, ${sqlLit(written ? "" : reason)}, ${sqlLit(ACTOR)});`);
    return { written, reason: written ? "" : (okToWrite ? "UPDATE 0 rida (polnud tühi — jäeti puutumata)" : reason) };
  }

  const BATCH = 6;
  const results = [];
  let aborted = false;
  for (let i = 0; i < targets.length; i += BATCH) {
    // ── KULU-VÄRAV (fail-loud): ületab lage → peata ENNE uut partiid ──
    if (totalCost() > CAP) {
      aborted = true;
      console.error(`🔴 KULU-LAGI $${CAP} ületatud ($${totalCost().toFixed(2)}) partii ${i} ees → PEATAN (fail-loud).`);
      if (EXECUTE) telegram(`🛑 XL L3-kirjeldus: kulu-lagi $${CAP} ületatud ($${totalCost().toFixed(2)}) → backfill peatatud ${results.length}/${targets.length} juures. batch=${BATCH_ID}. Jätka: --batch-id <uus> või tõsta --cap.`);
      break;
    }
    const batch = targets.slice(i, i + BATCH);
    let gens = [];
    try { gens = await genDescBatch(callApi, batch); }
    catch (e) {
      console.error(`  gen batch ${i} VIGA: ${e.message}`);
      for (const r of batch) { const w = writeOne(r, "", { pass: false, offenders: ["gen-viga: " + e.message] }, { error: e.message }); results.push({ ...r, description: "", error: e.message, ...w }); }
      continue;
    }
    for (const r of batch) {
      const g = gens.find((x) => x.l3_id === r.id) || gens[batch.indexOf(r)];
      let description = (g && g.description || "").trim();
      let gate = descClaimGate(description, `${r.name} ${r.l2} ${r.main}`);
      let regenN = 0;
      // REGEN gate-kuku korral (lib regenGate — tagasiside "väldi X", kuni läbib/ammendub). Säilitab batch-efektiivsuse.
      if (!gate.pass && REGEN_MAX > 0) {
        try { const re = await regenGate(callApi, r, description, gate, { regenMax: REGEN_MAX }); description = re.description; gate = re.gate; regenN = re.attempts; }
        catch (e) { /* jää esialgse gate-kuku juurde */ }
      }
      let validation = null;
      if (gate.pass) { try { validation = await validateDesc(callApi, r, description); } catch (e) { validation = { error: e.message }; } }
      const w = writeOne(r, description, gate, validation);
      results.push({ ...r, description, gate, validation, regenN, ...w });
      console.error(`  [${results.length}/${targets.length}] ${r.main} / ${r.name} → ${validation?.consensus || (gate.pass ? validation?.error || "?" : "GATE")}${gate.pass ? "" : " ⚠GATE"}${regenN ? ` (regen×${regenN})` : ""}${EXECUTE ? (w.written ? " ✍DB" : " ∅" ) : ""}`);
    }
  }

  // ── kulu + ekstrapoleerimine ──
  const FULL_TARGET = 1493; // KÕIK kirjelduseta L3 (ka <3 tootega) — staging seis 2026-10-07
  const cost = totalCost();
  const perL3 = cost / (results.length || 1);
  const extrap = perL3 * FULL_TARGET;
  const writtenN = results.filter((r) => r.written).length;
  const emptyN = results.filter((r) => !r.written).length;

  // ── raport ──
  const okN = results.filter((r) => r.validation?.consensus === "OK").length;
  const gateFail = results.filter((r) => r.gate && !r.gate.pass).length;
  const disagree = results.filter((r) => r.validation?.fable).length;
  const md = [];
  md.push(`# LAINE 2 — L3 TÜÜBIPROFIILI-KIRJELDUSED · DRY RAPORT`);
  md.push(`**${TS}** · generaator=${GEN_MODEL} · kohtunik=${JUDGE_MODEL} · referents=${REF_MODEL} · viigimurdja=${FABLE_MODEL}\n`);
  md.push(`## Kokkuvõte`);
  md.push(`| Mõõdik | Väärtus |`);
  md.push(`|---|---|`);
  md.push(`| Töödeldud L3 | ${results.length} |`);
  md.push(`| Konsensus OK | ${okN}/${results.length} |`);
  md.push(`| Värav kukkus (number/lubadus/pikkus) | ${gateFail} |`);
  md.push(`| Kohtunik↔referents lahkheli (→Fable) | ${disagree} |`);
  if (EXECUTE) {
    md.push(`| **DB-sse kirjutatud** | **${writtenN}** |`);
    md.push(`| Jäi tühjaks (värav/NOT_OK/viga/polnud-tühi) | ${emptyN} |`);
    md.push(`| batch_id (undo) | \`${BATCH_ID}\` |`);
    md.push(`| Katkestatud kulu-lae tõttu | ${aborted ? "🔴 JAH" : "ei"} |`);
  }
  md.push(`| **Kulu (see jooks)** | **$${cost.toFixed(4)}** |`);
  md.push(`| Kulu / L3 | $${perL3.toFixed(4)} |`);
  if (!EXECUTE) { md.push(`| **Ekstrapoleeritud ${FULL_TARGET} L3** | **$${extrap.toFixed(2)}** |`); }
  md.push(`| Eelarve-lagi | $${CAP.toFixed(2)} → ${cost <= CAP ? "✅ sees" : "🔴 ÜLETAS"} |`);
  md.push(``);
  md.push(`### Kulu mudelite kaupa`);
  md.push(`| Mudel | in | out | cache_r | cache_w |`);
  md.push(`|---|---|---|---|---|`);
  for (const [m, u] of Object.entries(USAGE)) md.push(`| ${m} | ${u.in} | ${u.out} | ${u.cr} | ${u.cw} |`);
  md.push(``);
  md.push(`## Näidiskirjeldused (${targets.length})\n`);
  for (const r of results) {
    const v = r.validation || {};
    md.push(`### ${r.main} › ${r.l2} › **${r.name}**  (${r.n} toodet)  \`${r.id}\``);
    md.push(`**Kirjeldus:** ${r.description || "(VIGA: " + (r.error || "tühi") + ")"}`);
    md.push(`**Pikkus:** ${r.description.length} · **Värav:** ${r.gate?.pass ? "✅" : "⚠ " + (r.gate?.offenders || []).join("; ")}`);
    if (v.error) md.push(`**Valideerimine:** VIGA ${v.error}`);
    else {
      md.push(`**Konsensus:** ${v.consensus === "OK" ? "✅ OK" : "🔴 NOT_OK"}${v.fable ? " (lahkheli → Fable otsustas)" : ""}`);
      md.push(`- kohtunik(${JUDGE_MODEL}): ${v.judge?.verdict} ${v.judge?.issues ? "— " + v.judge.issues : ""}`);
      md.push(`- referents(${REF_MODEL}): ${v.ref?.verdict} ${v.ref?.issues ? "— " + v.ref.issues : ""}`);
      if (v.fable) md.push(`- viigimurdja(${FABLE_MODEL}): ${v.fable?.verdict} ${v.fable?.issues ? "— " + v.fable.issues : ""}`);
    }
    md.push(`_näidistooted:_ ${r.titles.slice(0, 4).join(" · ")}`);
    md.push(``);
  }
  const dir = "/opt/eumotors-tasks/reports";
  const tag = EXECUTE ? "exec" : "dry";
  fs.writeFileSync(`${dir}/l3-desc-${tag}-${TS}.json`, JSON.stringify({ ts: TS, batch_id: BATCH_ID, execute: EXECUTE, models: { GEN_MODEL, JUDGE_MODEL, REF_MODEL, FABLE_MODEL }, cost, perL3, extrap, full_target: FULL_TARGET, writtenN, emptyN, aborted, usage: USAGE, results }, null, 1));
  fs.writeFileSync(`${dir}/l3-desc-${tag}-${TS}.md`, md.join("\n"));
  if (EXECUTE) {
    telegram(`✅ XL L3-kirjeldus backfill valmis${aborted ? " (KATKESTATUD kulu-lagi)" : ""} · batch=${BATCH_ID}\n` +
      `DB-sse: ${writtenN} · tühjaks jäi: ${emptyN} (värav/NOT_OK/viga) · konsensus OK ${okN}/${results.length}\n` +
      `kulu $${cost.toFixed(2)}/lagi $${CAP} · undo: node scripts/l3-desc-gen.mjs --undo ${BATCH_ID}`);
  }
  console.log(`\n🟢 ${tag.toUpperCase()} valmis · ${okN}/${results.length} OK · värav-kukk ${gateFail} · lahkheli ${disagree}${EXECUTE ? ` · DB ${writtenN} · tühi ${emptyN}` : ""}`);
  console.log(`💰 kulu $${cost.toFixed(4)} · /L3 $${perL3.toFixed(4)}${EXECUTE ? "" : ` · ${FULL_TARGET} L3 ≈ $${extrap.toFixed(2)} (lagi $${CAP} ${extrap <= CAP ? "✅" : "🔴"})`}`);
  console.log(`📄 reports/l3-desc-${tag}-${TS}.md${EXECUTE ? ` · undo: node scripts/l3-desc-gen.mjs --undo ${BATCH_ID}` : ""}`);
})();
