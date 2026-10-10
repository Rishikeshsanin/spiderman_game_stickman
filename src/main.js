import Phaser from 'phaser';
import { GameScene } from './game/GameScene.js';
import { LEVELS } from './game/levels.js';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const STORAGE='webline-v2-save';
let currentLevel=0;
let toastTimer;

function loadSave(){
  try { return {unlocked:1,results:{},...JSON.parse(localStorage.getItem(STORAGE)||'{}')}; }
  catch { return {unlocked:1,results:{}}; }
}
const save=loadSave();
const persist=()=>localStorage.setItem(STORAGE,JSON.stringify(save));

const config={
  type:Phaser.AUTO,
  parent:'game',
  backgroundColor:'#11142b',
  scene:[GameScene],
  scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},
  render:{antialias:true,pixelArt:false,roundPixels:false,powerPreference:'high-performance'}
};
const game=new Phaser.Game(config);

function showScreen(id=null){ $$('.screen').forEach(s=>s.classList.toggle('active',s.id===id)); }
function setHud(on){ $('#hud').classList.toggle('is-hidden',!on); }

function startLevel(index){
  currentLevel=index;
  showScreen(null); setHud(true);
  $('#levelCurrent').textContent=index+1;
  $('#levelNext').textContent=index+2<=LEVELS.length?index+2:'✓';
  $('#progressBar').style.width='0%'; $('#progressDot').style.left='0%';
  game.scene.stop('game'); game.scene.start('game',{levelIndex:index});
}

function renderLevels(){
  const grid=$('#levelGrid'); grid.innerHTML='';
  LEVELS.forEach((level,i)=>{
    const unlocked=i<save.unlocked,res=save.results[i];
    const b=document.createElement('button'); b.className=`level-card${unlocked?'':' locked'}`;
    b.innerHTML=`<div class="num">${String(i+1).padStart(2,'0')}</div><div class="name">${level.name}</div><div class="mini-stars">${res?'★'.repeat(res.stars)+'☆'.repeat(3-res.stars):(unlocked?'READY':'LOCKED')}</div>`;
    if(unlocked)b.addEventListener('click',()=>startLevel(i));
    grid.appendChild(b);
  });
}

$('#playBtn').addEventListener('click',()=>startLevel(Math.min(save.unlocked-1,LEVELS.length-1)));
$('#levelsBtn').addEventListener('click',()=>{renderLevels();showScreen('levels');});
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>showScreen('home')));
$('#backBtn').addEventListener('click',()=>{game.scene.stop('game');setHud(false);renderLevels();showScreen('levels');});
$('#restartBtn').addEventListener('click',()=>startLevel(currentLevel));
$('#retryBtn').addEventListener('click',()=>startLevel(currentLevel));
$('#nextBtn').addEventListener('click',()=> currentLevel<LEVELS.length-1?startLevel(currentLevel+1):(setHud(false),showScreen('home')));

window.addEventListener('webline:progress',e=>{
  const pct=(e.detail.ratio*100).toFixed(2)+'%'; $('#progressBar').style.width=pct; $('#progressDot').style.left=pct;
});
window.addEventListener('webline:level-start',()=>setHud(true));
window.addEventListener('webline:prompt',e=>$('#startPrompt').classList.toggle('is-hidden',!e.detail.show));
window.addEventListener('webline:toast',e=>{
  const t=$('#toast'); t.textContent=e.detail.text; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),780);
});
window.addEventListener('webline:complete',e=>{
  const {index,time,deaths,stars}=e.detail;
  currentLevel=index;
  const prev=save.results[index];
  save.results[index]={time:prev?Math.min(prev.time,time):time,stars:Math.max(prev?.stars||0,stars)};
  save.unlocked=Math.max(save.unlocked,Math.min(LEVELS.length,index+2)); persist(); renderLevels();
  $('#resultTitle').textContent=stars===3?'PERFECT FLOW':stars===2?'CLEAN RUN':'LINE CLEARED';
  $('#resultStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
  $('#resultTime').textContent=time.toFixed(2)+'s';
  $('#resultBest').textContent=save.results[index].time.toFixed(2)+'s';
  $('#resultDeaths').textContent=deaths;
  $('#nextBtn').textContent=index===LEVELS.length-1?'FINISH':'NEXT';
  setHud(false); setTimeout(()=>showScreen('result'),100);
});

renderLevels(); setHud(false); showScreen('home');
