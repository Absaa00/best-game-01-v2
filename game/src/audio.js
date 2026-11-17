// audio.js — procedural WebAudio for Ember Keeper.
//
// No audio files: every sound is a few oscillators shaped by an envelope.
// The module is silent until the player first interacts (browsers require
// a gesture), and the M key or the mute button toggles it off entirely.

export function createAudio() {
  return { ctx: null, muted: false, master: null };
}

export function ensureAudio(audio) {
  if (audio.ctx || typeof window === 'undefined') return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audio.ctx = new Ctx();
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = 0.35;
  audio.master.connect(audio.ctx.destination);
}

function tone(audio, freq, dur, type, vol, when = 0, slideTo = null) {
  if (!audio.ctx || audio.muted) return;
  const t0 = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playEventSound(audio, event) {
  if (!audio.ctx || audio.muted) return;
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  if (event.type === 'catch') {
    const base = 520 + Math.min(event.combo, 5) * 60;
    tone(audio, base, 0.14, 'sine', 0.5);
    tone(audio, base * 1.5, 0.12, 'sine', 0.25, 0.03);
    if (event.golden) {
      tone(audio, 880, 0.2, 'triangle', 0.4, 0.05);
      tone(audio, 1318, 0.28, 'triangle', 0.3, 0.1);
    }
  } else if (event.type === 'hit') {
    tone(audio, 160, 0.3, 'sawtooth', 0.5, 0, 60);
    tone(audio, 90, 0.35, 'square', 0.3, 0, 45);
  } else if (event.type === 'shieldBlock') {
    tone(audio, 660, 0.16, 'triangle', 0.4);
    tone(audio, 990, 0.2, 'triangle', 0.3, 0.06);
  } else if (event.type === 'brave') {
    tone(audio, 740, 0.1, 'sine', 0.3);
  } else if (event.type === 'levelup') {
    [523, 659, 784, 1046].forEach((f, i) => tone(audio, f, 0.16, 'triangle', 0.35, i * 0.07));
  } else if (event.type === 'shieldPickup') {
    tone(audio, 587, 0.14, 'sine', 0.4);
    tone(audio, 880, 0.18, 'sine', 0.35, 0.07);
  } else if (event.type === 'dawn') {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(audio, f, 0.5, 'sine', 0.3, i * 0.09));
  } else if (event.type === 'victory') {
    [523, 659, 784, 1046].forEach((f, i) => tone(audio, f, 0.4, 'triangle', 0.35, i * 0.12));
  } else if (event.type === 'gameover') {
    [392, 330, 262, 196].forEach((f, i) => tone(audio, f, 0.35, 'triangle', 0.3, i * 0.14));
  }
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
