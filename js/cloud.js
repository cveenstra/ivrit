// Account sync, used when the app runs as a claude.ai artifact. There the artifact's
// document store keeps a private copy of each viewer's progress at
// data/users/<viewer id>/progress, so it follows them between phone and desktop.
// Anywhere else (GitHub Pages, a local server) window.claude is absent and this does
// nothing: localStorage stays the only copy.
//
// On open the device copy and the account copy are merged (nothing is lost: lessons
// and review cards are unioned, XP and streak take the larger value). After that every
// change is pushed a moment later, and immediately when the page is hidden.
import * as store from './storage.js';

const PUSH_DELAY_MS = 1500;
let status = 'off'; // 'off' | 'connecting' | 'synced' | 'saving' | 'error'
const listeners = new Set();
export const cloudStatus = () => status;
export const onCloudStatus = (fn) => listeners.add(fn);
function setStatus(next) {
  if (status === next) return;
  status = next;
  listeners.forEach((fn) => { try { fn(status); } catch { /* ignore */ } });
}

let ref = null;
let timer = null;
let dirty = false;

async function push(retried = false) {
  if (!ref || !dirty) return;
  dirty = false;
  setStatus('saving');
  try {
    const body = JSON.parse(JSON.stringify(store.load()));
    delete body.merged;
    await ref.set(body);
    setStatus('synced');
  } catch (e) {
    const code = e && e.code;
    if (code === 'unavailable' && !retried) { dirty = true; setTimeout(() => push(true), 1000 + Math.random() * 2000); return; }
    if (['revoked', 'not_granted', 'capability_disabled', 'capability_removed'].includes(code)) { ref = null; setStatus('off'); return; }
    dirty = true; // keep the change; the next one (or hiding the page) tries again
    setStatus('error');
  }
}

function schedulePush() {
  if (!ref) return;
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(push, PUSH_DELAY_MS);
}

/** Resolves with the merged state when the account copy was read, or null when there is no account store. */
export async function startCloudSync() {
  let claude;
  try { claude = window.claude; } catch { return null; }
  if (!claude || typeof claude.use !== 'function') return null;
  setStatus('connecting');
  let db = null; let user = null;
  try { [db, user] = await Promise.all([claude.use('db'), claude.use('user')]); } catch { /* unavailable */ }
  let uid = null;
  try { uid = user ? await user.id() : null; } catch { uid = null; }
  if (!db || !uid) { setStatus('off'); return null; }
  try { ref = db.doc(`data/users/${uid}/progress`); } catch { setStatus('off'); return null; }

  let merged = null;
  try {
    const snap = await ref.get();
    const remote = snap && snap.exists ? JSON.parse(JSON.stringify(snap.data())) : null; // snapshots are frozen
    const local = store.load();
    merged = remote ? store.merge(local, remote) : local;
    store.replace(merged);
    dirty = true;
    await push();
  } catch {
    setStatus('error'); // keep working locally; the next change tries again
  }
  store.setWriteHook(schedulePush);
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && dirty) { clearTimeout(timer); push(); }
    });
  } catch { /* no document */ }
  return merged;
}
