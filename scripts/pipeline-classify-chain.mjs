#!/usr/bin/env node
/**
 * pipeline-classify-chain.mjs — ÖINE B-KLASSIFIKAATORI HOOK (Task 5, "Variant 1 shadow enne").
 *
 * HARD RULE #5 (üks transform, kaks kutsujat): SAMA otsustusahel (scripts/lib/classify-chain.mjs)
 * jookseb nii ETAPP 1 dry-runis (classify-chain-dryrun.mjs) kui siin öises hookis. Ahel ei lahkne.
 * Hook töötab DELTA peal (öine ~100 toodet, --source unhomed), MITTE kogu 18k uuesti (backfill = ETAPP 2).
 *
 * VARIANT 1 — "SHADOW ENNE" (Tarmo directive 2026-10-06):
 *   [1] assign olemas-L3-sse (konsensus / 2-of-3 / ühine ülem LCA) → LIVE KOHE (INSERT pcp + draft→published
 *       + review resolve + review_decision_log actor=claude-code-test). Digest: "auto-assign X, ühine ülem Z, nähtamatu ~0".
 *   [2] UUS L3 → SHADOW: masin läbib KÕIK väravad (DUP/über-frag/nimi/SEO/pilt/täielikkus ahelas), AGA EI LOO.
 *       Logib "oleks loonud" (classifier_shadow_ledger) + Telegram. MITTE inimese järjekorda, MITTE review-bucketi.
 *   [3] mod 3 AUTOMAATNE ÜLEMINEK (HARD RULE #6 — inimene EI otsusta): auto-create lülitub ISE sisse, kui
 *       shadow on töödelnud ≥N PÄRIS uut-tüüpi (DISTINCT cluster_key), kõik väravad stabiilselt läbitud, 0 koodiviga.
 *       Kriteerium KOODIS (shadow-ledger.evaluateTransition), MITTE fikseeritud ööde-arv. Üleminekul: Telegram.
 *       Peale üleminekut: UUS L3 → PÄRIS loomine (classify-etapp2-create.mjs --execute --products, kõik 8 sammu + undo).
 *   [4] mod 4: värav kukub KOODIVEA tõttu (JS-exception, MITTE {pass:false} legitiimne blokk) → shadow tagasi + Telegram.
 *
 * NÄHTAMATU / HOLD (ühist ülemat pole) → review-bucket (ohutu vaikimisi, HARD RULE #6). keep/group/data_quality
 *   (ahel-mitte-sobiv) → samuti review-bucket. UUS L3 shadow'is → tooted jäävad kodutuks (draft), re-proovitakse
 *   järgmisel ööl (idempotentne); nähtavus = ledger + Telegram, MITTE vaikne kadu.
 *
 * KREDIIT/API-DEGRADE: judge/ref/Fable maas (krediit VÕI infra) → exit 3 (DEGRADE, MITTE fail). Orkestraator [4]
 *   näeb rc=3 → tühjendab /tmp/classify-skus.txt → [6]/[6.5] skibivad → laoseis/hind/reindeks JÄTKUB.
 *   (api-maas-degrade otsus: LLM-skip + laoseis jätkub, MITTE hard-abort.)
 *
 * DB: docker exec db-k33g psql (konteineri-sisene auth — kood EI loe saladusi). LLM: ANTHROPIC_API_KEY hostist.
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a            # ANTHROPIC_API_KEY (väärtust EI logita)
 *   node scripts/pipeline-classify-chain.mjs --source unhomed [--limit N] [--dry|--execute]
 *   Vaikimisi = --dry (ahel + raport, EI kirjuta DB-sse). Öine cron [4] kutsub --execute.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import { isCreditError } from "./lib/credit-guard.mjs";
import { clusterize, judgeClassifyClusters, rateClassifyReferenceClusters, resolveClustersSyncVerified } from "./lib/judge.mjs";
import { createChain } from "./lib/classify-chain.mjs";
import {
  ensureShadowSchema, getConfig, recordShadowProposal, recordCodeBug,
  evaluateTransition, MIN_CLEAN_DEFAULT,
} from "./lib/shadow-ledger.mjs";

const REPO = "/opt/xlmarket-github";
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

const argv = process.argv;
const argVal = (n, d) => { const i = argv.indexOf(n); return i > 0 ? argv[i + 1] : d; };
const EXECUTE = argv.includes("--execute");
const DRY = !EXECUTE;
const SOURCE = argVal("--source", "unhomed");
const SKUS_FILE = argVal("--skus");
const LIMIT = parseInt(argVal("--limit", "0")) || 0;
const MIN_CLEAN = parseInt(argVal("--min-clean", String(MIN_CLEAN_DEFAULT))) || MIN_CLEAN_DEFAULT;
const OUT = argVal("--out", "/tmp/pipeline-classify-chain-results.json");

// --- DB helper (re-resolve konteiner-nimi iga write'i juures) ----------------
const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
let DB = getDB();
if (!DB) { console.error("db-k33g konteinerit ei leitud"); process.exit(2); }
const q = (sql, tuplesOnly = true) => {
  DB = getDB();
  const flags = tuplesOnly ? "-tA" : "-A";
  return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket ${flags} -v ON_ERROR_STOP=1 -f -`,
    { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
};
const esc = (s) => (s == null ? "" : String(s).replace(/'/g, "''"));

const NOTIFY = `${REPO}/scripts/lib/notify-telegram.sh`;
const NO_TELEGRAM = process.env.CLASSIFY_HOOK_NO_TELEGRAM === "1";   // test-režiim: ära spämmi päris kanalit
function telegram(msg) {
  if (NO_TELEGRAM) { console.log(`📨 [Telegram SUPRESSITUD test-režiim]\n${msg}`); return; }
  try { execSync(`${NOTIFY}`, { input: msg, encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] }); } catch {}
  console.log(`📨 Telegram:\n${msg}`);
}

// --- SSoT: NODES (ahela-puu + kandidaat-L3-d) --------------------------------
const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8"));
const NODES = tree.nodes;
const candidateL3s = Object.entries(NODES)
  .filter(([, n]) => n.level === 3)
  .map(([h, n]) => ({ handle: h, name: n.name_et || n.name_en || h }));

// --- SIHT-TOOTED (DELTA) — laiendatud: meta.vevor_spu/vevor_product_type/title_et klasterdamiseks ----
function loadTargets() {
  let where;
  if (SOURCE === "skus") {
    if (!SKUS_FILE || !fs.existsSync(SKUS_FILE)) { console.error("--skus <fail> puudub"); process.exit(2); }
    const skus = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
    fs.writeFileSync("/tmp/classify-skus.txt", skus.join("\n"));
    execSync(`docker cp /tmp/classify-skus.txt ${DB}:/tmp/classify-skus.txt`);
    where = `p.metadata->>'vevor_sku' IN (SELECT trim(x) FROM regexp_split_to_table(pg_read_file('/tmp/classify-skus.txt'),E'\\n') x WHERE trim(x)<>'')`;
  } else if (SOURCE === "new-drafts") {
    where = `p.status='draft' AND NOT EXISTS (SELECT 1 FROM product_category_product pcp WHERE pcp.product_id=p.id)`;
  } else if (SOURCE === "all") {
    where = `p.status IN ('draft','published')`;
  } else { // unhomed (vaikimisi) — kõik kodutud draft VÕI published
    where = `p.status IN ('draft','published') AND NOT EXISTS (SELECT 1 FROM product_category_product pcp WHERE pcp.product_id=p.id)`;
  }
  const lim = LIMIT ? `LIMIT ${LIMIT}` : "";
  const rows = q(`SELECT jsonb_build_object(
      'id',p.id,'sku',p.metadata->>'vevor_sku','status',p.status,
      'title',p.title,'title_et',p.metadata->>'title_et',
      'description',left(regexp_replace(coalesce(p.description,''),E'[\\n\\r]+',' ','g'),400),
      'meta',jsonb_build_object(
        'vevor_spu',p.metadata->>'vevor_spu',
        'vevor_product_type',p.metadata->>'vevor_product_type')
    )::text FROM product p WHERE p.deleted_at IS NULL AND (${where}) ORDER BY p.created_at ${lim}`);
  const out = [];
  for (const line of rows.trim().split("\n")) {
    if (line.startsWith("{")) { try { out.push(JSON.parse(line)); } catch {} }
  }
  return out;
}

// --- DEGRADE (krediit VÕI api-maas) → exit 3, laoseis jätkub -----------------
function degrade(pending, cause) {
  console.log(`CREDIT_DEGRADE=1`);
  console.log(`CREDIT_PENDING=${pending}`);
  console.error(`💳 DEGRADE [4]: ${cause} — ${pending} toodet ootab klassifikatsiooni (re-run kui LLM tagasi).`);
  process.exit(3);
}

// --- "assign:<handle> (märkus)" → handle ; "LCA-müügis: <h>-muud (L2)" → <h> ----
const parseAssignHandle = (dec) => {
  if (dec.startsWith("assign:")) return dec.slice(7).replace(/\s*\(.*$/, "").trim();
  if (dec.startsWith("LCA-müügis:")) return dec.replace(/^LCA-müügis:\s*/, "").replace(/\s*\(L\d\)\s*$/, "").replace(/-muud$/, "").trim();
  return null;
};

// ═══════════════════════════════ MAIN ═══════════════════════════════
const targets = loadTargets();
const id2sku = new Map(targets.map((t) => [t.id, t.sku]));
console.log(`=== B-KLASSIFIKAATOR AHEL-HOOK (${DRY ? "DRY" : "EXECUTE"}) — source=${SOURCE} ===`);
console.log(`kandidaat-L3: ${candidateL3s.length} | delta-sihtmärke: ${targets.length}`);
if (!targets.length) {
  console.log("0 delta — midagi klassifitseerida.");
  if (!DRY) fs.writeFileSync("/tmp/classify-skus.txt", "");
  process.exit(0);
}

// ---- 1. KLASTERDA (deterministlik: spu → product_type → title-norm) ----
const clusters = clusterize(targets);
console.log(`klastreid: ${clusters.length}`);

// ---- 2. KOHTUNIK (Opus, klastri-tasand) — VÕTME-VERIFITSEERITUD + poolitamine (HARD RULE #5) ----
// Tarmo 2026-10-07: puuduv/max_tokens → poolita & korda; võõras võti → viska; dup-konflikt → säilita esimene + loenda.
const jVer = await resolveClustersSyncVerified(clusters, {
  callFn: (g) => judgeClassifyClusters(g, candidateL3s, { apiKey: KEY }),
  onLog: (m) => console.error(`  [kohtunik-verify] ${m}`),
});
if (!jVer.ok) {
  const cause = isCreditError(String(jVer.firstError || "")) ? "krediit maas (kohtunik)" : `kohtunik-LLM maas: ${String(jVer.firstError || "").slice(0, 120)}`;
  degrade(targets.length, cause);
}
const judgeByKey = jVer.byKey;
const judgeUnresolved = new Set(jVer.unresolved);   // kärpe-auk pärast poolitamist → pending (MITTE vaikne keep)

// ---- 3. REFERENTS (Sonnet-5, PIME, klastri-tasand) — VÕTME-VERIFITSEERITUD ----
const rVer = await resolveClustersSyncVerified(clusters, {
  callFn: (g) => rateClassifyReferenceClusters(g, candidateL3s, { apiKey: KEY }),
  onLog: (m) => console.error(`  [referents-verify] ${m}`),
});
if (!rVer.ok) {
  const cause = isCreditError(String(rVer.firstError || "")) ? "krediit maas (referents)" : `referents-LLM maas: ${String(rVer.firstError || "").slice(0, 120)}`;
  degrade(targets.length, cause);
}
const refByKey = rVer.byKey;

// võtme-terviklus-loendurid (Telegram/raport — vaikne kadu EI juhtu)
const keyIntegrity = {
  judge_pending: jVer.unresolved.length, judge_foreign: jVer.foreign.length, judge_dup_conflicts: jVer.duplicates.filter((d) => d.conflict).length,
  ref_pending: rVer.unresolved.length, ref_foreign: rVer.foreign.length, ref_dup_conflicts: rVer.duplicates.filter((d) => d.conflict).length,
};
if (Object.values(keyIntegrity).some((x) => x > 0))
  console.error(`  🔑 võtme-terviklus: kohtunik(pending ${keyIntegrity.judge_pending}, võõr ${keyIntegrity.judge_foreign}, dup-konflikt ${keyIntegrity.judge_dup_conflicts}) referents(pending ${keyIntegrity.ref_pending}, võõr ${keyIntegrity.ref_foreign}, dup-konflikt ${keyIntegrity.ref_dup_conflicts})`);

// ---- 4. EHITA AHELA-KLASTRID + eralda ahel-mitte-sobivad (keep/group → review) ----
const CHAIN_ACTIONS = new Set(["assign_existing", "new_l3"]);
const chainClusters = [];
const reviewClusters = [];   // keep/group/data_quality/otsuseta → review-bucket (ohutu vaikimisi)
for (const cl of clusters) {
  const jv = judgeByKey.get(cl.cluster_key);
  const rv = refByKey.get(cl.cluster_key);
  const judgeAction = jv?.action || null;
  if (!jv || !CHAIN_ACTIONS.has(judgeAction)) {
    // hindamata-kärpe-auk (poolitamine ammendus) → PENDING, mitte vaikne "otsuseta"; Telegram-loendur all
    const noVerdictReason = judgeUnresolved.has(cl.cluster_key)
      ? "pending: hindamata-kärpe-auk (poolitamine ammendus → järgmine öö)"
      : "kohtunik ei andnud otsust";
    reviewClusters.push({ cl, jv, rv, reason: jv ? `kohtunik=${judgeAction}` : noVerdictReason, pending: !jv && judgeUnresolved.has(cl.cluster_key) });
    continue;
  }
  const judgeTarget = jv.target_handle || null;
  const refAction = rv?.action || "keep";
  const refTarget = rv?.target_handle || null;
  const candidates = [...new Set([...(jv.considered_l3s || []), judgeTarget, refTarget].filter(Boolean))];
  chainClusters.push({
    ck: cl.cluster_key, n: cl.items.length, items: cl.items, titles: cl.items.map((i) => i.title),
    judgeAction, judgeTarget, refAction, refTarget, refReason: rv?.reason || "",
    judgeNewL3Name: jv.new_l3_name || null, judgeParentL2: jv.parent_l2_handle || null, candidates,
  });
}
console.log(`ahel-sobivaid klastreid: ${chainClusters.length} | review-bucketisse (keep/group): ${reviewClusters.length}`);

// ---- 5. AHEL (§2c asümmeetriline kindlus + väravad) — PER-KLASTER viga-isolatsioon (HARD RULE #5) ----
const chain = createChain({ nodes: NODES, apiKey: KEY, cache: { __v2: true }, fresh: false });
const results = [];
let creditHit = false, codeBugHit = 0;
const BATCH_ID = `hook-${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}`;

function classifyThrow(e) {
  const msg = String(e?.message || e);
  if (isCreditError(msg)) return "credit";
  if (/Fable HTTP (429|5\d\d)|fetch failed|network|timeout|aborted|ECONN|ETIMEDOUT|EAI_AGAIN|socket|AbortError/i.test(msg)) return "api";
  return "code_bug";   // päris JS-viga väravas → mod 4
}

for (const cc of chainClusters) {
  try {
    const [r] = await chain.resolveChain([cc]);   // üks klaster → viga ei peata kogu partiid
    results.push(r);
  } catch (e) {
    const kind = classifyThrow(e);
    if (kind === "credit") { creditHit = true; break; }
    if (kind === "api") {
      console.error(`  ⚠️ ${cc.ck}: api-maas ahelas (${String(e.message).slice(0, 80)}) → klaster review-bucketisse, jätka`);
      reviewClusters.push({ cl: { cluster_key: cc.ck, items: cc.items }, jv: null, rv: null, reason: "api-maas ahelas" });
    } else {
      // mod 4 — KOODIVIGA väravas: logi + shadow tagasi (evaluateTransition näeb) + Telegram; klaster review'sse
      codeBugHit++;
      const detail = String(e.stack || e.message).slice(0, 400);
      console.error(`  🐞 ${cc.ck}: KOODIVIGA ahelas → recordCodeBug + review-bucketisse\n${detail}`);
      if (!DRY) { ensureShadowSchema(q); recordCodeBug(q, { batch_id: BATCH_ID, cluster_key: cc.ck, detail }); }
      reviewClusters.push({ cl: { cluster_key: cc.ck, items: cc.items }, jv: null, rv: null, reason: "koodiviga ahelas" });
    }
  }
}
if (creditHit && !results.length) degrade(targets.length, "krediit maas (ahel, 0 tulemust)");

// ---- 6. KLASSIFITSEERI TULEMUSED → LIVE-assign / shadow-new_l3 / review ----
const itemsByCk = new Map(chainClusters.map((c) => [c.ck, c.items]));
const liveAssign = new Map();   // handle → Set(product_id)
const addLive = (handle, ids) => { const s = liveAssign.get(handle) || new Set(); ids.forEach((x) => s.add(x)); liveAssign.set(handle, s); };
const shadowNew = [];           // { ck, name, parentL2, n, origin, gate, product_ids, path }
const reviewRows = [];          // { id, sku, title, bucket, proposed_l3, suggest_name, suggest_l2, confidence, reason }

// keep/group/api/koodiviga klastrid → review-bucket
for (const { cl, jv, reason } of reviewClusters) {
  for (const it of (cl.items || [])) {
    reviewRows.push({
      id: it.id, sku: it.sku, title: (it.title || "").slice(0, 70), bucket: "review",
      proposed_l3: jv?.target_handle || null, suggest_name: jv?.new_l3_name || "",
      suggest_l2: jv?.parent_l2_handle || "", confidence: jv?.confidence || 0, reason: (reason || "").slice(0, 118),
    });
  }
}

for (const r of results) {
  const ids = (itemsByCk.get(r.ck) || []).map((x) => x.id);
  const dec = r.decisionFinal || r.decision;
  const isShadowNewL3 = r.decision === "new_l3" && r.gate && r.gate.allPass === true && !r.decisionFinal;

  if (isShadowNewL3) {
    shadowNew.push({
      ck: r.ck, name: r.finalName || r.newName, parentL2: r.parentL2, n: r.n,
      origin: r.newOrigin || "?", gate: r.gate?.gates || {}, product_ids: ids, path: r.path,
    });
    continue;   // SHADOW: EI loo, EI homi — tooted jäävad kodutuks (re-proovitakse järgmisel ööl)
  }

  if (dec && (dec.startsWith("assign:") || dec.startsWith("LCA-müügis:"))) {
    const handle = parseAssignHandle(dec);
    if (handle) addLive(handle, ids);
    else reviewRows.push(...ids.map((id) => ({ id, sku: id2sku.get(id), title: "", bucket: "review", reason: "assign-handle parse fail" })));
    // värav-blokk new_l3 (decisionFinal=assign) → logi ka shadow'sse all_gates_pass=false
    if (r.decision === "new_l3" && r.decisionFinal && !DRY) {
      ensureShadowSchema(q);
      recordShadowProposal(q, {
        batch_id: BATCH_ID, cluster_key: r.ck, proposed_name: r.newName || r.finalName || null,
        parent_l2_handle: r.parentL2 || null, origin: r.newOrigin || "värav-blokk",
        n_products: r.n, all_gates_pass: false, gates: r.gate?.gates || {},
      });
    }
    continue;
  }

  // NÄHTAMATU / HOLD / muu → review-bucket (ohutu vaikimisi)
  for (const id of ids) reviewRows.push({
    id, sku: id2sku.get(id), title: "", bucket: "review",
    reason: (`[${dec || "?"}] ${r.fallbackReason || ""}`).slice(0, 118),
  });
}

// ---- 7. LIVE-assign väravad: siht-handle PEAB DB-s olema (muidu → review, ohutu vaikimisi) ----
const handleIdOf = {};
for (const handle of liveAssign.keys()) {
  const id = q(`SELECT id FROM product_category WHERE handle='${esc(handle)}' AND deleted_at IS NULL LIMIT 1;`).trim();
  if (id) handleIdOf[handle] = id;
  else {
    console.error(`  ⚠️ assign-siht '${handle}' puudub DB-s → ${liveAssign.get(handle).size} toodet review-bucketisse (ohutu vaikimisi)`);
    for (const pid of liveAssign.get(handle)) reviewRows.push({ id: pid, sku: id2sku.get(pid), title: "", bucket: "review", reason: `assign-siht '${handle}' puudub DB-s`.slice(0, 118) });
    liveAssign.delete(handle);
  }
}

const liveAssignPairs = [];   // {product_id, cat_id, handle}
for (const [handle, set] of liveAssign) for (const pid of set) liveAssignPairs.push({ product_id: pid, cat_id: handleIdOf[handle], handle });
const homedIds = [...new Set(liveAssignPairs.map((p) => p.product_id))];

// ---- RAPORT ----
const summary = {
  generated_at: new Date().toISOString(), dry: DRY, source: SOURCE, batch_id: BATCH_ID,
  delta: targets.length, clusters: clusters.length,
  live_assign_products: homedIds.length, live_assign_targets: Object.keys(handleIdOf).length,
  shadow_new_l3: shadowNew.length, review_products: reviewRows.length,
  code_bugs: codeBugHit, credit_hit: creditHit,
  key_integrity: keyIntegrity,
  pending_clusters: reviewClusters.filter((r) => r.pending).length,   // hindamata-kärpe-augud (ei "otsuseta")
  shadow_names: shadowNew.map((s) => ({ ck: s.ck, name: s.name, parentL2: s.parentL2, n: s.n, origin: s.origin })),
};
fs.writeFileSync(OUT, JSON.stringify({ summary, results: results.map(({ _cluster, ...r }) => r) }, null, 1));
console.log(`\n=== KOKKUVÕTE ===`);
console.log(`LIVE-assign: ${homedIds.length} toodet → ${Object.keys(handleIdOf).length} olemas-L3`);
console.log(`SHADOW (uus L3, oleks loonud): ${shadowNew.length}${shadowNew.map((s) => `\n   • «${s.name}» (${s.origin}) ×${s.n} → ${s.parentL2}`).join("")}`);
console.log(`REVIEW-bucket: ${reviewRows.length} toodet | koodivigu: ${codeBugHit} | krediit-hit: ${creditHit}`);
if (summary.pending_clusters || Object.values(keyIntegrity).some((x) => x > 0))
  console.log(`VÕTME-TERVIKLUS: pending ${summary.pending_clusters} klastrit | kohtunik(võõr ${keyIntegrity.judge_foreign}, dup-konflikt ${keyIntegrity.judge_dup_conflicts}) referents(võõr ${keyIntegrity.ref_foreign}, dup-konflikt ${keyIntegrity.ref_dup_conflicts})`);

if (DRY) {
  console.log(`\n[DRY] EI kirjutatud DB-sse. Tulemused: ${OUT}`);
  if (creditHit) degrade(targets.length, "krediit maas (dry)");
  process.exit(0);
}

// ═══════════════════════════════ EXECUTE (DB) ═══════════════════════════════
ensureShadowSchema(q);
// classification_review tabel (idempotentne — sama skeem kui pipeline-classify.mjs)
q(`CREATE TABLE IF NOT EXISTS classification_review (
    product_id text PRIMARY KEY, sku text, title text, bucket text NOT NULL,
    proposed_l3 text, suggest_name text, suggest_l2 text, confidence numeric, reason text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE INDEX IF NOT EXISTS idx_clsrev_status ON classification_review(status, bucket);`, false);

// ---- [1] LIVE assign → INSERT pcp + draft→published + review resolve (üks transaktsioon) ----
if (liveAssignPairs.length) {
  const attachVals = liveAssignPairs.map((x) => `('${esc(x.product_id)}','${esc(x.cat_id)}')`).join(",\n    ");
  const pidList = homedIds.map((id) => `'${esc(id)}'`).join(",");
  q(`BEGIN;
    INSERT INTO product_category_product (product_id, product_category_id) VALUES
    ${attachVals}
    ON CONFLICT DO NOTHING;
    UPDATE product SET status='published', updated_at=now() WHERE id IN (${pidList}) AND status='draft' AND deleted_at IS NULL;
    UPDATE classification_review SET status='resolved', updated_at=now() WHERE product_id IN (${pidList}) AND status='pending';
    COMMIT;`, false);
  // audit-log (HARD RULE #8 — actor=claude-code-test, kanal api; MITTE inimese identiteet)
  for (const [handle, catId] of Object.entries(handleIdOf)) {
    const ids = liveAssignPairs.filter((p) => p.handle === handle).map((p) => p.product_id);
    q(`INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, target_handle, status, affected, meta)
       VALUES ('claude-code-test','claude-code-test','api','auto-classifier','assign_existing','${esc(handle)}','applied',
         '${esc(JSON.stringify(ids))}'::jsonb, '${esc(JSON.stringify({ batch_id: BATCH_ID, l3_id: catId }))}'::jsonb);`, false);
  }
  console.log(`✅ LIVE-assign: ${homedIds.length} toodet → ${Object.keys(handleIdOf).length} L3 (draft→published, review resolved).`);
}

// ---- [review] keep/group/NÄHTAMATU/HOLD → review-bucket (upsert, EI paiguta/publitseeri) ----
if (reviewRows.length) {
  // dedup product_id (üks rida tootele; esimene võidab)
  const seen = new Set();
  const uniq = reviewRows.filter((r) => r.id && !seen.has(r.id) && seen.add(r.id));
  const vals = uniq.map((r) =>
    `('${esc(r.id)}','${esc(r.sku)}','${esc(r.title)}','review','${esc(r.proposed_l3)}','${esc(r.suggest_name)}','${esc(r.suggest_l2)}',${+r.confidence || 0},'${esc(r.reason)}')`).join(",\n    ");
  q(`BEGIN;
    INSERT INTO classification_review (product_id,sku,title,bucket,proposed_l3,suggest_name,suggest_l2,confidence,reason) VALUES
    ${vals}
    ON CONFLICT (product_id) DO UPDATE SET bucket=EXCLUDED.bucket, proposed_l3=EXCLUDED.proposed_l3,
      suggest_name=EXCLUDED.suggest_name, suggest_l2=EXCLUDED.suggest_l2, confidence=EXCLUDED.confidence,
      reason=EXCLUDED.reason, updated_at=now() WHERE classification_review.status='pending';
    COMMIT;`, false);
  console.log(`✅ REVIEW-bucket: ${uniq.length} toodet (ohutu vaikimisi — EI paigutatud/publitseeritud).`);
}

// ---- [2]/[3] SHADOW uued-L3 + auto-ülemineku kontroll ----
const cfg0 = getConfig(q);
let created = null;
for (const s of shadowNew) {
  recordShadowProposal(q, {
    batch_id: BATCH_ID, cluster_key: s.ck, proposed_name: s.name, parent_l2_handle: s.parentL2,
    origin: s.origin, n_products: s.n, all_gates_pass: true, gates: s.gate,
  });
}

if (cfg0.auto_create_enabled && shadowNew.length) {
  // AUTO-CREATE AKTIIVNE (üleminek juba tehtud) → PÄRIS loomine etapp2-create kaudu (kõik 8 sammu + undo + deploy).
  console.log(`\n🏗  auto-create AKTIIVNE → ${shadowNew.length} uut L3 PÄRIS loomine (classify-etapp2-create --execute)`);
  const chainOut = {
    summary: { generated_at: summary.generated_at, source: "hook", dry: false },
    clusters: shadowNew.map((s) => ({
      ck: s.ck, n: s.n, titles: (itemsByCk.get(s.ck) || []).map((x) => x.title),
      decision: "new_l3", gate: { allPass: true, gates: s.gate, blocking: [] },
      parentL2: s.parentL2, newName: s.name, finalName: s.name, newOrigin: s.origin, path: s.path,
    })),
  };
  const prods = {};
  for (const s of shadowNew) prods[s.ck] = (itemsByCk.get(s.ck) || []).map((x) => ({ id: x.id, title: x.title }));
  const chainOutFile = `/tmp/hook-chainout-${BATCH_ID}.json`;
  const prodsFile = `/tmp/hook-prods-${BATCH_ID}.json`;
  fs.writeFileSync(chainOutFile, JSON.stringify(chainOut, null, 2));
  fs.writeFileSync(prodsFile, JSON.stringify(prods, null, 2));
  try {
    execSync(`node ${REPO}/scripts/classify-etapp2-create.mjs --execute --in ${chainOutFile} --products ${prodsFile}`, { stdio: "inherit" });
    created = shadowNew.length;
  } catch (e) {
    console.error(`  🔴 etapp2-create viga (uued L3 EI loodud): ${String(e.message).slice(0, 150)}`);
    telegram(`🛑 XL klassifikaator-hook: auto-create AKTIIVNE aga etapp2-create KUKKUS (${BATCH_ID}) — ${shadowNew.length} uut L3 EI loodud. Tooted ootavad (draft). Põhjus: ${String(e.message).slice(0, 150)}`);
  }
}

// mod 3/4 ülemineku-kontroll (loeb shadow-aknast, resettub config-muutusel)
const trans = evaluateTransition(q, { minClean: MIN_CLEAN });
console.log(`\nülemineku-kontroll: ${trans.reason} (puhtaid=${trans.cleanCount}/${MIN_CLEAN}, koodivigu=${trans.bugSince})`);

// ---- [6] sisend: /tmp/classify-skus.txt = LIVE-homed SKU-d (downstream content-sammud) ----
const homedSkus = homedIds.map((id) => id2sku.get(id)).filter(Boolean);
fs.writeFileSync("/tmp/classify-skus.txt", homedSkus.join("\n"));
try { execSync(`docker cp /tmp/classify-skus.txt ${DB}:/tmp/classify-skus.txt`); } catch {}
console.log(`[6]-sisend: ${homedSkus.length} LIVE-homed SKU → /tmp/classify-skus.txt`);

// ---- TELEGRAM DIGEST ----
const lines = [`📦 XL klassifikaator-hook (${BATCH_ID}) — delta ${targets.length} toodet`];
lines.push(`• auto-assign ${homedIds.length} toodet → ${Object.keys(handleIdOf).length} olemas-L3 (LIVE, nähtav)`);
lines.push(`• review-bucket ${reviewRows.length} toodet (nähtamatu/HOLD/keep — ohutu vaikimisi)`);
if (created) lines.push(`• ✅ AUTO-CREATE: ${created} uut L3 loodud (väravad + deploy + undo)`);
else if (shadowNew.length) lines.push(`• 🌓 SHADOW: oleks loonud ${shadowNew.length} uut L3 (väravad läbitud, EI loodud): ${shadowNew.map((s) => `«${s.name}»`).join(", ")}`);
if (codeBugHit) lines.push(`• 🐞 ${codeBugHit} koodiviga ahelas → shadow tagasi (mod 4)`);
if (summary.pending_clusters) lines.push(`• ⏳ PENDING ${summary.pending_clusters} klastrit hindamata (kärpe-auk, poolitamine ammendus) → re-proov järgmisel ööl, MITTE vaikne kadu`);
if (keyIntegrity.judge_foreign || keyIntegrity.ref_foreign) lines.push(`• 🔑 võõr-võtmeid visatud: kohtunik ${keyIntegrity.judge_foreign}, referents ${keyIntegrity.ref_foreign}`);
if (keyIntegrity.judge_dup_conflicts || keyIntegrity.ref_dup_conflicts) lines.push(`• 🔑 dup-konflikte (esimene säilitatud): kohtunik ${keyIntegrity.judge_dup_conflicts}, referents ${keyIntegrity.ref_dup_conflicts}`);
if (trans.changed && trans.enabled) lines.push(`• 🚀 ÜLEMINEK: auto-L3 loomine AKTIVEERITUD — ${trans.reason}`);
else if (trans.changed && !trans.enabled) lines.push(`• ⏮ ÜLEMINEK: auto-create VÄLJA (${trans.reason})`);
else if (!cfg0.auto_create_enabled) lines.push(`• shadow-režiim jätkub (${trans.cleanCount}/${MIN_CLEAN} puhast ettepanekut auto-create'ini)`);
telegram(lines.join("\n"));

console.log(`\n✅ AHEL-HOOK VALMIS — batch ${BATCH_ID}`);
if (creditHit) degrade(targets.length, "krediit sai jooksu ajal otsa (osaline edu salvestatud)");
process.exit(0);
