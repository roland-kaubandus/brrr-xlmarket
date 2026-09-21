#!/usr/bin/env node
/**
 * synonym-gen.mjs — SÜNONÜÜMI-TRANSFORMI SSoT (HARD RULE #5: sama transform backfill + hook).
 *
 * A2 sisu-transform: OTSINGU sünonüümid + kirjapildi-variandid → Meili synonyms.
 *
 * KAKS OSA (Tarmo otsus 2026-09-21):
 *   1. SÜNONÜÜMID  — LLM (Haiku API): word + real-synonyms + confidence + review-lipp.
 *   2. VARIANDID   — DETERMINISTLIK KOOD (õ→o/ü→u/y ASCII-fold + kokku/lahku glue).
 *      LLM EI genereeri variante — leiutab prahti (50% tõestatud vale). Kood = 100% õige, tasuta.
 *
 * ÜKS transform, KAKS kutsujat:
 *   - HOOK [6.6] : scripts/pipeline-synonyms.mjs --skus /tmp/classify-skus.txt (öine DELTA)
 *   - BACKFILL   : scripts/synonym-gen-run.mjs --all --batch  (kogu korpus, ühekordne)
 *   Sama generateSynonyms + sama buildRows → backfill ja hook EI lahkne.
 *
 * MULTI-FEED (bränd-agnostiline): loeb toote OMA ET/EN sisu (title_et/title_en/kategooria).
 *   deriveBrandSlug SSoT → LLM saab brändi-nime (et välistada brändi sünonüümiks). MITTE VEVOR-hardcode
 *   → Powermat/BlackTools/KraftDele läbivad sama masina.
 *
 * PROPOSE-NOT-CREATE: confidence ≥ CONF_AUTO (0.85) & !review → auto (product_synonym → Meili).
 *   Muidu → review-bucket (synonym_review, INIMENE otsustab). Cron ei kasvata ise.
 */

import { deriveBrandSlug, BRAND_NAMES } from "./brand-strip.mjs";

export const SG_VERSION = "sg-v1";            // tõsta kui prompt/skeem oluliselt muutub → regen
export const CONF_AUTO = 0.85;                // ≥ → auto product_synonym; alla → review-bucket
export const DEFAULT_MODEL = "claude-haiku-4-5";
const API_URL = "https://api.anthropic.com/v1/messages";

// ── Deterministlik ASCII-fold + glue (100% õige, tasuta — MITTE LLM) ──────────
const FOLD_U = (s) => s.replace(/õ/g, "o").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/š/g, "s").replace(/ž/g, "z");
const FOLD_Y = (s) => s.replace(/õ/g, "o").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "y").replace(/š/g, "s").replace(/ž/g, "z");
const GLUE = (s) => s.replace(/[\s\-]+/g, "");
export const squash = (s) => String(s).toLowerCase().replace(/[\s\-]/g, "");

/**
 * deriveVariants — deterministlikud kirjapildi-variandid sõnast + sünonüümidest.
 *   - ASCII-fold: õ→o, ä→a, ö→o, ü→u JA ü→y (eestlased kirjutavad täpitähtedeta, 2 levinud viisi).
 *   - GLUE: liitsõna kokku (tühik/sidekriips eemaldatud) — "õhu kompressor" → "õhukompressor".
 *   - Ainult UUED vormid (ei kordu baas-sõnadega). Ei LEIUTA — puhas teisendus.
 */
export function deriveVariants(word, synonyms = []) {
  const base = [word, ...synonyms].map((x) => String(x || "").toLowerCase().trim()).filter(Boolean);
  const baseSet = new Set(base);
  const out = new Set();
  for (const w of base) {
    const cands = [FOLD_U(w), FOLD_Y(w), GLUE(w), FOLD_U(GLUE(w)), FOLD_Y(GLUE(w))];
    for (const v of cands) {
      const vv = v.trim();
      if (vv && vv.length >= 2 && !baseSet.has(vv)) out.add(vv);
    }
  }
  return [...out];
}

// ── LLM prompt (SÜNONÜÜMID AINULT — variandid teeb kood) ──────────────────────
const SYSTEM = `Oled eesti e-kaubanduse OTSINGU-ekspert xlmarket.ee jaoks. Sinu ainus töö on aidata ostjal toode ÜLES LEIDA — ükskõik kuidas ta otsingusse kirjutab.

Iga toote kohta tuvasta 1-3 KANOONILIST eesti otsingusõna (mida ostja päriselt kirjutaks) ja iga sõna kohta anna:
- synonyms: alternatiivsed eesti + inglise otsingusõnad, mis tähendavad SAMA asja (nt "kütusepump" → ["tankur","fuel pump"]; "trollingumootor" → ["elektrimootor paadile","trolling motor"]).

KIRJAPILDI-variante (täpitähtedeta, kokku/lahku) EI genereeri — need teeb süsteem ise deterministlikult. Sina annad AINULT sõna + tõelised sünonüümid.

RANGED REEGLID (kvaliteet on tähtsam kui kogus):
1. word = päris otsingusõna, väiketähed, AINSUSE NIMETAV. MITTE kogu pealkiri.
2. ÄRA lisa: brände (VEVOR, Powermat, KraftDele, BlackTools), mudelikoode (F150, 24V, 86lbs), mõõtusid (36-tolline), värve.
3. synonyms peab olema TÕELINE sünonüüm (sama ese, teine nimi) — MITTE seotud toode, MITTE alamliik, MITTE juhuslik sõna.
4. Parem TÜHI kui vale: kui head sünonüümi pole, jäta synonyms=[].
5. Kui toode on mitmetähenduslik, haruldane, või sa pole kindel õiges otsingusõnas → review:true (inimene vaatab üle). Muidu review:false.
6. confidence 0.0-1.0: kui kindel oled selle termini sünonüümides.

Vasta AINULT etteantud JSON-skeemis.`;

const SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          terms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                word: { type: "string" },
                synonyms: { type: "array", items: { type: "string" } },
                confidence: { type: "number" },
                review: { type: "boolean" },
              },
              required: ["word", "synonyms", "confidence", "review"],
              additionalProperties: false,
            },
          },
        },
        required: ["product_id", "terms"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

function userMsg(batch) {
  const list = batch.map((p) => {
    const brand = p.brand ? `  bränd (VÄLISTA sünonüümidest): ${p.brand}\n` : "";
    return `[${p.id}]\n  EN: ${p.title_en || ""}\n  ET: ${p.title_et || ""}\n${brand}  kategooria: ${p.category || "puudub"}`;
  }).join("\n\n");
  return `TOOTED:\n\n${list}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** buildRequestParams — Batch API jaoks (custom_id = product batch). Kutsuja mähib {custom_id, params}. */
export function buildParams(batch, { model = DEFAULT_MODEL } = {}) {
  return {
    model,
    max_tokens: 4000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg(batch) }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  };
}

/** Otsekutse (realtime, pilot/hook). Tagastab {ok, results|error}. */
export async function generateSynonyms(batch, { apiKey, model = DEFAULT_MODEL, timeoutMs = 120000, retries = 5 } = {}) {
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY puudub" };
  const body = buildParams(batch, { model });
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        if ((r.status === 429 || r.status === 529 || r.status >= 500) && attempt < retries) {
          clearTimeout(to); await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue;
        }
        clearTimeout(to);
        return { ok: false, error: `API ${r.status}: ${t.slice(0, 200)}` };
      }
      const j = await r.json();
      const txt = (j.content.find((b) => b.type === "text") || {}).text || "{}";
      const parsed = JSON.parse(txt);
      clearTimeout(to);
      return { ok: true, results: parsed.results || [] };
    } catch (e) {
      clearTimeout(to);
      if (attempt < retries) { await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue; }
      return { ok: false, error: String(e.message || e).slice(0, 200) };
    }
  }
  return { ok: false, error: "retries exhausted" };
}

/** parseBatchMessage — Batch API tulem (message) → results[]. */
export function parseBatchMessage(message) {
  const txt = ((message.content || []).find((b) => b.type === "text") || {}).text || "{}";
  return (JSON.parse(txt).results) || [];
}

/**
 * buildRows — LLM-terms + deterministlikud variandid → DB-read.
 *   auto (conf ≥ CONF_AUTO & !review) → product_synonym (→ Meili).
 *   review (alla lävi / review:true) → synonym_review (propose-not-create).
 * Tagastab { auto:[{word,synonyms,variants,confidence}], review:[{word,synonyms,variants,confidence,reason}] }.
 */
export function buildRows(terms = []) {
  const auto = [], review = [];
  const seen = new Set();
  for (const t of terms) {
    const word = String(t.word || "").toLowerCase().trim();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    const synonyms = [...new Set((t.synonyms || []).map((s) => String(s).toLowerCase().trim()).filter((s) => s && s !== word))];
    const variants = deriveVariants(word, synonyms);
    const conf = typeof t.confidence === "number" ? t.confidence : 0;
    const row = { word, synonyms, variants, confidence: conf };
    if (conf >= CONF_AUTO && !t.review) auto.push(row);
    else review.push({ ...row, reason: t.review ? "LLM review:true" : `confidence ${conf.toFixed(2)} < ${CONF_AUTO}` });
  }
  return { auto, review };
}

/** brandOf — toote bränd deriveBrandSlug SSoT kaudu (LLM-i välistuseks). Bränd-agnostiline. */
export function brandOf(product) {
  const slug = deriveBrandSlug(product.metadata || product || {});
  return slug ? (BRAND_NAMES[slug] || slug) : null;
}
