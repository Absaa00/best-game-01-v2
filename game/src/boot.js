// boot.js — wires Ember Keeper together in the browser.
//
// Owns the canvas, the input (mouse and keys), the animation loop and the
// screen flow (title → playing → pause → dawn → victory / game over). The
// rules live in world.js, the drawing in render.js, the sounds in
// audio.js — this file only connects them.
//
// Screenshot mode: ?shot=start|play|dawn|victory&seed=N renders one fixed
// frame of that state and names it in document.title, so the entry's
// screenshots are real renders of this code.

import { WORLD_W, WORLD_H, createWorld, startGame, step } from './world.js';
import { draw } from './render.js';
import { createFx, feedEvent, stepFx } from './fx.js';
import { createAudio, ensureAudio, playEventSound, toggleMute } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '7');

const world = createWorld(seed);
const fx = createFx(seed);
const audio = createAudio();
let best = 0;
try {
  best = Number(localStorage.getItem('ember-keeper-best') || '0') || 0;
} catch (e) {
  best = 0;
}

const input = { pointerX: null, left: false, right: false };

function saveBest() {
  if (world.score > best) {
    best = world.score;
    try {
      localStorage.setItem('ember-keeper-best', String(best));
    } catch (e) {
      // Private mode: the score still shows, it just is not kept.
    }
  }
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
  canvas.width = Math.round(WORLD_W * scale);
  canvas.height = Math.round(WORLD_H * scale);
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
}

function renderFrame() {
  ctx.setTransform(canvas.width / WORLD_W, 0, 0, canvas.height / WORLD_H, 0, 0);
  draw(ctx, world, fx, { best, muted: audio.muted });
}

function handleEvents(events) {
  for (const event of events) {
    feedEvent(fx, event);
    playEventSound(audio, event);
    if (event.type === 'catch') {
      announce(`Caught a light. Score ${world.score}. ${world.motesCaught} of 60.`);
    } else if (event.type === 'hit') {
      announce(`A wisp touched the lantern. ${world.hearts} hearts left.`);
    } else if (event.type === 'levelup') {
      announce(`Level ${event.level}: ${event.name}.`);
    } else if (event.type === 'dawn') {
      announce('Dawn breaks! Sixty lights caught.');
      saveBest();
    } else if (event.type === 'victory') {
      announce(`Victory! Score ${world.score}.`);
      saveBest();
    } else if (event.type === 'gameover') {
      announce(`Game over. Score ${world.score}. Press R to play again.`);
      saveBest();
    }
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (world.state === 'playing') {
    const events = step(world, dt, input);
    handleEvents(events);
  } else if (world.state === 'dawn') {
    const events = step(world, dt, input);
    handleEvents(events);
  }
  stepFx(fx, dt);
  renderFrame();
  requestAnimationFrame(loop);
}

function beginPlay() {
  ensureAudio(audio);
  if (world.state === 'title' || world.state === 'victory' || world.state === 'gameover') {
    startGame(world);
    announce('Play! Catch 60 starlight. Dodge the wisps.');
  }
}

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  input.pointerX = ((event.clientX - rect.left) / rect.width) * WORLD_W;
});
canvas.addEventListener('pointerdown', (event) => {
  ensureAudio(audio);
  const rect = canvas.getBoundingClientRect();
  input.pointerX = ((event.clientX - rect.left) / rect.width) * WORLD_W;
  beginPlay();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') input.left = true;
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') input.right = true;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    beginPlay();
  }
  if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
    if (world.state === 'playing') {
      world.state = 'paused';
      announce('Paused.');
    } else if (world.state === 'paused') {
      world.state = 'playing';
      announce('Resumed.');
    }
  }
  if (event.key === 'm' || event.key === 'M') {
    ensureAudio(audio);
    const muted = toggleMute(audio);
    announce(muted ? 'Sound off.' : 'Sound on.');
  }
  if (event.key === 'r' || event.key === 'R') {
    if (world.state !== 'title') {
      startGame(world);
      announce('A new night begins.');
    }
  }
});
window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') input.left = false;
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') input.right = false;
});
window.addEventListener('resize', fitCanvas);

fitCanvas();
if (shotName) {
  // One fixed frame, no loop: the screenshot is a still of this state.
  const state = applyShot(world, fx, shotName);
  stepFx(fx, 0.016);
  renderFrame();
  document.title = `ember-keeper shot ${state}`;
  announce(`Screenshot state: ${state}.`);
} else {
  announce('Ember Keeper. Catch 60 starlight, dodge the wisps.');
  requestAnimationFrame(loop);
}
