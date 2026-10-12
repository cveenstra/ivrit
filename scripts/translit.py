"""Rule-based transliteration of pointed modern Hebrew, in the style of Wiktionary's modern scheme.

Used ONLY for inflected forms that have no Wiktionary page of their own (most present-tense
verb forms and feminine adjectives). The rules are checked against every word in the course
that does have a Wiktionary transliteration (see `validate()`); the agreement rate is printed
by build_data.py and recorded in SOURCES.md, and generated forms are marked tr_src="rule".

Simplifications, stated honestly:
  * vocal shva is written without Wiktionary's apostrophe (m'dabér -> medabér is written medabér);
    Wiktionary itself is inconsistent here (okhlím but yosh'vím), so comparisons ignore apostrophes;
  * stress is placed by the participle/adjective pattern: the last syllable, except feminine
    singular forms ending in -et/-at, which stress the one before (okhélet, yodá'at).
"""
import re
import unicodedata

SHVA, HPATAH, HSEGOL, HQAMATS = 'ְ', 'ֲ', 'ֱ', 'ֳ'
HIRIQ, TSERE, SEGOL, PATAH, QAMATS, HOLAM, QUBUTS = 'ִ', 'ֵ', 'ֶ', 'ַ', 'ָ', 'ֹ', 'ֻ'
HOLAM_HASER_VAV = 'ֺ'
DAGESH, SHIN_DOT, SIN_DOT, QAMATS_QATAN = 'ּ', 'ׁ', 'ׂ', 'ׇ'
VOWEL = {PATAH: 'a', QAMATS: 'a', HPATAH: 'a', SEGOL: 'e', HSEGOL: 'e', TSERE: 'e', HIRIQ: 'i', HOLAM: 'o',
         HOLAM_HASER_VAV: 'o', QUBUTS: 'u', HQAMATS: 'o', QAMATS_QATAN: 'o'}
CONS = {'ג': 'g', 'ד': 'd', 'ז': 'z', 'ח': 'kh', 'ט': 't', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n',
        'ס': 's', 'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ת': 't', 'י': 'y', 'ה': 'h', 'ו': 'v'}
SOFT = {'ב': ('b', 'v'), 'כ': ('k', 'kh'), 'ך': ('k', 'kh'), 'פ': ('p', 'f'), 'ף': ('p', 'f')}


def clusters(word):
    word = unicodedata.normalize('NFD', word)
    out = []
    for ch in word:
        if 'א' <= ch <= 'ת':
            out.append([ch, set()])
        elif out and '֑' <= ch <= 'ׇ':
            out[-1][1].add(ch)
    return out


def translit_word(word, stress=None):
    """stress: None (no accent), 'final', or 'penult'."""
    cl = clusters(word)
    syl = []  # list of (consonant, vowel) parts
    furtive = set()  # vowel slots that never take stress (furtive patah: yodéa, rúakh)
    n = len(cl)
    i = 0
    prev_vowel = False
    while i < n:
        ch, marks = cl[i]
        last = i == n - 1
        vowel = next((VOWEL[m] for m in marks if m in VOWEL), None)
        prev_has_vowel = i > 0 and any(m in VOWEL for m in cl[i - 1][1])
        other_vowel = any(m in VOWEL for m in marks if m not in (HOLAM, HOLAM_HASER_VAV))
        # vav as a vowel letter: holam male וֹ and shuruk וּ
        if ch == 'ו' and (HOLAM in marks or HOLAM_HASER_VAV in marks) and not other_vowel and i > 0 and not prev_has_vowel:
            syl.append(('', 'o')); prev_vowel = True; i += 1; continue
        if ch == 'ו' and DAGESH in marks and not vowel and (i == 0 or not prev_has_vowel):
            syl.append(('', 'u')); prev_vowel = True; i += 1; continue
        # yod after hiriq/tsere with no vowel of its own: part of the vowel
        if ch == 'י' and not vowel and i > 0 and HIRIQ in cl[i - 1][1]:
            i += 1; continue
        if ch == 'י' and not vowel and i > 0 and TSERE in cl[i - 1][1]:
            i += 1; continue
        # consonant value
        if ch in SOFT:
            c = SOFT[ch][0] if DAGESH in marks else SOFT[ch][1]
        elif ch == 'ש':
            c = 's' if SIN_DOT in marks else 'sh'
        elif ch in ('א', 'ע'):
            c = "'" if (vowel and prev_vowel and not last) else ''
        elif ch == 'ה' and last and DAGESH not in marks and not vowel:
            c = ''
        else:
            c = CONS.get(ch, '')
        # furtive patah under final ח / ע: the a comes first (ruakh, yodéa)
        if last and ch in ('ח', 'ע', 'ה') and PATAH in marks and prev_vowel:
            furtive.add(len(syl))
            syl.append(('', 'a'))
            if c and ch != 'ע':
                syl.append((c, ''))
            prev_vowel = False
            i += 1
            continue
        if vowel is None and SHVA in marks:
            # vocal shva at the start of a word, or under the second of two shvas
            # vocal shva at the start of a word: Wiktionary writes it as an apostrophe (b'vakashá, m'dabér)
            syl.append((c + ("'" if i == 0 and not last else ''), ''))
            prev_vowel = False
        else:
            syl.append((c, vowel or ''))
            prev_vowel = bool(vowel)
        i += 1
    # place stress on a vowel
    vidx = [k for k, (_, v) in enumerate(syl) if v and k not in furtive]
    if stress and vidx:
        k = vidx[-1] if stress == 'final' or len(vidx) < 2 else vidx[-2]
        c, v = syl[k]
        syl[k] = (c, unicodedata.normalize('NFC', v[0] + '́') + v[1:])
    return ''.join(c + v for c, v in syl)


def form_stress(pointed):
    """Participle / adjective pattern: penultimate for feminine -et/-at, otherwise final."""
    w = unicodedata.normalize('NFD', pointed)
    letters = [c for c in w if 'א' <= c <= 'ת']
    if len(letters) >= 2 and letters[-1] == 'ת':
        # vowel under the letter before final ת
        m = re.search(r'([א-ת])([֑-ׇ]*)ת[֑-ׇ]*$', w)
        if m and (SEGOL in m.group(2) or PATAH in m.group(2)):
            return 'penult'
    return 'final'


def modern(tr):
    """Wiktionary sometimes gives a scholarly and a modern reading ('ʾōḵəlīm/okhlím') or several
    variants ('avatíakh, 'avaṭṭíaḥ'); keep the modern, first one, in this course's spelling."""
    cands = [c.strip() for c in re.split(r'[/,]', tr) if c.strip()]
    plain = [c for c in cands if re.fullmatch(r"[a-zA-Z'’áéíóúḥ \-]+", unicodedata.normalize('NFC', c))]
    tr = (plain[0] if plain else cands[-1]) if cands else tr
    tr = unicodedata.normalize('NFC', tr)
    for a, b in (('ḥ', 'kh'), ('ḵ', 'kh'), ('ch', 'kh'), ('q', 'k'), ('ṭ', 't'), ('ṣ', 'ts'), ('ʔ', "'"), ('ʾ', "'"), ('ʿ', "'"), ('ɔ', 'o')):
        tr = tr.replace(a, b)
    return tr


def norm(tr):
    tr = modern(tr)
    tr = unicodedata.normalize('NFD', tr)
    tr = re.sub(r'[̀-ͯ]', '', tr)
    return re.sub(r"['’ʼ\s\-.]", '', tr.lower()).replace('ai', 'ay')


def stress_of(tr):
    tr = unicodedata.normalize('NFD', tr.split('/')[-1])
    vowels = [m.start() for m in re.finditer(r'[aeiou]', tr)]
    acc = [m.start() for m in re.finditer('́', tr)]
    if not acc or not vowels:
        return None
    pos = [v for v in vowels if v < acc[0]]
    k = len(pos) - 1
    return 'final' if k == len(vowels) - 1 else 'penult' if k == len(vowels) - 2 else 'other'


def validate(items):
    """Compare generated vs Wiktionary transliteration (ignoring accents and apostrophes)."""
    ok, bad = 0, []
    for it in items:
        if ' ' in it['he'] or it.get('tr_src') == 'rule':
            continue
        g = translit_word(it['he'])
        if norm(g) == norm(it['tr']) or norm(g.replace("'", 'e')) == norm(it['tr']):
            ok += 1
        else:
            bad.append((it['he'], it['tr'], g))
    return ok, bad
