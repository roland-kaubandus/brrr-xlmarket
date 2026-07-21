// Per-L3 spec-mall-generaator + ekstraktor (proof). LLM tuletab kanoonilise skeemi (jagatud
// sõnavara → ristlõikav järjekindlus) + ekstraktib tooted. Ei ehita prod-pipeline'i — proof.
// Käsk: node spec-mall-gen.mjs <l3-handle> [--write]   (--write → metadata.specs DB-sse)
import { execSync } from "node:child_process"
import fs from "node:fs"

// #2 ÜHIKU-GUARD — üheselt-mõistetavad kanoonilised väljad → lubatud ühik. Kui mall annab
// vale ühiku (nt grinder pinge=A), guard PARANDAB mallis → ekstraktsioon küsib õiget.
// Mitmetähenduslikke (rohk=bar VÕI pump-head=m, kiirus) EI forsseeri.
const UNIT_GUARD = {
  voimsus: "W", pinge: "V", kaal: "kg", myra: "dB", poorlemiskiirus: "RPM",
  keevitusvool: "A", ketta_labamoot: "mm", ohuvool: "L/min", vooluhulk: "L/min",
  tuulekiirus: "m/s", tuulekiirus_algus: "m/s", tuulekiirus_startup: "m/s",
  tuulekiirus_nimitootmine: "m/s", aku_maht: "Wh",
}

const KEY = process.env.ANTHROPIC_API_KEY
if (!KEY) { console.error("ANTHROPIC_API_KEY puudub"); process.exit(1) }
const L3 = process.argv[2]
const WRITE = process.argv.includes("--write")
const MODEL = "claude-haiku-4-5-20251001"
const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim()

// JAGATUD kanooniline sõnavara — SAMA võti kõigil L3-del (ristlõikav järjekindlus).
const VOCAB = `JAGATUD kanooniline sõnavara (kasuta NEID võtmeid kõigil tüüpidel kus asjakohane):
- voimsus (W) — Power/Motor Power/Horsepower/Wattage/Rated Power → W
- pinge (V) — Voltage/Rated Voltage/Frequency
- kaal (kg) — Weight/Net Weight/Item Weight (lbs→kg)
- poorlemiskiirus (RPM) — Speed/Motor Speed/Rotation/No-load Speed
- rohk (bar) — Pressure/Max Pressure (PSI/MPa→bar)
- maht (L) — Capacity/Tank Capacity/Volume (Gallon→L)
- ohuvool (Lmin) — Air Flow/Flow Rate/Exhaust Volume/CFM/SCFM → L/min
- myra (dB) — Noise/Sound Level
- maarimine — Lubrication (õlivaba/õliga)
- materjal — Material (eesti)
- ketta_labamoot (mm) — Disc/Blade/Wheel diameter (tolli→mm)
- keevitusvool (A) — Welding Current/Amperage/Output Current
- tuulekiirus (ms) — Wind Speed (start/rated)
- vooluhulk (Lmin) — vedeliku vooluhulk/Flow (pumbad)
- aku_maht (Wh) — Battery Capacity
Type-specific: lisa vajadusel oma snake_case-võti (nt keevitusprotsessid, kutus, tostejoud_kg).`

const RULES = `Ühiku-teisendus EU-metric: HP→W(×745,7), PSI→bar(÷14,504), Gallon(US)→L(×3,785), lbs→kg(×0,4536), tolli→mm(×25,4), CFM→L/min(×28,32).
SULGUDE-LIHV: "d" = metric; sulgudes originaal AINULT kui erineb (nt "750 W (1 HP)"). Kui originaal juba sama metric → ILMA suluta (nt "1800 W", MITTE "1800 W (1800W)"). "v"=number (punkt-kümnend).
Jäta väli välja kui andmet pole.`

async function llm(prompt, maxTok) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTok, messages: [{ role: "user", content: prompt }] }),
  })
  const j = await r.json()
  if (!j.content) throw new Error("API " + JSON.stringify(j).slice(0, 150))
  return { txt: j.content.map(c => c.text || "").join(""), usage: j.usage }
}
const parseJson = (t) => { const m = t.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {} }

function q(sql) { return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '~~' -f -`, { input: sql, encoding: "utf8" }).trim() }

async function main() {
  const name = q(`SELECT name FROM product_category WHERE handle='${L3}';`)
  const rows = q(`SELECT p.id||'~~'||left(p.title,60)||'~~'||left(p.description,1400) FROM product p JOIN product_category_product pcp ON pcp.product_id=p.id JOIN product_category pc ON pc.id=pcp.product_category_id WHERE pc.handle='${L3}' AND p.status='published';`)
    .split("\n").filter(Boolean).map(l => { const [id, title, desc] = l.split("~~"); return { id, title, desc } })
  console.log(`\n### ${name} (${rows.length} toodet) — ${L3}`)
  let inTok = 0, outTok = 0

  // FAAS 1: mall — #1 CACHE-REGISTRY (tuleta 1×/L3, taaskasuta → järjekindlus + feed-kindlus).
  const REG_DIR = new URL("../reports/spec-mallid/", import.meta.url)
  const regPath = new URL(`${L3}.json`, REG_DIR)
  let mall, mallSource
  if (fs.existsSync(regPath)) {
    mall = JSON.parse(fs.readFileSync(regPath, "utf8"))
    mallSource = "cache"
  } else {
    const sample = rows.slice(0, 14).map((r, i) => `${i + 1}. ${r.title}\n${(r.desc || "").slice(0, 700)}`).join("\n\n")
    const mallPrompt = `Sa oled toote-kategooria "${name}" spec-analüütik. Allpool ${Math.min(14, rows.length)} toote andmed. Tuleta VÕRDLUS-KRIITILINE kanooniline spec-skeem (mis väljad ostja võrdleks). Väljasta AINULT JSON:
{"fields":[{"key":"<snake_case, JAGATUD sõnavarast kui asjakohane>","label_et":"<ET>","unit":"<EU-metric>"}]}
${VOCAB}
Vali 4-8 KÕIGE võrreldavamat välja. Eelista jagatud sõnavara võtmeid.

TOOTED:\n${sample}`
    const mr = await llm(mallPrompt, 600); inTok += mr.usage.input_tokens; outTok += mr.usage.output_tokens
    mall = parseJson(mr.txt)
    mallSource = "tuletatud"
  }
  // #2 ÜHIKU-GUARD: paranda tuntud kanooniliste väljade ühik (nt grinder pinge=A → V).
  let guardFixes = 0
  for (const f of (mall.fields || [])) {
    const g = UNIT_GUARD[f.key]
    if (g && f.unit !== g) { f.unit_orig = f.unit; f.unit = g; guardFixes++ }
  }
  // salvesta registry (kui äsja tuletatud) — guard-parandatud kujul.
  if (mallSource === "tuletatud") {
    fs.mkdirSync(REG_DIR, { recursive: true })
    fs.writeFileSync(regPath, JSON.stringify({ l3: L3, name, fields: mall.fields }, null, 1) + "\n")
  }
  console.log(`MALL [${mallSource}${guardFixes ? `, guard-fix ${guardFixes}` : ""}]:`, (mall.fields || []).map(f => `${f.key}(${f.unit})`).join(" · "))

  // FAAS 2: ekstrakti iga toode malli järgi. Tekstiväljad (maarimine/materjal/protsess/tüüp)
  // = string; mõõdetavad = {v:number, d:"<metric-number> <ühik> (orig kui erineb)"}.
  const isText = (k) => /maarimine|materjal|protsess|tuup|tyyp|type|kutus/i.test(k)
  const fieldsDesc = (mall.fields || []).map(f => isText(f.key)
    ? `"${f.key}": "<ET string väärtus>"`
    : `"${f.key}": {"v": <metric arv>, "d": "<metric arv> ${f.unit}"}`).join(", ")
  const extracted = []
  for (const r of rows) {
    const p = `Ekstrakti "${name}" toote võrreldavad specid. Väljasta AINULT JSON skeemis {${fieldsDesc}}.
"d" ALGAB alati metric-numbriga + tühik + ühik (nt "1491,4 W", "230 V", "8 bar"); lisa TÜHIK + sulgudes ORIGINAAL AINULT kui erineb metricist (nt "1491,4 W (2 HP)"); kui originaal juba sama → ILMA suluta. Müra "d" koos ≤ kui originaalis (nt "≤63 dB"). Tekstiväli = eesti string (Oil-free→õlivaba, Steel→teras).
${RULES}
TOODE:\ntitle: ${r.title}\nkirjeldus: ${(r.desc || "").slice(0, 1300)}`
    try { const er = await llm(p, 500); inTok += er.usage.input_tokens; outTok += er.usage.output_tokens; extracted.push({ id: r.id, title: r.title, specs: parseJson(er.txt) }); process.stdout.write(".") }
    catch { extracted.push({ id: r.id, title: r.title, specs: {} }); process.stdout.write("x") }
  }
  const cost = inTok / 1e6 * 1 + outTok / 1e6 * 5
  console.log(`\nkulu: $${cost.toFixed(4)} (${rows.length} toodet) | per-toode $${(cost / rows.length).toFixed(5)}`)

  // kirjuta faili (valikuline DB)
  const out = { l3: L3, name, mall, extracted, tokens: { in: inTok, out: outTok }, cost }
  fs.writeFileSync(`/tmp/mall-${L3.slice(-20)}.json`, JSON.stringify(out, null, 1))
  if (WRITE) {
    const sql = ["BEGIN;"]
    for (const e of extracted) { if (!e.specs || !Object.keys(e.specs).length) continue; const j = JSON.stringify(e.specs).replace(/\$/g, ""); sql.push(`UPDATE product SET metadata=metadata||jsonb_build_object(${"$"}S${"$"}specs${"$"}S${"$"},${"$"}S${"$"}${j}${"$"}S${"$"}::jsonb),updated_at=now() WHERE id=${"$"}S${"$"}${e.id}${"$"}S${"$"};`) }
    sql.push("COMMIT;"); execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -v ON_ERROR_STOP=1 -q -f -`, { input: sql.join("\n") })
    console.log(`  ✓ metadata.specs kirjutatud ${extracted.filter(e => Object.keys(e.specs || {}).length).length}`)
  }
}
main().catch(e => { console.error("ERR", e.message); process.exit(1) })
