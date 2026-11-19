/**
 * llm-client.test.mjs — llm-client SSoT testid. VÕRGUTA (fetchImpl süstitud), STATE'ita
 *   (recordImpl/alertImpl süstitud → ei kirjuta spend-state'i ega saada Telegrami).
 *   Jooks: node scripts/lib/llm-client.test.mjs
 */
import assert from "node:assert";
import { callMessages, makeCaller, requireTask, buildBody } from "./llm-client.mjs";

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log(`  ✅ ${name}`); }
  catch (e) { fail++; console.log(`  ❌ ${name}\n       ${e && e.message || e}`); }
}

// mock fetch: annab vastuste jada (status + body)
function mockFetch(responses) {
  let i = 0; const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    const res = responses[Math.min(i, responses.length - 1)]; i++;
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      text: async () => res.text || "",
      json: async () => res.json || {},
    };
  };
  fn.calls = calls; fn.count = () => i;
  return fn;
}
const okJson = (text = "hi", usage = { input_tokens: 10, output_tokens: 5 }) =>
  ({ status: 200, json: { content: [{ type: "text", text }], usage, model: "claude-haiku-4-5" } });

const KEY = "sk-ant-test";
const spies = () => {
  const rec = []; const al = [];
  return {
    recordImpl: (a) => rec.push(a),
    alertImpl: (msg, o) => al.push({ msg, o }),
    rec, al,
  };
};

console.log("llm-client testid:");

await t("requireTask: tühi silt → viga", () => {
  assert.throws(() => requireTask(""), /KOHUSTUSLIK/);
  assert.throws(() => requireTask(undefined), /KOHUSTUSLIK/);
  assert.throws(() => requireTask("   "), /KOHUSTUSLIK/);
  assert.equal(requireTask(" classify "), "classify");
});

await t("callMessages: task puudub → viga (ei kutsu fetchi)", async () => {
  const fetchImpl = mockFetch([okJson()]);
  await assert.rejects(
    callMessages({ apiKey: KEY, model: "claude-haiku-4-5", messages: [{ role: "user", content: "x" }], fetchImpl }),
    /task-silt KOHUSTUSLIK/,
  );
  assert.equal(fetchImpl.count(), 0, "fetchi ei tohi kutsuda ilma sildita");
});

await t("callMessages: võti puudub → viga", async () => {
  const saved = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY;
  try {
    await assert.rejects(
      callMessages({ task: "classify", model: "m", messages: [{ role: "user", content: "x" }], fetchImpl: mockFetch([okJson()]) }),
      /ANTHROPIC_API_KEY puudub/,
    );
  } finally { if (saved) process.env.ANTHROPIC_API_KEY = saved; }
});

await t("callMessages: õnnestumine → recordSpend task'iga, tagastab text/json/usage", async () => {
  const s = spies();
  const fetchImpl = mockFetch([okJson("tere", { input_tokens: 100, output_tokens: 20 })]);
  const out = await callMessages({
    apiKey: KEY, task: "classify", model: "claude-haiku-4-5",
    messages: [{ role: "user", content: "x" }], fetchImpl, recordImpl: s.recordImpl, alertImpl: s.alertImpl,
  });
  assert.equal(out.text, "tere");
  assert.equal(out.usage.input_tokens, 100);
  assert.equal(s.rec.length, 1, "üks recordSpend");
  assert.equal(s.rec[0].task, "classify", "silt edastatud recordSpend'ile");
  assert.equal(s.rec[0].model, "claude-haiku-4-5");
  assert.equal(fetchImpl.count(), 1);
});

await t("callMessages: oma `body` edastatakse muutumatuna (migratsioon ei muuda käitumist)", async () => {
  const s = spies();
  const body = { model: "claude-sonnet-5", max_tokens: 1500, system: "SYS", messages: [{ role: "user", content: "u" }] };
  const fetchImpl = mockFetch([okJson("ok")]);
  await callMessages({ apiKey: KEY, task: "spec", body, fetchImpl, recordImpl: s.recordImpl, alertImpl: s.alertImpl });
  assert.deepEqual(fetchImpl.calls[0].body, body, "keha jääb täpselt samaks");
  assert.equal(s.rec[0].model, "claude-sonnet-5", "mudel kehast");
  assert.equal(s.rec[0].task, "spec");
});

await t("callMessages: usage-limit → alert + throw degrade='usage', EI retry", async () => {
  const s = spies();
  const capBody = JSON.stringify({ error: { message: "You have reached your specified workspace API usage limits. You will regain access on 2026-12-01 at 00:00 UTC." } });
  const fetchImpl = mockFetch([{ status: 400, text: capBody }]);
  let err;
  try {
    await callMessages({ apiKey: KEY, task: "classify", model: "m", messages: [{ role: "user", content: "x" }], fetchImpl, recordImpl: s.recordImpl, alertImpl: s.alertImpl });
  } catch (e) { err = e; }
  assert.ok(err, "peab viskama");
  assert.equal(err.degrade, "usage");
  assert.equal(s.al.length, 1, "usage → alert üks kord");
  assert.equal(s.rec.length, 0, "ebaõnnestunud kutse EI salvesta kulu");
  assert.equal(fetchImpl.count(), 1, "usage-limit EI retry");
});

await t("callMessages: krediit-balance → throw degrade='credit' (ilma alertita)", async () => {
  const s = spies();
  const credBody = JSON.stringify({ error: { message: "Your credit balance is too low to access the Anthropic API." } });
  const fetchImpl = mockFetch([{ status: 400, text: credBody }]);
  let err;
  try {
    await callMessages({ apiKey: KEY, task: "spec", model: "m", messages: [{ role: "user", content: "x" }], fetchImpl, recordImpl: s.recordImpl, alertImpl: s.alertImpl });
  } catch (e) { err = e; }
  assert.equal(err.degrade, "credit");
  assert.equal(s.al.length, 0, "krediit-balance → EI per-kutse alert");
});

await t("callMessages: 500 → retry → 200 õnnestub", async () => {
  const s = spies();
  const fetchImpl = mockFetch([{ status: 500, text: "oops" }, okJson("teine katse")]);
  const out = await callMessages({
    apiKey: KEY, task: "audit", model: "m", messages: [{ role: "user", content: "x" }],
    fetchImpl, recordImpl: s.recordImpl, alertImpl: s.alertImpl, maxAttempts: 3,
  });
  assert.equal(out.text, "teine katse");
  assert.equal(fetchImpl.count(), 2, "üks retry");
  assert.equal(s.rec.length, 1);
});

await t("makeCaller: task puudub → viga; silt edastatakse recordSpend'ile", async () => {
  assert.throws(() => makeCaller({ apiKey: KEY }), /KOHUSTUSLIK/);
});

await t("buildBody: Fable → thinking/effort omit; muidu adaptive+effort; schema → format", () => {
  const b1 = buildBody({ model: "claude-fable-5", messages: [], fable: true });
  assert.equal(b1.thinking, undefined);
  assert.equal(b1.output_config, undefined);
  const b2 = buildBody({ model: "claude-sonnet-5", messages: [], schema: { type: "object" } });
  assert.deepEqual(b2.thinking, { type: "adaptive" });
  assert.equal(b2.output_config.effort, "low");
  assert.equal(b2.output_config.format.type, "json_schema");
});

console.log(`\n${fail === 0 ? "✅ KÕIK LÄBIS" : "❌ KUKKUS"}: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
