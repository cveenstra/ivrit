import { indexData, buildLesson, buildUnitPractice, buildLettersLesson, buildReview, deckFor, groupSymbols,
  knownAfter, wordsReadable, isCorrect, rightAnswer, shuffle, stripPoints, enLabel, FORM_LABEL, normTr } from './engine.js';
import * as store from './storage.js';
import { startCloudSync, onCloudStatus, cloudStatus } from './cloud.js';
import { initSpeech, canSpeak, onVoiceChange, speak } from './speech.js';
import { tracePad } from './trace.js';

const app = document.getElementById('app');
const DAILY_GOAL = 30;
const HEARTS = 5;
const SETTINGS_KEY = 'ivrit.settings';
let db = null;
let state = store.load();
let settings = { niqqud: true };
try { settings = { ...settings, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { /* defaults */ }
function saveSettings() { try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } }

// ---------- tiny DOM helper ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const he = (text, cls = '') => h('span', { class: `he ${cls}`, lang: 'he', dir: 'rtl' }, text);
const tr = (text) => h('span', { class: 'tr', dir: 'ltr' }, text);
/** The learner sees vowel points (niqqud) until they switch them off. */
const word = (it) => (settings.niqqud ? it.he : it.plain);
const sentHe = (s) => (s.kind === 'composed'
  ? s.ids.map((id) => word(db.item[id])).join(' ') + (s.q || '')
  : (settings.niqqud ? s.he : stripPoints(s.he)));
const informal = (it) => (it.informal ? h('span', { class: 'informal', title: 'Informal or slang' }, 'informal') : null);
const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function speakBtn(text, cls = '') {
  if (!canSpeak()) return null;
  return h('button', { class: `speak ${cls}`, type: 'button', 'aria-label': 'Play Hebrew audio', onclick: () => speak(text) }, '🔊');
}
function toast(msg) {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2000);
}

/** Words of a sentence that can be tapped for their reading and meaning. */
function tokensOf(s) {
  if (s.kind === 'composed') return s.ids.map((id) => { const it = db.item[id]; return { he: word(it), tr: it.tr, en: enLabel(it) }; });
  return s.tokens.map((t) => {
    const plain = stripPoints(t.he).replace(/[?!.,]/g, '');
    const it = db.items.find((x) => x.he === t.he.replace(/[?!.,]/g, '') || x.plain === plain);
    return { he: settings.niqqud ? t.he : stripPoints(t.he), tr: t.tr, en: it ? enLabel(it) : null };
  });
}
function tappableSentence(s, cls = 'big') {
  const wrap = h('div', { class: 'tap-wrap' });
  const line = h('div', { class: `tap-line ${cls}`, lang: 'he', dir: 'rtl' });
  const gloss = h('p', { class: 'gloss-box', 'aria-live': 'polite' }, 'Tap a word to see how it reads and what it means.');
  tokensOf(s).forEach((t) => {
    const b = h('button', { class: 'tap-word', type: 'button', 'aria-label': `${t.he}: ${t.tr}${t.en ? `, ${t.en}` : ''}` }, he(t.he));
    b.addEventListener('click', () => {
      line.querySelectorAll('.tap-word.open').forEach((x) => x.classList.remove('open'));
      b.classList.add('open');
      gloss.replaceChildren(he(t.he), ' ', h('b', {}, t.tr), t.en ? ` = ${t.en}` : '');
      if (canSpeak()) speak(t.he);
    });
    line.append(b);
  });
  wrap.append(line, h('p', { class: 'tap-tr' }, tr(s.tr)), gloss);
  return wrap;
}

// ---------- chrome ----------
function refreshStats() {
  document.getElementById('stat-streak').textContent = store.currentStreak(state);
  document.getElementById('stat-xp').textContent = state.xp;
  const t = document.getElementById('niq');
  if (t) t.setAttribute('aria-pressed', String(!!settings.niqqud));
}
function renderCloud() {
  const el = document.getElementById('cloud');
  if (!el) return;
  const s = cloudStatus();
  const text = { off: '', connecting: 'Connecting…', synced: 'Saved to your account', saving: 'Saving…', error: 'Not saved yet, will retry' }[s];
  el.hidden = s === 'off';
  el.textContent = s === 'synced' || s === 'saving' ? '☁︎' : s === 'error' ? '⚠︎' : '…';
  el.title = text; el.setAttribute('aria-label', text);
  el.className = `cloud ${s}`;
}
function setTab(name) {
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.nav === name));
}
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { go(nav.dataset.nav === 'home' ? '#/' : `#/${nav.dataset.nav}`); return; }
  if (e.target.closest('#niq')) {
    settings.niqqud = !settings.niqqud; saveSettings(); refreshStats();
    toast(settings.niqqud ? 'Vowel points on' : 'Vowel points off: words show as Israelis write them');
    if (!document.body.classList.contains('in-lesson')) route();
  }
});

// ---------- home / path ----------
function allLessons() { return db.course.units.flatMap((u) => u.lessons); }
function unitOf(lessonId) { return db.course.units.find((u) => u.lessons.some((l) => l.id === lessonId)); }
function isUnlocked(lessonId) {
  const list = allLessons();
  const i = list.findIndex((l) => l.id === lessonId);
  return i === 0 || !!state.done[list[i - 1].id] || !!state.done[lessonId];
}
const unitDone = (u) => u.lessons.every((l) => state.done[l.id]);

function goalRing() {
  const xp = state.today.date === store.today() ? state.today.xp : 0;
  const pct = Math.min(1, xp / DAILY_GOAL);
  const r = 24, c = 2 * Math.PI * r;
  return h('span', { class: 'goal', role: 'img', 'aria-label': `Daily goal: ${xp} of ${DAILY_GOAL} XP`,
    html: `<svg viewBox="0 0 58 58" width="58" height="58" aria-hidden="true">
      <circle cx="29" cy="29" r="${r}" fill="none" stroke="var(--line)" stroke-width="7"/>
      <circle cx="29" cy="29" r="${r}" fill="none" stroke="var(--gold)" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 29 29)"/>
      <text x="29" y="34" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="14" fill="var(--ink)">${xp}</text></svg>` });
}

function viewHome() {
  setTab('home');
  const lessons = allLessons();
  const current = lessons.find((l) => !state.done[l.id]);
  const streak = store.currentStreak(state);
  const fresh = Object.keys(state.done).length === 0;
  app.replaceChildren(...[
    h('section', { class: 'hello' },
      goalRing(),
      h('div', {},
        h('h1', {}, he(settings.niqqud ? 'שָׁלוֹם!' : 'שלום!'), ' ', h('span', { class: 'tr' }, 'shalóm, hello!')),
        h('p', {}, streak ? `${streak}-day streak. Daily goal ${DAILY_GOAL} XP.` : `Finish a lesson to start a streak. Daily goal ${DAILY_GOAL} XP.`))),
    fresh ? h('section', { class: 'welcome' },
      h('h2', {}, 'New to Hebrew? Start here'),
      h('p', {}, 'Each lesson shows you three or four new words on cards first, then practises them. Hebrew is read right to left. Stuck? Tap "Show answer" any time: it costs no heart, and the word comes back later in Review. Learning the alphabet first? Try Letters.'),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn', onclick: () => go(`#/lesson/${lessons[0].id}`) }, 'Start lesson 1'),
        h('button', { class: 'btn ghost', onclick: () => go('#/letters') }, 'Learn the letters'))) : null,
    ...db.course.units.map((u, ui) =>
      h('section', { class: `unit tone-${ui % 4}` },
        h('div', { class: 'unit-head' },
          h('div', {}, h('p', { class: 'eyebrow' }, `Unit ${ui + 1}`), h('h2', {}, u.title), h('p', {}, u.subtitle)),
          h('div', { class: 'unit-side' }, he(settings.niqqud ? u.he : stripPoints(u.he), 'unit-he'),
            h('button', { class: 'chip-btn', onclick: () => go(`#/cards/unit/${u.id}`) }, 'Flashcards'))),
        h('div', { class: 'path' },
          ...u.lessons.map((l, li) => {
            const unlocked = isUnlocked(l.id);
            const done = !!state.done[l.id];
            return h('button', {
              class: `node ${done ? 'done' : ''} ${unlocked ? '' : 'locked'} ${current && current.id === l.id ? 'current' : ''}`,
              style: `--wiggle:${[0, -34, -52, -34, 0, 34, 52, 34][li % 8]}px`,
              'aria-label': `${l.title}${done ? ' (completed)' : unlocked ? '' : ' (locked)'}`,
              onclick: () => unlocked ? go(`#/lesson/${l.id}`) : toast('Finish the lesson before this one first'),
            }, h('span', { class: 'disc', 'aria-hidden': 'true' }, done ? '✓' : unlocked ? l.icon : '🔒'), h('span', { class: 'label' }, l.title));
          }),
          h('button', { class: `node practice ${unitDone(u) ? '' : 'locked'}`, 'aria-label': `${u.title} practice${unitDone(u) ? '' : ' (locked)'}`,
            onclick: () => unitDone(u) ? go(`#/practice/${u.id}`) : toast('Finish every lesson in this unit to unlock its practice') },
            h('span', { class: 'disc', 'aria-hidden': 'true' }, unitDone(u) ? '🏆' : '🔒'), h('span', { class: 'label' }, 'Unit practice')))))].filter(Boolean));
}

// ---------- lesson player ----------
function startSession({ title, questions, lessonId, isReview, tip, back = '#/' }) {
  document.body.classList.add('in-lesson');
  // listening questions only make sense with a Hebrew voice; otherwise read the word instead
  const qs = questions.map((q) => (q.type === 'listen' && !canSpeak() ? { ...q, type: 'h2e' } : q));
  const s = { title, queue: qs.slice(), total: qs.length, done: 0, hearts: HEARTS, correct: 0, graded: 0,
    missed: new Set(), lessonId, isReview, tip, back, requeued: new Set() };
  nextQuestion(s);
}

function lessonChrome(s) {
  return h('div', { class: 'lesson-top' },
    h('button', { class: 'quit', 'aria-label': 'Quit lesson', onclick: () => { document.body.classList.remove('in-lesson'); go(s.back); } }, '✕'),
    h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': s.total, 'aria-valuenow': s.done },
      h('i', { style: `width:${Math.round((s.done / s.total) * 100)}%` })),
    h('span', { class: 'hearts', 'aria-label': `${s.hearts} hearts left` }, `❤ ${s.hearts}`));
}

function nextQuestion(s) {
  if (s.hearts <= 0) return finish(s, false);
  const qn = s.queue.shift();
  if (!qn) return finish(s, true);
  if (qn.type === 'intro') return renderIntro(s, qn);
  renderQuestion(s, qn);
}

function renderIntro(s, qn) {
  const card = introCard(qn.kind, qn.x);
  card.dataset.type = `intro-${qn.kind}`;
  const cont = h('button', { class: 'btn wide', onclick: () => { s.done += 1; nextQuestion(s); } }, 'Got it');
  app.replaceChildren(h('div', { class: 'lesson' }, lessonChrome(s),
    s.done === 0 && s.tip ? h('p', { class: 'tip' }, s.tip) : null,
    card, h('div', { class: 'spacer' }), h('div', { class: 'check-row' }, cont)));
  app.focus();
  cont.focus();
}

function formsTable(it) {
  const fam = db.forms[it.base || it.id] || [];
  if (fam.length < 2) return null;
  return h('table', { class: 'forms-table', 'aria-label': 'Forms' },
    h('tbody', {}, ...fam.map((f) => h('tr', {}, h('td', {}, FORM_LABEL[f.form] || ''), h('td', { class: 'he', lang: 'he', dir: 'rtl' }, word(f)), h('td', {}, tr(f.tr))))));
}

function introCard(kind, x) {
  const badge = (t) => h('span', { class: 'new-badge' }, t);
  if (kind === 'item') {
    return h('div', { class: 'card-intro' }, badge(x.pos === 'verb' ? 'New verb form' : 'New word'),
      h('div', { class: 'card-face' }, speakBtn(x.he), he(word(x), 'huge')),
      h('p', { class: 'card-tr' }, x.tr), h('p', { class: 'card-en' }, enLabel(x), ' ', informal(x)),
      settings.niqqud && x.plain !== stripPoints(x.he) ? h('p', { class: 'card-plain' }, 'Usually written ', he(x.plain), ' without vowel points.') : null,
      x.gender && x.pos === 'noun' ? h('p', { class: 'card-note' }, x.gender === 'f' ? 'Feminine noun' : x.gender === 'm' ? 'Masculine noun' : 'Noun') : null,
      x.pos === 'verb' ? h('p', { class: 'card-note' }, `Present tense of ${x.lemma.tr}. The form depends on who does it:`) : null,
      x.form ? formsTable(x) : null);
  }
  if (kind === 'letter') {
    return h('div', { class: 'card-intro' }, badge(x.final_of ? 'Final form' : 'New letter'),
      h('p', { class: 'letter-huge', lang: 'he' }, x.char),
      h('p', { class: 'card-en' }, x.name, ' ', he(x.name_he)),
      h('p', { class: 'card-tr' }, x.sound ? `sounds like ${x.sound}` : 'silent'),
      x.note ? h('p', { class: 'card-note' }, x.note) : null,
      x.example ? h('p', { class: 'card-note' }, 'As in ', he(x.example.he), ' ', tr(x.example.tr), ` "${x.example.en}"`) : null);
  }
  if (kind === 'vowel') {
    return h('div', { class: 'card-intro' }, badge('New vowel point'),
      h('p', { class: 'letter-huge', lang: 'he' }, x.shown),
      h('p', { class: 'card-en' }, x.name, ' ', he(x.name_he)),
      h('p', { class: 'card-tr' }, `sounds like ${x.sound_label}`),
      h('p', { class: 'card-note' }, x.note),
      h('p', { class: 'card-note' }, 'Shown here on ', he(x.shown[0]), ' . The point belongs to the letter it sits on, and is read after that letter’s sound.'));
  }
  return h('div');
}

function renderQuestion(s, qn) {
  let answer = null;
  let settled = false;
  const checkBtn = h('button', { class: 'btn wide', disabled: true }, 'Check');
  const setAnswer = (a, ready = true) => { answer = a; checkBtn.disabled = !ready; };
  const extra = {};
  const body = questionBody(qn, setAnswer, () => grade(), extra);
  const peek = h('button', { class: 'peek', type: 'button', onclick: () => reveal() }, 'Show answer');
  const row = h('div', { class: 'check-row' }, checkBtn);

  function settle(ok, peeked) {
    settled = true;
    if (qn.key) store.grade(state, qn.key, ok);
    s.graded += 1;
    if (ok) s.correct += 1;
    else {
      if (!peeked) s.hearts -= 1;
      if (qn.key) s.missed.add(qn.key);
      if (!s.requeued.has(qn) && qn.type !== 'match' && qn.type !== 'trace') { s.requeued.add(qn); s.queue.push(qn); s.total += 1; }
    }
    s.done += 1;
    store.save(state);
    body.querySelectorAll('button.choice, button.word, button.tile, input').forEach((b) => { b.disabled = true; });
    peek.remove();
    const cont = h('button', { class: `btn wide ${ok ? 'ok-btn' : ''}`, onclick: () => nextQuestion(s) }, 'Continue');
    row.replaceChildren(feedback(qn, ok, peeked, answer, extra), cont);
    row.hidden = false;
    cont.focus();
  }
  function grade() {
    if (settled) return;
    if (checkBtn.disabled && qn.type !== 'match' && qn.type !== 'trace') return;
    const ok = isCorrect(qn, answer);
    markChoices(body, qn, answer);
    settle(ok, false);
  }
  // Peeking flips to the answer: no heart lost, but it counts as a miss for Review.
  function reveal() {
    if (settled) return;
    markChoices(body, qn, null);
    if (qn.type === 'build') fillBuild(body, qn);
    if (qn.type === 'match') body.querySelectorAll('.tile').forEach((b) => b.classList.add('ok'));
    if (qn.type === 'type') { const inp = body.querySelector('input'); if (inp) inp.value = qn.item.tr; }
    if (qn.type === 'trace' && extra.showAll) extra.showAll();
    settle(false, true);
  }
  checkBtn.addEventListener('click', grade);
  app.replaceChildren(h('div', { class: 'lesson' }, lessonChrome(s), s.done === 0 && s.tip ? h('p', { class: 'tip' }, s.tip) : null,
    body, h('div', { class: 'peek-row' }, peek), h('div', { class: 'spacer' }), row));
  if (qn.type === 'match' || qn.type === 'trace') row.hidden = true;
  app.focus();
  if (qn.type === 'listen' && canSpeak()) setTimeout(() => speak(qn.item.he), 250);
  const inp = body.querySelector('input'); if (inp) inp.focus();
}

function markChoices(body, qn, answer) {
  const right = rightAnswer(qn);
  body.querySelectorAll('button.choice').forEach((b) => {
    const id = b.dataset.id;
    if (id === right) b.classList.add('right');
    else if (id === answer) b.classList.add('wrong');
    else b.classList.add('faded');
  });
}

function fillBuild(body, qn) {
  const line = body.querySelector('.answer-line');
  line.replaceChildren(...qn.words.map((w) => h('span', { class: 'word shown' }, he(word(w)), h('small', {}, w.tr))));
}

function feedback(qn, ok, peeked, answer, extra) {
  const title = peeked ? 'Here’s the answer' : ok ? pick(['Nice!', 'Correct!', 'Great job!', 'Kol hakavod!', 'Yofi!']) : 'Not quite';
  const sheet = h('div', { class: `sheet ${ok ? 'ok' : peeked ? 'peeked' : 'no'}`, role: 'status' }, h('h3', {}, title));
  const line = (...k) => h('p', {}, ...k);
  const itemLine = (it) => line(he(word(it)), ' ', tr(it.tr), ` = ${enLabel(it)}`);
  switch (qn.type) {
    case 'h2e': case 'e2h': case 'tr': case 'readWord': case 'listen':
      sheet.append(itemLine(qn.item));
      break;
    case 'type':
      sheet.append(itemLine(qn.item));
      if (!ok && !peeked && answer) sheet.append(line(h('small', {}, `You typed "${answer}". Accents and apostrophes don't matter; ch = kh and tz = ts are fine.`)));
      break;
    case 'agree':
      sheet.append(line(he(word(qn.pronoun)), ' ', he(word(qn.item))), line(tr(`${qn.pronoun.tr} ${qn.item.tr}`), ` = ${enLabel(qn.item)}`));
      break;
    case 'build': case 'sent':
      sheet.append(line(he(sentHe(qn.sentence))), line(tr(qn.sentence.tr)), line(qn.sentence.en));
      break;
    case 'letterName': case 'letterPick': case 'look': case 'dagesh':
      sheet.append(line(he(qn.letter.char), ` is ${qn.letter.name}: ${qn.letter.sound ? `sounds like ${qn.letter.sound}` : 'silent'}.`));
      break;
    case 'final':
      sheet.append(line(he(qn.fin.char), ` is the final form of `, he(qn.letter.char), `, used at the end of a word.`));
      break;
    case 'vowelSound': case 'vowelPick':
      sheet.append(line(he(qn.vowel.shown), ` ${qn.vowel.name} sounds like ${qn.vowel.sound_label}.`));
      break;
    case 'syllable':
      sheet.append(line(he(qn.syl.he), ` = ${qn.syl.tr}: `, he(qn.syl.l.char), ` ${qn.syl.l.sound || '(silent)'} + ${qn.syl.v.name} ${qn.syl.v.sound}.`));
      break;
    case 'trace':
      sheet.append(line(he(qn.letter.char), ` ${qn.letter.name}${extra.accuracy != null ? `: ${extra.accuracy}% of strokes right first time` : ''}.`));
      break;
    case 'match':
      sheet.append(line(ok ? 'All pairs matched.' : 'These words come back in Review.'));
      break;
  }
  return sheet;
}

function choiceList(options, render, setAnswer, cls = '', idOf = (o) => o.id ?? o) {
  const list = h('div', { class: `choices ${cls}` });
  options.forEach((opt) => {
    const id = idOf(opt);
    const b = h('button', { class: 'choice', 'data-id': id, onclick: () => {
      list.querySelectorAll('.choice').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      setAnswer(id);
    } }, render(opt));
    list.append(b);
  });
  return list;
}

function questionBody(qn, setAnswer, autoGrade, extra) {
  const wrap = h('div', { class: 'qbody', 'data-type': qn.type });
  const label = (t) => h('h2', { class: 'prompt-label' }, t);
  const bigLetter = (t) => h('p', { class: 'letter-big', lang: 'he' }, t);
  switch (qn.type) {
    case 'h2e':
      wrap.append(label('What does this mean?'),
        h('div', { class: 'prompt' }, speakBtn(qn.item.he), he(word(qn.item), 'big'), tr(qn.item.tr), informal(qn.item)),
        choiceList(qn.options, (o) => enLabel(o), setAnswer));
      break;
    case 'readWord':
      wrap.append(label('Read this word. What does it mean?'),
        h('div', { class: 'prompt' }, he(qn.item.he, 'big')),
        h('p', { class: 'lead center' }, 'Every letter and vowel in it is one you have learned.'),
        choiceList(qn.options, (o) => enLabel(o), setAnswer));
      break;
    case 'listen':
      wrap.append(label('What did you hear?'),
        h('div', { class: 'prompt center', style: 'justify-content:center' }, speakBtn(qn.item.he, 'huge')),
        choiceList(qn.options, (o) => [he(word(o))], setAnswer, qn.options.every((o) => o.plain.length < 8) ? 'two' : ''));
      break;
    case 'e2h':
      wrap.append(label('Pick the Hebrew'),
        h('div', { class: 'prompt' }, h('span', { class: 'en-big' }, enLabel(qn.item))),
        choiceList(qn.options, (o) => [he(word(o))], setAnswer, qn.options.every((o) => o.plain.length < 8) ? 'two' : ''));
      break;
    case 'tr':
      wrap.append(label('How is this read?'),
        h('div', { class: 'prompt' }, speakBtn(qn.item.he), he(word(qn.item), 'big'), h('span', { class: 'tr' }, `(${enLabel(qn.item)})`)),
        choiceList(qn.options, (o) => o.tr, setAnswer));
      break;
    case 'type': {
      const inp = h('input', { class: 'type-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
        'aria-label': 'Type how it is read', placeholder: 'Type it in English letters' });
      inp.addEventListener('input', () => setAnswer(inp.value, inp.value.trim().length > 0));
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.trim()) autoGrade(); });
      wrap.append(label('Type how this is read'),
        h('div', { class: 'prompt' }, speakBtn(qn.item.he), he(word(qn.item), 'big'), h('span', { class: 'tr' }, `(${enLabel(qn.item)})`)),
        inp, h('p', { class: 'type-help' }, 'Use English letters, e.g. shalom. Accents are optional; kh or ch both work.'));
      break;
    }
    case 'agree': {
      const p = qn.pronoun;
      const who = { i: qn.item.form === 'fs' ? 'a woman speaking' : qn.item.form === 'ms' ? 'a man speaking' : '',
        we: qn.item.form === 'fp' ? 'all women' : 'men, or a mixed group' }[p.id] || '';
      wrap.append(label(`Which form goes with ${p.tr}?`),
        h('div', { class: 'agree-line' }, he(word(p), 'big'), h('span', { class: 'blank', 'aria-hidden': 'true' })),
        h('p', { class: 'agree-who' }, `${enLabel(p)}${who ? ` (${who})` : ''} + "${qn.item.en}"`),
        choiceList(qn.options, (o) => [he(word(o)), h('span', { class: 'sub' }, `${o.tr} · ${FORM_LABEL[o.form] || ''}`)], setAnswer, 'two'));
      break;
    }
    case 'sent':
      wrap.append(label('What does this sentence mean?'),
        h('p', { class: 'lead' }, 'Tap any word to see how it reads.'),
        tappableSentence(qn.sentence),
        choiceList(qn.options, (o) => o.en, setAnswer));
      break;
    case 'letterName':
      wrap.append(label('Which letter is this?'), bigLetter(qn.letter.char),
        choiceList(qn.options, (o) => [h('b', {}, o.name), h('span', { class: 'sub' }, o.sound ? `sounds like ${o.sound}` : 'silent')], setAnswer, 'two'));
      break;
    case 'letterPick':
      wrap.append(label(qn.letter.sound ? `Which letter is ${qn.letter.name}, sounding ${qn.letter.sound}?` : `Which letter is ${qn.letter.name}?`),
        choiceList(qn.options, (o) => [he(o.char, 'glyph')], setAnswer, 'two glyphs'));
      break;
    case 'look':
      wrap.append(label('Look closely. Which letter is it?'), bigLetter(qn.letter.char),
        h('p', { class: 'lead center' }, 'These letters look alike.'),
        choiceList(qn.options, (o) => [h('b', {}, o.name), h('span', { class: 'sub' }, o.sound ? `sounds like ${o.sound}` : 'silent')], setAnswer, qn.options.length > 2 ? '' : 'two'));
      break;
    case 'dagesh':
      wrap.append(label('Dot or no dot: how does it sound?'), bigLetter(qn.letter.char),
        choiceList(qn.options, (o) => [h('b', {}, o.sound), h('span', { class: 'sub' }, o.name)], setAnswer, 'two'));
      break;
    case 'final':
      wrap.append(label(`At the end of a word, ${qn.letter.name} is written…`), bigLetter(qn.letter.char),
        choiceList(qn.options, (o) => [he(o.char, 'glyph')], setAnswer, 'two glyphs'));
      break;
    case 'vowelSound':
      wrap.append(label('How does this vowel point sound?'), bigLetter(qn.vowel.shown),
        choiceList(qn.options, (o) => h('b', {}, o.sound_label), setAnswer, 'two', (o) => o.sound));
      break;
    case 'vowelPick':
      wrap.append(label(`Which one sounds like ${qn.vowel.sound}?`),
        choiceList(qn.options, (o) => [he(o.shown, 'glyph')], setAnswer, 'two glyphs'));
      break;
    case 'syllable':
      wrap.append(label('How is this read?'), bigLetter(qn.syl.he),
        choiceList(qn.options, (o) => h('b', {}, o.tr), setAnswer, 'two', (o) => o.tr));
      break;
    case 'trace':
      wrap.append(label(`Trace ${qn.letter.name}`), ...traceBody(qn, setAnswer, autoGrade, extra));
      break;
    case 'build':
      wrap.append(...buildSentence(qn, setAnswer));
      break;
    case 'match':
      wrap.append(...matchPairs(qn, autoGrade, setAnswer));
      break;
  }
  return wrap;
}

function traceBody(qn, setAnswer, autoGrade, extra) {
  const shape = db.tracing.shapes[qn.letter.shape];
  const msg = h('p', { class: 'trace-msg', 'aria-live': 'polite' }, 'Follow the arrow from the gold dot. Hebrew strokes mostly run top to bottom.');
  const pad = tracePad(shape, {
    onStroke: (res) => {
      msg.className = `trace-msg ${res.ok ? 'good' : 'bad'}`;
      msg.textContent = res.ok ? (res.left ? `Stroke ${res.index + 1} done. Next one.` : 'Done!')
        : res.reversed ? 'Right shape, wrong direction: start at the gold dot.' : 'Not quite. Follow the grey guide from the gold dot.';
      if (!res.ok && res.misses >= 2) msg.textContent += ' Watch the hint.';
    },
    onDone: (accuracy, misses) => {
      extra.accuracy = accuracy;
      setAnswer(misses <= shape.length, true);
      setTimeout(() => autoGrade(), 350);
    },
  });
  extra.showAll = pad.showAll;
  return [h('div', { class: 'trace-wrap' }, pad.el, msg,
    h('p', { class: 'trace-ref' }, 'In print: ', he(qn.letter.char), qn.letter.sound ? `${qn.letter.name}, ${qn.letter.sound}` : qn.letter.name))];
}

function buildSentence(qn, setAnswer) {
  const line = h('div', { class: 'answer-line', 'aria-label': 'Your answer', dir: 'rtl' });
  const bank = h('div', { class: 'bank', dir: 'rtl' });
  const chosen = [];
  const sync = () => setAnswer(chosen.map((c) => c.word), chosen.length > 0);
  const tile = (w, onclick) => h('button', { class: 'word', onclick }, he(word(w)), h('small', {}, w.tr), h('small', { class: 'hint-en' }, enLabel(w)));
  qn.bank.forEach((w) => {
    const tileIn = tile(w, () => {
      if (tileIn.classList.contains('used')) return;
      tileIn.classList.add('used');
      const tileOut = tile(w, () => {
        tileOut.remove(); tileIn.classList.remove('used');
        chosen.splice(chosen.findIndex((c) => c.el === tileOut), 1); sync();
      });
      chosen.push({ word: w, el: tileOut }); line.append(tileOut); sync();
      if (canSpeak()) speak(w.he);
    });
    bank.append(tileIn);
  });
  const hintBtn = h('button', { class: 'peek', type: 'button', 'aria-pressed': 'false', onclick: () => {
    const on = bank.classList.toggle('hints');
    line.classList.toggle('hints', on);
    hintBtn.setAttribute('aria-pressed', String(on));
    hintBtn.textContent = on ? 'Hide word meanings' : 'Show word meanings';
  } }, 'Show word meanings');
  return [h('h2', { class: 'prompt-label' }, 'Write this in Hebrew'),
    h('div', { class: 'prompt' }, h('span', { class: 'en-big' }, qn.sentence.en)),
    h('p', { class: 'lead small' }, 'Tap the words in order. They line up right to left, the way Hebrew is read.'),
    line, bank, h('div', { class: 'hint-row' }, hintBtn)];
}

function matchPairs(qn, autoGrade, setAnswer) {
  let selected = null; let left = qn.pairs.length; let mistakes = 0;
  const leftCol = h('div', { class: 'col' }); const rightCol = h('div', { class: 'col' });
  const onPick = (btn, side, it) => {
    if (btn.classList.contains('ok')) return;
    if (!selected || selected.side === side) {
      if (selected) selected.btn.classList.remove('sel');
      selected = { btn, side, it }; btn.classList.add('sel'); return;
    }
    if (selected.it.id === it.id) {
      [btn, selected.btn].forEach((b) => { b.classList.remove('sel'); b.classList.add('ok'); b.disabled = true; });
      if (side === 'he' && canSpeak()) speak(it.he);
      left -= 1;
    } else {
      mistakes += 1;
      [btn, selected.btn].forEach((b) => { b.classList.remove('sel'); b.classList.add('miss'); setTimeout(() => b.classList.remove('miss'), 450); });
      store.grade(state, `item:${it.id}`, false); store.grade(state, `item:${selected.it.id}`, false);
    }
    selected = null;
    if (left === 0) { setAnswer(mistakes === 0); setTimeout(() => autoGrade(), 250); }
  };
  shuffle(qn.pairs).forEach((it) => { const b = h('button', { class: 'tile', onclick: () => onPick(b, 'he', it) }, he(word(it))); leftCol.append(b); });
  shuffle(qn.pairs).forEach((it) => { const b = h('button', { class: 'tile', onclick: () => onPick(b, 'en', it) }, enLabel(it)); rightCol.append(b); });
  return [h('h2', { class: 'prompt-label' }, 'Match the pairs'), h('div', { class: 'match' }, rightCol, leftCol)];
}

function finish(s, completed) {
  document.body.classList.remove('in-lesson');
  const accuracy = s.graded ? Math.round((s.correct / s.graded) * 100) : 100;
  let xp = 0;
  if (completed) {
    xp = (s.isReview ? 5 : 10) + Math.min(s.correct, 15);
    store.recordLesson(state, { lessonId: s.isReview ? null : s.lessonId, xp });
  } else store.save(state);
  refreshStats();
  app.replaceChildren(h('section', { class: 'results' },
    h('div', { class: 'burst', 'aria-hidden': 'true' }, completed ? '🌟' : '💔'),
    h('h1', {}, completed ? (s.isReview ? 'Practice done!' : 'Lesson complete!') : 'Out of hearts'),
    h('p', { class: 'lead' }, completed ? s.title : 'Missed items are saved for Review. Try again, and use "Show answer" when you are stuck.'),
    h('div', { class: 'result-grid' },
      h('div', { class: 'card' }, h('b', {}, `+${xp}`), h('span', {}, 'XP')),
      h('div', { class: 'card' }, h('b', {}, `${accuracy}%`), h('span', {}, 'Accuracy')),
      h('div', { class: 'card' }, h('b', {}, store.currentStreak(state)), h('span', {}, 'Day streak'))),
    h('div', { class: 'row-actions center' },
      completed ? null : h('button', { class: 'btn', onclick: () => route() }, 'Try again'),
      h('button', { class: `btn ${completed ? '' : 'ghost'}`, onclick: () => go(s.back) }, 'Continue'))));
}

// ---------- letters ----------
function meter(n) {
  return h('span', { class: 'meter', role: 'img', 'aria-label': `strength ${n} of 5` }, ...[1, 2, 3, 4, 5].map((i) => h('i', { class: i <= n ? 'on' : '' })));
}
function lettersUnlocked(g) {
  if (!g.drill) return true;
  // a drill opens once every letter in it has been taught
  return g.letters.every((id) => db.letters.groups.some((x) => !x.drill && x.letters.includes(id) && state.done[`L:${x.id}`]));
}
function viewLetters() {
  setTab('letters');
  const groups = db.letters.groups;
  const next = groups.find((g) => !g.drill && !state.done[`L:${g.id}`]);
  let lastDone = -1;
  groups.forEach((g, i) => { if (!g.drill && state.done[`L:${g.id}`]) lastDone = Math.max(lastDone, i); });
  const canRead = lastDone >= 0 ? wordsReadable(db, knownAfter(db, lastDone)).length : 0;
  app.replaceChildren(h('section', {},
    h('h1', { class: 'section-title' }, 'Letters'),
    h('p', { class: 'lead' }, 'Learn to read Hebrew a few letters at a time, with the vowel points that show how to say them. Trace each letter to learn its shape, then read real words using only what you have learned.'),
    h('div', { class: 'read-meter' }, h('b', {}, canRead), ` of ${db.items.filter((i) => !i.he.includes(' ')).length} course words use only letters and vowels you have learned.`),
    ...db.letters.sections.map((sec) => h('div', {},
      h('h2', { class: 'sub-title' }, sec.title), sec.note ? h('p', { class: 'lead small' }, sec.note) : null,
      ...sec.groups.map((gid) => {
        const g = db.group[gid];
        const syms = groupSymbols(db, g);
        const done = !!state.done[`L:${g.id}`];
        const open = lettersUnlocked(g);
        const avg = syms.length ? syms.reduce((a, x) => a + store.strength(state, x.key), 0) / syms.length : 0;
        return h('article', { class: `lgroup ${done ? 'done' : ''} ${next && next.id === g.id ? 'next' : ''} ${open ? '' : 'locked'}` },
          h('div', { class: 'lgroup-head' },
            h('div', {}, h('h3', {}, g.drill ? g.title : `Set ${groups.filter((x) => !x.drill).indexOf(g) + 1}`),
              h('p', { class: 'small muted' }, g.drill ? `Practice${open ? '' : ' · unlocks after the sets that teach these letters'}` : `${g.letters.length} letters${g.vowels.length ? `, ${g.vowels.length} vowel points` : ''}${done ? ' · learned' : ''}`)),
            meter(Math.round(avg))),
          h('div', { class: 'glyph-row' }, ...syms.map((x) => h('span', { class: 'glyph-chip', title: `${x.sym.name}: strength ${store.strength(state, x.key)} of 5` },
            he(x.kind === 'letter' ? x.sym.char : x.sym.shown), h('i', { class: 'bar5', style: `--n:${store.strength(state, x.key)}` })))),
          h('div', { class: 'row-actions' },
            open ? h('button', { class: `btn ${done ? 'ghost' : ''}`, onclick: () => go(`#/learn-letters/${g.id}`) }, g.drill ? 'Practice' : done ? 'Learn again' : 'Learn') : null,
            !g.drill && done ? h('button', { class: 'btn', onclick: () => go(`#/practice-letters/${g.id}`) }, 'Practice') : null,
            h('button', { class: 'chip-btn', onclick: () => go(`#/cards/letters/${g.id}`) }, 'Flashcards')));
      }))),
    h('h2', { class: 'section-title' }, 'Alphabet chart'),
    scriptChart()));
}

function scriptChart() {
  const { letters, vowels } = db.script;
  return h('div', {},
    h('p', { class: 'lead' }, 'Hebrew is written right to left, with 22 letters, all consonants. Five of them have a different shape at the end of a word. Vowels are dots and lines (niqqud) under, over or beside the letters. Everyday Hebrew leaves them out; learners’ books, children’s books and poetry put them in.'),
    h('div', { class: 'grid-letters' }, ...letters.map((l) => h('div', { class: 'lt' },
      h('span', { class: 'he', lang: 'he' }, l.char), h('b', {}, l.name), h('small', {}, l.sound ? l.sound : 'silent')))),
    h('h3', { class: 'sub-title' }, 'Vowel points'),
    h('div', { class: 'table-wrap' }, h('table', { class: 'vtab' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Point'), h('th', {}, 'Name'), h('th', {}, 'Sound'))),
      h('tbody', {}, ...vowels.map((v) => h('tr', {}, h('td', { class: 'he', lang: 'he' }, v.shown), h('td', {}, v.name, ' ', he(v.name_he)), h('td', {}, `${v.sound_label} ${v.ipa}`)))))));
}

// ---------- flashcards ----------
function viewCards() {
  setTab('cards');
  const deckRow = (kind, id, title, sub, n) => h('button', { class: 'deck', onclick: () => go(`#/cards/${kind}/${id}`) },
    h('span', { class: 'deck-title' }, title), h('span', { class: 'small muted' }, `${sub} · ${n} cards`));
  app.replaceChildren(h('section', {},
    h('h1', { class: 'section-title' }, 'Flashcards'),
    h('p', { class: 'lead' }, 'Flip a card to see the answer, then say whether you knew it. Cards you miss come back first in Review.'),
    h('h2', { class: 'sub-title' }, 'Words'),
    h('div', { class: 'decks' }, ...db.course.units.map((u, i) => deckRow('unit', u.id, u.title, `Unit ${i + 1}`, deckFor(db, { kind: 'unit', id: u.id }).length))),
    h('h2', { class: 'sub-title' }, 'Letters'),
    h('div', { class: 'decks' }, ...db.letters.groups.filter((g) => !g.drill).map((g, i) => deckRow('letters', g.id, `Set ${i + 1}`, g.title, groupSymbols(db, g).length)))));
}

function cardFront(c) {
  if (c.kind === 'item') return h('div', { class: 'card-face' }, speakBtn(c.x.he), he(word(c.x), 'huge'));
  return h('p', { class: 'letter-huge', lang: 'he' }, c.kind === 'letter' ? c.x.char : c.x.shown);
}
function cardBack(c) {
  const x = c.x;
  if (c.kind === 'item') return [h('p', { class: 'card-tr' }, x.tr), h('p', { class: 'card-en' }, enLabel(x), ' ', informal(x))];
  if (c.kind === 'letter') return [h('p', { class: 'card-en' }, x.name), h('p', { class: 'card-note' }, x.sound ? `sounds like ${x.sound}` : 'silent')];
  return [h('p', { class: 'card-en' }, x.name), h('p', { class: 'card-note' }, `sounds like ${x.sound_label}`)];
}

function startCards(title, cards, back) {
  document.body.classList.add('in-lesson');
  const queue = shuffle(cards);
  const total = queue.length;
  let known = 0; let seen = 0;
  const again = new Set();
  const show = () => {
    const c = queue.shift();
    if (!c) {
      document.body.classList.remove('in-lesson');
      const xp = Math.max(1, Math.round(known / 2));
      store.recordLesson(state, { lessonId: null, xp });
      refreshStats();
      app.replaceChildren(h('section', { class: 'results' }, h('div', { class: 'burst', 'aria-hidden': 'true' }, '🃏'),
        h('h1', {}, 'Deck done!'), h('p', { class: 'lead' }, `${title}: you knew ${known} of ${total} on the first try.`),
        h('div', { class: 'result-grid' }, h('div', { class: 'card' }, h('b', {}, `+${xp}`), h('span', {}, 'XP')),
          h('div', { class: 'card' }, h('b', {}, known), h('span', {}, 'Knew')), h('div', { class: 'card' }, h('b', {}, again.size), h('span', {}, 'To review'))),
        h('div', { class: 'row-actions center' }, h('button', { class: 'btn', onclick: () => go(back) }, 'Continue'))));
      return;
    }
    const backEl = h('div', { class: 'card-back', hidden: true }, ...cardBack(c));
    const flipBtn = h('button', { class: 'btn wide', onclick: () => flip() }, 'Flip');
    const row = h('div', { class: 'check-row' }, flipBtn);
    const cardEl = h('button', { class: 'flashcard', type: 'button', 'aria-label': 'Flip card', onclick: () => flip() }, cardFront(c), backEl);
    function flip() {
      if (!backEl.hidden) return;
      backEl.hidden = false; cardEl.classList.add('flipped');
      row.replaceChildren(
        h('button', { class: 'btn ghost', onclick: () => answer(false) }, 'Again'),
        h('button', { class: 'btn ok-btn', onclick: () => answer(true) }, 'Got it'));
    }
    function answer(ok) {
      seen += 1;
      store.grade(state, c.key, ok);
      store.save(state);
      if (ok && !again.has(c.key)) known += 1;
      if (!ok) { again.add(c.key); queue.push(c); }
      show();
    }
    app.replaceChildren(h('div', { class: 'lesson' },
      h('div', { class: 'lesson-top' },
        h('button', { class: 'quit', 'aria-label': 'Close deck', onclick: () => { document.body.classList.remove('in-lesson'); go(back); } }, '✕'),
        h('div', { class: 'bar' }, h('i', { style: `width:${Math.round((Math.min(seen, total) / total) * 100)}%` })),
        h('span', { class: 'hearts' }, `${Math.min(seen, total)}/${total}`)),
      h('p', { class: 'lead center' }, title), cardEl, h('p', { class: 'small muted center' }, 'Tap the card to flip it.'), h('div', { class: 'spacer' }), row));
    app.focus();
  };
  show();
}

// ---------- review ----------
function viewReview() {
  setTab('review');
  const due = store.dueKeys(state, 14);
  const seen = Object.keys(state.srs).length;
  if (!due.length) {
    app.replaceChildren(h('div', { class: 'review-empty' },
      h('div', { class: 'burst', 'aria-hidden': 'true' }, '🔁'),
      h('h1', { class: 'section-title' }, seen ? 'Nothing due right now' : 'Review unlocks as you learn'),
      h('p', {}, seen ? 'Words and letters you miss, or peek at, come back here first. Everything else returns 1, 3, 7 and 16 days after you get it right.' : 'Finish a lesson and the words you meet will be scheduled for review.'),
      h('button', { class: 'btn', onclick: () => go('#/') }, 'Back to lessons')));
    return;
  }
  app.replaceChildren(h('section', {},
    h('h1', { class: 'section-title' }, 'Review'),
    h('p', { class: 'lead' }, `${due.length} card${due.length === 1 ? '' : 's'} due. Missed ones come first.`),
    h('button', { class: 'btn wide', onclick: () => startSession({ title: 'Review', questions: buildReview(db, due), isReview: true, back: '#/review' }) }, 'Start review')));
}

// ---------- about ----------
function viewAbout() {
  setTab('about');
  const counts = { items: db.items.length, sentences: db.sentences.length, lessons: allLessons().length, units: db.course.units.length,
    groups: db.letters.groups.filter((g) => !g.drill).length, drills: db.letters.groups.filter((g) => g.drill).length };
  const synced = cloudStatus() !== 'off';
  const toggle = h('input', { type: 'checkbox', class: 'switch', 'aria-label': 'Show vowel points', checked: settings.niqqud ? true : null,
    onchange: (e) => { settings.niqqud = e.target.checked; saveSettings(); refreshStats(); } });
  const sec = h('section', { class: 'prose' });
  sec.innerHTML = `
    <h1 class="section-title">About Ivrit</h1>
    <p><span class="he" lang="he" dir="rtl">עִבְרִית</span> <i>ivrít</i> is Hebrew. This is a free, bite-sized course in modern Israeli Hebrew: ${counts.units} units and ${counts.lessons} lessons with ${counts.items} words and word forms and ${counts.sentences} sentences, plus ${counts.groups} letter sets and ${counts.drills} letter drills with tracing.</p>
    <h2>How it works</h2>
    <ul>
      <li>Every new word or letter appears first on a card. Then it is practised several ways, a few at a time.</li>
      <li><b>Show answer</b> flips any question to its answer. It costs no heart; the item just comes back later in Review.</li>
      <li>In sentences, tap a Hebrew word to see how it reads and what it means. In the sentence builder, words line up right to left.</li>
      <li><b>Flashcards</b> drill any unit or letter set. <b>Review</b> brings back what you missed, then each card again after 1, 3, 7 and 16 days.</li>
    </ul>
    <h2>Grammar you will meet</h2>
    <ul>
      <li>There is no present-tense "is": <span class="he" lang="he" dir="rtl">הוּא עָיֵף</span> <i>hu ayéf</i> means "he is tired".</li>
      <li>Present-tense verbs and adjectives agree with who you are talking about: masculine or feminine, singular or plural. A man says <span class="he" lang="he" dir="rtl">אֲנִי אוֹכֵל</span> <i>aní okhél</i>, a woman <span class="he" lang="he" dir="rtl">אֲנִי אוֹכֶלֶת</span> <i>aní okhélet</i>.</li>
      <li>Adjectives come after the noun: <span class="he" lang="he" dir="rtl">יֶלֶד קָטָן</span>, a small boy.</li>
      <li>Words marked <span class="informal">informal</span> are everyday slang (yalla, sababa, b'séder): fine with friends, not in a formal letter.</li>
    </ul>
    <h2>Transliteration</h2>
    <p>Hebrew words are spelled out in English letters using Wiktionary's modern Hebrew transliteration, which follows the Academy of the Hebrew Language's simplified rules for consonants:</p>
    <table><tbody>
      <tr><td><i>kh</i></td><td>ח and כ (a throaty sound, like Scottish "loch"); the Academy writes ח as <i>ẖ</i>, here it is kh because the two sound the same today</td></tr>
      <tr><td><i>ts</i></td><td>צ</td></tr><tr><td><i>sh</i></td><td>שׁ</td></tr>
      <tr><td><i>'</i></td><td>a break between vowels, from א or ע</td></tr>
      <tr><td><i>á é í ó ú</i></td><td>the accent marks the stressed syllable: <i>shalóm</i>, <i>todá</i></td></tr>
    </tbody></table>
    <p>When you type a transliteration, accents and apostrophes are optional, and <i>ch</i> or <i>tz</i> are accepted too. Letter and syllable readings in the Letters course are built by rule from each letter's sound and each vowel's sound, from Wikipedia's tables, to show how the script works.</p>
    <h2>Vowel points</h2>
    <p>Words are shown with niqqud (vowel points) to start with. Turn them off to read Hebrew the way Israelis write it. Some words gain an extra ו or י when written without points (<span class="he" lang="he" dir="rtl">שֻׁלְחָן</span> becomes <span class="he" lang="he" dir="rtl">שולחן</span>); the course stores both spellings. Example sentences quoted from Wiktionary only come with points, so with points off they show the same letters without them.</p>`;
  const setting = h('div', { class: 'setting' }, h('div', {}, h('b', {}, 'Show vowel points (niqqud)'), h('p', {}, 'On: easier to read. Off: real-world Hebrew. Also the ', he('נִקּוּד'), ' button at the top.')), toggle);
  sec.append(setting);
  const rest = h('div');
  rest.innerHTML = `
    <h2>Letter tracing</h2>
    <p>${db.tracing.note} Draw each stroke from the gold dot in the direction of the arrow. A stroke counts when it follows the guide closely enough and goes the right way; after two misses on a stroke the app animates it for you.</p>
    <h2>Audio</h2>
    <p>${canSpeak() ? 'Your browser has a Hebrew voice, so 🔊 buttons read words aloud, and some lessons include listening questions. It is a synthetic voice: treat it as a guide.' : 'Your browser has no Hebrew text-to-speech voice, so audio and listening questions are off. Phones and Macs usually have one in their speech or accessibility settings; the 🔊 buttons appear once it is available.'}</p>
    <h2>Sources and accuracy</h2>
    <p>Every word was checked against its English Wiktionary entry: spelling with and without vowel points, meaning, transliteration and gender. Present-tense verb forms come from each verb's conjugation table on Wiktionary, and each form's transliteration from that form's own entry. Letters and vowel points come from Wikipedia's <a href="https://en.wikipedia.org/wiki/Hebrew_alphabet" target="_blank" rel="noopener">Hebrew alphabet</a> and <a href="https://en.wikipedia.org/wiki/Niqqud" target="_blank" rel="noopener">Niqqud</a> articles. Some example sentences are quoted from Wiktionary; others were composed for this course from checked words in simple present-tense patterns, and are marked as composed in <a href="https://github.com/cveenstra/ivrit/blob/main/SOURCES.md" target="_blank" rel="noopener">SOURCES.md</a>, which also lists everything left out. Course data is adapted from Wiktionary and Wikipedia under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>; the code is MIT licensed. This is a learning aid, not a substitute for a teacher or a native speaker.</p>
    <h2>Your progress</h2>
    <p>${state.xp} XP, ${Object.keys(state.done).filter((k) => !k.startsWith('L:') && !k.startsWith('P:')).length} of ${counts.lessons} lessons and ${Object.keys(state.done).filter((k) => k.startsWith('L:')).length} letter sets finished, ${Object.keys(state.srs).length} cards in review. ${synced ? 'Progress is saved to your account, so it follows you between devices.' : 'Progress is saved in this browser.'}</p>`;
  sec.append(rest);
  const resetRow = h('div', { class: 'row-actions' });
  const armReset = () => resetRow.replaceChildren(
    h('span', { class: 'small' }, 'Erase all XP, lessons and review cards?'),
    h('button', { class: 'btn danger', onclick: () => { store.reset(); state = store.load(); refreshStats(); toast('Progress reset'); viewAbout(); } }, 'Yes, erase'),
    h('button', { class: 'btn ghost', onclick: () => resetRow.replaceChildren(resetBtn) }, 'Cancel'));
  const resetBtn = h('button', { class: 'btn ghost', onclick: armReset }, 'Reset progress');
  resetRow.append(resetBtn);
  sec.append(resetRow);
  app.replaceChildren(sec);
}

// ---------- routing ----------
function route() {
  if (!db) return;
  const [page, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  document.body.classList.remove('in-lesson');
  window.scrollTo(0, 0);
  const speech = canSpeak();
  if (page === 'lesson' && a) {
    const lesson = allLessons().find((l) => l.id === a);
    if (!lesson || !isUnlocked(a)) return go('#/');
    return startSession({ title: lesson.title, questions: buildLesson(db, lesson, unitOf(a), { speech }), lessonId: lesson.id, tip: lesson.tip });
  }
  if (page === 'practice' && a) {
    const unit = db.course.units.find((u) => u.id === a);
    if (!unit) return go('#/');
    return startSession({ title: `${unit.title}: practice`, questions: buildUnitPractice(db, unit, { speech }), lessonId: `P:${unit.id}` });
  }
  if ((page === 'learn-letters' || page === 'practice-letters') && db.group[a]) {
    const g = db.group[a];
    if (!lettersUnlocked(g)) return go('#/letters');
    const practice = page === 'practice-letters';
    return startSession({ title: g.drill ? g.title : `Letters: ${g.title}`, questions: buildLettersLesson(db, g, { practiceOnly: practice }),
      lessonId: `L:${g.id}`, tip: practice ? null : g.tip, back: '#/letters' });
  }
  if (page === 'cards' && a && b) {
    const deck = { kind: a === 'unit' ? 'unit' : 'letters', id: b };
    const title = a === 'unit' ? db.course.units.find((u) => u.id === b)?.title : db.group[b] && `Letters: ${db.group[b].title}`;
    if (!title) return go('#/cards');
    return startCards(title, deckFor(db, deck), a === 'unit' ? '#/' : '#/letters');
  }
  if (page === 'letters') return viewLetters();
  if (page === 'cards') return viewCards();
  if (page === 'review') return viewReview();
  if (page === 'about') return viewAbout();
  return viewHome();
}

async function boot() {
  initSpeech();
  onVoiceChange(() => { if (/about/.test(location.hash)) viewAbout(); });
  onCloudStatus(renderCloud);
  const get = (f) => fetch(`data/${f}`).then((r) => { if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.json(); });
  try {
    const [items, script, sentences, course, letters, tracing] = await Promise.all(
      ['items.json', 'script.json', 'sentences.json', 'course.json', 'letters.json', 'tracing.json'].map(get));
    db = indexData({ items: items.items, script, sentences: sentences.sentences, course, letters, tracing });
  } catch (e) {
    app.replaceChildren(h('p', { class: 'loading' }, `Couldn't load the course data (${e.message}). Reload to try again.`));
    return;
  }
  refreshStats();
  window.addEventListener('hashchange', route);
  route();
  // When running as a claude.ai artifact, merge in the account copy of progress.
  startCloudSync().then((merged) => {
    if (!merged) return;
    state = store.load();
    refreshStats();
    if (!document.body.classList.contains('in-lesson')) route();
  }).catch(() => {});
}
boot();

// exposed for the headless checks in scripts/
window.__ivrit = { normTr };
