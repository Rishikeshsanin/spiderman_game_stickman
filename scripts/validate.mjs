import {access,readFile} from 'node:fs/promises';
import {LEVELS} from '../src/game/levels.js';
import {HOOK_RANGE,nearestHook} from '../src/game/hookTargeting.js';

const required=[
  'index.html','styles.css','src/main.js','src/game/GameScene.js',
  'src/game/levels.js','src/game/audio.js','src/game/hookTargeting.js'
];
await Promise.all(required.map(f=>access(new URL(`../${f}`,import.meta.url))));

if(LEVELS.length!==18) throw new Error(`Expected 18 levels, got ${LEVELS.length}`);
for(const [i,l] of LEVELS.entries()){
  if(!l.length||!l.par||!Array.isArray(l.objects)||!l.objects.some(o=>o.type==='hook')) throw new Error(`Invalid level ${i+1}`);
  if(l.length<1600) throw new Error(`Level ${i+1} too short`);
}

const pos=h=>({x:h.x,y:h.y});
const player={x:500,y:400};

const crossed=nearestHook(player,[{id:'behind',x:420,y:260},{id:'ahead',x:850,y:230}],pos);
if(crossed?.hook.id!=='behind') throw new Error('Crossed/behind nearest hook must remain selectable.');

const simple=nearestHook(player,[{id:'near',x:610,y:280},{id:'far',x:1000,y:200}],pos);
if(simple?.hook.id!=='near') throw new Error('Nearest hook targeting failed.');

const out=nearestHook(player,[{id:'too-far',x:500+HOOK_RANGE+20,y:400}],pos);
if(out!==null) throw new Error('Out-of-range hook should not be selected.');

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
for(const id of ['game','home','levels','result','hud','progressBar']) if(!html.includes(`id="${id}"`)) throw new Error(`Missing #${id}`);

const game=await readFile(new URL('../src/game/GameScene.js',import.meta.url),'utf8');
if(/KeyA|KeyD|ArrowLeft|ArrowRight/.test(game)) throw new Error('One-button rule violated.');
if(!game.includes('this.holding&&!this.rope')) throw new Error('Held-input magnetic reacquisition is missing.');

console.log('WEB//SLINGER validation passed: 18 levels, magnetic nearest-hook targeting, crossed-hook grace, one-button controls.');
