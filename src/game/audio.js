export class SoundFX {
  constructor() { this.ctx = null; this.master = null; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.17;
    this.master.connect(this.ctx.destination);
  }
  tone(a,b,d=.08,type='sine',vol=.18) {
    if (!this.ctx || !this.master) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(a,t); o.frequency.exponentialRampToValueAtTime(Math.max(40,b),t+d);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.02);
  }
  hook(){ this.tone(650,240,.11,'triangle',.15); }
  release(perfect=false){ this.tone(perfect?350:260,perfect?900:520,.09,'sine',perfect?.18:.10); }
  bounce(){ this.tone(150,520,.10,'triangle',.16); }
  crash(){ this.tone(130,45,.20,'square',.16); }
  checkpoint(){ this.tone(520,850,.10,'sine',.11); }
  finish(){ this.tone(440,660,.11,'triangle',.14); setTimeout(()=>this.tone(660,980,.15,'triangle',.14),90); }
}
