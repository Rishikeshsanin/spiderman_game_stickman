import Phaser from 'phaser';
import { GameScene } from './game/GameScene.js';
import { MISSIONS, chapters } from './game/campaign.js';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const STORAGE='tether-zero-save-v1';
let currentMission=0;
let toastTimer=null;
let returnScreen='home';

function loadSave(){
  try{return{unlocked:1,results:{},completed:false,...JSON.parse(localStorage.getItem(STORAGE)||'{}')};}
  catch{return{unlocked:1,results:{},completed:false};}
}
const save=loadSave();
const persist=()=>localStorage.setItem(STORAGE,JSON.stringify(save));

const game=new Phaser.Game({
  type:Phaser.AUTO,
  parent:'game',
  backgroundColor:'#050914',
  scene:[],
  scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},
  render:{antialias:true,pixelArt:false,roundPixels:false,powerPreference:'high-performance'}
});
game.scene.add('game',GameScene,false);

function showScreen(id=null){$$('.screen').forEach(s=>s.classList.toggle('active',s.id===id));}
function setHud(on){$('#hud').classList.toggle('is-hidden',!on);}
function stopGame(){if(game.scene.isActive('game'))game.scene.stop('game');setHud(false);}

function openBriefing(index,from='home'){
  stopGame();
  currentMission=index;
  returnScreen=from;
  const m=MISSIONS[index];
  $('#briefChapter').textContent=`CHAPTER ${String(m.chapter).padStart(2,'0')} / ${m.chapterName}`;
  $('#briefNumber').textContent=String(m.id).padStart(2,'0');
  $('#briefTitle').textContent=m.title.toUpperCase();
  $('#briefText').textContent=m.briefing;
  showScreen('briefing');
}

function launchMission(){
  const m=MISSIONS[currentMission];
  showScreen(null);setHud(true);
  $('#hudChapter').textContent=`CHAPTER ${String(m.chapter).padStart(2,'0')}`;
  $('#hudMission').textContent=m.title.toUpperCase();
  $('#hudSpeed').textContent='000';$('#hudTime').textContent='0.0';
  $('#progressBar').style.width='0%';$('#progressDot').style.left='0%';
  if(game.scene.isActive('game'))game.scene.stop('game');
  game.scene.start('game',{missionIndex:currentMission});
}

function renderMissionLog(){
  const root=$('#missionGrid');root.innerHTML='';
  for(const chapter of chapters()){
    const section=document.createElement('section');section.className='chapter-block';
    section.innerHTML=`<div class="chapter-head"><span>CHAPTER ${String(chapter.number).padStart(2,'0')}</span><strong>${chapter.name}</strong></div>`;
    const grid=document.createElement('div');grid.className='mission-grid';
    for(const mission of chapter.missions){
      const index=mission.id-1,unlocked=mission.id<=save.unlocked,res=save.results[index];
      const b=document.createElement('button');b.className=`mission-card${unlocked?'':' locked'}`;
      b.innerHTML=`<span class="mission-id">${String(mission.id).padStart(2,'0')}</span><strong>${mission.title}</strong><small>${res?`${'★'.repeat(res.stars)}${'☆'.repeat(3-res.stars)} · ${res.time.toFixed(2)}s`:(unlocked?'READY':'LOCKED')}</small>`;
      if(unlocked)b.addEventListener('click',()=>openBriefing(index,'missions'));
      grid.appendChild(b);
    }
    section.appendChild(grid);root.appendChild(section);
  }
}

function openMissionLog(){stopGame();renderMissionLog();showScreen('missions');}

$('#continueBtn').addEventListener('click',()=>{
  const index=save.completed?MISSIONS.length-1:Math.min(save.unlocked-1,MISSIONS.length-1);
  openBriefing(index,'home');
});
$('#missionsBtn').addEventListener('click',openMissionLog);
$('#closeMissions').addEventListener('click',()=>showScreen('home'));
$('#deployBtn').addEventListener('click',launchMission);
$('#briefBackBtn').addEventListener('click',()=>returnScreen==='missions'?openMissionLog():showScreen('home'));
$('#backBtn').addEventListener('click',openMissionLog);
$('#restartBtn').addEventListener('click',launchMission);
$('#retryBtn').addEventListener('click',launchMission);
$('#nextBtn').addEventListener('click',()=>{
  if(currentMission>=MISSIONS.length-1){save.completed=true;persist();showScreen('ending');return;}
  openBriefing(currentMission+1,'result');
});
$('#endingMissionsBtn').addEventListener('click',openMissionLog);
$('#endingHomeBtn').addEventListener('click',()=>showScreen('home'));

addEventListener('keydown',e=>{
  if(e.code==='Space'&&$('#briefing').classList.contains('active')){e.preventDefault();launchMission();}
});

window.addEventListener('tether:progress',e=>{
  const pct=(e.detail.ratio*100).toFixed(2)+'%';
  $('#progressBar').style.width=pct;$('#progressDot').style.left=pct;
  $('#hudSpeed').textContent=String(e.detail.speed).padStart(3,'0');
  $('#hudTime').textContent=e.detail.time.toFixed(1);
});
window.addEventListener('tether:mission-start',()=>setHud(true));
window.addEventListener('tether:prompt',e=>$('#startPrompt').classList.toggle('is-hidden',!e.detail.show));
window.addEventListener('tether:toast',e=>{
  const t=$('#toast');t.textContent=e.detail.text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),760);
});
window.addEventListener('tether:complete',e=>{
  const {index,time,restarts,stars,outro}=e.detail;
  currentMission=index;
  const prev=save.results[index];
  save.results[index]={time:prev?Math.min(prev.time,time):time,stars:Math.max(prev?.stars||0,stars)};
  save.unlocked=Math.max(save.unlocked,Math.min(MISSIONS.length,index+2));
  if(index===MISSIONS.length-1)save.completed=true;
  persist();renderMissionLog();

  $('#resultTitle').textContent=stars===3?'ZERO-LOSS RUN':stars===2?'SECTION SECURED':'STILL ALIVE';
  $('#resultStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
  $('#resultStory').textContent=outro;
  $('#resultTime').textContent=time.toFixed(2)+'s';
  $('#resultBest').textContent=save.results[index].time.toFixed(2)+'s';
  $('#resultRestarts').textContent=restarts;
  $('#nextBtn').textContent=index===MISSIONS.length-1?'ENTER ESCAPE POD':'NEXT SECTION';
  setHud(false);setTimeout(()=>showScreen('result'),90);
});

renderMissionLog();setHud(false);showScreen('home');
