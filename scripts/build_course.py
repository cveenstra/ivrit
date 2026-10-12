"""Build data/course.json: units of small lessons over the verified items.

Lessons introduce at most 4 new items (the first only 3). Verbs come one verb per lesson (its
four present-tense forms); adjectives two per lesson (masculine and feminine). Each sentence is
placed in the first lesson by which all of its words have been introduced.
Ids listed here that are not in items.json (rejected by build_data.py) are skipped.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
items = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items']}
sentences = json.load(open(os.path.join(ROOT, 'data', 'sentences.json')))['sentences']

ADJ = lambda *ids: [[i, f'{i}-f'] for i in ids]  # noqa: E731
VERB = lambda *ids: [[f'{v}-{s}' for s in ('ms', 'fs', 'mp', 'fp')] for v in ids]  # noqa: E731

# (id, title, subtitle, header item, icon, chunks). A chunk is a list of ids that must stay
# together (one verb's forms, an adjective pair); chunks are packed into lessons of <= 4.
UNITS = [
    ('u1', 'Shalom!', 'Hello, thanks, yes and no', 'hello', '👋',
     [['hello'], ['thanks'], ['yes'], ['no'], ['please'], ['excuse-me'], ['goodbye'], ['good-morning'], ['good-evening'],
      ['good-night'], ['thanks-a-lot'], ['nice-to-meet'], ['welcome']]),
    ('u2', 'Me & you', 'I, you, he and she: every one has a gender', 'i', '🧑',
     [['i'], ['you-m'], ['you-f'], ['he'], ['she'], ['we'], ['you-mp'], ['you-fp'], ['they-m'], ['they-f'],
      ['man'], ['woman'], ['boy'], ['girl'], ['name'], ['friend-m'], ['friend-f'], ['person']]),
    ('u3', 'Everyday talk', 'Okay, yalla, cool: how Israelis really talk', 'okay', '💬',
     [['okay'], ['yalla'], ['sababa'], ['achla'], ['bye'], ['whats-up'], ['fine'], ['really'], ['maybe'], ['very'],
      ['congrats'], ['shabbat-shalom'], ['happy-holiday'], ['cheers'], ['bon-appetit']]),
    ('u4', 'Food & drink', 'Bread, water, coffee and falafel', 'food', '🥙',
     [['water'], ['bread'], ['coffee'], ['tea'], ['milk'], ['food'], ['falafel'], ['hummus'], ['pita'], ['salad'],
      ['egg'], ['cheese'], ['chicken'], ['meat'], ['fish'], ['rice'], ['soup'], ['schnitzel'], ['wine'], ['beer'], ['juice']]),
    ('u5', 'First verbs', 'Eat, drink, want, love: one form for each kind of subject', 'eat-ms', '🍽️',
     VERB('eat', 'drink', 'want', 'love', 'need')),
    ('u6', 'Family', 'Mom, dad and the rest of them', 'family', '👪',
     [['mom'], ['dad'], ['brother'], ['sister'], ['son'], ['daughter'], ['family'], ['grandpa'], ['grandma'], ['uncle'],
      ['aunt'], ['husband'], ['cousin'], ['baby'], ['twins'], ['wedding'], ['home']]),
    ('u7', 'Numbers', 'Counting from zero to a million', 'number', '🔢',
     [['zero'], ['one-f'], ['two-f'], ['three-f'], ['four-f'], ['five-f'], ['six-f'], ['seven-f'], ['eight-f'], ['nine-f'],
      ['ten-f'], ['one-m'], ['two-m'], ['three-m'], ['four-m'], ['five-m'], ['six-m'], ['seven-m'], ['nine-m'], ['ten-m'],
      ['twenty'], ['thirty'], ['forty'], ['fifty'], ['hundred'], ['two-hundred'], ['thousand'], ['million'], ['number'],
      ['first'], ['first-f'], ['second'], ['second-f'], ['half'], ['many'], ['little'], ['more']]),
    ('u8', 'Describing things', 'Good, big, new: adjectives come after the noun', 'good', '✨',
     ADJ('good', 'bad', 'big', 'small', 'new', 'old', 'beautiful', 'hot', 'cold', 'easy', 'hard', 'long', 'short',
         'young', 'strong', 'clean', 'sweet', 'quiet', 'nice', 'important', 'interesting', 'right-correct', 'excellent')),
    ('u9', 'Questions', 'What, who, where, when and why', 'what', '❓',
     [['what'], ['who'], ['where'], ['when'], ['why'], ['how'], ['how-much'], ['which'], ['is-it'], ['this-m'], ['this-f'],
      ['there-is'], ['there-isnt'], ['also'], ['only'], ['with'], ['without'], ['but'], ['because'], ['if'], ['or'], ['so'],
      ['of'], ['from'], ['like'], ['all'], ['thing'], ['something'], ['together'], ['enough']]),
    ('u10', 'Around town', 'Streets, shops and finding your way', 'city', '🏙️',
     [['here'], ['there'], ['here2'], ['right'], ['left'], ['straight'], ['straight-f'], ['near'], ['near-f'], ['far'], ['far-f'],
      ['street'], ['city'], ['toilet'], ['station'], ['hotel'], ['apartment'], ['store'], ['market'], ['bank'], ['hospital'],
      ['school'], ['university'], ['sea'], ['beach'], ['airport'], ['country'], ['israel'], ['jerusalem'], ['tel-aviv'],
      ['synagogue'], ['museum'], ['office'], ['pharmacy'], ['kiosk'], ['room'], ['north'], ['south'], ['inside'], ['outside'],
      ['up'], ['down'], ['next-to'], ['between']]),
    ('u11', 'Getting around', 'Bus, train, taxi', 'bus', '🚌',
     [['bus'], ['train'], ['taxi'], ['car'], ['car2'], ['bicycle'], ['plane'], ['ticket'], ['road'], ['way'], ['passport'],
      ['suitcase'], ['map'], ['trip'], ['driver'], ['ship']] + VERB('go', 'come', 'travel')),
    ('u12', 'Time & days', 'Today, tomorrow and the days of the week', 'today', '📅',
     [['today'], ['tomorrow'], ['yesterday'], ['now'], ['day'], ['night'], ['morning'], ['evening'], ['noon'], ['later'],
      ['week'], ['month'], ['year'], ['hour'], ['minute'], ['sunday'], ['monday'], ['tuesday'], ['wednesday'], ['thursday'],
      ['friday'], ['saturday'], ['weekend'], ['time'], ['always'], ['never'], ['sometimes'], ['already'], ['again'], ['soon'],
      ['early'], ['early-f'], ['late'], ['late-f'], ['holiday'], ['birthday'], ['summer'], ['winter'], ['spring'], ['autumn']]),
    ('u13', 'Shopping', 'How much is it? Prices, sales and paying', 'money', '🛍️',
     [['how-much'], ['money'], ['shekel'], ['price'], ['bag'], ['receipt'], ['discount'], ['cash'], ['sale'], ['size'],
      ['gift'], ['credit-card'], ['change-money']] + ADJ('expensive', 'cheap', 'open', 'closed') + VERB('buy', 'pay')),
    ('u14', 'Feelings', 'Happy, tired, hungry: describing yourself', 'happy', '😊',
     ADJ('happy', 'sad', 'tired', 'hungry', 'thirsty', 'busy', 'ready', 'funny', 'crazy') + [['love-noun'], ['glad']]),
    ('u15', 'Everyday verbs', 'Live, work, speak, study', 'speak-ms', '🗣️',
     VERB('live', 'work-v', 'speak', 'study', 'read', 'write', 'know', 'understand', 'think', 'say')),
    ('u16', 'At home', 'Rooms, furniture and things', 'door', '🏠',
     [['door'], ['window'], ['table'], ['chair'], ['bed'], ['kitchen'], ['shower'], ['phone'], ['cellphone'], ['computer'],
      ['book'], ['pen'], ['key'], ['bag-handbag'], ['clothes'], ['light'], ['picture'], ['television'], ['refrigerator'],
      ['newspaper'], ['letter-mail'], ['paper'], ['box'], ['garden'], ['wall'], ['floor'], ['roof'], ['balcony'], ['stairs'],
      ['elevator'], ['neighborhood'], ['neighbor'], ['guest']]),
    ('u17', 'Body & health', 'Head, hand, heart and the doctor', 'head', '🩺',
     [['head'], ['hand'], ['leg'], ['eye'], ['ear'], ['mouth'], ['nose'], ['heart'], ['stomach'], ['back'], ['tooth'],
      ['hair'], ['face'], ['body'], ['doctor'], ['nurse'], ['medicine'], ['pain'], ['fever'], ['blood'], ['help'],
      ['emergency'], ['ambulance']] + ADJ('sick', 'healthy')),
    ('u18', 'Kitchen & table', 'Fruit, vegetables and everything on the table', 'fruit', '🍎',
     [['fruit'], ['vegetable'], ['apple'], ['banana'], ['orange'], ['tomato'], ['cucumber'], ['potato'], ['onion'], ['lemon'],
      ['grape'], ['watermelon'], ['olive'], ['oil'], ['sugar'], ['salt'], ['honey'], ['chocolate'], ['cake'], ['ice-cream'],
      ['cup'], ['plate'], ['fork'], ['knife'], ['spoon'], ['breakfast'], ['dinner'], ['meal'], ['restaurant'], ['menu'],
      ['bill']] + ADJ('tasty') + VERB('cook')),
    ('u19', 'Weather & nature', 'Sun, rain, sea and sky', 'sun', '🌤️',
     [['sun'], ['rain'], ['wind'], ['cloud'], ['snow'], ['weather'], ['air'], ['sky'], ['tree'], ['flower'], ['mountain'],
      ['river'], ['lake'], ['desert'], ['forest'], ['sand'], ['moon'], ['star'], ['earth'], ['stone'], ['fire'], ['world']]),
    ('u20', 'Colours & clothes', 'Red, blue, white: colours agree too', 'color', '🎨',
     [['color']] + ADJ('red', 'blue', 'green', 'yellow', 'white', 'black', 'brown', 'pink', 'purple', 'orange-color', 'gray')
     + [['shirt'], ['pants'], ['dress'], ['hat'], ['shoe'], ['coat'], ['skirt'], ['glasses']]),
    ('u21', 'Work & study', 'School, work and learning Hebrew', 'work', '📚',
     [['work'], ['teacher'], ['student'], ['student-uni'], ['class'], ['lesson'], ['homework'], ['test'], ['notebook'],
      ['hebrew'], ['english'], ['language'], ['word'], ['question'], ['answer'], ['problem'], ['idea'], ['meeting'],
      ['boss'], ['salary'], ['engineer'], ['police'], ['army'], ['soldier'], ['guy'], ['everyone'], ['someone']]),
    ('u22', 'More verbs', 'See, hear, help, wait', 'see-ms', '🏃',
     VERB('see', 'hear', 'do', 'sit', 'sleep', 'help-v', 'look-for', 'open-v', 'close-v', 'give', 'take', 'ask', 'can', 'wait')),
    ('u23', 'Fun & animals', 'Play, sing, dance and the zoo', 'dog', '🐶',
     VERB('play', 'sing', 'dance', 'run') + [['dog'], ['cat'], ['bird'], ['horse'], ['cow'], ['sheep'], ['lion'], ['camel'],
     ['donkey'], ['snake'], ['mouse'], ['monkey'], ['bear'], ['elephant'], ['butterfly'], ['bee']]),
]

TIPS = {
    'u1-1': 'Start here: three words. Each one is shown on a card first. Hebrew is read right to left.',
    'u2-1': 'Hebrew has two words for "you": אַתָּה to a man, אַתְּ to a woman.',
    'u3-1': 'These are everyday, informal words: perfect with friends.',
    'u5-1': 'Present-tense verbs have four forms: man, woman, men (or a mixed group), women. A man says אֲנִי אוֹכֵל, a woman אֲנִי אוֹכֶלֶת.',
    'u7-1': 'Counting (one, two, three…) uses the feminine forms. With a masculine noun you use the masculine ones.',
    'u8-1': 'Adjectives follow the noun and agree with it: a masculine noun takes the masculine form, a feminine noun the feminine one.',
    'u9-1': 'There is no "is" in the present: מַה זֶה? is literally "what this?".',
    'u14-1': 'No "am" or "is" needed: אֲנִי עָיֵף "I (am) tired". Women say אֲנִי עֲיֵפָה.',
}


def pack(chunks, first_size=4):
    lessons, cur = [], []
    limit = first_size
    for ch in chunks:
        ch = [i for i in ch if i in items]
        if not ch:
            continue
        if cur and len(cur) + len(ch) > limit:
            lessons.append(cur); cur = []; limit = 4
        cur.extend(ch)
    if cur:
        lessons.append(cur)
    # avoid a lone 1-item tail lesson
    if len(lessons) > 1 and len(lessons[-1]) == 1 and len(lessons[-2]) < 4:
        lessons[-2] += lessons.pop()
    return lessons


def title_for(ids):
    first = items[ids[0]]
    if first.get('pos') == 'verb':
        return f"{first['en'].split(',')[0].capitalize()}"
    names = []
    for i in ids:
        it = items[i]
        if it.get('form') == 'fs':
            continue
        nm = it['en'].split(',')[0].split(';')[0].split('(')[0].strip()
        if nm not in names:
            names.append(nm)
    return ', '.join(names[:3]) if len(names) <= 3 else f"{', '.join(names[:2])} & more"


def main():
    used = set()
    units = []
    for n, (uid, title, sub, head, icon, chunks) in enumerate(UNITS):
        dup = [i for c in chunks for i in c if i in used and i in items]
        chunks = [[i for i in c if i not in used] for c in chunks]
        lessons = pack(chunks, first_size=3 if n == 0 else 4)
        out = []
        for k, ids in enumerate(lessons, 1):
            used.update(ids)
            lid = f'{uid}-{k}'
            out.append({'id': lid, 'title': title_for(ids), 'icon': icon, 'items': ids, **({'tip': TIPS[lid]} if lid in TIPS else {})})
        units.append({'id': uid, 'title': title, 'subtitle': sub, 'he': items[head]['he'] if head in items else items[lessons[0][0]]['he'], 'lessons': out})
    # place sentences
    order = [l for u in units for l in u['lessons']]
    seen, where = set(), {}
    for l in order:
        seen.update(l['items'])
        where[l['id']] = set(seen)
    per_lesson = {l['id']: [] for l in order}
    unit_last = {l['id']: u['lessons'][-1]['id'] for u in units for l in u['lessons']}
    pos = {l['id']: n for n, l in enumerate(order)}
    for s in sentences:
        need = set(s['ids']) if s['kind'] == 'composed' else {s['for']}
        start = 0
        if s['kind'] == 'attested':
            # quoted sentences use words beyond the lesson's own: put them at the end of the unit
            home = next(l['id'] for l in order if s['for'] in l['items'])
            start = pos[unit_last[home]]
        for l in order[start:]:
            if need <= where[l['id']] and len(per_lesson[l['id']]) < 2:
                per_lesson[l['id']].append(s['id']); break
    for l in order:
        if per_lesson[l['id']]:
            l['sentences'] = per_lesson[l['id']]
    placed = sum(len(v) for v in per_lesson.values())
    not_in_course = sorted(set(items) - used)
    json.dump({'units': units}, open(os.path.join(ROOT, 'data', 'course.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'units {len(units)} lessons {len(order)} items used {len(used)}/{len(items)} sentences placed {placed}/{len(sentences)}')
    if not_in_course:
        print('not in any lesson:', ' '.join(not_in_course))


if __name__ == '__main__':
    main()
