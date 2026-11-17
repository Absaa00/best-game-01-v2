// main.ts — the entrypoint of Ember Keeper.
//
// It hands the game in: copies game/ and screenshots/ from this repository
// into the output directory and writes /output/dossier.json with
// buildDossier from vendor/makefun-game.ts, the kit's own library. Outside
// the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const repoDir = process.cwd();

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`dossier.json written: ${dossier.length} bytes`);
