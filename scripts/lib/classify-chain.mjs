/**
 * classify-chain.mjs — B-klassifikaatori otsustusahela SSoT (HARD RULE #5: üks transform, mitu kutsujat).
 *
 * Ekstraheeritud `classify-chain-dryrun.mjs`-st (2026-10-06, Task 5). Loogika IDENTNE.
 * Kutsujad: (a) dryrun (cached verdiktid), (b) öine hook `pipeline-classify-chain.mjs` (live judge+ref), (c) backfill.
 *
 * Ahel (§2c ASÜMMEETRILINE KINDLUS):
 *   KOHTUNIK (Opus) → REFERENTS (Sonnet) → [lahkheli] VIIGIMURDJA Fable → 2/3 enamus.
 *     • assign (konsensus)         → 0 Fable
 *     • assign (2/3, viigimurdja)  → 1 Fable
 *     • new_l3 (konsensus)         → 1 Fable KINNITUS (vastu → fallback)
 *     • new_l3 (viigimurdja kaudu) → 3 Fable-häält, ≥2/3; muidu olemas-koju + signaal
 *
 * Väravad (§4): DUP · über-frag · NIMEVÄRAV (eestikeelsus + KLIENDI-ARUSAAMINE 3a/3b, LLM max 3×).
 * (merge/grab = PÄRAST loomist, etapp2-create orkestraatoris.)
 *
 * createChain({ nodes, apiKey, cache, fresh, onCacheSave }) → { resolveChain(clusters), fableUsage, nodeName, GRANULAR, tree }
 *   clusters[] kuju (kutsuja ehitab judge+ref verdiktidest):
 *     { ck, n, items, titles, judgeAction, judgeTarget, refAction, refTarget, refReason,
 *       judgeNewL3Name, judgeParentL2, candidates }
 *   resolveChain tagastab results[] (iga r-il `_cluster` — kutsuja eemaldab enne JSON-i).
 */

const FABLE = "claude-fable-5";

// ---- §3 granulaarsus-prompt (sõna-sõnalt dryrun-ist) ----
export const GRANULAR = `L3-GRANULAARSUS — millal toode väärib OMA uut L3 vs olemas-naaber-L3:

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

// ---- puu-helperid (seotud nodes-iga) ----
export function makeTree(NODES) {
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
  const isRealL2 = (h) => !!(h && NODES[h] && NODES[h].level === 2 && l3Children(h).length >= 1);
  const parentL2of = (h) => { let cur = h; const seen = new Set(); while (cur && NODES[cur] && !seen.has(cur)) { seen.add(cur); if (NODES[cur].level === 2) return cur; cur = NODES[cur].parent_handle; } return null; };
  function resolveParentL2(proposed, anchorHandles) {
    if (isRealL2(proposed)) return proposed;
    const tally = {};
    for (const a of anchorHandles.filter(Boolean)) { const l2 = parentL2of(a); if (isRealL2(l2)) tally[l2] = (tally[l2] || 0) + 1; }
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  }
  // broaden-DUP: kas sirvimistasandi (laiem) nimi põrkuks olemas-L3-ga?
  const normName = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
  const ALL_L3_NAMES = Object.entries(NODES).filter(([, x]) => x.level === 3).map(([, x]) => normName(x.name_et || x.name_en));
  function broadenDupOk(name) {
    const n = normName(name);
    if (!n) return false;
    for (const ex of ALL_L3_NAMES) { if (ex === n || ex.includes(n) || n.includes(ex)) return false; }
    return true;
  }
  return { ancestors, nodeLevel, nodeName, lca, l3Children, siblingsL3, isRealL2, parentL2of, resolveParentL2, broadenDupOk };
}

// ---- Fable toor-kutse (kasutuse-loendusega) ----
export function makeFable(apiKey, usage) {
  return async function fableRaw(system, user) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: FABLE, max_tokens: 8000, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`Fable HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    if (j.usage) { usage.input += j.usage.input_tokens || 0; usage.output += j.usage.output_tokens || 0; usage.calls++; }
    const raw = (j.content || []).find(c => c.type === "text")?.text || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`Fable JSON puudub: ${raw.slice(0, 200)}`);
    return JSON.parse(m[0]);
  };
}

const voteKey = (action, target) => action === "new_l3" ? "NEW" : `ASSIGN:${target || "?"}`;
export { voteKey };

/**
 * createChain — ehitab ahela-mootori ühe nodes-puu + apiKey jaoks.
 * cache = {__v2:true, ...} objekt (kutsuja laeb/säilitab); onCacheSave() kutsutakse iga kirjutuse järel.
 */
export function createChain({ nodes, apiKey, cache = { __v2: true }, fresh = false, onCacheSave = () => {} }) {
  const tree = makeTree(nodes);
  const { nodeLevel, nodeName, lca, l3Children, siblingsL3, isRealL2, parentL2of, resolveParentL2, broadenDupOk } = tree;
  const fableUsage = { input: 0, output: 0, calls: 0 };
  const fableRaw = makeFable(apiKey, fableUsage);

  // ---- Fable üks sõltumatu granulaarsuse-hääl ----
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

  // ---- NIMEVÄRAV — kliendi-arusaamine + termin-ees + sirvimistasand (LLM) ----
  async function fableNameCheck(name, cluster, siblingNames) {
    const titles = cluster.titles.slice(0, 5).map(t => `  • ${t}`).join("\n");
    const sibs = siblingNames.length ? siblingNames.map(s => `  - ${s}`).join("\n") : "  (pole)";
    const system = `Sa hindad UUE L3-kategooria nime Eesti e-poe kliendile. KOLM kriteeriumi:

(1) ARUSAADAVUS + SEG-AETAVUS: kas klient saab nimest KOHE õigesti aru, MIS TOOTED seal on? Kas nimi on segi aetav mõne OLEMAS-kategooriaga või TAVAKEELE tähendusega?
   NÄIDE HALVAST: «Puiduriiulid» → klient loeb "puidust TEHTUD riiulid" (mööbel), aga tegelikult puitmaterjali HOIUSTUS-riiulid → seg-aetav → paku «Saematerjali hoiuriiulid».

(3a) TERMIN EES KEELD: nime ESIMENE sõna peab olema TAVAKEELNE ja mõistetav. Tehniline termin/lühend/mudel-kood (LiFePO4, IP65, BMS) EI tohi olla nime ALGUSES — kui vaja, läheb täpsustusena TAHA.
   NÄIDE HALVAST: «LiFePO4 energiasalvestusakud» → lühend ees → paku «Energiasalvestusakud (LiFePO4)».

(3b) SIRVIMISTASAND: kas nimi mahutab tulevased SARNASED tooted, mitte ainult praegust ainsat alltüüpi? Kui kitsas nimi välistaks naaber-variandid, paku LAIEM sirvimistasandi nimi "broader" väljale.
   NÄIDE: «Päikesepaneelide hoiu- ja kandekotid» → kitsas → broader «Päikesepaneelide tarvikud». (Laiendust kontrollime eraldi DUP vastu — sina AINULT paku.)

Hinda nime tegelike toodete vastu. Tagasta AINULT JSON:
{"understandable":true|false,"confusable_with":"<millega või null>","term_at_start":true|false,"browse_ok":true|false,"broader":"<laiem nimi või null>","proposed_name":"<parandatud nimi kui (1)/(3a) kukub, muidu null>","reason":"<1 lause>"}`;
    const user = `PAKUTUD NIMI: «${name}»

TEGELIKUD TOOTED selles L3-s:
${titles}

KÕRVAL-L3-d samas L2-s (segadus-kontroll):
${sibs}

Hinda «${name}»: (1) arusaadav+mitte-segi? (3a) termin ees? (3b) kas mahutab tulevased sarnased või peaks laiem olema?`;
    const v = await fableRaw(system, user);
    const hardFail = (v.understandable === false) || (v.term_at_start === true);
    return {
      ok: !hardFail,
      reason: v.reason || "",
      confusable_with: v.confusable_with || null,
      term_at_start: v.term_at_start === true,
      browse_ok: v.browse_ok !== false,
      broader: v.broader || null,
      proposed_name: v.proposed_name || null,
    };
  }

  // ---- über-frag + DUP värav ----
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

  // ---- vahemälu (cache objekt + onCacheSave callback) ----
  async function cachedVote(ck, i, cluster) {
    const key = `vote:${ck}:${i}`;
    if (!fresh && cache[key]) return cache[key];
    const v = await fableVote(cluster); cache[key] = v; onCacheSave(cache); return v;
  }
  async function cachedConfirm(ck, cluster) {
    const key = `confirm:${ck}`;
    if (!fresh && cache[key]) return cache[key];
    const v = await fableVote(cluster); cache[key] = v; onCacheSave(cache); return v;
  }
  async function cachedName(ck, startName, cluster, sibs) {
    const key = `name2:${ck}`;
    if (!fresh && cache[key]) return cache[key];
    const attempts = []; let name = startName; let ok = false, finalName = null;
    for (let i = 0; i < 3; i++) {
      const v = await fableNameCheck(name, cluster, sibs);
      let broadenApplied = null;
      if (v.ok && v.broader && v.broader !== name) {
        if (broadenDupOk(v.broader)) { broadenApplied = v.broader; }
      }
      attempts.push({
        name, ok: !!v.ok, reason: v.reason, confusable_with: v.confusable_with,
        term_at_start: v.term_at_start, browse_ok: v.browse_ok,
        broader: v.broader || null, broaden_applied: broadenApplied,
        broaden_dup_blocked: (v.broader && !broadenApplied) ? v.broader : null,
        proposed: v.proposed_name || null,
      });
      if (v.ok) { ok = true; finalName = broadenApplied || name; break; }
      if (!v.proposed_name || v.proposed_name === name) break;
      name = v.proposed_name;
    }
    const out = { ok, finalName, attempts };
    cache[key] = out; onCacheSave(cache); return out;
  }

  // ---- assign-enamuse / LCA fallback ----
  function fallbackHome(cluster, votes) {
    const assignVotes = [];
    if (cluster.judgeAction !== "new_l3" && cluster.judgeTarget) assignVotes.push(cluster.judgeTarget);
    if (cluster.refAction !== "new_l3" && cluster.refTarget) assignVotes.push(cluster.refTarget);
    for (const v of votes) if (v.action !== "new_l3" && v.target_handle) assignVotes.push(v.target_handle);
    const tally = {}; for (const t of assignVotes) tally[t] = (tally[t] || 0) + 1;
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) return { kind: "assign", target: top[0], note: `assign-enamus (${top[1]}×)` };
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

  // ---- peamine ahel (§2c asümmeetriline kindlus) + väravad ----
  async function resolveChain(clusters) {
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
          const f = await cachedConfirm(c.ck, c);
          c.fableConf = f;
          r.fableVotes.push({ role: "kinnitus", v: `${f.action}${f.target_handle ? " → " + f.target_handle : f.new_l3_name ? " («" + f.new_l3_name + "»)" : ""}` });
          if (f.action === "new_l3") {
            r.path = "konsensus→new_l3 (1× kinnitus ✓)";
            r.decision = "new_l3"; r.newOrigin = "konsensus";
            r.newName = c.judgeNewL3Name || f.new_l3_name || null;
            r.parentL2 = c.judgeParentL2 || f.parent_l2_handle || null;
          } else {
            const fb = fallbackHome(c, [f]);
            r.path = "konsensus→new_l3 → kinnitus VASTU → fallback";
            r.decision = fb.kind === "assign" ? `assign:${fb.target}` : fb.kind === "lca" ? `LCA-müügis: ${fb.target}-muud (L${fb.level})` : "NÄHTAMATU";
            r.signal = true; r.fallbackReason = `konsensus-new_l3 kinnitus=assign → ${fb.note}`;
          }
        } else {
          r.path = "konsensus→assign"; r.decision = `assign:${c.judgeTarget}`;
        }
      } else {
        const f1 = await cachedVote(c.ck, 0, c);
        c.fable = f1;
        r.fableVotes.push({ role: "viigimurdja", v: `${f1.action}${f1.target_handle ? " → " + f1.target_handle : f1.new_l3_name ? " («" + f1.new_l3_name + "»)" : ""} — ${f1.reason}` });
        const votes1 = [jKey, rKey, voteKey(f1.action, f1.target_handle)];
        const tally1 = {}; for (const v of votes1) tally1[v] = (tally1[v] || 0) + 1;
        const win1 = Object.entries(tally1).sort((a, b) => b[1] - a[1])[0];

        if (win1[0] === "NEW" && win1[1] >= 2) {
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
            const fb = fallbackHome(c, votes3);
            r.path = `viigimurdja→new_l3 (3× hääletus: ${newCount}/3 — enamust POLE) → fallback + signaal`;
            r.decision = fb.kind === "assign" ? `assign:${fb.target}` : fb.kind === "lca" ? `LCA-müügis: ${fb.target}-muud (L${fb.level})` : "NÄHTAMATU";
            r.signal = true; r.fallbackReason = `3× ei andnud new_l3-enamust → ${fb.note}`;
          }
        } else if (win1[1] >= 2) {
          r.path = `2-of-3 (${win1[0]})`;
          r.decision = win1[0].replace("ASSIGN:", "assign:");
        } else {
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

      if (!gates.dup.pass || !gates.uberfrag.pass) {
        const home = c.judgeAction !== "new_l3" ? c.judgeTarget : (c.candidates[0] || null);
        r.decisionFinal = home ? `assign:${home} (värav-blokk → turvaline fallback)` : "HOLD";
        r.blockedBy = blocking;
      } else if (!gates.name.pass && gates.name.pass !== null) {
        const home = c.candidates[0] || c.judgeTarget || null;
        r.decisionFinal = home ? `assign:${home} (nimi segane 3× → fallback)` : "HOLD";
        r.signal = true; r.blockedBy = ["name"];
      }
    }
    return results;
  }

  return { resolveChain, fableUsage, nodeName, GRANULAR, tree };
}
