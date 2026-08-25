#!/usr/bin/env node
// content-batch.mjs — Anthropic Batch API (−50% hind) OSADE KAUPA + fail-loud.
//
//   submitBatch → pollBatch → retrieveResults, chunk-kaupa (~2000/batch → osaline progress säilib).
//   Iga valmis-chunk kirjutatakse KOHE DB-sse (kutsuja teeb writeRecords) → katkeb → tehtu püsib.
//   Fail-loud: batch errored/expired/canceled → viga tagasi (kutsuja → Telegram).

const API = 'https://api.anthropic.com/v1';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function headers(apiKey) {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
}

async function apiFetch(url, opts, apiKey, { retries = 5 } = {}) {
  let lastErr;
  for (let a = 1; a <= retries; a++) {
    try {
      const res = await fetch(url, { ...opts, headers: { ...headers(apiKey), ...(opts.headers || {}) } });
      if (res.status === 429 || res.status === 529 || res.status >= 500) {
        lastErr = `HTTP ${res.status}`; await sleep(Math.min(30000, 1000 * 2 ** a)); continue;
      }
      return res;
    } catch (e) { lastErr = String(e); await sleep(Math.min(30000, 1000 * 2 ** a)); }
  }
  throw new Error(`apiFetch exhausted: ${lastErr}`);
}

// requests: [{custom_id, params}]  → { id }
export async function submitBatch(requests, apiKey) {
  const res = await apiFetch(`${API}/messages/batches`, {
    method: 'POST', body: JSON.stringify({ requests }),
  }, apiKey);
  const json = await res.json();
  if (!res.ok) throw new Error(`submitBatch HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json; // { id, processing_status, ... }
}

// Poll kuni processing_status === "ended". onTick(status) iga kontrolli järel.
export async function pollBatch(batchId, apiKey, { intervalMs = 20000, maxMs = 24 * 3600 * 1000, onTick } = {}) {
  const t0 = Date.now();
  while (true) {
    const res = await apiFetch(`${API}/messages/batches/${batchId}`, { method: 'GET' }, apiKey);
    const json = await res.json();
    if (!res.ok) throw new Error(`pollBatch HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    if (onTick) onTick(json);
    if (json.processing_status === 'ended') return json;
    if (Date.now() - t0 > maxMs) throw new Error(`pollBatch timeout (${batchId}) ${Math.round((Date.now() - t0) / 1000)}s`);
    await sleep(intervalMs);
  }
}

// results_url JSONL → [{custom_id, ok, message, errorType}]
export async function retrieveResults(batch, apiKey) {
  const url = batch.results_url;
  if (!url) throw new Error('results_url puudub (batch pole valmis?)');
  const res = await apiFetch(url, { method: 'GET' }, apiKey);
  if (!res.ok) throw new Error(`retrieveResults HTTP ${res.status}`);
  const text = await res.text();
  const out = [];
  for (const line of text.trim().split('\n').filter(Boolean)) {
    let rec; try { rec = JSON.parse(line); } catch { continue; }
    const r = rec.result || {};
    if (r.type === 'succeeded') out.push({ custom_id: rec.custom_id, ok: true, message: r.message });
    else out.push({ custom_id: rec.custom_id, ok: false, errorType: r.type, error: JSON.stringify(r).slice(0, 300) });
  }
  return out;
}

// Täis-tsükkel ühele chunk'ile: submit → poll → retrieve.
// requests: [{custom_id, params}]. Tagastab [{custom_id, ok, message|error}].
export async function runChunk(requests, apiKey, { onTick, label } = {}) {
  const batch = await submitBatch(requests, apiKey);
  const ended = await pollBatch(batch.id, apiKey, { onTick });
  const results = await retrieveResults(ended, apiKey);
  return { batchId: batch.id, counts: ended.request_counts, results };
}

export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
