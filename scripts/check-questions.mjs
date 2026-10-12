// Generates every lesson, unit practice and letters set many times with the real engine and
// checks every question: the right answer is among the options, options are distinct, nothing
// is undefined. Also reports answer-length bias (how often the right answer is the single
// longest option) for multiple-choice questions with text options.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexData, buildLesson, buildUnitPractice, buildLettersLesson, buildReview, rightAnswer, enLabel, deckFor } from '../js/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
const db = indexData({ items: load('items.json').items, script: load('script.json'), sentences: load('sentences.json').sentences,
  course: load('course.json'), letters: load('letters.json'), tracing: load('tracing.json') });
const RUNS = Number(process.env.RUNS || 30);
const errors = [];
const types = new Map();
const bias = new Map(); // type -> [longest, total]
const optId = (q, o) => (q.type === 'vowelSound' ? o.sound : q.type === 'syllable' ? o.tr : o.id);
const optText = (q, o) => ({ h2e: enLabel(o), readWord: enLabel(o), sent: o.en, tr: o.tr, e2h: o.plain })[q.type];

function check(q, where) {
  types.set(q.type, (types.get(q.type) || 0) + 1);
  if (q.type === 'intro') { if (!q.x) errors.push(`${where}: empty intro`); return; }
  if (q.type === 'match') { if (q.pairs.length < 3 || q.pairs.some((p) => !p)) errors.push(`${where}: bad match`); return; }
  if (q.type === 'build') { if (q.words.some((w) => !w) || !q.bank.length) errors.push(`${where}: bad build ${q.sentence.id}`); return; }
  if (q.type === 'trace') { if (!db.tracing.shapes[q.letter.shape]) errors.push(`${where}: no shape`); return; }
  if (q.type === 'type') { if (!q.item?.tr) errors.push(`${where}: bad type`); return; }
  if (q.type === 'agree' && !q.pronoun) { errors.push(`${where}: agree without pronoun for ${q.item.id}`); return; }
  if (!q.options) { errors.push(`${where}: ${q.type} without options`); return; }
  const ids = q.options.map((o) => optId(q, o));
  if (ids.some((x) => x == null)) errors.push(`${where}: ${q.type} undefined option`);
  if (new Set(ids).size !== ids.length) errors.push(`${where}: ${q.type} duplicate options`);
  if (!ids.includes(rightAnswer(q))) errors.push(`${where}: ${q.type} right answer missing`);
  if (q.options.length < 2) errors.push(`${where}: ${q.type} has ${q.options.length} option`);
  const shown = q.options.map((o) => optText(q, o));
  if (shown[0] !== undefined && new Set(shown).size !== shown.length) errors.push(`${where}: ${q.type} two options look the same: ${shown.join(' | ')}`);
  if (shown[0] !== undefined && q.options.length >= 3) {
    const right = q.options.find((o) => optId(q, o) === rightAnswer(q));
    const len = (o) => optText(q, o).length;
    const longest = q.options.every((o) => o === right || len(o) < len(right));
    const b = bias.get(q.type) || [0, 0]; b[0] += longest ? 1 : 0; b[1] += 1; bias.set(q.type, b);
  }
}

for (let r = 0; r < RUNS; r++) {
  for (const u of db.course.units) {
    for (const l of u.lessons) buildLesson(db, l, u, { speech: r % 2 === 0 }).forEach((q) => check(q, l.id));
    buildUnitPractice(db, u, { speech: true }).forEach((q) => check(q, `P:${u.id}`));
  }
  for (const g of db.letters.groups) {
    buildLettersLesson(db, g).forEach((q) => check(q, `L:${g.id}`));
    buildLettersLesson(db, g, { practiceOnly: true }).forEach((q) => check(q, `PL:${g.id}`));
  }
  const keys = Object.keys(db.item).slice(r * 7, r * 7 + 14).map((k) => `item:${k}`).concat(['let:alef', 'vow:segol', 'trace:mem', `sent:${db.sentences[r % db.sentences.length].id}`]);
  buildReview(db, keys).forEach((q) => check(q, 'review'));
}
for (const u of db.course.units) if (!deckFor(db, { kind: 'unit', id: u.id }).length) errors.push(`deck ${u.id} empty`);

console.log('question types:', [...types].map(([k, v]) => `${k} ${v}`).join(', '));
console.log('right answer is the single longest option:', [...bias].map(([k, [a, b]]) => `${k} ${Math.round((100 * a) / b)}%`).join(', '));
if (errors.length) {
  const uniq = [...new Set(errors)];
  console.error(`${uniq.length} problem(s):\n${uniq.slice(0, 30).join('\n')}`);
  process.exit(1);
}
console.log(`OK: ${RUNS} runs of every lesson, practice, letters set and a review`);
