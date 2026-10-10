import { access, readFile } from 'node:fs/promises';
import { MISSIONS, chapters } from '../src/game/campaign.js';
import { TETHER_RANGE, nearestAnchor } from '../src/game/hookTargeting.js';

const required=[
  'index.html','styles.css','src/main.js','src/game/GameScene.js','src/game/campaign.js',
  'src/game/audio.js','src/game/hookTargeting.js'
];
await Promise.all(required.map(f=>access(new URL(`../${f}`,import.meta.url))));

if(MISSIONS.length!==12) throw new Error(`Expected 12 campaign missions, got ${MISSIONS.length}`);
if(chapters().length!==5) throw new Error(`Expected 5 chapters, got ${chapters().length}`);
for(const [i,m] of MISSIONS.entries()){
  if(m.id!==i+1) throw new Error(`Mission id mismatch at ${i}`);
  if(!m.title||!m.chapterName||!m.briefing||!m.outro||!m.length||!m.par) throw new Error(`Mission ${m.id} is missing narrative/game metadata`);
  if(!Array.isArray(m.objects)||!m.objects.some(o=>o.type==='anchor')) throw new Error(`Mission ${m.id} has no tether anchors`);
  if(m.length<1800) throw new Error(`Mission ${m.id} is too short`);
}
if(!MISSIONS.at(-1).chaser) throw new Error('Final mission must include the collapse chase');
if(!MISSIONS.some(m=>m.objects.some(o=>o.type==='rotor'))) throw new Error('Campaign must include rotor set piece');
if(!MISSIONS.some(m=>m.objects.some(o=>o.type==='vent'))) throw new Error('Campaign must include decompression vents');
if(!MISSIONS.some(m=>m.objects.some(o=>o.type==='laser'))) throw new Error('Campaign must include security lasers');
if(!MISSIONS.some(m=>m.objects.some(o=>o.kind==='fragile'))) throw new Error('Campaign must include fragile anchors');
if(!MISSIONS.some(m=>m.objects.some(o=>o.kind==='pulse'))) throw new Error('Campaign must include pulse anchors');

const player={x:500,y:400};
const anchors=[{id:'crossed',x:420,y:260},{id:'ahead',x:980,y:250}];
const picked=nearestAnchor(player,anchors,a=>({x:a.x,y:a.y}),()=>true,TETHER_RANGE);
if(picked?.anchor.id!=='crossed') throw new Error('Nearest crossed anchor must remain selectable');
const unavailable=nearestAnchor(player,[{id:'off',x:540,y:300},{id:'on',x:700,y:300}],a=>a,a=>a.id==='on',TETHER_RANGE);
if(unavailable?.anchor.id!=='on') throw new Error('Unavailable anchor filtering failed');

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
for(const id of ['game','home','briefing','missions','result','ending','hud','progressBar']){
  if(!html.includes(`id="${id}"`)) throw new Error(`Missing #${id}`);
}
const game=await readFile(new URL('../src/game/GameScene.js',import.meta.url),'utf8');
if(/KeyA|KeyD|ArrowLeft|ArrowRight/.test(game)) throw new Error('One-button gameplay rule violated');
if(!game.includes('this.holding&&!this.rope')) throw new Error('Held-input tether reacquisition missing');
if(!game.includes("released.kind==='fragile'")) throw new Error('Fragile anchor lifecycle missing');

console.log('TETHER//ZERO validation passed: 5 chapters, 12 missions, one-button tethering, campaign mechanics and finale verified.');
