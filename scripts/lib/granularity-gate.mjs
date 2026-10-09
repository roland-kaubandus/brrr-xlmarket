/**
 * granularity-gate.mjs — L3-GRANULAARSUSE VÄRAV (spets §3 reegel + §4 gate #8 "merge-judge uus L3 vs õed").
 *
 * BUG-PARANDUS 2026-10-09 (Tarmo): jagatud mootor (l3-create-engine) EI implementeerinud kunagi
 * suhtelist granulaarsus-väravat → õhukesed L3-d (tegelikult variandid olemas-õest) läbisid. See moodul
 * jõustab reegli: uus L3 luuakse AINULT kui semantiline kaugus lähimast olemas-õe-L3-st (sama L2) on
 * ≥ tüüpiline õdede-vaheline kaugus (= ERI TÜÜP). Variant (sama funktsioon+väljund) → EI loo.
 *
 * HARD RULE #5 — ÜKS transform, KAKS kutsujat:
 *   (a) ETAPP3 re-form (scripts/apply-granularity-gate.mjs) — plaani filter enne execute'it,
 *   (b) öine auto-create (scripts/lib/l3-create-engine.mjs) — gate enne DB-transaktsiooni.
 *
 * SUHTELINE, MITTE absoluutne: EI loe tooteid ("N tükki → L3"). Üks väga eristuv toode VÕIB ületada;
 * viis ähmast ei pruugi. Otsus = semantiline kaugus (LLM, Opus) — kood ei suuda deterministlikult (keyword-recall 0%).
 *
 * ÕHUKESE-KLASTRI KINNITUS 2026-10-09 (Tarmo §9 "1–2 tootega L3 ≠ automaatne L3" + §2c asümm-kindlus):
 * tootearv EI ole lävi, AGA õhuke klaster (n ≤ THIN_N) annab 1. kohtunikule VÄHE tõendit → struktuuri-otsus
 * õhukese tõendi peal on ebastabiilne. Seega: distinct + n≤THIN_N → nõua 2. SÕLTUMATU kohtuniku (Fable)
 * kinnitust. Lahkheli (2. ei kinnita eristust) → KONSERVATIIVNE "variant" (jää koju). Jämedad klastrid
 * (n>THIN_N) ei vaja 2. kohtunikku (1 kutse). Count gates AINULT kontrolli-rangust, MITTE otsust ennast.
 */

export const GRAN_MODEL = "claude-opus-4-8";
export const GRAN_CONFIRM_MODEL = "claude-fable-5"; // 2. sõltumatu kohtunik õhukestele (§2c)
export const THIN_N = 2;                            // ≤2 toodet = õhuke → nõua kinnitust

const GRAN_SCHEMA = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ck: { type: "string" },
          verdict: { type: "string", enum: ["distinct", "variant"] },
          nearest: { type: ["string", "null"] },
          reason: { type: "string" },
        },
        required: ["ck", "verdict", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["verdicts"],
  additionalProperties: false,
};

const GRAN_SYSTEM = `Sa oled Eesti e-poe taksonoomia-kohtunik. Otsustad L3-GRANULAARSUSE: kas pakutud uus L3 väärib OMA kategooriat, vÕi on VARIANT olemasolevast õe-L3-st (sama L2 all).

REEGEL — SUHTELINE SEMANTILINE KAUGUS (MITTE tootearv; ÄRA loe tooteid):
• "distinct" (→ loo OMA L3): funktsioon VÕI väljund (tulem) erineb lähimast olemas-õest nii palju, et ostja EI SAA toodet asendada õe-kategooria tootega sama tulemusega. Semantiline kaugus ≥ tüüpiline õdede-vaheline kaugus samas L2-s.
    Nt: konsool-puiduriiul (kandekäpad) ≠ seinariiul (tasandid); helbejäämasin ≠ kuubikjäämasin (väljund erineb); LiFePO4 energiasalvesti (tsükliline) ≠ käivitusaku (käivitusvool).
• "variant" (→ EI loo, kuulub olemas-õe alla): sama funktsioon+väljund, erineb AINULT vorm / suurus / materjal / paigaldus / energiaallikas — ostja otsib SAMA asja teises vormis.
    Nt: lae- vs seinaventilaator; torn- vs põrandaventilaator; bensiini- vs elektri-mullafrees; pitsakivi vs -teras.

TEST: "kas ostja saab toote A asendada õe-kategooria tootega B, sama tulemus?" JAH → variant. EI → distinct.

KONSERVATIIVSUS: struktuur on kallis ja püsiv. Kahtluse korral (kaugus piiripealne, pole selge eristus) → "variant" (jää olemas-koju). Ainult SELGE eristuv tüüp → "distinct".`;

export function buildGranularityUser(l2Name, candidates, siblings) {
  const sibLines = siblings.length
    ? siblings.map((s) => `- ${s.name_et}${s.name_en && s.name_en !== s.name_et ? ` (${s.name_en})` : ""}`).join("\n")
    : "(selle L2 all pole veel ühtegi olemas-L3 → ainsa tüübi puhul on uus L3 õigustatud, kui tüüp on koherentne)";
  const candLines = candidates.map((c, i) =>
    `${i + 1}. [ck=${c.ck}] «${c.name_et}»${c.name_en && c.name_en !== c.name_et ? ` / ${c.name_en}` : ""}\n   näidistooted: ${(c.titles || []).slice(0, 6).join(" | ") || "(pole)"}`
  ).join("\n");
  return `PEAKATEGOORIA/L2: "${l2Name}"

OLEMAS-õed (L3 selle L2 all):
${sibLines}

PAKUTUD uued L3 (otsusta igaühe kohta distinct vs variant):
${candLines}

Iga pakutud L3 kohta: verdict "distinct" või "variant"; kui variant → nimeta lähim olemas-õde (nearest) + lühike eesti põhjus. Vasta AINULT skeemi järgi.`;
}

/**
 * granularityJudgeL2 — hinda KÕIK ühe L2 kandidaadid ÜHE kutsega (vähem API-kutseid).
 * @param caller  makeCaller(...) → callApi(model, system, user, {schema})
 * @returns [{ck, pass, verdict, nearest, reason}]  pass = (verdict === "distinct")
 */
export async function granularityJudgeL2({ l2Name, candidates, siblings, caller, model = GRAN_MODEL }) {
  const user = buildGranularityUser(l2Name, candidates, siblings);
  let parsed;
  try {
    const txt = await caller(model, GRAN_SYSTEM, user, { maxTokens: 3000, schema: GRAN_SCHEMA, fable: /fable|mythos/i.test(model) });
    parsed = JSON.parse(txt);
  } catch (e) {
    // kohtunik kukkus (API/parse) → KONSERVATIIVNE: ära loo (jää koju + signaal), märgi ebaselgeks
    return candidates.map((c) => ({ ck: c.ck, pass: false, verdict: "unclear", nearest: null, reason: "kohtunik kukkus: " + String(e.message).slice(0, 120) }));
  }
  const map = new Map((parsed.verdicts || []).map((v) => [v.ck, v]));
  return candidates.map((c) => {
    const v = map.get(c.ck);
    if (!v) return { ck: c.ck, pass: false, verdict: "unclear", nearest: null, reason: "kohtunik ei tagastanud selle kohta otsust → konservatiivne (jää koju)" };
    const pass = v.verdict === "distinct";
    return { ck: c.ck, pass, verdict: v.verdict, nearest: v.nearest || null, reason: v.reason || "" };
  });
}

/**
 * granularityGate — grupeeri kandidaadid L2 kaupa, hinda igaüks, tagasta per-ck tulemus + kokkuvõte.
 * @param candidates [{ck, name_et, name_en, parentL2, titles:[...]}]
 * @param siblingsOf (parentL2) => [{name_et, name_en}]   (olemas-L3 õed, VÄLJA ARVATUD kandidaadid ise)
 * @param caller     makeCaller(...)
 * @returns { results: Map<ck,{pass,verdict,nearest,reason}>, apiCalls }
 */
export async function granularityGate({ candidates, siblingsOf, caller, model = GRAN_MODEL, confirmModel = GRAN_CONFIRM_MODEL, thinN = THIN_N, onL2 = null }) {
  const byL2 = new Map();
  for (const c of candidates) {
    if (!byL2.has(c.parentL2)) byL2.set(c.parentL2, []);
    byL2.get(c.parentL2).push(c);
  }
  const nOf = new Map(candidates.map((c) => [c.ck, typeof c.n === "number" ? c.n : (Array.isArray(c.titles) ? c.titles.length : null)]));
  const results = new Map();
  let apiCalls = 0;
  for (const [l2, cands] of byL2) {
    const sibs = siblingsOf(l2) || [];
    const verdicts = await granularityJudgeL2({ l2Name: cands[0].parentL2_name || l2, candidates: cands, siblings: sibs, caller, model });
    apiCalls++;
    // §2c ASÜMM-KINDLUS: õhuke distinct (n≤thinN) → 2. SÕLTUMATU kohtunik (Fable). Lahkheli → konservatiivne variant.
    const thin = verdicts.filter((v) => v.verdict === "distinct" && (nOf.get(v.ck) ?? 99) <= thinN);
    if (thin.length && confirmModel) {
      const thinCands = cands.filter((c) => thin.some((v) => v.ck === c.ck));
      let confirm = [];
      try {
        confirm = await granularityJudgeL2({ l2Name: cands[0].parentL2_name || l2, candidates: thinCands, siblings: sibs, caller, model: confirmModel });
        apiCalls++;
      } catch (e) {
        // 2. kohtunik kukkus (API/parse) → KONSERVATIIVNE: käsitle kõiki õhukesi kinnitamata
        confirm = thinCands.map((c) => ({ ck: c.ck, verdict: "unclear", nearest: null, reason: "2. kohtunik kukkus: " + String(e.message).slice(0, 100) }));
      }
      const cmap = new Map(confirm.map((v) => [v.ck, v]));
      for (const v of verdicts) {
        if (v.verdict !== "distinct") continue;
        const c = cmap.get(v.ck);
        if (!c) continue; // pole õhuke → kinnitust ei vaja
        v.confirm = { model: confirmModel, verdict: c.verdict, nearest: c.nearest || null, reason: c.reason || "" };
        v.n_products = nOf.get(v.ck) ?? null;
        if (c.verdict !== "distinct") {
          v.verdict = "variant";
          v.pass = false;
          v.nearest = c.nearest || v.nearest;
          v.reason = `õhuke klaster (n≤${thinN}) — 2. kohtunik (${confirmModel}) ei kinnitanud eristust [${c.verdict}]: ${c.reason || ""}`.slice(0, 300);
          v.thin_unconfirmed = true;
        }
      }
    }
    for (const v of verdicts) results.set(v.ck, v);
    if (onL2) onL2(l2, cands, verdicts);
  }
  return { results, apiCalls };
}
