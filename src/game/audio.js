export class SoundFX {
  constructor() { this.ctx = null; this.master = null; }

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
    o.frequency.exponentialRampToValueAtTime(Math.max(40,b),t+d);
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.02);
  }

  noise(duration=.055, volume=.08, frequency=1450) {
    if (!this.ctx || !this.master) return;
    const frames=Math.max(1,Math.floor(this.ctx.sampleRate*duration));
    const buffer=this.ctx.createBuffer(1,frames,this.ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<frames;i++) data[i]=(Math.random()*2-1)*(1-i/frames);
    const source=this.ctx.createBufferSource();
    const filter=this.ctx.createBiquadFilter();
    const gain=this.ctx.createGain();
    filter.type='bandpass'; filter.frequency.value=frequency; filter.Q.value=1.1;
    gain.gain.setValueAtTime(volume,this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+duration);
    source.buffer=buffer; source.connect(filter); filter.connect(gain); gain.connect(this.master);
    source.start();
  }

  hook(){ this.noise(.06,.09,1700); this.tone(740,230,.095,'triangle',.12); }
  release(perfect=false){ this.tone(perfect?390:280,perfect?980:560,.085,'sine',perfect?.17:.095); }
  bounce(){ this.tone(145,560,.11,'triangle',.15); }
  crash(){ this.noise(.10,.12,430); this.tone(125,45,.20,'square',.12); }
  checkpoint(){ this.tone(520,860,.10,'sine',.10); }
  finish(){ this.tone(440,660,.11,'triangle',.14); setTimeout(()=>this.tone(660,1040,.16,'triangle',.14),90); }
}
