export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.lastTick = 0;
  }

  init() {
    if (this.ctx || !this.enabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { this.enabled = false; return; }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = .16;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  tone(freq = 440, duration = .08, type = 'sine', volume = .22, endFreq = null) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
    gain.gain.setValueAtTime(Math.max(.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + .02);
  }

  web() { this.tone(580, .12, 'triangle', .17, 220); }
  release() { this.tone(230, .09, 'sine', .12, 510); }
  jump() { this.tone(190, .08, 'triangle', .12, 320); }
  collect() { this.tone(760, .08, 'sine', .16, 1150); }
  nearMiss() { this.tone(320, .16, 'sawtooth', .08, 900); }
  hit() { this.tone(120, .24, 'square', .20, 55); }
  land() { this.tone(90, .055, 'sine', .10); }
  complete() {
    this.tone(440, .12, 'triangle', .12, 660);
    setTimeout(() => this.tone(660, .16, 'triangle', .12, 980), 100);
  }
}
