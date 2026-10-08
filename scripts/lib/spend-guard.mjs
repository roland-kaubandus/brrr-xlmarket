/**
 * spend-guard.mjs — ÜKS SSoT: workspace USAGE-LIMIT tuvastus (1b) + kumulatiivse kulu
 * 80%-hoiatus (1a) + Telegram. (Tarmo DIRECTIVE 2026-10-08 punkt 1 — "eilne pimeala".)
 *
 * TÄIENDAB credit-guard.mjs-i, EI asenda:
 *   - credit-guard.isCreditError  → krediit-BALANCE maas ("credit balance too low", HTTP 402).
 *   - spend-guard.isUsageLimitError → workspace/org SPEND-CAP täis ("specified workspace API
 *       usage limits ... regain access on ...", HTTP 400 / 429 tier). ERINEV asi.
 *
 * MIKS (pimeala, 2026-10-07): LAINE 2 backfill tabas `API 400: "You have reached your specified
 *   workspace API usage limits. You will regain access on 2026-11-01 at 00:00 UTC."` — MEIE kulu oli
 *   ainult $5.39, cap oli MUJALT (EU Motors jagab sama workspace'i) täis. Alerti EI tulnud → töö suri
 *   vaikselt. See moodul teeb 2 asja, mida eile polnud:
 *     (1b) KOHE Telegram, kui API tagastab usage-limit vea (react — tõestatud blokeerija).
 *     (1a) Telegram, kui MEIE kumulatiivne kuu-kulu jõuab 80% seatud eelarvest (proaktiiv).
 *
 * ⚠️ 1a PIIRANG (aus): lokaalne tracker näeb AINULT MEIE kulu (selle API-võtmega). Jagatud workspace'i
 *   cap võib täituda MUJALT (EU Motors) enne kui meie 80% jõuame — nagu 2026-10-07. Seega 1a kaitseb
 *   MEIE jooksu-eest-ära-kulutamise vastu; jagatud-cap-pimealale on päris-lahendus 1b (react) + eraldi
 *   workspace (DIRECTIVE punkt 6). Admin-key puudub → workspace'i tegelikku limiiti/kulu API-st ei loe.
 *
 * HARD RULE #5: üks transform, kõik kutsujad jagavad. HARD RULE #6: masin ise, fail-loud + nähtav.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NOTIFY = path.join(HERE, "notify-telegram.sh");
const LEDGER_DIR = process.env.XLM_SPEND_LEDGER_DIR || "/opt/eumotors-tasks/reports";
// MEIE kuu-eelarve $ (NB: mitte workspace'i tegelik cap — see pole API-loetav, admin-key puudub).
// Seadista .env-is XLM_SPEND_LIMIT_USD=<n>; puudub → 1a välja (ei saa 80% arvutada), 1b töötab ikka.
const LIMIT_USD = Number(process.env.XLM_SPEND_LIMIT_USD || 0);
const THRESHOLD = Number(process.env.XLM_SPEND_ALERT_FRAC || 0.8);

// hinnad $/1M (in,out); cache_read = in×0.1, cache_write = in×1.25 (claude-api skill, 2026-06-24).
const PRICE = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-opus-4-7": { in: 5, out: 25 },
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-fable-5": { in: 10, out: 50 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

/** cost — USD ühe kutse usage-objektist (cache-väljad arvesse). */
export function cost(model, usage) {
  if (!usage) return 0;
  const p = PRICE[model] || { in: 0, out: 0 };
  const inTok = (usage.input_tokens || 0)
    + (usage.cache_read_input_tokens || 0) * 0.1
    + (usage.cache_creation_input_tokens || 0) * 1.25;
  return (inTok * p.in + (usage.output_tokens || 0) * p.out) / 1e6;
}

/**
 * isUsageLimitError — kas viga on workspace/org SPEND-CAP (mitte transientne per-minute rate-limit).
 *   Matchib: eilse 400 ("specified workspace API usage limits", "regain access on"), org/spend-limiidi
 *   variandid, 429 tier ("usage tier"/"upgrade your usage"). EI matchi "per-minute rate limit"
 *   (transient — makeCaller retry'b selle; alerti pole vaja).
 */
export function isUsageLimitError(err) {
  const s = String(err && err.message ? err.message : err || "");
  if (/per[- ]?minute|per[- ]?second|requests? per/i.test(s)) return false; // transient — ei alerti
  return /workspace API usage limit|specified[^.]{0,40}usage limit|usage limits\b|regain access on|spend limit|organization'?s?[^.]{0,40}(usage|spend) limit|exceeded[^.]{0,40}(usage|spend|monthly|daily) limit|usage tier|upgrade your usage/i.test(s);
}

/** sendTelegram — fire-and-forget läbi notify-telegram.sh (jagatud saatja; puuduv võti → vaikne skip). */
export function sendTelegram(msg) {
  try {
    execFileSync("bash", [NOTIFY, msg], { stdio: "ignore", timeout: 20000 });
    return true;
  } catch {
    return false; // notify-telegram ise ei kukuta kutsujat; siin ka mitte (fail-loud on logis)
  }
}

// 1b dedup: üks alert protsessi kohta (väldib 18k×retry spämmi).
let _usageAlerted = false;
/**
 * alertUsageLimit — KOHE Telegram, kui API tagastab usage-limit vea. Üks kord protsessi kohta.
 * @returns {boolean} kas alert saadeti (false = juba saadetud / võti puudub)
 */
export function alertUsageLimit(err, { ctx = "", force = false } = {}) {
  if (_usageAlerted && !force) return false;
  _usageAlerted = true;
  const detail = String(err && err.message ? err.message : err || "").slice(0, 300);
  const msg = `🔴 XLM API USAGE-LIMIT tabatud${ctx ? ` (${ctx})` : ""} ${new Date().toISOString()}
Workspace spend-cap täis VÕI tier-limiit — LLM-sammud blokeeritud.
Viga: ${detail}
NB: jagatud workspace → cap võis täituda MUJALT (EU Motors). Vt DIRECTIVE p6 (eraldi workspace).
Laoseis/hind/reindeks JÄTKUB (degrade); LLM-sisu ootab cap-i vabanemist.`;
  sendTelegram(msg);
  return true;
}

// 1a dedup state (kuu kohta üks 80%-alert).
function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function statePath(mk) {
  return path.join(LEDGER_DIR, `spend-${mk}.state.json`);
}
function readState(mk) {
  try { return JSON.parse(fs.readFileSync(statePath(mk), "utf8")); }
  catch { return { month: mk, total_usd: 0, calls: 0, by_model: {}, alerted80: false }; }
}
function writeState(st) {
  try { fs.writeFileSync(statePath(st.month), JSON.stringify(st)); } catch { /* best-effort */ }
}

/**
 * recordSpend — lisa ühe kutse kulu kuu-liidrisse; 80%-läve ületusel KORRA Telegram.
 *   SÜNKROONNE read-modify-write (Node üheahelaline → protsessi-sisene RMW atomaarne; pipeline-sammud
 *   on eraldi protsessid, jooksevad järjest → ka risti ohutu). Puuduv LIMIT_USD → ainult arvesta, ei alerti.
 * @returns {{total:number, usd:number, crossed:boolean}}
 */
export function recordSpend({ model, usage } = {}) {
  const usd = cost(model, usage);
  const mk = monthKey();
  const st = readState(mk);
  const before = st.total_usd || 0;
  st.total_usd = before + usd;
  st.calls = (st.calls || 0) + 1;
  st.by_model[model] = +(((st.by_model[model] || 0) + usd).toFixed(6));
  st.updated = new Date().toISOString();
  let crossed = false;
  if (LIMIT_USD > 0 && !st.alerted80) {
    const lvl = LIMIT_USD * THRESHOLD;
    if (before < lvl && st.total_usd >= lvl) {
      st.alerted80 = true;
      crossed = true;
    }
  }
  writeState(st);
  if (crossed) {
    sendTelegram(`🟠 XLM kulu-hoiatus: MEIE ${mk} API-kulu jõudis ${Math.round(THRESHOLD * 100)}% eelarvest.
Kulu seni: $${st.total_usd.toFixed(2)} / eelarve $${LIMIT_USD.toFixed(2)} (${(st.total_usd / LIMIT_USD * 100).toFixed(0)}%).
NB: see on AINULT MEIE kulu selle võtmega — jagatud workspace'i cap võib täituda ka mujalt.`);
  }
  return { total: st.total_usd, usd, crossed };
}

/** currentSpend — loe jooksva kuu kulu-seis (raportiks). */
export function currentSpend() {
  const mk = monthKey();
  const st = readState(mk);
  return { month: mk, total_usd: st.total_usd || 0, calls: st.calls || 0, by_model: st.by_model || {}, limit_usd: LIMIT_USD, alerted80: !!st.alerted80 };
}
