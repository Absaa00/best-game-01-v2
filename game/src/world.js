// world.js — the rules of Ember Keeper, with no drawing and no sound.
//
// The world is plain data plus one step function, so the browser and the
// Node logic tests drive the exact same game. The browser reads the events
// each step emits (catch, hit, brave, levelup, dawn, victory, gameover)
// and turns them into particles and sounds.
//
// How to win: catch 60 starlight motes in the lantern before the night
// ends. How to lose: let three shadow wisps touch the lantern. Golden
// motes mend a heart, a near miss earns brave points, and a shield orb
// absorbs one hit.

import { makeRng, range, pick, chance } from './rng.js';
import { MOTES_TO_WIN, MOTES_PER_LEVEL, levelFor, levelDef } from './levels.js';

export const WORLD_W = 1280;
export const WORLD_H = 480;
export const KEEPER_Y = 424;
export const KEEPER_HALF = 34;
export const CATCH_HALF = 46;
export const HIT_RADIUS = 30;
export const NEAR_MISS_HALF = 92;
export const MAX_HEARTS = 3;
export const MAX_COMBO = 5;
export const GOLDEN_CHANCE = 1 / 12;
export const GOLDEN_POINTS = 50;
export const MOTE_POINTS = 10;
export const BRAVE_POINTS = 2;
export const SHIELD_AT = [20, 40];
export const DAWN_CELEBRATION = 2.4;

export function createWorld(seed) {
  return {
    seed,
    rng: makeRng(seed),
    state: 'title',
    time: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    hearts: MAX_HEARTS,
    motesCaught: 0,
    motesMissed: 0,
    goldenCaught: 0,
    brave: 0,
    shieldsUsed: 0,
    level: 1,
    keeper: { x: WORLD_W / 2, shield: false, invuln: 0 },
    motes: [],
    wisps: [],
    orbs: [],
    moteTimer: 0.4,
    wispTimer: 2.2,
    shieldGiven: { 20: false, 40: false },
    dawnTimer: 0,
    events: [],
  };
}

export function startGame(world) {
  world.state = 'playing';
  world.time = 0;
  world.score = 0;
  world.combo = 0;
  world.maxCombo = 0;
  world.hearts = MAX_HEARTS;
  world.motesCaught = 0;
  world.motesMissed = 0;
  world.goldenCaught = 0;
  world.brave = 0;
  world.shieldsUsed = 0;
  world.level = 1;
  world.keeper = { x: WORLD_W / 2, shield: false, invuln: 0 };
  world.motes = [];
  world.wisps = [];
  world.orbs = [];
  world.moteTimer = 0.4;
  world.wispTimer = 2.2;
  world.shieldGiven = { 20: false, 40: false };
  world.dawnTimer = 0;
  world.events = [];
}

function spawnMote(world) {
  const def = levelDef(world.level);
  const golden = chance(world.rng, GOLDEN_CHANCE);
  const bx = range(world.rng, 30, WORLD_W - 30);
  world.motes.push({
    x: bx,
    bx,
    y: -14,
    vy: def.moteFall * range(world.rng, 0.85, 1.15),
    sway: range(world.rng, 12, 34),
    phase: range(world.rng, 0, Math.PI * 2),
    golden,
    r: golden ? 13 : 10,
  });
}

function spawnWisp(world) {
  const def = levelDef(world.level);
  const kind = pick(world.rng, def.wispKinds);
  const speed = { drifter: 58, dart: 128, weaver: 84 }[kind];
  const bx = range(world.rng, 30, WORLD_W - 30);
  world.wisps.push({
    x: bx,
    bx,
    y: -18,
    vy: speed * range(world.rng, 0.9, 1.15),
    kind,
    phase: range(world.rng, 0, Math.PI * 2),
    amp: kind === 'drifter' ? range(world.rng, 24, 46) : range(world.rng, 40, 70),
    r: kind === 'dart' ? 13 : 16,
    scored: false,
  });
}

function spawnShieldOrb(world) {
  world.orbs.push({
    x: range(world.rng, 60, WORLD_W - 60),
    y: -16,
    vy: 70,
    r: 14,
  });
}

function keeperHit(world, wisp) {
  const keeper = world.keeper;
  if (keeper.invuln > 0) return;
  if (keeper.shield) {
    keeper.shield = false;
    keeper.invuln = 1.2;
    world.shieldsUsed += 1;
    world.events.push({ type: 'shieldBlock', x: keeper.x, y: KEEPER_Y });
    return;
  }
  world.hearts -= 1;
  world.combo = 0;
  keeper.invuln = 1.4;
  world.events.push({ type: 'hit', x: keeper.x, y: KEEPER_Y, hearts: world.hearts });
  if (world.hearts <= 0) {
    world.state = 'gameover';
    world.events.push({ type: 'gameover', score: world.score });
  }
}

function catchMote(world, mote) {
  const mult = Math.min(world.combo + 1, MAX_COMBO);
  world.combo = mult;
  world.maxCombo = Math.max(world.maxCombo, mult);
  world.motesCaught += 1;
  let points = MOTE_POINTS * mult;
  if (mote.golden) {
    points += GOLDEN_POINTS;
    world.goldenCaught += 1;
    if (world.hearts < MAX_HEARTS) world.hearts += 1;
  }
  world.score += points;
  world.events.push({
    type: 'catch',
    x: mote.x,
    y: mote.y,
    golden: mote.golden,
    points,
    combo: mult,
    motesCaught: world.motesCaught,
  });
  for (const at of SHIELD_AT) {
    if (world.motesCaught === at && !world.shieldGiven[at]) {
      world.shieldGiven[at] = true;
      spawnShieldOrb(world);
      world.events.push({ type: 'shieldSpawn', at });
    }
  }
  const nextLevel = levelFor(world.motesCaught);
  if (nextLevel !== world.level) {
    world.level = nextLevel;
    const def = levelDef(nextLevel);
    world.events.push({ type: 'levelup', level: nextLevel, name: def.name });
  }
  if (world.motesCaught >= MOTES_TO_WIN) {
    world.state = 'dawn';
    world.dawnTimer = DAWN_CELEBRATION;
    world.events.push({ type: 'dawn', score: world.score });
  }
}

export function step(world, dt, input) {
  world.events = [];
  if (world.state === 'dawn') {
    world.dawnTimer -= dt;
    world.time += dt;
    if (world.dawnTimer <= 0) {
      world.state = 'victory';
      world.events.push({ type: 'victory', score: world.score });
    }
    return world.events;
  }
  if (world.state !== 'playing') return world.events;

  world.time += dt;
  const keeper = world.keeper;
  if (keeper.invuln > 0) keeper.invuln -= dt;

  // Move the keeper: pointer sets the target, keys nudge it.
  if (input.pointerX !== null && input.pointerX !== undefined) {
    keeper.x = input.pointerX;
  }
  if (input.left) keeper.x -= 520 * dt;
  if (input.right) keeper.x += 520 * dt;
  keeper.x = Math.max(KEEPER_HALF, Math.min(WORLD_W - KEEPER_HALF, keeper.x));

  const def = levelDef(world.level);

  // Spawn.
  world.moteTimer -= dt;
  if (world.moteTimer <= 0) {
    spawnMote(world);
    world.moteTimer = def.moteEvery * range(world.rng, 0.85, 1.15);
  }
  world.wispTimer -= dt;
  if (world.wispTimer <= 0) {
    spawnWisp(world);
    world.wispTimer = def.wispEvery * range(world.rng, 0.85, 1.15);
  }

  // Move motes: fall with a gentle sway; catch or miss at the lantern line.
  for (let i = world.motes.length - 1; i >= 0; i -= 1) {
    const mote = world.motes[i];
    mote.y += mote.vy * dt;
    mote.phase += dt * 1.6;
    mote.x = Math.max(12, Math.min(WORLD_W - 12, mote.bx + Math.sin(mote.phase) * mote.sway));
    if (mote.y > KEEPER_Y - 26 && mote.y < KEEPER_Y + 30) {
      if (Math.abs(mote.x - keeper.x) < CATCH_HALF) {
        world.motes.splice(i, 1);
        catchMote(world, mote);
        if (world.state !== 'playing') return world.events;
        continue;
      }
    }
    if (mote.y > WORLD_H + 24) {
      world.motes.splice(i, 1);
      world.motesMissed += 1;
      world.combo = 0;
      world.events.push({ type: 'miss', x: mote.x });
    }
  }

  // Move wisps: each kind flies its own pattern; hit, near-miss, or pass.
  for (let i = world.wisps.length - 1; i >= 0; i -= 1) {
    const wisp = world.wisps[i];
    wisp.y += wisp.vy * dt;
    wisp.phase += dt * 2.1;
    if (wisp.kind === 'drifter' || wisp.kind === 'weaver') {
      wisp.x = Math.max(14, Math.min(WORLD_W - 14, wisp.bx + Math.sin(wisp.phase) * wisp.amp));
    } else if (wisp.kind === 'dart') {
      wisp.x += Math.sign(keeper.x - wisp.x) * 26 * dt;
      wisp.x = Math.max(14, Math.min(WORLD_W - 14, wisp.x));
    }
    if (wisp.y > KEEPER_Y - 24 && wisp.y < KEEPER_Y + 26) {
      const dx = Math.abs(wisp.x - keeper.x);
      if (dx < HIT_RADIUS) {
        world.wisps.splice(i, 1);
        keeperHit(world, wisp);
        if (world.state !== 'playing') return world.events;
        continue;
      }
    }
    if (!wisp.scored && wisp.y > KEEPER_Y + 44) {
      wisp.scored = true;
      if (Math.abs(wisp.x - keeper.x) < NEAR_MISS_HALF) {
        world.brave += 1;
        world.score += BRAVE_POINTS;
        world.events.push({ type: 'brave', x: wisp.x, y: KEEPER_Y + 30 });
      }
    }
    if (wisp.y > WORLD_H + 30) world.wisps.splice(i, 1);
  }

  // Move shield orbs: catch one to carry a free hit.
  for (let i = world.orbs.length - 1; i >= 0; i -= 1) {
    const orb = world.orbs[i];
    orb.y += orb.vy * dt;
    if (orb.y > KEEPER_Y - 26 && orb.y < KEEPER_Y + 30) {
      if (Math.abs(orb.x - keeper.x) < CATCH_HALF) {
        world.orbs.splice(i, 1);
        keeper.shield = true;
        world.events.push({ type: 'shieldPickup', x: orb.x, y: orb.y });
        continue;
      }
    }
    if (orb.y > WORLD_H + 24) world.orbs.splice(i, 1);
  }

  return world.events;
}
