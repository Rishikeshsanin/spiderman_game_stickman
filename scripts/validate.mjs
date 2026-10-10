import { access, readFile } from 'node:fs/promises';
import { LEVELS } from '../src/game/levels.js';
const required=['index.html','styles.css','src/main.js','src/game/GameScene.js','src/game/levels.js','src/game/audio.js'];
await Promise.all(required.map(f=>access(new URL(`../${f}`,import.meta.url))));
if(LEVELS.length!==18) throw new Error(`Expected 18 levels, got ${LEVELS.length}`);
for(const [i,l] of LEVELS.entries()){
  if(!l.length||!l.par||!Array.isArray(l.objects)||!l.objects.some(o=>o.type==='hook')) throw new Error(`Invalid level ${i+1}`);
  if(l.length<1600) throw new Error(`Level ${i+1} too short`);
}
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
for(const id of ['game','home','levels','result','hud','progressBar']) if(!html.includes(`id="${id}"`)) throw new Error(`Missing #${id}`);
const game=await readFile(new URL('../src/game/GameScene.js',import.meta.url),'utf8');
if(/KeyA|KeyD|ArrowLeft|ArrowRight/.test(game)) throw new Error('One-button rule violated in gameplay controls');
console.log('WEBLINE validation passed: 18 levels, required UI present, one-button controls intact.');
