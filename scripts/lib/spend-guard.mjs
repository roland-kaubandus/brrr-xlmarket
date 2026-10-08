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
 *     (1a) Telegram, kui workspace'i TEGELIK kuu-kulu (Anthropic Admin cost_report API) jõuab 80%
 *          seatud XLM_SPEND_LIMIT_USD-st (= konsooli workspace'i piir). checkWorkspaceSpendAlert().
 *
 * ⚠️ MIKS ADMIN API (parandus 2026-10-08, DIRECTIVE id=1f0a): lokaalne per-kutse-tracker (recordSpend)
 *   näeb AINULT MEIE kulu (selle võtmega) — nt $6.26 — aga workspace'i TEGELIK kuu-kulu võib olla $300
 *   (EU Motors jagab sama workspace'i). Local-only 80% EI käivituks KUNAGI enne konsooli blokki → ohtlik
 *   vale-kindlus. AUTORITEETNE allikas = Admin cost_report API (ANTHROPIC_ADMIN_KEY .env.xlmarket-is).
 *   Admin-key puudub / API maas → Telegram ütleb ÜKS KORD/kuu "kulu-jälgimine osaline" (EI näita vaikselt 3%).
 *   recordSpend jääb AINULT per-projekt raporti jaoks (ei käivita enam 80%-alertit).
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
// XLM_SPEND_LIMIT_USD = konsooli workspace'i piir $ (Tarmo kinnitab; DIRECTIVE p3). Autoriteetne 80%-värav
// (checkWorkspaceSpendAlert) võrdleb selle vastu workspace'i TEGELIKKU kulu (Admin API), MITTE local-trackeri.
const LIMIT_USD = Number(process.env.XLM_SPEND_LIMIT_USD || 0);
const THRESHOLD = Number(process.env.XLM_SPEND_ALERT_FRAC || 0.8);

// Admin API võti eraldi xlmarketi env-failis (Tarmo kleebib ise; org-wide saladus → jagatud .env-ist eraldi).
const XLM_ENV_FILE = process.env.XLM_ENV_FILE || "/opt/eumotors-tasks/.env.xlmarket";
/** xlmEnv — loe võti process.env-ist, fallback .env.xlmarket failist (toimib ka ilma faili source'imata). */
function xlmEnv(key) {
  if (process.env[key] && String(process.env[key]).trim()) return String(process.env[key]).trim();
  try {
    const txt = fs.readFileSync(XLM_ENV_FILE, "utf8");
    // NB: [ \t] (horisontaalne) — MITTE \s, mis haaraks reavahetuse ja loeks järgmise rea väärtuseks.
    const m = txt.match(new RegExp(`^[ \\t]*${key}[ \\t]*=[ \\t]*([^\\n]*?)[ \\t]*$`, "m"));
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  } catch { /* faili pole → "" */ }
  return "";
}
/** resolveAdminKey — ANTHROPIC_ADMIN_KEY (sk-ant-admin…) env-ist või .env.xlmarket-ist; puudub → "". */
export const resolveAdminKey = () => xlmEnv("ANTHROPIC_ADMIN_KEY");
/** resolveLimit — XLM_SPEND_LIMIT_USD dünaamiliselt (process.env → .env.xlmarket → moodul-const). */
function resolveLimit() { return Number(xlmEnv("XLM_SPEND_LIMIT_USD") || LIMIT_USD || 0); }

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
 * recordSpend — lisa ühe kutse kulu kuu-liidrisse (AINULT per-projekt raport, EI alerti).
 *   SÜNKROONNE read-modify-write (Node üheahelaline → protsessi-sisene RMW atomaarne; pipeline-sammud
 *   on eraldi protsessid, jooksevad järjest → ka risti ohutu).
 *   ⚠️ 80%-alert EI tule SIIT (parandus 2026-10-08): local näeb vaid MEIE kulu (nt $6.26), aga
 *     workspace'i cap täitub jagatult → vale-kindlus. Autoriteetne 80%-värav = checkWorkspaceSpendAlert.
 * @returns {{total:number, usd:number}}
 */
export function recordSpend({ model, usage } = {}) {
  const usd = cost(model, usage);
  const mk = monthKey();
  const st = readState(mk);
  st.total_usd = (st.total_usd || 0) + usd;
  st.calls = (st.calls || 0) + 1;
  st.by_model[model] = +(((st.by_model[model] || 0) + usd).toFixed(6));
  st.updated = new Date().toISOString();
  writeState(st);
  return { total: st.total_usd, usd };
}

/**
 * fetchWorkspaceCostUSD — workspace'i (või kogu org) TEGELIK kuu-kulu Anthropic Admin cost_report API-st.
 *   ⚠️ `amount` on SENTIDES (decimal string, nt "123.45" = $1.2345) → USD = amount/100. Summeerib kõik
 *     bucketid + resultid. XLM_WORKSPACE_ID seatud → group_by=workspace_id + filter; muidu kogu org summa
 *     (ohutu ülemhinnang — fire earlier, ei jäta vaikselt vahele). Pagineerib has_more/next_page kaudu.
 * @returns {Promise<{ok:boolean, usd?:number, reason?:string, month?:string, scope?:string}>}
 */
export async function fetchWorkspaceCostUSD({ adminKey = resolveAdminKey(), month = monthKey(), workspaceId = xlmEnv("XLM_WORKSPACE_ID"), timeoutMs = 20000, fetchImpl = fetch } = {}) {
  if (!adminKey) return { ok: false, reason: "ANTHROPIC_ADMIN_KEY puudub" };
  const [y, m] = month.split("-");
  const startISO = `${y}-${m}-01T00:00:00Z`;
  let total = 0, page = null, pages = 0;
  try {
    do {
      const u = new URL("https://api.anthropic.com/v1/organizations/cost_report");
      u.searchParams.set("starting_at", startISO);
      u.searchParams.set("bucket_width", "1d");
      u.searchParams.set("limit", "31");
      if (workspaceId) u.searchParams.append("group_by[]", "workspace_id");
      if (page) u.searchParams.set("page", page);
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), timeoutMs);
      let r, body;
      try {
        r = await fetchImpl(u, { headers: { "x-api-key": adminKey, "anthropic-version": "2023-06-01" }, signal: ctrl.signal });
        body = await r.text();
      } finally { clearTimeout(to); }
      if (!r.ok) return { ok: false, reason: `HTTP ${r.status}: ${String(body).slice(0, 160)}` };
      const j = JSON.parse(body);
      for (const bucket of j.data || []) {
        for (const item of bucket.results || []) {
          if (workspaceId && item.workspace_id !== workspaceId) continue;
          total += parseFloat(item.amount || "0") / 100; // sendid → USD
        }
      }
      page = j.has_more ? j.next_page : null;
    } while (page && ++pages < 12);
    return { ok: true, usd: +total.toFixed(4), month, scope: workspaceId ? `workspace ${workspaceId}` : "kogu org" };
  } catch (e) {
    const kind = e && e.name === "AbortError" ? "timeout" : "network";
    return { ok: false, reason: `${kind}: ${String((e && e.message) || e).slice(0, 80)}` };
  }
}

function partialMsg(ctx, reason) {
  return `⚠️ XLM kulu-jälgimine OSALINE${ctx ? ` (${ctx})` : ""} ${new Date().toISOString()}
Workspace'i TEGELIKKU kuu-kulu EI saa lugeda: ${reason}
→ 80%-hoiatus EI ole usaldusväärne, kuni ANTHROPIC_ADMIN_KEY on seatud: ${XLM_ENV_FILE}
Local tracker näeb AINULT meie kulu — jagatud workspace võib olla ammu üle piiri. Palun lisa Admin-key.`;
}

/**
 * checkWorkspaceSpendAlert — AUTORITEETNE 80%-värav: workspace'i tegelik kuu-kulu (Admin API) vs limiit.
 *   Admin-key puudub / limiit seadmata / API maas → Telegram ÜKS KORD/kuu "osaline" (DIRECTIVE p4;
 *     mitte vaikne vale-3%). Jooksuta pipeline-alguses (credit-probe) — üks autoriteetne kontroll öö kohta.
 *   Dedup kuu-state-failis (ws_alerted80, partial_alerted); uus kuu = värske state = auto-reset.
 * @returns {Promise<{ok:boolean, partial?:boolean, usd?:number, limit?:number, pct?:number, crossed?:boolean, reason?:string}>}
 */
export async function checkWorkspaceSpendAlert({ adminKey = resolveAdminKey(), limit = resolveLimit(), ctx = "" } = {}) {
  const mk = monthKey();
  const st = readState(mk);
  const firePartial = (reason) => {
    const first = !st.partial_alerted;
    st.partial_alerted = true; writeState(st);
    if (first) sendTelegram(partialMsg(ctx, reason));
    return { ok: false, partial: true, reason, alerted: first };
  };
  if (!adminKey) return firePartial("ANTHROPIC_ADMIN_KEY puudub");
  if (!(limit > 0)) return firePartial("XLM_SPEND_LIMIT_USD seadmata (ei saa 80% arvutada)");
  const res = await fetchWorkspaceCostUSD({ adminKey });
  if (!res.ok) return firePartial(res.reason);
  // edu → nulli partial-lipp (kui API hiljem katki, alert kordub)
  st.partial_alerted = false;
  st.workspace_usd = res.usd; st.workspace_scope = res.scope; st.workspace_checked = new Date().toISOString();
  const pct = res.usd / limit;
  let crossed = false;
  if (!st.ws_alerted80 && pct >= THRESHOLD) { st.ws_alerted80 = true; crossed = true; }
  writeState(st);
  if (crossed) {
    sendTelegram(`🟠 XLM workspace-kulu ${Math.round(THRESHOLD * 100)}%+ ${mk}
Tegelik kuu-kulu: $${res.usd.toFixed(2)} / limiit $${limit.toFixed(2)} (${(pct * 100).toFixed(0)}%) · ${res.scope}
Allikas: Anthropic Admin cost_report (autoriteetne). Lähened konsooli workspace-piirile → LLM-sammud blokeeruvad piiril.`);
  }
  return { ok: true, partial: false, usd: res.usd, limit, pct: +(pct * 100).toFixed(1), crossed, scope: res.scope };
}

/** currentSpend — loe jooksva kuu kulu-seis (raportiks): MEIE local kulu + viimane workspace-mõõt. */
export function currentSpend() {
  const mk = monthKey();
  const st = readState(mk);
  return {
    month: mk, total_usd: st.total_usd || 0, calls: st.calls || 0, by_model: st.by_model || {},
    limit_usd: resolveLimit(), ws_alerted80: !!st.ws_alerted80, partial_alerted: !!st.partial_alerted,
    workspace_usd: st.workspace_usd, workspace_scope: st.workspace_scope, workspace_checked: st.workspace_checked,
  };
}
