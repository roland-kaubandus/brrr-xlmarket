#!/usr/bin/env node
// pipeline-review-digest.mjs — REVIEW-BUCKET NÄHTAVUS (Tarmo: "kust ma näen, et midagi ootab").
//
// Näitab KLASTRITE kaupa (mitte tootekaupa) mis ootab inimese otsust — KAKS elusat ämbrit:
//   1) synonym_review       (status='pending') — sünonüümi/variandi-ettepanekud ([6.6] hook)
//   2) classification_review(status='pending') — uued tüübid / madal kindlus / quarantine ([4] classify)
//
// EI KATA v_review_queue / category_classification_audit — see on SURNUD v3→v4 pärand
// (viimane kirje 2026-07-22, cron ei toida). Ära too seda digestisse.
//
// Sünonüümid: arv · kindluse-jaotus (0.00 praht / <0.7 / 0.7–0.85 / ≥0.85+review:true) · top-5 L3-klastrit.
// Klassifikaator: new_l3 / review / quarantine tüüp-klastritega + lähim olemas-L3 (DUP-värav).
// + "Kodutud" (live, kategooriata = navis/otsingus nähtamatu) — PÄRIS päring, jäetakse välja kui ebaõnnestub.
// + Lävend-signaalid (§b): vanim pending · kasvu-trend 7p vs baas · lahendamata-suhe. Vähe ajalugu → "andmeid veel vähe".
// + Ülevaatuse link: env XL_ADMIN_BASE_URL (staging k33g). Puudu → FAIL-LOUD, EI kasuta vaikimisi prod-domeeni.
//
// Allikad / lipud:
//   (vaikimisi) DB-st klassifikaator + sünonüümid + kodutud (read-only SELECT)
//   --from-json <fail>   klassifikaatori preview dry-run tulemustest (sünon+kodutud ikka DB-st, read-only)
//   --telegram           saada Telegram (TELEGRAM_BOT_TOKEN/CHAT_ID — sama bot/chat mis Uptime Kuma)
//   --slack              saada Slack (SLACK_WEBHOOK_URL)
//
// Kasutus:  XL_ADMIN_BASE_URL=https://staging.xlmarket.ee node scripts/pipeline-review-digest.mjs
//           node scripts/pipeline-review-digest.mjs --from-json /tmp/pipeline-classify-results.json
import { execSync } from "node:child_process";
import fs from "node:fs";

const argv = process.argv;
const argVal = (n, d) => { const i = argv.indexOf(n); return i > 0 ? argv[i + 1] : d; };
const FROM_JSON = argVal("--from-json");
const SLACK = argv.includes("--slack");
const TELEGRAM = argv.includes("--telegram");

let _db;
const getDB = () => (_db ||= execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim());
const q = (sql) => execSync(`docker exec -i ${getDB()} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
const q1 = (sql) => q(sql).trim();
const qLines = (sql) => q(sql).trim().split("\n").filter(Boolean);
const int = (s) => parseInt(String(s).trim() || "0", 10) || 0;
const tableExists = (t) => { try { return q1(`SELECT to_regclass('public.${t}') IS NOT NULL`) === "t"; } catch { return false; } };

// ===================== BUCKET 1: classification_review =======================
let items = [];
if (FROM_JSON) {
  const all = JSON.parse(fs.readFileSync(FROM_JSON, "utf8"));
  items = all.filter(r => r.bucket !== "auto").map(r => ({
    product_id: r.id, sku: r.sku, title: r.title, bucket: r.bucket,
    proposedType: r.proposedType, suggest_l2: r.suggest_l2, proposed_l3: r.l3, confidence: r.confidence,
  }));
  console.log(`[PREVIEW: klassifikaator failist ${FROM_JSON}; sünonüümid+kodutud DB-st, read-only]\n`);
} else if (tableExists("classification_review")) {
  // proposedType: suggest_name → proposed_l3 → reason → title (mitte "?"; mõned classify-read jätavad suggest_name tühjaks)
  items = q(`SELECT jsonb_build_object('product_id',product_id,'sku',sku,'title',title,'bucket',bucket,
        'proposedType',coalesce(nullif(trim(suggest_name),''),nullif(trim(proposed_l3),''),nullif(trim(reason),''),title),'suggest_l2',suggest_l2,'proposed_l3',proposed_l3,'confidence',confidence)::text
      FROM classification_review WHERE status='pending' ORDER BY bucket,confidence`)
    .trim().split("\n").filter(l => l.startsWith("{")).map(l => JSON.parse(l));
}
const clusters = {};
for (const r of items) {
  const norm = (r.proposedType || "?").toLowerCase().replace(/[^a-zäöüõ0-9]+/g, " ").trim();
  const key = `${r.bucket}:${norm}`;
  (clusters[key] ||= { kind: r.bucket, name: r.proposedType || "?", l2: r.suggest_l2 || null, l3: r.proposed_l3 || null, items: [] }).items.push(r);
}
const ordered = Object.values(clusters).sort((a, b) => (a.kind === b.kind ? b.items.length - a.items.length : a.kind < b.kind ? -1 : 1));
const bk = items.reduce((a, r) => { a[r.bucket] = (a[r.bucket] || 0) + 1; return a; }, {});

// ===================== BUCKET 2: synonym_review (ainult DB) ===================
const syn = { total: 0, dist: null, clusters: [], oldest: 0 };
if (tableExists("synonym_review")) {
  syn.total = int(q1(`SELECT count(*) FROM synonym_review WHERE status='pending'`));
  if (syn.total) {
    const d = q1(`SELECT count(*) FILTER (WHERE confidence=0)||'|'||
        count(*) FILTER (WHERE confidence>0 AND confidence<0.7)||'|'||
        count(*) FILTER (WHERE confidence>=0.7 AND confidence<0.85)||'|'||
        count(*) FILTER (WHERE confidence>=0.85)
      FROM synonym_review WHERE status='pending'`).split("|").map(int);
    syn.dist = { junk: d[0], low: d[1], mid: d[2], hi: d[3] };
    syn.clusters = q(`SELECT count(*)||'|'||coalesce(pc.name,'(kategooriata)')
        FROM synonym_review sr
        LEFT JOIN product_category_product pcp ON pcp.product_id=sr.product_id
        LEFT JOIN product_category pc ON pc.id=pcp.product_category_id
        WHERE sr.status='pending'
        GROUP BY pc.name ORDER BY count(*) DESC LIMIT 5`)
      .trim().split("\n").filter(Boolean).map(l => { const i = l.indexOf("|"); return { n: int(l.slice(0, i)), name: l.slice(i + 1).trim() }; });
    syn.oldest = int(q1(`SELECT now()::date - min(created_at)::date FROM synonym_review WHERE status='pending'`));
  }
}

// ===================== "Kodutud" (päris päring, muidu välja) ==================
let homeless = null;
try {
  homeless = int(q1(`SELECT count(*) FROM product p WHERE p.deleted_at IS NULL AND p.status='published'
    AND NOT EXISTS (SELECT 1 FROM product_category_product pcp WHERE pcp.product_id=p.id)`));
} catch { homeless = null; }

// ===================== "Kinnitatud, ootab struktuuri-buildi" (approved_pending_build) =====
// create_l3 otsus EI loo L3-d live (propose-not-create) → tooted ootavad struktuuri-buildi.
// EI TOHI olla vaikne ämber: näita arvu + vanim vanus + lävend-signaal (sama loogika).
const build = { n: 0, clusters: 0, oldest: 0, rows: [] };
if (tableExists("review_decision_log")) {
  try {
    const r = q1(`SELECT coalesce(sum(jsonb_array_length(affected)),0)||'|'||count(*)||'|'||coalesce(now()::date - min(created_at)::date,0)
      FROM review_decision_log
      WHERE bucket_type='classification' AND action='create_l3'
        AND status='approved_pending_build' AND undone_at IS NULL`).split("|").map(int);
    [build.n, build.clusters, build.oldest] = r;
    if (build.clusters) {
      build.rows = qLines(`SELECT new_l3_name||' → @'||coalesce(target_l2,'?')||' ('||jsonb_array_length(affected)||')'
        FROM review_decision_log
        WHERE bucket_type='classification' AND action='create_l3'
          AND status='approved_pending_build' AND undone_at IS NULL
        ORDER BY created_at ASC LIMIT 6`);
    }
  } catch { /* logi-tabel vana skeem — jäta vahele */ }
}

// ===================== Lävend-signaalid (§b) =================================
// vanim pending · kasvu-trend (7p vs eelmise 8–30p baas, ainult kui span≥30p) · lahendamata-suhe.
function signals(table, hasUpdated) {
  if (!tableExists(table)) return null;
  const pending = int(q1(`SELECT count(*) FROM ${table} WHERE status='pending'`));
  if (!pending) return null;
  const oldest = int(q1(`SELECT coalesce(now()::date - min(created_at)::date,0) FROM ${table} WHERE status='pending'`));
  const span = int(q1(`SELECT coalesce(max(created_at)::date - min(created_at)::date,0) FROM ${table}`));
  const updExpr = hasUpdated ? "coalesce(updated_at,created_at)" : "created_at";
  const resolved30 = int(q1(`SELECT count(*) FROM ${table} WHERE status<>'pending' AND ${updExpr} >= now()-interval '30 days'`));
  const unresolved = pending + resolved30 > 0 ? pending / (pending + resolved30) : 0;
  let trend;
  if (span < 30) trend = { text: "andmeid veel vähe" };  // ei fabritseeri rohelist trendi
  else {
    const i7 = int(q1(`SELECT count(*) FROM ${table} WHERE created_at >= now()-interval '7 days'`));
    const iprev = int(q1(`SELECT count(*) FROM ${table} WHERE created_at >= now()-interval '30 days' AND created_at < now()-interval '7 days'`));
    const base7 = Math.max(iprev * 7 / 23, 0.5);
    const ratio = +(i7 / base7).toFixed(1);
    trend = { i7, ratio, warn: ratio > 3 };
  }
  return { oldest, pending, resolved30, unresolved: +unresolved.toFixed(2), trend };
}
const sSyn = signals("synonym_review", false);
const sClsf = signals("classification_review", true);
const trendStr = (s) => s.trend.text ? s.trend.text : `${s.trend.warn ? "🟠 " : ""}${s.trend.ratio}× (7p sisse ${s.trend.i7})`;
const sigLine = (label, s) => `   ${label}: vanim ${s.oldest}p${s.oldest > 14 ? " 🔴" : ""} · trend ${trendStr(s)} · lahendamata ${Math.round(s.unresolved * 100)}%${s.unresolved > 0.8 ? " 🟠" : ""}`;

// ===================== Ülevaatuse link (env, FAIL-LOUD) ======================
const ADMIN_BASE = (process.env.XL_ADMIN_BASE_URL || "").replace(/\/+$/, "");
const REVIEW_PATH = "/xl-admin/review-bucket";
let linkLine;
if (ADMIN_BASE) linkLine = `👉 Ülevaatus: ${ADMIN_BASE}${REVIEW_PATH}`;
else {
  linkLine = "⚠️ XL_ADMIN_BASE_URL puudub .env-is — lisa staging-URL (nt https://staging.xlmarket.ee). Link jäetud välja.";
  console.error("FAIL-LOUD: XL_ADMIN_BASE_URL puudub — EI kasuta vaikimisi prod-domeeni, link jäetakse välja.");
}

// ===================== Sõnum (Telegram/Slack + stdout) =======================
const today = new Date().toISOString().slice(0, 10);
const buckets = (syn.total ? 1 : 0) + (items.length ? 1 : 0);
const totalWaiting = (syn.total || 0) + items.length;
const M = [];
M.push(`📋 XLM review-bucket — ${today}`);
M.push(`Kokku ootab otsust: ${totalWaiting} (${buckets} ämbrit)`);
if (syn.total) {
  M.push("");
  M.push(`🔤 SÜNONÜÜMID: ${syn.total} terme / ${syn.clusters.length} top-L3`);
  M.push(`   praht(0.00): ${syn.dist.junk} · <0.7: ${syn.dist.low} · 0.7–0.85: ${syn.dist.mid} · ≥0.85(review:true): ${syn.dist.hi}`);
  for (const c of syn.clusters) M.push(`   • ${c.name} — ${c.n}`);
}
if (items.length) {
  M.push("");
  M.push(`🏷 KLASSIFIKAATOR: ${items.length} toodet / ${ordered.length} klastrit`);
  M.push(`   🆕 uus tüüp: ${bk.new_l3 || 0} · ❓ madal kindlus: ${bk.review || 0} · ⚠️ quarantine: ${bk.quarantine || 0}`);
  for (const c of ordered.slice(0, 6)) {
    const tag = c.kind === "new_l3" ? "🆕" : c.kind === "review" ? "❓" : "⚠️";
    const home = c.kind === "review" && c.l3 ? ` (lähim: ${c.l3})` : c.l2 ? ` (→@${c.l2})` : "";
    M.push(`   ${tag} ${c.name} — ${c.items.length}${home}`);
  }
}
if (build.n) {
  M.push("");
  M.push(`🏗 Kinnitatud, ootab struktuuri-buildi: ${build.n} toodet / ${build.clusters} L3 · vanim ${build.oldest}p${build.oldest > 14 ? " 🔴" : ""}`);
  for (const line of build.rows) M.push(`   • ${line}`);
  M.push(`   (create_l3 otsused; L3 luuakse genyM + 4-sammu deployl, siis tooted määratakse)`);
}
if (homeless != null) {
  M.push("");
  M.push(`🏚 Kodutud (live, kategooriata, navis nähtamatu): ${homeless}`);
}
M.push("");
M.push("⏱ Lävendid:");
if (sSyn) M.push(sigLine("sünon.", sSyn));
if (sClsf) M.push(sigLine("klass.", sClsf));
if (!sSyn && !sClsf) M.push("   (midagi ei oota)");
// NB: linkLine (env XL_ADMIN_BASE_URL + fail-loud) on arvutatud ülal, aga EI kuvata veel —
// link aktiveeritakse sammus 2, kui xl-admin/review-bucket leht on olemas. Env+fail-loud jäävad koodi.
void linkLine;
const text = M.join("\n");
console.log(text);

// Masinloetav rida cron STATUS + hommiku-ülevaatuse jaoks (LOGis, EI lähe Telegrami `text`-i).
// import-pipeline-cron.sh greppib 'REVIEW-BUCKET — N' → review_waiting = KOGUSUMMA (sünon+klass).
console.log(`REVIEW-BUCKET — ${totalWaiting} toodet (masinloetav; sünon ${syn.total || 0} + klass ${items.length} · ootab-buildi ${build.n})`);

// ===================== Telegram (valikuline) — sama bot/chat mis Uptime Kuma =
if (TELEGRAM) {
  const bot = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) console.error("\nTELEGRAM_BOT_TOKEN/CHAT_ID puudub — Telegram vahele jäetud.");
  else if (!totalWaiting) console.error("\n0 ootel — Telegram vahele jäetud (ei spämmi).");
  else {
    const r = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    console.error(r.ok ? "\n✓ Telegram saadetud." : `\n⚠️ Telegram HTTP ${r.status}`);
  }
}

// ===================== Slack (valikuline) ====================================
if (SLACK) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) console.error("\nSLACK_WEBHOOK_URL puudub — Slack vahele jäetud.");
  else if (!totalWaiting) console.error("\n0 ootel — Slack vahele jäetud.");
  else {
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    console.error("\n✓ Slack saadetud.");
  }
}
