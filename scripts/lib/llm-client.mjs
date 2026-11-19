/**
 * llm-client.mjs — ÜKS SSoT KÕIGILE Anthropic-kutsetele (HARD RULE #5 "üks mehhanism").
 *
 * MIKS (Tarmo DIRECTIVE 2026-11-19, id=1f0a): kuu-kulu peab olema 100% omistatav (by_task).
 *   Enne oli ~15 skripti oma `fetch("…/v1/messages")`-ga + osa recordSpend'ita → $346 sildistamata.
 *   Nüüd: KÕIK LLM-kutsed läbi selle kliendi → silt KOHUSTUSLIK, kulu salvestatud ühe koha kaudu,
 *   võti ühest allikast, krediit/usage-degrade ühtemoodi klassifitseeritud. Grep-värav
 *   (check-no-direct-api.sh) kukub läbi, kui mõni skript kutsub api.anthropic.com otse.
 *
 * KOOSTIS (absorbeerib l3-desc.makeCaller mustri):
 *   - task KOHUSTUSLIK (puudub → viga). recordSpend({model,usage,batch,task}).
 *   - võti: param apiKey → fallback process.env.ANTHROPIC_API_KEY (üks allikas).
 *   - retry: usage-limit → alert + throw (EI retry); 429/529/5xx → exp-backoff (kuni maxAttempts);
 *     network/timeout → retry. Krediit/usage-viga → err.degrade = 'credit'|'usage' (mid-run exit 3).
 *   - spend-guard (alertUsageLimit) + credit-guard (isDegradeError/degradeKind) — DRY, EI dubleeri.
 *
 * TESTITAVUS: fetchImpl/recordImpl/alertImpl süstitavad (vt llm-client.test.mjs — võrguta, state'ita).
 */
import { recordSpend, isUsageLimitError, alertUsageLimit } from "./spend-guard.mjs";
import { isDegradeError, degradeKind } from "./credit-guard.mjs";

export const API_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
const backoff = (attempt) => Math.min(30000, 1000 * 2 ** attempt);

/** requireTask — silt KOHUSTUSLIK (jälgitavus). Tühi/puudu → viga (ei vaikse sildistamata jäägi). */
export function requireTask(task) {
  if (!task || typeof task !== "string" || !task.trim()) {
    throw new Error("llm-client: task-silt KOHUSTUSLIK (jälgitavus — iga LLM-kutse by_task'i). Nt { task: 'classify' }.");
  }
  return task.trim();
}

/** requireKey — võti ühest allikast (param → process.env.ANTHROPIC_API_KEY). Puudub → viga. */
function requireKey(apiKey) {
  const k = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!k) throw new Error("llm-client: ANTHROPIC_API_KEY puudub (üks allikas: param või process.env).");
  return k;
}

/**
 * buildBody — messages-API keha mugavus-väljadest (kasutatakse AINULT kui `body`-t pole antud).
 *   Säilitab makeCaller vaikeseaded: adaptive thinking (Fable: omit), output_config.effort, system
 *   cache_control, schema → output_config.format. Migreeritud skriptid annavad OMA `body` → see
 *   jääb muutumatuks (käitumine ei muutu, ainult transport + silt + kulu tsentraliseerub).
 */
export function buildBody({ model, system, messages, maxTokens = 2000, schema = null, cacheSystem = true, fable = false, effort = "low", thinking } = {}) {
  const sys = typeof system === "string"
    ? [{ type: "text", text: system, ...(cacheSystem ? { cache_control: { type: "ephemeral" } } : {}) }]
    : system;
  const body = {
    model,
    max_tokens: maxTokens,
    ...(fable ? {} : { thinking: thinking || { type: "adaptive" } }),
    ...(fable ? {} : { output_config: { effort } }),
    ...(sys ? { system: sys } : {}),
    messages,
  };
  if (schema) body.output_config = { ...(body.output_config || {}), format: { type: "json_schema", schema } };
  return body;
}

/**
 * callMessages — guarded /v1/messages kutse. KÕIK sünkroon-kutsed käivad siit läbi.
 *   @param {string} task KOHUSTUSLIK by_task-silt.
 *   @param {object} [body] täielik messages-API keha (migreeritud skriptid annavad OMA keha);
 *     puudub → ehitatakse mugavus-väljadest (model/system/messages/maxTokens/schema/…).
 *   @returns {Promise<{json:object, text:string, usage:object}>}
 *   Degrade-viga (krediit/usage) → visatud Error'il `.degrade = 'credit'|'usage'` (mid-run exit 3).
 */
export async function callMessages({
  apiKey, task, body,
  model, system, messages, maxTokens, schema, cacheSystem, fable, effort, thinking,
  batch = false, timeoutMs = 120000, ctx = "", maxAttempts = 5, onUsage = null,
  fetchImpl = fetch, recordImpl = recordSpend, alertImpl = alertUsageLimit,
} = {}) {
  const key = requireKey(apiKey);
  const tsk = requireTask(task);
  const reqBody = body || buildBody({ model, system, messages, maxTokens, schema, cacheSystem, fable, effort, thinking });
  const useModel = reqBody.model || model;
  if (!reqBody.messages || !Array.isArray(reqBody.messages)) {
    throw new Error("llm-client: `messages` puudub (anna `body` või `messages`).");
  }

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetchImpl(API_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": ANTHROPIC_VERSION },
        body: JSON.stringify(reqBody),
      });
      clearTimeout(to);
      if (!r.ok) {
        const t = await r.text();
        // usage-cap (workspace spend-limit/tier) → KOHE alert (1×/protsess) + throw. EI retry
        //   (usage-limit ei lahene retry'ga; ENNE retry-check'i, muidu transient-429 segaks).
        if (isUsageLimitError(t)) {
          alertImpl(`API ${r.status}: ${t.slice(0, 250)}`, { ctx: ctx || tsk });
          const e = new Error(`API ${r.status}: ${t.slice(0, 250)}`); e.degrade = "usage"; throw e;
        }
        if ((r.status === 429 || r.status === 529 || r.status >= 500) && attempt < maxAttempts) {
          await sleep(backoff(attempt)); continue;
        }
        const e = new Error(`API ${r.status}: ${t.slice(0, 250)}`);
        if (isDegradeError(t)) e.degrade = degradeKind(t); // krediit-balance → mid-run exit 3
        throw e;
      }
      const j = await r.json();
      recordImpl({ model: useModel, usage: j.usage, batch, task: tsk }); // ÜKS KOHT — kulu + silt
      if (onUsage) onUsage(useModel, j.usage);
      const text = (j.content?.find((b) => b.type === "text") || {}).text || "";
      return { json: j, text, usage: j.usage };
    } catch (e) {
      clearTimeout(to);
      lastErr = e;
      if (e && e.degrade) throw e;              // degrade EI retry'ta
      if (attempt < maxAttempts) { await sleep(backoff(attempt)); continue; }
      throw e;
    }
  }
  throw lastErr;
}

/**
 * makeCaller — l3-desc.makeCaller-ÜHILDUV kuju (callApi(model, system, user, opts) → text).
 *   Lubab lib'id/skriptid migreerida minimaalse diffiga. task siin KOHUSTUSLIK (erinevus vanast).
 */
export function makeCaller({ apiKey, task, onUsage = null, timeoutMs = 120000 } = {}) {
  const key = requireKey(apiKey);
  const tsk = requireTask(task);
  return async function callApi(model, system, userText, { maxTokens = 2000, schema = null, cacheSystem = true, fable = false } = {}) {
    const { text } = await callMessages({
      apiKey: key, task: tsk, model, system,
      messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
      maxTokens, schema, cacheSystem, fable, timeoutMs, onUsage,
    });
    return text;
  };
}
