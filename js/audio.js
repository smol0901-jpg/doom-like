// Procedural sounds via Web Audio API

let ctx = null;
let enabled = true;

export function setSoundEnabled(v) {
  enabled = v;
}

export function isSoundEnabled() {
  return enabled;
}

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq, dur, type = 'square', vol = 0.15) {
  if (!enabled) return;
  try {
    const c = ensureCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch (_) {}
}

export const SFX = {
  shoot: () => { beep(180, 0.08, 'square', 0.12); beep(90, 0.12, 'sawtooth', 0.08); },
  shotgun: () => { beep(100, 0.15, 'sawtooth', 0.18); beep(60, 0.2, 'square', 0.1); },
  hit: () => beep(300, 0.06, 'triangle', 0.1),
  hurt: () => { beep(120, 0.1, 'sawtooth', 0.15); beep(80, 0.15, 'square', 0.1); },
  pickup: () => { beep(440, 0.08, 'sine', 0.12); beep(660, 0.1, 'sine', 0.1); },
  door: () => beep(200, 0.2, 'triangle', 0.1),
  death: () => { beep(150, 0.3, 'sawtooth', 0.15); beep(50, 0.4, 'square', 0.12); },
  enemyDeath: () => { beep(200, 0.15, 'sawtooth', 0.12); beep(80, 0.25, 'triangle', 0.1); },
  level: () => { beep(523, 0.1, 'sine', 0.1); beep(659, 0.1, 'sine', 0.1); beep(784, 0.2, 'sine', 0.12); }
};
