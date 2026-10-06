#!/usr/bin/env node
/**
 * classify-chain-dryrun.mjs — B-klassifikaatori otsustusahela ETAPP 1 DRY-run.
 *
 * Spec: reports/b-klassifikaator-taisautomaatika-spets.md §2c + §4 + §10 (ETAPP 1 AINULT).
 * EI kirjuta DB-sse, EI deploy'i, EI loo päris L3-sid. Ainult simulatsioon + raport.
 *
 * Ahel (§2 + §2b + §2c ASÜMMEETRILINE KINDLUS):
 *   KOHTUNIK (Opus-4.8) → REFERENTS (Sonnet-5) → [lahkheli] VIIGIMURDJA Fable-5 → 2/3 enamus.
 *
 *   ⚖️ ASÜMMEETRIA (§2c):
 *     • assign (konsensus)            → 0 Fable-kutset
 *     • assign (2/3, viigimurdja)     → 1 Fable-kutse
 *     • new_l3 (konsensus mõlemad)    → 1 Fable-KINNITUS (vaidleb vastu → fallback)
 *     • new_l3 (viigimurdja kaudu)    → 3 Fable-häält, enamus ≥2/3; muidu olemas-koju + signaal
 *
 * Väravad (§4): DUP · über-frag · NIMEVÄRAV (eestikeelsus + KLIENDI-ARUSAAMINE, LLM, max 3× ümber-pakkumist) · merge/grab märge.
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a   # ANTHROPIC_API_KEY (väärtust EI logi)
 *   node scripts/classify-chain-dryrun.mjs --out reports/classify-chain-dryrun-v2.json [--fresh]
 */
import fs from "node:fs";

const REPO = "/opt/xlmarket-github";
const SCRATCH = "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const val = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d; };
const FRESH = process.argv.includes("--fresh");
const OUT = val("--out", `${REPO}/reports/classify-chain-dryrun-v2.json`);
const FABLE = "claude-fable-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("❌ ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }

// ---- andmed ----
const tree = JSON.parse(fs.readFileSync(`${REPO}/storefront/lib/category-tree.generated.json`, "utf8"));
const NODES = tree.nodes;
const rows = JSON.parse(fs.readFileSync(`${SCRATCH}/calib-rows.json`, "utf8"));           // judge+ref verdiktid (40)
const classify = JSON.parse(fs.readFileSync(`${REPO}/storefront/public/xl-admin/calib-classify.json`, "utf8")); // kohtuniku täisotsus + considered_l3s

const judgeByCk = {};
for (const d of classify.decisions) { if (!judgeByCk[d.cluster_key]) judgeByCk[d.cluster_key] = d.judge; }

// ---- puu-helperid (LCA) ----
function ancestors(handle) {
  const out = []; let h = handle; const seen = new Set();
  while (h && NODES[h] && !seen.has(h)) { seen.add(h); out.push(h); h = NODES[h].parent_handle || null; }
  return out;
}
const nodeLevel = (h) => NODES[h]?.level ?? null;
const nodeName = (h) => NODES[h]?.name_et || NODES[h]?.name_en || h;
function lca(anchors) {
  const chains = anchors.filter(Boolean).map(ancestors);
  if (chains.length < 2) return null;
  let common = chains[0].filter(h => chains.every(c => c.includes(h)));
  if (!common.length) return null;
  common.sort((a, b) => (nodeLevel(b) || 0) - (nodeLevel(a) || 0));
  return { handle: common[0], level: nodeLevel(common[0]) };
}
const l3Children = (parentL2) => parentL2 && NODES[parentL2]
  ? Object.entries(NODES).filter(([, x]) => x.parent_handle === parentL2 && x.level === 3) : [];
const siblingsL3 = (parentL2) => l3Children(parentL2).map(([h, x]) => x.name_et || x.name_en || h);
// päris L2 = NODES-is olemas, level 2, vähemalt 1 L3-laps (ei looda uut L2 ühe L3 jaoks)
const isRealL2 = (h) => !!(h && NODES[h] && NODES[h].level === 2 && l3Children(h).length >= 1);
const parentL2of = (h) => { let cur = h; const seen = new Set(); while (cur && NODES[cur] && !seen.has(cur)) { seen.add(cur); if (NODES[cur].level === 2) return cur; cur = NODES[cur].parent_handle; } return null; };
// deterministlik parent-L2: valideeri mudeli pakutu; muidu tuleta anchor-L3-de enamus-L2 (Fable vaba-tekst ei ole usaldusväärne — tõest. «v4-ladu» ei eksisteeri)
function resolveParentL2(proposed, anchorHandles) {
  if (isRealL2(proposed)) return proposed;
  const tally = {};
  for (const a of anchorHandles.filter(Boolean)) { const l2 = parentL2of(a); if (isRealL2(l2)) tally[l2] = (tally[l2] || 0) + 1; }
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

// ---- §3 granulaarsus-prompt (sõna-sõnalt) ----
const GRANULAR = `L3-GRANULAARSUS — millal toode väärib OMA uut L3 vs olemas-naaber-L3:

Küsi: kas see tüüp erineb LÄHIMAST olemas-L3-st OSTJA-otsingu ja
funktsiooni/VÄLJUNDI mõttes nii palju, et ostja otsiks seda eraldi?

• ERI TÜÜP (→ new_l3): funktsioon VÕI väljund (tulem) erineb — ostja EI SAA
  toodet B asendada tootega A sama tulemusega.
  Nt: konsool-puiduriiul (kandekäpad) ≠ seinariiul (tasandid);
      LiFePO4 energiasalvesti (tsükliline salvestus) ≠ sõidukiaku (käivitusvool);
      helbejäämasin ≠ kuubikjäämasin (väljund erineb).

• VARIANT (→ assign_existing): sama funktsioon+väljund, erineb ainult
  vorm / suurus / materjal / paigaldus / energiaallikas — ostja otsib SAMA
  asja teises vormis.
  Nt: lae- vs seinaventilaator; torn- vs põrandaventilaator; pitsakivi vs -teras.

• SUHTELINE, MITTE absoluutne: ÄRA loe tooteid ("N tükki → uus L3").
  Otsusta SEMANTILISE KAUGUSE järgi lähimast olemas-L3-st:
   – kui kaugus ≥ tüüpiline kaugus olemas-õdede-L3-de vahel (sama L2) → OMA L3;
   – kui kaugus < see → variant → mine olemasolevasse.

• ENNE new_l3 KOHUSTUSLIK: täida considered_l3s (2–5 lähimat olemas-L3 handle)
  + considered_reason (miks semantiline kaugus liiga suur). Tühi considered →
  pead valima assign_existing (DUP-värav, B2).

• EKSKLUSIIVSUS- ja HÜBRIID-reeglid kehtivad granulaarsuse EES:
  ainult-laps/ainult-kommerts → segment-kodu; päris-kaheti → primaar sisust.`;

// ---- Fable toor-kutse (kasutuse-loendusega) ----
let fableUsage = { input: 0, output: 0, calls: 0 };
async function fableRaw(system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    // Fable: thinking always-on sööb eelarvet → anna ruumi, et JSON ei katkeks
    body: JSON.stringify({ model: FABLE, max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Fable HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  if (j.usage) { fableUsage.input += j.usage.input_tokens || 0; fableUsage.output += j.usage.output_tokens || 0; fableUsage.calls++; }
  const raw = (j.content || []).find(c => c.type === "text")?.text || "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Fable JSON puudub: ${raw.slice(0, 200)}`);
  return JSON.parse(m[0]);
}

// ---- Fable üks sõltumatu granulaarsuse-hääl (viigimurdja / 3×-hääletus / kinnitus) ----
async function fableVote(cluster) {
  const cands = cluster.candidates.map(h => `  - ${h}  («${nodeName(h)}», L${nodeLevel(h) ?? "?"})`).join("\n");
  const titles = cluster.titles.slice(0, 4).map(t => `  • ${t}`).join("\n");
  const system = `Sa oled sõltumatu taksonoomia-viigimurdja XL e-poe tootekataloogis (VEVOR-tooted).
Kohtunik (Opus) ja referents (Sonnet) ei leppinud kokku, kuhu see tootetüüp kuulub.
Otsusta SÕLTUMATULT, kasutades identset granulaarsuse-reeglit:

${GRANULAR}

Tagasta AINULT JSON (ilma muu tekstita):
{"action":"assign_existing"|"new_l3","target_handle":"<olemas-L3-handle või null>","new_l3_name":"<eesti nimi või null>","parent_l2_handle":"<L2-handle uuele L3-le või null>","reason":"<1 lause>"}`;
  const user = `TOOTETÜÜP (klaster ${cluster.ck}, ${cluster.n} toodet):
${titles}

KOHTUNIK: ${cluster.judgeAction}${cluster.judgeTarget ? " → " + cluster.judgeTarget : ""}
REFERENTS: ${cluster.refAction}${cluster.refTarget ? " → " + cluster.refTarget : ""}
REFERENTSI PÕHJENDUS: ${cluster.refReason || "—"}

KAALUTAVAD OLEMAS-L3-d (DUP-värav — kas mõni sobib?):
${cands || "  (kohtunik ei pakkunud considered_l3s)"}

Otsusta: assign_existing (vali täpne target_handle ülalt) VÕI new_l3 (anna eesti nimi + parent_l2_handle).`;
  return fableRaw(system, user);
}

// ---- NIMEVÄRAV — kliendi-arusaamine (§4 gate #3, LLM) ----
async function fableNameCheck(name, cluster, siblingNames) {
  const titles = cluster.titles.slice(0, 5).map(t => `  • ${t}`).join("\n");
  const sibs = siblingNames.length ? siblingNames.map(s => `  - ${s}`).join("\n") : "  (pole)";
  const system = `Sa hindad UUE L3-kategooria nime arusaadavust Eesti e-poe kliendile. KAKS küsimust:
(1) Kas Eesti klient saab nimest KOHE õigesti aru, MIS TOOTED seal on?
(2) Kas nimi on segi aetav mõne OLEMAS-kategooriaga või TAVAKEELE tähendusega?

NÄIDE HALVAST NIMEST: «Puiduriiulid» — klient loeb "puidust TEHTUD riiulid" (riiul kui mööbel, materjal=puit),
aga tegelikult on tooted puitmaterjali/saematerjali HOIUSTUS-riiulid (konsool-käpad). Tähendus seg-aetav → ok=false,
pakutud parem nimi nt «Saematerjali hoiuriiulid» või «Puidu laoriiulid».

Hinda ANGI nime tegelike toodete vastu. Kui nimi on selge ja üheselt mõistetav → ok=true.
Tagasta AINULT JSON: {"ok":true|false,"reason":"<1 lause>","confusable_with":"<millega segi või null>","proposed_name":"<selgem eesti nimi või null>"}`;
  const user = `PAKUTUD NIMI: «${name}»

TEGELIKUD TOOTED selles L3-s:
${titles}

KÕRVAL-L3-d samas L2-s (segadus-kontroll):
${sibs}

Kas Eesti klient saab «${name}» nimest kohe õigesti aru? Kas seg-aetav?`;
  return fableRaw(system, user);
}

// ---- klastrite koostamine ----
const clustersMap = {};
for (const r of rows) (clustersMap[r.ck] ||= []).push(r);
const clusters = Object.entries(clustersMap).map(([ck, items]) => {
  const j = judgeByCk[ck] || {};
  const judgeTarget = items[0].jt || j.target_handle || null;
  const refTarget = items[0].rt || null;
  const candidates = (j.considered_l3s || []).slice();
  if (judgeTarget && !candidates.includes(judgeTarget)) candidates.unshift(judgeTarget);
  if (refTarget && !candidates.includes(refTarget)) candidates.push(refTarget);
  return {
    ck, n: items.length, items, titles: items.map(i => i.title),
    judgeAction: items[0].judge, judgeTarget, refAction: items[0].ref, refTarget,
    refReason: items.find(i => i.rr)?.rr || "",
    judgeNewL3Name: j.new_l3_name || null, judgeParentL2: j.parent_l2_handle || null, candidates,
  };
});
const voteKey = (action, target) => action === "new_l3" ? "NEW" : `ASSIGN:${target || "?"}`;

// ---- über-frag + DUP + merge/grab märge (nimevärav eraldi, LLM) ----
function structGates(cluster, parentL2) {
  const gates = {};
  gates.dup = (cluster.candidates && cluster.candidates.length >= 2)
    ? { pass: true, note: `${cluster.candidates.length} kaalutud L3; ükski ei sobinud` }
    : { pass: false, note: "considered_l3s < 2 → DUP-väravat ei saa kinnitada → HOLD" };
  if (!parentL2) {
    gates.uberfrag = { pass: false, note: "parent_l2_handle puudub → über-frag ebaselge → HOLD" };
  } else if (!isRealL2(parentL2)) {
    gates.uberfrag = { pass: false, note: `parent-L2 «${parentL2}» EI ole kehtiv L2 (puudub NODES-is / vale level / 0 L3-last) → ei looda uut L2 → HOLD` };
  } else {
    gates.uberfrag = { pass: true, note: `parent-L2 «${nodeName(parentL2)}» (L2, ${l3Children(parentL2).length} õde-L3) → L3 lisandub olemas-L2-le` };
  }
  return gates;
}

// ---- vahemälu ----
const CACHE = `${REPO}/reports/classify-chain-fable-cache.json`;
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch {}
// migratsioon: vana skeem {ck: verdict} → vote:ck:0
if (!cache.__v2) {
  const mig = { __v2: true };
  for (const [k, v] of Object.entries(cache)) if (v && v.action) mig[`vote:${k}:0`] = v;
  cache = mig;
}
const saveCache = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));
async function cachedVote(ck, i, cluster) {
  const key = `vote:${ck}:${i}`;
  if (!FRESH && cache[key]) return cache[key];
  const v = await fableVote(cluster); cache[key] = v; saveCache(); return v;
}
async function cachedConfirm(ck, cluster) {
  const key = `confirm:${ck}`;
  if (!FRESH && cache[key]) return cache[key];
  const v = await fableVote(cluster); cache[key] = v; saveCache(); return v;
}
async function cachedName(ck, startName, cluster, sibs) {
  const key = `name:${ck}`;
  if (!FRESH && cache[key]) return cache[key];
  const attempts = []; let name = startName; let ok = false, finalName = null;
  for (let i = 0; i < 3; i++) {
    const v = await fableNameCheck(name, cluster, sibs);
    attempts.push({ name, ok: !!v.ok, reason: v.reason, confusable_with: v.confusable_with || null, proposed: v.proposed_name || null });
    if (v.ok) { ok = true; finalName = name; break; }
    if (!v.proposed_name || v.proposed_name === name) break;
    name = v.proposed_name;
  }
  const out = { ok, finalName, attempts };
  cache[key] = out; saveCache(); return out;
}

// ---- helper: assign-enamuse / LCA fallback uue-l3-tagasilükke jaoks ----
function fallbackHome(cluster, votes) {
  const assignVotes = [];
  if (cluster.judgeAction !== "new_l3" && cluster.judgeTarget) assignVotes.push(cluster.judgeTarget);
  if (cluster.refAction !== "new_l3" && cluster.refTarget) assignVotes.push(cluster.refTarget);
  for (const v of votes) if (v.action !== "new_l3" && v.target_handle) assignVotes.push(v.target_handle);
  const tally = {}; for (const t of assignVotes) tally[t] = (tally[t] || 0) + 1;
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) return { kind: "assign", target: top[0], note: `assign-enamus (${top[1]}×)` };
  // ei ole assign-enamust → LCA
  const anchorOf = (action, target, parentL2) => action === "new_l3" ? (parentL2 || null) : target;
  const anchors = [
    anchorOf(cluster.judgeAction, cluster.judgeTarget, cluster.judgeParentL2),
    anchorOf(cluster.refAction, cluster.refTarget, null),
    ...votes.map(v => anchorOf(v.action, v.target_handle, v.parent_l2_handle)),
  ].filter(Boolean);
  const common = lca(anchors);
  if (assignVotes.length) return { kind: "assign", target: assignVotes[0], note: "assign-kodu (üksik mudel)" };
  if (common && common.level === 2) return { kind: "lca", target: common.handle, level: 2, note: "LCA L2-muud" };
  if (common && common.level === 1) return { kind: "lca", target: common.handle, level: 1, note: "LCA L1-muud" };
  return { kind: "invisible", note: "ühist ülemat pole → nähtamatu + digest" };
}

// ---- peamine ahel (§2c asümmeetriline kindlus) ----
const results = [];
for (const c of clusters) {
  const r = {
    ck: c.ck, n: c.n, titles: c.titles,
    judge: `${c.judgeAction}${c.judgeTarget ? " → " + c.judgeTarget : ""}`,
    ref: `${c.refAction}${c.refTarget ? " → " + c.refTarget : ""}`,
    fableVotes: [],
  };
  const jKey = voteKey(c.judgeAction, c.judgeTarget);
  const rKey = voteKey(c.refAction, c.refTarget);

  if (jKey === rKey) {
    if (c.judgeAction === "new_l3") {
      // KONSENSUS new_l3 → 1× Fable KINNITUS (§2c)
      const f = await cachedConfirm(c.ck, c);
      c.fableConf = f;
      r.fableVotes.push({ role: "kinnitus", v: `${f.action}${f.target_handle ? " → " + f.target_handle : f.new_l3_name ? " («" + f.new_l3_name + "»)" : ""}` });
      if (f.action === "new_l3") {
        r.path = "konsensus→new_l3 (1× kinnitus ✓)";
        r.decision = "new_l3"; r.newOrigin = "konsensus";
        r.newName = c.judgeNewL3Name || f.new_l3_name || null;
        r.parentL2 = c.judgeParentL2 || f.parent_l2_handle || null;
      } else {
        // kinnitus vaidleb vastu → konservatiivne fallback (§2c)
        const fb = fallbackHome(c, [f]);
        r.path = "konsensus→new_l3 → kinnitus VASTU → fallback";
        r.decision = fb.kind === "assign" ? `assign:${fb.target}` : fb.kind === "lca" ? `LCA-müügis: ${fb.target}-muud (L${fb.level})` : "NÄHTAMATU";
        r.signal = true; r.fallbackReason = `konsensus-new_l3 kinnitus=assign → ${fb.note}`;
      }
    } else {
      // KONSENSUS assign → 0 Fable
      r.path = "konsensus→assign"; r.decision = `assign:${c.judgeTarget}`;
    }
  } else {
    // LAHKHELI → 1 viigimurdja-hääl
    const f1 = await cachedVote(c.ck, 0, c);
    c.fable = f1;
    r.fableVotes.push({ role: "viigimurdja", v: `${f1.action}${f1.target_handle ? " → " + f1.target_handle : f1.new_l3_name ? " («" + f1.new_l3_name + "»)" : ""} — ${f1.reason}` });
    const votes1 = [jKey, rKey, voteKey(f1.action, f1.target_handle)];
    const tally1 = {}; for (const v of votes1) tally1[v] = (tally1[v] || 0) + 1;
    const win1 = Object.entries(tally1).sort((a, b) => b[1] - a[1])[0];

    if (win1[0] === "NEW" && win1[1] >= 2) {
      // new_l3 VIIGIMURDJA kaudu → 3× Fable-hääletus (§2c)
      const v2 = await cachedVote(c.ck, 1, c);
      const v3 = await cachedVote(c.ck, 2, c);
      const votes3 = [f1, v2, v3];
      for (const [i, v] of [[2, v2], [3, v3]]) r.fableVotes.push({ role: `hääl ${i}`, v: `${v.action}${v.target_handle ? " → " + v.target_handle : v.new_l3_name ? " («" + v.new_l3_name + "»)" : ""}` });
      const newCount = votes3.filter(v => v.action === "new_l3").length;
      r.vote3 = `${newCount}/3 new_l3`;
      if (newCount >= 2) {
        r.path = `viigimurdja→new_l3 (3× hääletus: ${newCount}/3 ✓)`;
        r.decision = "new_l3"; r.newOrigin = "viigimurdja";
        const newNames = votes3.filter(v => v.action === "new_l3" && v.new_l3_name).map(v => v.new_l3_name);
        r.newName = newNames[0] || c.judgeNewL3Name || null;
        r.parentL2 = votes3.find(v => v.action === "new_l3" && v.parent_l2_handle)?.parent_l2_handle || c.judgeParentL2 || null;
      } else {
        // enamust pole → olemas-koju + signaal (§2c), MITTE uus L3
        const fb = fallbackHome(c, votes3);
        r.path = `viigimurdja→new_l3 (3× hääletus: ${newCount}/3 — enamust POLE) → fallback + signaal`;
        r.decision = fb.kind === "assign" ? `assign:${fb.target}` : fb.kind === "lca" ? `LCA-müügis: ${fb.target}-muud (L${fb.level})` : "NÄHTAMATU";
        r.signal = true; r.fallbackReason = `3× ei andnud new_l3-enamust → ${fb.note}`;
      }
    } else if (win1[1] >= 2) {
      // assign 2/3 → 1 kutse piisab (§2c)
      r.path = `2-of-3 (${win1[0]})`;
      r.decision = win1[0].replace("ASSIGN:", "assign:");
    } else {
      // kõik eri meelt → LCA (§2b)
      const fb = fallbackHome(c, [f1]);
      r.path = fb.kind === "lca" ? `ühine ülem (L${fb.level})` : fb.kind === "assign" ? "kõik-eri → assign-kodu" : "nähtamatu";
      r.decision = fb.kind === "assign" ? `assign:${fb.target}` : fb.kind === "lca" ? `LCA-müügis: ${fb.target}-muud (L${fb.level})` : "NÄHTAMATU (ühist ülemat pole)";
      if (fb.kind !== "assign") r.signal = true;
    }
  }
  results.push({ ...r, _cluster: c });
}

// ---- NIMEVÄRAV + struktuur-väravad new_l3-otsuse klastritel ----
for (const r of results) {
  if (r.decision !== "new_l3") continue;
  const c = r._cluster;
  const proposed = r.parentL2 || c.judgeParentL2 || null;
  const anchors = [...new Set([...(c.candidates || []), c.judgeTarget, c.refTarget].filter(Boolean))];
  const parentL2 = resolveParentL2(proposed, anchors);
  r.parentL2 = parentL2; r.parentL2_proposed = proposed;
  const gates = structGates(c, parentL2);
  // nimevärav (LLM, kliendi-arusaamine, max 3×)
  const sibs = siblingsL3(parentL2);
  const startName = r.newName || c.judgeNewL3Name;
  let nameGate;
  if (!startName) {
    nameGate = { ok: false, finalName: null, attempts: [], note: "eestikeelne nimi puudub" };
  } else if (!gates.dup.pass) {
    nameGate = { ok: null, finalName: null, attempts: [], note: "DUP-värav kukkus enne → nime-kontrolli ei jõutud" };
  } else {
    nameGate = await cachedName(c.ck, startName, c, sibs);
  }
  gates.name = {
    pass: nameGate.ok === true ? true : nameGate.ok === null ? null : false,
    note: nameGate.ok === true
      ? (nameGate.finalName === startName ? `nimi «${nameGate.finalName}» selge` : `nimi parandati «${startName}» → «${nameGate.finalName}» (segadus-kaitse)`)
      : nameGate.note || `nimi «${startName}» jäi segaseks 3 katse järel → FAIL`,
    startName, finalName: nameGate.finalName, attempts: nameGate.attempts,
  };
  gates.merge_grab = { pass: null, note: "DRY: merge-judge + grab-bag jookseks PÄRAST loomist (ETAPP 2)" };
  const blocking = Object.entries(gates).filter(([, g]) => g.pass === false).map(([k]) => k);
  r.gate = { gates, allPass: blocking.length === 0, blocking };

  if (nameGate.ok === true && nameGate.finalName) r.finalName = nameGate.finalName;

  // kui DUP või über-frag kukub → fallback olemas-koju (toode müügis)
  if (!gates.dup.pass || !gates.uberfrag.pass) {
    const home = c.judgeAction !== "new_l3" ? c.judgeTarget : (c.candidates[0] || null);
    r.decisionFinal = home ? `assign:${home} (värav-blokk → turvaline fallback)` : "HOLD";
    r.blockedBy = blocking;
  } else if (!gates.name.pass && gates.name.pass !== null) {
    // nimevärav kukkus 3× → fallback olemas-koju (§4 gate #3)
    const home = c.candidates[0] || c.judgeTarget || null;
    r.decisionFinal = home ? `assign:${home} (nimi segane 3× → fallback)` : "HOLD";
    r.signal = true; r.blockedBy = ["name"];
  }
}

// ---- müügis vs nähtamatu ----
let muugis = 0, nahtamatu = 0;
for (const r of results) {
  const dec = r.decisionFinal || r.decision;
  if (dec && dec.startsWith("NÄHTAMATU")) nahtamatu += r.n; else muugis += r.n;
}

// ---- väljund ----
const newl3Final = results.filter(r => (r.decisionFinal || r.decision) === "new_l3");
const summary = {
  generated_at: new Date().toISOString(), dry: true,
  clusters: results.length, products: rows.length,
  fable_calls: fableUsage.calls, fable_usage: fableUsage,
  fable_cost_usd: +((fableUsage.input / 1e6) * 10 + (fableUsage.output / 1e6) * 50).toFixed(4),
  muugis, nahtamatu,
  new_l3_created: newl3Final.length,
  new_l3_names: newl3Final.map(r => ({ ck: r.ck, name: r.finalName || r.newName, parentL2: r.parentL2, n: r.n, origin: r.newOrigin })),
};
const clean = results.map(({ _cluster, ...r }) => r);
fs.writeFileSync(OUT, JSON.stringify({ summary, clusters: clean }, null, 2));

// ---- konsool ----
console.log("\n═══ ETAPP 1 DRY-RUN v2 — asümmeetriline kindlus + nimevärav ═══\n");
for (const r of clean) {
  console.log(`▸ ${r.ck}  ×${r.n}  [${r.path}]`);
  console.log(`   "${r.titles[0].slice(0, 58)}"`);
  console.log(`   kohtunik: ${r.judge}   referents: ${r.ref}`);
  for (const fv of r.fableVotes) console.log(`   Fable[${fv.role}]: ${fv.v}`);
  if (r.vote3) console.log(`   3×-hääletus: ${r.vote3}`);
  console.log(`   → OTSUS: ${r.decisionFinal || r.decision}`);
  if (r.signal) console.log(`   ⚑ signaal kogub (§5)${r.fallbackReason ? " — " + r.fallbackReason : ""}`);
  if (r.gate) {
    console.log(`   VÄRAV: ${r.gate.allPass ? "✅ KÕIK OK" : "🛑 BLOKK: " + r.gate.blocking.join(", ")}  ${Object.entries(r.gate.gates).map(([k, g]) => `${k}=${g.pass === null ? "—" : g.pass ? "✓" : "✗"}`).join(" ")}`);
    if (r.gate.gates.name?.attempts?.length) for (const a of r.gate.gates.name.attempts) console.log(`      nimi «${a.name}» → ${a.ok ? "✓ selge" : "✗ " + (a.reason || "")}${a.proposed ? "  ⇒ pakub «" + a.proposed + "»" : ""}`);
  }
  console.log("");
}
console.log("─────────────────────────────────────────────");
console.log(`Fable kutseid: ${summary.fable_calls}  (in ${fableUsage.input} / out ${fableUsage.output} tok, ~$${summary.fable_cost_usd})`);
console.log(`UUS L3 loodaks: ${summary.new_l3_created}`);
for (const n of summary.new_l3_names) console.log(`   • «${n.name}» (${n.origin}) ×${n.n} → ${n.parentL2}`);
console.log(`MÜÜGIS: ${muugis}   NÄHTAMATU: ${nahtamatu}  (kokku ${rows.length})`);
console.log(`💾 ${OUT}`);
