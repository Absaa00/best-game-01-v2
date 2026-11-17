// levels.js — the six levels of the night.
//
// Each level is one stretch of ten caught motes. As the night deepens the
// motes fall faster, the wisps come more often, and new wisp kinds join the
// hunt. The table is the whole difficulty curve: the world reads it, the
// renderer reads it for the sky, and the tests read it for their expectations.

export const MOTES_TO_WIN = 60;
export const MOTES_PER_LEVEL = 10;
export const LEVEL_COUNT = 6;

export const LEVELS = [
  {
    level: 1,
    name: 'Dusk',
    moteFall: 62,
    moteEvery: 1.15,
    wispEvery: 3.4,
    wispKinds: ['drifter'],
    sky: ['#0b1030', '#1b2350'],
  },
  {
    level: 2,
    name: 'First Stars',
    moteFall: 74,
    moteEvery: 1.0,
    wispEvery: 2.9,
    wispKinds: ['drifter', 'dart'],
    sky: ['#0a0d28', '#182049'],
  },
  {
    level: 3,
    name: 'Deep Night',
    moteFall: 86,
    moteEvery: 0.9,
    wispEvery: 2.5,
    wispKinds: ['drifter', 'dart', 'weaver'],
    sky: ['#080a20', '#141c42'],
  },
  {
    level: 4,
    name: 'Wisp Hour',
    moteFall: 98,
    moteEvery: 0.8,
    wispEvery: 2.1,
    wispKinds: ['drifter', 'dart', 'weaver'],
    sky: ['#070818', '#10173c'],
  },
  {
    level: 5,
    name: 'Long Dark',
    moteFall: 110,
    moteEvery: 0.72,
    wispEvery: 1.8,
    wispKinds: ['drifter', 'dart', 'weaver'],
    sky: ['#060614', '#0d1332'],
  },
  {
    level: 6,
    name: 'Before Dawn',
    moteFall: 124,
    moteEvery: 0.65,
    wispEvery: 1.55,
    wispKinds: ['drifter', 'dart', 'weaver'],
    sky: ['#050510', '#2a1a3a'],
  },
];

export function levelFor(motesCaught) {
  const level = Math.floor(motesCaught / MOTES_PER_LEVEL) + 1;
  return Math.min(level, LEVEL_COUNT);
}

export function levelDef(level) {
  return LEVELS[Math.min(Math.max(level, 1), LEVEL_COUNT) - 1];
}
