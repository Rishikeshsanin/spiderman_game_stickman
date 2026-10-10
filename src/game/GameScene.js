import Phaser from 'phaser';
import { MISSIONS, THEMES } from './campaign.js';
import { SoundFX } from './audio.js';
import { TETHER_RANGE, nearestAnchor } from './hookTargeting.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;

export class GameScene extends Phaser.Scene {
  constructor(){ super('game'); this.sfx=new SoundFX(); }
  init(data){ this.missionIndex=clamp(data.missionIndex??0,0,MISSIONS.length-1); }

  create(){
    this.mission=MISSIONS[this.missionIndex];
    this.theme=THEMES[this.mission.environment];
    this.worldH=820;
    this.missionTime=0;
    this.restarts=0;
    this.started=false;
    this.finished=false;
    this.holding=false;
    this.rope=null;
    this.targetCandidate=null;
    this.cameraX=0;
    this.speedFx=0;
    this.lastToast=0;
    this.alarmClock=0;
    this.particles=[];
    this.trail=[];
    this.checkpoint={x:this.mission.spawn[0],y:this.mission.spawn[1]};
    this.chaserOrigin=this.mission.chaser?.start??null;
    this.chaserResetAt=0;
    this.chaserX=this.chaserOrigin??-99999;

    this.background=this.add.graphics().setScrollFactor(0).setDepth(-100);
    this.worldG=this.add.graphics().setDepth(1);
    this.ropeG=this.add.graphics().setDepth(4);
    this.playerG=this.add.graphics().setDepth(5);
    this.fxG=this.add.graphics().setDepth(6);

    this.anchors=[];this.pads=[];this.hazards=[];this.lasers=[];this.vents=[];this.debris=[];this.rotors=[];this.checkpoints=[];
    this.buildObjects();

    this.player={
      x:this.mission.spawn[0],y:this.mission.spawn[1],vx:255,vy:-30,r:17,
      angle:0,spin:0,inv:0,snapGlow:0
    };

    this.cameras.main.setBounds(0,0,this.mission.length+760,this.worldH);
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

    this.dispatch('tether:mission-start',{index:this.missionIndex,id:this.mission.id,length:this.mission.length});
    this.dispatch('tether:prompt',{show:true});
  }

  buildObjects(){
    for(const raw of this.mission.objects){
      const o={...raw,baseX:raw.x,baseY:raw.y,phase:raw.phase??((raw.x%419)/419*TAU),live:true,broken:false};
      if(o.type==='anchor')this.anchors.push(o);
      if(o.type==='pad')this.pads.push(o);
      if(o.type==='hazard')this.hazards.push(o);
      if(o.type==='laser')this.lasers.push(o);
      if(o.type==='vent')this.vents.push(o);
      if(o.type==='debris')this.debris.push(o);
      if(o.type==='rotor')this.rotors.push(o);
      if(o.type==='checkpoint')this.checkpoints.push(o);
    }
  }

  dispatch(name,detail={}){ window.dispatchEvent(new CustomEvent(name,{detail})); }

  press(){
    if(this.finished)return;
    this.sfx.ensure();
    if(!this.started){
      this.started=true;
      this.dispatch('tether:prompt',{show:false});
    }
    if(this.holding)return;
    this.holding=true;
    this.attachNearest(false);
  }

  release(){
    if(!this.holding)return;
    this.holding=false;
    if(!this.rope)return;

    const p=this.player;
    const a=this.anchorPosition(this.rope.anchor);
    const dx=p.x-a.x,dy=p.y-a.y,len=Math.hypot(dx,dy)||1;
    let tx=-dy/len,ty=dx/len;
    if(tx<0){tx=-tx;ty=-ty;}
    const tangent=p.vx*tx+p.vy*ty;
    const speed=Math.hypot(p.vx,p.vy);
    const snap=this.rope.tension>.22&&speed>500&&tangent>320;

    if(snap){
      p.vx+=90;
      p.vy-=34;
      p.snapGlow=.42;
      p.spin+=1.6;
      this.emit(p.x,p.y,18,this.theme.glow,250);
      this.toast('TETHER SNAP');
    }

    const released=this.rope.anchor;
    this.rope=null;
    this.sfx.release(snap);

    if(released.kind==='fragile'&&!released.broken){
      released.broken=true;
      const pos=this.anchorPosition(released);
      this.emit(pos.x,pos.y,20,this.theme.warning,230);
      this.sfx.fragile();
    }
  }

  anchorAvailable(anchor){
    if(anchor.broken)return false;
    if(anchor.kind==='pulse'){
      const t=(this.missionTime+(anchor.phase??0))%(anchor.period??2.2);
      return t<(anchor.period??2.2)*(anchor.duty??.62);
    }
    return true;
  }

  getNearestCandidate(){
    return nearestAnchor(
      this.player,
      this.anchors,
      a=>this.anchorPosition(a),
      a=>this.anchorAvailable(a),
      TETHER_RANGE
    );
  }

  attachNearest(silent=true){
    if(this.rope)return true;
    const candidate=this.getNearestCandidate();
    this.targetCandidate=candidate;
    if(!candidate){
      if(!silent)this.toast('NO MAG NODE');
      return false;
    }

    const {anchor,pos,distance}=candidate;
    this.rope={anchor,length:clamp(distance*.985,88,TETHER_RANGE-12),tension:0};
    this.sfx.tether();
    this.emit(pos.x,pos.y,9,this.theme.glow,110);
    return true;
  }

  anchorPosition(anchor){
    let x=anchor.baseX,y=anchor.baseY;
    if(anchor.move==='x')x+=Math.sin(this.missionTime*anchor.speed+anchor.phase)*anchor.amp;
    if(anchor.move==='y')y+=Math.sin(this.missionTime*anchor.speed+anchor.phase)*anchor.amp;
    if(anchor.orbit){
      x+=Math.cos(this.missionTime*anchor.speed+anchor.phase)*anchor.orbit;
      y+=Math.sin(this.missionTime*anchor.speed+anchor.phase)*anchor.orbit*.64;
    }
    return{x,y};
  }

  movingRectPosition(o){
    let x=o.baseX,y=o.baseY;
    if(o.move==='x')x+=Math.sin(this.missionTime*o.speed+o.phase)*o.amp;
    if(o.move==='y')y+=Math.sin(this.missionTime*o.speed+o.phase)*o.amp;
    return{x,y};
  }

  laserActive(laser){
    const period=laser.period??2.4;
    const t=(this.missionTime+(laser.phase??0))%period;
    return t<period*(laser.duty??.56);
  }

  update(_,delta){
    const dt=Math.min(delta/1000,1/30);
    this.player.inv=Math.max(0,this.player.inv-dt);
    this.player.snapGlow=Math.max(0,this.player.snapGlow-dt);

    if(this.finished){this.draw();return;}
    if(!this.started){this.draw();this.reportProgress();return;}

    this.missionTime+=dt;
    this.alarmClock+=dt;
    if(this.mission.chaser&&this.alarmClock>.82){this.alarmClock=0;this.sfx.alarm();}

    if(this.holding&&!this.rope)this.attachNearest(true);
    this.targetCandidate=this.rope
      ?{anchor:this.rope.anchor,pos:this.anchorPosition(this.rope.anchor),distance:0}
      :this.getNearestCandidate();

    this.simulate(dt);
    this.updateCamera(dt);
    this.updateParticles(dt);
    this.draw();
    this.reportProgress();
  }

  simulate(dt){
    const p=this.player;
    const gravity=this.mission.gravity??{x:0,y:900};
    p.vx+=gravity.x*dt;
    p.vy+=gravity.y*dt;
    p.vx=clamp(p.vx,80,1120);
    p.vx*=Math.pow(.9985,dt*60);
    p.vy*=Math.pow(.9992,dt*60);

    this.applyVents(dt);
    if(this.rope)this.applyRope(dt);

    const prev={x:p.x,y:p.y};
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;

    const flightAngle=Math.atan2(p.vy,Math.max(100,p.vx));
    p.angle=lerp(p.angle,flightAngle*.42,.08);
    p.spin*=Math.pow(.90,dt*60);
    p.angle+=p.spin*dt;

    this.collidePads(prev);
    this.collideHazards();
    this.collideLasers();
    this.collideDebris();
    this.collideRotors();
    this.checkCheckpoints();
    this.updateChaser();

    if(p.y>this.worldH+190||p.y<-310||p.x<this.cameraX-230)this.crash('LOST CONTACT');
    if(p.x>=this.mission.length)this.finish();

    const speed=Math.hypot(p.vx,p.vy);
    this.speedFx=lerp(this.speedFx,clamp((speed-380)/560,0,1),.085);
    if(speed>380){
      this.trail.unshift({x:p.x,y:p.y,a:.18+this.speedFx*.34});
      if(this.trail.length>20)this.trail.length=20;
    }else if(this.trail.length)this.trail.pop();
    for(const t of this.trail)t.a*=.87;
  }

  applyVents(dt){
    const p=this.player;
    for(const vent of this.vents){
      if(p.x>vent.x&&p.x<vent.x+vent.w&&p.y>vent.y&&p.y<vent.y+vent.h){
        p.vx+=vent.fx*dt;
        p.vy+=vent.fy*dt;
      }
    }
  }

  applyRope(dt){
    const p=this.player,a=this.anchorPosition(this.rope.anchor);
    const dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy)||1;
    const nx=dx/d,ny=dy/d;

    if(d>this.rope.length){
      const over=d-this.rope.length;
      const radial=p.vx*nx+p.vy*ny;
      const correction=Math.min(over,25);
      p.x-=nx*correction;p.y-=ny*correction;
      if(radial>0){p.vx-=nx*radial*1.02;p.vy-=ny*radial*1.02;}
      const spring=over*18*dt;
      p.vx-=nx*spring;p.vy-=ny*spring;

      let tx=-ny,ty=nx;
      if(tx<0){tx=-tx;ty=-ty;}
      const forward=p.vx*tx+p.vy*ty;
      const assist=clamp(520-forward,0,165)*dt*.50;
      p.vx+=tx*assist;p.vy+=ty*assist;
      this.rope.tension=clamp(over/42+Math.max(0,radial)/700,0,1);
    }else this.rope.tension*=.88;
  }

  collidePads(prev){
    const p=this.player;
    for(const pad of this.pads){
      if(pad.vertical){
        const left=pad.x-pad.w/2,right=pad.x+pad.w/2,top=pad.y-85,bottom=pad.y+85;
        if(p.x+p.r>left&&p.x-p.r<right&&p.y+p.r>top&&p.y-p.r<bottom&&prev.x+p.r<=left+14){
          p.x=left-p.r-1;p.vx=Math.max(450,Math.abs(p.vx)*(pad.boost??1.26));p.vy-=125;p.spin-=4.2;
          this.bounceFx(pad.x,p.y);return;
        }
      }else{
        const left=pad.x-pad.w/2,right=pad.x+pad.w/2,top=pad.y-12;
        if(p.x+p.r>left&&p.x-p.r<right&&prev.y+p.r<=top+12&&p.y+p.r>=top&&p.vy>0){
          p.y=top-p.r-1;p.vy=-Math.max(535,Math.abs(p.vy)*(pad.boost??1.34));p.vx=Math.max(p.vx,320);p.spin+=(Math.random()>.5?1:-1)*3.5;
          this.bounceFx(p.x,top);return;
        }
      }
    }
  }

  bounceFx(x,y){
    this.sfx.bounce();this.emit(x,y,16,this.theme.glow,250);this.cameras.main.shake(75,.0035);
  }

  rectHits(x,y,w,h,margin=3){
    const p=this.player;
    return p.x+p.r-margin>x&&p.x-p.r+margin<x+w&&p.y+p.r-margin>y&&p.y-p.r+margin<y+h;
  }

  collideHazards(){
    if(this.player.inv>0)return;
    for(const h of this.hazards){if(this.rectHits(h.x,h.y,h.w,h.h)){this.crash('IMPACT');return;}}
  }

  collideLasers(){
    if(this.player.inv>0)return;
    for(const laser of this.lasers){
      if(this.laserActive(laser)&&this.rectHits(laser.x,laser.y,laser.w,laser.h,6)){this.crash('SECURITY GRID');return;}
    }
  }

  collideDebris(){
    if(this.player.inv>0)return;
    for(const obj of this.debris){
      const pos=this.movingRectPosition(obj);
      if(this.rectHits(pos.x,pos.y,obj.w,obj.h,4)){this.crash('DEBRIS STRIKE');return;}
    }
  }

  pointSegmentDistance(px,py,x1,y1,x2,y2){
    const dx=x2-x1,dy=y2-y1,len2=dx*dx+dy*dy||1;
    const t=clamp(((px-x1)*dx+(py-y1)*dy)/len2,0,1);
    return Math.hypot(px-(x1+dx*t),py-(y1+dy*t));
  }

  collideRotors(){
    if(this.player.inv>0)return;
    const p=this.player;
    for(const rotor of this.rotors){
      const rot=this.missionTime*rotor.speed+rotor.phase;
      for(let i=0;i<rotor.arms;i++){
        const ang=rot+i/rotor.arms*TAU;
        const x2=rotor.x+Math.cos(ang)*rotor.radius;
        const y2=rotor.y+Math.sin(ang)*rotor.radius;
        if(this.pointSegmentDistance(p.x,p.y,rotor.x,rotor.y,x2,y2)<p.r+9){this.crash('TURBINE STRIKE');return;}
      }
    }
  }

  checkCheckpoints(){
    for(const c of this.checkpoints){
      if(c.live&&this.player.x>c.x){
        c.live=false;this.checkpoint={x:c.x,y:c.y};this.sfx.checkpoint();this.toast('SAFE POINT');
      }
    }
  }

  updateChaser(){
    if(!this.mission.chaser)return;
    const elapsed=this.missionTime-this.chaserResetAt;
    this.chaserX=this.chaserOrigin+elapsed*this.mission.chaser.speed;
    if(this.player.x<this.chaserX+70)this.crash('STATION COLLAPSE');
  }

  crash(reason='SYSTEM FAILURE'){
    if(this.player.inv>0||this.finished)return;
    this.restarts++;
    this.sfx.crash();this.cameras.main.shake(160,.011);
    this.emit(this.player.x,this.player.y,30,this.theme.warning,310);
    this.rope=null;this.holding=false;

    const cp=this.checkpoint,p=this.player;
    p.x=cp.x;p.y=cp.y;p.vx=255;p.vy=-30;p.angle=0;p.spin=0;p.inv=.76;p.snapGlow=0;
    this.trail.length=0;
    this.cameraX=Math.max(0,cp.x-260);
    this.cameras.main.setScroll(this.cameraX,0);

    if(this.mission.chaser){
      this.chaserOrigin=cp.x-470;
      this.chaserResetAt=this.missionTime;
      this.chaserX=this.chaserOrigin;
    }
    this.toast(reason);
  }

  finish(){
    if(this.finished)return;
    this.finished=true;this.rope=null;this.holding=false;this.sfx.finish();this.cameras.main.shake(180,.005);
    for(let i=0;i<6;i++)setTimeout(()=>this.emit(this.mission.length+30,160+Math.random()*470,28,i%2?this.theme.accent:this.theme.glow,340),i*65);

    const par=this.mission.par;
    const stars=this.restarts===0&&this.missionTime<=par?3:(this.restarts<=2&&this.missionTime<=par*1.5?2:1);
    setTimeout(()=>this.dispatch('tether:complete',{
      index:this.missionIndex,id:this.mission.id,time:this.missionTime,restarts:this.restarts,stars,outro:this.mission.outro
    }),650);
  }

  updateCamera(dt){
    const target=clamp(this.player.x-this.scale.width*.31,0,Math.max(0,this.mission.length-this.scale.width*.42));
    this.cameraX=lerp(this.cameraX,target,1-Math.pow(.00045,dt));
    this.cameras.main.setScroll(this.cameraX,0);
    const z=1-this.speedFx*.032;
    this.cameras.main.setZoom(lerp(this.cameras.main.zoom,z,.055));
  }

  emit(x,y,count,color,force){
    for(let i=0;i<count;i++){
      const ang=Math.random()*TAU,s=Math.random()*force;
      this.particles.push({x,y,vx:Math.cos(ang)*s,vy:Math.sin(ang)*s,life:.3+Math.random()*.55,max:.85,size:1.3+Math.random()*3.8,color});
    }
  }

  updateParticles(dt){
    for(const q of this.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=70*dt;q.life-=dt;}
    this.particles=this.particles.filter(q=>q.life>0);
  }

  draw(){
    this.drawBackground();
    const g=this.worldG;g.clear();
    this.drawEnvironment(g);this.drawVents(g);this.drawHazards(g);this.drawLasers(g);this.drawDebris(g);this.drawRotors(g);
    this.drawPads(g);this.drawAnchors(g);this.drawCheckpoints(g);this.drawChaser(g);this.drawFinish(g);this.drawTarget(g);
    this.drawRope();this.drawParticles();this.drawPlayer();
  }

  drawBackground(){
    const g=this.background;g.clear();
    const w=this.scale.width,h=this.scale.height;
    const c1=Phaser.Display.Color.IntegerToColor(this.theme.top),c2=Phaser.Display.Color.IntegerToColor(this.theme.bottom);
    for(let i=0;i<48;i++){
      const t=i/47;
      const col=Phaser.Display.Color.GetColor(
        Math.round(lerp(c1.red,c2.red,t)),Math.round(lerp(c1.green,c2.green,t)),Math.round(lerp(c1.blue,c2.blue,t))
      );
      g.fillStyle(col,1);g.fillRect(0,i*h/48,w,h/48+2);
    }

    if(this.mission.environment==='exterior'||this.mission.environment==='collapse'){
      g.fillStyle(this.theme.star,.55);
      for(let i=0;i<72;i++){
        const x=((i*193-this.cameraX*.028)%(w+180)+w+180)%(w+180)-90;
        const y=30+(i*137)%Math.max(120,h-60);
        g.fillCircle(x,y,.7+(i%4)*.35);
      }
      const ex=w*.82-this.cameraX*.012,ey=h*.82;
      g.fillStyle(0x0d62a9,.38);g.fillCircle(ex,ey,Math.min(w,h)*.34);
      g.fillStyle(0x6cdfff,.12);g.fillCircle(ex-Math.min(w,h)*.08,ey-Math.min(w,h)*.08,Math.min(w,h)*.30);
    }else{
      g.fillStyle(0xffffff,.035);
      for(let row=0;row<9;row++)for(let col=0;col<15;col++)g.fillCircle(col*w/14+(row%2)*8,70+row*75,1+(row+col)%3*.45);
    }

    if(this.mission.environment==='reactor'||this.mission.environment==='collapse'){
      g.fillStyle(this.theme.warning,.055);g.fillCircle(w*.82,h*.50,Math.min(w,h)*.30);
    }
  }

  drawEnvironment(g){
    const left=this.cameraX-120,right=this.cameraX+this.scale.width/Math.max(.9,this.cameras.main.zoom)+220;
    if(this.mission.environment==='exterior'){
      g.lineStyle(8,this.theme.metal,.55);
      for(let x=Math.floor(left/520)*520;x<right;x+=520){
        g.beginPath();g.moveTo(x,110);g.lineTo(x+430,710);g.strokePath();
        g.beginPath();g.moveTo(x+430,110);g.lineTo(x,710);g.strokePath();
      }
      return;
    }

    g.fillStyle(this.theme.panel,.92);g.fillRect(left,0,right-left,68);g.fillRect(left,752,right-left,120);
    g.fillStyle(this.theme.metal,.90);g.fillRect(left,68,right-left,28);g.fillRect(left,724,right-left,28);
    g.lineStyle(3,this.theme.accent,.18);
    for(let x=Math.floor(left/320)*320;x<right;x+=320){
      g.fillStyle(this.theme.metal,.70);g.fillRect(x,70,22,680);
      g.beginPath();g.moveTo(x+22,110);g.lineTo(x+118,210);g.lineTo(x+22,310);g.strokePath();
      g.fillStyle((Math.floor(x/320)%2===0)?this.theme.warning:this.theme.accent,.72);g.fillRoundedRect(x+38,82,48,8,4);
    }
    if(this.mission.environment==='breach'){
      g.lineStyle(2,0xffffff,.12);
      for(let x=Math.floor(left/410)*410;x<right;x+=410){g.strokeCircle(x+160,410,120);}
    }
    if(this.mission.environment==='reactor'){
      g.lineStyle(12,0x5a2d20,.50);g.beginPath();g.moveTo(left,140);g.lineTo(right,140);g.strokePath();
      g.lineStyle(6,this.theme.accent,.22);g.beginPath();g.moveTo(left,155);g.lineTo(right,155);g.strokePath();
    }
  }

  drawAnchors(g){
    const target=this.targetCandidate?.anchor;
    for(const a of this.anchors){
      const pos=this.anchorPosition(a),available=this.anchorAvailable(a),selected=a===target&&!this.rope;
      if(a.broken){
        g.lineStyle(2,this.theme.warning,.25);g.strokeCircle(pos.x,pos.y,17);continue;
      }
      const alpha=available?1:.20;
      g.fillStyle(0x02050a,.45*alpha);g.fillCircle(pos.x+4,pos.y+5,22);
      g.fillStyle(a.kind==='fragile'?this.theme.warning:this.theme.accent,.96*alpha);g.fillCircle(pos.x,pos.y,20);
      g.lineStyle(4,0xffffff,.9*alpha);g.strokeCircle(pos.x,pos.y,20);
      g.fillStyle(this.theme.panel,.92*alpha);g.fillCircle(pos.x,pos.y,8);
      g.fillStyle(this.theme.glow,.95*alpha);g.fillCircle(pos.x,pos.y,3);
      if(a.kind==='fragile'){
        g.lineStyle(1.4,0xffffff,.65*alpha);g.beginPath();g.moveTo(pos.x-11,pos.y-8);g.lineTo(pos.x+8,pos.y+10);g.strokePath();
      }
      if(a.kind==='pulse'){
        g.lineStyle(2,this.theme.glow,available?.38:.08);g.strokeCircle(pos.x,pos.y,29+Math.sin(this.missionTime*6+a.phase)*3);
      }
      if(selected){
        g.lineStyle(3,this.theme.glow,.88);g.strokeCircle(pos.x,pos.y,34+Math.sin(this.missionTime*8)*3);
        g.lineStyle(1,this.theme.accent,.45);g.strokeCircle(pos.x,pos.y,44+Math.sin(this.missionTime*8)*4);
      }
    }
  }

  drawTarget(g){
    if(!this.targetCandidate||this.rope)return;
    const a=this.anchorPosition(this.targetCandidate.anchor),p=this.player;
    g.lineStyle(1,this.theme.glow,.09);
    const seg=12;
    for(let i=0;i<seg;i+=2){
      const t1=i/seg,t2=(i+1)/seg;
      g.beginPath();g.moveTo(lerp(p.x,a.x,t1),lerp(p.y,a.y,t1));g.lineTo(lerp(p.x,a.x,t2),lerp(p.y,a.y,t2));g.strokePath();
    }
  }

  drawPads(g){
    for(const pad of this.pads){
      if(pad.vertical){
        g.fillStyle(0xffffff,.95);g.fillRoundedRect(pad.x-pad.w/2,pad.y-76,pad.w,152,15);
        g.fillStyle(this.theme.accent,.90);g.fillRoundedRect(pad.x-pad.w/2+9,pad.y-65,pad.w-18,130,10);
      }else{
        g.fillStyle(0xffffff,.95);g.fillRoundedRect(pad.x-pad.w/2,pad.y-12,pad.w,24,12);
        g.fillStyle(this.theme.accent,.95);g.fillRoundedRect(pad.x-pad.w/2+10,pad.y-7,pad.w-20,14,7);
      }
    }
  }

  drawHazards(g){
    for(const h of this.hazards){
      g.fillStyle(this.theme.panel,.98);g.fillRoundedRect(h.x,h.y,h.w,h.h,12);
      g.lineStyle(2,this.theme.warning,.60);
      for(let yy=h.y+12;yy<h.y+h.h;yy+=30){g.beginPath();g.moveTo(h.x+8,yy);g.lineTo(h.x+h.w-8,Math.min(h.y+h.h-8,yy+22));g.strokePath();}
    }
  }

  drawLasers(g){
    for(const laser of this.lasers){
      const active=this.laserActive(laser);
      g.fillStyle(this.theme.panel,.75);g.fillRoundedRect(laser.x-8,laser.y-8,laser.w+16,laser.h+16,8);
      g.fillStyle(this.theme.warning,active?.85:.12);g.fillRect(laser.x,laser.y,laser.w,laser.h);
      if(active){g.fillStyle(0xffffff,.65);g.fillRect(laser.x+laser.w*.38,laser.y,Math.max(2,laser.w*.24),laser.h);}
    }
  }

  drawVents(g){
    for(const vent of this.vents){
      g.lineStyle(1.5,this.theme.accent,.16);g.strokeRect(vent.x,vent.y,vent.w,vent.h);
      const dir=Math.atan2(vent.fy,vent.fx),spacing=70;
      for(let x=vent.x+30;x<vent.x+vent.w;x+=spacing){
        const y=vent.y+vent.h*.5+Math.sin((x+this.missionTime*180)*.02)*vent.h*.28;
        g.lineStyle(2,this.theme.glow,.14);g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(dir)*34,y+Math.sin(dir)*34);g.strokePath();
      }
    }
  }

  drawDebris(g){
    for(const obj of this.debris){
      const pos=this.movingRectPosition(obj);
      g.save();g.translateCanvas(pos.x+obj.w/2,pos.y+obj.h/2);g.rotateCanvas(Math.sin(this.missionTime*.7+obj.phase)*.25);
      g.fillStyle(this.theme.metal,.95);g.fillRoundedRect(-obj.w/2,-obj.h/2,obj.w,obj.h,8);
      g.lineStyle(2,this.theme.warning,.35);g.strokeRoundedRect(-obj.w/2,-obj.h/2,obj.w,obj.h,8);g.restore();
    }
  }

  drawRotors(g){
    for(const rotor of this.rotors){
      const rot=this.missionTime*rotor.speed+rotor.phase;
      g.fillStyle(this.theme.panel,.95);g.fillCircle(rotor.x,rotor.y,36);
      g.lineStyle(3,this.theme.accent,.42);g.strokeCircle(rotor.x,rotor.y,48);
      for(let i=0;i<rotor.arms;i++){
        const ang=rot+i/rotor.arms*TAU,x2=rotor.x+Math.cos(ang)*rotor.radius,y2=rotor.y+Math.sin(ang)*rotor.radius;
        g.lineStyle(18,this.theme.metal,.95);g.beginPath();g.moveTo(rotor.x,rotor.y);g.lineTo(x2,y2);g.strokePath();
        g.lineStyle(3,this.theme.warning,.55);g.beginPath();g.moveTo(rotor.x,rotor.y);g.lineTo(x2,y2);g.strokePath();
      }
    }
  }

  drawCheckpoints(g){
    for(const c of this.checkpoints){
      g.lineStyle(2,this.theme.accent,c.live?.11:.03);g.beginPath();g.moveTo(c.x,120);g.lineTo(c.x,710);g.strokePath();
    }
  }

  drawChaser(g){
    if(!this.mission.chaser)return;
    const x=this.chaserX;
    g.fillStyle(this.theme.warning,.13);g.fillRect(x-220,0,220,820);
    g.fillStyle(this.theme.warning,.48);g.fillRect(x-14,0,28,820);
    g.lineStyle(3,0xffffff,.35);
    for(let y=40;y<820;y+=80){g.beginPath();g.moveTo(x-30,y);g.lineTo(x+30,y+35);g.strokePath();}
  }

  drawFinish(g){
    const x=this.mission.length+20,y=390;
    if(this.mission.id===MISSIONS.length){
      g.fillStyle(0x0a1322,.95);g.fillRoundedRect(x-15,y-92,140,184,54);
      g.lineStyle(5,this.theme.glow,.85);g.strokeRoundedRect(x-15,y-92,140,184,54);
      g.fillStyle(this.theme.accent,.35);g.fillCircle(x+52,y,42);
      g.fillStyle(0xffffff,.9);g.fillRoundedRect(x+18,y-6,68,12,6);
      g.lineStyle(5,this.theme.metal,.9);g.beginPath();g.moveTo(x+125,y-55);g.lineTo(x+176,y-92);g.strokePath();
      g.beginPath();g.moveTo(x+125,y+55);g.lineTo(x+176,y+92);g.strokePath();
    }else{
      g.fillStyle(this.theme.panel,.96);g.fillRoundedRect(x-22,92,94,636,34);
      g.lineStyle(5,this.theme.accent,.78);g.strokeRoundedRect(x-12,108,74,604,28);
      g.fillStyle(this.theme.glow,.10);g.fillRoundedRect(x,130,50,560,22);
      g.fillStyle(this.theme.accent,.9);g.fillRoundedRect(x+14,370,22,70,9);
    }
  }

  drawRope(){
    const g=this.ropeG;g.clear();if(!this.rope)return;
    const p=this.player,a=this.anchorPosition(this.rope.anchor),dx=a.x-p.x,dy=a.y-p.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    g.lineStyle(8,this.theme.accent,.10);g.beginPath();g.moveTo(p.x,p.y-4);g.lineTo(a.x,a.y);g.strokePath();
    g.lineStyle(2.6,this.theme.glow,.98);g.beginPath();g.moveTo(p.x,p.y-4);g.lineTo(a.x,a.y);g.strokePath();
    g.lineStyle(1,this.theme.accent,.58);
    const count=Math.floor(len/34);
    for(let i=1;i<count;i++){
      const t=i/count,x=lerp(p.x,a.x,t),y=lerp(p.y-4,a.y,t),s=2+Math.sin(t*Math.PI)*2.5;
      g.beginPath();g.moveTo(x-nx*s,y-ny*s);g.lineTo(x+nx*s,y+ny*s);g.strokePath();
    }
  }

  drawParticles(){
    const g=this.fxG;g.clear();
    for(const q of this.particles){g.fillStyle(q.color,clamp(q.life/q.max,0,1));g.fillCircle(q.x,q.y,q.size);}
    if(this.speedFx>.04){
      g.lineStyle(2,this.theme.glow,this.speedFx*.12);
      for(let i=0;i<18;i++){
        const x=this.cameraX+((i*239+this.missionTime*560)%(this.scale.width+200))-100,y=80+(i*83)%640;
        g.beginPath();g.moveTo(x,y);g.lineTo(x-48-this.speedFx*120,y);g.strokePath();
      }
    }
  }

  drawPlayer(){
    const g=this.playerG;g.clear();const p=this.player;
    for(let i=this.trail.length-1;i>=0;i-=2){const t=this.trail[i];g.fillStyle(this.theme.accent,t.a*.26);g.fillCircle(t.x,t.y,8);}
    if(p.inv>0&&Math.floor(performance.now()/55)%2===0)return;

    g.save();g.translateCanvas(p.x,p.y);g.rotateCanvas(p.angle);
    const speed=Math.hypot(p.vx,p.vy),stretch=clamp((speed-360)/1300,0,.17);g.scaleCanvas(1+stretch,1-stretch*.42);
    this.drawAstronaut(g,3,3,true);this.drawAstronaut(g,0,0,false);g.restore();
  }

  drawAstronaut(g,ox,oy,shadow){
    const alpha=shadow?.18:1,body=shadow?0x01030a:0xeaf4ff,suit=shadow?0x01030a:0x8ca7be,dark=shadow?0x01030a:0x07111e;
    g.fillStyle(body,alpha);g.fillCircle(ox,oy-22,13);
    g.fillStyle(dark,alpha);g.fillRoundedRect(ox-9,oy-27,18,10,5);
    if(!shadow){g.fillStyle(this.theme.accent,.92);g.fillRoundedRect(ox-6,oy-25,12,6,3);}
    g.lineStyle(9,suit,alpha);g.beginPath();g.moveTo(ox,oy-9);g.lineTo(ox,oy+14);g.strokePath();

    const tethering=!!this.rope;
    g.lineStyle(7,body,alpha);
    this.limb(g,ox,oy-5,tethering?-1.10:-.62,18,17);
    this.limb(g,ox,oy-4,tethering?-2.04:Math.PI+.58,18,17);
    g.lineStyle(8,suit,alpha);
    const kick=Math.sin(this.missionTime*7)*.16;
    this.limb(g,ox,oy+12,.55+kick,18,18);this.limb(g,ox,oy+12,2.45-kick,18,18);

    if(!shadow){
      g.fillStyle(this.theme.accent,1);g.fillCircle(ox,oy+1,3);
      if(this.player.snapGlow>0){g.lineStyle(2,this.theme.glow,clamp(this.player.snapGlow/.42,0,1));g.strokeCircle(ox,oy,28+this.player.snapGlow*30);}
    }
  }

  limb(g,x,y,a,l1,l2){
    const ex=x+Math.cos(a)*l1,ey=y+Math.sin(a)*l1,b=a+.18;
    g.beginPath();g.moveTo(x,y);g.lineTo(ex,ey);g.lineTo(ex+Math.cos(b)*l2,ey+Math.sin(b)*l2);g.strokePath();
  }

  reportProgress(){
    const ratio=clamp(this.player.x/this.mission.length,0,1),speed=Math.round(Math.hypot(this.player.vx,this.player.vy));
    this.dispatch('tether:progress',{ratio,speed,time:this.missionTime});
  }

  toast(text){
    const now=performance.now();if(now-this.lastToast<180&&text!=='TETHER SNAP')return;this.lastToast=now;this.dispatch('tether:toast',{text});
  }
}
