"""Build data/script.json (letters and vowel points) from Wikipedia's tables, and
data/letters.json (the Letters course: which symbols each set teaches).

Sources (fetched into scripts/source/ with curl, action=render):
  * "Hebrew alphabet": the letter table (name, Hebrew name, modern pronunciation of the name)
    and the Israeli transliteration table (sound and example word per letter).
  * "Niqqud": the vowel table (Israeli rows: name, Hebrew name, IPA, transliteration).
Each letter and vowel below states what we expect; the script reads the real values from
the tables and fails if they disagree.
"""
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from htmlkit import tables  # noqa: E402

ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, 'source')
nfc = lambda s: unicodedata.normalize('NFC', s).strip()  # noqa: E731
HEBREW = re.compile('[א-ת]')

# id, glyph, wikipedia name (row label), learner sound, shape id for tracing, note
LETTERS = [
    ('alef', 'א', 'Alef', '', 'alef', 'Silent: it carries a vowel. Between vowels it can mark a slight catch, like the break in "uh-oh".'),
    ('bet', 'בּ', 'Bet', 'b', 'bet', 'With a dot (dagesh) inside it is b.'),
    ('vet', 'ב', 'Bet', 'v', 'bet', 'Without the dot it is v. Same letter, called vet.'),
    ('gimel', 'ג', 'Gimel', 'g', 'gimel', None),
    ('dalet', 'ד', 'Dalet', 'd', 'dalet', None),
    ('he', 'ה', 'He', 'h', 'he', 'At the end of a word it is usually silent.'),
    ('vav', 'ו', 'Vav', 'v', 'vav', 'Also used as a vowel letter: וֹ is o and וּ is u.'),
    ('zayin', 'ז', 'Zayin', 'z', 'zayin', None),
    ('het', 'ח', 'Chet', 'kh', 'het', 'A throaty kh, like ch in Scottish "loch". Same sound as כ (khaf) in modern Hebrew.'),
    ('tet', 'ט', 'Tet', 't', 'tet', 'Same sound as ת (tav) in modern Hebrew.'),
    ('yod', 'י', 'Yod', 'y', 'yod', 'Also used as a vowel letter for i and e.'),
    ('kaf', 'כּ', 'Kaf', 'k', 'kaf', 'With the dot it is k.'),
    ('khaf', 'כ', 'Kaf', 'kh', 'kaf', 'Without the dot it is kh, called khaf.'),
    ('khaf-final', 'ך', 'Kaf', 'kh', 'kaf-final', 'Final form: used only at the end of a word.'),
    ('lamed', 'ל', 'Lamed', 'l', 'lamed', 'The only letter that rises above the line.'),
    ('mem', 'מ', 'Mem', 'm', 'mem', None),
    ('mem-final', 'ם', 'Mem', 'm', 'mem-final', 'Final form: used only at the end of a word.'),
    ('nun', 'נ', 'Nun', 'n', 'nun', None),
    ('nun-final', 'ן', 'Nun', 'n', 'nun-final', 'Final form: a long stroke below the line, used only at the end of a word.'),
    ('samekh', 'ס', 'Samekh', 's', 'samekh', None),
    ('ayin', 'ע', 'Ayin', '', 'ayin', 'Silent in most modern speech: it carries a vowel, like alef.'),
    ('pe', 'פּ', 'Pe', 'p', 'pe', 'With the dot it is p.'),
    ('fe', 'פ', 'Pe', 'f', 'pe', 'Without the dot it is f, called fe.'),
    ('fe-final', 'ף', 'Pe', 'f', 'pe-final', 'Final form: used only at the end of a word.'),
    ('tsadi', 'צ', 'Tsadi', 'ts', 'tsadi', 'Like ts in "cats".'),
    ('tsadi-final', 'ץ', 'Tsadi', 'ts', 'tsadi-final', 'Final form: used only at the end of a word.'),
    ('qof', 'ק', 'Qof', 'k', 'qof', 'Same sound as כּ (kaf) in modern Hebrew.'),
    ('resh', 'ר', 'Resh', 'r', 'resh', 'A soft r made at the back of the throat, like French r.'),
    ('shin', 'שׁ', 'Shin', 'sh', 'shin', 'Dot on the right: sh.'),
    ('sin', 'שׂ', 'Shin', 's', 'shin', 'Dot on the left: s. Same letter, called sin.'),
    ('tav', 'ת', 'Tav', 't', 'tav', None),
]
NAME_BY_ID = {'vet': 'Vet', 'khaf': 'Khaf', 'khaf-final': 'Final khaf', 'mem-final': 'Final mem',
              'nun-final': 'Final nun', 'fe': 'Fe', 'fe-final': 'Final fe', 'tsadi-final': 'Final tsadi', 'sin': 'Sin'}
FINALS = {'khaf': 'khaf-final', 'mem': 'mem-final', 'nun': 'nun-final', 'fe': 'fe-final', 'tsadi': 'tsadi-final'}
LOOKALIKES = [['vet', 'khaf'], ['dalet', 'resh', 'khaf-final'], ['he', 'het', 'tav'], ['vav', 'zayin', 'nun-final'],
              ['samekh', 'mem-final'], ['ayin', 'tsadi'], ['gimel', 'nun'], ['tet', 'mem'], ['bet', 'kaf', 'pe']]

# id, symbol on a placeholder letter, Wikipedia common name, learner sound
VOWELS = [
    ('kamatz', 'בָ', 'Kamatz gadol', 'a', 'a'),
    ('patach', 'בַ', 'Patach', 'a', 'a'),
    ('holam', 'בֹ', 'Holam', 'o', 'o'),
    ('holam-male', 'בוֹ', 'Holam malei', 'o', 'o'),
    ('hiriq', 'בִ', 'Hiriq', 'i', 'i'),
    ('hiriq-male', 'בִי', 'Hiriq malei', 'i', 'i'),
    ('segol', 'בֶ', 'Segol', 'e', 'e'),
    ('tsere', 'בֵ', 'Tsere', 'e', 'e'),
    ('kubutz', 'בֻ', 'Kubutz', 'u', 'u'),
    ('shuruk', 'בוּ', 'Shuruk', 'u', 'u'),
    ('shva', 'בְ', 'Shva', 'e', "e or silent"),
    ('hataf-patach', 'חֲ', 'Reduced patach', 'a', 'a'),
    ('hataf-segol', 'חֱ', 'Reduced segol', 'e', 'e'),
    ('hataf-kamatz', 'חֳ', 'Reduced kamatz', 'o', 'o'),
]
VOWEL_NOTE = {
    'kamatz': 'A T-shape under the letter. Sounds a, as in "father".',
    'patach': 'A short line under the letter. Also a: in modern Hebrew kamatz and patach sound the same.',
    'holam': 'A dot above the top left of the letter: o.',
    'holam-male': 'Vav with a dot on top, after the letter: also o. This is the form you will see most.',
    'hiriq': 'A dot under the letter: i, as in "ski".',
    'hiriq-male': 'Hiriq followed by yod: also i.',
    'segol': 'Three dots in a triangle under the letter: e, as in "bed".',
    'tsere': 'Two dots side by side under the letter: e too.',
    'kubutz': 'Three slanted dots under the letter: u, as in "flute".',
    'shuruk': 'Vav with a dot in its middle, after the letter: u. Much more common than kubutz.',
    'shva': 'Two dots one above the other. Sometimes a short e, often silent.',
    'hataf-patach': 'Shva joined with patach. A short a, mostly on throat letters like ח and ע.',
    'hataf-segol': 'Shva joined with segol. A short e, mostly at the start of words with א.',
    'hataf-kamatz': 'Shva joined with kamatz. A short o. Rare.',
}

GROUPS = [
    # (id, title, letter ids, vowel ids, tip)
    ('g1', 'בּ ב ת  ָ ַ', ['bet', 'vet', 'tav'], ['kamatz', 'patach'],
     'Hebrew is read right to left. Start with three letters and the vowel a: kamatz  ָ and patach  ַ, written under the letter.'),
    ('g2', 'א ל מ ם', ['alef', 'lamed', 'mem', 'mem-final'], [],
     'Mem has two shapes: מ inside a word, ם at the end. Alef is silent: it just carries a vowel.'),
    ('g3', 'ה ו שׁ  ֹ וֹ', ['he', 'vav', 'shin'], ['holam', 'holam-male'],
     'Now the vowel o. With these you can read שָׁלוֹם, shalom.'),
    ('g4', 'ד י נ ן  ִ ִי', ['dalet', 'yod', 'nun', 'nun-final'], ['hiriq', 'hiriq-male'],
     'The vowel i is a single dot under the letter, often followed by yod.'),
    ('g5', 'ר ס ז  ֶ ֵ', ['resh', 'samekh', 'zayin'], ['segol', 'tsere'],
     'Two ways to write e: segol (three dots) and tsere (two dots). They sound the same.'),
    ('g6', 'כּ כ ך ק  ֻ וּ', ['kaf', 'khaf', 'khaf-final', 'qof'], ['kubutz', 'shuruk'],
     'כּ with a dot is k; כ without it is kh. ק is also k. The vowel u is usually וּ.'),
    ('g7', 'ג ח ט ע  ְ', ['gimel', 'het', 'tet', 'ayin'], ['shva'],
     'ח sounds like כ (kh), ט like ת (t), and ע is silent like א. Shva  ְ is a short e or nothing.'),
    ('g8', 'פּ פ ף צ ץ', ['pe', 'fe', 'fe-final', 'tsadi', 'tsadi-final'], [],
     'Two more letters with final forms. פּ with a dot is p, פ without it is f.'),
    ('g9', 'שׂ  ֲ ֱ ֳ', ['sin'], ['hataf-patach', 'hataf-segol', 'hataf-kamatz'],
     'שׂ (dot on the left) is s. The last vowels are short ones joined to shva.'),
]
DRILLS = [
    ('d-dagesh', 'Dot or no dot: בּ/ב כּ/כ פּ/פ', 'dagesh', ['bet', 'vet', 'kaf', 'khaf', 'pe', 'fe'],
     'A dot (dagesh) in ב, כ and פ changes the sound: b/v, k/kh, p/f.'),
    ('d-finals', 'Final forms: ך ם ן ף ץ', 'finals', ['khaf', 'khaf-final', 'mem', 'mem-final', 'nun', 'nun-final', 'fe', 'fe-final', 'tsadi', 'tsadi-final'],
     'Five letters change shape at the end of a word.'),
    ('d-look1', 'Look-alikes: ב כ, ד ר ך', 'look', ['vet', 'khaf', 'dalet', 'resh', 'khaf-final'],
     'ב has a little tail at the bottom right; כ is rounded. ד has a corner; ר is rounded.'),
    ('d-look2', 'Look-alikes: ה ח ת', 'look', ['he', 'het', 'tav'],
     'ה has a gap at the top left; ח is closed; ת has a little foot.'),
    ('d-look3', 'Look-alikes: ו ז ן', 'look', ['vav', 'zayin', 'nun-final'],
     'ו has a small hook; ז a flat cap; ן drops below the line.'),
    ('d-look4', 'Look-alikes: ס ם, ע צ, ג נ, ט מ', 'look', ['samekh', 'mem-final', 'ayin', 'tsadi', 'gimel', 'nun', 'tet', 'mem'],
     'ס is round, ם is square. ע has two arms meeting at the bottom; צ has a flat base.'),
]


def letter_table():
    s = open(os.path.join(SRC, 'wp_Hebrew_alphabet.html')).read()
    ts = tables(s, 'wikitable')
    main = next(t for t in ts if t['rows'] and t['rows'][0][0][1] == 'Letter')
    rows = {}
    last_name = None
    for r in main['rows'][2:]:
        cells = [c[1] for c in r]
        if not cells or not HEBREW.search(cells[0]):
            continue
        ch = nfc(cells[0])
        name = next((c for c in cells[1:3] if re.fullmatch(r'[A-Z][a-z]+', c)), None)
        if name:
            last_name = name
        he = next((nfc(c) for c in cells[1:] if HEBREW.search(c)), None)
        if he:
            he = he.lstrip('\u0591\u0592\u0593\u0594\u0595\u0596\u0597\u0598\u0599\u059A\u059B\u059C\u059D\u059E\u059F\u05A0\u05A1\u05A2\u05A3\u05A4\u05A5\u05A6\u05A7\u05A8\u05A9\u05AA\u05AB\u05AC\u05AD\u05AE\u05AF\u05B0\u05B1\u05B2\u05B3\u05B4\u05B5\u05B6\u05B7\u05B8\u05B9\u05BA\u05BB\u05BC')
        ipa = next((c for c in cells[1:] if c.startswith('/')), None)
        rows[ch] = {'name': last_name, 'name_he': he, 'name_ipa': ipa.split(',')[0].strip() if ipa else None}
    std = next(t for t in ts if t['rows'] and t['rows'][0][0][1] == 'Hebrew letter')
    trans = {}
    for r in std['rows'][1:]:
        cells = [c[1] for c in r]
        if len(cells) < 5:
            continue
        key = cells[0]
        if '\u05F3' in key or "'" in key:
            continue  # ג׳ ז׳ צ׳: slang/loanword letters, not taught here
        for ch in re.findall('[א-ת][ְ-ׇ]?', key.split(' ')[0] + ' ' + ' '.join(key.split(',')[1:])):
            trans.setdefault(nfc(ch), {'tr': cells[3], 'ex_he': nfc(cells[1]), 'ex_en': cells[2], 'ex_tr': cells[4]})
        # "כ, ך" style keys
        for ch in re.findall('[א-ת]ּ?', key):
            trans.setdefault(nfc(ch), {'tr': cells[3], 'ex_he': nfc(cells[1]), 'ex_en': cells[2], 'ex_tr': cells[4]})
    return rows, trans


def vowel_table():
    s = open(os.path.join(SRC, 'wp_Niqqud.html')).read()
    t = next(t for t in tables(s, 'wikitable') if t['rows'] and t['rows'][0][0][1] == 'Symbol')
    out = {}
    for r in t['rows'][1:]:
        cells = [c[1] for c in r]
        if len(cells) >= 8 and cells[3].startswith('Israeli'):
            out[cells[1]] = {'symbol': nfc(cells[0]), 'name_he': nfc(cells[5]), 'ipa': cells[6], 'tr': cells[7]}
    return out


def main():
    rows, trans = letter_table()
    vt = vowel_table()
    errs = []
    letters = []
    for lid, ch, wpname, sound, shape, note in LETTERS:
        # ג ד ת: the rows without dagesh describe old fricative readings; modern names follow the dagesh row
        r = rows.get(nfc(ch + '\u05BC')) if lid in ('gimel', 'dalet', 'tav') else rows.get(nfc(ch))
        if not r:
            errs.append(f'{lid}: {ch} not in Wikipedia letter table')
            continue
        if r['name'] != wpname:
            errs.append(f'{lid}: Wikipedia names {ch} "{r["name"]}", expected "{wpname}"')
        t = trans.get(nfc(ch)) or trans.get(nfc(nfc(ch)[0] + '\u05BC')) or trans.get(nfc(ch)[0])
        # the Israeli standard writes ח as ẖ; this course uses kh for both ח and כ (they sound the same)
        if sound and t and not (t['tr'] == sound or (lid == 'het' and t['tr'] == 'ẖ')):
            errs.append(f'{lid}: Israeli transliteration of {ch} is "{t["tr"]}", expected "{sound}"')
        if not sound and t and t['tr'] not in ('none', "'"):
            errs.append(f'{lid}: expected silent, table says {t["tr"]}')
        letters.append({'id': lid, 'char': nfc(ch), 'base': nfc(ch)[0], 'name': NAME_BY_ID.get(lid, wpname),
                        'wp_name': r['name'], 'name_he': r['name_he'], 'name_ipa': r['name_ipa'],
                        'sound': sound, 'shape': shape, 'note': note, 'final_of': next((k for k, v in FINALS.items() if v == lid), None),
                        'final': FINALS.get(lid),
                        'example': {'he': t['ex_he'], 'tr': t['ex_tr'], 'en': t['ex_en']} if t and t['ex_he'] and HEBREW.search(t['ex_he']) and len(HEBREW.findall(t['ex_he'])) <= 4 else None})
    vowels = []
    for vid, sym, wpname, sound, shown in VOWELS:
        v = vt.get(wpname)
        if not v:
            errs.append(f'{vid}: "{wpname}" not in Niqqud table')
            continue
        ok_sound = sound in v['tr'].replace('ā', 'a').replace('ē', 'e').replace('ī', 'i').replace('ō', 'o').replace('ū', 'u').replace('ŏ', 'o') \
            or sound in v['ipa']
        if not ok_sound:
            errs.append(f'{vid}: Niqqud table Israeli value {v["tr"]} {v["ipa"]}, expected {sound}')
        mark = ''.join(c for c in nfc(sym) if 'ְ' <= c <= 'ׇ')
        vowels.append({'id': vid, 'shown': nfc(sym), 'mark': mark, 'carrier': 'וּ' if vid == 'shuruk' else 'וֹ' if vid == 'holam-male' else 'י' if vid == 'hiriq-male' else None,
                       'name': wpname.replace(' gadol', ''), 'name_he': v['name_he'], 'ipa': v['ipa'], 'wp_tr': v['tr'], 'sound': sound, 'sound_label': shown,
                       'note': VOWEL_NOTE[vid]})
    if errs:
        print('\n'.join(errs))
        sys.exit(1)
    byid = {x['id']: x for x in letters}
    for grp in LOOKALIKES:
        for g in grp:
            assert g in byid, g
    script = {'letters': letters, 'vowels': vowels, 'lookalikes': LOOKALIKES,
              'source': ['https://en.wikipedia.org/wiki/Hebrew_alphabet', 'https://en.wikipedia.org/wiki/Niqqud']}
    course = {'sections': [
        {'title': 'Letters and vowels', 'note': 'A few letters at a time, each with a vowel point or two, so you can read real syllables straight away.',
         'groups': [g[0] for g in GROUPS]},
        {'title': 'Drills', 'note': 'Practice sets for the tricky parts. They unlock once you have met the letters in them.',
         'groups': [d[0] for d in DRILLS]}],
        'groups': [{'id': g[0], 'title': g[1], 'letters': g[2], 'vowels': g[3], 'tip': g[4]} for g in GROUPS] +
                  [{'id': d[0], 'title': d[1], 'drill': d[2], 'letters': d[3], 'vowels': [], 'tip': d[4]} for d in DRILLS]}
    taught = [l for g in GROUPS for l in g[2]]
    assert sorted(taught) == sorted(x['id'] for x in letters), 'every letter taught exactly once'
    assert sorted(v for g in GROUPS for v in g[3]) == sorted(x['id'] for x in vowels), 'every vowel taught once'
    os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
    json.dump(script, open(os.path.join(ROOT, 'data', 'script.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(course, open(os.path.join(ROOT, 'data', 'letters.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'letters {len(letters)} vowels {len(vowels)} groups {len(GROUPS)} drills {len(DRILLS)}')


if __name__ == '__main__':
    main()
