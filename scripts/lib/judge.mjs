#!/usr/bin/env node
/**
 * judge.mjs — AUTO-JUDGE TRANSFORMI SSoT (HARD RULE #5: sama transform backfill + hook).
 *
 * Kaks kohtunikku, mis adjudikeeivad review-ämbrite SABA (generaatori ebakindel osa):
 *   1. SÜNONÜÜMI-KOHTUNIK  (Sonnet)  — synonym_review pending → OK / VALE / EBAKINDEL.
 *   2. KLASSIFIKAATORI-KOHTUNIK (Opus) — classification_review pending → assign / group / new_l3 / keep.
 *
 * ⚠️ DRY-FIRST: see lib EI kirjuta kunagi DB-sse. Ta tagastab OTSUSED (puhas funktsioon).
 *    DB-write (product_synonym / assign_existing / create_l3-logi) teeb KUTSUJA
 *    (auto-judge-run.mjs) alles pärast kalibreerimise-väravat. Nii jääb kohtunik testitavaks.
 *
 * MULTI-FEED (bränd-agnostiline): kohtunik otsustab toote SISUST (title/spets/kategooria),
 *   MITTE tootja-nimest → loomu poolest bränd-immuunne. EI tohi olla VEVOR-hardcode't.
 *
 * Mudel ≠ generaator: sünonüüme teeb Haiku → kohtunik Sonnet (sõltumatu teine arvamus).
 */

const API_URL = "https://api.anthropic.com/v1/messages";
export const SYN_JUDGE_MODEL = "claude-sonnet-5";
export const CLSF_JUDGE_MODEL = "claude-opus-4-8";
export const JUDGE_VERSION = "judge-v1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Üldine Anthropic-kutse json_schema väljundiga + retry (sama muster kui synonym-gen). */
async function callJudge({ apiKey, model, system, user, schema, maxTokens = 4000, timeoutMs = 120000, retries = 5 }) {
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY puudub" };
  const body = {
    model,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema } },
  };
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(API_URL, {
        method: "POST", signal: ctrl.signal,
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
      clearTimeout(to);
      return { ok: true, parsed: JSON.parse(txt), usage: j.usage };
    } catch (e) {
      clearTimeout(to);
      if (attempt < retries) { await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue; }
      return { ok: false, error: String(e.message || e).slice(0, 200) };
    }
  }
  return { ok: false, error: "retries exhausted" };
}

// ════════════════════════════ 1. SÜNONÜÜMI-KOHTUNIK ═════════════════════════════

const SYN_SYSTEM = `Oled eesti e-kaubanduse OTSINGU-kvaliteedi KOHTUNIK xlmarket.ee jaoks.
Sulle antakse otsingu-sünonüüme, mille generaator juba pakkus, aga mis vajavad kinnitust.
Sünonüüm on AINULT Meili otsingu jaoks — ei ole nähtav tekst tootelehel.

Sinu AINUS kriteerium iga termini kohta:
**"Kas klient, kes kirjutab selle SÕNA otsingusse, ootaks näha seda toodet?"**

- OK        = jah — klient, kes otsib seda sõna, ootaks seda toodet.
- VALE      = ei — klient, kes otsib seda sõna, ei ootaks seda toodet (vale ese).
- EBAKINDEL = sa ei suuda ilma lisainfota otsustada.

Üldnimetuseks muutunud kaubamärgid (nt helicoil, flex, kärcher) on LUBATUD sünonüümidena,
kui klient kasutab neid igapäevase otsingusõnana — hinda ainult ülaltoodud kriteeriumi järgi.

Põhjus = üks lühike eestikeelne lause. Vasta AINULT etteantud JSON-skeemis.`;

const SYN_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          verdict: { type: "string", enum: ["OK", "VALE", "EBAKINDEL"] },
          reason: { type: "string" },
        },
        required: ["id", "verdict", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

function synUserMsg(batch) {
  const list = batch.map((r) => {
    const syns = (r.synonyms || []).join(", ") || "(ainult põhisõna)";
    return `[${r.id}]
  sõna: "${r.word}"
  sünonüümid: ${syns}
  toode EN: ${r.title_en || "?"}
  toode ET: ${r.title_et || "?"}
  kategooria (L3): ${r.category || "kategooriata"}
  generaatori kindlus: ${r.confidence ?? "?"} (${r.gen_reason || ""})`;
  }).join("\n\n");
  return `HINNATAVAD TERMINID:\n\n${list}`;
}

/**
 * judgeSynonyms — hinda partii synonym_review kirjeid. Tagastab { ok, results:[{id,verdict,reason}], usage }.
 * EI kirjuta DB-sse. Kutsuja otsustab tegevuse (OK→product_synonym, VALE→rejected, EBAKINDEL→jääb).
 */
export async function judgeSynonyms(batch, { apiKey, model = SYN_JUDGE_MODEL, timeoutMs, retries } = {}) {
  const res = await callJudge({ apiKey, model, system: SYN_SYSTEM, user: synUserMsg(batch), schema: SYN_SCHEMA, timeoutMs, retries });
  if (!res.ok) return res;
  return { ok: true, results: res.parsed.results || [], usage: res.usage };
}

/** synActionOf — verdikt → tegevus (kutsuja rakendab; siin ainult kaardistus, EI kirjuta). */
export function synActionOf(verdict) {
  if (verdict === "OK") return { status: "resolved", write_synonym: true };
  if (verdict === "VALE") return { status: "rejected", write_synonym: false };
  return { status: "pending", write_synonym: false }; // EBAKINDEL → jääb inimesele
}

// ════════════════════════════ 2. KLASSIFIKAATORI-KOHTUNIK ═══════════════════════

const CLSF_SYSTEM = `Oled xlmarket.ee taksonoomia-KOHTUNIK. Sulle antakse tooteid, mille automaat-klassifikaator
jättis ebakindlaks (review / new_l3 / quarantine ämber), + NIMEKIRI olemasolevatest L3-kategooriatest.

Rakenda 9-punkti SISU-reeglit (otsusta toote SISUST — title/spets/kirjeldus — MITTE nimest/tõlkest) ja
reegli-pingerida: EKSKLUSIIVSUS-värav → TÜÜP+DOMEEN → DUP-värav → seotud-tüübid → hübriid → variant/laius.

Iga toote kohta vali TEGEVUS:
- assign_existing : sobib semantiliselt ÜHTE olemas-L3-sse (anna target_handle nimekirjast). Eelista seda.
- group           : sama kontseptsioon kordub mitmes ämbri-kirjes → märgi ühine group_key (DUP-värav enne new_l3).
- new_l3          : AINULT kui kogu nimekirjas POLE sobivat tüüpi. Sa EI loo seda ise — koostad ETTEPANEKU
                    (new_l3_name eesti keeles + parent_l2_handle + põhjus). Inimene kinnitab.
- keep            : tõeliselt ebakindel → jääb inimesele.

⚠️ QUARANTINE-REEGEL: kui kirje on quarantine-ämbris, tuvasta ESMALT põhjus:
   - quarantine_cause="uncertainty" → klassifitseerimise ebakindlus → tohid anda assign/new_l3.
   - quarantine_cause="data_quality" → toote-info on puudu/katki (tühi title/kirjeldus/vigane spets)
     → tegevus PEAB olema "keep" (ära arva andmeauku täis), + märgi see põhjus.

RANGED REEGLID:
1. target_handle PEAB olema täpselt nimekirjast (ära leiuta handle't). Kui sobivat pole → new_l3 või keep.
2. Parem keep kui vale assign — vale paigutus on nähtav ja eksitab ostjat.
3. confidence 0.0-1.0 = kui kindel oled tegevuses.
4. reason = lühike eestikeelne põhjendus (mis tüüp + miks see kodu).

Vasta AINULT etteantud JSON-skeemis.`;

const CLSF_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          action: { type: "string", enum: ["assign_existing", "group", "new_l3", "keep"] },
          target_handle: { type: "string" },
          group_key: { type: "string" },
          new_l3_name: { type: "string" },
          parent_l2_handle: { type: "string" },
          quarantine_cause: { type: "string", enum: ["uncertainty", "data_quality", "n/a"] },
          confidence: { type: "number" },
          reason: { type: "string" },
        },
        required: ["id", "action", "confidence", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

function clsfUserMsg(batch, candidateL3s) {
  const cands = candidateL3s.map((c) => `  ${c.handle}${c.name ? ` — ${c.name}` : ""}`).join("\n");
  const items = batch.map((r) => `[${r.id}] (ämber: ${r.bucket})
  title: ${r.title || "?"}
  title_et: ${r.title_et || "?"}
  kirjeldus: ${(r.description || "").slice(0, 400) || "(puudub)"}
  klassifikaator pakkus: L3=${r.proposed_l3 || "-"} nimi=${r.suggest_name || "-"} L2=${r.suggest_l2 || "-"} kindlus=${r.confidence ?? "?"}
  klassifikaatori põhjus: ${r.reason || "-"}`).join("\n\n");
  return `OLEMASOLEVAD L3-KANDIDAADID (target_handle PEAB olema siit):\n${cands}\n\n────────\n\nHINNATAVAD TOOTED:\n\n${items}`;
}

/**
 * judgeClassify — hinda partii classification_review kirjeid kogu-L3-nimekirja vastu.
 * Tagastab { ok, results:[{id,action,...}], usage }. EI kirjuta DB-sse.
 */
export async function judgeClassify(batch, candidateL3s, { apiKey, model = CLSF_JUDGE_MODEL, timeoutMs, retries } = {}) {
  const res = await callJudge({
    apiKey, model, system: CLSF_SYSTEM, user: clsfUserMsg(batch, candidateL3s),
    schema: CLSF_SCHEMA, maxTokens: 6000, timeoutMs, retries,
  });
  if (!res.ok) return res;
  return { ok: true, results: res.parsed.results || [], usage: res.usage };
}

// ──────────────── KOOSKÕLAVÄRAV (deterministlik, prompt-vaba) ────────────────

/**
 * clusterKeyOf — deterministlik klaster-võti tootele (EI sõltu promptist/LLM-ist).
 * Eelistus: vevor_spu (SPU = sama toode, eri variant) → vevor_product_type → normaliseeritud title.
 * Tühja signaali korral → oma singleton (id-põhine) → ei grupeeri valesti kokku.
 */
export function clusterKeyOf(row) {
  const m = row.meta || {};
  if (m.vevor_spu) return "spu:" + m.vevor_spu;
  if (m.vevor_product_type) return "vpt:" + m.vevor_product_type;
  const base = String(row.title || "").toLowerCase()
    .replace(/\b\d+([.,]\d+)?\s*(tier|pack|kg|lbs|mm|cm|m|in|inch|")/g, " ") // variant-tokenid
    .replace(/\d+/g, " ").replace(/[^a-zäöüõ ]/g, " ").replace(/\s+/g, " ").trim();
  return base ? "title:" + base : "id:" + row.id;
}

/** signatureOf — otsuse "pool", mille järgi kooskõla hinnatakse. */
function signatureOf(j) {
  if (j.action === "assign_existing") return "assign:" + (j.target_handle || "?");
  if (j.action === "group") return "group:" + (j.group_key || "?");
  if (j.action === "new_l3") return "new_l3:" + (j.new_l3_name || "?") + "@" + (j.parent_l2_handle || "?");
  return "keep";
}

/**
 * enforceClassifyConsistency — kui sama klastri (vevor_spu jne) tooted said ERINEVAD otsused
 * → kogu klaster → keep + lipp "inconsistent_cluster". Masin EI vali ise poolt (ka mitte enamust).
 * Digest näitab lippu. Sama kood jookseb backfillis ja hookis (HARD RULE #5).
 *
 * Sisend: decisions [{id, cluster_key, judge:{action,...}}]. Muudab kohapeal + tagastab { decisions, flaggedClusters }.
 */
export function enforceClassifyConsistency(decisions) {
  const byCluster = {};
  for (const d of decisions) (byCluster[d.cluster_key] ||= []).push(d);
  const flaggedClusters = [];
  for (const [ck, items] of Object.entries(byCluster)) {
    if (items.length < 2) continue;
    const sigs = new Set(items.map((d) => signatureOf(d.judge)));
    if (sigs.size <= 1) continue; // kõik sama otsus → järjekindel, jäta
    flaggedClusters.push({ cluster_key: ck, count: items.length, signatures: [...sigs] });
    for (const d of items) {
      d.judge = {
        ...d.judge, action: "keep", gate: "inconsistent_cluster",
        judge_action_orig: d.judge.action,
        judge_target_orig: d.judge.target_handle || d.judge.group_key || d.judge.new_l3_name || null,
        reason: `[KOOSKÕLAVÄRAV] klaster ebajärjekindel (${items.length} toodet, ${sigs.size} erinevat otsust) → jääb ämbrisse. ` + (d.judge.reason || ""),
      };
    }
  }
  return { decisions, flaggedClusters };
}
