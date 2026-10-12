// Validates the course data. Exits non-zero on the first run with any problem.
//   node scripts/check-data.mjs            check data/
//   node scripts/check-data.mjs <dir>      check another copy (used by the self-test)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const load = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const items = load('items.json').items;
const sentences = load('sentences.json').sentences;
const course = load('course.json');
const script = load('script.json');
const letters = load('letters.json');
const tracing = load('tracing.json');
const errors = [];
const err = (m) => errors.push(m);

// Hebrew block only: letters U+05D0-05EA, points and marks U+0591-05C7, maqaf U+05BE, geresh/gershayim U+05F3-05F4
const HEB_FIELD = /^[֑-ׇא-ת׳״־ ]+$/;
const HEB_SENT = /^[֑-ׇא-ת׳״־ .,?!]+$/;
const POINTS = /[֑-ׇֽֿׁׂׅׄ]/g;
const strip = (s) => s.normalize('NFC').replace(POINTS, '');
const FINAL = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
const FINALS = new Set(Object.values(FINAL));
const LETTER = /[א-ת]/;

/** Final forms only at the end of a word, non-final forms never there. Words split on space and maqaf. */
function finalsOk(word) {
  const plain = strip(word).replace(/[.,?!׳״]/g, '');
  for (const w of plain.split(/[\s־]+/).filter(Boolean)) {
    const ls = [...w].filter((c) => LETTER.test(c));
    for (let i = 0; i < ls.length; i++) {
      const last = i === ls.length - 1;
      if (!last && FINALS.has(ls[i])) return `final form ${ls[i]} inside "${w}"`;
      if (last && FINAL[ls[i]] && ls.length > 1) return `non-final ${ls[i]} at the end of "${w}"`;
    }
  }
  return null;
}

// ---- items
const ids = new Set();
for (const it of items) {
  for (const f of ['id', 'he', 'plain', 'tr', 'en', 'cat', 'src']) if (!it[f] || typeof it[f] !== 'string') err(`item ${it.id}: missing ${f}`);
  if (ids.has(it.id)) err(`duplicate item id ${it.id}`);
  ids.add(it.id);
  if (!it.he || !it.plain) continue;
  if (!HEB_FIELD.test(it.he)) err(`item ${it.id}: non-Hebrew character in he "${it.he}"`);
  if (!HEB_FIELD.test(it.plain)) err(`item ${it.id}: non-Hebrew character in plain "${it.plain}"`);
  if (/[֑-ׇ]/.test(it.plain.replace(/־/g, ''))) err(`item ${it.id}: plain spelling has vowel points`);
  if (!/[ְ-ׇּׁׂ]/.test(it.he)) err(`item ${it.id}: pointed spelling has no vowel points`);
  // stripping the points must give the unpointed spelling, allowing only the extra vowel letters
  // (ו, י) of full spelling (ktiv male) and a hyphen-like maqaf
  const s = strip(it.he).replace(/־/g, ' ');
  const p = it.plain.replace(/־/g, ' ');
  if (s !== p) {
    let i = 0; let j = 0; let ok = true;
    while (i < s.length || j < p.length) {
      if (s[i] === p[j]) { i++; j++; } else if (p[j] === 'ו' || p[j] === 'י') j++; else { ok = false; break; }
    }
    if (!ok) err(`item ${it.id}: pointed "${it.he}" does not reduce to unpointed "${it.plain}"`);
  }
  for (const w of [it.he, it.plain]) { const f = finalsOk(w); if (f) err(`item ${it.id}: ${f}`); }
  if (/[֐-׿]/.test(it.tr + it.en)) err(`item ${it.id}: Hebrew inside tr/en`);
  if (it.form && !['ms', 'fs', 'mp', 'fp'].includes(it.form)) err(`item ${it.id}: bad form ${it.form}`);
  if (it.base && !items.some((x) => x.id === it.base || x.base === it.base)) err(`item ${it.id}: base ${it.base} has no forms`);
}
// verbs: four present forms each
const verbBases = new Set(items.filter((i) => i.cat === 'verb').map((i) => i.base));
for (const b of verbBases) {
  const forms = items.filter((i) => i.base === b).map((i) => i.form).sort().join(',');
  if (forms !== 'fp,fs,mp,ms') err(`verb ${b}: forms ${forms}`);
}

// ---- sentences
const sids = new Set();
for (const s of sentences) {
  for (const f of ['id', 'he', 'tr', 'en', 'kind']) if (!s[f]) err(`sentence ${s.id}: missing ${f}`);
  if (sids.has(s.id)) err(`duplicate sentence id ${s.id}`);
  sids.add(s.id);
  if (!HEB_SENT.test(s.he)) err(`sentence ${s.id}: non-Hebrew character in "${s.he}"`);
  const f = finalsOk(s.he); if (f) err(`sentence ${s.id}: ${f}`);
  if (s.kind === 'composed') {
    for (const id of s.ids || []) if (!ids.has(id)) err(`sentence ${s.id}: unknown word ${id}`);
    const joined = (s.ids || []).map((id) => items.find((x) => x.id === id)?.he).join(' ') + (s.q || '');
    if (joined !== s.he) err(`sentence ${s.id}: he does not match its words`);
  } else if (s.kind === 'attested') {
    if (!s.tokens || s.tokens.length !== s.he.split(' ').length) err(`sentence ${s.id}: tokens do not match`);
    if (!ids.has(s.for)) err(`sentence ${s.id}: unknown item ${s.for}`);
  } else err(`sentence ${s.id}: kind ${s.kind}`);
}

// ---- course
const lessonIds = new Set();
const introduced = new Set();
course.units.forEach((u, ui) => {
  if (!u.lessons?.length) err(`unit ${u.id}: no lessons`);
  u.lessons.forEach((l, li) => {
    if (lessonIds.has(l.id)) err(`duplicate lesson ${l.id}`);
    lessonIds.add(l.id);
    if (!l.items?.length) err(`lesson ${l.id}: no items`);
    const max = ui === 0 && li === 0 ? 3 : 4;
    if (l.items.length > max) err(`lesson ${l.id}: ${l.items.length} new items (max ${max})`);
    for (const id of l.items) {
      if (!ids.has(id)) err(`lesson ${l.id}: unknown item ${id}`);
      if (introduced.has(id)) err(`lesson ${l.id}: item ${id} introduced twice`);
      introduced.add(id);
    }
    for (const sid of l.sentences || []) {
      const s = sentences.find((x) => x.id === sid);
      if (!s) { err(`lesson ${l.id}: unknown sentence ${sid}`); continue; }
      const need = s.kind === 'composed' ? s.ids : [s.for];
      for (const id of need) if (!introduced.has(id)) err(`lesson ${l.id}: sentence ${sid} uses ${id} before it is taught`);
    }
  });
});

// ---- letters
const L = new Map(script.letters.map((l) => [l.id, l]));
const V = new Map(script.vowels.map((v) => [v.id, v]));
for (const l of script.letters) {
  if (!/^[א-ת][ּׁׂ]?$/.test(l.char)) err(`letter ${l.id}: bad char`);
  if (!l.name || typeof l.sound !== 'string') err(`letter ${l.id}: missing name/sound`);
  if (!tracing.shapes[l.shape]) err(`letter ${l.id}: no tracing shape ${l.shape}`);
  if (l.final && !L.has(l.final)) err(`letter ${l.id}: unknown final ${l.final}`);
  if (l.final_of && !FINALS.has(l.char)) err(`letter ${l.id}: marked final but ${l.char} is not a final form`);
}
if (script.letters.filter((l) => l.final_of).length !== 5) err('expected 5 final forms');
const taught = new Map();
for (const g of letters.groups) {
  for (const id of g.letters || []) { if (!L.has(id)) err(`group ${g.id}: unknown letter ${id}`); if (!g.drill) taught.set(id, (taught.get(id) || 0) + 1); }
  for (const id of g.vowels || []) if (!V.has(id)) err(`group ${g.id}: unknown vowel ${id}`);
}
for (const l of script.letters) if (taught.get(l.id) !== 1) err(`letter ${l.id} taught ${taught.get(l.id) || 0} times`);
for (const set of script.lookalikes) for (const id of set) if (!L.has(id)) err(`lookalike set: unknown ${id}`);
for (const [k, strokes] of Object.entries(tracing.shapes)) {
  for (const s of strokes) {
    if (s.length < 2) err(`tracing ${k}: stroke with < 2 points`);
    for (const [x, y] of s) if (x < 0 || x > 100 || y < 0 || y > 100) err(`tracing ${k}: point out of the box`);
  }
}

if (errors.length) {
  console.error(`${errors.length} problem(s):\n` + errors.slice(0, 40).join('\n'));
  process.exit(1);
}
console.log(`OK: ${items.length} items, ${sentences.length} sentences, ${course.units.length} units / ${lessonIds.size} lessons, `
  + `${script.letters.length} letters, ${script.vowels.length} vowel points, ${letters.groups.length} letter sets, ${Object.keys(tracing.shapes).length} tracing shapes`);
