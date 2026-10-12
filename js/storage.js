// Progress lives in localStorage when it is available. Every access is wrapped:
// private windows, blocked storage and quota errors fall back to an in-memory copy,
// so the app keeps working (progress just won't survive a reload). When the app runs
// as a claude.ai artifact, cloud.js also keeps a copy in the viewer's account.
const KEY = 'ivrit.v1';
const blank = () => ({ xp: 0, streak: { count: 0, last: null }, today: { date: null, xp: 0 }, done: {}, srs: {}, savedAt: 0 });
let memory = null;
let writeHook = null;

export function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function load() {
  if (memory) return memory;
  let state = blank();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...blank(), ...JSON.parse(raw) };
  } catch { /* storage unavailable or corrupt: start fresh in memory */ }
  memory = state;
  return memory;
}

export function save(state) {
  state.savedAt = Date.now();
  memory = state;
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* keep in memory only */ }
  if (writeHook) writeHook();
}

/** Replace the working copy (used when the account copy arrives). Returns the new state. */
export function replace(next) {
  // Mutate in place so anything holding the state object (an open lesson) keeps writing to it.
  const fresh = { ...blank(), ...next };
  if (memory) { Object.keys(memory).forEach((k) => delete memory[k]); Object.assign(memory, fresh); } else memory = fresh;
  try { window.localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* ignore */ }
  return memory;
}

export function setWriteHook(fn) { writeHook = fn; }

export function reset() {
  memory = blank();
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
  save(memory);
}

/**
 * Combine two progress copies (this device and the account) without losing anything:
 * finished lessons and review cards are unioned, XP and streak take the larger value.
 */
export function merge(a, b) {
  const A = { ...blank(), ...a }; const B = { ...blank(), ...b };
  const done = { ...A.done };
  for (const [k, v] of Object.entries(B.done)) done[k] = Math.max(done[k] || 0, v);
  const srs = { ...A.srs };
  for (const [k, card] of Object.entries(B.srs)) {
    const mine = srs[k];
    if (!mine || card.seen > mine.seen || (card.seen === mine.seen && card.due > mine.due)) srs[k] = card;
  }
  const streak = (A.streak.last || '') >= (B.streak.last || '')
    ? { ...A.streak, count: A.streak.last === B.streak.last ? Math.max(A.streak.count, B.streak.count) : A.streak.count }
    : { ...B.streak };
  const todayRec = A.today.date === B.today.date ? { date: A.today.date, xp: Math.max(A.today.xp, B.today.xp) }
    : ((A.today.date || '') > (B.today.date || '') ? A.today : B.today);
  return { xp: Math.max(A.xp, B.xp), streak, today: todayRec, done, srs, savedAt: Math.max(A.savedAt || 0, B.savedAt || 0), merged: true };
}

// Streak: counts consecutive local days with at least one finished lesson.
export function currentStreak(state) {
  const { count, last } = state.streak;
  if (!last) return 0;
  const gap = Math.round((new Date(today()) - new Date(last)) / 86400000);
  return gap <= 1 ? count : 0;
}

export function recordLesson(state, { lessonId, xp }) {
  const t = today();
  const s = state.streak;
  if (s.last !== t) {
    const gap = s.last ? Math.round((new Date(t) - new Date(s.last)) / 86400000) : null;
    s.count = gap === 1 ? s.count + 1 : 1;
    s.last = t;
  }
  if (state.today.date !== t) state.today = { date: t, xp: 0 };
  state.today.xp += xp;
  state.xp += xp;
  if (lessonId) state.done[lessonId] = (state.done[lessonId] || 0) + 1;
  save(state);
}

// Leitner-style spaced repetition. Box 1 is due immediately; each correct answer
// moves a card up a box and pushes its next review further out.
const INTERVAL_DAYS = [0, 0, 1, 3, 7, 16];
export function grade(state, key, correct) {
  const card = state.srs[key] || { box: 1, due: today(), miss: 0, seen: 0 };
  card.seen += 1;
  if (correct) card.box = Math.min(card.box + 1, 5);
  else { card.box = 1; card.miss += 1; }
  const d = new Date();
  d.setDate(d.getDate() + INTERVAL_DAYS[card.box]);
  card.due = today(d);
  state.srs[key] = card;
}

/** 0 (never seen) to 5 (well known), for strength meters. */
export function strength(state, key) {
  const c = state.srs[key];
  return c ? c.box : 0;
}

export function dueKeys(state, limit = 12) {
  const t = today();
  return Object.entries(state.srs)
    .filter(([, c]) => c.due <= t && (c.miss > 0 || c.box < 5))
    .sort((a, b) => a[1].box - b[1].box || b[1].miss - a[1].miss || (a[1].due < b[1].due ? -1 : 1))
    .slice(0, limit)
    .map(([k]) => k);
}
