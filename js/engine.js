// Turns lessons into question lists. Every graded question carries an SRS key so a miss
// (or a peek at the answer) can come back later in Review. New words and letters are
// always met first on an "intro" card.

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const sample = (arr, n) => shuffle(arr).slice(0, Math.max(0, n));
const uniqBy = (arr, f) => { const seen = new Set(); return arr.filter((x) => { const k = f(x); if (seen.has(k)) return false; seen.add(k); return true; }); };

// Hebrew points (niqqud, dagesh, shin/sin dots, meteg) — everything that is not a letter.
const POINTS = /[֑-ׇֽֿׁׂׅׄ]/g;
export const stripPoints = (s) => s.normalize('NFC').replace(POINTS, '');
const VOWEL_MARKS = /[ְ-ׇֻ]/;
const LETTER = /[א-ת]/;

export const FORM_LABEL = { ms: 'm. sg.', fs: 'f. sg.', mp: 'm. pl.', fp: 'f. pl.' };
export const PRONOUN_FOR = { ms: ['i', 'you-m', 'he'], fs: ['i', 'you-f', 'she'], mp: ['we', 'you-mp', 'they-m'], fp: ['we', 'you-fp', 'they-f'] };

export function indexData(data) {
  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
  const forms = {};
  for (const it of data.items) if (it.base) (forms[it.base] ||= []).push(it);
  for (const it of data.items) if (it.form === 'ms' && !it.base) (forms[it.id] ||= []).unshift(it);
  return {
    ...data,
    item: byId(data.items),
    letter: byId(data.script.letters),
    vowel: byId(data.script.vowels),
    sentence: byId(data.sentences),
    group: byId(data.letters.groups),
    forms, // base id -> its inflected forms (verbs: ms fs mp fp; adjectives: ms fs)
  };
}

/** English label with the form, e.g. "eat (f. sg.)". */
export function enLabel(it) {
  if (it.form && it.pos === 'verb') return `${it.en} (${FORM_LABEL[it.form]})`;
  if (it.form === 'fs' && it.pos === 'adjective') return `${it.en} (f.)`;
  if (it.form === 'ms' && it.pos === 'adjective') return `${it.en} (m.)`;
  return it.en;
}

// ---------- letters: what a set teaches, and which words a learner can read ----------
export function groupSymbols(db, g) {
  return [
    ...(g.letters || []).map((id) => ({ kind: 'letter', id, key: `let:${id}`, sym: db.letter[id] })),
    ...(g.vowels || []).map((id) => ({ kind: 'vowel', id, key: `vow:${id}`, sym: db.vowel[id] })),
  ];
}

/** Letters and vowel marks known after finishing teaching sets [0..upto] (drill sets add nothing new). */
export function knownAfter(db, upto) {
  const letters = new Set(); const marks = new Set();
  db.letters.groups.slice(0, upto + 1).forEach((g) => {
    if (g.drill) return;
    (g.letters || []).forEach((id) => letters.add(db.letter[id].base));
    (g.vowels || []).forEach((id) => { const v = db.vowel[id]; [...v.mark].forEach((m) => marks.add(m)); });
  });
  return { letters, marks };
}

export function readable(word, known) {
  for (const ch of word.normalize('NFC')) {
    if (LETTER.test(ch)) { if (!known.letters.has(ch)) return false; }
    else if (VOWEL_MARKS.test(ch)) { if (!known.marks.has(ch)) return false; }
  }
  return true;
}
export function wordsReadable(db, known) {
  return db.items.filter((it) => !it.he.includes(' ') && readable(it.he, known));
}

/** A consonant + vowel read by the spelling rule (sounds from Wikipedia's tables). */
export function syllable(db, l, v) {
  let he = l.char + v.mark;
  if (v.carrier) he = l.char + (v.id === 'hiriq-male' ? 'ִ' : '') + v.carrier;
  return { id: `${l.id}+${v.id}`, he: he.normalize('NFC'), tr: (l.sound || '') + v.sound, l, v };
}

// ---------- distractors ----------
function itemDistractors(db, item, n = 3) {
  const fam = new Set((db.forms[item.base || item.id] || []).map((x) => x.id));
  const differs = (x) => x.id !== item.id && x.en !== item.en && x.plain !== item.plain && x.tr !== item.tr && !fam.has(x.id)
    && x.base !== item.id && (!item.base || x.base !== item.base);
  const picked = [];
  // options must not share an English label, a spelling (with points off) or a reading
  const clash = (x) => picked.some((p) => p.en === x.en || p.plain === x.plain || p.tr === x.tr || enLabel(p) === enLabel(x));
  for (const pool of [db.items.filter((x) => x.cat === item.cat && differs(x)), db.items.filter((x) => x.cat !== item.cat && differs(x))]) {
    for (const x of shuffle(pool)) {
      if (picked.length >= n) break;
      if (!clash(x)) picked.push(x);
    }
  }
  return picked;
}
const others = (list, x, n, same = () => false) => sample(list.filter((y) => y.id !== x.id && !same(y, x)), n);

// ---------- question makers ----------
export const Q = {
  intro: (kind, x) => ({ type: 'intro', kind, x, key: null }),
  h2e: (db, it) => ({ type: 'h2e', key: `item:${it.id}`, item: it, options: shuffle([it, ...itemDistractors(db, it)]) }),
  e2h: (db, it) => ({ type: 'e2h', key: `item:${it.id}`, item: it, options: shuffle([it, ...itemDistractors(db, it)]) }),
  tr: (db, it) => ({ type: 'tr', key: `item:${it.id}`, item: it, options: shuffle([it, ...itemDistractors(db, it)]) }),
  type: (db, it) => ({ type: 'type', key: `item:${it.id}`, item: it }),
  listen: (db, it) => ({ type: 'listen', key: `item:${it.id}`, item: it, options: shuffle([it, ...itemDistractors(db, it)]) }),
  match: (db, items) => ({ type: 'match', key: null, pairs: sample(uniqBy(uniqBy(items, (x) => enLabel(x)), (x) => x.plain), Math.min(5, items.length)) }),
  agree: (db, it) => {
    const fam = db.forms[it.base || it.id] || [];
    const pron = db.item[sample(PRONOUN_FOR[it.form].filter((p) => db.item[p]), 1)[0]];
    return { type: 'agree', key: `item:${it.id}`, item: it, pronoun: pron, options: shuffle(uniqBy(fam, (x) => x.plain + x.tr)) };
  },
  build: (db, s) => {
    const words = s.ids.map((id) => db.item[id]);
    const used = new Set(s.ids);
    const extra = sample(db.items.filter((x) => !used.has(x.id) && !x.he.includes(' ') && !words.some((w) => w.plain === x.plain)
      && words.some((w) => w.cat === x.cat || w.pos === x.pos)), 2);
    return { type: 'build', key: `sent:${s.id}`, sentence: s, words, bank: shuffle([...words, ...extra]) };
  },
  sent: (db, s) => ({ type: 'sent', key: `sent:${s.id}`, sentence: s,
    options: shuffle([s, ...others(db.sentences, s, 3, (y, x) => y.en === x.en)]) }),
  // letters
  letterName: (db, l) => ({ type: 'letterName', key: `let:${l.id}`, letter: l,
    options: shuffle([l, ...others(db.script.letters, l, 3, (y, x) => y.name === x.name || y.base === x.base)]) }),
  letterPick: (db, l) => ({ type: 'letterPick', key: `let:${l.id}`, letter: l,
    options: shuffle([l, ...others(db.script.letters, l, 3, (y, x) => y.sound === x.sound || y.base === x.base)]) }),
  trace: (db, l) => ({ type: 'trace', key: `trace:${l.shape}`, letter: l }),
  look: (db, l, set) => ({ type: 'look', key: `let:${l.id}`, letter: l, options: shuffle(set.map((id) => db.letter[id])) }),
  dagesh: (db, l) => ({ type: 'dagesh', key: `let:${l.id}`, letter: l,
    options: shuffle(db.script.letters.filter((x) => x.base === l.base)) }),
  final: (db, l) => {
    const fin = db.letter[l.final];
    const wrong = sample(db.script.letters.filter((x) => x.final_of && x.id !== fin.id), 3);
    return { type: 'final', key: `let:${fin.id}`, letter: l, fin, options: shuffle([fin, ...wrong]) };
  },
  vowelSound: (db, v) => ({ type: 'vowelSound', key: `vow:${v.id}`, vowel: v,
    options: shuffle(uniqBy([v, ...shuffle(db.script.vowels.filter((x) => x.sound !== v.sound))], (x) => x.sound).slice(0, 4)) }),
  vowelPick: (db, v, pool) => ({ type: 'vowelPick', key: `vow:${v.id}`, vowel: v,
    options: shuffle([v, ...sample(uniqBy(pool.filter((x) => x.sound !== v.sound), (x) => x.sound), 2)]) }),
  syllable: (db, l, v, letters, vowels) => {
    const right = syllable(db, l, v);
    const wrong = uniqBy([
      ...vowels.filter((x) => x.sound !== v.sound).map((x) => syllable(db, l, x)),
      ...letters.filter((x) => x.sound !== l.sound).map((x) => syllable(db, x, v)),
    ].filter((x) => x.tr !== right.tr), (x) => x.tr);
    return { type: 'syllable', key: `vow:${v.id}`, syl: right, options: shuffle([right, ...sample(wrong, 3)]) };
  },
  readWord: (db, it, pool) => ({ type: 'readWord', key: `item:${it.id}`, item: it,
    options: shuffle([it, ...sample(uniqBy(pool, (x) => x.en).filter((x) => x.id !== it.id && x.en !== it.en), 3)]) }),
};

// ---------- course lessons ----------
// Gentle by design: each new word gets a card, then is practised several ways and mixed with
// two words from earlier in the same unit.
export function buildLesson(db, lesson, unit, { speech = false } = {}) {
  const fresh = (lesson.items || []).map((id) => db.item[id]).filter(Boolean);
  const sents = (lesson.sentences || []).map((id) => db.sentence[id]).filter(Boolean);
  const idx = unit.lessons.findIndex((l) => l.id === lesson.id);
  const earlier = unit.lessons.slice(0, idx).flatMap((l) => l.items || []).map((id) => db.item[id]).filter(Boolean);
  const prior = sample(earlier, 2);
  const out = [];
  fresh.forEach((it) => out.push(Q.intro('item', it), Q.h2e(db, it)));
  const middle = fresh.map((it, i) => [Q.e2h, Q.tr, Q.e2h, Q.tr][i % 4](db, it));
  if (speech) middle.push(...sample(fresh, 1).map((it) => Q.listen(db, it)));
  out.push(...shuffle([...middle, ...prior.map((it) => Q.h2e(db, it))]));
  if (fresh.length + prior.length >= 3) out.push(Q.match(db, [...fresh, ...prior]));
  const forms = fresh.filter((it) => it.form && (db.forms[it.base || it.id] || []).length > 1);
  shuffle(forms).slice(0, 2).forEach((it) => out.push(Q.agree(db, it)));
  shuffle(fresh.filter((it) => !it.he.includes(' '))).slice(0, 1).forEach((it) => out.push(Q.type(db, it)));
  sents.forEach((s) => { out.push(Q.sent(db, s)); if (s.kind === 'composed') out.push(Q.build(db, s)); });
  return out;
}

export function buildUnitPractice(db, unit, { speech = false } = {}) {
  const items = uniqBy(unit.lessons.flatMap((l) => l.items || []), (x) => x).map((id) => db.item[id]).filter(Boolean);
  const sents = unit.lessons.flatMap((l) => l.sentences || []).map((id) => db.sentence[id]).filter(Boolean);
  const makers = [Q.h2e, Q.e2h, Q.tr];
  const out = sample(items, 9).map((it, i) => makers[i % 3](db, it));
  if (speech) out.push(...sample(items, 2).map((it) => Q.listen(db, it)));
  if (items.length >= 4) out.splice(3, 0, Q.match(db, sample(items, 5)));
  sample(items.filter((it) => !it.he.includes(' ')), 2).forEach((it) => out.push(Q.type(db, it)));
  const forms = items.filter((it) => it.form && (db.forms[it.base || it.id] || []).length > 1);
  sample(forms, 2).forEach((it) => out.push(Q.agree(db, it)));
  sample(sents, 2).forEach((s) => out.push(s.kind === 'composed' ? Q.build(db, s) : Q.sent(db, s)));
  return out;
}

// ---------- letters lessons ----------
export function buildLettersLesson(db, group, { practiceOnly = false } = {}) {
  const gi = db.letters.groups.findIndex((g) => g.id === group.id);
  const out = [];
  const intro = (k, x) => { if (!practiceOnly) out.push(Q.intro(k, x)); };
  const letters = (group.letters || []).map((id) => db.letter[id]);
  const vowels = (group.vowels || []).map((id) => db.vowel[id]);
  const taughtGroups = db.letters.groups.slice(0, gi + 1).filter((g) => !g.drill);
  const knownLetters = taughtGroups.flatMap((g) => g.letters || []).map((id) => db.letter[id]);
  const knownVowels = taughtGroups.flatMap((g) => g.vowels || []).map((id) => db.vowel[id]);
  const soundy = knownLetters.filter((l) => l.sound);

  if (group.drill) {
    if (group.drill === 'dagesh') {
      shuffle(letters).forEach((l) => out.push(Q.dagesh(db, l)));
      shuffle(letters).slice(0, 3).forEach((l) => out.push(Q.letterPick(db, l)));
    } else if (group.drill === 'finals') {
      letters.filter((l) => l.final).forEach((l) => out.push(Q.final(db, l)));
      letters.filter((l) => l.final_of).forEach((l) => out.push(Q.letterName(db, l)));
    } else {
      const sets = db.script.lookalikes.filter((s) => s.every((id) => group.letters.includes(id)));
      sets.forEach((set) => set.forEach((id) => out.push(Q.look(db, db.letter[id], set))));
      shuffle(letters).slice(0, 2).forEach((l) => out.push(Q.trace(db, l)));
    }
    return shuffle(out);
  }

  const traced = new Set();
  letters.forEach((l) => {
    intro('letter', l);
    out.push(Q.letterName(db, l));
    if (!traced.has(l.shape)) { traced.add(l.shape); out.push(Q.trace(db, l)); }
  });
  shuffle(letters).forEach((l) => out.push(Q.letterPick(db, l)));
  // reading drills use full vowels: shva is often silent, and the short hataf vowels sit on throat letters
  const fullVowels = knownVowels.filter((v) => v.id !== 'shva' && !v.id.startsWith('hataf'));
  vowels.forEach((v) => {
    intro('vowel', v);
    out.push(Q.vowelSound(db, v));
    if (fullVowels.includes(v)) sample(soundy, 2).forEach((l) => out.push(Q.syllable(db, l, v, soundy, fullVowels)));
  });
  if (vowels.length && knownVowels.length > 2) shuffle(vowels).slice(0, 2).forEach((v) => out.push(Q.vowelPick(db, v, knownVowels.filter((x) => x.sound !== v.sound || x.id === v.id))));
  if (!vowels.length && fullVowels.length) sample(letters.filter((l) => l.sound), 3).forEach((l) => out.push(Q.syllable(db, l, sample(fullVowels, 1)[0], soundy, fullVowels)));
  const pool = wordsReadable(db, knownAfter(db, gi));
  if (pool.length >= 4) sample(pool, practiceOnly ? 4 : 3).forEach((it) => out.push(Q.readWord(db, it, pool)));
  return practiceOnly ? shuffle(out.filter((x) => x.type !== 'intro')).slice(0, 14) : out;
}

// ---------- flashcards ----------
export function deckFor(db, deck) {
  if (deck.kind === 'unit') {
    const unit = db.course.units.find((u) => u.id === deck.id);
    return uniqBy(unit.lessons.flatMap((l) => l.items || []), (x) => x).map((id) => ({ key: `item:${id}`, kind: 'item', x: db.item[id] })).filter((c) => c.x);
  }
  return groupSymbols(db, db.group[deck.id]).map((s) => ({ key: s.key, kind: s.kind, x: s.sym }));
}

// ---------- review ----------
export function buildReview(db, keys) {
  const out = [];
  for (const key of keys) {
    const [kind, id] = key.split(':');
    const flip = out.length % 2;
    if (kind === 'item' && db.item[id]) out.push((flip ? Q.e2h : Q.h2e)(db, db.item[id]));
    else if (kind === 'sent' && db.sentence[id]) out.push(db.sentence[id].kind === 'composed' && flip ? Q.build(db, db.sentence[id]) : Q.sent(db, db.sentence[id]));
    else if (kind === 'let' && db.letter[id]) out.push((flip ? Q.letterPick : Q.letterName)(db, db.letter[id]));
    else if (kind === 'vow' && db.vowel[id]) out.push(Q.vowelSound(db, db.vowel[id]));
    else if (kind === 'trace') { const l = db.script.letters.find((x) => x.shape === id); if (l) out.push(Q.trace(db, l)); }
  }
  const reviewItems = keys.filter((k) => k.startsWith('item:')).map((k) => db.item[k.slice(5)]).filter(Boolean);
  if (reviewItems.length >= 4) out.splice(Math.min(4, out.length), 0, Q.match(db, reviewItems));
  return out;
}

// ---------- grading ----------
export function rightAnswer(q) {
  switch (q.type) {
    case 'h2e': case 'e2h': case 'tr': case 'readWord': case 'listen': case 'agree': return q.item.id;
    case 'sent': return q.sentence.id;
    case 'letterName': case 'letterPick': case 'look': case 'dagesh': return q.letter.id;
    case 'final': return q.fin.id;
    case 'vowelSound': return q.vowel.sound;
    case 'vowelPick': return q.vowel.id;
    case 'syllable': return q.syl.tr;
    default: return null;
  }
}

/** Loose transliteration compare: no accents, apostrophes, spaces or hyphens; ch = kh, tz = ts. */
export function normTr(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’ʼ`\-\s.,!?]/g, '').replace(/ch/g, 'kh').replace(/tz/g, 'ts').replace(/x/g, 'kh');
}

export function isCorrect(q, answer) {
  if (q.type === 'build') return Array.isArray(answer) && answer.map((w) => w.plain).join(' ') === q.words.map((w) => w.plain).join(' ');
  if (q.type === 'match' || q.type === 'trace') return answer === true;
  if (q.type === 'type') return normTr(answer) === normTr(q.item.tr);
  if (q.type === 'agree') return answer != null && (answer === q.item.id || (q.item && answer === q.item.id));
  return answer != null && answer === rightAnswer(q);
}
