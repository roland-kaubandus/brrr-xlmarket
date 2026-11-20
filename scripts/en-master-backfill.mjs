#!/usr/bin/env node
/**
 * en-master-backfill.mjs — EN-MASTER puhastuse täis-backfill + öise hooki delta.
 *
 * MASTER = puhastatud EN (CLAUDE.md "SISU-ARHITEKTUUR"). Kirjutab `metadata.title_en_clean` +
 * `metadata.description_en_clean` (raw title/description JÄÄVAD). selling_points puutumata.
 *
 * TRANSFORM = scripts/lib/en-master-clean.mjs (HARD RULE #5 SSoT — sama kood DRY + hook + regen).
 * MALL = en-pack-backfill.mjs (Batch API + resume + vaikuse-aken + stack-lukk + undo-sidecar + safe-stop).
 *
 * PIPELINE (chunk kaupa — osaline progress püsib):
 *   BATCH GEN (Sonnet)  → parse (+inline parse-retry) → DETERMINISTLIKUD väravad (1,2,3,4,6)
 *   → BATCH JUDGE (Sonnet, det-läbinutele) → VÄIDE-värav (5)
 *   → BATCH REGEN (1 ring kukkunutele, avoid-note) → re-väravad (det + inline judge)
 *   → meetriline teisendus (addMetric) → DB-kirjutus (vaikuse-aken + stack-lukk, undo-prev ledgerisse)
 *   Kukub pärast regenit → skip-not-block (ledger.skipped) → järgmine öö/deficit proovib uuesti (self-heal).
 *
 * TINGIMUSED (Tarmo GO 2026-11-19):
 *   • Batch API (−50%)  • stack-lukk DB-kirjutusel  • undo (sidecar ledger)  • resume (--batch-id)
 *   • DB-kirjutus AINULT väljaspool 02:45–04:30 (batch-LLM jookseb edasi)  • usage-limit → safe-stop
 *
 * Käsk:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/en-master-backfill.mjs --sample 20              # DRY (vaikimisi): EI kirjuta DB
 *   node scripts/en-master-backfill.mjs --sample 3  --execute    # proov: kirjuta DB (stack-lukk)
 *   node scripts/en-master-backfill.mjs --skus FILE --execute    # delta (öine hook)
 *   node scripts/en-master-backfill.mjs --all --execute          # kogu korpus (~18.8k)
 *   node scripts/en-master-backfill.mjs --all --execute --batch-id <id>   # resume
 *
 * Ledger/undo: reports/en-master-batches/<batch_id>.json  ·  Undo: node scripts/en-master-undo.mjs <batch_id>
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  M_GEN, M_JUDGE, CLEAN_SYS, cleanUser, JUDGE_SYS, judgeUser,
  parseCleanJson, parseJudgeJson, sourceCorpus, numSet, srcUnitPairs,
  runDetGates, applyMetric, buildAvoidNote, rangeCoherenceGate,
} from "./lib/en-master-clean.mjs";
import { runChunk, chunk as chunkArr } from "./lib/content-batch.mjs";
import { acquireStackLock } from "./lib/stack-lock.mjs";
import { sendTelegram, isUsageLimitError } from "./lib/spend-guard.mjs";
// API-KUTSE SSoT (Faas 2, HARD RULE #5): inline parse-retry läbi jagatud kliendi → retry/usage-limit/
//   recordSpend({task:"enmaster:backfill"}) ühes kohas. Batch-tee (runChunk) jääb content-batch'i.
import { callMessages } from "./lib/llm-client.mjs";

const REPO = "/opt/xlmarket-github";
const LEDGER_DIR = `${REPO}/reports/en-master-batches`;
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

const EXECUTE = has("--execute");
const SAMPLE = val("--sample") ? Number(val("--sample")) : null;
const SKUS_FILE = val("--skus");
const ALL = has("--all");
// --base-only (Tarmo 2026-11-19 #3 regen): kirjuta AINULT title_en_base/description_en_base (LLM-tekst),
//   JÄTA title_en_clean/description_en_clean PUUTUMATA. Clean uuendab hiljem en-master-remetric (dry→Opus→GO).
const BASE_ONLY = has("--base-only");
const CHUNK = Number(val("--chunk")) || 2000;
const BATCH_ID = val("--batch-id") || `enmaster-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }
if (!SAMPLE && !SKUS_FILE && !ALL) { console.error("Kasuta üks: --sample N | --skus FILE | --all"); process.exit(2); }

// ── ÜHE-INSTANTSI LUKK (EXECUTE): väldib topelt-batch'i kui öine hook [6.55] JA käsitsi --all kattuvad.
//   Teine instants → STATUS=OK no-op + exit 0 (hook kohtleb kui "tehtud/jookseb juba", EI fail'i).
//   Ainult EXECUTE: DRY (--sample ilma --execute) ei kirjuta ega esita batch'i reaalselt → lukku pole vaja.
fs.mkdirSync(LEDGER_DIR, { recursive: true });
const RUN_LOCK = `${LEDGER_DIR}/.run.lock`;
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } }
if (EXECUTE) {
  if (fs.existsSync(RUN_LOCK)) {
    let held = {}; try { held = JSON.parse(fs.readFileSync(RUN_LOCK, "utf8")); } catch { /* rikutud → üle */ }
    if (held.pid && pidAlive(held.pid)) {
      console.log(`⏸️ en-master juba jookseb (pid=${held.pid}, batch=${held.batch_id}, algus=${held.started}) → see instants loobub (no-op).`);
      console.log(`STATUS=OK done=0 skipped=0 metrized=0`);
      process.exit(0);
    }
    console.error(`⚠️ aegunud run-lock (pid=${held.pid} surnud) → üle kirjutan`);
  }
  fs.writeFileSync(RUN_LOCK, JSON.stringify({ pid: process.pid, batch_id: BATCH_ID, started: new Date().toISOString() }));
  const releaseRunLock = () => { try { const h = JSON.parse(fs.readFileSync(RUN_LOCK, "utf8")); if (h.pid === process.pid) fs.unlinkSync(RUN_LOCK); } catch { /* juba kadunud */ } };
  process.on("exit", releaseRunLock);
  process.on("SIGINT", () => { releaseRunLock(); process.exit(130); });
  process.on("SIGTERM", () => { releaseRunLock(); process.exit(143); });
}

// ── DB (en-pack muster: konteiner võib Coolify-recreate'il muutuda → re-resolve + retry) ──
function resolveDB() {
  const n = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
  if (!n) { console.error("🔴 db-k33g konteiner ei leitud"); process.exit(2); }
  return n;
}
let DB = resolveDB();
const isStaleContainer = (e) => /No such container|is not running|Cannot connect to the Docker daemon/i.test(String(e?.message || e));
function psqlJson(sql) {
  for (let a = 0; a < 2; a++) {
    try {
      const out = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At`, { input: sql, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 }).trim();
      return out ? JSON.parse(out) : [];
    } catch (e) { if (a === 0 && isStaleContainer(e)) { DB = resolveDB(); continue; } throw e; }
  }
}
function psqlWrite(sqlText) {
  for (let a = 0; a < 2; a++) {
    try {
      execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -v ON_ERROR_STOP=1 --single-transaction`, { input: sqlText, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });
      return;
    } catch (e) { if (a === 0 && isStaleContainer(e)) { DB = resolveDB(); continue; } throw e; }
  }
}
const sq = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;

// ── allikas-tingimus: SAMA filter kui deficit.mjs 'enmaster' (HARD RULE #5 SSoT) ──
// title olemas + (selling_points massiiv VÕI specs) → allikas-korpus mittetühi; title_en_clean puudub.
const SOURCE_COND = `p.status='published' AND p.deleted_at IS NULL AND p.title IS NOT NULL
  AND (jsonb_typeof(p.metadata->'selling_points')='array' OR p.metadata->'specs' IS NOT NULL)`;
const COLS = `json_build_object(
  'id', p.id, 'title', p.title, 'description', p.description,
  'selling_points', p.metadata->'selling_points', 'specs', p.metadata->'specs',
  'dimensions', p.metadata->'dimensions', 'vptype', p.metadata->>'vevor_product_type')`;

function loadTargets() {
  if (SKUS_FILE) {
    const raw = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
    if (!raw.length) return [];
    const list = raw.map(sq).join(",");
    // delta/hook: ei nõua title_en_clean puudumist (deficit.mjs valis juba); toeta id VÕI vevor_sku
    return psqlJson(`SELECT coalesce(json_agg(${COLS}),'[]') FROM product p
      WHERE ${SOURCE_COND} AND (p.id IN (${list}) OR p.metadata->>'vevor_sku' IN (${list}));`);
  }
  const order = (SAMPLE ? "ORDER BY md5(p.id)" : "ORDER BY p.id");
  const limit = SAMPLE ? `LIMIT ${SAMPLE}` : "";
  // deficit: title_en_clean PUUDUB (resume/idempotent — juba-puhastatud jäävad välja).
  // Reavalik + ORDER/LIMIT alampäringus (ORDER BY grupeerimata veerg EI tohi olla agregaadiga samal tasemel).
  return psqlJson(`SELECT coalesce(json_agg(obj),'[]') FROM (
    SELECT ${COLS} AS obj FROM product p
    WHERE ${SOURCE_COND} AND (p.metadata->>'title_en_clean') IS NULL
    ${order} ${limit}
  ) s;`);
}

// ── ledger / resume ──
function ledgerPath() { return path.join(LEDGER_DIR, `${BATCH_ID}.json`); }
function loadLedger() {
  const p = ledgerPath();
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  return { batch_id: BATCH_ID, created_at: new Date().toISOString(), execute: EXECUTE, done: {}, prev: {}, skipped: {}, data_quality: {}, samples: [], counts: {} };
}
function saveLedger(l) { fs.mkdirSync(LEDGER_DIR, { recursive: true }); fs.writeFileSync(ledgerPath(), JSON.stringify(l, null, 2)); }

// ── DB-vaikuse aken (öine pipeline 03:00; Tarmo: ära kirjuta 02:45–04:30 — batch-LLM jookseb edasi) ──
function quietWindowMsRemaining() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const START = 2 * 60 + 45, END = 4 * 60 + 30; // 02:45..04:30 (host/local)
  if (mins >= START && mins < END) { const end = new Date(now); end.setHours(4, 30, 0, 0); return end.getTime() - now.getTime(); }
  return 0;
}
async function waitOutQuietWindow(ledger) {
  let rem = quietWindowMsRemaining();
  if (rem <= 0) return;
  const msg = `🟡 EN-master DB-vaikuse aknas (02:45–04:30) — DB-kirjutus OOTAB ~${Math.ceil(rem / 60000)} min (öine pipeline 03:00). Batch-LLM tehtud, ainult kirjutus pausil.`;
  console.log(msg); if (EXECUTE) sendTelegram(msg); saveLedger(ledger);
  while (quietWindowMsRemaining() > 0 && !STOPPED) await new Promise((r) => setTimeout(r, 60_000));
  console.log("🟢 EN-master: vaikuse aken möödas, jätkan DB-kirjutust.");
}

// ── usage-limit safe-stop ──
let STOPPED = false;
function safeStop(reason, ledger) {
  STOPPED = true; saveLedger(ledger);
  const msg = `🟠 EN-master PEATUS ohutult (usage-limit?) batch=${BATCH_ID}\n${reason}\n` +
    `Tehtud: ${Object.keys(ledger.done).length} · jätka: node scripts/en-master-backfill.mjs --all --execute --batch-id ${BATCH_ID}`;
  console.error(msg); if (EXECUTE) sendTelegram(msg);
}

// ── batch params (cache_control jagatud süsteemiplokile — identne system kõigil N päringul) ──
function sysBlock(system) { return [{ type: "text", text: String(system), cache_control: { type: "ephemeral" } }]; }
function pGen(user) { return { model: M_GEN, max_tokens: 1600, system: sysBlock(CLEAN_SYS), messages: [{ role: "user", content: user }] }; }
function pJudge(user) { return { model: M_JUDGE, max_tokens: 900, system: sysBlock(JUDGE_SYS), messages: [{ role: "user", content: user }] }; }

// ── inline (parse-retry / väike hook) — SSoT-klient (sama keha mille vana otse-kutse saatis) ──
async function inlineCall(model, system, user, maxTokens) {
  const { json } = await callMessages({
    apiKey: API_KEY, task: "enmaster:backfill",
    body: { model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] },
  });
  return textOf(json); // textOf = KÕIK text-blokid "\n"-ga (säilitab vana käitumise, mitte ainult esimene)
}
function textOf(message) { return (message?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n"); }
const usageHit = (r) => !r.ok && /credit|usage|insufficient|rate limit|quota/i.test(r.error || "");

(async () => {
  console.log(`🌐 EN-master backfill · batch=${BATCH_ID} · ${EXECUTE ? "EXECUTE" : "DRY"} · DB=${DB} · chunk=${CHUNK}`);
  const ledger = loadLedger();
  let targets = loadTargets();
  const before = targets.length;
  targets = targets.filter((t) => !ledger.done[t.id]); // resume
  console.log(`📋 ${before} sihtmärki · ${before - targets.length} juba tehtud (resume) · ${targets.length} töös`);
  if (!targets.length) { console.log("✓ kõik tehtud"); console.log(`STATUS=OK done=${Object.keys(ledger.done).length} skipped=${Object.keys(ledger.skipped).length}`); return; }

  // eelarvuta allikas-korpus igale tootele
  for (const t of targets) { t._src = sourceCorpus(t); t._nums = numSet(t._src); t._pairs = srcUnitPairs(t._src); }

  const groups = chunkArr(targets, CHUNK);
  let okCount = 0, skipCount = 0, metrCount = 0, regenCount = 0;
  const samples = [];

  for (let gi = 0; gi < groups.length && !STOPPED; gi++) {
    const grp = groups[gi];
    console.log(`\n━━ osa ${gi + 1}/${groups.length} (${grp.length} toodet) ━━`);
    const ix = new Map(grp.map((t, i) => [t.id, i]));
    const byIdx = new Map(grp.map((t, i) => [i, t]));

    // ── BATCH GEN ──
    const reqG = grp.map((t) => ({ custom_id: `g_${ix.get(t.id)}`, params: pGen(cleanUser(t, "")) }));
    let G;
    try { G = await runChunk(reqG, API_KEY, { label: "enmaster:GEN" }); }
    catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) { safeStop(`GEN: ${e.message}`, ledger); break; } throw e; }
    console.log(`  GEN valmis: ${JSON.stringify(G.counts)} (batch ${G.batchId})`);
    if (G.results.some(usageHit)) { safeStop("GEN usage-limit tulemustes", ledger); break; }
    const gMap = new Map(G.results.map((r) => [r.custom_id, r]));

    // ── parse + inline parse-retry ──
    const state = new Map(); // id → {clean, det, orphans, needJudge}
    for (const t of grp) {
      const i = ix.get(t.id), r = gMap.get(`g_${i}`);
      let clean = null;
      try { clean = parseCleanJson(textOf(r?.message)); }
      catch {
        for (let a = 1; a <= 2 && !clean && !STOPPED; a++) {
          try { clean = parseCleanJson(await inlineCall(M_GEN, CLEAN_SYS, cleanUser(t, ""), 1600)); }
          catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) { safeStop(`parse-retry: ${e.message}`, ledger); break; } }
        }
      }
      if (!clean) { state.set(t.id, null); continue; }
      const det = runDetGates(clean, t._nums, t._pairs, t._src, null);
      state.set(t.id, { clean, det, orphans: det.orphans, needJudge: det.detOff.length === 0 });
    }
    if (STOPPED) break;

    // ── BATCH JUDGE (det-läbinutele) ──
    const judgeTargets = grp.filter((t) => state.get(t.id)?.needJudge);
    if (judgeTargets.length) {
      const reqJ = judgeTargets.map((t) => { const s = state.get(t.id); return { custom_id: `j_${ix.get(t.id)}`, params: pJudge(judgeUser(t, s.clean, s.orphans)) }; });
      let J;
      try { J = await runChunk(reqJ, API_KEY, { label: "enmaster:JUDGE" }); }
      catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) { safeStop(`JUDGE: ${e.message}`, ledger); break; } throw e; }
      console.log(`  JUDGE valmis: ${JSON.stringify(J.counts)} (batch ${J.batchId})`);
      if (J.results.some(usageHit)) { safeStop("JUDGE usage-limit tulemustes", ledger); break; }
      const jMap = new Map(J.results.map((r) => [r.custom_id, r]));
      for (const t of judgeTargets) {
        const s = state.get(t.id); const r = jMap.get(`j_${ix.get(t.id)}`);
        let jr = { ok: true, unsupported: [] };
        try { jr = parseJudgeJson(textOf(r?.message)); } catch { jr = { ok: true, unsupported: [] }; } // parse-fail → ära blokeeri (det-väravad hoiavad)
        s.claimOff = (jr && !jr.ok) ? (jr.unsupported || []).map((x) => `VÄIDE «${x.claim}» (${x.field}): ${x.why}`) : [];
      }
    }

    // ── kogu kukkujad (det VÕI väide) → BATCH REGEN (1 ring) ──
    const failTargets = grp.filter((t) => {
      const s = state.get(t.id); if (!s) return false; // parse täiesti kukkus → skip (allpool)
      const off = [...s.det.detOff, ...(s.claimOff || [])];
      s.offenders = off; return off.length > 0;
    });
    if (failTargets.length && !STOPPED) {
      regenCount += failTargets.length;
      console.log(`  väravad kukkusid: ${failTargets.length} → BATCH REGEN (1 ring)`);
      const reqR = failTargets.map((t) => { const s = state.get(t.id); return { custom_id: `r_${ix.get(t.id)}`, params: pGen(cleanUser(t, buildAvoidNote(s.offenders))) }; });
      let R;
      try { R = await runChunk(reqR, API_KEY, { label: "enmaster:REGEN" }); }
      catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) { safeStop(`REGEN: ${e.message}`, ledger); break; } throw e; }
      console.log(`  REGEN valmis: ${JSON.stringify(R.counts)} (batch ${R.batchId})`);
      if (R.results.some(usageHit)) { safeStop("REGEN usage-limit tulemustes", ledger); break; }
      const rMap = new Map(R.results.map((r) => [r.custom_id, r]));
      for (const t of failTargets) {
        const s = state.get(t.id); const r = rMap.get(`r_${ix.get(t.id)}`);
        let clean2 = null;
        try { clean2 = parseCleanJson(textOf(r?.message)); } catch { clean2 = null; }
        if (!clean2) continue; // jääb kukkunuks → skip
        const det2 = runDetGates(clean2, t._nums, t._pairs, t._src, null);
        let claim2 = [];
        if (det2.detOff.length === 0) {
          try { const jr = parseJudgeJson(await inlineCall(M_JUDGE, JUDGE_SYS, judgeUser(t, clean2, det2.orphans), 900)); claim2 = (jr && !jr.ok) ? (jr.unsupported || []).map((x) => `VÄIDE «${x.claim}»`) : []; }
          catch (e) { if (isUsageLimitError(e) || isUsageLimitError(e._json)) { safeStop(`REGEN-judge: ${e.message}`, ledger); break; } claim2 = []; }
        }
        const off2 = [...det2.detOff, ...claim2];
        if (off2.length === 0) { s.clean = clean2; s.det = det2; s.offenders = []; } // regen päästis
        else s.offenders = off2; // ikka katki
      }
    }
    if (STOPPED) break;

    // ── finalize: meetriline teisendus + jaga write / skip ──
    const toWrite = [];
    for (const t of grp) {
      const s = state.get(t.id);
      if (!s) { ledger.skipped[t.id] = { reason: "parse-fail" }; skipCount++; continue; }
      if (s.offenders && s.offenders.length) { ledger.skipped[t.id] = { reason: "gate", offenders: s.offenders.slice(0, 4) }; skipCount++; continue; }
      // BAAS = LLM-tekst ENNE addMetric (Tarmo 2026-11-19 #1 arhitektuur): salvesta eraldi, et tulevane
      // addMetric-parandus oleks deterministlik ümberjooks ILMA LLM-ita. applyMetric muteerib s.clean kohapeal.
      s.base = { title: s.clean.title_en_clean ?? "", description: s.clean.description_en_clean ?? "" };
      const { metrized } = applyMetric(s.clean);
      // PÜSIV ebasiduse-värav addMetric JÄREL (Tarmo 2026-11-19 #3): osaline vahemiku-teisendus → EI kirjuta + signaal.
      const coh = rangeCoherenceGate(s.clean);
      if (!coh.pass) {
        if (BASE_ONLY) {
          // base-only REGEN: värav on CLEAN-kirjutuse valvur. base = LLM-tekst ENNE addMetric → ALATI ohutu
          // salvestada (clean'i ei puututa). remetric rakendab hiljem parandatud addMetric-i + selle värava
          // clean-kirjutusel. Need on just HALVIMA addMetric-iga tooted — neid tahame base'ina hoida, MITTE
          // välja jätta (muidu jääksid igavesti parandamata). Märgi ainult telemeetriasse, ÄRA skibi.
          if (!ledger.base_coherence) ledger.base_coherence = {};
          ledger.base_coherence[t.id] = coh.offenders.slice(0, 4);
        } else {
          ledger.skipped[t.id] = { reason: "coherence", offenders: coh.offenders.slice(0, 4) };
          skipCount++;
          const cmsg = `⚠️ EN-master EBASIDUSUS-VÄRAV (addMetric järel) · ${t.id}: ${coh.offenders[0]} → EI kirjutatud`;
          console.error(cmsg); if (EXECUTE) sendTelegram(cmsg);
          continue;
        }
      }
      if (metrized) metrCount++;
      s.metrized = metrized;
      if (Array.isArray(s.clean.data_quality) && s.clean.data_quality.length) {
        if (!ledger.data_quality) ledger.data_quality = {};
        ledger.data_quality[t.id] = s.clean.data_quality; // C-signaal: allika-vastuolu/väljajätu märked
      }
      toWrite.push(t);
      if (samples.length < 40) samples.push({ id: t.id, vptype: t.vptype, title_raw: (t.title || "").slice(0, 160), title_en_clean: s.clean.title_en_clean, description_en_clean: s.clean.description_en_clean, metrized });
    }
    okCount += toWrite.length;

    // ── DB-kirjutus (vaikuse-aken + stack-lukk; undo-prev ledgerisse) ──
    if (EXECUTE && toWrite.length) {
      await writeChunk(toWrite, state, ledger);
      if (STOPPED) break;
    } else {
      for (const t of toWrite) ledger.done[t.id] = { dry: !EXECUTE, metrized: state.get(t.id).metrized };
      saveLedger(ledger);
    }
    console.log(`  → kirjutada ${toWrite.length} · skip ${grp.length - toWrite.length} (kumulatiiv ok=${okCount} skip=${skipCount})`);
  }

  ledger.samples = samples;
  const dqCount = Object.keys(ledger.data_quality || {}).length;
  ledger.counts = { ok: okCount, skipped: skipCount, metrized: metrCount, regen: regenCount, data_quality: dqCount, base_coherence: Object.keys(ledger.base_coherence || {}).length };
  saveLedger(ledger);

  const status = STOPPED ? "CREDIT" : (skipCount > 0 ? "PARTIAL" : "OK");
  const mark = STOPPED ? "🟠 PEATUS" : (skipCount > 0 ? "⚠️ OSALINE" : "✅ VALMIS");
  const bcCount = Object.keys(ledger.base_coherence || {}).length;
  const sum = `${EXECUTE ? mark : "🟡 DRY " + mark} EN-master · batch=${BATCH_ID}\n` +
    `puhastatud: ${okCount} · skip: ${skipCount} · meetriline: ${metrCount} · regen: ${regenCount} · data-quality-märget: ${dqCount}` +
    (BASE_ONLY ? ` · base-värav-märge: ${bcCount} (addMetric ebasidus — base ikkagi salvestatud, remetric parandab)` : "");
  console.log(`\n${sum}`);
  console.log(`📄 ledger: ${ledgerPath()}`);
  if (EXECUTE) sendTelegram(sum);
  console.log(`STATUS=${status} done=${okCount} skipped=${skipCount} metrized=${metrCount}`);
  if (STOPPED) process.exit(3);       // krediit/usage-degrade (hook → HOIATUS, ei blokeeri)
  if (skipCount > 0) process.exit(2); // osaline (deficit proovib jääki uuesti)
})().catch((e) => { console.error(`🔴 ${e.stack || e.message}`); if (EXECUTE) sendTelegram(`🔴 EN-master KUKKUS batch=${BATCH_ID}: ${e.message}`); process.exit(1); });

// ── DB-kirjutus ühe osa kohta (stack-lukk, transaktsioon, prev-väärtus undo jaoks) ──
async function writeChunk(toWrite, state, ledger) {
  const ids = toWrite.map((t) => t.id);
  // prev-väärtused (undo): clean + base — kas väli oli juba olemas?
  const prev = new Map(psqlJson(`SELECT coalesce(json_agg(t),'[]') FROM (
    SELECT id, metadata->>'title_en_clean' AS tc, metadata->>'description_en_clean' AS dc,
           metadata->>'title_en_base' AS tb, metadata->>'description_en_base' AS db
    FROM product WHERE id = ANY(string_to_array(${sq(ids.join(","))},',')) ) t;`).map((r) => [r.id, r]));

  const stmts = [];
  for (const t of toWrite) {
    const s = state.get(t.id);
    const c = s.clean; const b = s.base || { title: "", description: "" };
    const pv = prev.get(t.id) || {};
    if (BASE_ONLY) {
      // REGEN: AINULT base; clean JÄÄB praeguseks (remetric uuendab peale Opus-GO-d). undo kannab base'i (mitte clean).
      stmts.push(`UPDATE product SET metadata = jsonb_set(jsonb_set(COALESCE(metadata,'{}'::jsonb),`
        + `'{title_en_base}', to_jsonb(${sq(b.title)}::text), true),`
        + `'{description_en_base}', to_jsonb(${sq(b.description)}::text), true), updated_at = NOW() WHERE id = ${sq(t.id)};`);
      ledger.prev[t.id] = { tb: pv.tb ?? null, db: pv.db ?? null }; // tc/dc väljajäetud → undo EI puuduta clean'i
    } else {
      // jsonb_set — 4 välja: clean (metrized, kuvatav) + base (LLM enne addMetric, ümberjooksu allikas).
      // ülejäänud metadata puutumata. raw title/description EI muutu.
      stmts.push(`UPDATE product SET metadata = jsonb_set(jsonb_set(jsonb_set(jsonb_set(COALESCE(metadata,'{}'::jsonb),`
        + `'{title_en_clean}', to_jsonb(${sq(c.title_en_clean)}::text), true),`
        + `'{description_en_clean}', to_jsonb(${sq(c.description_en_clean)}::text), true),`
        + `'{title_en_base}', to_jsonb(${sq(b.title)}::text), true),`
        + `'{description_en_base}', to_jsonb(${sq(b.description)}::text), true), updated_at = NOW() WHERE id = ${sq(t.id)};`);
      ledger.prev[t.id] = { tc: pv.tc ?? null, dc: pv.dc ?? null, tb: pv.tb ?? null, db: pv.db ?? null }; // null = väli puudus → undo EEMALDAB
    }
  }
  if (!stmts.length) return;

  await waitOutQuietWindow(ledger); // Tarmo: ära kirjuta 02:45–04:30
  if (STOPPED) return;
  const release = acquireStackLock({ holder: "en-master-backfill", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 120_000 });
  try {
    psqlWrite(stmts.join("\n"));
    for (const t of toWrite) ledger.done[t.id] = { metrized: state.get(t.id).metrized };
    saveLedger(ledger);
    console.log(`  💾 DB kirjutatud: ${stmts.length} toodet`);
  } catch (e) {
    if (isUsageLimitError(e)) { safeStop(`writeChunk: ${e.message}`, ledger); return; }
    throw e;
  } finally { release(); }
}
