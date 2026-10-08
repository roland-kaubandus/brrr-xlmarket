/**
 * l3-desc.mjs — LAINE 2 L3 TÜÜBIPROFIILI-KIRJELDUSE TRANSFORM (SSoT, HARD RULE #5).
 *
 * ÜKS TRANSFORM, KAKS KUTSUJAT:
 *   (a) scripts/l3-desc-gen.mjs        — backfill-runner (kõik kirjelduseta L3, batch).
 *   (b) scripts/classify-etapp2-create.mjs — öine auto-create: uus L3 saab SÜNNIL
 *       `product_category.description` = tüübiprofiil (internal kohtuniku-väli, MITTE SEO).
 *
 * SIHTVÄLI = `product_category.description` — INTERNAL (öine klassifikaator-kohtunik loeb candLine'is
 *   esimest 400 tähemärki). Storefront SEO tuleb genyM YAML-ist (name-põhine), MITTE sellest väljast.
 *
 * genValidatedDesc() = täis-ahel ühele L3-le: gen → värav → REGEN-tagasiside (gate-kukk → "väldi sõna X",
 *   kuni regenMax) → valideerimine (kohtunik Opus + referents Sonnet, lahkheli → Fable viigimurdja).
 */

import { isUsageLimitError, alertUsageLimit, recordSpend } from "./spend-guard.mjs";

export const GEN_MODEL = "claude-opus-4-8";   // generaator (SSoT kvaliteet)
export const JUDGE_MODEL = "claude-opus-4-8";  // kohtunik
export const REF_MODEL = "claude-sonnet-5";    // sõltumatu referents (= REF_MODEL_CLSF)
export const FABLE_MODEL = "claude-fable-5";   // viigimurdja lahkheli korral

// ──────────────────────────── VÄRAV: numbrid/lubadused (tüübiprofiili-kohane, PURE — testitav ilma API-ta) ─
// MATERJAL/OMADUS-sõnad, mis VÕIVAD olla kategooria-defineerivad (kui L3 NIMES → lubatud, kehtib kõigile)
export const MATERIAL_RE = /\b(veekind\w*|vee-?kind\w*|waterproof|niiskuskind\w*|ilmastikukind\w*|roostevaba\w*|roostekind\w*|bms|lifepo4|li-?ion)\b/i;
// PUHAS TURUNDUS — EI KUNAGI lubatud (ei defineeri tüüpi)
export const MARKETING_RE = /\b(parim|kvaliteet\w*|soodsa?\w*|vastupida\w*|professionaalse?\w*|ülitugev\w*)\b/i;
// KONKREETNE SPEC-ARV (number + ühik) — ei kehti kõigile toodetele
export const SPECNUM_RE = /\b\d[\d.,]*\s?(w|kw|v|a|ah|wh|kg|g|mm|cm|m|l|ml|bar|psi|rpm|tsükl\w*|cycle\w*|°c|hz|db|lm)\b/i;

export function descClaimGate(text, nameCtx = "") {
  const offenders = [];
  const ctx = nameCtx.toLowerCase();
  const inName = (w) => w && ctx.includes(w.toLowerCase().slice(0, 6));  // stem (6 tähte) nimes → kategooria-defineeriv
  const mk = (text || "").match(MARKETING_RE); if (mk) offenders.push(`turundus «${mk[0]}»`);
  const mat = (text || "").match(MATERIAL_RE); if (mat && !inName(mat[0])) offenders.push(`materjal/lubadus «${mat[0]}» (pole L3 nimes → ei kehti kõigile)`);
  const sm = (text || "").match(SPECNUM_RE); if (sm) offenders.push(`spec-arv «${sm[0].trim()}»`);
  if ((text || "").length > 400) offenders.push(`liiga pikk (${(text || "").length}>400, kohtunik lõikab 400)`);
  return { pass: offenders.length === 0, offenders };
}

// ──────────────────────────── PROMPTID + SKEEMID ────────────────────────────
export const GEN_SYSTEM = `Oled XL e-poe (xlmarket.ee, Eesti) taksonoomia TÜÜBIPROFIILI-toimetaja. Iga L3 (leht-kategooria) jaoks
kirjuta LÜHIKE funktsioonipõhine tüübiprofiil, mille öine klassifikaator-kohtunik loeb, et otsustada kas toode kuulub siia.

EESMÄRK: profiil kirjeldab TÜÜPI (otstarve/funktsioon/väljund), MITTE nime ega turundust. Feed-toode mapitakse SELLE järgi.

VORM (üks eesti lõik, kuni 360 tähemärki):
"<Mis TÜÜPI tooted + otstarve>: <konkreetsed alamtüübid ET (english keyword)>. <Kui vajalik: mis EI kuulu / naaber-piir>."
Näide-stiil: "Kahvad ja saagivõrgud kala veest tõstmiseks: teleskoopvarrega maandusvõrgud (landing net), heitevõrgud (cast net). EI sisalda püügivõrke (need: Võrgud ja mõrrad)."

REEGLID:
- FUNKTSIOONIPÕHINE, mitte turundus. EI "kvaliteetne", "parim", "soodne", "vastupidav".
- KEELATUD konkreetsed toote-numbrid/lubadused, mis EI kehti kõigile toodetele (nt "200 W", "4000 tsüklit", "veekindel", "BMS", "LiFePO4", "kandevõime 250 kg"). Mõõtühiku NIMETAMINE üldiselt on OK ("mõõdab kiirust m/s"), AGA konkreetne spec-arv EI.
- Lisa alamtüüpide ET nimi + (english feed-märksõna) — see aitab masintõlke-feed'i mappida.
- Kui naabrid tekitavad segadust (sarnane tüüp kõrval), lisa 1 lühike piir-lause "EI sisalda X (need: <naaber>)".
- Profiil peab VASTAMA L3 nimele JA näidistoodetele. Ära leiuta tüüpe, mida näidistes pole.

Vasta AINULT JSON: {"items":[{"l3_id":"...","description":"<eesti tüübiprofiil, kuni 360 tähemärki>"}]}`;

export const GEN_SCHEMA = {
  type: "object", additionalProperties: false, required: ["items"],
  properties: { items: { type: "array", items: {
    type: "object", additionalProperties: false, required: ["l3_id", "description"],
    properties: { l3_id: { type: "string" }, description: { type: "string" } },
  } } },
};

export const VALIDATE_SYSTEM = `Oled taksonoomia-kirjelduse HINDAJA xlmarket.ee jaoks. Sulle antakse L3 (leht-kategooria) NIMI,
näidistooted ja GENEREERITUD tüübiprofiil-kirjeldus. Hinda, kas kirjeldus on ÕIGE ja KASUTATAV öisele klassifikaator-kohtunikule.

Kriteeriumid (KÕIK peavad kehtima → verdict "OK"):
1. VASTAB NIMELE — kirjeldus kirjeldab sama tüüpi, mida L3 nimi lubab.
2. VASTAB TOODETELE — näidistooted sobivad kirjelduse alla (ei leiutatud tüüpe).
3. FUNKTSIOONIPÕHINE — otstarve/tüüp, MITTE turundus ("kvaliteetne"/"parim").
4. EI VALE-LUBADUSI — ei konkreetseid spec-numbreid/lubadusi, mis ei kehti kõigile (nt "200 W", "veekindel", "BMS").

Vasta AINULT JSON: {"verdict":"OK"|"NOT_OK","matches_name":true|false,"matches_products":true|false,"issues":"<lühike eesti põhjus või tühi>"}`;

export const VALIDATE_SCHEMA = {
  type: "object", additionalProperties: false, required: ["verdict", "matches_name", "matches_products", "issues"],
  properties: {
    verdict: { type: "string", enum: ["OK", "NOT_OK"] },
    matches_name: { type: "boolean" }, matches_products: { type: "boolean" },
    issues: { type: "string" },
  },
};

// ──────────────────────────── API-KUTSUJA (usage → onUsage callback kulu-arvestuseks) ────────────────────────────
export function makeCaller({ apiKey, onUsage = null, timeoutMs = 120000 }) {
  if (!apiKey) throw new Error("makeCaller: apiKey puudub");
  return async function callApi(model, system, userText, { maxTokens = 2000, schema = null, cacheSystem = true, fable = false } = {}) {
    const body = {
      model, max_tokens: maxTokens,
      thinking: fable ? undefined : { type: "adaptive" },          // Fable: thinking alati sees (omit); muidu adaptive
      ...(fable ? {} : { output_config: { effort: "low" } }),
      system: [{ type: "text", text: system, ...(cacheSystem ? { cache_control: { type: "ephemeral" } } : {}) }],
      messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
    };
    if (schema) body.output_config = { ...(body.output_config || {}), format: { type: "json_schema", schema } };
    for (let attempt = 1; attempt <= 5; attempt++) {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", signal: ctrl.signal,
          headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify(body),
        });
        clearTimeout(to);
        if (!r.ok) {
          const t = await r.text();
          // 1b: workspace spend-cap / tier usage-limit → KOHE Telegram (üks kord/protsess). NB: ENNE retry-check'i,
          //   sest usage-limit EI lahene retry'ga (transient per-minute 429 → isUsageLimitError=false → retry jätkub).
          if (isUsageLimitError(t)) { alertUsageLimit(`API ${r.status}: ${t.slice(0, 250)}`, { ctx: "l3-desc" }); throw new Error(`API ${r.status}: ${t.slice(0, 250)}`); }
          if ((r.status === 429 || r.status === 529 || r.status >= 500) && attempt < 5) { await new Promise((s) => setTimeout(s, Math.min(30000, 1000 * 2 ** attempt))); continue; }
          throw new Error(`API ${r.status}: ${t.slice(0, 250)}`);
        }
        const j = await r.json();
        recordSpend({ model, usage: j.usage });   // per-projekt kuu-kulu liider (raport); 80%-värav = checkWorkspaceSpendAlert
        if (onUsage) onUsage(model, j.usage);
        return (j.content.find((b) => b.type === "text") || {}).text || "";
      } catch (e) { clearTimeout(to); if (attempt < 5) { await new Promise((s) => setTimeout(s, Math.min(30000, 1000 * 2 ** attempt))); continue; } throw e; }
    }
  };
}

// ──────────────────────────── GENERAATOR (batch + üksik regen-tagasisidega) ────────────────────────────
function genBlock(r) {
  return `### L3 id=${r.id} — nimi="${r.name}" — peakategooria="${r.main}" — L2="${r.l2}" (${r.n} toodet)
NAABER-L3-d samas L2: ${(r.naabrid || []).join(", ") || "(pole)"}
Näidistooted:\n${(r.titles || []).length ? r.titles.map((t) => "  • " + t).join("\n") : "  (0 toodet praegu — tugine L3 NIMELE + naabritele; kirjelda tüüp, mida nimi lubab)"}`;
}

export async function genDescBatch(callApi, batch, { avoidByL3 = {} } = {}) {
  const blocks = batch.map((r) => {
    const avoid = avoidByL3[r.id];
    return genBlock(r) + (avoid ? `\n⚠️ EELMINE KATSE KUKKUS VÄRAVAS — VÄLDI neid: ${avoid}. Kirjuta üldisem tüübiprofiil ilma nende sõnade/arvudeta.` : "");
  }).join("\n\n");
  const txt = await callApi(GEN_MODEL, GEN_SYSTEM, "GENEREERI TÜÜBIPROFIILID:\n\n" + blocks, { maxTokens: 4000, schema: GEN_SCHEMA });
  return (JSON.parse(txt).items) || [];
}

function validateUserMsg(r, description) {
  return `L3 NIMI: «${r.name}»  (peakategooria: ${r.main} / L2: ${r.l2})
NÄIDISTOOTED:\n${(r.titles || []).length ? r.titles.map((t) => "  • " + t).join("\n") : "  (0 toodet praegu — hinda ainult nime-vastavust, matches_products=true kui kirjeldus nimele vastab)"}

GENEREERITUD KIRJELDUS:\n«${description}»

Hinda kirjeldust.`;
}

export async function validateDesc(callApi, r, description) {
  const [jTxt, rTxt] = await Promise.all([
    callApi(JUDGE_MODEL, VALIDATE_SYSTEM, validateUserMsg(r, description), { maxTokens: 1200, schema: VALIDATE_SCHEMA }),
    callApi(REF_MODEL, VALIDATE_SYSTEM, validateUserMsg(r, description), { maxTokens: 1200, schema: VALIDATE_SCHEMA }),
  ]);
  const judge = JSON.parse(jTxt), ref = JSON.parse(rTxt);
  let consensus, fable = null;
  if (judge.verdict === ref.verdict) consensus = judge.verdict;
  else {
    const fTxt = await callApi(FABLE_MODEL, VALIDATE_SYSTEM, validateUserMsg(r, description), { maxTokens: 1500, schema: VALIDATE_SCHEMA, fable: true });
    fable = JSON.parse(fTxt);
    consensus = fable.verdict;
  }
  return { judge, ref, fable, consensus };
}

/**
 * regenGate — gate-kukkunud L3 REGEN-tagasisidega (ilma valideerimiseta), kuni gate läbib või regenMax ammendub.
 *   Kasutab backfill-runner, kui batch-gen'i esimene katse kukub väravas (säilitab batch-efektiivsuse: regen AINULT kukkujatele).
 *   firstDescription/firstGate = juba-genereeritud esimene katse (ei raiska gen-kutset).
 */
export async function regenGate(callApi, r, firstDescription, firstGate, { regenMax = 2 } = {}) {
  const nameCtx = `${r.name} ${r.l2} ${r.main}`;
  let description = firstDescription, gate = firstGate, attempts = 0;
  const avoidByL3 = { [r.id]: (gate.offenders || []).join("; ") };
  while (!gate.pass && attempts < regenMax) {
    attempts++;
    const items = await genDescBatch(callApi, [r], { avoidByL3 });
    description = ((items.find((x) => x.l3_id === r.id) || items[0] || {}).description || "").trim();
    gate = descClaimGate(description, nameCtx);
    avoidByL3[r.id] = gate.offenders.join("; ");
  }
  return { description, gate, attempts };
}

/**
 * genValidatedDesc — TÄIS-AHEL ühele L3-le (kutsutakse nii backfilli üksik-regen'is kui birth-hookis).
 *   gen → värav → (gate-kukk → REGEN "väldi X", kuni regenMax) → valideerimine.
 * Tagastab {description, gate, validation, consensus, ok, attempts}. ok = gate.pass && consensus==='OK'.
 */
export async function genValidatedDesc(callApi, r, { regenMax = 2 } = {}) {
  const nameCtx = `${r.name} ${r.l2} ${r.main}`;
  let description = "", gate = null, attempts = 0;
  const avoidByL3 = {};
  for (attempts = 1; attempts <= regenMax + 1; attempts++) {
    const items = await genDescBatch(callApi, [r], { avoidByL3 });
    description = ((items.find((x) => x.l3_id === r.id) || items[0] || {}).description || "").trim();
    gate = descClaimGate(description, nameCtx);
    if (gate.pass) break;
    avoidByL3[r.id] = gate.offenders.join("; ");   // tagasiside järgmisele katsele
  }
  if (!gate.pass) return { description, gate, validation: null, consensus: "GATE_FAIL", ok: false, attempts };
  let validation = null;
  try { validation = await validateDesc(callApi, r, description); }
  catch (e) { return { description, gate, validation: { error: e.message }, consensus: "ERROR", ok: false, attempts }; }
  return { description, gate, validation, consensus: validation.consensus, ok: validation.consensus === "OK", attempts };
}
