#!/usr/bin/env node
/**
 * l3-gates.mjs — UUE L3 VARA-VÄRAVAD (SSoT, HARD RULE #5: üks transform, mitu kutsujat).
 *
 * Ekstraktitud `classify-etapp2-create.mjs`-st (2026-10-06, Task 5 shadow-hook). SAMA kood →
 * (a) ETAPP2 --execute (L3 päris-loomine) JA (b) öine shadow-hook (gates-only, EI loo).
 * Nii EI lahkne backfill ja öine hook (reegel + kontroll samast failist).
 *
 * Väravad (spec §4 + §4.5):
 *   • SEO-VÄRAV (DIRECTIVE task 1)   — kategooria-tekst ilma numbrite/lubadusteta (seoClaimGate)
 *   • PILDI-HELEDUS (DIRECTIVE task 2) — hele/valge taust, serva-luma ≥ 225 (imageBrightnessCheck)
 *   • TÄIELIKKUS (§4.5)              — 11 vara resolvitav (completenessCheck)
 *   • handle/slug + nimi-norm        — deterministlik id/handle tuletus
 *
 * Puhtad funktsioonid: NODES / existingHandles / fableRaw antakse PARAMEETRINA (ei globaali),
 * et sama moodul töötaks nii etapp2-create (plaan/execute) kui shadow-hook kontekstis.
 */

// ---- string-normaliseerimine / slug ----
export function norm(s) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
}
export function slug(s) {
  return (s || "").toLowerCase()
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/õ/g, "o").replace(/ü/g, "u").replace(/š/g, "s").replace(/ž/g, "z")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
/** DB primaarvõti uuele L3-le (etapp2-create slugId muster). */
export const slugId = (s) => "pcat_e2_" + slug(s).replace(/-/g, "").slice(0, 24);

/** deriveHandle — `${parentL2}-${slug(name)}`, disambig kui kollisioon. existingHandles = Set. */
export function deriveHandle(parentL2, name, existingHandles) {
  let base = `${parentL2}-${slug(name)}`;
  if (!existingHandles.has(base)) return { handle: base, collision: false };
  let i = 2; while (existingHandles.has(`${base}-${i}`)) i++;
  return { handle: `${base}-${i}`, collision: true };
}

// ---- SEO-VÄRAV (DIRECTIVE task 1): kategooria-tekst = KATEGOORIA TERVIKUNA ----
// KEELATUD kategooria-SEO-s: konkreetsed numbrid + tehnilised lubadused (tsüklid, mahud,
// pinged, kaitsed), mis EI kehti kõigile võimalikele toodetele selles kategoorias.
export const SEO_NUM_RE = /\d/;
export const SEO_CLAIM_RE = /\b(bms|lifepo4|li-?ion|ni-?mh|ip\d{1,2}|veekind\w*|vee-?kind\w*|waterproof|weatherproof|niiskuskind\w*|ilmastikukind\w*|roostevaba|roostekind\w*|tsükl\w*|cycle\w*|mahtuvus\w*|capacit\w*|kandevõim\w*|load[- ]?capacit\w*|tõmbetugevus\w*|tensile\w*|voolu?tugevus\w*)\b/i;
export function seoClaimGate(assets) {
  const fields = ["description_et", "description_en", "tagline_et", "tagline_en"];
  const offenders = [];
  for (const f of fields) {
    const v = assets?.[f] || "";
    if (SEO_NUM_RE.test(v)) { const m = v.match(/[\d][\d .,–\-\/]*\s*[a-zA-Z%°]*/); offenders.push(`${f}: number «${(m && m[0] || "").trim()}»`); }
    const cm = v.match(SEO_CLAIM_RE);
    if (cm) offenders.push(`${f}: lubadus «${cm[0]}»`);
  }
  return { pass: offenders.length === 0, offenders };
}

// ---- SEO + EN-nimi + pildi-kirjeldus ÜHE Fable-kutsega (§4.5 vara #3, #7, #5-kirjeldus) ----
export const SEO_RULE = `🔑 SEO-REEGEL (kohustuslik): kirjeldus+tagline kirjeldavad KATEGOORIAT TERVIKUNA, mitte üksik-toodet.
KEELATUD: KÕIK konkreetsed numbrid (nt «4000 tsüklit», «50–100 kg», «12V/24V/48V», «200 W», «550», «250 kg») JA tehnilised lubadused, mis ei kehti KÕIGILE toodetele kategoorias (nt «veekindel», «BMS-kaitse», «LiFePO4», «mahtuvus», «kandevõime», «tõmbetugevus»).
Kirjelda ÜLDISELT: mis TÜÜPI tooted, kellele, mis otstarve, mida üldiselt vaadata (ilma arvude/lubadusteta — nt «jälgi sobivat suurust ja materjali», MITTE «jälgi mahtuvust 200 Wh»).`;

/** genAssets — üks Fable-kutse (fableRaw(system,user) antakse kutsujalt). */
export async function genAssets(fableRaw, nameEt, parentEt, titles, avoidNote) {
  const system = `Sa oled XL e-poe (xlmarket.ee, Eesti) kategooria-toimetaja. Genereerid UUE tootekategooria metaandmed.
Kirjuta loomulikus, müügivalmis eesti keeles (EI masintõlge). Lühike, konkreetne, ostjale suunatud.

${SEO_RULE}

Tagasta AINULT JSON (ilma muu tekstita):
{
  "name_en": "<kategooria ingliskeelne nimi, 1-4 sõna>",
  "description_et": "<2-3 lauset KATEGOORIA kohta: mis TÜÜPI tooted siin on, kellele, mida üldiselt arvestada — ILMA numbrite/lubadusteta>",
  "description_en": "<sama inglise keeles, samad reeglid>",
  "tagline_et": "<1 lühike müügilause, kuni 8 sõna, ilma numbriteta>",
  "tagline_en": "<sama inglise keeles>",
  "image_desc_et": "<1 lause: mida kategooria-pisipilt (hele valge taust) kujutab — tüüpiline toode sellest kategooriast>"
}`;
  const user = `UUS KATEGOORIA (eesti nimi): «${nameEt}»
VANEM-KATEGOORIA: «${parentEt}»
NÄIDISTOOTED (ingliskeelsed pealkirjad):
${titles.slice(0, 6).map(t => `  • ${t}`).join("\n")}
${avoidNote ? `\n⚠️ EELMINE KATSE KUKKUS SEO-VÄRAVAST. ${avoidNote}` : ""}
Genereeri metaandmed. name_en = kategooria üldnimi (MITTE toote pealkiri). Kirjeldused müügivalmis, KATEGOORIA-tasandil, ilma numbrite/konkreetsete lubadusteta.`;
  return fableRaw(system, user);
}

/** genAssetsGated — regen kuni SEO-värav läbib (max 3×), muidu märgi kukkunuks (_seoGate). */
export async function genAssetsGated(fableRaw, nameEt, parentEt, titles) {
  let avoid = "", assets, gate;
  for (let attempt = 1; attempt <= 3; attempt++) {
    assets = await genAssets(fableRaw, nameEt, parentEt, titles, avoid);
    gate = seoClaimGate(assets);
    assets._seoGate = { pass: gate.pass, offenders: gate.offenders, attempts: attempt };
    if (gate.pass) break;
    avoid = `Eemalda KÕIK: ${gate.offenders.join("; ")}. ÄRA kasuta ühtegi numbrit ega tehnilist lubadust — kirjelda kategooriat üldiselt.`;
  }
  return assets;
}

// ---- PILDI-HELEDUS-KONTROLL (DIRECTIVE task 2): mõõdetav, MITTE silma järgi ----
// Loeb webp-faili, võtab serva-pikslid (taust) ja arvutab keskmise luminantsi 0..255.
// Hele/valge taust → luma kõrge. Tume → madal → värav kukub → regen (Gemini valge taust).
export const IMG_BRIGHT_MIN = 225;
export async function imageBrightnessCheck(filePath) {
  const sharp = (await import("sharp")).default;
  const W = 64, H = 64, B = 3;
  const { data } = await sharp(filePath).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x >= B && x < W - B && y >= B && y < H - B) continue; // ainult serv
    const i = (y * W + x) * 3;
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; n++;
  }
  const luma = n ? sum / n : 0;
  return { pass: luma >= IMG_BRIGHT_MIN, luma: Math.round(luma), min: IMG_BRIGHT_MIN };
}

/**
 * brightCheckScript — konteineri-sisene CJS heledus-skript (host-il pole sharp).
 * ETAPP2 --execute kasutab seda inline'is; eraldi export → shadow + execute sama lävi/loogika.
 * handles = massiiv webp-handle'id; väljund JSON [{h, luma}|{h,missing}].
 */
export function brightCheckScript(handles, thumbsDir = "/app/public/cat-thumbs") {
  return `
    const sharp=require('/app/node_modules/sharp'),fs=require('fs');
    const handles=${JSON.stringify(handles)};
    (async()=>{const out=[];for(const h of handles){const f='${thumbsDir}/'+h+'.webp';
      if(!fs.existsSync(f)){out.push({h,missing:true});continue;}
      const W=64,H=64,B=3;const{data}=await sharp(f).resize(W,H,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
      let s=0,n=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(x>=B&&x<W-B&&y>=B&&y<H-B)continue;const i=(y*W+x)*3;s+=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2];n++;}
      out.push({h,luma:Math.round(s/n)});}
    console.log(JSON.stringify(out));})();`;
}

// ---- §4.5 täielikkus-pre-check: kas KÕIK 11 vara on resolvitav? ----
// deps = { NODES, existingHandles }  (parameetrina → sama moodul plaan/execute/shadow jaoks)
export function completenessCheck(plan, { NODES, existingHandles }) {
  const c = [];
  const ok = (n, pass, note) => c.push({ n, pass, note });
  ok("1 handle unikaalne", !existingHandles.has(plan.handle) || plan.handleCollisionResolved, plan.handle);
  ok("2 name_et (nimevärav)", !!plan.name_et && norm(plan.name_et).length > 2, plan.name_et);
  ok("3 name_en (Fable)", !!plan.assets?.name_en, plan.assets?.name_en || "—");
  ok("4 nav parent-L2 kehtiv", !!(NODES[plan.parentL2] && NODES[plan.parentL2].level === 2), plan.parentL2);
  ok("5 pilt (CDN primaar / Gemini fallback)", plan.n >= 1, `${plan.n} toodet → top-toote CDN-pilt → webp valge taust`);
  ok("6 webp genereeritav", plan.n >= 1, `cat-thumbs/${plan.handle}.webp (build-cat-thumbs-l3.mjs)`);
  const seoFilled = ["description_et", "description_en", "tagline_et", "tagline_en"].every(k => {
    const v = plan.assets?.[k]; return v && !/^[\s—-]*products?\.?\s*$/i.test(v) && v.length > 5;
  });
  const seoClaim = plan.assets ? seoClaimGate(plan.assets) : { pass: false, offenders: ["puudub"] };
  const seoOk = seoFilled && seoClaim.pass;
  ok("7 SEO (ET+EN kirj.+tagline, kategooria-tasand, 0 numbrit/lubadust)", seoOk,
    seoOk ? "4/4 täidetud · SEO-värav läbib" : (!seoFilled ? "placeholder/tühi" : "SEO-värav: " + seoClaim.offenders.join("; ")));
  ok("8 Meili facet", plan.n >= 1, "tooted bind → reindeks → facet");
  ok("9 DB product_category rida", true, "seed/INSERT transaktsioonis (gate #4)");
  ok("10 tooted seotud (≥1)", plan.n >= 1, `${plan.n} toodet`);
  ok("11 täis-deploy", true, "genyM → Meili → push mõlemad → redeploy (§4b)");
  const fails = c.filter(x => !x.pass);
  return { checks: c, pass: fails.length === 0, fails };
}
