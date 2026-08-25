#!/usr/bin/env node
// content-gen.mjs — SISU-GENERAATOR transform (HARD RULE #5 SSoT: üks transform, kaks kutsujat).
//
// EESMÄRK: EN master (rich_description / title / specs / selling-bullets) → NATIIV ET-SEO sisu.
//   MITTE tõlge-tõlkest (vana juuni-ET oli tõlge VEVOR-i masintõlkest). Läheme tagasi ORIGINAAL
//   EN-allikani ja KOMPONEERIME loomuliku eesti e-poe teksti. Kus EN-rich puudub (~4783 toodet),
//   komponeerime struktuurist (title+specs+bullets) — ei tõlgi olematut/junki.
//
// GLOSSARY: backend/src/data/glossary.yaml (185 kirjet) → term-blokk promptis (prompt-cached).
//   Adherence (longest-match-first) EI jõustu promptis — jõustub eraldi MÕÕTJAS (glossary-adherence.mjs).
//
// KUTSUJAD (HARD RULE #5):
//   (a) backfill-runner  — kogu korpus üks kord   (scripts/content-gen-run.mjs --all)
//   (b) pipeline-hook    — öine delta, sama transform (import-pipeline.sh uus samm, hiljem)
// Sama kood → backfill ja hook ei lahkne kunagi.

import fs from 'node:fs';

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5';

// ---------------------------------------------------------------------------
// 1. GLOSSARY LAADIMINE (miniparser — yaml-libi pole; formaat on lame + ennustatav)
// ---------------------------------------------------------------------------
export function loadGlossary(yamlPath) {
  const raw = fs.readFileSync(yamlPath, 'utf8');
  const lines = raw.split('\n');
  const entries = [];
  let cur = null;
  const flush = () => { if (cur && cur.en && cur.et) entries.push(cur); cur = null; };
  for (const line of lines) {
    const trimmed = line.replace(/\s+#.*$/, ''); // eemalda rea-lõpu kommentaar
    const mEn = trimmed.match(/^\s*-\s+en:\s*"(.*)"\s*$/);
    if (mEn) { flush(); cur = { en: mEn[1], et: null, aliases: [], status: null, freq: 0 }; continue; }
    if (!cur) continue;
    const mEt = trimmed.match(/^\s+et:\s*"(.*)"\s*$/);
    if (mEt) { cur.et = mEt[1]; continue; }
    const mStatus = trimmed.match(/^\s+status:\s*(\w+)/);
    if (mStatus) { cur.status = mStatus[1]; continue; }
    const mFreq = trimmed.match(/^\s+freq:\s*(\d+)/);
    if (mFreq) { cur.freq = parseInt(mFreq[1], 10); continue; }
    const mAlias = trimmed.match(/^\s+aliases:\s*\[(.*)\]/);
    if (mAlias) {
      cur.aliases = mAlias[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      continue;
    }
  }
  flush();
  return entries;
}

// Ehita promptis-kasutatav term-blokk + adherence-mõõtja jaoks longest-match-first nimekiri.
export function buildGlossaryAssets(entries) {
  // Prompt-blokk: "EN (/ alias) → ET" read. Ainult locked (defer freq=0 → ei esine korpuses).
  const locked = entries.filter(e => e.status === 'locked');
  const termBlock = locked
    .sort((a, b) => b.freq - a.freq)
    .map(e => {
      const ens = [e.en, ...e.aliases];
      return `${ens.join(' / ')} → ${e.et}`;
    })
    .join('\n');

  // Adherence match-nimekiri: KÕIK EN-vormid (en+aliases), sorted PIKKUSE järgi kahanevalt
  // (longest-match-first — "hardware mounting" enne "hardware").
  const matchList = [];
  for (const e of entries) {
    for (const enForm of [e.en, ...e.aliases]) {
      matchList.push({ en: enForm, et: e.et, status: e.status });
    }
  }
  matchList.sort((a, b) => b.en.length - a.en.length);
  return { termBlock, matchList, lockedCount: locked.length };
}

// ---------------------------------------------------------------------------
// 2. PROMPTID
// ---------------------------------------------------------------------------
function systemPrompt(termBlock) {
  return `Oled eesti e-kaubanduse sisukirjutaja (SEO-copywriter) xlmarket.ee tööstus- ja kaubandustoodete jaoks.

SINU TÖÖ EI OLE TÕLKIMINE. Sa LOOD loomuliku, müüva eestikeelse tootesisu, kasutades ingliskeelset lähteinfot FAKTIDE allikana. Kirjuta nii, nagu eesti e-pood ise kirjutaks — mitte masintõlke maiguga, mitte sõna-sõnalt.

VÄLJUND: ainult struktureeritud JSON skeemi järgi. Ei mingit lisateksti.

== STIIL (natiiv ET-SEO) ==
- Loomulik, ladus eesti keel. Lühikesed selged laused. Aktiivne kõneviis.
- SEO: too olulisimad omadused (materjal, mõõt, kasutusala) teksti algusesse loomulikult, ilma märksõna-toppimiseta.
- Tootenimetused mitmuses kui loomulik. Väldi kantseliiti ja liialdusi ("parim maailmas").
- title_et: selge müügipealkiri, ~50-70 tähemärki, olulisim omadus/mõõt sees, ILMA brändi-prefiksita, ILMA märksõna-jadata.
- description_et: lühike meta-kirjeldus SEO jaoks, ~140-160 tähemärki, üks-kaks lauset.
- sanitized_rich_description_et: PUHAS semantiline HTML (<h3>, <p>, <ul><li>), ~120-300 sõna, loomulik ET-SEO proosa. ÄRA kopeeri lähte-HTML struktuuri/klasse — kirjuta VÄRSKE puhas HTML. Kui lähtes on tehnilisi fakte, esita need selgelt (nt <ul> spetsi-loend).
- selling_points_et: 3-5 lühikest kasu-punkti (mitte lauset kordav description'iga).

== ÄRA TÕLGI (jäta TÄPSELT originaali) ==
- Brändid: VEVOR, Powermat, XLMarket, HoReCa, B2B, ATV, UTV, GPS, USB, LED, LCD, PVC, ABS, EU, CE
- Mudelikoodid, artiklinumbrid, SKU-d
- KÕIK numbrid + mõõtühikud TÄPSELT (70L→70L, 230V→230V, "170 cm"→"170 cm", MITTE "170 m")
- Ühikud: mm, cm, m, km, kg, g, L, ml, W, kW, HP, V, A, Hz, RPM, PSI, bar, °C, °F, Nm

== GLOSSARY (kohustuslikud kanoonilised ET-vasted — kasuta TÄPSELT neid termineid) ==
Kui lähtetekstis esineb vasakpoolne EN-mõiste (või selle alias), kasuta ALATI parempoolset ET-terminit:
${termBlock}

== ÄRA AJA MATERJALE SEGI (semantiline täpsus — need on ERI omadused) ==
- Carbon Steel = süsinikteras (EI ole roostevaba ega korrosioonikindel — süsinikteras roostetab; ära kirjuta "korrosioonikindel", kui lähtes on "carbon steel")
- Stainless Steel = roostevaba teras (korrosioonikindel)
- Galvanized / galvanised = tsingitud (pinnakate, mitte materjal ise)
- Powder-coated = pulbervärvitud (pinnakate)
Süsinikteras ≠ roostevaba: ära lisa omadusi, mida lähtetekst ei kinnita.

== KUI LÄHTE-RICH PUUDUB (compose-režiim) ==
Kui sulle antakse ainult title + spetsid + lühikirjeldus (pikk lähte-tekst puudub), KOMPONEERI sisu nendest faktidest. ÄRA leiuta fakte, mida pole. Kirjuta lühem aga korrektne tekst.

== ALLIKA-QC (FLAG-ONLY) ==
Kui märkad lähtes ilmseid vigu / MT-artefakte / katkist sisu, kirjuta lühike märge qc_notes listi. ÄRA paranda numbreid/koode/mõõte.`;
}

// Junk/õhuke-allika tuvastus: rich puudub VÕI liiga lühike VÕI CSS-junk.
export function detectSourceMode(rich) {
  const r = (rich || '').trim();
  if (r.length < 40) return 'composed';                 // puudub/õhuke → komponeeri struktuurist
  // CSS-junk: palju stiili-deklaratsioone, vähe päris-teksti
  const cssHits = (r.match(/\{[^}]*(?:background|font-|margin:|padding:|px;|color:)/g) || []).length;
  const textLen = r.replace(/<[^>]+>/g, '').replace(/\{[^}]*\}/g, '').trim().length;
  if (cssHits > 5 && textLen < 200) return 'composed';
  return 'rich';
}

function stripBrandBullets(sanitizedDesc, title) {
  // sanitized_description algab vana (VEVOR-prefiksiga) title'iga, siis <br>-eraldatud bullets.
  // Võta bullets (osa peale esimest <br>), jäta title-kordus välja.
  if (!sanitizedDesc) return [];
  const parts = sanitizedDesc.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
  // esimene osa = title-kordus → viska ära
  return parts.slice(1).filter(p => p.length > 1 && p.length < 200);
}

function userMessage(p, mode) {
  const specs = p.specs ? (typeof p.specs === 'string' ? p.specs : JSON.stringify(p.specs, null, 2)) : '(puudub)';
  const bullets = stripBrandBullets(p.sanitized_description, p.title);
  const richPart = mode === 'rich'
    ? `\n=== lähte-rich (EN master — FAKTIDE allikas, kirjuta VÄRSKE ET, ära kopeeri HTML-i) ===\n${p.sanitized_rich_description}`
    : `\n=== (pikk lähte-tekst PUUDUB → compose-režiim: komponeeri title + spetside + punktide põhjal) ===`;
  return `Loo eestikeelne tootesisu järgnevale tootele. Kategooria-kontekst: ${p.ptype || '(teadmata)'}
Režiim: ${mode}

=== title (EN, puhas) ===
${p.title}

=== lühikirjeldus (EN) ===
${p.description || '(puudub)'}

=== müügipunktid / bullets (EN, lähtest) ===
${bullets.length ? bullets.map(b => '- ' + b).join('\n') : '(puuduvad)'}

=== spetsid (struktureeritud) ===
${specs}${richPart}`;
}

const SCHEMA = {
  type: 'object',
  properties: {
    title_et: { type: 'string' },
    description_et: { type: 'string' },
    selling_points_et: { type: 'array', items: { type: 'string' } },  // 3-5 jõustub promptis (schema ei toeta minItems 2-5)
    sanitized_rich_description_et: { type: 'string' },
    qc_notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['title_et', 'description_et', 'selling_points_et', 'sanitized_rich_description_et', 'qc_notes'],
  additionalProperties: false,
};

// ---------------------------------------------------------------------------
// 3. GENEREERIMINE (üks toode)
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function generateContent(product, opts = {}) {
  const {
    apiKey = process.env.ANTHROPIC_API_KEY,
    model = DEFAULT_MODEL,
    termBlock,
    useVision = false,           // pilt-vision ainult õhuke-teksti puhul
    maxTokens = 8000,
  } = opts;
  if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY puudub' };
  if (!termBlock) return { ok: false, error: 'termBlock puudub (buildGlossaryAssets)' };

  const mode = detectSourceMode(product.sanitized_rich_description);

  // User content: tekst + (valikuline) pilt õhuke-teksti puhul
  const userContent = [{ type: 'text', text: userMessage(product, mode) }];
  if (useVision && mode === 'composed' && product.thumbnail) {
    // VEVOR CDN URL — ÄRA decode (%2B peab jääma), anna URL-allikana
    userContent.push({ type: 'image', source: { type: 'url', url: product.thumbnail } });
  }

  const body = {
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemPrompt(termBlock), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userContent }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  };

  const maxAttempts = 6;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 300000);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      const ms = Date.now() - t0;
      if (res.status === 429 || res.status === 529 || res.status >= 500) {
        const ra = parseInt(res.headers.get('retry-after') || '0', 10);
        const wait = Math.max(ra * 1000, Math.min(60000, 1000 * 2 ** attempt));
        lastErr = `HTTP ${res.status}`;
        await sleep(wait);
        continue;
      }
      const json = await res.json();
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`, ms, mode };
      const textBlock = (json.content || []).find(b => b.type === 'text');
      let parsed = null, parseErr = null;
      try { parsed = JSON.parse(textBlock?.text || ''); } catch (e) { parseErr = String(e); }
      return {
        ok: !!parsed,
        stop_reason: json.stop_reason,
        usage: json.usage,
        ms, mode,
        content: parsed,
        parseErr,
        raw: parsed ? undefined : (textBlock?.text || '').slice(0, 500),
      };
    } catch (e) {
      lastErr = String(e);
      await sleep(Math.min(60000, 1000 * 2 ** attempt));
    }
  }
  return { ok: false, error: `exhausted retries: ${lastErr}`, mode };
}

export { SCHEMA, DEFAULT_MODEL };
