"""Build data/items.json and data/sentences.json from Wiktionary (via wikt.py's cache).

Every item keeps only what Wiktionary confirms:
  * a Hebrew headword on the page with a sense matching the learner gloss. Each ';' part and
    each ',' alternative of the gloss is checked against the senses on its own; anything not
    found there is dropped (text in parentheses is explanation and is not matched);
  * its pointed spelling, unpointed (ktiv male) spelling, transliteration and gender;
  * a feminine form whose only sense is "feminine of X" is kept when X is already a verified
    item (counting numbers like אַחַת, and זֹאת);
  * verbs: the present-tense forms from the lemma's conjugation table; adjectives: the feminine
    singular from the headword line. Their transliteration comes from the form's own page
    when it has one, otherwise from translit.py's rules (marked tr_src="rule"), which agree
    with Wiktionary on the course's other words (rate printed below and kept in SOURCES.md).
Rejections are written to source/rejects.json and listed in SOURCES.md.
"""
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import heparse  # noqa: E402
import translit  # noqa: E402
import wikt  # noqa: E402
import wordlist  # noqa: E402
from compose import COMPOSED  # noqa: E402

ROOT = os.path.dirname(HERE)
FETCH = '--offline' not in sys.argv
SKIP_DEF = re.compile(r'^(defective spelling|excessive spelling|alternative (form|spelling)|obsolete|misspelling|plural (indefinite )?(form )?of|'
                      r'(first|second|third)-person|(masculine|feminine) (singular|plural)|construct state|dual|'
                      r'singular construct|plural construct|feminine of|masculine of)', re.I)
STOP = {'a', 'an', 'the', 'to', 'of', 'be', 'is', 'for', 'and', 'or', 'as', 'in', 'on', 'it', 'its', 'one\'s', 'm', 'f', 'sg', 'pl'}
rejects = []
stats = {'rule_tr': 0}


def nfc(s):
    return unicodedata.normalize('NFC', s or '').strip()


def tidy_tr(tr):
    tr = translit.modern(tr or '').lstrip("'")
    return re.sub(r'\s+([?!.,])', r'\1', tr).strip()


def def_words(e):
    t = heparse.def_text(e).replace('’', "'")
    return re.findall(r"[a-z']+", t)


def alt_ok(e, alt):
    """Every content word of the alternative appears (as a word, allowing plural/inflected endings) in the senses."""
    alt = re.sub(r'\([^)]*\)', ' ', alt).lower().replace('’', "'")
    allt = re.findall(r"[a-z']+", alt)
    toks = [t for t in allt if t not in STOP] or allt
    if not toks:
        return False
    words = def_words(e)
    def hit(t):
        k = t[:5] if len(t) > 5 else t
        return any(w == t or (len(t) > 3 and w.startswith(k) and abs(len(w) - len(t)) <= 3) for w in words)
    return all(hit(t) for t in toks)


def split_alts(part):
    """Split on commas that are not inside parentheses."""
    out, depth, cur = [], 0, ''
    for ch in part:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def verify_gloss(e, gloss):
    kept_parts, dropped = [], []
    for part in [p.strip() for p in gloss.split(';') if p.strip()]:
        alts = split_alts(part)
        ok = [a for a in alts if alt_ok(e, a)]
        dropped += [a for a in alts if a not in ok]
        if ok:
            kept_parts.append(', '.join(ok))
    return '; '.join(kept_parts), dropped


def lexical(e):
    return e['defs'] and not all(SKIP_DEF.match(d) for d in e['defs'])


def choose(ents, match, pos=None):
    cands = [e for e in ents if lexical(e) and e['tr'] and alt_ok(e, match)]
    if pos:
        want = {'adj': 'Adjective', 'noun': 'Noun', 'verb': 'Verb'}.get(pos, pos)
        pref = [e for e in cands if e['pos'] == want]
        if pref:
            cands = pref
    return cands[0] if cands else None


def gender_tag(g):
    if not g:
        return None
    g = g.split()
    if 'masculine' in g and 'feminine' in g:
        return 'mf'
    return 'm' if 'masculine' in g else 'f' if 'feminine' in g else None


def split_form(v):
    v = heparse.notag(v) if '<' in v else v
    if ' / ' in v:
        plain, pointed = [nfc(x) for x in v.split(' / ', 1)]
    else:
        pointed = nfc(v)
        plain = heparse.strip_niqqud(pointed)
    return plain, pointed


def form_tr(plain, pointed):
    """Transliteration of an inflected form: from its own Wiktionary page when that page has the
    same pointed spelling, otherwise by rule."""
    sec = wikt.get(plain, fetch=FETCH)
    if sec:
        for e in heparse.entries(sec):
            if nfc(e['pointed']) == nfc(pointed) and e['tr']:
                return tidy_tr(e['tr']), 'wiktionary'
    stats['rule_tr'] += 1
    return translit.translit_word(pointed, translit.form_stress(pointed)), 'rule'


def build_words():
    items, pending = [], []
    for w in wordlist.words():
        sec = wikt.get(w['title'], fetch=FETCH)
        if not sec:
            rejects.append({'id': w['id'], 'title': w['title'], 'why': 'no Hebrew entry on Wiktionary'})
            continue
        ents = heparse.entries(sec)
        e = choose(ents, w['match'], w['pos'])
        if not e:
            pending.append((w, ents))
            continue
        add_word(items, w, e)
    # second pass: "feminine of X" where X is a verified item
    by_he = {it['he']: it for it in items}
    for w, ents in pending:
        hit = None
        for e in ents:
            for d in e['defs']:
                m = re.match(r'feminine (?:singular )?of (\S+)', d)
                if m and e['tr']:
                    x = nfc(m.group(1).split('\\')[-1])
                    base = by_he.get(x) or next((it for it in items if it['plain'] == heparse.strip_niqqud(x)), None)
                    if base and alt_ok({'defs': [base['en']]}, w['match']):
                        hit = (e, base)
                        break
            if hit:
                break
        if hit:
            e, base = hit
            items.append({'id': w['id'], 'he': nfc(e['pointed']), 'plain': nfc(e['plain']), 'tr': tidy_tr(e['tr']),
                          'en': w['gloss'], 'cat': w['cat'], 'pos': (base.get('pos') or 'word'), 'gender': 'f',
                          'src': f"wiktionary:{w['title']} (feminine of {base['he']})"})
            continue
        rejects.append({'id': w['id'], 'title': w['title'], 'why': f'no sense matching "{w["match"]}"',
                        'senses': [d[:80] for x in ents for d in x['defs'][:2]][:4]})
    return items


def add_word(items, w, e):
    en, dropped = verify_gloss(e, w['gloss'])
    if not en:
        rejects.append({'id': w['id'], 'title': w['title'], 'why': f'gloss "{w["gloss"]}" not in senses',
                        'senses': e['defs'][:3]})
        return
    if dropped:
        rejects.append({'id': w['id'], 'title': w['title'], 'why': f'kept item; dropped unverified gloss: {", ".join(dropped)}', 'kept': True})
    item = {'id': w['id'], 'he': nfc(e['pointed']).rstrip('?'), 'plain': heparse.strip_niqqud(nfc(e['plain'])).rstrip('?'),
            'tr': tidy_tr(e['tr']).rstrip('?'), 'en': en, 'cat': w['cat'], 'pos': (e['pos'] or '').lower() or None,
            'gender': gender_tag(e['gender']), 'src': f"wiktionary:{w['title']}"}
    if w['informal']:
        item['informal'] = True
    items.append(item)
    infl = e['inflections']
    fem = infl.get('feminine singular') or infl.get('feminine')
    if e['pos'] == 'Adjective' and fem:
        fplain, fpointed = split_form(fem)
        ftr, how = form_tr(fplain, fpointed)
        item['form'] = 'ms'
        items.append({'id': f"{w['id']}-f", 'he': fpointed, 'plain': fplain, 'tr': ftr, 'tr_src': how,
                      'en': en.split(';')[0].split(',')[0].strip(), 'cat': w['cat'], 'pos': 'adjective', 'form': 'fs',
                      'base': w['id'], 'src': f"wiktionary:{w['title']} (feminine form on the headword line)"})


def present_after(sec, start):
    m = re.compile(r'<th scope="row" colspan="2">\s*present\s*</th>(.*?)</tr>', re.S).search(sec, start)
    if not m:
        return []
    out = []
    for slot, td in zip(['ms', 'fs', 'mp', 'fp'], re.findall(r'<td[^>]*>(.*?)</td>', m.group(1), re.S)):
        text = heparse.notag(td)
        tm = re.search(r'title="([^"]+)"', td)
        title = tm.group(1).replace(' (page does not exist)', '') if tm else None
        if ' / ' in text:
            plain, pointed = [nfc(x) for x in text.split(' / ', 1)]
        else:
            pointed = nfc(text)
            plain = nfc(title) if title else heparse.strip_niqqud(pointed)
        out.append((slot, pointed, plain))
    return out


def build_verbs():
    items = []
    for v in wordlist.verbs():
        sec = wikt.get(v['title'], fetch=FETCH)
        if not sec:
            rejects.append({'id': v['id'], 'title': v['title'], 'why': 'no Hebrew entry'})
            continue
        ents = heparse.entries(sec)
        forms, lemma, how = [], None, None
        verbs = [e for e in ents if e['pos'] == 'Verb' and lexical(e) and alt_ok(e, v['match'])]
        if verbs:
            lemma = verbs[0]
            forms = present_after(sec, sec.find(lemma['block'][:200]))
            how = 'conjugation table'
        if len(forms) < 4:
            # some modal words (צָרִיךְ need) are adjectives on Wiktionary: use their inflections
            adjs = [e for e in ents if e['pos'] == 'Adjective' and lexical(e) and alt_ok(e, v['match'])]
            if adjs:
                a = adjs[0]
                infl = a['inflections']
                fs, mp, fp = infl.get('feminine singular') or infl.get('feminine'), infl.get('masculine plural'), infl.get('feminine plural')
                if fs and mp and fp:
                    lemma = a
                    forms = [('ms', nfc(a['pointed']), nfc(a['plain']))] + [(s,) + split_form(x)[::-1] for s, x in (('fs', fs), ('mp', mp), ('fp', fp))]
                    how = 'adjective headword line'
        if len(forms) < 4 or not lemma:
            rejects.append({'id': v['id'], 'title': v['title'], 'why': f'no present-tense forms found for "{v["match"]}"'})
            continue
        en, _ = verify_gloss(lemma, v['gloss'])
        if not en:
            rejects.append({'id': v['id'], 'title': v['title'], 'why': f'gloss "{v["gloss"]}" not in senses'})
            continue
        for slot, pointed, plain in forms:
            if slot == 'ms' and nfc(pointed) == nfc(lemma['pointed']):
                tr, src = tidy_tr(lemma['tr']), 'wiktionary'
            else:
                tr, src = form_tr(plain, pointed)
            items.append({'id': f"{v['id']}-{slot}", 'he': pointed, 'plain': plain, 'tr': tr, 'tr_src': src,
                          'en': en.split(';')[0].strip(), 'cat': 'verb', 'pos': 'verb', 'form': slot,
                          'lemma': {'he': nfc(lemma['pointed']), 'tr': tidy_tr(lemma['tr'])},
                          'base': v['id'], 'src': f"wiktionary:{v['title']} ({how})"})
    return items


def harvest_examples(items):
    """Short attested usage examples (modern, translated, transliterated) from the chosen senses."""
    out, seen = [], set()
    for it in items:
        if it.get('form') in ('fs', 'mp', 'fp') or it['cat'] == 'verb':
            continue
        sec = wikt.get(it['src'].split(':', 1)[1].split(' (')[0], fetch=False) or ''
        for e in heparse.entries(sec):
            if nfc(e['pointed']) != it['he']:
                continue
            for ex in e['examples']:
                he = nfc(ex['he']).rstrip()
                if he in seen or not ex['tr'] or not ex['en']:
                    continue
                toks = he.split()
                raw_tr = re.sub(r'\s+([?!.,])', r'\1', unicodedata.normalize('NFC', ex['tr'])).strip()
                trt = raw_tr.split()
                en = re.sub(r'\s+', ' ', ex['en']).strip()
                en = re.sub(r'\s+([.?!,])', r'\1', en)
                if not (2 <= len(toks) <= 5) or len(toks) != len(trt):
                    continue
                if re.search(r'\d|:|\[|\]|\(|…|/', en) or len(en) > 60 or re.search('[֑-֯]', he):
                    continue
                if not re.search('[ְ-ֻ]', he) or '…' in he:
                    continue  # unpointed or elided examples are left out
                if re.search(r"[^a-zA-Z'áéíóú ?!.,]", raw_tr) or '-' in ex['tr']:
                    continue  # scholarly or hyphen-split transliterations are left out
                if not re.search(r'[.?!]$', en) or not re.search(r'[.?!]$', he) or raw_tr[-1:] != he[-1:]:
                    continue  # phrase fragments ("goat milk") are left out: full sentences only
                seen.add(he)
                out.append({'id': f"ex-{it['id']}-{len(out)}", 'he': he, 'tr': ' '.join(trt), 'en': en,
                            'kind': 'attested', 'src': it['src'], 'for': it['id'],
                            'tokens': [{'he': t, 'tr': r} for t, r in zip(toks, trt)]})
    return out


def build_composed(items):
    byid = {it['id']: it for it in items}
    out = []
    for c in COMPOSED:
        missing = [t for t in c['ids'] if t not in byid]
        if missing:
            rejects.append({'id': c['id'], 'title': c['en'], 'why': f'composed sentence needs missing items {missing}'})
            continue
        ws = [byid[t] for t in c['ids']]
        q = c.get('q', '')
        out.append({'id': c['id'], 'he': ' '.join(w['he'] for w in ws) + q, 'tr': ' '.join(w['tr'] for w in ws) + q,
                    'en': c['en'], 'kind': 'composed', 'ids': c['ids'], 'q': q, 'pattern': c.get('pattern')})
    return out


if __name__ == '__main__':
    items = build_words() + build_verbs()
    ids = [i['id'] for i in items]
    dup = {x for x in ids if ids.count(x) > 1}
    assert not dup, dup
    ok, bad = translit.validate(items)
    stats['translit_agree'] = ok
    stats['translit_checked'] = ok + len(bad)
    stats['translit_mismatch'] = bad
    sentences = build_composed(items) + harvest_examples(items)
    os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
    json.dump({'items': items}, open(os.path.join(ROOT, 'data', 'items.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump({'sentences': sentences}, open(os.path.join(ROOT, 'data', 'sentences.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(rejects, open(os.path.join(HERE, 'source', 'rejects.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(stats, open(os.path.join(HERE, 'source', 'stats.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'items {len(items)}  sentences {len(sentences)} (composed {sum(s["kind"] == "composed" for s in sentences)})  '
          f'rejects {len(rejects)}  rule-tr forms {stats["rule_tr"]}  translit agreement {ok}/{ok + len(bad)}')
