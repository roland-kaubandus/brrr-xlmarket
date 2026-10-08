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

import { isUsageLimitError, alertUsageLimit, recordSpend } from "./spend-guard.mjs";

const API_URL = "https://api.anthropic.com/v1/messages";
export const SYN_JUDGE_MODEL = "claude-sonnet-5";
export const CLSF_JUDGE_MODEL = "claude-opus-4-8";
export const JUDGE_VERSION = "judge-v1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Üldine Anthropic-kutse json_schema väljundiga + retry (sama muster kui synonym-gen). */
// buildJudgeBody — ÜKS päring-keha-ehitaja, mida kasutavad NII sünkroonne callJudge KUI batch-builderid
// (HARD RULE #5: üks transform, kaks kutsujat). candsBlock (valikuline) = muutumatu kandidaat-list OMA
// cache'itud user-blokis → kordus-kutsel loetakse cache'ist (~10% hinda). Items jäävad cache'imata (muutuvad).
export function buildJudgeBody({ model, system, candsBlock, user, schema, maxTokens = 4000 }) {
  const content = candsBlock
    ? [{ type: "text", text: candsBlock, cache_control: { type: "ephemeral" } }, { type: "text", text: user }]
    : user;
  return {
    model,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
    output_config: { format: { type: "json_schema", schema } },
  };
}

async function callJudge({ apiKey, model, system, candsBlock, user, schema, maxTokens = 4000, timeoutMs = 120000, retries = 5 }) {
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY puudub" };
  const body = buildJudgeBody({ model, system, candsBlock, user, schema, maxTokens });
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
        // 1b: workspace spend-cap / tier usage-limit → KOHE Telegram (üks kord/protsess), ENNE retry-check'i.
        if (isUsageLimitError(t)) { clearTimeout(to); alertUsageLimit(`API ${r.status}: ${t.slice(0, 200)}`, { ctx: "judge" }); return { ok: false, error: `API ${r.status}: ${t.slice(0, 200)}` }; }
        if ((r.status === 429 || r.status === 529 || r.status >= 500) && attempt < retries) {
          clearTimeout(to); await sleep(Math.min(30000, 1000 * 2 ** attempt)); continue;
        }
        clearTimeout(to);
        return { ok: false, error: `API ${r.status}: ${t.slice(0, 200)}` };
      }
      const j = await r.json();
      recordSpend({ model, usage: j.usage });   // 1a: kuu-kulu liider + 80%-alert (jagatud SSoT)
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

/**
 * synConsensus — A1 TOOTMISREEGEL (Tarmo 2026-10-06): sünonüüm → product_synonym AINULT kui
 *   Sonnet-kohtunik OK JA Opus-referents OK. Kõik muu (lahkheli / EBAKINDEL / VALE) → EI kirjutata
 *   (ohutu vaikimisi: EI lähe otsingusse), MITTE inimese järjekorda.
 * Tagastab { write, bucket, status }:
 *   - bucket 'consensus_ok'  → write=true,  status='resolved'    (mõlemad OK)
 *   - bucket 'vale'          → write=false, status='rejected'    (kumbki VALE → kindel müra)
 *   - bucket 'disagreement'  → write=false, status='safe_default'(lahkheli/EBAKINDEL → ohutu vaikimisi)
 */
export function synConsensus(judgeVerdict, refVerdict) {
  if (judgeVerdict === "OK" && refVerdict === "OK") return { write: true, bucket: "consensus_ok", status: "resolved" };
  if (judgeVerdict === "VALE" || refVerdict === "VALE") return { write: false, bucket: "vale", status: "rejected" };
  return { write: false, bucket: "disagreement", status: "safe_default" };
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
  const cands = candidateL3s.map(candLine).join("\n");
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

// ───────────── KLASTRI-TASANDI KOHTUNIK (vastuolu ehituslikult võimatu) ─────────────
//
// Point 3 (Tarmo 2026-10-06): klassifikaatori-kohtunik otsustab KLASTRI tasandil —
// ÜKS otsus kogu klastri kohta (clusterKeyOf järgi), mis rakendatakse KÕIGILE liikmetele.
// Nii on klastri-sisene vastuolu EHITUSLIKULT võimatu (pole enam N otsust, mis lahkneksid).
// Kooskõlavärav (enforceClassifyConsistency) jääb TURVAVÕRGUKS — pärast fan-out'i ei saa ta
// kunagi vallanduda, aga kaitseb juhuks, kui mõni tee hoolimata ehitab per-toode otsuseid.

const CLUSTER_CLSF_SYSTEM = `Oled xlmarket.ee taksonoomia-KOHTUNIK. Sulle antakse KLASTRID — iga klaster on
KOKKU KUULUV grupp tooteid (sama VEVOR SPU / sama tootetüüp / sama normaliseeritud pealkiri),
mis ON JUBA tuvastatud SAMA TOOTENA (variandid: suurus/värv/kogus). Klassifikaator jättis need
ebakindlaks (review / new_l3 / quarantine ämber), + NIMEKIRI olemasolevatest L3-kategooriatest.

🔑 OTSUSTAD KLASTRI KOHTA ÜHE OTSUSE — see rakendatakse KÕIGILE klastri liikmetele korraga.
   Klastri liikmed EI saa minna eri kodudesse (nad on sama toode) → üks kodu kogu klastrile.

Rakenda 9-punkti SISU-reeglit (otsusta toote SISUST — title/spets/kirjeldus — MITTE nimest/tõlkest) ja
reegli-pingerida: EKSKLUSIIVSUS-värav → TÜÜP+DOMEEN → DUP-värav → seotud-tüübid → hübriid → variant/laius.

Iga KLASTRI kohta vali TEGEVUS:
- assign_existing : klaster sobib semantiliselt ÜHTE olemas-L3-sse (anna target_handle nimekirjast). Eelista seda.
- group           : sama kontseptsioon kordub mitmes klastris → märgi ühine group_key (DUP-värav enne new_l3).
- new_l3          : AINULT kui kogu nimekirjas POLE sobivat tüüpi. Sa EI loo seda ise — koostad ETTEPANEKU
                    (new_l3_name eesti keeles + parent_l2_handle + põhjus). Inimene/väravad kinnitavad.
- keep            : tõeliselt ebakindel → klaster jääb ootele (ohutu vaikimisi).

🚪 TUGEVDATUD DUP-VÄRAV (B2, Tarmo 2026-10-06) — new_l3 on VIIMANE abinõu:
   ENNE kui pakud "new_l3", pead TÕESTAMA, et sobivat olemas-L3 EI OLE. Kohustuslik:
   1. Vaata nimekirjast läbi KÕIK semantiliselt lähedased L3-d (sama tüüp võib olla TEISE nimega —
      masintõlge/tootja-nimi eksitab; otsusta SISUST, mitte sõnast).
   2. Täida väli "considered_l3s" = 2-5 kõige lähedasema olemas-L3 handle, mida kaalusid.
   3. Täida "considered_reason" = miks ükski neist EI sobi (lühike eestikeelne lause).
   Kui "considered_l3s" on tühi või mõni loetletud L3 sobiks tegelikult → see EI ole new_l3, vaid
   assign_existing sinna. Üle-pakutud new_l3 (kui kodu juba olemas) = DUP-viga, mida me VÄLDIME.
   (considered_l3s/considered_reason on soovitatav ka assign_existing juures, kui valik oli tihe.)

⚠️ QUARANTINE-REEGEL: kui klaster on quarantine-ämbris, tuvasta ESMALT põhjus:
   - quarantine_cause="uncertainty" → klassifitseerimise ebakindlus → tohid anda assign/new_l3.
   - quarantine_cause="data_quality" → toote-info puudu/katki → tegevus PEAB olema "keep" + märgi põhjus.

RANGED REEGLID:
1. target_handle PEAB olema täpselt nimekirjast (ära leiuta). Sobivat pole → new_l3 või keep.
2. Parem keep kui vale assign — vale paigutus on nähtav ja eksitab ostjat.
3. confidence 0.0-1.0 = kui kindel oled tegevuses kogu klastri kohta.
4. reason = lühike eestikeelne põhjendus (mis tüüp + miks see kodu).
5. cluster_key PEAB olema täpselt see, mis sisendis anti.

Vasta AINULT etteantud JSON-skeemis — ÜKS kirje iga klastri kohta.`;

const CLUSTER_CLSF_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cluster_key: { type: "string" },
          action: { type: "string", enum: ["assign_existing", "group", "new_l3", "keep"] },
          target_handle: { type: "string" },
          group_key: { type: "string" },
          new_l3_name: { type: "string" },
          parent_l2_handle: { type: "string" },
          considered_l3s: { type: "array", items: { type: "string" } },
          considered_reason: { type: "string" },
          quarantine_cause: { type: "string", enum: ["uncertainty", "data_quality", "n/a"] },
          confidence: { type: "number" },
          reason: { type: "string" },
        },
        required: ["cluster_key", "action", "confidence", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

/**
 * clusterize — rühmita toorread klastriteks clusterKeyOf järgi (deterministlik, LLM-vaba).
 * Tagastab [{ cluster_key, items:[row,...] }] — stabiilses järjekorras (suurim klaster ees).
 */
export function clusterize(rows) {
  const by = new Map();
  for (const r of rows) {
    const ck = clusterKeyOf(r);
    if (!by.has(ck)) by.set(ck, []);
    by.get(ck).push(r);
  }
  return [...by.entries()]
    .map(([cluster_key, items]) => ({ cluster_key, items }))
    .sort((a, b) => b.items.length - a.items.length || a.cluster_key.localeCompare(b.cluster_key));
}

// candLine — üks kandidaat-rida. Kui L3-l on l3meta `description` (PIIRIREEGEL, ETAPP 2),
// lisa see → kohtunik loeb reeglit, MITTE ainult nime (HARD RULE #5: üks reegel, kõik ööd).
// description tuleb LIVE DB-st (pipeline-classify-chain buildib candidateL3s'i otse product_category'st),
// seega uus l3meta-reegel jõuab igaöisesse otsustamisse KOHE, ilma rebuild'ita.
export function candLine(c) {
  const base = `  ${c.handle}${c.name ? ` — ${c.name}` : ""}`;
  const d = (c.description || "").trim();
  return d ? `${base}\n     ↳ piir: ${d.slice(0, 400)}` : base;
}

// candsListText — muutumatu kandidaat-L3-list (cache'itav blokk). Sama tekst judge + ref jaoks.
export function candsListText(candidateL3s) {
  const cands = candidateL3s.map(candLine).join("\n");
  return `OLEMASOLEVAD L3-KANDIDAADID (target_handle PEAB olema siit; "↳ piir" = piirireegel, järgi seda):\n${cands}`;
}

function clusterItemsText(clusters) {
  const blocks = clusters.map((cl) => {
    const rep = cl.items[0];
    const buckets = [...new Set(cl.items.map((i) => i.bucket).filter(Boolean))].join(", ") || "?";
    const titles = [...new Set(cl.items.map((i) => i.title).filter(Boolean))].slice(0, 4);
    const proposed = [...new Set(cl.items.map((i) => i.proposed_l3).filter(Boolean))].join(", ") || "-";
    const names = [...new Set(cl.items.map((i) => i.suggest_name).filter(Boolean))].join(", ") || "-";
    const l2s = [...new Set(cl.items.map((i) => i.suggest_l2).filter(Boolean))].join(", ") || "-";
    return `KLASTER ${cl.cluster_key}  (liikmeid: ${cl.items.length}, ämbrid: ${buckets})
  esindaja title: ${rep.title || "?"}
  esindaja title_et: ${rep.title_et || "?"}
  liikmete pealkirjad: ${titles.join(" · ") || "?"}
  esindaja kirjeldus: ${(rep.description || "").slice(0, 400) || "(puudub)"}
  klassifikaator pakkus: L3=${proposed} nimi=${names} L2=${l2s}`;
  }).join("\n\n");
  return `HINNATAVAD KLASTRID (üks otsus KLASTRI kohta):\n\n${blocks}`;
}

function clusterUserMsg(clusters, candidateL3s) {
  const cands = candidateL3s.map(candLine).join("\n");
  const blocks = clusters.map((cl) => {
    const rep = cl.items[0];
    const buckets = [...new Set(cl.items.map((i) => i.bucket).filter(Boolean))].join(", ") || "?";
    const titles = [...new Set(cl.items.map((i) => i.title).filter(Boolean))].slice(0, 4);
    const proposed = [...new Set(cl.items.map((i) => i.proposed_l3).filter(Boolean))].join(", ") || "-";
    const names = [...new Set(cl.items.map((i) => i.suggest_name).filter(Boolean))].join(", ") || "-";
    const l2s = [...new Set(cl.items.map((i) => i.suggest_l2).filter(Boolean))].join(", ") || "-";
    return `KLASTER ${cl.cluster_key}  (liikmeid: ${cl.items.length}, ämbrid: ${buckets})
  esindaja title: ${rep.title || "?"}
  esindaja title_et: ${rep.title_et || "?"}
  liikmete pealkirjad: ${titles.join(" · ") || "?"}
  esindaja kirjeldus: ${(rep.description || "").slice(0, 400) || "(puudub)"}
  klassifikaator pakkus: L3=${proposed} nimi=${names} L2=${l2s}`;
  }).join("\n\n");
  return `OLEMASOLEVAD L3-KANDIDAADID (target_handle PEAB olema siit):\n${cands}\n\n────────\n\nHINNATAVAD KLASTRID (üks otsus KLASTRI kohta):\n\n${blocks}`;
}

/**
 * judgeClassifyClusters — hinda KLASTREID (mitte üksik-tooteid). Üks otsus iga klastri kohta.
 * Sisend: clusters [{cluster_key, items:[row]}] (clusterize väljund) + candidateL3s.
 * Tagastab { ok, results:[{cluster_key, action, ...}], usage }. EI kirjuta DB-sse.
 */
export async function judgeClassifyClusters(clusters, candidateL3s, { apiKey, model = CLSF_JUDGE_MODEL, timeoutMs, retries } = {}) {
  const res = await callJudge({
    apiKey, model, system: CLUSTER_CLSF_SYSTEM, candsBlock: candsListText(candidateL3s),
    user: clusterItemsText(clusters), schema: CLUSTER_CLSF_SCHEMA, maxTokens: 6000, timeoutMs, retries,
  });
  if (!res.ok) return res;
  return { ok: true, results: res.parsed.results || [], usage: res.usage };
}

// buildClusterJudgeBody — batch-päring-keha klastri-kohtunikule (sama prompt+caching kui sünkroonne).
export function buildClusterJudgeBody(clusters, candidateL3s, { model = CLSF_JUDGE_MODEL, maxTokens = 6000 } = {}) {
  return buildJudgeBody({ model, system: CLUSTER_CLSF_SYSTEM, candsBlock: candsListText(candidateL3s),
    user: clusterItemsText(clusters), schema: CLUSTER_CLSF_SCHEMA, maxTokens });
}

/**
 * fanoutClusterDecisions — laota ÜKS klastri-otsus KÕIGILE liikmetele → per-toode otsused.
 * Nii on klastri-sisene vastuolu EHITUSLIKULT võimatu (kõik liikmed = sama signatuur).
 * Sisend: clusters (clusterize) + results (judgeClassifyClusters). Tagastab [{id, cluster_key, title, bucket, judge:{...}}].
 * Klaster, millele kohtunik otsust ei andnud → ohutu vaikimisi "keep" (ei kao vaikselt).
 */
export function fanoutClusterDecisions(clusters, results) {
  const byKey = new Map(results.map((r) => [r.cluster_key, r]));
  const out = [];
  for (const cl of clusters) {
    const v = byKey.get(cl.cluster_key);
    const judge = v
      ? { action: v.action, target_handle: v.target_handle || null, group_key: v.group_key || null,
          new_l3_name: v.new_l3_name || null, parent_l2_handle: v.parent_l2_handle || null,
          considered_l3s: v.considered_l3s || [], considered_reason: v.considered_reason || "",
          quarantine_cause: v.quarantine_cause || "n/a", confidence: v.confidence ?? 0,
          reason: v.reason || "", cluster_level: true }
      : { action: "keep", confidence: 0, cluster_level: true, gate: "no_cluster_verdict",
          reason: "[OHUTU VAIKIMISI] kohtunik ei tagastanud klastrile otsust → jääb ootele." };
    for (const row of cl.items) {
      out.push({ id: row.id, cluster_key: cl.cluster_key, title: row.title, bucket: row.bucket, judge: { ...judge } });
    }
  }
  return out;
}

// ═══════════════ 3. REFERENTS-HINDAJA (Opus, PIME) — kalibreerimine ILMA inimeseta ═══════════════
//
// Point 1 (Tarmo 2026-10-06, HARD RULE #6): kalibreerimine tehakse AUTOMAATSELT.
// Opus-referents hindab SAMA valimi SÕLTUMATULT ja PIMESI (ei näe Sonneti/kohtuniku vastuseid),
// mängides inimese (Tarmo) rolli kalibreerimises. actor='opus-reference' calibration_rating-tabelis.
//
//   SÜNONÜÜM: referents = judgeSynonyms Opus-mudeliga. Sisend (synUserMsg) EI sisalda kohtuniku
//             verdikti → juba pime. Sama kriteerium ("kas klient ootaks seda toodet?").
//   KLASSIFIKAATOR: eraldi PIME hindaja (allpool) — valib SÕLTUMATULT kodu kandidaat-nimekirjast,
//             kriteerium "Kas see toode kuulub sellesse kategooriasse?". EI näe kohtuniku target_handle't.

// B1 (Tarmo 2026-10-06): referents peab olema kohtunikust SÕLTUMATU mudel.
//   SÜNONÜÜM: kohtunik = Sonnet → referents = Opus (REF_MODEL_SYN).
//   KLASSIFIKAATOR: kohtunik = Opus → referents PEAB olema muu kui Opus → Sonnet-5 (REF_MODEL_CLSF).
//   (Kaalutud valikud: Sonnet-5 = sõltumatu + tugev + odavam ✓ valitud; Fable-5 = kõige võimekam aga
//    Opusist kallim + erinev API; Haiku-4.5 = sõltumatu aga liiga nõrk tõsiseltvõetavaks referentsiks.)
export const REF_MODEL = "claude-opus-4-8";       // tagasiühilduvus (sünonüümi-referents)
export const REF_MODEL_SYN = "claude-opus-4-8";   // sünonüüm: kohtunik Sonnet → referents Opus
export const REF_MODEL_CLSF = "claude-sonnet-5";  // klassifikaator: kohtunik Opus → referents Sonnet-5 (sõltumatu)

const REF_CLSF_SYSTEM = `Oled xlmarket.ee taksonoomia SÕLTUMATU REFERENTS-HINDAJA. Sulle antakse tooteid +
NIMEKIRI olemasolevatest L3-kategooriatest. Sa EI näe ühegi teise mudeli ega kohtuniku otsust — hindad PIMESI.

Sinu AINUS kriteerium iga toote kohta:
**"Kas see toode KUULUB mõnda olemasolevasse kategooriasse — ja kui, siis MILLISESSE?"**

Otsusta toote SISUST (title/title_et/kirjeldus) — MITTE tootja-nimest ega masintõlkest.

Vali iga toote kohta TEGEVUS:
- assign_existing : toode KUULUB selgelt ÜHTE olemas-L3-sse → anna target_handle (TÄPSELT nimekirjast).
- new_l3          : ükski olemas-L3 ei sobi — vajaks UUT kategooriat (sa ei nimeta seda, märgi ainult vajadus).
- keep            : ei suuda kindlalt otsustada / toote-info puudulik → jääb ootele (ohutu vaikimisi).

RANGE: parem "keep" kui vale "assign_existing". Vale kodu on nähtav ja eksitab ostjat.
target_handle PEAB olema täpselt nimekirjast. reason = üks lühike eestikeelne lause.

Vasta AINULT etteantud JSON-skeemis.`;

const REF_CLSF_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          action: { type: "string", enum: ["assign_existing", "new_l3", "keep"] },
          target_handle: { type: "string" },
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

// PIME referents: EI sisalda kohtuniku action/target/reason ega klassifikaatori proposed_l3 (et mitte ankurdada).
function refItemsText(batch) {
  const items = batch.map((r) => `[${r.id}]
  title: ${r.title || "?"}
  title_et: ${r.title_et || "?"}
  kirjeldus: ${(r.description || "").slice(0, 400) || "(puudub)"}`).join("\n\n");
  return `HINNATAVAD TOOTED (otsusta sõltumatult, kas kuulub mõnda kategooriasse):\n\n${items}`;
}
function refClsfUserMsg(batch, candidateL3s) {
  return `${candsListText(candidateL3s)}\n\n────────\n\n${refItemsText(batch)}`;
}
// klastri-batch-rea ehitaja (sama kui rateClassifyReferenceClusters sees) → jagatud sünkroon + batch.
export function clusterRefBatch(clusters) {
  return clusters.map((cl) => {
    const rep = cl.items[0];
    const memberTitles = [...new Set(cl.items.map((i) => i.title).filter(Boolean))].slice(0, 3);
    const desc = (rep.description || "").slice(0, 400) || "(puudub)";
    const widthNote = memberTitles.length > 1 ? `\n(sama toote variandid: ${memberTitles.join(" · ")})` : "";
    return { id: cl.cluster_key, title: rep.title, title_et: rep.title_et, description: desc + widthNote };
  });
}
// buildClusterRefBody — batch-päring-keha klastri-referentsile (sama prompt+caching kui sünkroonne).
export function buildClusterRefBody(clusters, candidateL3s, { model = REF_MODEL_CLSF, maxTokens = 6000 } = {}) {
  return buildJudgeBody({ model, system: REF_CLSF_SYSTEM, candsBlock: candsListText(candidateL3s),
    user: refItemsText(clusterRefBatch(clusters)), schema: REF_CLSF_SCHEMA, maxTokens });
}

/**
 * rateClassifyReference — PIME Opus-referents klassifikaatori-valimile. Valib kodu SÕLTUMATULT
 * (ei näe kohtuniku otsust ega klassifikaatori ettepanekut → ankurdamist pole).
 * Tagastab { ok, results:[{id,action,target_handle,confidence,reason}], usage }. EI kirjuta DB-sse.
 */
export async function rateClassifyReference(batch, candidateL3s, { apiKey, model = REF_MODEL, timeoutMs, retries } = {}) {
  const res = await callJudge({
    apiKey, model, system: REF_CLSF_SYSTEM, candsBlock: candsListText(candidateL3s),
    user: refItemsText(batch), schema: REF_CLSF_SCHEMA, maxTokens: 6000, timeoutMs, retries,
  });
  if (!res.ok) return res;
  return { ok: true, results: res.parsed.results || [], usage: res.usage };
}

/**
 * rateClassifyReferenceClusters — KLASTRI-tasandi pime Sonnet-5 referents (vastab judgeClassifyClusters'ile).
 * Kohtunik otsustab klastri kohta ÜHE otsuse → referents peab samuti olema klastri-tasandil (mitte N per-toode),
 * et §2c ahelas saaks võrrelda sama granulaarsust (voteKey). Ehitab ühe esindaja-rea klastri kohta:
 *   id = cluster_key (→ mapitav tagasi), title/title_et/kirjeldus = esindaja + kuni 3 liikme pealkirja (klastri laius).
 * Sisend: clusters [{cluster_key, items:[row]}] (clusterize väljund) + candidateL3s.
 * Tagastab { ok, results:[{cluster_key, action, target_handle, confidence, reason}], usage }. EI kirjuta DB-sse.
 */
export async function rateClassifyReferenceClusters(clusters, candidateL3s, { apiKey, model = REF_MODEL_CLSF, timeoutMs, retries } = {}) {
  // üks esindaja-rida klastri kohta; id = cluster_key (pime referents ei tea, et see on klaster)
  const batch = clusters.map((cl) => {
    const rep = cl.items[0];
    const memberTitles = [...new Set(cl.items.map((i) => i.title).filter(Boolean))].slice(0, 3);
    const desc = (rep.description || "").slice(0, 400) || "(puudub)";
    // lisa liikmete pealkirjad kirjeldusse → referents näeb klastri laiust (variandid), mitte ainult esindajat
    const widthNote = memberTitles.length > 1 ? `\n(sama toote variandid: ${memberTitles.join(" · ")})` : "";
    return { id: cl.cluster_key, title: rep.title, title_et: rep.title_et, description: desc + widthNote };
  });
  const res = await rateClassifyReference(batch, candidateL3s, { apiKey, model, timeoutMs, retries });
  if (!res.ok) return res;
  // map id (= cluster_key) tagasi
  const results = (res.results || []).map((r) => ({
    cluster_key: r.id, action: r.action, target_handle: r.target_handle || null,
    confidence: r.confidence, reason: r.reason,
  }));
  return { ok: true, results, usage: res.usage };
}

// ──────────────── VÕTME-TERVIKLUS + REKURSIIVNE POOLITAMINE (SSoT — audit + öine [4] hook) ────────────────
// Tarmo 2026-10-07 (pärast kataloogi-auditi 47-klastri auku + j100 fantoom-ülekirjutust):
//   batch/sünkr LLM-väljund EI tohi klastreid vaikselt kaotada ega võõraid võtmeid neelata.
//   (a) väljundi võtmed == sisendi võtmed  (b) võõras võti → viska + loenda  (c) puuduv/max_tokens → POOLITA & korda
//   (d) max sügavus → FAIL-LOUD (unresolved → pending + Telegram). HARD RULE #5: SAMA kood audit + [4] hook.
function _chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

/**
 * ingestClusterResults — kontrolli LLM-väljundi võtmed sisendi vastu (PUHAS, I/O-ta → testitav).
 * parsed: [{cluster_key|id, action, ...}] (judge kasutab cluster_key, ref id); expectedKeys: Set|array.
 * Tagastab { byKey:Map(ESIMENE esinemine), foreign:[võõrad — EI ingestita], duplicates:[{key,conflict,first,second}], missing:[] }.
 * Dup → säilita ESIMENE + liputa konflikt (action/target erineb; vaikne "viimane võidab" = kadu). Võõras võti → EI byKey'sse.
 */
export function ingestClusterResults(parsed, expectedKeys) {
  const expected = expectedKeys instanceof Set ? expectedKeys : new Set(expectedKeys);
  const byKey = new Map(); const foreign = []; const duplicates = [];
  for (const v of parsed || []) {
    const k = v?.cluster_key ?? v?.id;
    if (k == null) continue;
    if (!expected.has(k)) { foreign.push({ key: k, action: v.action || null, target: v.target_handle || null }); continue; }
    if (byKey.has(k)) {
      const p = byKey.get(k);
      const conflict = (p.action !== v.action) || ((p.target_handle || null) !== (v.target_handle || null));
      duplicates.push({ key: k, conflict, kept: "first", first: { action: p.action, target: p.target_handle || null }, second: { action: v.action, target: v.target_handle || null } });
      continue;
    }
    byKey.set(k, v);
  }
  const missing = [...expected].filter((k) => !byKey.has(k));
  return { byKey, foreign, duplicates, missing };
}

/**
 * validateTargetHandles — valideeri iga otsuse target_handle LIVE-taksonoomia vastu (PUHAS, I/O-ta → testitav).
 * HARD RULE #5 juurpõhjuse-parandus (Tarmo 2026-10-07): kohtuniku/referentsi/Fable target_handle
 * võib viidata STALE/olematule handle'ile (kandidaat-nimekiri = SSoT-snapshot, mis lagunenud live-DB-st).
 * SAMA kontroll audit-tees (resolveJudgeBatch) JA öises [4] hookis (resolveClustersSyncVerified) — üks transform.
 *
 * Reegel (ainult action='assign_existing', mis annab target_handle):
 *   (1) target_handle ∈ liveHandleSet            → OK (kehtiv).
 *   (2) olematu handle → leia handle NIMI (handleToName; kandidaat-nimekirjast) → nameToHandles[name]:
 *         TÄPSELT ÜKS live-vaste → paranda target_handle + logi 'corrected'.
 *   (3) muidu (handle puudub / nime ei leia / 0 VÕI mitu nimevastet) → otsus KEHTETU:
 *         action='keep' + invalid_handle=true + logi 'invalid'. Klaster → review-bucket (otsuseta,
 *         OHUTU VAIKIMISI — MITTE kodutu toode). Digesti loendur: 'kehtetu handle: N'.
 *
 * byKey: Map(cluster_key → decision). Muudab otsust KOHAPEAL (target_handle/action/invalid_handle).
 * ctx: { liveHandleSet:Set<handle>, handleToName:Map<handle,name>, nameToHandles:Map<name,[handle]> }.
 * ctx puudub → kontroll vahele (kutsuja vastutab; tagastab tühjad massiivid).
 * Tagastab { corrected:[{key,from,to,name}], invalid:[{key,handle,reason}] }.
 */
export function validateTargetHandles(byKey, ctx) {
  const { liveHandleSet, handleToName, nameToHandles } = ctx || {};
  const corrected = []; const invalid = [];
  if (!liveHandleSet) return { corrected, invalid };
  for (const [key, d] of byKey) {
    if (!d || d.action !== "assign_existing") continue;   // target_handle't annab ainult assign_existing
    const h = d.target_handle || null;
    if (h && liveHandleSet.has(h)) continue;              // (1) kehtiv live-handle
    const name = h ? (handleToName?.get(h) || null) : null;
    const cands = name ? (nameToHandles?.get(name) || []) : [];
    if (cands.length === 1) {                             // (2) ühene nimevaste → paranda
      corrected.push({ key, from: h, to: cands[0], name });
      d.target_handle = cands[0];
      continue;
    }
    // (3) kehtetu → otsus KEHTETU → keep (ohutu vaikimisi, review-bucket)
    const reason = !h ? "target_handle puudub"
      : !name ? "handle live-taksonoomias puudub + nime kandidaadist ei leia"
      : cands.length === 0 ? `nimevaste puudub (nimi='${name}')`
      : `nimevaste mitmene (${cands.length}× '${name}')`;
    invalid.push({ key, handle: h, reason });
    d.action = "keep"; d.target_handle = null; d.invalid_handle = true;
  }
  return { corrected, invalid };
}

/**
 * resolveJudgeBatch — BATCH-tee (audit): submit kõik chunk'id ÜHEKS batch'iks → ingest+kontrolli iga chunk →
 * puuduvad VÕI stop_reason=max_tokens → POOLITA (chunk/2) & korda järgmise batch-tasemena, kuni kõik lahendatud VÕI maxDepth → FAIL-LOUD.
 * role: "judge" | "ref". runChunk injekteeritud (judge.mjs ei sõltu content-batch'ist). onLog={log,tick} valikuline.
 * Tagastab { byKey, foreign, duplicates, unresolved, reqFail, levels }.
 */
export async function resolveJudgeBatch({ clusters, candidateL3s, apiKey, runChunk, chunkSize = 40, maxTokens = 14000, model, role = "judge", maxDepth = 3, onLog, validate } = {}) {
  const build = role === "ref" ? buildClusterRefBody : buildClusterJudgeBody;
  const mdl = model || (role === "ref" ? REF_MODEL_CLSF : CLSF_JUDGE_MODEL);
  const byKey = new Map(); const foreign = []; const duplicates = []; const unresolved = [];
  let reqFail = 0, levels = 0;
  async function level(cls, size, depth) {
    levels++;
    const groups = _chunk(cls, size);
    const reqs = groups.map((g, i) => ({ custom_id: `${role}_${depth}_${i}`, params: build(g, candidateL3s, { model: mdl, maxTokens }) }));
    const batch = await runChunk(reqs, apiKey, { onTick: onLog?.tick });
    const byCid = new Map(batch.results.map((r) => [r.custom_id, r]));
    const retry = [];
    for (let i = 0; i < groups.length; i++) {
      const r = byCid.get(`${role}_${depth}_${i}`);
      const expected = new Set(groups[i].map((c) => c.cluster_key));
      if (!r || !r.ok) {
        reqFail++;
        if (depth < maxDepth && size > 1) retry.push(...groups[i]);
        else unresolved.push(...groups[i].map((c) => c.cluster_key));
        continue;
      }
      onLog?.usage?.(mdl, r.message?.usage);   // kulu-jälgimine kutsujale (audit addUsage; ka poolitus-tasemed)
      const txt = (r.message?.content || []).find((b) => b.type === "text")?.text || "{}";
      let parsed = []; try { parsed = JSON.parse(txt).results || []; } catch {}
      const ing = ingestClusterResults(parsed, expected);
      for (const [k, v] of ing.byKey) if (!byKey.has(k)) byKey.set(k, v);
      foreign.push(...ing.foreign); duplicates.push(...ing.duplicates);
      const trunc = r.message?.stop_reason === "max_tokens";
      if (ing.missing.length) {
        if (depth < maxDepth && size > 1) { retry.push(...groups[i].filter((c) => ing.missing.includes(c.cluster_key))); onLog?.log?.(`[${role}] d${depth}_${i} puudu ${ing.missing.length}${trunc ? " (max_tokens)" : ""} → poolita`); }
        else unresolved.push(...ing.missing);
      }
    }
    if (retry.length) { onLog?.log?.(`[${role}] tase ${depth}: ${retry.length} klastrit kordusse (chunk ${size}→${Math.max(1, Math.floor(size / 2))})`); await level(retry, Math.max(1, Math.floor(size / 2)), depth + 1); }
  }
  await level(clusters, chunkSize, 0);
  if (unresolved.length) onLog?.log?.(`🛑 FAIL-LOUD [${role}]: ${unresolved.length} klastrit lahendamata pärast ${maxDepth} taset`);
  // JUURPÕHJUSE-PARANDUS (HARD RULE #5): valideeri target_handle live-taksonoomia vastu VASTUVÕTMISEL
  const vh = validateTargetHandles(byKey, validate);
  if (vh.corrected.length) onLog?.log?.(`[${role}] handle-triiv parandatud (nimevaste): ${vh.corrected.length}`);
  if (vh.invalid.length) onLog?.log?.(`🔴 [${role}] kehtetu handle: ${vh.invalid.length} → otsus kehtetu (keep/review)`);
  return { byKey, foreign, duplicates, unresolved, reqFail, levels, corrected: vh.corrected, invalid: vh.invalid };
}

/**
 * resolveClustersSyncVerified — SÜNKR-tee (öine [4] hook): kutsu callFn chunk-kaupa, kontrolli võtmed,
 * puuduvad → POOLITA & korda kuni maxDepth → unresolved (pending). callFn(clusters) → { ok, results, error }
 * (judgeClassifyClusters | rateClassifyReferenceClusters). callFn kukub (krediit/API) → ok=false → kutsuja degrade.
 * Tagastab { ok, byKey, foreign, duplicates, unresolved, firstError }.
 */
export async function resolveClustersSyncVerified(clusters, { callFn, chunkSize = 12, maxDepth = 3, onLog, validate } = {}) {
  const byKey = new Map(); const foreign = []; const duplicates = []; const unresolved = [];
  let firstError = null;
  async function level(cls, size, depth) {
    for (const g of _chunk(cls, size)) {
      const expected = new Set(g.map((c) => c.cluster_key));
      const res = await callFn(g);
      if (!res.ok) { if (!firstError) firstError = res.error || "callFn ei õnnestunud"; return false; }
      const ing = ingestClusterResults(res.results || [], expected);
      for (const [k, v] of ing.byKey) if (!byKey.has(k)) byKey.set(k, v);
      foreign.push(...ing.foreign); duplicates.push(...ing.duplicates);
      if (ing.missing.length) {
        if (depth < maxDepth && size > 1) { const m = g.filter((c) => ing.missing.includes(c.cluster_key)); onLog?.(`puudu ${ing.missing.length} → poolita (${size}→${Math.max(1, Math.floor(size / 2))})`); if (!(await level(m, Math.max(1, Math.floor(size / 2)), depth + 1))) return false; }
        else unresolved.push(...ing.missing);
      }
    }
    return true;
  }
  const ok = await level(clusters, chunkSize, 0);
  if (unresolved.length) onLog?.(`🛑 FAIL-LOUD: ${unresolved.length} klastrit lahendamata (pending)`);
  // JUURPÕHJUSE-PARANDUS (HARD RULE #5): valideeri target_handle live-taksonoomia vastu VASTUVÕTMISEL
  const vh = validateTargetHandles(byKey, validate);
  if (vh.corrected.length) onLog?.(`handle-triiv parandatud (nimevaste): ${vh.corrected.length}`);
  if (vh.invalid.length) onLog?.(`🔴 kehtetu handle: ${vh.invalid.length} → otsus kehtetu (keep/review)`);
  return { ok: ok && !firstError, byKey, foreign, duplicates, unresolved, firstError, corrected: vh.corrected, invalid: vh.invalid };
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
