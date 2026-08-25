/**
 * credit-guard.mjs — ÜKS SSoT krediidi-tõrke tuvastuseks + krediit-probe.
 *
 * Kasutajad (kõik LLM-sammud jagavad SAMA definitsiooni — DRY, HARD RULE #5 "üks transform"):
 *   [4] pipeline-classify.mjs   — mid-run credit → exit 3
 *   [6] spec-extract-skus.mjs   — mid-run credit → exit 3
 *   [6.5] pipeline-content-gen.mjs — mid-run credit → exit 3 (rc=3 DEGRADE)
 *   probe: credit-probe.mjs     — pipeline-alguse värav (1-token proov)
 *
 * MIKS: krediidi-tõrge (HTTP 400/402 "credit balance too low") ≠ API-maas (timeout/5xx).
 *   Krediit → DEGRADE (skip LLM, laoseis JÄTKUB). API-maas → süsteemne (loud alert).
 *   Üks definitsioon → sammud ei lahkne (nagu [6.5] hook + backfill jagavad transform'i).
 */

// Krediidi-/arve-tõrge. Anthropic tagastab HTTP 400 invalid_request_error "Your credit balance is too low".
// (400/402 EI retry'ta — tuleb otse vea-stringina.) Regex katab ka billing/quota variandid + tulevased brändid.
export function isCreditError(err) {
  return /credit balance|credit_balance|billing|insufficient.?(?:quota|funds|credit)|HTTP 40[23]|Plans & Billing|too low/i.test(
    String(err || "")
  );
}

/**
 * probeCredit — üks odav 1-token päring. Eristab: krediit OK / krediit maas / API maas.
 *   TIMEOUT/network/5xx = API maas (süsteemne), MITTE krediit — "ära aja segamini" (Tarmo).
 * @returns {Promise<{status:'ok'|'credit'|'api', detail:string}>}
 */
export async function probeCredit({ apiKey, model = "claude-haiku-4-5", timeoutMs = 15000 } = {}) {
  if (!apiKey) return { status: "api", detail: "ANTHROPIC_API_KEY puudub" };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      signal: ctrl.signal,
    });
    if (r.ok) return { status: "ok", detail: `HTTP ${r.status}` };
    let body = "";
    try { body = await r.text(); } catch { /* ignore */ }
    // 400/402/403 + krediidi-signatuur = KREDIIT (degrade). 400 ilma krediidi-signatuurita = süsteemne.
    if ((r.status === 400 || r.status === 402 || r.status === 403) && isCreditError(body)) {
      return { status: "credit", detail: `HTTP ${r.status} krediit` };
    }
    // 401 auth / 400 muu / 429 / 5xx = API-probleem (süsteemne, MITTE krediit).
    return { status: "api", detail: `HTTP ${r.status}: ${body.slice(0, 120)}` };
  } catch (e) {
    // timeout (AbortError) / võrgu-viga = API maas, MITTE krediit.
    return { status: "api", detail: `${e && e.name === "AbortError" ? "timeout" : "network"}: ${String(e && e.message || e).slice(0, 80)}` };
  } finally {
    clearTimeout(t);
  }
}
