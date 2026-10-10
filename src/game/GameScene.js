import Phaser from 'phaser';
import { LEVELS, THEMES } from './levels.js';
import { SoundFX } from './audio.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TAU=Math.PI*2;

export class GameScene extends Phaser.Scene {
  constructor(){ super('game'); this.sfx=new SoundFX(); }

  init(data){ this.levelIndex=data.levelIndex??0; }

  create(){
    this.level=LEVELS[this.levelIndex];
    this.theme=THEMES[this.level.theme];
    this.worldH=820;
    this.runTime=0;
    this.deaths=0;
    this.started=false;
    this.finished=false;
    this.holding=false;
    this.rope=null;
    this.checkpoint={x:this.level.spawn[0],y:this.level.spawn[1]};
    this.particles=[];
    this.trail=[];
    this.speedFx=0;
    this.perfectWindow=0;
    this.cameraX=0;
    this.lastToast=0;

    this.background=this.add.graphics().setScrollFactor(0).setDepth(-100);
    this.worldG=this.add.graphics().setDepth(1);
    this.fxG=this.add.graphics().setDepth(6);
    this.playerG=this.add.graphics().setDepth(5);
    this.ropeG=this.add.graphics().setDepth(4);

    this.hooks=[]; this.pads=[]; this.hazards=[]; this.checkpoints=[];
    this.buildObjects();
    this.player={ x:this.level.spawn[0], y:this.level.spawn[1], vx:235, vy:-40, r:18, angle:0, spin:0, inv:0 };

    this.cameras.main.setBounds(0,0,this.level.length+700,this.worldH);
    this.cameras.main.setScroll(0,0);
    this.cameras.main.setRoundPixels(false);

    this.input.keyboard.on('keydown-SPACE',e=>{ e.preventDefault(); this.press(); });
    this.input.keyboard.on('keyup-SPACE',e=>{ e.preventDefault(); this.release(); });
    this.input.on('pointerdown',()=>this.press());
    this.input.on('pointerup',()=>this.release());
    this.input.on('pointerupoutside',()=>this.release());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.input.keyboard.removeAllListeners();
      this.input.removeAllListeners();
    });

    window.dispatchEvent(new CustomEvent('webline:level-start',{detail:{index:this.levelIndex,length:this.level.length}}));
    window.dispatchEvent(new CustomEvent('webline:prompt',{detail:{show:true}}));
  }

  buildObjects(){
    for(const raw of this.level.objects){
      const o={...raw,baseX:raw.x,baseY:raw.y,phase:(raw.x%311)/311*TAU,live:true};
      if(o.type==='hook') this.hooks.push(o);
      if(o.type==='pad') this.pads.push(o);
      if(o.type==='hazard') this.hazards.push(o);
      if(o.type==='checkpoint') this.checkpoints.push(o);
    }
  }

  press(){
    if(this.finished) return;
    this.sfx.ensure();
    if(!this.started){ this.started=true; window.dispatchEvent(new CustomEvent('webline:prompt',{detail:{show:false}})); }
    if(this.holding) return;
    this.holding=true;
    this.attachBestHook();
  }

  release(){
    if(!this.holding) return;
    this.holding=false;
    if(this.rope){
      const speed=Math.hypot(this.player.vx,this.player.vy);
      const anchor=this.anchorPosition(this.rope.hook);
      const dx=this.player.x-anchor.x, dy=this.player.y-anchor.y;
      const len=Math.hypot(dx,dy)||1;
      const tx=-dy/len, ty=dx/len;
      const tangent=this.player.vx*tx+this.player.vy*ty;
      const perfect=speed>540 && this.player.vx>240 && Math.abs(dy)>70 && Math.abs(tangent)>360;
      if(perfect){
        this.player.vx+=58;
        this.player.vy-=25;
        this.perfectWindow=.34;
        this.toast('PERFECT RELEASE');
        this.emit(this.player.x,this.player.y,12,0xffffff,210);
      }
      this.sfx.release(perfect);
      this.rope=null;
    }
  }

  attachBestHook(){
    const p=this.player;
    let best=null,bestScore=-1e9;
    for(const h of this.hooks){
      const a=this.anchorPosition(h), dx=a.x-p.x, dy=a.y-p.y, d=Math.hypot(dx,dy);
      if(d>610||d<90||dx<-140||dy>260) continue;
      let score=0;
      score+=dx>0?1.15:-.6;
      score+=dy<0?.65:.10;
      score-=d/850;
      score-=Math.abs(dx-280)/1000;
      if(score>bestScore){best=h;bestScore=score;}
    }
    if(!best){ this.toast('NO HOOK'); return; }
    const a=this.anchorPosition(best);
    this.rope={hook:best,length:clamp(distance(p,a)*.94,100,540),tension:0};
    this.sfx.hook();
    this.emit(a.x,a.y,7,this.theme.soft,100);
  }

  anchorPosition(h){
    let x=h.baseX,y=h.baseY;
    if(h.move==='x') x+=Math.sin(this.runTime*h.speed+h.phase)*h.amp;
    if(h.move==='y') y+=Math.sin(this.runTime*h.speed+h.phase)*h.amp;
    if(h.orbit){ x+=Math.cos(this.runTime*h.speed+h.phase)*h.orbit; y+=Math.sin(this.runTime*h.speed+h.phase)*h.orbit*.62; }
    return {x,y};
  }

  update(_,delta){
    const dt=Math.min(delta/1000,1/30);
    if(this.finished){ this.draw(); return; }
    if(this.started) this.runTime+=dt;
    this.perfectWindow=Math.max(0,this.perfectWindow-dt);
    this.player.inv=Math.max(0,this.player.inv-dt);

    this.simulate(dt);
    this.animateWorld();
    this.updateCamera(dt);
    this.updateParticles(dt);
    this.draw();
    this.reportProgress();
  }

  simulate(dt){
    const p=this.player;
    const gravity=this.level.gravity??940;
    p.vy+=gravity*dt;
    p.vx+=(this.level.wind??0)*dt;
    p.vx=clamp(p.vx,85,980);
    p.vx*=Math.pow(.998,dt*60);

    if(this.rope) this.applyRope(dt);

    const prev={x:p.x,y:p.y};
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;
    p.angle=lerp(p.angle,Math.atan2(p.vy,Math.max(90,p.vx))*.5,.08);
    p.spin*=Math.pow(.91,dt*60);
    p.angle+=p.spin*dt;

    this.collidePads(prev);
    this.collideHazards();
    this.checkCheckpoints();

    if(p.y>this.worldH+160||p.y<-260||p.x<this.cameraX-190) this.crash();
    if(p.x>=this.level.length) this.finish();

    const speed=Math.hypot(p.vx,p.vy);
    this.speedFx=lerp(this.speedFx,clamp((speed-420)/430,0,1),.08);
    if(speed>430){
      this.trail.unshift({x:p.x,y:p.y,a:.22+this.speedFx*.25});
      if(this.trail.length>14) this.trail.length=14;
    } else if(this.trail.length) this.trail.pop();
    for(const t of this.trail) t.a*=.88;
  }

  applyRope(dt){
    const p=this.player,a=this.anchorPosition(this.rope.hook);
    let dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy)||1;
    const nx=dx/d,ny=dy/d;
    if(d>this.rope.length){
      const over=d-this.rope.length;
      const radial=p.vx*nx+p.vy*ny;
      p.x-=nx*Math.min(over,18);
      p.y-=ny*Math.min(over,18);
      if(radial>0){ p.vx-=nx*radial*1.02; p.vy-=ny*radial*1.02; }
      const spring=over*22*dt;
      p.vx-=nx*spring; p.vy-=ny*spring;
      const tx=-ny,ty=nx;
      const tangent=p.vx*tx+p.vy*ty;
      const assist=clamp(430-Math.abs(tangent),0,180)*dt*.55;
      const dir=tangent>=0?1:-1;
      p.vx+=tx*assist*dir; p.vy+=ty*assist*dir;
      this.rope.tension=clamp(over/40+Math.abs(radial)/700,0,1);
    } else this.rope.tension*=.9;
  }

  collidePads(prev){
    const p=this.player;
    for(const pad of this.pads){
      if(pad.vertical){
        const left=pad.x-pad.w/2,right=pad.x+pad.w/2,top=pad.y-85,bottom=pad.y+85;
        if(p.x+p.r>left&&p.x-p.r<right&&p.y+p.r>top&&p.y-p.r<bottom&&prev.x+p.r<=left+12){
          p.x=left-p.r-1; p.vx=Math.max(420,Math.abs(p.vx)*(pad.boost??1.25)); p.vy-=120; p.spin-=4.5; this.bounceFx(pad.x,p.y); return;
        }
      } else {
        const left=pad.x-pad.w/2,right=pad.x+pad.w/2,top=pad.y-12;
        if(p.x+p.r>left&&p.x-p.r<right&&prev.y+p.r<=top+10&&p.y+p.r>=top&&p.vy>0){
          p.y=top-p.r-1; p.vy=-Math.max(520,Math.abs(p.vy)*(pad.boost??1.32)); p.vx=Math.max(p.vx,300); p.spin+=(Math.random()>.5?1:-1)*3.8; this.bounceFx(p.x,top); return;
        }
      }
    }
  }

  bounceFx(x,y){ this.sfx.bounce(); this.emit(x,y,14,this.theme.soft,240); this.cameras.main.shake(80,.004); }

  collideHazards(){
    const p=this.player;
    if(p.inv>0) return;
    for(const h of this.hazards){
      if(p.x+p.r>h.x&&p.x-p.r<h.x+h.w&&p.y+p.r>h.y&&p.y-p.r<h.y+h.h){ this.crash(); return; }
    }
  }

  checkCheckpoints(){
    for(const c of this.checkpoints){
      if(c.live&&this.player.x>c.x){ c.live=false; this.checkpoint={x:c.x,y:c.y}; this.sfx.checkpoint(); this.toast('CHECKPOINT'); }
    }
  }

  crash(){
    if(this.player.inv>0||this.finished) return;
    this.deaths++;
    this.sfx.crash();
    this.cameras.main.shake(180,.012);
    this.emit(this.player.x,this.player.y,28,this.theme.accent,300);
    this.rope=null; this.holding=false;
    const cp=this.checkpoint;
    this.player.x=cp.x; this.player.y=cp.y; this.player.vx=235; this.player.vy=-45; this.player.angle=0; this.player.spin=0; this.player.inv=.65;
    this.cameraX=Math.max(0,cp.x-250);
    this.cameras.main.setScroll(this.cameraX,0);
    this.toast(this.deaths===1?'TRY AGAIN':'KEEP THE FLOW');
  }

  finish(){
    if(this.finished) return;
    this.finished=true; this.rope=null; this.holding=false;
    this.sfx.finish(); this.cameras.main.shake(220,.006);
    for(let i=0;i<5;i++) setTimeout(()=>this.emit(this.level.length+40,180+Math.random()*430,28,Phaser.Display.Color.RandomRGB().color,340),i*70);
    const par=this.level.par;
    const stars=this.deaths===0&&this.runTime<=par?3:(this.deaths<=2&&this.runTime<=par*1.45?2:1);
    setTimeout(()=>window.dispatchEvent(new CustomEvent('webline:complete',{detail:{index:this.levelIndex,time:this.runTime,deaths:this.deaths,stars}})),650);
  }

  animateWorld(){
    // Positions are calculated lazily in draw/physics so moving hooks remain perfectly synced.
  }

  updateCamera(dt){
    const target=clamp(this.player.x-this.scale.width*.31,0,Math.max(0,this.level.length-this.scale.width*.42));
    this.cameraX=lerp(this.cameraX,target,1-Math.pow(.0004,dt));
    this.cameras.main.setScroll(this.cameraX,0);
    const z=1-this.speedFx*.025;
    this.cameras.main.setZoom(lerp(this.cameras.main.zoom,z,.05));
  }

  emit(x,y,count,color,force){
    for(let i=0;i<count;i++){
      const a=Math.random()*TAU,s=Math.random()*force;
      this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+Math.random()*.55,max:.85,size:1.4+Math.random()*3.8,color});
    }
  }

  updateParticles(dt){
    for(const q of this.particles){ q.x+=q.vx*dt; q.y+=q.vy*dt; q.vy+=110*dt; q.life-=dt; }
    this.particles=this.particles.filter(q=>q.life>0);
  }

  draw(){
    this.drawBackground();
    const g=this.worldG; g.clear();
    this.drawFinish(g); this.drawPads(g); this.drawHazards(g); this.drawHooks(g); this.drawCheckpoints(g);
    this.drawRope(); this.drawParticles(); this.drawPlayer();
  }

  drawBackground(){
    const g=this.background; g.clear();
    const w=this.scale.width,h=this.scale.height;
    const c1=Phaser.Display.Color.IntegerToColor(this.theme.top),c2=Phaser.Display.Color.IntegerToColor(this.theme.bottom);
    const bands=42;
    for(let i=0;i<bands;i++){
      const t=i/(bands-1), r=Math.round(lerp(c1.red,c2.red,t)), gg=Math.round(lerp(c1.green,c2.green,t)), b=Math.round(lerp(c1.blue,c2.blue,t));
      g.fillStyle(Phaser.Display.Color.GetColor(r,gg,b),1); g.fillRect(0,i*h/bands,w,h/bands+2);
    }
    g.fillStyle(0xffffff,.055);
    for(let i=0;i<12;i++){
      const x=((i*173-this.cameraX*.035)% (w+240)+w+240)%(w+240)-120;
      const y=110+(i*97)%470;
      g.fillCircle(x,y,22+(i%4)*16);
    }
    g.lineStyle(2,0xffffff,.05);
    for(let i=0;i<7;i++){
      const x=((i*269-this.cameraX*.06)%(w+400)+w+400)%(w+400)-200;
      g.strokeCircle(x,150+(i*113)%430,90+(i%3)*45);
    }
  }

  drawHooks(g){
    for(const h of this.hooks){
      const a=this.anchorPosition(h), d=distance(this.player,a), usable=d<610&&a.x>this.player.x-140&&a.y<this.player.y+260;
      g.lineStyle(5,0xffffff,.95); g.fillStyle(this.theme.accent,1); g.fillCircle(a.x,a.y,20); g.strokeCircle(a.x,a.y,20);
      g.fillStyle(0xffffff,1); g.fillCircle(a.x,a.y,7);
      g.lineStyle(2,0xffffff,usable?.25:.08); g.strokeCircle(a.x,a.y,30+Math.sin(this.runTime*4+h.phase)*3);
    }
  }

  drawPads(g){
    for(const p of this.pads){
      if(p.vertical){
        g.fillStyle(0x121526,.28); g.fillRoundedRect(p.x-p.w/2+7,p.y-76+7,p.w,152,18);
        g.fillStyle(0xffffff,1); g.fillRoundedRect(p.x-p.w/2,p.y-76,p.w,152,18);
        g.fillStyle(this.theme.hazard,1); g.fillRoundedRect(p.x-p.w/2+10,p.y-62,p.w-20,124,13);
      } else {
        g.fillStyle(0x121526,.28); g.fillRoundedRect(p.x-p.w/2+5,p.y-7,p.w,28,13);
        g.fillStyle(0xffffff,1); g.fillRoundedRect(p.x-p.w/2,p.y-12,p.w,24,12);
        g.fillStyle(this.theme.hazard,1); g.fillRoundedRect(p.x-p.w/2+12,p.y-6,p.w-24,12,7);
      }
    }
  }

  drawHazards(g){
    for(const h of this.hazards){
      g.fillStyle(0x111326,.24); g.fillRoundedRect(h.x+7,h.y+7,h.w,h.h,18);
      g.fillStyle(this.theme.hazard,.96); g.fillRoundedRect(h.x,h.y,h.w,h.h,18);
      g.lineStyle(2,this.theme.accent,.30);
      for(let yy=h.y+14;yy<h.y+h.h;yy+=32){ g.beginPath(); g.moveTo(h.x+10,yy); g.lineTo(h.x+h.w-10,Math.min(h.y+h.h-10,yy+20)); g.strokePath(); }
    }
  }

  drawCheckpoints(g){
    for(const c of this.checkpoints){
      g.lineStyle(2,0xffffff,c.live?.20:.05); g.beginPath(); g.moveTo(c.x,150); g.lineTo(c.x,720); g.strokePath();
    }
  }

  drawFinish(g){
    const x=this.level.length+20,y=this.level.finishY??350;
    g.fillStyle(0xffffff,.14); g.fillRoundedRect(x-20,70,40,650,20);
    g.fillStyle(0xffffff,1); g.fillRoundedRect(x-11,70,22,650,11);
    const size=28;
    for(let r=0;r<4;r++) for(let c=0;c<2;c++) g.fillStyle((r+c)%2?0xffffff:this.theme.hazard,1).fillRect(x+12+c*size,y-56+r*size,size,size);
    g.fillStyle(0xffffff,.9); g.fillRoundedRect(x+12,y-72,size*2,16,8);
  }

  drawRope(){
    const g=this.ropeG; g.clear();
    if(!this.rope) return;
    const p=this.player,a=this.anchorPosition(this.rope.hook);
    g.lineStyle(7,0xffffff,.14); g.beginPath(); g.moveTo(p.x,p.y-5); g.lineTo(a.x,a.y); g.strokePath();
    g.lineStyle(2.6,0xffffff,.96); g.beginPath(); g.moveTo(p.x,p.y-5); g.lineTo(a.x,a.y); g.strokePath();
  }

  drawParticles(){
    const g=this.fxG; g.clear();
    for(const q of this.particles){ g.fillStyle(q.color,clamp(q.life/q.max,0,1)); g.fillCircle(q.x,q.y,q.size); }
    if(this.speedFx>.05){
      g.lineStyle(2,0xffffff,this.speedFx*.16);
      for(let i=0;i<15;i++){
        const x=this.cameraX+((i*237+this.runTime*510)%(this.scale.width+180))-90;
        const y=90+(i*83)%610;
        g.beginPath(); g.moveTo(x,y); g.lineTo(x-45-this.speedFx*95,y); g.strokePath();
      }
    }
  }

  drawPlayer(){
    const g=this.playerG; g.clear();
    const p=this.player;
    for(let i=this.trail.length-1;i>=0;i-=2){ const t=this.trail[i]; g.fillStyle(this.theme.accent,t.a*.35); g.fillCircle(t.x,t.y,10); }
    if(p.inv>0&&Math.floor(this.runTime*20)%2===0) return;
    g.save(); g.translateCanvas(p.x,p.y); g.rotateCanvas(p.angle);
    const speed=Math.hypot(p.vx,p.vy),stretch=clamp((speed-420)/1200,0,.17);
    g.scaleCanvas(1+stretch,1-stretch*.45);
    const body=this.theme.accent;
    g.lineStyle(8,0xffffff,.18); this.drawStick(g,3,3,body,true);
    this.drawStick(g,0,0,body,false);
    g.restore();
  }

  drawStick(g,ox,oy,body,shadow){
    const swinging=!!this.rope;
    g.fillStyle(shadow?0x111326:body,shadow?.18:1); g.fillCircle(ox,oy-21,12);
    if(!shadow){ g.fillStyle(0xffffff,1); g.fillCircle(ox+4,oy-23,3.4); }
    g.lineStyle(8,shadow?0x111326:body,shadow?.18:1);
    g.beginPath(); g.moveTo(ox,oy-9); g.lineTo(ox,oy+14); g.strokePath();
    const a1=swinging?-1.05:-.65, a2=swinging?-2.10:Math.PI+.55;
    this.limb(g,ox,oy-5,a1,18,17); this.limb(g,ox,oy-4,a2,18,17);
    const kick=Math.sin(this.runTime*7)*.18;
    this.limb(g,ox,oy+12,.55+kick,18,18); this.limb(g,ox,oy+12,2.45-kick,18,18);
  }

  limb(g,x,y,a,l1,l2){
    const ex=x+Math.cos(a)*l1,ey=y+Math.sin(a)*l1,b=a+.18;
    g.beginPath(); g.moveTo(x,y); g.lineTo(ex,ey); g.lineTo(ex+Math.cos(b)*l2,ey+Math.sin(b)*l2); g.strokePath();
  }

  reportProgress(){
    const ratio=clamp(this.player.x/this.level.length,0,1);
    window.dispatchEvent(new CustomEvent('webline:progress',{detail:{ratio}}));
  }

  toast(text){
    const now=performance.now();
    if(now-this.lastToast<180&&text!=='PERFECT RELEASE') return;
    this.lastToast=now;
    window.dispatchEvent(new CustomEvent('webline:toast',{detail:{text}}));
  }
}
