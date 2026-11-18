/**
 * split-semantics.mjs — grab-bag JAGAMISE semantika (Tarmo 2026-11-18, HARD RULE #5 — kehtib ka öisele masinale).
 *
 * REEGEL (kui olemasolev grab-bag L3 jagatakse):
 *   1. PÕHISEADE / domineeriv kontseptsioon JÄÄB allika-L3-sse (vajadusel ümbernimetus selgemaks → 301 automaatne).
 *   2. AINULT erinevad alamkontseptsioonid (TARVIKUD, VARUOSAD, selgelt ERI TOOTELIIK) saavad UUED L3-d allika kõrvale (sama L2).
 *   3. "Uus põhiseadme-L3" = allika duplikaat → EI looda (granulaarsus-värav viskaks selle niikuinii; me ei paku seda üldse).
 *   4. Kui alles jääb AINULT põhiseade + 0 elujõulist (≥THR) alamkontseptsiooni → JAGAMIST POLE VAJA (cancel=true, allikas jääb terveks).
 *   5. Kui allikas on PUHAS tarviku-/segasahtel ilma ühe loomuliku põhiseadmeta (nt "Kahveltõstuki lisaseadmed" — kahveltõstukit
 *      ennast siin pole), siis core=null → suurim/üldisem jääb allikasse (ümbernimetus), ülejäänud elujõulised alamkontseptsioonid lahkuvad.
 *
 * Kutsub LLM-i (opus) PER ALLIKAS, read-only. Determinism: temperatuur madal, range JSON-skeem.
 */

export function buildSemanticsPrompt({ sourceName, l2name, THR, viable, keepN, keepSample, groupTitles }) {
  const groups = viable.map(v => {
    const t = (groupTitles[v.newl3] || []).slice(0, 8).map(s => `    - ${String(s).slice(0, 90)}`).join("\n");
    return `  • «${v.newl3}» — ${v.n} toodet\n${t}`;
  }).join("\n");
  const keepLine = keepN ? `\nALLIKASSE JÄÄB juba ${keepN} toodet, mis ei sobinud ühtegi gruppi (üldised / segased)${keepSample?.length ? ":\n" + keepSample.slice(0, 5).map(s => `    - ${String(s).slice(0, 90)}`).join("\n") : "."}` : "";
  const system = `Oled e-poe taksonoomia-arhitekt. Sulle antakse ÜKS olemasolev "grab-bag" kategooria (L3), mida tahetakse jagada, ja selle sees tuvastatud tooterühmad. Otsusta JAGAMISE SEMANTIKA järgmise RANGE reegli järgi:

REEGEL:
1. PÕHISEADE / domineeriv kontseptsioon JÄÄB allika-kategooriasse (seda EI tehta uueks L3-ks). See on kategooria "identiteet" — tavaliselt põhimasin/-seade, mille ümber tarvikud ja varuosad tiirlevad, või kõige üldisem/domineerivam tooteliik.
2. AINULT selgelt ERINEVAD alamkontseptsioonid saavad uued L3-d: TARVIKUD, VARUOSAD, KULUMATERJAL, või täiesti ERI TOOTELIIK (eri kliendivajadus). Need lahkuvad allika kõrvale.
3. Kui mõni rühm ON tegelikult allika põhiseade ise (sama asi, mida allikas juba tähistab), siis see EI ole uus L3 — see on core.
4. Kui allikas on PUHAS tarviku-/segasahtel ILMA loomuliku põhiseadmeta (nt "X lisaseadmed", kus X-i ennast seal pole), vali core = kõige üldisem/suurim rühm (jääb allikasse, ümbernimetus), ülejäänud lahkuvad.
5. Kui pärast seda jääb 0 lahkuvat alamkontseptsiooni (ainult core) → cancel=true (jagamist pole vaja).

VÄLJUND — ainult JSON:
{
  "core": "<rühma täpne nimi, mis JÄÄB allikasse, VÕI null kui core on allika praegune üldidentiteet (mitte ükski rühm)>",
  "subs": ["<rühma nimi, mis saab uue L3>", ...],
  "rename": { "name_et": "<allika uus, selgem ET-nimi VÕI sama kui praegu>", "change_handle": <true kui nimi muutub oluliselt ja URL peaks muutuma, muidu false>, "reason": "<lühi>" } ,
  "cancel": <true kui subs on tühi>,
  "reasoning": "<1-2 lauset eesti keeles, miks>"
}
Reeglid väljundile: subs-nimed PEAVAD olema täpselt antud rühmanimed. Kui core on üks rühmadest, siis seda rühma EI tohi olla subs-is. Kui core=null, tähendab et allika praegune identiteet (sh KEEP-tooted) jääb — ära pane ühtegi rühma core'iks ainult suuruse pärast, kui see on selgelt eraldi alamkontseptsioon.`;
  const user = `ALLIKAS-KATEGOORIA: «${sourceName}»  (asub L2 all: «${l2name}», THR=${THR})
TUVASTATUD RÜHMAD (elujõulised, ≥THR):
${groups}${keepLine}

Otsusta reegli järgi: mis JÄÄB allikasse (core + ümbernimetus) ja mis LAHKUB uute L3-dena (subs). Vasta ainult JSON-iga.`;
  return { system, user };
}

export async function classifySplitSemantics(caller, input) {
  const { system, user } = buildSemanticsPrompt(input);
  const out = await caller(system, user);
  // valideeri: subs ⊆ viable-nimed, core ∈ viable ∪ null, core ∉ subs
  const viableNames = new Set(input.viable.map(v => v.newl3));
  const subs = (out.subs || []).filter(s => viableNames.has(s));
  let core = out.core && viableNames.has(out.core) ? out.core : null;
  const subsClean = subs.filter(s => s !== core);
  const cancel = subsClean.length === 0;
  return {
    core, subs: subsClean, cancel,
    rename: out.rename && out.rename.name_et ? { name_et: out.rename.name_et, change_handle: !!out.rename.change_handle, reason: out.rename.reason || "" } : null,
    reasoning: out.reasoning || "",
    _raw: out,
  };
}
