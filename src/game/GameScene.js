import Phaser from 'phaser';
import { LEVELS, THEMES } from './levels.js';
import { SoundFX } from './audio.js';
import { HOOK_RANGE, nearestHook } from './hookTargeting.js';

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
    this.targetCandidate=null;
    this.checkpoint={x:this.level.spawn[0],y:this.level.spawn[1]};
    this.particles=[];
    this.trail=[];
    this.speedFx=0;
    this.perfectWindow=0;
    this.cameraX=0;
    this.lastToast=0;

    this.background=this.add.graphics().setScrollFactor(0).setDepth(-100);
    this.worldG=this.add.graphics().setDepth(1);
    this.ropeG=this.add.graphics().setDepth(4);
    this.playerG=this.add.graphics().setDepth(5);
    this.fxG=this.add.graphics().setDepth(6);

    this.hooks=[]; this.pads=[]; this.hazards=[]; this.checkpoints=[];
    this.buildObjects();
    this.player={x:this.level.spawn[0],y:this.level.spawn[1],vx:245,vy:-35,r:18,angle:0,spin:0,inv:0};

    this.cameras.main.setBounds(0,0,this.level.length+700,this.worldH);
    this.cameras.main.setScroll(0,0);
    this.cameras.main.setRoundPixels(false);

    this.input.keyboard.on('keydown-SPACE',e=>{e.preventDefault();this.press();});
    this.input.keyboard.on('keyup-SPACE',e=>{e.preventDefault();this.release();});
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
    if(!this.started){
      this.started=true;
      window.dispatchEvent(new CustomEvent('webline:prompt',{detail:{show:false}}));
    }
    if(this.holding) return;
    this.holding=true;
    this.attachNearest(false);
  }

  release(){
    if(!this.holding) return;
    this.holding=false;

    if(!this.rope) return;

    const speed=Math.hypot(this.player.vx,this.player.vy);
    const anchor=this.anchorPosition(this.rope.hook);
    const dx=this.player.x-anchor.x,dy=this.player.y-anchor.y;
    const len=Math.hypot(dx,dy)||1;
    let tx=-dy/len,ty=dx/len;
    if(tx<0){tx=-tx;ty=-ty;}
    const tangent=this.player.vx*tx+this.player.vy*ty;
    const perfect=speed>515&&this.player.vx>255&&Math.abs(dy)>60&&tangent>330;

    if(perfect){
      this.player.vx+=68;
      this.player.vy-=28;
      this.perfectWindow=.34;
      this.toast('PERFECT RELEASE');
      this.emit(this.player.x,this.player.y,14,0xffffff,220);
    }

    this.sfx.release(perfect);
    this.rope=null;
  }

  getNearestCandidate(){
    return nearestHook(this.player,this.hooks,h=>this.anchorPosition(h),HOOK_RANGE);
  }

  attachNearest(silent=true){
    if(this.rope) return true;
    const candidate=this.getNearestCandidate();
    this.targetCandidate=candidate;

    if(!candidate){
      if(!silent) this.toast('FIND A WEB POINT');
      return false;
    }

    const {hook,pos,distance:d}=candidate;
    this.rope={hook,length:clamp(d*.985,92,HOOK_RANGE-10),tension:0};
    this.sfx.hook();
    this.emit(pos.x,pos.y,9,this.theme.soft,115);
    return true;
  }

  anchorPosition(h){
    let x=h.baseX,y=h.baseY;
    if(h.move==='x') x+=Math.sin(this.runTime*h.speed+h.phase)*h.amp;
    if(h.move==='y') y+=Math.sin(this.runTime*h.speed+h.phase)*h.amp;
    if(h.orbit){
      x+=Math.cos(this.runTime*h.speed+h.phase)*h.orbit;
      y+=Math.sin(this.runTime*h.speed+h.phase)*h.orbit*.62;
    }
    return {x,y};
  }

  update(_,delta){
    const dt=Math.min(delta/1000,1/30);
    if(this.finished){this.draw();return;}

    if(this.started) this.runTime+=dt;
    this.perfectWindow=Math.max(0,this.perfectWindow-dt);
    this.player.inv=Math.max(0,this.player.inv-dt);

    // Magnetic input buffering: if Space/touch is already held, keep looking
    // until a reachable hook enters the generous nearest-hook radius.
    if(this.holding&&!this.rope) this.attachNearest(true);

    this.targetCandidate=this.rope
      ? {hook:this.rope.hook,pos:this.anchorPosition(this.rope.hook),distance:distance(this.player,this.anchorPosition(this.rope.hook))}
      : this.getNearestCandidate();

    this.simulate(dt);
    this.updateCamera(dt);
    this.updateParticles(dt);
    this.draw();
    this.reportProgress();
  }

  simulate(dt){
    const p=this.player;
    const gravity=this.level.gravity??930;
    p.vy+=gravity*dt;
    p.vx+=(this.level.wind??0)*dt;
    p.vx=clamp(p.vx,100,1020);
    p.vx*=Math.pow(.9984,dt*60);

    if(this.rope) this.applyRope(dt);

    const prev={x:p.x,y:p.y};
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;

    const flightAngle=Math.atan2(p.vy,Math.max(100,p.vx));
    p.angle=lerp(p.angle,flightAngle*.45,.09);
    p.spin*=Math.pow(.90,dt*60);
    p.angle+=p.spin*dt;

    this.collidePads(prev);
    this.collideHazards();
    this.checkCheckpoints();

    if(p.y>this.worldH+165||p.y<-270||p.x<this.cameraX-210) this.crash();
    if(p.x>=this.level.length) this.finish();

    const speed=Math.hypot(p.vx,p.vy);
    this.speedFx=lerp(this.speedFx,clamp((speed-390)/500,0,1),.09);

    if(speed>390){
      this.trail.unshift({x:p.x,y:p.y,a:.20+this.speedFx*.32});
      if(this.trail.length>18) this.trail.length=18;
    } else if(this.trail.length) this.trail.pop();

    for(const t of this.trail) t.a*=.88;
  }

  applyRope(dt){
    const p=this.player,a=this.anchorPosition(this.rope.hook);
    const dx=p.x-a.x,dy=p.y-a.y;
    const d=Math.hypot(dx,dy)||1;
    const nx=dx/d,ny=dy/d;

    if(d>this.rope.length){
      const over=d-this.rope.length;
      const radial=p.vx*nx+p.vy*ny;

      const correction=Math.min(over,24);
      p.x-=nx*correction;
      p.y-=ny*correction;

      if(radial>0){
        p.vx-=nx*radial*1.015;
        p.vy-=ny*radial*1.015;
      }

      const spring=over*18*dt;
      p.vx-=nx*spring;
      p.vy-=ny*spring;

      // Small forward-only assist keeps the swing expressive without replacing physics.
      let tx=-ny,ty=nx;
      if(tx<0){tx=-tx;ty=-ty;}
      const forwardTangent=p.vx*tx+p.vy*ty;
      const assist=clamp(500-forwardTangent,0,150)*dt*.52;
      p.vx+=tx*assist;
      p.vy+=ty*assist;

      this.rope.tension=clamp(over/42+Math.max(0,radial)/720,0,1);
    } else {
      this.rope.tension*=.88;
    }
  }

  collidePads(prev){
    const p=this.player;

    for(const pad of this.pads){
      if(pad.vertical){
        const left=pad.x-pad.w/2,right=pad.x+pad.w/2,top=pad.y-85,bottom=pad.y+85;
        if(p.x+p.r>left&&p.x-p.r<right&&p.y+p.r>top&&p.y-p.r<bottom&&prev.x+p.r<=left+14){
          p.x=left-p.r-1;
          p.vx=Math.max(440,Math.abs(p.vx)*(pad.boost??1.25));
          p.vy-=125;
          p.spin-=4.5;
          this.bounceFx(pad.x,p.y);
          return;
        }
      }else{
        const left=pad.x-pad.w/2,right=pad.x+pad.w/2,top=pad.y-12;
        if(p.x+p.r>left&&p.x-p.r<right&&prev.y+p.r<=top+12&&p.y+p.r>=top&&p.vy>0){
          p.y=top-p.r-1;
          p.vy=-Math.max(530,Math.abs(p.vy)*(pad.boost??1.32));
          p.vx=Math.max(p.vx,315);
          p.spin+=(Math.random()>.5?1:-1)*3.6;
          this.bounceFx(p.x,top);
          return;
        }
      }
    }
  }

  bounceFx(x,y){
    this.sfx.bounce();
    this.emit(x,y,16,this.theme.soft,250);
    this.cameras.main.shake(75,.0035);
  }

  collideHazards(){
    const p=this.player;
    if(p.inv>0) return;

    for(const h of this.hazards){
      const margin=3;
      if(p.x+p.r-margin>h.x&&p.x-p.r+margin<h.x+h.w&&p.y+p.r-margin>h.y&&p.y-p.r+margin<h.y+h.h){
        this.crash();
        return;
      }
    }
  }

  checkCheckpoints(){
    for(const c of this.checkpoints){
      if(c.live&&this.player.x>c.x){
        c.live=false;
        this.checkpoint={x:c.x,y:c.y};
        this.sfx.checkpoint();
        this.toast('CHECKPOINT');
      }
    }
  }

  crash(){
    if(this.player.inv>0||this.finished) return;

    this.deaths++;
    this.sfx.crash();
    this.cameras.main.shake(155,.010);
    this.emit(this.player.x,this.player.y,28,this.theme.accent,300);
    this.rope=null;
    this.holding=false;

    const cp=this.checkpoint;
    this.player.x=cp.x;
    this.player.y=cp.y;
    this.player.vx=245;
    this.player.vy=-40;
    this.player.angle=0;
    this.player.spin=0;
    this.player.inv=.72;
    this.trail.length=0;

    this.cameraX=Math.max(0,cp.x-250);
    this.cameras.main.setScroll(this.cameraX,0);
    this.toast(this.deaths===1?'TRY AGAIN':'KEEP SWINGING');
  }

  finish(){
    if(this.finished) return;

    this.finished=true;
    this.rope=null;
    this.holding=false;
    this.sfx.finish();
    this.cameras.main.shake(190,.005);

    for(let i=0;i<5;i++){
      setTimeout(()=>this.emit(this.level.length+40,180+Math.random()*430,26,i%2?this.theme.accent:this.theme.secondary,330),i*70);
    }

    const par=this.level.par;
    const stars=this.deaths===0&&this.runTime<=par?3:(this.deaths<=2&&this.runTime<=par*1.45?2:1);

    setTimeout(()=>window.dispatchEvent(new CustomEvent('webline:complete',{
      detail:{index:this.levelIndex,time:this.runTime,deaths:this.deaths,stars}
    })),620);
  }

  updateCamera(dt){
    const target=clamp(this.player.x-this.scale.width*.31,0,Math.max(0,this.level.length-this.scale.width*.42));
    this.cameraX=lerp(this.cameraX,target,1-Math.pow(.00045,dt));
    this.cameras.main.setScroll(this.cameraX,0);
    const z=1-this.speedFx*.028;
    this.cameras.main.setZoom(lerp(this.cameras.main.zoom,z,.055));
  }

  emit(x,y,count,color,force){
    for(let i=0;i<count;i++){
      const a=Math.random()*TAU,s=Math.random()*force;
      this.particles.push({
        x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
        life:.3+Math.random()*.55,max:.85,size:1.4+Math.random()*3.8,color
      });
    }
  }

  updateParticles(dt){
    for(const q of this.particles){
      q.x+=q.vx*dt;
      q.y+=q.vy*dt;
      q.vy+=110*dt;
      q.life-=dt;
    }
    this.particles=this.particles.filter(q=>q.life>0);
  }

  draw(){
    this.drawBackground();
    const g=this.worldG;
    g.clear();
    this.drawFinish(g);
    this.drawPads(g);
    this.drawHazards(g);
    this.drawHooks(g);
    this.drawCheckpoints(g);
    this.drawTarget(g);
    this.drawRope();
    this.drawParticles();
    this.drawPlayer();
  }

  drawBackground(){
    const g=this.background;
    g.clear();
    const w=this.scale.width,h=this.scale.height;
    const c1=Phaser.Display.Color.IntegerToColor(this.theme.top);
    const c2=Phaser.Display.Color.IntegerToColor(this.theme.bottom);
    const bands=46;

    for(let i=0;i<bands;i++){
      const t=i/(bands-1);
      const r=Math.round(lerp(c1.red,c2.red,t));
      const gg=Math.round(lerp(c1.green,c2.green,t));
      const b=Math.round(lerp(c1.blue,c2.blue,t));
      g.fillStyle(Phaser.Display.Color.GetColor(r,gg,b),1);
      g.fillRect(0,i*h/bands,w,h/bands+2);
    }

    // Comic halftone field.
    g.fillStyle(0xffffff,.055);
    for(let row=0;row<8;row++){
      for(let col=0;col<14;col++){
        const x=col*(w/13)+((row%2)*16);
        const y=80+row*82;
        const r=1.2+((row+col)%3)*.7;
        g.fillCircle(x,y,r);
      }
    }

    this.drawWebMotif(g,w*.08,h*.10,Math.min(240,w*.30));
    this.drawWebMotif(g,w*.96,h*.82,Math.min(300,w*.34));

    g.fillStyle(this.theme.accent,.055);
    g.fillCircle(w*.80,h*.22,Math.min(170,w*.22));
    g.fillStyle(this.theme.secondary,.055);
    g.fillCircle(w*.18,h*.72,Math.min(210,w*.25));
  }

  drawWebMotif(g,cx,cy,maxR){
    g.lineStyle(1.4,0xffffff,.075);
    for(let r=maxR*.25;r<=maxR;r+=maxR*.25) g.strokeCircle(cx,cy,r);
    for(let i=0;i<10;i++){
      const a=i/10*TAU;
      g.beginPath();
      g.moveTo(cx,cy);
      g.lineTo(cx+Math.cos(a)*maxR,cy+Math.sin(a)*maxR);
      g.strokePath();
    }
  }

  drawHooks(g){
    const target=this.targetCandidate?.hook;

    for(const h of this.hooks){
      const a=this.anchorPosition(h);
      const selected=h===target;
      const pulse=2+Math.sin(this.runTime*6+h.phase)*2;

      g.fillStyle(0x050914,.34);
      g.fillCircle(a.x+4,a.y+5,23);
      g.fillStyle(this.theme.accent,1);
      g.fillCircle(a.x,a.y,21);
      g.lineStyle(4,0xffffff,.96);
      g.strokeCircle(a.x,a.y,21);

      g.lineStyle(1.6,0xffffff,.62);
      g.strokeCircle(a.x,a.y,10);
      for(let i=0;i<6;i++){
        const ang=i/6*TAU;
        g.beginPath();
        g.moveTo(a.x+Math.cos(ang)*9,a.y+Math.sin(ang)*9);
        g.lineTo(a.x+Math.cos(ang)*18,a.y+Math.sin(ang)*18);
        g.strokePath();
      }

      if(selected&&!this.rope){
        g.lineStyle(3,this.theme.secondary,.9);
        g.strokeCircle(a.x,a.y,31+pulse);
        g.lineStyle(1,0xffffff,.42);
        g.strokeCircle(a.x,a.y,40+pulse*1.2);
      }
    }
  }

  drawTarget(g){
    if(!this.targetCandidate||this.rope) return;
    const a=this.anchorPosition(this.targetCandidate.hook);
    g.lineStyle(1,0xffffff,.08);
    const segments=9;
    for(let i=0;i<segments;i+=2){
      const t1=i/segments,t2=Math.min(1,(i+1)/segments);
      g.beginPath();
      g.moveTo(lerp(this.player.x,a.x,t1),lerp(this.player.y,a.y,t1));
      g.lineTo(lerp(this.player.x,a.x,t2),lerp(this.player.y,a.y,t2));
      g.strokePath();
    }
  }

  drawPads(g){
    for(const p of this.pads){
      const red=this.theme.accent,blue=this.theme.secondary;
      if(p.vertical){
        g.fillStyle(0x030611,.32);
        g.fillRoundedRect(p.x-p.w/2+6,p.y-76+7,p.w,152,18);
        g.fillStyle(0xffffff,1);
        g.fillRoundedRect(p.x-p.w/2,p.y-76,p.w,152,18);
        g.fillStyle(blue,1);
        g.fillRoundedRect(p.x-p.w/2+9,p.y-66,p.w-18,132,13);
        g.fillStyle(red,.86);
        g.fillRoundedRect(p.x-p.w/2+14,p.y-22,p.w-28,44,10);
      }else{
        g.fillStyle(0x030611,.30);
        g.fillRoundedRect(p.x-p.w/2+5,p.y-7,p.w,28,13);
        g.fillStyle(0xffffff,1);
        g.fillRoundedRect(p.x-p.w/2,p.y-12,p.w,24,12);
        g.fillStyle(blue,1);
        g.fillRoundedRect(p.x-p.w/2+10,p.y-7,p.w-20,14,7);
        g.fillStyle(red,.88);
        g.fillRoundedRect(p.x-p.w/2+24,p.y-5,p.w-48,10,5);
      }
    }
  }

  drawHazards(g){
    for(const h of this.hazards){
      g.fillStyle(0x02040a,.28);
      g.fillRoundedRect(h.x+7,h.y+7,h.w,h.h,18);
      g.fillStyle(this.theme.hazard,.97);
      g.fillRoundedRect(h.x,h.y,h.w,h.h,18);
      g.lineStyle(2,this.theme.accent,.48);
      for(let yy=h.y+12;yy<h.y+h.h;yy+=28){
        g.beginPath();
        g.moveTo(h.x+9,yy);
        g.lineTo(h.x+h.w-9,Math.min(h.y+h.h-9,yy+22));
        g.strokePath();
      }
    }
  }

  drawCheckpoints(g){
    for(const c of this.checkpoints){
      g.lineStyle(2,0xffffff,c.live?.14:.035);
      g.beginPath();
      g.moveTo(c.x,145);
      g.lineTo(c.x,720);
      g.strokePath();
    }
  }

  drawFinish(g){
    const x=this.level.length+20,y=this.level.finishY??350;
    g.fillStyle(0xffffff,.13);
    g.fillRoundedRect(x-20,70,40,650,20);
    g.fillStyle(0xffffff,1);
    g.fillRoundedRect(x-10,70,20,650,10);

    const size=28;
    for(let r=0;r<4;r++){
      for(let c=0;c<2;c++){
        const color=(r+c)%2?this.theme.accent:this.theme.secondary;
        g.fillStyle(color,1);
        g.fillRect(x+12+c*size,y-56+r*size,size,size);
      }
    }

    g.fillStyle(0xffffff,.95);
    g.fillRoundedRect(x+12,y-72,size*2,16,8);
  }

  drawRope(){
    const g=this.ropeG;
    g.clear();
    if(!this.rope) return;

    const p=this.player,a=this.anchorPosition(this.rope.hook);
    const dx=a.x-p.x,dy=a.y-p.y,len=Math.hypot(dx,dy)||1;
    const nx=-dy/len,ny=dx/len;

    g.lineStyle(7,0x02040a,.16);
    g.beginPath();g.moveTo(p.x+3,p.y-3);g.lineTo(a.x+3,a.y+3);g.strokePath();

    g.lineStyle(2.5,0xffffff,.98);
    g.beginPath();g.moveTo(p.x,p.y-5);g.lineTo(a.x,a.y);g.strokePath();

    // Small cross-strands make the tether read as a web, not a cable.
    g.lineStyle(1.1,0xdceeff,.62);
    const count=Math.floor(len/36);
    for(let i=1;i<count;i++){
      const t=i/count;
      const x=lerp(p.x,a.x,t),y=lerp(p.y-5,a.y,t);
      const s=2.2+Math.sin(t*Math.PI)*2.2;
      g.beginPath();
      g.moveTo(x-nx*s,y-ny*s);
      g.lineTo(x+nx*s,y+ny*s);
      g.strokePath();
    }
  }

  drawParticles(){
    const g=this.fxG;
    g.clear();

    for(const q of this.particles){
      g.fillStyle(q.color,clamp(q.life/q.max,0,1));
      g.fillCircle(q.x,q.y,q.size);
    }

    if(this.speedFx>.05){
      g.lineStyle(2,0xffffff,this.speedFx*.15);
      for(let i=0;i<18;i++){
        const x=this.cameraX+((i*237+this.runTime*530)%(this.scale.width+180))-90;
        const y=80+(i*83)%630;
        g.beginPath();
        g.moveTo(x,y);
        g.lineTo(x-45-this.speedFx*105,y+2);
        g.strokePath();
      }

      g.lineStyle(1,this.theme.accent,this.speedFx*.13);
      for(let i=0;i<7;i++){
        const x=this.cameraX+((i*319+this.runTime*420)%(this.scale.width+260))-130;
        const y=120+(i*101)%560;
        g.beginPath();
        g.moveTo(x,y);
        g.lineTo(x-70-this.speedFx*120,y);
        g.strokePath();
      }
    }
  }

  drawPlayer(){
    const g=this.playerG;
    g.clear();
    const p=this.player;

    for(let i=this.trail.length-1;i>=0;i-=2){
      const t=this.trail[i];
      g.fillStyle(i%4===0?this.theme.accent:this.theme.secondary,t.a*.28);
      g.fillCircle(t.x,t.y,9);
    }

    if(p.inv>0&&Math.floor(performance.now()/55)%2===0) return;

    g.save();
    g.translateCanvas(p.x,p.y);
    g.rotateCanvas(p.angle);

    const speed=Math.hypot(p.vx,p.vy);
    const stretch=clamp((speed-390)/1250,0,.18);
    g.scaleCanvas(1+stretch,1-stretch*.44);

    this.drawHero(g,3,3,true);
    this.drawHero(g,0,0,false);
    g.restore();
  }

  drawHero(g,ox,oy,shadow){
    const red=shadow?0x02040a:this.theme.accent;
    const blue=shadow?0x02040a:this.theme.secondary;
    const alpha=shadow?.18:1;
    const swinging=!!this.rope;

    // Mask.
    g.fillStyle(red,alpha);
    g.fillCircle(ox,oy-22,13);
    if(!shadow){
      g.fillStyle(0xffffff,1);
      g.fillTriangle(ox-8,oy-25,ox-2,oy-30,ox-3,oy-19);
      g.fillTriangle(ox+8,oy-25,ox+2,oy-30,ox+3,oy-19);
      g.lineStyle(1.2,0x071020,.85);
      g.strokeCircle(ox,oy-22,13);
    }

    // Torso.
    g.lineStyle(9,blue,alpha);
    g.beginPath();g.moveTo(ox,oy-9);g.lineTo(ox,oy+14);g.strokePath();

    // Red arms reach toward the web while swinging.
    g.lineStyle(7.5,red,alpha);
    const a1=swinging?-1.08:-.62;
    const a2=swinging?-2.06:Math.PI+.58;
    this.limb(g,ox,oy-5,a1,18,17);
    this.limb(g,ox,oy-4,a2,18,17);

    // Blue legs.
    g.lineStyle(8,blue,alpha);
    const kick=Math.sin(this.runTime*7)*.18;
    this.limb(g,ox,oy+12,.55+kick,18,18);
    this.limb(g,ox,oy+12,2.45-kick,18,18);

    if(!shadow){
      // Tiny original spider-like chest mark.
      g.fillStyle(red,1);
      g.fillCircle(ox,oy+1,3.2);
      g.lineStyle(1.3,red,1);
      for(const side of [-1,1]){
        g.beginPath();
        g.moveTo(ox+side*2,oy+1);g.lineTo(ox+side*7,oy-2);g.lineTo(ox+side*9,oy-6);g.strokePath();
        g.beginPath();
        g.moveTo(ox+side*2,oy+3);g.lineTo(ox+side*7,oy+7);g.lineTo(ox+side*9,oy+10);g.strokePath();
      }
    }
  }

  limb(g,x,y,a,l1,l2){
    const ex=x+Math.cos(a)*l1,ey=y+Math.sin(a)*l1,b=a+.18;
    g.beginPath();
    g.moveTo(x,y);
    g.lineTo(ex,ey);
    g.lineTo(ex+Math.cos(b)*l2,ey+Math.sin(b)*l2);
    g.strokePath();
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
