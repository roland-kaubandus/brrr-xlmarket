#!/usr/bin/env node
/**
 * concept-gate.mjs — KLIENDIKONTSEPTSIOONI-VÄRAV (SSoT, HARD RULE #5: üks moodul, kõik kutsujad).
 *
 * Tarmo 2026-10-09 DUP-värava fix (a)+(b)+(c):
 *   (a) SEMANTILINE KOHTUNIK (Opus) = PEAMINE — otsustab, kas liigutatud tooted kuuluvad TÕESTI
 *       siht-L3-sse (sama KLIENDIKONTSEPTSIOON: sama ostja, sama asi, sama kontekst) või mitte.
 *       Sama tootetüüp ≠ sama kontsept (Dušitrapp vannituba ≠ renn-/kanaläravool õue sissesõidutee).
 *   (b) EESTI MORFOLOOGIA = ODAV EELFILTER — nime-vormide (käänded/mitmus) normaliseerimine, et
 *       leksikaalselt lähedased dubleeringud («Paindvõlliga lihvimismasinad» vs «Painduva võlliga
 *       lihvmasinad») põrkuks ENNE semantilist kutset (odav → ei kuluta Opust ilmselge mitte-dupi peal).
 *   (c) kutsujad: neighbor-execute.mjs (iga liigutuse eel-värav) + classify-chain.mjs (broaden-DUP).
 *
 * LLM = WARN (CLAUDE.md): mittedeterministlik → kõrge kindlus usalda, madal kindlus = ohutu vaikimisi
 * (ÄRA liiguta / jäta allikasse). API-võtit EI logita.
 */

// ───────────────────────── (b) EESTI MORFOLOOGIA — odav leksikaalne eelfilter ─────────────────────────

// Diakriitika-voltimine (õäöü→oaou) + alnum — keele-neutraalne baas.
const DIA = { "õ": "o", "ä": "a", "ö": "o", "ü": "u", "š": "s", "ž": "z" };
function fold(s) {
  return String(s || "").toLowerCase().normalize("NFC")
    .replace(/[õäöüšž]/g, (c) => DIA[c] || c)
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

// Eesti kerge tüvestaja: eemalda pikim teadaolev käände/mitmuse-lõpp, hoia tüvi ≥4 tähte.
// (Pole täielik morfoloogia — eesmärk on near-dup RECALL, mitte täpne lemma; semantiline kohtunik on PEAMINE.)
const SUFFIXES = [
  "idega", "tega", "dega", "idest", "dest", "test", "idele", "dele", "tele", "ides", "des", "tes",
  "iks", "sse", "iga", "ega", "ks", "le", "lt", "st", "na", "ni", "ga", "id", "te", "de",
  "d", "t", "e", "i", "a", "u", "s",
];
function stem(word) {
  for (const suf of SUFFIXES) {
    if (word.length - suf.length >= 4 && word.endsWith(suf)) return word.slice(0, -suf.length);
  }
  return word;
}
export function normalizeEstonian(s) {
  return fold(s).split(" ").filter(Boolean).map(stem).filter((w) => w.length >= 3).sort().join(" ");
}
function stemSet(s) {
  return new Set(fold(s).split(" ").filter(Boolean).map(stem).filter((w) => w.length >= 3));
}
function trigrams(s) {
  const t = fold(s).replace(/ /g, "");
  const g = new Set();
  for (let i = 0; i < t.length - 2; i++) g.add(t.slice(i, i + 3));
  return g;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
/**
 * nimedLeksikaalseltLahedased — (b) ODAV EELFILTER.
 * Tagastab true, kui kaks nime on morfoloogiliselt/leksikaalselt piisavalt lähedased, et SEMANTILINE
 * kohtunik peaks dup-i kontrollima. Lõivud lõdvad (parem üle-flag kui jätta vahele — kohtunik on peamine).
 */
export function nimedLeksikaalseltLahedased(a, b, { stemThr = 0.34, triThr = 0.5 } = {}) {
  const sa = stemSet(a), sb = stemSet(b);
  if (!sa.size || !sb.size) return false;
  const stemJ = jaccard(sa, sb);
  // containment: üks stem-sõna teise prefiks (≥4) — püüab "paindvoll" ⊂ "painduva voll"
  let contain = 0;
  for (const x of sa) for (const y of sb) if (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x))) { contain++; break; }
  const containR = contain / Math.min(sa.size, sb.size);
  const triJ = jaccard(trigrams(a), trigrams(b));
  return stemJ >= stemThr || containR >= 0.5 || triJ >= triThr;
}

// ───────────────────────── (a) SEMANTILINE KOHTUNIK — liigutuse-korrektsus ─────────────────────────

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-opus-4-8"; // struktuuri-mõjutav otsus → kõige võimekam

const MOVE_SYSTEM = `Oled eesti e-kaubanduse TAKSONOOMIA-KOHTUNIK xlmarket.ee jaoks (VEVOR-tooted).
Sulle antakse LIIGUTUS: hulk tooteid liigutati ALLIKAS-L3-st SIHT-L3-sse. Otsusta, kas liigutus on ÕIGE.

OTSUSTAV KRITEERIUM — KLIENDIKONTSEPTSIOON (mitte pelk tootetüüp):
- Kas liigutatud tooted on SAMA KLIENDIKONTSEPTSIOON kui SIHT-L3 olemasolevad tooted?
  (SAMA ostja otsib SAMA asja SAMAS kontekstis/kasutuskohas?)
- Sama tootetüüp EI tähenda automaatselt sama kontseptsiooni. NÄIDE: «Dušitrapp» (vannituba, siledaks
  tehtud vihmvee-äravool õue sissesõiduteel = renn/kanal) → SAMA tüüp (äravool), AGA ERI kontseptsioon
  (vannituba vs õu) → EI kuulu kokku.
- VARIANT-test: kas liigutatud toode ASENDAB siht-L3 toote SAMA tulemusega ostja jaoks? JAH → sama
  kontsept (liigutus OK). EI → eri kontsept (kuulub tagasi allikasse).
- Vaata HETEROGEENSUST: kas OSA liigutatud tooteid kuulub sihti, OSA mitte (segapartii)?

Verdikt üks kolmest:
- "OK_SIHT"        = liigutatud tooted KUULUVAD sihti (sama kliendikontseptsioon) → liigutus jääb.
- "TAGASI_ALLIKAS" = liigutatud tooted EI kuulu sihti (eri kontseptsioon) → kõik tagasi allikasse.
- "OSALINE"        = segapartii → OSA jääb sihti, OSA tagasi allikasse (nimeta indeksid).

kindlus: "korge" | "kesk" | "madal". Kui OSALINE: back_idx = indeksid (0-põhine, liigutatud nimekirjast),
mis lähevad TAGASI allikasse; stay_idx = mis jäävad sihti. Põhjendus: 1-2 lühikest eestikeelset lauset.
Vasta AINULT JSON-skeemis.`;

const MOVE_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pair_id: { type: "string" },
          verdict: { type: "string", enum: ["OK_SIHT", "TAGASI_ALLIKAS", "OSALINE"] },
          kindlus: { type: "string", enum: ["korge", "kesk", "madal"] },
          back_idx: { type: "array", items: { type: "integer" } },
          stay_idx: { type: "array", items: { type: "integer" } },
          pohjus: { type: "string" },
        },
        required: ["pair_id", "verdict", "kindlus", "pohjus"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

function buildPairBlock(p) {
  const moved = (p.movedTitles || []).map((t, i) => `  [${i}] ${t}`).join("\n");
  const exist = (p.targetExistingTitles || []).length
    ? (p.targetExistingTitles).slice(0, 6).map((t) => `  - ${t}`).join("\n")
    : "  (siht oli enne liigutust TÜHI — võrdle ainult nime/domeeni vastu)";
  return `━━━ LIIGUTUS: ${p.pair_id} ━━━
ALLIKAS-L3: «${p.sourceName}»${p.sourceMain ? `  [${p.sourceMain}]` : ""}
SIHT-L3: «${p.targetName}»${p.targetMain ? `  [${p.targetMain}]` : ""}
LIIGUTATUD tooted (olid allikas, nüüd sihis):
${moved}
SIHT-L3 olemasolevad tooted (näide):
${exist}`;
}

/**
 * conceptMoveJudge — (a) PEAMINE semantiline kohtunik. Hindab liigutuste korrektsust kliendikontseptsiooni järgi.
 * pairs: [{ pair_id, sourceName, sourceMain?, targetName, targetMain?, movedTitles[], targetExistingTitles[] }]
 * Tagastab: Map(pair_id → { verdict, kindlus, back_idx, stay_idx, pohjus }). Batch (≤~10 paari/kutse soovitav).
 * apiKey kohustuslik; API-võtit EI logita. Viga → throw (kutsuja otsustab fail-loud vs skip).
 */
export async function conceptMoveJudge({ pairs, apiKey, model = DEFAULT_MODEL, maxTokens = 8000, retries = 4 }) {
  if (!apiKey) throw new Error("concept-gate: ANTHROPIC_API_KEY puudub");
  if (!pairs || !pairs.length) return new Map();
  const user = pairs.map(buildPairBlock).join("\n\n") +
    `\n\nHinda KÕIK ${pairs.length} liigutust. Vasta JSON { results: [...] } — iga paari kohta üks tulemus (pair_id täpselt nagu ülal).`;
  // Proven path (judge.mjs): output_config json_schema + cache_control + anthropic-version 2023-06-01.
  const body = {
    model, max_tokens: maxTokens,
    system: [{ type: "text", text: MOVE_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema: MOVE_SCHEMA } },
  };
  let j, lastErr = "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        lastErr = `API ${res.status}: ${t.slice(0, 200)}`;
        if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < retries) { await new Promise((r) => setTimeout(r, Math.min(30000, 1000 * 2 ** attempt))); continue; }
        throw new Error(`concept-gate ${lastErr}`);
      }
      const cand = await res.json();
      const stop = cand.stop_reason;
      const txt = ((cand.content || []).find((b) => b.type === "text")?.text || "").trim();
      if (stop === "max_tokens") { lastErr = `truncated (max_tokens=${maxTokens})`; if (attempt < retries) { maxTokens = Math.min(16000, maxTokens * 2); body.max_tokens = maxTokens; continue; } }
      // output_config → puhas JSON; parse OTSE. Fallback regex ainult kui otse-parse viskab.
      try { JSON.parse(txt); j = cand; break; }
      catch { const m = txt.replace(/```(?:json)?/gi, "").match(/\{[\s\S]*\}/); if (m) { try { JSON.parse(m[0]); cand.__text = m[0]; j = cand; break; } catch {} } lastErr = `parse fail @len ${txt.length}`; if (attempt < retries) continue; throw new Error(`concept-gate JSON parse: ${txt.slice(0, 200)}`); }
    } catch (e) { lastErr = String(e.message || e).slice(0, 200); if (attempt < retries) { await new Promise((r) => setTimeout(r, 1500)); continue; } throw e; }
  }
  const raw = j.__text || ((j.content || []).find((b) => b.type === "text")?.text || "{}");
  const parsed = JSON.parse(raw);
  const out = new Map();
  for (const r of (parsed.results || [])) {
    out.set(r.pair_id, {
      verdict: r.verdict, kindlus: r.kindlus,
      back_idx: Array.isArray(r.back_idx) ? r.back_idx : [],
      stay_idx: Array.isArray(r.stay_idx) ? r.stay_idx : [],
      pohjus: r.pohjus || "",
    });
  }
  out.__usage = j.usage || null;
  return out;
}

export default { normalizeEstonian, nimedLeksikaalseltLahedased, conceptMoveJudge };
