import { readFile, access } from 'node:fs/promises';
import { LEVELS, buildLevel } from '../js/levels.js';

const required = ['index.html', 'styles.css', 'js/main.js', 'js/game.js', 'js/levels.js', 'js/audio.js'];
await Promise.all(required.map(file => access(new URL(`../${file}`, import.meta.url))));

if (LEVELS.length < 5) throw new Error('Expected at least five playable levels.');
for (let i = 0; i < LEVELS.length; i++) {
  const level = buildLevel(i);
  if (!level.buildings.length || !level.anchors.length) throw new Error(`Level ${i + 1} generated without geometry.`);
  if (level.length < 3000) throw new Error(`Level ${i + 1} is unexpectedly short.`);
  if (!level.targetScore || level.targetScore.length !== 3) throw new Error(`Level ${i + 1} needs 3 star thresholds.`);
}

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
for (const id of ['game', 'menu', 'hud', 'result-screen', 'mobile-controls']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing required UI node #${id}.`);
}

console.log(`Smoke test passed: ${LEVELS.length} levels, core files present, level generation valid.`);
