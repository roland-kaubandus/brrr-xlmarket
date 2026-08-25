#!/usr/bin/env node
/**
 * credit-outage-state.mjs — ANTI-SPÄMM krediidi-katkestuse teavitus (PRIORITEET 2).
 *
 * ÕPPETUND (Tarmo): 26 identset teadet = müra. See skript annab ÜHE teate/päev, mitte igal jooksul.
 *
 * Kutsub import-pipeline.sh probe-värav (--status ok|credit|api). Väljastab teate-teksti stdout'i
 * (orkestraator slack()'ib selle) VÕI mitte midagi (vaikus = ära teavita). State: reports/credit-outage.state.
 *
 * Loogika:
 *   status=ok    + state olemas → ✅ TAASTUMIS-teade + kustuta state. (state puudub → vaikus.)
 *   status≠ok    + state puudub → ⚠️ ESIMENE HOIATUS + loo state.
 *   status≠ok    + state, last_notify==täna → VAIKUS (juba täna teavitatud).
 *   status≠ok    + state, uus päev → 1 DIGEST (queue-trend "eile M±X"); outage >7p → 🔴 ESKALEERUV.
 *
 * M = implitsiitne queue COUNT (draft-kodutu ∪ null-spec ∪ null-hash), värske igal kutsel — DB tõde,
 *     mitte DB-lipp (drift-vaba). -1 = DB ei vastanud (ära blokeeri teavitust selle pärast).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = "/opt/xlmarket-github";
const STATE = path.join(ROOT, "reports/credit-outage.state");
const argv = process.argv.slice(2);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const STATUS = val("--status", "ok"); // ok | credit | api
const today = new Date().toISOString().slice(0, 10);

const db = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();

// Implitsiitne queue: distinct tooteid, mis vajavad KAS klass VÕI spec VÕI sisu (drift-vaba, DB tõde).
function pendingCount() {
  try {
    const DB = db();
    const sql = `SELECT count(DISTINCT p.id) FROM product p
      LEFT JOIN product_category_product pcp ON pcp.product_id=p.id
      WHERE p.deleted_at IS NULL AND (
        (p.status='draft' AND pcp.product_id IS NULL)
        OR (p.status='published' AND p.metadata->'specs' IS NULL)
        OR (p.status='published' AND p.metadata->>'content_gen_hash' IS NULL)
      )`.replace(/\s+/g, " ");
    const out = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -c "${sql}"`, { encoding: "utf8" }).trim();
    const n = parseInt(out, 10);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1; // DB kättesaamatu → ära blokeeri teavitust
  }
}

const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return null; } };
const writeState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 1) + "\n");
const daysSince = (d) => Math.max(0, Math.round((Date.parse(today) - Date.parse(d)) / 86400000));
const mStr = (m) => (m >= 0 ? String(m) : "?");

const st = readState();

// ── TAASTUMINE ────────────────────────────────────────────────────────────────
if (STATUS === "ok") {
  if (st) {
    const m = pendingCount();
    const days = daysSince(st.since);
    try { fs.rmSync(STATE, { force: true }); } catch { /* ignore */ }
    console.log(`✅ XLM krediit TAASTATUD (${days}p outage lõppes) — ${mStr(m)} toodet järjekorras, öine cron rikastab automaatselt (kohe: bash scripts/drain-pending.sh).`);
  }
  process.exit(0); // state puudus → vaikus (normaalne öö)
}

// ── OUTAGE KESTAB (credit | api) ───────────────────────────────────────────────
const m = pendingCount();
const label = STATUS === "credit" ? "Krediit otsas" : "API maas (MITTE krediit — timeout/5xx)";

if (!st) {
  // esimene tõrge → HOIATUS + loo state
  writeState({ since: today, last_notify: today, last_count: m, status: STATUS });
  console.log(`⚠️ XLM ${label} — pood+laoseis+hind TÖÖTAB, ${mStr(m)} toodet ootab rikastust (klass/spec/sisu). Console makse korda → 'bash scripts/drain-pending.sh'.`);
  process.exit(0);
}

if (st.last_notify === today) {
  process.exit(0); // juba täna teavitatud → VAIKUS (anti-spämm)
}

// uus päev → 1 digest
const days = daysSince(st.since);
const prev = typeof st.last_count === "number" ? st.last_count : -1;
let trend = "";
if (m >= 0 && prev >= 0) {
  const d = m - prev;
  trend = d > 0 ? ` (eile ${prev}, +${d})` : d < 0 ? ` (eile ${prev}, ${d})` : ` (eile ${prev}, muutumatu)`;
}
writeState({ since: st.since, last_notify: today, last_count: m, status: STATUS });

const msg = days > 7
  ? `🔴 XLM ${label} JUBA ${days} PÄEVA — palun KONTROLLI MAKSET (Anthropic Console). ${mStr(m)} toodet järjekorras${trend}. Pood töötab, aga rikastus seisab ${days}p.`
  : `⚠️ XLM ${label} — ${days}. päev, ${mStr(m)} toodet ootab rikastust${trend}. Pood+laoseis TÖÖTAB. Makse korda → 'bash scripts/drain-pending.sh'.`;
console.log(msg);
process.exit(0);
