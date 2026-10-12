// Audio uses the browser's own speech engine, and only when it offers a Hebrew
// (he / he-IL, or the older iw) voice. Without one the speaker buttons stay hidden.
// No recorded or downloaded audio is used.
let voice = null;
const listeners = [];

function pick() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices() || [];
  const v = voices.find((x) => /^(he|iw)(-|_|$)/i.test(x.lang)) || null;
  if (v !== voice) {
    voice = v;
    listeners.forEach((fn) => fn(!!v));
  }
}

export function initSpeech() {
  try {
    if (!('speechSynthesis' in window)) return;
    pick();
    window.speechSynthesis.addEventListener?.('voiceschanged', pick);
  } catch { voice = null; }
}

export const canSpeak = () => !!voice;
export const onVoiceChange = (fn) => { listeners.push(fn); };

export function speak(text) {
  if (!voice) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
