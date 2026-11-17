// fx.js — particles, floating score text and screen shake.
//
// The world emits events; this module turns them into short-lived visual
// feedback. It owns no game rules and draws nothing by itself — the
// renderer asks it for the live particles and texts each frame.

import { makeRng, range } from './rng.js';

export function createFx(seed) {
  return {
    rng: makeRng(seed ^ 0x9e3779b9),
    particles: [],
    texts: [],
    shake: 0,
  };
}

export function burst(fx, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = fx.rng() * Math.PI * 2;
    const v = speed * range(fx.rng, 0.3, 1);
    fx.particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 30,
      life: range(fx.rng, 0.35, 0.8),
      maxLife: 0.8,
      size: range(fx.rng, 2, 5),
      color,
    });
  }
}

export function floatText(fx, x, y, text, color) {
  fx.texts.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

export function addShake(fx, amount) {
  fx.shake = Math.max(fx.shake, amount);
}

export function feedEvent(fx, event) {
  if (event.type === 'catch') {
    burst(fx, event.x, event.y, event.golden ? '#ffd34d' : '#ffe9a8', event.golden ? 22 : 12, 150);
    floatText(fx, event.x, event.y - 18, `+${event.points}`, event.golden ? '#ffd34d' : '#ffffff');
    if (event.combo >= 3) floatText(fx, event.x, event.y - 40, `COMBO x${event.combo}`, '#7fe7ff');
  } else if (event.type === 'hit') {
    burst(fx, event.x, event.y, '#b06cff', 26, 220);
    addShake(fx, 10);
    floatText(fx, event.x, event.y - 40, 'OUCH!', '#ff7a7a');
  } else if (event.type === 'shieldBlock') {
    burst(fx, event.x, event.y, '#7fe7ff', 20, 180);
    floatText(fx, event.x, event.y - 40, 'SHIELD!', '#7fe7ff');
  } else if (event.type === 'brave') {
    floatText(fx, event.x, event.y, 'BRAVE +2', '#b8ff9e');
  } else if (event.type === 'levelup') {
    floatText(fx, 640, 170, `LEVEL ${event.level} — ${event.name.toUpperCase()}`, '#ffd34d');
  } else if (event.type === 'shieldPickup') {
    burst(fx, event.x, event.y, '#7fe7ff', 16, 140);
    floatText(fx, event.x, event.y - 18, 'SHIELD UP', '#7fe7ff');
  } else if (event.type === 'dawn') {
    burst(fx, 640, 200, '#ffd34d', 60, 260);
  }
}

export function stepFx(fx, dt) {
  for (let i = fx.particles.length - 1; i >= 0; i -= 1) {
    const p = fx.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      fx.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
  }
  for (let i = fx.texts.length - 1; i >= 0; i -= 1) {
    const t = fx.texts[i];
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) fx.texts.splice(i, 1);
  }
  if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - dt * 26);
}

export function shakeOffset(fx) {
  if (fx.shake <= 0.2) return { x: 0, y: 0 };
  return {
    x: (fx.rng() - 0.5) * fx.shake,
    y: (fx.rng() - 0.5) * fx.shake,
  };
}
