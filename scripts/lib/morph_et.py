#!/usr/bin/env python3
"""morph_et SSoT transform (HARD RULE #5 — üks transform, kaks kutsujat).

Eesti liitsõna-otsingu KIHT 1 (deterministlik, EstNLTK/Vabamorf).
Kutsujad: (a) backfill/apply runner `scripts/morph-et-apply.mjs` kogu korpusel,
          (b) öine hook (import-pipeline.sh) delta-SKU-del. SAMA kood → ei lahkne.

Kaks väljundit samast korpusest:
  --out-morph  {id: "morph_et string"}  → läheb Postgres metadata.morph_et → Meili searchable
  --out-qmap   {lemma:{surface:lemma}, head:{surface:head}, comp:[lexikon]}  → storefront päringu-pool

Sisend: ndjson, üks rida = {"id": "...", "text": "title_et (+ kategooriad)"}

morph_et = iga sõna terve lemma + liitsõna KOMPONENDID (split root '_'-piiril, ≥3 tähte)
           + käände-lemma. Komponent-indeks annab liitsõna-teise-poole tabamuse
           (ahi leiab elektriahi) ILMA substring-mürata (lahing ei tule ahi alla).
Päringu-pool = AINULT lemma (komponent-split üle-laiendaks); head = varuvariant (null-fallback).
"""
import sys, json, re, argparse
from estnltk import Text
from estnltk.vabamorf.morf import synthesize

MIN = 3  # komponendi min pikkus (over-broadening guard — proven DRY 2026-11-17)
WORD_RE = re.compile(r"[A-Za-zÄÖÜÕŠŽäöüõšž]{2,}")
STOP = {"ja", "ning", "või", "koos", "ilma", "jaoks", "kohta", "pcs", "set", "tk",
        "kg", "cm", "mm", "the", "and", "for", "with"}


def analyze_word(word):
    """Tagasta (lemma, components, head). lemma=terve liitsõna-lemma ilma piirideta;
    components=lemma+komponendid (≥3 tähte); head=VIIMANE komponent (eesti liitsõna
    on head-final → põhisõna on viimane) või lemma kui lihtsõna."""
    out_lemma, out_comp, out_head = set(), set(), {}
    t = Text(word)
    t.tag_layer(['morph_analysis'])
    for w in t.morph_analysis:
        for r in list(w.root):
            if not r:
                continue
            L = str(r).replace('=', '')
            parts = [p for p in L.split('_') if p]
            if not parts:
                continue
            joined = ''.join(parts).lower()
            if len(joined) >= MIN:
                out_lemma.add(joined)
                out_comp.add(joined)
            if len(parts) > 1:
                for p in parts:
                    pl = p.lower()
                    if len(pl) >= MIN:
                        out_comp.add(pl)
                head = parts[-1].lower()  # head-final
                if len(head) >= MIN and len(joined) >= MIN:
                    out_head[joined] = head
    return out_lemma, out_comp, out_head


def tokens_for_text(txt, cache):
    """morph_et komponendid ühele tekstile (vahemälu per unikaalsõna)."""
    toks = set()
    for m in WORD_RE.findall(txt or ""):
        key = m.lower()
        if key not in cache:
            _, comp, _ = analyze_word(key)
            cache[key] = comp
        toks |= cache[key]
    return {t for t in toks if t not in STOP}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--docs", required=True, help="sisend ndjson {id,text}")
    ap.add_argument("--out-morph", required=True)
    ap.add_argument("--out-qmap", required=True)
    args = ap.parse_args()

    docs = []
    with open(args.docs) as f:
        for line in f:
            line = line.strip()
            if line:
                docs.append(json.loads(line))
    print(f"[morph_et] docs={len(docs)}", file=sys.stderr)

    cache = {}
    # 1) morph_et per doc
    with open(args.out_morph, "w") as out:
        out.write("{")
        first = True
        for d in docs:
            toks = tokens_for_text(d.get("text", ""), cache)
            if not first:
                out.write(",")
            first = False
            out.write(json.dumps(str(d["id"])) + ":" +
                      json.dumps(" ".join(sorted(toks)), ensure_ascii=False))
        out.write("}")
    print(f"[morph_et] out-morph: {args.out_morph} (unikaalsõnu cache={len(cache)})", file=sys.stderr)

    # 2) query-map: lemma (surface->lemma), head (surface->head), comp (lexikon)
    lemma_map, head_map, comp_lex = {}, {}, set()
    # 2a) korpuse surface-vormid -> lemma/head/comp
    for key in list(cache.keys()):
        lem, comp, head = analyze_word(key)
        comp_lex |= comp
        if lem:
            lemma_map[key] = sorted(lem)[0] if len(lem) == 1 else sorted(lem)[0]
        for j, h in head.items():
            head_map[j] = h
    # 2b) süntees: iga lemma käänded (sg/pl n/g/p + lühike sisseütlev) -> lemma
    #     (nii leiab "ahjud"->ahi, "pumbad"->pump runtime'is ilma Pythonita)
    distinct_lemmas = set(lemma_map.values()) | set(head_map.keys()) | set(head_map.values())
    for lemma in distinct_lemmas:
        if len(lemma) < MIN:
            continue
        for case in ('sg n', 'sg g', 'sg p', 'pl n', 'pl g', 'pl p', 'adt'):
            try:
                for surf in synthesize(lemma, form=case, partofspeech='S'):
                    s = surf.lower().strip()
                    if s and s not in lemma_map:
                        lemma_map[s] = lemma
            except Exception:
                pass
    # kärbi identsus-kirjed (surface==lemma) — runtime teeb lemma_map[w] || w
    lemma_map = {s: l for s, l in lemma_map.items() if s != l}
    comp_lex = {c for c in comp_lex if len(c) >= MIN and c not in STOP}
    qmap = {"lemma": lemma_map, "head": head_map, "comp": sorted(comp_lex)}
    with open(args.out_qmap, "w") as out:
        json.dump(qmap, out, ensure_ascii=False)
    print(f"[morph_et] out-qmap: {args.out_qmap} "
          f"(lemma={len(lemma_map)} head={len(head_map)} comp={len(comp_lex)})", file=sys.stderr)


if __name__ == "__main__":
    main()
