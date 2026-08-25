// Spec-EKSTRAKTSIOON kindlale SKU-hulgale (feed-batch skoobitud). Iga toode → LLM-parse
// description mall-väljadesse → metadata.specs. Puuduv L3-mall tuletatakse + cache'itakse.
// KAITSE: puutub AINULT SKU-failis loetletud tooteid (metadata.vevor_sku match) + AINULT specs IS NULL.
//   EI puutu kategooriaid/hindu/pilte/staatust. Jõuab L3-ni product_category_product kaudu
//   (MITTE taxonomy_node_meta join → ka meta-registreerimata uued L3 on kaetud).
// Käsk: node spec-extract-skus.mjs --skus <fail> [--concurrency 5] [--dry]
import { execSync } from "node:child_process"
import fs from "node:fs"
import { isCreditError } from "./lib/credit-guard.mjs"

// Mid-run krediidi-tõrge → DEGRADE (exit 3), MITTE fail. Shell [6] näeb rc=3 → laoseis [7] JÄTKUB.
let CREDIT_HIT = false

const KEY = process.env.ANTHROPIC_API_KEY
if (!KEY) { console.error("ANTHROPIC_API_KEY puudub"); process.exit(1) }
const MODEL = "claude-haiku-4-5-20251001"
const argv = process.argv
const argVal = (n, d) => { const i = argv.indexOf(n); return i > 0 ? argv[i + 1] : d }
const SKUS_FILE = argVal("--skus")
const CONC = parseInt(argVal("--concurrency", "5"))
const DRY = argv.includes("--dry")
if (!SKUS_FILE || !fs.existsSync(SKUS_FILE)) { console.error("--skus <fail> puudub/vigane"); process.exit(1) }
const SKUS = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map(s => s.trim()).filter(Boolean)

// Redeploy-kindlus: container-nimi MUUTUB iga Coolify redeploy'ga. Re-resolve iga write'i juures.
const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim()
let DB = getDB()
const REG_DIR = new URL("../reports/spec-mallid/", import.meta.url)

// #2 ÜHIKU-GUARD (spec-mall-gen.mjs-ga sama) — kanoonilised väljad → lubatud ühik.
const UNIT_GUARD = {
  voimsus: "W", pinge: "V", kaal: "kg", myra: "dB", poorlemiskiirus: "RPM",
  keevitusvool: "A", ketta_labamoot: "mm", ohuvool: "L/min", vooluhulk: "L/min",
  tuulekiirus: "m/s", tuulekiirus_algus: "m/s", tuulekiirus_startup: "m/s",
  tuulekiirus_nimitootmine: "m/s", aku_maht: "Wh",
}
const VOCAB = `JAGATUD kanooniline sõnavara (kasuta NEID võtmeid kõigil tüüpidel kus asjakohane):
- voimsus (W) — Power/Motor Power/Horsepower/Wattage → W
- pinge (V) — Voltage/Rated Voltage
- kaal (kg) — Weight/Net Weight (lbs→kg)
- poorlemiskiirus (RPM) — Speed/Motor Speed/No-load Speed
- rohk (bar) — Pressure/Max Pressure (PSI/MPa→bar)
- maht (L) — Capacity/Tank Capacity/Volume (Gallon→L)
- ohuvool (Lmin) — Air Flow/Flow Rate/CFM → L/min
- myra (dB) — Noise/Sound Level
- maarimine — Lubrication (õlivaba/õliga)
- materjal — Material (eesti)
- ketta_labamoot (mm) — Disc/Blade/Wheel diameter (tolli→mm)
- keevitusvool (A) — Welding Current/Amperage
- vooluhulk (Lmin) — vedeliku vooluhulk (pumbad)
- aku_maht (Wh) — Battery Capacity
Type-specific: lisa vajadusel oma snake_case-võti.`
const RULES = `Ühiku-teisendus EU-metric: HP→W(×745,7), PSI→bar(÷14,504), Gallon(US)→L(×3,785), lbs→kg(×0,4536), tolli→mm(×25,4), CFM→L/min(×28,32).
"d" ALGAB metric-numbriga + tühik + ühik (nt "1491,4 W", "8 bar"); TÜHIK + sulgudes ORIGINAAL AINULT kui erineb (nt "1491,4 W (2 HP)"); kui sama → ilma. Müra "d" koos ≤. Tekstiväli = eesti string. Jäta väli välja kui pole.`
const isText = (k) => /maarimine|materjal|protsess|tuup|tyyp|type|kutus/i.test(k)

async function llm(prompt, maxTok) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, max_tokens: maxTok, messages: [{ role: "user", content: prompt }] }) })
  const j = await r.json()
  if (!j.content) {
    const em = JSON.stringify(j).slice(0, 200)
    if (isCreditError(em)) { CREDIT_HIT = true }  // krediit → märgi degrade, throw allpool skibitakse
    throw new Error("API " + em.slice(0, 120))
  }
  return { txt: j.content.map(c => c.text || "").join(""), usage: j.usage }
}
const parseJson = (t) => { const m = t.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {} }
const psql = (sql) => {
  try { DB = getDB(); return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" }) }
  catch { DB = getDB(); return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8" }) }
}
async function pool(items, fn, n) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k) } })); return out }

// SKU-hulk temp-tabelisse → tooted (specs IS NULL) + nende L3-handle (1 kategooria/toode kinnitatud)
fs.writeFileSync("/tmp/spec-skus.txt", SKUS.join("\n"))
execSync(`docker cp /tmp/spec-skus.txt ${DB}:/tmp/spec-skus.txt`)
const raw = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -f -`, { encoding: "utf8", maxBuffer: 1 << 30, input: `
CREATE TEMP TABLE _spec_skus(sku text); \\copy _spec_skus FROM '/tmp/spec-skus.txt'
SELECT jsonb_build_object('id',p.id,'l3',pc.handle,'name',pc.name,'title',p.title,'desc',left(regexp_replace(p.description,E'[\\n\\r]+',' ','g'),1300))::text
FROM product p
JOIN product_category_product pcp ON pcp.product_id=p.id
JOIN product_category pc ON pc.id=pcp.product_category_id
WHERE p.deleted_at IS NULL AND p.metadata->>'vevor_sku' IN (SELECT sku FROM _spec_skus) AND p.metadata->'specs' IS NULL
ORDER BY pc.handle;` })
const byL3 = new Map(); const l3name = {}
for (const line of raw.trim().split("\n")) { if (!line || !line.startsWith("{")) continue; let r; try { r = JSON.parse(line) } catch { continue }; if (!byL3.has(r.l3)) byL3.set(r.l3, []); byL3.get(r.l3).push(r); l3name[r.l3] = r.name }
const l3s = [...byL3.keys()]
const totalP = [...byL3.values()].reduce((a, b) => a + b.length, 0)
console.log(`SKU sisend: ${SKUS.length} | L3 ekstraktimiseks: ${l3s.length} | tooteid (specita): ${totalP}${DRY ? " [DRY]" : ""}`)

let doneP = 0, specced = 0, empty = 0, fails = 0, inTok = 0, outTok = 0, derived = 0
const newMalls = [], anomalies = []
for (const l3 of l3s) {
  if (CREDIT_HIT) break  // krediit sai otsa → lõpeta graatsiliselt (jäänud tooted jäävad specs IS NULL → re-run)
  const regPath = new URL(`${l3}.json`, REG_DIR)
  let mall, source
  if (fs.existsSync(regPath)) { mall = JSON.parse(fs.readFileSync(regPath, "utf8")); source = "cache" }
  else {
    // TULETA mall (5 uut L3). Sample = selle L3 tooted (kõik uued).
    const prods0 = byL3.get(l3)
    const sample = prods0.slice(0, 14).map((r, i) => `${i + 1}. ${r.title}\n${(r.desc || "").slice(0, 700)}`).join("\n\n")
    const mallPrompt = `Sa oled toote-kategooria "${l3name[l3]}" spec-analüütik. Allpool ${Math.min(14, prods0.length)} toote andmed. Tuleta VÕRDLUS-KRIITILINE kanooniline spec-skeem (mis väljad ostja võrdleks). Väljasta AINULT JSON:
{"fields":[{"key":"<snake_case, JAGATUD sõnavarast kui asjakohane>","label_et":"<ET>","unit":"<EU-metric>"}]}
${VOCAB}
Vali 4-8 KÕIGE võrreldavamat välja. Eelista jagatud sõnavara võtmeid.

TOOTED:\n${sample}`
    let mr
    try { mr = await llm(mallPrompt, 600) }
    catch (e) { if (CREDIT_HIT) break; anomalies.push(`${l3}: mall-tuletus fail ${String(e.message).slice(0, 60)}`); continue }
    inTok += mr.usage.input_tokens; outTok += mr.usage.output_tokens
    mall = parseJson(mr.txt); source = "tuletatud"
    let guardFixes = 0
    for (const f of (mall.fields || [])) { const g = UNIT_GUARD[f.key]; if (g && f.unit !== g) { f.unit_orig = f.unit; f.unit = g; guardFixes++ } }
    if (!DRY) { fs.mkdirSync(REG_DIR, { recursive: true }); fs.writeFileSync(regPath, JSON.stringify({ l3, name: l3name[l3], fields: mall.fields }, null, 1) + "\n") }
    derived++
    newMalls.push({ l3, name: l3name[l3], fields: (mall.fields || []).map(f => `${f.key}(${f.unit})`), guardFixes })
    console.log(`  MALL TULETATUD [${l3name[l3]}] guard-fix ${guardFixes}: ${(mall.fields || []).map(f => `${f.key}(${f.unit})`).join(" · ")}`)
  }
  const fieldsDesc = (mall.fields || []).map(f => isText(f.key) ? `"${f.key}": "<ET string>"` : `"${f.key}": {"v": <metric arv>, "d": "<metric arv> ${f.unit}"}`).join(", ")
  if (!fieldsDesc) { anomalies.push(`${l3}: mall tühi`); continue }
  const prods = byL3.get(l3)
  const results = await pool(prods, async (p) => {
    const prompt = `Ekstrakti "${mall.name || l3name[l3]}" toote võrreldavad specid. Väljasta AINULT JSON {${fieldsDesc}}.\n${RULES}\nTOODE:\ntitle: ${p.title}\nkirjeldus: ${(p.desc || "").slice(0, 1300)}`
    try { const er = await llm(prompt, 450); inTok += er.usage.input_tokens; outTok += er.usage.output_tokens; return { id: p.id, specs: parseJson(er.txt) } }
    catch (e) { fails++; return { id: p.id, specs: {}, err: e.message } }
  }, CONC)
  const sql = ["BEGIN;"]
  for (const r of results) {
    doneP++
    if (!r.specs || !Object.keys(r.specs).length) { empty++; if (anomalies.length < 60) anomalies.push(`${l3}/${r.id}${r.err ? " ERR" : " tühi"}`); continue }
    specced++
    const j = JSON.stringify(r.specs).replace(/\$/g, "")
    sql.push(`UPDATE product SET metadata=metadata||jsonb_build_object($S$specs$S$,$S$${j}$S$::jsonb),updated_at=now() WHERE id=$S$${r.id}$S$;`)
  }
  sql.push("COMMIT;")
  if (!DRY && sql.length > 2) { try { psql(sql.join("\n")) } catch (e) { console.error(`SQL-fail ${l3}: ${e.message.slice(0, 80)}`) } }
}
const cost = inTok / 1e6 + outTok / 1e6 * 5
fs.writeFileSync("/tmp/spec-extract-956-anomalies.txt", anomalies.join("\n"))
console.log(`\nVALMIS${DRY ? " [DRY]" : ""}: tooteid ${doneP} | specced ${specced} | tühi ${empty} | fail ${fails} | uusi malle ${derived} | kate ${totalP ? (specced / totalP * 100).toFixed(1) : 0}% | kulu $${cost.toFixed(2)}`)
if (newMalls.length) { console.log("\nUUED MALLID:"); for (const m of newMalls) console.log(`  ${m.name}: ${m.fields.join(" · ")}${m.guardFixes ? ` [guard ${m.guardFixes}]` : ""}`) }

// KREDIIT-DEGRADE (exit 3): krediit sai jooksu ajal otsa → EI ole "fail". Juba-specced tooted salvestatud;
// jäänud (specs IS NULL) ootavad re-run'i. Shell [6] näeb rc=3 → laoseis [7] JÄTKUB (degrade-kaskaad).
if (CREDIT_HIT) {
  const pending = totalP - specced
  console.log(`CREDIT_DEGRADE=1`)
  console.log(`CREDIT_PENDING=${pending}`)
  console.error(`💳 KREDIIT-DEGRADE [6]: krediit sai jooksu ajal otsa — ${pending} toodet ootab spec-ekstraktsiooni (re-run kui krediit tagasi).`)
  process.exit(3)
}
