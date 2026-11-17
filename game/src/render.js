// render.js — every pixel of Ember Keeper, drawn with the canvas 2D API.
//
// The renderer reads the world and the effects and draws the night: sky,
// stars, moon and hills; the lantern keeper; falling motes and wisps; the
// HUD; and the title, pause, dawn, victory and game-over screens. Nothing
// here changes the world — it only shows it, so the screenshots are true
// renders of the game itself.

import { WORLD_W, WORLD_H, KEEPER_Y, MAX_HEARTS } from './world.js';
import { levelDef, MOTES_TO_WIN } from './levels.js';
import { makeRng, range } from './rng.js';
import { shakeOffset } from './fx.js';

const STARS = (() => {
  const rng = makeRng(20261117);
  const stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({ x: range(rng, 0, WORLD_W), y: range(rng, 0, 300), r: range(rng, 0.6, 2.1), tw: range(rng, 0, Math.PI * 2) });
  }
  return stars;
})();

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSky(ctx, world, dawnMix) {
  const def = levelDef(world.level);
  const top = mixColor(def.sky[0], '#ff9a5c', dawnMix);
  const bottom = mixColor(def.sky[1], '#ffd9a0', dawnMix);
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Stars fade as dawn comes.
  ctx.save();
  ctx.globalAlpha = 1 - dawnMix * 0.85;
  for (const s of STARS) {
    const a = 0.45 + 0.4 * Math.sin(world.time * 1.4 + s.tw);
    ctx.globalAlpha = Math.max(0, a * (1 - dawnMix * 0.85));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Moon.
  ctx.save();
  ctx.globalAlpha = 1 - dawnMix * 0.6;
  const mg = ctx.createRadialGradient(1140, 66, 8, 1140, 66, 60);
  mg.addColorStop(0, 'rgba(255, 244, 200, 0.9)');
  mg.addColorStop(1, 'rgba(255, 244, 200, 0)');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(1140, 66, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(1140, 66, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hills.
  ctx.fillStyle = mixColor('#0a0e24', '#7a4a3a', dawnMix);
  ctx.beginPath();
  ctx.moveTo(0, WORLD_H);
  for (let x = 0; x <= WORLD_W; x += 20) {
    ctx.lineTo(x, 452 - Math.sin(x * 0.006) * 14 - Math.sin(x * 0.017) * 6);
  }
  ctx.lineTo(WORLD_W, WORLD_H);
  ctx.closePath();
  ctx.fill();
}

function mixColor(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

function drawMote(ctx, mote, time) {
  const glow = mote.golden ? '#ffd34d' : '#ffe9a8';
  const pulse = 1 + 0.12 * Math.sin(time * 5 + mote.phase);
  const r = mote.r * pulse;
  const g = ctx.createRadialGradient(mote.x, mote.y, 1, mote.x, mote.y, r * 3);
  g.addColorStop(0, glow);
  g.addColorStop(1, 'rgba(255, 220, 120, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(mote.x, mote.y, r * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mote.golden ? '#ffcf3d' : '#fff6cf';
  ctx.beginPath();
  ctx.arc(mote.x, mote.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mote.x - r * 0.3, mote.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  if (mote.golden) {
    ctx.strokeStyle = '#ffdf80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawWisp(ctx, wisp, time) {
  const bob = Math.sin(time * 3 + wisp.phase) * 3;
  const y = wisp.y + bob;
  const g = ctx.createRadialGradient(wisp.x, y, 2, wisp.x, y, wisp.r * 2.4);
  g.addColorStop(0, 'rgba(176, 108, 255, 0.55)');
  g.addColorStop(1, 'rgba(176, 108, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(wisp.x, y, wisp.r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wisp.kind === 'dart' ? '#c98bff' : '#9a5cff';
  ctx.beginPath();
  if (wisp.kind === 'dart') {
    ctx.moveTo(wisp.x, y - wisp.r - 6);
    ctx.lineTo(wisp.x + wisp.r, y + wisp.r);
    ctx.lineTo(wisp.x - wisp.r, y + wisp.r);
  } else {
    ctx.arc(wisp.x, y, wisp.r, Math.PI, 0);
    ctx.lineTo(wisp.x + wisp.r, y + wisp.r * 0.9);
    ctx.lineTo(wisp.x + wisp.r * 0.5, y + wisp.r * 0.45);
    ctx.lineTo(wisp.x, y + wisp.r * 0.9);
    ctx.lineTo(wisp.x - wisp.r * 0.5, y + wisp.r * 0.45);
    ctx.lineTo(wisp.x - wisp.r, y + wisp.r * 0.9);
  }
  ctx.closePath();
  ctx.fill();
  // Eyes.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(wisp.x - 5, y - 3, 2.6, 0, Math.PI * 2);
  ctx.arc(wisp.x + 5, y - 3, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a0a4a';
  ctx.beginPath();
  ctx.arc(wisp.x - 5, y - 3, 1.3, 0, Math.PI * 2);
  ctx.arc(wisp.x + 5, y - 3, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawOrb(ctx, orb, time) {
  const pulse = 1 + 0.15 * Math.sin(time * 4);
  ctx.strokeStyle = '#7fe7ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.r * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#d8f7ff';
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7fe7ff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHIELD', orb.x, orb.y + 26);
}

function drawKeeper(ctx, world) {
  const keeper = world.keeper;
  const blink = keeper.invuln > 0 && Math.floor(world.time * 12) % 2 === 0;
  if (blink) return;
  const flick = 1 + 0.1 * Math.sin(world.time * 9) + 0.06 * Math.sin(world.time * 23);
  const x = keeper.x;
  const y = KEEPER_Y;

  // Warm glow.
  const g = ctx.createRadialGradient(x, y - 6, 4, x, y - 6, 74);
  g.addColorStop(0, 'rgba(255, 190, 90, 0.5)');
  g.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 6, 74, 0, Math.PI * 2);
  ctx.fill();

  // Shield ring.
  if (keeper.shield) {
    ctx.strokeStyle = 'rgba(127, 231, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 6, 46, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Lantern body.
  ctx.fillStyle = '#3a2a18';
  roundRect(ctx, x - 24, y - 30, 48, 44, 8);
  ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Glass.
  ctx.fillStyle = '#ffe9a8';
  roundRect(ctx, x - 17, y - 24, 34, 32, 5);
  ctx.fill();
  // Flame.
  ctx.fillStyle = '#ff9d2e';
  ctx.beginPath();
  ctx.ellipse(x, y - 8, 7 * flick, 11 * flick, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.ellipse(x, y - 5, 3.5 * flick, 6 * flick, 0, 0, Math.PI * 2);
  ctx.fill();
  // Handle.
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y - 30, 12, Math.PI, 0);
  ctx.stroke();
  // Base.
  ctx.fillStyle = '#2a1e10';
  ctx.fillRect(x - 26, y + 14, 52, 6);
}

function drawParticles(ctx, fx) {
  for (const p of fx.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, fx) {
  ctx.textAlign = 'center';
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world, best) {
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}`, 18, 36);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#ffd34d';
  ctx.fillText(`BEST ${Math.max(best, world.score)}`, 18, 60);

  // Dawn meter, top center.
  const mw = 420;
  const mx = (WORLD_W - mw) / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  roundRect(ctx, mx - 6, 14, mw + 12, 30, 10);
  ctx.fill();
  const fill = world.motesCaught / MOTES_TO_WIN;
  const grad = ctx.createLinearGradient(mx, 0, mx + mw, 0);
  grad.addColorStop(0, '#ffb347');
  grad.addColorStop(1, '#ffe9a8');
  ctx.fillStyle = grad;
  if (fill > 0) {
    roundRect(ctx, mx, 18, mw * fill, 22, 8);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`DAWN ${world.motesCaught}/${MOTES_TO_WIN}`, WORLD_W / 2, 34);

  // Hearts + level, top right.
  ctx.textAlign = 'right';
  for (let i = 0; i < MAX_HEARTS; i += 1) {
    const hx = WORLD_W - 24 - i * 34;
    ctx.fillStyle = i < world.hearts ? '#ff5d73' : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(hx - 8, 26, 8, 0, Math.PI * 2);
    ctx.arc(hx + 8, 26, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 15, 28);
    ctx.lineTo(hx, 44);
    ctx.lineTo(hx + 15, 28);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`LEVEL ${world.level}`, WORLD_W - 20, 62);

  // Combo badge above the lantern.
  if (world.combo >= 2) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7fe7ff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`COMBO x${world.combo}`, world.keeper.x, KEEPER_Y - 58);
  }

  // Controls hint, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Move: mouse or ← →  •  Pause: P  •  Mute: M  •  Restart: R', 18, WORLD_H - 12);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6, 8, 24, 0.78)';
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 211, 77, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTitle(ctx, world, best) {
  panel(ctx, 330, 74, 620, 330);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('EMBER KEEPER', WORLD_W / 2, 140);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Sixty Lights to Dawn', WORLD_W / 2, 172);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('GOAL: catch 60 starlight in your lantern.', WORLD_W / 2, 212);
  ctx.fillText('Dodge the shadow wisps — 3 touches and the night wins.', WORLD_W / 2, 238);
  ctx.fillStyle = '#b8ff9e';
  ctx.fillText('Golden motes mend a heart. Near misses earn BRAVE points.', WORLD_W / 2, 264);
  ctx.fillStyle = '#7fe7ff';
  ctx.fillText('Shield orbs appear at 20 and 40 lights.', WORLD_W / 2, 290);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Click or press ENTER to play', WORLD_W / 2, 336);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`Best score: ${best}   •   Move: mouse or arrow keys`, WORLD_W / 2, 366);
}

function drawPause(ctx) {
  panel(ctx, 440, 150, 400, 130);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('PAUSED', WORLD_W / 2, 205);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Press P to resume  •  R to restart', WORLD_W / 2, 242);
}

function drawDawnBanner(ctx, world) {
  const p = 1 - world.dawnTimer / 2.4;
  ctx.save();
  ctx.globalAlpha = Math.min(1, p * 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText('DAWN BREAKS!', WORLD_W / 2, 190);
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Sixty lights caught — the night lets go.', WORLD_W / 2, 228);
  ctx.restore();
}

function statLines(world) {
  const total = world.motesCaught + world.motesMissed;
  const accuracy = total === 0 ? 100 : Math.round((world.motesCaught / total) * 100);
  return [
    `Score ${world.score}`,
    `Time ${fmtTime(world.time)}`,
    `Lights caught ${world.motesCaught} / ${MOTES_TO_WIN}`,
    `Best combo x${world.maxCombo}`,
    `Brave near-misses ${world.brave}`,
    `Golden motes ${world.goldenCaught}`,
    `Accuracy ${accuracy}%`,
  ];
}

function drawEndScreen(ctx, world, title, titleColor, best) {
  panel(ctx, 390, 66, 500, 348);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(title, WORLD_W / 2, 126);
  ctx.fillStyle = '#ffffff';
  ctx.font = '19px system-ui, sans-serif';
  const lines = statLines(world);
  lines.forEach((line, i) => ctx.fillText(line, WORLD_W / 2, 166 + i * 26));
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`Best score: ${Math.max(best, world.score)}`, WORLD_W / 2, 356);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Press R or click to play again', WORLD_W / 2, 388);
}

export function draw(ctx, world, fx, opts) {
  const dawnMix = world.state === 'dawn' ? 1 - world.dawnTimer / 2.4 : world.state === 'victory' ? 1 : 0;
  const off = shakeOffset(fx);
  ctx.save();
  ctx.translate(off.x, off.y);
  drawSky(ctx, world, dawnMix);
  for (const mote of world.motes) drawMote(ctx, mote, world.time);
  for (const orb of world.orbs) drawOrb(ctx, orb, world.time);
  for (const wisp of world.wisps) drawWisp(ctx, wisp, world.time);
  if (world.state !== 'title') drawKeeper(ctx, world);
  drawParticles(ctx, fx);
  drawTexts(ctx, fx);
  ctx.restore();

  if (world.state === 'playing' || world.state === 'paused' || world.state === 'dawn') {
    drawHud(ctx, world, opts.best);
  }
  if (world.state === 'title') drawTitle(ctx, world, opts.best);
  if (world.state === 'paused') drawPause(ctx);
  if (world.state === 'dawn') drawDawnBanner(ctx, world);
  if (world.state === 'victory') drawEndScreen(ctx, world, 'DAWN IS YOURS!', '#ffd34d', opts.best);
  if (world.state === 'gameover') drawEndScreen(ctx, world, 'THE NIGHT WINS', '#ff7a7a', opts.best);
}
