// SSoT: Meili-filtri valideerimine + parsimine (zero-dep, testitav node --test
// --experimental-strip-types'iga — EI impordi `@/`-aliast ega bare-pakette).
// Tarbijad: app/api/products/route.ts (parseFilter), lib/meilisearch.ts
// (escapeMeiliFilterValue/isSafeHandleToken re-eksport + sisemine kasutus) +
// kõik senised escape/handle-token importijad meilisearch.ts kaudu.

/** Escape a value for safe inclusion in a MeiliSearch filter string */
export function escapeMeiliFilterValue(v: string): string {
  return String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

/** Whitelist-validate a handle-like token (alnum + dash + underscore). */
export function isSafeHandleToken(v: string): boolean {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,127}$/i.test(v)
}

// Allowlist filter fields — each accepts a safe token value or a boolean.
// This replaces raw filter pass-through which allowed attacker to probe any
// indexed field with arbitrary operators.
export const ALLOWED_FILTER_FIELDS = new Set([
  // `categories` = kategooria-NIMED (otsingu-lehe facet + chip-id on nime-põhised).
  // Kategooria-leht kasutab `taxonomy.ancestors` (handle). Mõlemad lubatud.
  "categories", "category_handles", "taxonomy.ancestors", "taxonomy.l1_slug",
  "taxonomy.l2_slug", "taxonomy.l3_slug", "vertical_slugs",
  "in_stock", "brand",
  // filter_tokens = quick-filtrite + brändi AINUS filtri-mehhanism (brand:<slug>, material:x,
  //   power_w:1500W+ jne). `brand` EI ole Meilis filterable → brändi/quick-filter grid tuli AINULT
  //   filter_tokens kaudu, aga see puudus → iga chip/brändi-klikk andis klient-gridis 400
  //   "Invalid filter" → 0 toodet. Väärtust valideerib isSafeFilterToken + escapeMeiliFilterValue.
  "filter_tokens",
])

// Numbri-vahemiku väljad = AINULT `price` (Meili numbriväli). otsing/kategooria server-page
// ehitab `price >= N` / `price <= N` (min/max-filter, "clearance" sort) ja liidab need
// searchFilterStr'i → klient-grid saadab /api/products?filter=... Vana parseFilter regex lubas
// AINULT `=` → range-osad kukkusid VAIKSELT välja (ainsa filtrina → 400 "Invalid filter", grid
// tühi; koos kategooria-chipiga → hind lihtsalt eirati). SAMA bugi-klass mis filter_tokens 400.
export const ALLOWED_RANGE_FIELDS = new Set(["price"])

// Kategooria-NIMED sisaldavad tuhikuid + eesti tahti (nt "Autovaruosad ja -tarvikud")
// -> isSafeHandleToken lukkab need tagasi. Luba piiratud prinditav nimi; injection'i
// hoiab ara escapeMeiliFilterValue push-hetkel. Kontrolli-margid + jutumark + kaldkriips valja.
export function isSafeCategoryName(v: string): boolean {
  if (typeof v !== "string" || v.length < 1 || v.length > 200) return false
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i)
    if (c < 0x20 || c === 0x22 || c === 0x5c) return false // kontrollmark, " voi \
  }
  return true
}

// filter_tokens väärtus = "<key>:<value>", nt brand:vevor, material:carbon-steel, power_w:1500W+.
// Tähemärgistik (indeksi tegelik SSoT): alnum + `_ . + -` mõlemal pool üht koolonit. Tühikut/jutumärki/
// kaldkriipsu EI luba (injection'i katab lisaks escapeMeiliFilterValue push-hetkel). isSafeHandleToken
// ei sobi (ei luba koolonit) → eraldi värav just filter_tokens'ile.
export function isSafeFilterToken(v: string): boolean {
  return typeof v === "string" && /^[a-z0-9_]{1,40}:[a-z0-9_.+-]{1,80}$/i.test(v)
}

// Meili numbri-võrdlus = JUTUMÄRGITA (`price >= 50`), erinevalt stringi-võrdusest. Väärtus peab
// olema mittenegatiivne lõplik kümnend-arv — regex lukustab mis tahes mitte-numbri (injection,
// NaN, teadusmärge) → ei saa Meili-filtrisse valideerimata stringi lisada. Tagastab arvu või null.
export function parseRangeValue(v: string): number | null {
  if (!/^[0-9]+(?:\.[0-9]+)?$/.test(v)) return null
  const n = parseFloat(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// Parsi klient-gr1di `filter=`-string → Meili-filtri massiiv (";"=AND). Iga osa on kas
//   võrdus `väli = "väärtus"` / boolean, VÕI numbri-vahemik `väli <= N` / `väli >= N`.
// Mitte-valideeruv osa kukutatakse; kõik kukkus + raw oli antud → kutsuja annab 400.
export function parseFilter(raw: string | null): string[] | undefined {
  if (!raw) return undefined
  const out: string[] = []
  for (const part of raw.split(";")) {
    const trimmed = part.trim()
    const eq = trimmed.match(/^([a-zA-Z0-9_.]+)\s*=\s*"?([^"]*)"?$/)
    if (eq) {
      const [, field, value] = eq
      if (!ALLOWED_FILTER_FIELDS.has(field)) continue
      if (value === "true" || value === "false") {
        out.push(`${field} = ${value}`)
      } else if (
        field === "categories" ? isSafeCategoryName(value)
        : field === "filter_tokens" ? isSafeFilterToken(value)
        : isSafeHandleToken(value)
      ) {
        out.push(`${field} = "${escapeMeiliFilterValue(value)}"`)
      }
      continue
    }
    // Numbri-vahemik: `<field> <= N` / `<field> >= N` (väljanimi-klass ei haara ">"/"<",
    // seega võrdus-regex ei false-matchi seda ega vastupidi). Ainult allowlist-väli + valid arv.
    const rng = trimmed.match(/^([a-zA-Z0-9_.]+)\s*(<=|>=)\s*([^"]*)$/)
    if (rng) {
      const [, field, op, rawVal] = rng
      if (!ALLOWED_RANGE_FIELDS.has(field)) continue
      const n = parseRangeValue(rawVal.trim())
      if (n !== null) out.push(`${field} ${op} ${n}`)
    }
  }
  return out.length ? out : undefined
}
