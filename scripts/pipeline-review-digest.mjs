#!/usr/bin/env node
// pipeline-review-digest.mjs — REVIEW-BUCKET NÄHTAVUS (Tarmo: "kust ma näen, et midagi ootab").
//
// Näitab KLASTRITE kaupa (mitte tootekaupa) mis ootab inimese otsust:
//   - uued tüübid (new_l3) — kodu puudub, INIMENE otsustab L3-loomise
//   - madala-kindluse (review) — olemas-L3, aga ebakindel
//   - quarantine — teadmata
// + "kodutud" tooted (live, aga kategooriata = otsingus/navis nähtamatu).
//
// Iga klastri kohta: tüüp · mitu toodet · pakutud L2 · lähim olemas-L3 (DUP-värav).
//
// Allikad:
//   (vaikimisi) DB classification_review tabel (status='pending')
//   --from-json <fail>   preview dry-run tulemustest (EI puuduta DB-d)
//   --slack              saada Slack-webhook'i (SLACK_WEBHOOK_URL) nädalane kokkuvõte
//
// Kasutus:  node scripts/pipeline-review-digest.mjs [--from-json /tmp/pipeline-classify-results.json] [--slack]
import { execSync } from "node:child_process";
import fs from "node:fs";

const argv = process.argv;
const argVal = (n, d) => { const i = argv.indexOf(n); return i > 0 ? argv[i + 1] : d; };
const FROM_JSON = argVal("--from-json");
const SLACK = argv.includes("--slack");

const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const q = (sql) => execSync(`docker exec -i ${getDB()} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });

// --- kogu review-bucket kirjed (DB või JSON) ---------------------------------
let items, homeless;
if (FROM_JSON) {
  const all = JSON.parse(fs.readFileSync(FROM_JSON, "utf8"));
  items = all.filter(r => r.bucket !== "auto").map(r => ({
    product_id: r.id, sku: r.sku, title: r.title, bucket: r.bucket,
    proposedType: r.proposedType, suggest_l2: r.suggest_l2, proposed_l3: r.l3,
    confidence: r.confidence,
  }));
  homeless = all.length;                        // dry-run: kõik sisendid olid kodutud
  console.log(`[PREVIEW dry-run failist: ${FROM_JSON} — DB-d EI puudutatud]\n`);
} else {
  // tabel võib puududa (klassifikaatorit pole veel --execute jooksutatud)
  const exists = q(`SELECT to_regclass('public.classification_review') IS NOT NULL`).trim() === "t";
  if (!exists) { console.log("classification_review tabelit veel pole (klassifikaator pole --execute jooksnud). 0 ootel."); }
  items = exists ? q(`SELECT jsonb_build_object('product_id',product_id,'sku',sku,'title',title,'bucket',bucket,
        'proposedType',coalesce(suggest_name,proposed_l3,reason),'suggest_l2',suggest_l2,'proposed_l3',proposed_l3,'confidence',confidence)::text
      FROM classification_review WHERE status='pending' ORDER BY bucket,confidence`)
      .trim().split("\n").filter(l => l.startsWith("{")).map(l => JSON.parse(l)) : [];
  homeless = parseInt(q(`SELECT count(*) FROM product p WHERE p.deleted_at IS NULL AND p.status='published'
      AND NOT EXISTS (SELECT 1 FROM product_category_product pcp WHERE pcp.product_id=p.id)`).trim()) || 0;
}

// --- klasterda (proposedType normaliseeritud) --------------------------------
const clusters = {};
for (const r of items) {
  const norm = (r.proposedType || "?").toLowerCase().replace(/[^a-zäöüõ0-9]+/g, " ").trim();
  const key = `${r.bucket}:${norm}`;
  (clusters[key] ||= { kind: r.bucket, name: r.proposedType || "?", l2: r.suggest_l2 || null, l3: r.proposed_l3 || null, items: [] }).items.push(r);
}
const ordered = Object.values(clusters).sort((a, b) => (a.kind === b.kind ? b.items.length - a.items.length : a.kind < b.kind ? -1 : 1));
const bk = items.reduce((a, r) => { a[r.bucket] = (a[r.bucket] || 0) + 1; return a; }, {});

// --- väljund -----------------------------------------------------------------
const L = [];
L.push(`📋 REVIEW-BUCKET — ${items.length} toodet ootab, ${ordered.length} klastrit`);
L.push(`   uued tüübid: ${bk.new_l3 || 0} · madal kindlus: ${bk.review || 0} · quarantine: ${bk.quarantine || 0}`);
L.push(`   kodutud kokku (live, kategooriata, navis nähtamatu): ${homeless}`);
L.push("");
for (const c of ordered) {
  const tag = c.kind === "new_l3" ? "🆕 UUS TÜÜP" : c.kind === "review" ? "❓ MADAL KINDLUS" : "⚠️ QUARANTINE";
  const home = c.kind === "review" && c.l3 ? `  (lähim olemas-L3: ${c.l3})` : c.l2 ? `  (pakutud L2: @${c.l2})` : "  (kodu puudub — INIMENE otsustab)";
  L.push(`${tag} — "${c.name}" · ${c.items.length} toodet${home}`);
  for (const it of c.items.slice(0, 4)) L.push(`     · ${(it.title || "").slice(0, 60)}  [conf ${it.confidence}]`);
  if (c.items.length > 4) L.push(`     … +${c.items.length - 4} veel`);
}
const text = L.join("\n");
console.log(text);

// --- lühikokkuvõte (Slack/Telegram jaoks) ------------------------------------
const shortSummary = () => {
  const s = [`📋 XLM review-bucket: ${items.length} toodet, ${ordered.length} klastrit ootab otsust`];
  for (const c of ordered.slice(0, 8)) s.push(`• ${c.kind === "new_l3" ? "🆕" : c.kind === "review" ? "❓" : "⚠️"} ${c.name} — ${c.items.length}`);
  return s.join("\n");
};

// --- Slack (valikuline) ------------------------------------------------------
if (SLACK) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) { console.error("\nSLACK_WEBHOOK_URL puudub — Slack vahele jäetud."); }
  else if (!items.length) { console.error("\n0 ootel — Slack vahele jäetud."); }
  else {
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: shortSummary() }) });
    console.error("\n✓ Slack saadetud.");
  }
}

// --- Telegram (valikuline) — sama bot/chat mis Uptime Kuma --------------------
if (argv.includes("--telegram")) {
  const bot = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) { console.error("\nTELEGRAM_BOT_TOKEN/CHAT_ID puudub — Telegram vahele jäetud."); }
  else if (!items.length) { console.error("\n0 ootel — Telegram vahele jäetud (ei spämmi)."); }
  else {
    const r = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: shortSummary(), disable_web_page_preview: true }),
    });
    console.error(r.ok ? "\n✓ Telegram saadetud." : `\n⚠️ Telegram HTTP ${r.status}`);
  }
}
