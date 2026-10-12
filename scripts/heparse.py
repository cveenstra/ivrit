"""Parse the Hebrew section of a rendered Wiktionary page into headword entries."""
import re
import unicodedata

from htmlkit import clean, strip_tags, tables

# Hebrew points and accents (niqqud, dagesh, shin/sin dots, cantillation, meteg, rafe).
NIQQUD = re.compile('[֑-ׇֽֿׁׂׅׄ]')
HEB = re.compile('[֐-׿יִ-ﭏ]')
HEADING = re.compile(r'<h([345])\b[^>]*id="([^"]+)"[^>]*>(.*?)</h\1>', re.S)
HEADWORD = re.compile(r'<strong class="Hebr headword"[^>]*>(.*?)</strong>', re.S)
EXAMPLE = re.compile(r'<i class="Hebr mention e-example"[^>]*>(.*?)</i>\s*―\s*<i[^>]*class="e-transliteration[^"]*"[^>]*>(.*?)</i>\s*―\s*<span class="e-translation">(.*?)</span>', re.S)
POS_NAMES = {'Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Interjection', 'Phrase', 'Preposition',
             'Conjunction', 'Numeral', 'Number', 'Particle', 'Proper noun', 'Determiner', 'Participle', 'Prefix',
             'Proverb', 'Prepositional phrase', 'Contraction', 'Letter', 'Interrogative pronoun'}


def notag(s):
    """Remove tags without inserting spaces (a headword can be several links glued together)."""
    s = re.sub(r'<(style|script|sup)\b.*?</\1>', '', s, flags=re.S)
    return clean(re.sub(r'<[^>]+>', '', s))


def strip_niqqud(s):
    return NIQQUD.sub('', unicodedata.normalize('NFC', s))


def nfc(s):
    return unicodedata.normalize('NFC', s).strip()


def entries(sec):
    """Every headword on the page: pos, pointed, plain, tr, gender, defs (list of str), examples, html."""
    heads = [(m.start(), m.group(3)) for m in HEADING.finditer(sec)]
    hws = list(HEADWORD.finditer(sec))
    out = []
    for i, m in enumerate(hws):
        start = m.start()
        end = hws[i + 1].start() if i + 1 < len(hws) else len(sec)
        # the next heading after this headword also ends its block
        for hp, _ in heads:
            if hp > start:
                end = min(end, hp)
                break
        pos = None
        for hp, title in heads:
            if hp < start and strip_tags(title) in POS_NAMES:
                pos = strip_tags(title)
        block = sec[start:end]
        text = notag(m.group(1))
        if ' / ' in text:
            plain, pointed = [nfc(x) for x in text.split(' / ', 1)]
        else:
            pointed = nfc(text)
            plain = strip_niqqud(pointed)
        line_end = block.find('<ol')
        line = block[:line_end if line_end > 0 else None]
        trm = re.search(r'class="headword-tr[^"]*"[^>]*>(.*?)</span>', line, re.S)
        tr = strip_tags(trm.group(1)) if trm else None
        gender = ' '.join(re.findall(r'<abbr title="(\w+) gender"', line)) or None
        defs, examples = [], []
        olm = re.search(r'<ol>(.*)</ol>', block, re.S)
        if olm:
            ol = olm.group(1)
            for ex in EXAMPLE.finditer(ol):
                he_html = ex.group(1)
                he = nfc(notag(he_html))
                examples.append({'he': he, 'he_html': he_html, 'tr': strip_tags(ex.group(2)), 'en': strip_tags(ex.group(3))})
            # drop nested example/quotation lists, then split top-level senses
            body = ol
            for _ in range(4):
                body = re.sub(r'<(dl|ul)\b(?:(?!<\1\b).)*?</\1>', ' ', body, flags=re.S)
            for li in re.split(r'<li\b[^>]*>', body)[1:]:
                d = strip_tags(li)
                if d:
                    defs.append(d)
        inflections = {}
        for lab, val in re.findall(r'<i>([a-z ]+)</i>\s*<b class="Hebr[^"]*"[^>]*>(.*?)</b>', line, re.S):
            inflections[lab.strip()] = strip_tags(val)
        out.append({'pos': pos, 'pointed': pointed, 'plain': plain, 'tr': tr, 'gender': gender, 'defs': defs,
                    'examples': examples, 'inflections': inflections, 'line': strip_tags(line), 'block': block})
    return out


def present_forms(block):
    """Present-tense forms from the conjugation table following a verb headword: [(slot, pointed, plain)]."""
    for t in tables(block):
        for row in t['rows']:
            if row and row[0][1].strip().lower() == 'present':
                cells = row[1:]
                break
        else:
            continue
        # re-read raw HTML of that row to get link titles (the plain spelling)
        raw_rows = re.findall(r'<tr>\s*<th[^>]*>\s*present\s*</th>(.*?)</tr>', block, re.S)
        if not raw_rows:
            return []
        tds = re.findall(r'<td[^>]*>(.*?)</td>', raw_rows[0], re.S)
        slots = ['ms', 'fs', 'mp', 'fp']
        out = []
        for slot, td in zip(slots, tds):
            text = strip_tags(td)
            tm = re.search(r'title="([^"]+)"', td)
            title = tm.group(1).replace(' (page does not exist)', '') if tm else None
            if ' / ' in text:
                plain, pointed = [nfc(x) for x in text.split(' / ', 1)]
            else:
                pointed = nfc(text)
                plain = nfc(title) if title else strip_niqqud(pointed)
            out.append((slot, pointed, plain, bool(tm and 'page does not exist' not in td)))
        return out
    return []


def def_text(e):
    return ' ; '.join(e['defs']).lower()


def matches(e, phrase):
    phrase = phrase.lower().strip()
    t = def_text(e)
    return re.search(r'(?<![a-z])' + re.escape(phrase), t) is not None
