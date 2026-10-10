export class SoundFX {
  constructor() { this.ctx = null; this.master = null; this.hum = null; }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
  }

  tone(a,b,d=.08,type='sine',vol=.18) {
    if (!this.ctx || !this.master) return;
    const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;
    o.frequency.setValueAtTime(a,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(35,b),t+d);
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.03);
  }

  noise(duration=.06, volume=.08, frequency=1200) {
    if (!this.ctx || !this.master) return;
    const frames=Math.max(1,Math.floor(this.ctx.sampleRate*duration));
    const buffer=this.ctx.createBuffer(1,frames,this.ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<frames;i++) data[i]=(Math.random()*2-1)*(1-i/frames);
    const source=this.ctx.createBufferSource();
    const filter=this.ctx.createBiquadFilter();
    const gain=this.ctx.createGain();
    filter.type='bandpass'; filter.frequency.value=frequency; filter.Q.value=1.2;
    gain.gain.setValueAtTime(volume,this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+duration);
    source.buffer=buffer; source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start();
  }

  tether(){ this.noise(.05,.09,1850); this.tone(780,260,.095,'triangle',.12); }
  release(snap=false){ this.tone(snap?360:260,snap?1120:560,snap?.11:.08,'sine',snap?.18:.095); }
  bounce(){ this.tone(140,610,.11,'triangle',.15); }
  crash(){ this.noise(.11,.13,430); this.tone(120,42,.20,'square',.12); }
  checkpoint(){ this.tone(520,900,.11,'sine',.10); }
  fragile(){ this.noise(.08,.10,2200); this.tone(420,180,.09,'triangle',.08); }
  alarm(){ this.tone(620,420,.13,'square',.045); }
  pulse(){ this.tone(980,680,.045,'sine',.035); }
  finish(){ this.tone(420,680,.12,'triangle',.14); setTimeout(()=>this.tone(680,1080,.17,'triangle',.14),95); }
}
