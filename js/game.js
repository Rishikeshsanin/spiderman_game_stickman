import { buildLevel } from './levels.js';
import { AudioEngine } from './audio.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const TAU = Math.PI * 2;

export class ThreadRunnerGame {
  constructor(canvas, ui = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ui = ui;
    this.audio = new AudioEngine();
    this.dpr = 1;
    this.width = innerWidth;
    this.height = innerHeight;
    this.running = false;
    this.paused = false;
    this.levelIndex = 0;
    this.level = buildLevel(0);
    this.time = 0;
    this.levelTime = 0;
    this.lastFrame = performance.now();
    this.camera = { x: -260, y: 30, shake: 0, zoom: 1 };
    this.pointer = { x: 0, y: 0, down: false };
    this.input = { left: false, right: false, trickUp: false, trickDown: false };
    this.web = { active: false, anchor: null, length: 0, tension: 0 };
    this.particles = [];
    this.speedLines = [];
    this.toastCooldown = 0;
    this.nearMisses = new Set();
    this.completed = false;
    this.dead = false;
    this.respawnTimer = 0;
    this.stats = { score: 0, combo: 1, comboEnergy: 0, bestCombo: 1, distance: 0, tricks: 0 };
    this.player = this.makePlayer();
    this.backgroundSeeds = Array.from({ length: 90 }, (_, i) => ({
      x: (i * 719) % 7000,
      y: 40 + ((i * 173) % 360),
      r: .4 + (i % 4) * .22,
      a: .18 + (i % 5) * .09
    }));
    this.bindEvents();
    this.resize();
    requestAnimationFrame(t => this.loop(t));
  }

  makePlayer() {
    return {
      x: 120, y: 490, prevX: 120, prevY: 490,
      vx: 255, vy: 0,
      radius: 15,
      angle: 0, spin: 0,
      onGround: false,
      groundedBuilding: null,
      runPhase: 0,
      trail: [],
      trickCooldown: 0,
      invuln: 0
    };
  }

  bindEvents() {
    addEventListener('resize', () => this.resize());
    addEventListener('blur', () => { if (this.running && !this.paused) this.setPaused(true); });

    this.canvas.addEventListener('pointerdown', e => {
      if (!this.running || this.paused) return;
      this.pointer.down = true;
      this.setPointer(e);
      this.audio.resume();
      this.attachWeb(this.screenToWorld(this.pointer.x, this.pointer.y));
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', e => this.setPointer(e));
    this.canvas.addEventListener('pointerup', e => {
      this.pointer.down = false;
      this.setPointer(e);
      this.detachWeb(true);
    });
    this.canvas.addEventListener('pointercancel', () => { this.pointer.down = false; this.detachWeb(false); });

    addEventListener('keydown', e => {
      if (e.repeat && ['Space', 'KeyW', 'KeyS'].includes(e.code)) return;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.input.right = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.doTrick(-1);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.doTrick(1);
      if (e.code === 'Space' && this.running && !this.paused) {
        e.preventDefault();
        this.audio.resume();
        if (this.web.active) this.detachWeb(true); else if (this.player.onGround) this.jump(); else this.attachWeb(null);
      }
      if (e.code === 'Escape' && this.running) this.setPaused(!this.paused);
    });
    addEventListener('keyup', e => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.input.right = false;
    });
  }

  setPointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
  }

  setMobileControl(control, down) {
    if (control === 'left') this.input.left = down;
    if (control === 'right') this.input.right = down;
    if (control === 'web') {
      if (down && !this.web.active) this.attachWeb(null);
      if (!down && this.web.active) this.detachWeb(true);
    }
    if (control === 'trick' && down) this.doTrick(this.player.spin > 0 ? -1 : 1);
  }

  resize() {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.width = innerWidth;
    this.height = innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start(levelIndex = 0) {
    this.levelIndex = clamp(levelIndex, 0, 4);
    this.level = buildLevel(this.levelIndex);
    this.player = this.makePlayer();
    this.player.y = this.level.buildings[0].y - this.player.radius - 2;
    this.player.onGround = true;
    this.player.groundedBuilding = this.level.buildings[0];
    this.web = { active: false, anchor: null, length: 0, tension: 0 };
    this.stats = { score: 0, combo: 1, comboEnergy: 0, bestCombo: 1, distance: 0, tricks: 0 };
    this.time = 0;
    this.levelTime = 0;
    this.particles.length = 0;
    this.speedLines.length = 0;
    this.nearMisses.clear();
    this.camera = { x: -Math.max(220, this.width * .22), y: 20, shake: 0, zoom: 1 };
    this.running = true;
    this.paused = false;
    this.completed = false;
    this.dead = false;
    this.respawnTimer = 0;
    this.audio.resume();
    this.ui.onHud?.(true);
    this.ui.onStats?.(this.stats, this.level);
    this.toast(`LEVEL ${this.level.id} · ${this.level.name.toUpperCase()}`);
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.web.active = false;
    this.ui.onHud?.(false);
  }

  restart() { this.start(this.levelIndex); }

  setPaused(value) {
    if (!this.running || this.completed) return;
    this.paused = value;
    this.ui.onPause?.(value);
  }

  jump() {
    const p = this.player;
    if (!p.onGround) return;
    p.vy = -430;
    p.vx = Math.max(p.vx, 300);
    p.onGround = false;
    p.groundedBuilding = null;
    this.audio.jump();
    this.emitBurst(p.x, p.y + 14, 7, '#bfefff', 60);
  }

  attachWeb(targetWorld) {
    if (!this.running || this.paused || this.dead) return false;
    const p = this.player;
    let best = null;
    let bestScore = -Infinity;
    const maxRange = 690;
    const aim = targetWorld ? { x: targetWorld.x - p.x, y: targetWorld.y - p.y } : { x: 1, y: -.72 };
    const aimLen = Math.hypot(aim.x, aim.y) || 1;
    aim.x /= aimLen;
    aim.y /= aimLen;

    for (const a of this.level.anchors) {
      const dx = a.x - p.x;
      const dy = a.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > maxRange || d < 70) continue;
      if (dy > 150) continue;
      const dot = (dx / d) * aim.x + (dy / d) * aim.y;
      const forwardBonus = dx > -80 ? .25 : -.35;
      const heightBonus = dy < 0 ? .25 : -.15;
      const pointerBonus = targetWorld ? -dist(a, targetWorld) / 900 : 0;
      const score = dot * 1.7 + forwardBonus + heightBonus + pointerBonus - d / 1200;
      if (score > bestScore) { best = a; bestScore = score; }
    }

    if (!best || bestScore < -.25) {
      this.toast('NO ANCHOR IN RANGE');
      return false;
    }

    this.web.active = true;
    this.web.anchor = best;
    this.web.length = clamp(dist(p, best) * .92, 90, 590);
    this.web.tension = 0;
    p.onGround = false;
    p.groundedBuilding = null;
    this.audio.web();
    this.emitBurst(best.x, best.y, 8, this.level.palette.accent, 80);
    return true;
  }

  detachWeb(reward = false) {
    if (!this.web.active) return;
    const speed = Math.hypot(this.player.vx, this.player.vy);
    if (reward && speed > 420 && this.web.tension > .16) {
      const quality = speed > 720 ? 'PERFECT RELEASE' : 'FLOW RELEASE';
      this.addFlow(speed > 720 ? 40 : 24, speed > 720 ? 700 : 350, quality);
    }
    this.web.active = false;
    this.web.anchor = null;
    this.audio.release();
  }

  doTrick(direction) {
    const p = this.player;
    if (!this.running || this.paused || this.dead || p.onGround || p.trickCooldown > 0) return;
    p.spin += direction * 6.2;
    p.trickCooldown = .42;
    this.stats.tricks += 1;
    this.addFlow(28, 420, direction < 0 ? 'BACKFLIP' : 'FRONTFLIP');
  }

  addFlow(energy, score, label = '') {
    this.stats.comboEnergy = clamp(this.stats.comboEnergy + energy, 0, 100);
    const nextCombo = 1 + Math.floor(this.stats.comboEnergy / 22);
    if (nextCombo > this.stats.combo) {
      this.stats.combo = Math.min(5, nextCombo);
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.stats.combo);
      this.ui.onComboPulse?.();
    }
    this.stats.score += Math.round(score * this.stats.combo);
    if (label) this.toast(`${label}  +${Math.round(score * this.stats.combo)}`);
  }

  toast(text) { this.ui.onToast?.(text); }

  screenToWorld(x, y) {
    return {
      x: (x - this.width * .5) / this.camera.zoom + this.camera.x + this.width * .5,
      y: (y - this.height * .5) / this.camera.zoom + this.camera.y + this.height * .5
    };
  }

  update(dt) {
    if (!this.running || this.paused || this.completed) return;
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    this.levelTime += dt;
    this.toastCooldown = Math.max(0, this.toastCooldown - dt);
    const p = this.player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.trickCooldown = Math.max(0, p.trickCooldown - dt);

    if (this.dead) {
      this.respawnTimer -= dt;
      this.updateParticles(dt);
      this.updateCamera(dt);
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }

    p.prevX = p.x;
    p.prevY = p.y;
    const wasGrounded = p.onGround;
    p.onGround = false;

    const pump = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (wasGrounded) {
      p.vx += pump * 480 * dt;
      p.vx += 120 * dt;
      p.vx = clamp(p.vx, 140, 580);
    } else {
      p.vx += pump * 150 * dt;
    }

    p.vy += this.level.gravity * dt;
    p.vx *= Math.pow(.995, dt * 60);

    if (this.web.active && this.web.anchor) this.applyWebPhysics(dt, pump);

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.runPhase += Math.abs(p.vx) * dt * .036;
    p.angle += p.spin * dt;
    p.spin *= Math.pow(.91, dt * 60);

    this.resolveBuildings(wasGrounded);
    this.updateHazards(dt);
    this.updateNearMisses();

    const speed = Math.hypot(p.vx, p.vy);
    if (!p.onGround && speed > 520 && Math.random() < dt * 18) this.emitSpeedParticle();

    const drain = p.onGround ? 14 : 5.2;
    this.stats.comboEnergy = Math.max(0, this.stats.comboEnergy - drain * dt);
    this.stats.combo = Math.min(5, 1 + Math.floor(this.stats.comboEnergy / 22));
    this.stats.distance = Math.max(this.stats.distance, Math.max(0, Math.floor((p.x - 120) / 8)));
    this.stats.score += Math.max(0, p.vx) * dt * .13 * this.stats.combo;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.stats.combo);

    p.trail.unshift({ x: p.x, y: p.y, a: 1 });
    if (p.trail.length > 18) p.trail.length = 18;
    p.trail.forEach(t => t.a *= .88);

    this.updateParticles(dt);
    this.updateCamera(dt);

    if (p.y > this.level.ground + 360 || p.x < this.camera.x - 180) this.die('MISSED THE LINE');
    if (p.x >= this.level.length) this.completeLevel();

    this.ui.onStats?.(this.stats, this.level);
  }

  applyWebPhysics(dt, pump) {
    const p = this.player;
    const a = this.web.anchor;
    let dx = p.x - a.x;
    let dy = p.y - a.y;
    let d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;

    if (d > this.web.length) {
      const over = d - this.web.length;
      const radialV = p.vx * nx + p.vy * ny;
      const stiffness = 36;
      p.vx -= nx * (over * stiffness + Math.max(0, radialV) * 3.8) * dt;
      p.vy -= ny * (over * stiffness + Math.max(0, radialV) * 3.8) * dt;
      this.web.tension = clamp(over / 50 + Math.max(0, radialV) / 700, 0, 1);

      const correction = Math.min(over, 16);
      p.x -= nx * correction;
      p.y -= ny * correction;

      const tx = -ny;
      const ty = nx;
      const tangential = pump * 280 * dt;
      p.vx += tx * tangential;
      p.vy += ty * tangential;

      if (Math.abs(pump) > 0 && dy > 0) p.vx += pump * 55 * dt;
    } else {
      this.web.tension *= .85;
    }

    if (d < 115) this.web.length = Math.max(100, this.web.length - 22 * dt);
  }

  resolveBuildings(wasGrounded) {
    const p = this.player;
    const r = p.radius;
    let landed = null;

    for (const b of this.level.buildings) {
      if (p.x + r < b.x || p.x - r > b.x + b.w) continue;
      const crossedTop = p.prevY + r <= b.y + 8 && p.y + r >= b.y && p.vy >= 0;
      const stoodOnTop = wasGrounded && p.prevY + r <= b.y + 5 && p.y + r >= b.y - 5;
      if (crossedTop || stoodOnTop) {
        landed = b;
        break;
      }

      const insideVertical = p.y + r > b.y + 12 && p.y - r < this.level.ground;
      if (insideVertical && p.x > b.x - r && p.x < b.x + b.w + r) {
        if (p.prevX + r <= b.x + 4) {
          p.x = b.x - r - 1;
          p.vx *= -.14;
          p.vy *= .78;
          this.camera.shake = Math.max(this.camera.shake, 5);
          this.stats.comboEnergy *= .55;
          this.toast('WALL CHECK');
        }
      }
    }

    if (landed) {
      const landingSpeed = p.vy;
      p.y = landed.y - r;
      p.vy = 0;
      p.onGround = true;
      p.groundedBuilding = landed;
      p.angle *= .72;
      if (landingSpeed > 470) {
        this.camera.shake = Math.max(this.camera.shake, 7);
        this.emitBurst(p.x, p.y + r, 10, '#d8efff', 110);
      }
    }
  }

  updateHazards(dt) {
    const p = this.player;
    for (let i = 0; i < this.level.hazards.length; i++) {
      const h = this.level.hazards[i];
      if (h.type === 'drone') {
        h.x = h.baseX + Math.sin(this.time * 1.5 + i) * (h.drift || 50);
        h.y = h.baseY + Math.cos(this.time * 2.05 + i * .7) * 28;
        if (Math.hypot(p.x - h.x, p.y - h.y) < p.radius + h.radius * .72 && p.invuln <= 0) {
          this.die('DRONE IMPACT');
          return;
        }
      } else if (h.type === 'crane') {
        const angle = Math.sin(this.time * Math.abs(h.speed || .5)) * .22 + (h.speed < 0 ? Math.PI : 0);
        h.tipX = h.x + Math.cos(angle) * h.length;
        h.tipY = h.y + Math.sin(angle) * h.length;
        if (this.pointSegmentDistance(p.x, p.y, h.x, h.y, h.tipX, h.tipY) < p.radius + 8 && p.invuln <= 0) {
          this.die('CRANE COLLISION');
          return;
        }
      } else {
        const rx = h.x;
        const ry = h.y;
        const rw = h.w;
        const rh = h.h;
        if (p.x + p.radius > rx && p.x - p.radius < rx + rw && p.y + p.radius > ry && p.y - p.radius < ry + rh && p.invuln <= 0) {
          this.die('OBSTACLE HIT');
          return;
        }
      }
    }
  }

  pointSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  }

  updateNearMisses() {
    const p = this.player;
    this.level.hazards.forEach((h, i) => {
      const key = `${this.level.id}:${i}`;
      if (this.nearMisses.has(key)) return;
      let d = 9999;
      if (h.type === 'drone') d = Math.hypot(p.x - h.x, p.y - h.y) - h.radius;
      else if (h.type === 'crane' && h.tipX != null) d = this.pointSegmentDistance(p.x, p.y, h.x, h.y, h.tipX, h.tipY);
      else d = Math.hypot(p.x - (h.x + h.w / 2), p.y - (h.y + h.h / 2));
      if (d < 72 && d > p.radius + 12 && p.vx > 260) {
        this.nearMisses.add(key);
        this.addFlow(34, 560, 'NEAR MISS');
        this.audio.nearMiss();
        this.camera.shake = Math.max(this.camera.shake, 3);
      }
    });
  }

  die(reason) {
    if (this.dead || this.completed) return;
    this.dead = true;
    this.web.active = false;
    this.audio.hit();
    this.camera.shake = 16;
    this.stats.combo = 1;
    this.stats.comboEnergy = 0;
    this.emitBurst(this.player.x, this.player.y, 28, this.level.palette.accent, 260);
    this.toast(reason);
    this.respawnTimer = .9;
  }

  respawn() {
    const p = this.player;
    const safeBuildings = this.level.buildings.filter(b => b.x < p.x - 70 && b.x + b.w > p.x - 820);
    const b = safeBuildings.at(-1) || this.level.buildings[0];
    p.x = Math.max(120, b.x + Math.min(b.w * .35, 100));
    p.y = b.y - p.radius - 2;
    p.vx = 255;
    p.vy = 0;
    p.angle = 0;
    p.spin = 0;
    p.onGround = true;
    p.invuln = 1.1;
    p.trail.length = 0;
    this.dead = false;
    this.camera.x = p.x - this.width * .28;
    this.camera.y = clamp(p.y - this.height * .55, -40, 270);
    this.stats.score = Math.max(0, this.stats.score - 700);
    this.toast('BACK IN THE FLOW');
  }

  completeLevel() {
    if (this.completed) return;
    this.completed = true;
    this.web.active = false;
    this.audio.complete();
    this.stats.score = Math.round(this.stats.score + 2000 * this.stats.combo);
    const thresholds = this.level.targetScore;
    const stars = this.stats.score >= thresholds[2] ? 3 : this.stats.score >= thresholds[1] ? 2 : 1;
    setTimeout(() => this.ui.onComplete?.({
      levelIndex: this.levelIndex,
      score: Math.round(this.stats.score),
      bestCombo: this.stats.bestCombo,
      time: this.levelTime,
      stars,
      hasNext: this.levelIndex < 4
    }), 500);
  }

  updateCamera(dt) {
    const p = this.player;
    const speed = Math.hypot(p.vx, p.vy);
    const lookAhead = clamp(p.vx * .38, 80, 250);
    const targetX = p.x - this.width * .31 + lookAhead;
    const targetY = clamp(p.y - this.height * .56 + clamp(p.vy * .11, -80, 120), -80, 310);
    const ease = 1 - Math.pow(.0008, dt);
    this.camera.x = lerp(this.camera.x, targetX, ease);
    this.camera.y = lerp(this.camera.y, targetY, ease * .75);
    this.camera.zoom = lerp(this.camera.zoom, clamp(1.04 - Math.max(0, speed - 350) / 4500, .92, 1.03), ease * .45);
    this.camera.shake *= Math.pow(.07, dt);
  }

  emitBurst(x, y, count, color, force = 120) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const speed = Math.random() * force;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: .35 + Math.random() * .45,
        maxLife: .8,
        size: 1 + Math.random() * 3,
        color
      });
    }
  }

  emitSpeedParticle() {
    const p = this.player;
    this.particles.push({
      x: p.x - 30 - Math.random() * 80,
      y: p.y + (Math.random() - .5) * 80,
      vx: -120 - Math.random() * 180,
      vy: (Math.random() - .5) * 35,
      life: .18 + Math.random() * .2,
      maxLife: .4,
      size: .8 + Math.random() * 1.6,
      color: this.level.palette.accent,
      streak: true
    });
  }

  updateParticles(dt) {
    for (const q of this.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += (q.streak ? 0 : 150) * dt;
      q.life -= dt;
    }
    this.particles = this.particles.filter(q => q.life > 0);
  }

  loop(now) {
    const dt = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawSky(ctx);

    const shake = this.camera.shake;
    const sx = shake ? (Math.random() - .5) * shake : 0;
    const sy = shake ? (Math.random() - .5) * shake : 0;
    ctx.save();
    ctx.translate(this.width / 2 + sx, this.height / 2 + sy);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.width / 2 - this.camera.x, -this.height / 2 - this.camera.y);

    this.drawParallax(ctx);
    this.drawWorld(ctx);
    ctx.restore();
    this.drawScreenEffects(ctx);
  }

  drawSky(ctx) {
    const pal = this.level.palette;
    const g = ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, pal.top);
    g.addColorStop(1, pal.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);

    const moonX = this.width * .76 - (this.camera.x * .015 % 80);
    const moonY = this.height * .18 - this.camera.y * .025;
    const rg = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, 130);
    rg.addColorStop(0, `${pal.moon}33`);
    rg.addColorStop(.16, `${pal.moon}16`);
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.fillRect(moonX - 140, moonY - 140, 280, 280);
    ctx.fillStyle = `${pal.moon}d8`;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 20, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    for (const s of this.backgroundSeeds) {
      const x = ((s.x - this.camera.x * .035) % (this.width + 200) + this.width + 200) % (this.width + 200) - 100;
      const y = s.y - this.camera.y * .02;
      ctx.globalAlpha = s.a * (0.7 + Math.sin(this.time * 1.4 + s.x) * .25);
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.level.rain) {
      ctx.strokeStyle = 'rgba(190,235,255,.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 80; i++) {
        const x = ((i * 109 + this.time * 240) % (this.width + 220)) - 100;
        const y = ((i * 67 + this.time * 760) % (this.height + 160)) - 80;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 12, y + 28);
        ctx.stroke();
      }
    }
  }

  drawParallax(ctx) {
    const pal = this.level.palette;
    const layers = [
      { factor: .18, y: 560, alpha: .18, minH: 90, maxH: 240 },
      { factor: .36, y: 650, alpha: .28, minH: 120, maxH: 330 }
    ];
    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l];
      ctx.fillStyle = `${pal.haze}${l === 0 ? '25' : '32'}`;
      for (let i = 0; i < 32; i++) {
        const rawX = i * 265 + (i % 3) * 51;
        const x = rawX + this.camera.x * (1 - layer.factor) - 900;
        const h = layer.minH + ((i * 89) % (layer.maxH - layer.minH));
        ctx.globalAlpha = layer.alpha;
        ctx.fillRect(x, layer.y - h, 180 + (i % 4) * 35, h + 260);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawWorld(ctx) {
    this.drawFinishMarker(ctx);
    this.drawBuildings(ctx);
    this.drawHazards(ctx);
    this.drawAnchors(ctx);
    this.drawParticles(ctx);
    this.drawWeb(ctx);
    this.drawPlayerTrail(ctx);
    this.drawPlayer(ctx);
  }

  drawBuildings(ctx) {
    const pal = this.level.palette;
    for (let bi = 0; bi < this.level.buildings.length; bi++) {
      const b = this.level.buildings[bi];
      if (b.x + b.w < this.camera.x - 300 || b.x > this.camera.x + this.width / this.camera.zoom + 400) continue;
      const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, this.level.ground);
      grad.addColorStop(0, bi % 2 ? '#101a29' : '#0d1725');
      grad.addColorStop(1, '#050a12');
      ctx.fillStyle = grad;
      ctx.fillRect(b.x, b.y, b.w, this.level.ground - b.y + 420);

      ctx.fillStyle = `${pal.accent}18`;
      ctx.fillRect(b.x, b.y, b.w, 2);

      const cols = Math.max(2, Math.floor(b.w / 50));
      const rows = Math.max(3, Math.floor((this.level.ground - b.y) / 58));
      const cellW = b.w / (cols + 1);
      const cellH = (this.level.ground - b.y) / (rows + 1);
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const hash = (bi * 71 + r * 29 + c * 43) % 11;
          if (hash < 5) continue;
          const wx = b.x + c * cellW - 6;
          const wy = b.y + r * cellH - 5;
          ctx.fillStyle = hash > 8 ? `${pal.accent}7a` : 'rgba(255,221,160,.34)';
          ctx.fillRect(wx, wy, 11, 9);
        }
      }

      if (b.variant === 2 && b.w > 220) {
        ctx.strokeStyle = 'rgba(255,255,255,.10)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(b.x + 28, b.y);
        ctx.lineTo(b.x + 28, b.y - 36);
        ctx.lineTo(b.x + 88, b.y - 36);
        ctx.lineTo(b.x + 88, b.y);
        ctx.stroke();
      }
    }
  }

  drawFinishMarker(ctx) {
    const x = this.level.length;
    ctx.save();
    ctx.translate(x, 380);
    const pulse = 1 + Math.sin(this.time * 3) * .08;
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = `${this.level.palette.accent}50`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `${this.level.palette.accent}bb`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = this.level.palette.accent;
    ctx.font = '800 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', 0, 4);
    ctx.restore();
  }

  drawAnchors(ctx) {
    if (!this.running || this.dead) return;
    const p = this.player;
    for (const a of this.level.anchors) {
      const d = dist(p, a);
      if (d > 720 || a.x < this.camera.x - 80 || a.x > this.camera.x + this.width + 500) continue;
      const eligible = d < 690 && a.y < p.y + 150;
      const alpha = eligible ? .54 : .13;
      ctx.fillStyle = `${this.level.palette.accent}${eligible ? '8f' : '28'}`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, eligible ? 3 : 2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${alpha * .32})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 8 + Math.sin(this.time * 4 + a.x) * 2, 0, TAU);
      ctx.stroke();
    }
  }

  drawWeb(ctx) {
    if (!this.web.active || !this.web.anchor) return;
    const p = this.player;
    const a = this.web.anchor;
    const mx = (p.x + a.x) / 2 + (p.vy * .018);
    const my = (p.y + a.y) / 2 + 6;
    ctx.save();
    ctx.shadowColor = '#d9f8ff';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(238,252,255,.83)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 6);
    ctx.quadraticCurveTo(mx, my, a.x, a.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(103,232,249,.22)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 6);
    ctx.quadraticCurveTo(mx, my, a.x, a.y);
    ctx.stroke();
    ctx.restore();
  }

  drawHazards(ctx) {
    for (const h of this.level.hazards) {
      if (h.type === 'drone') this.drawDrone(ctx, h);
      else if (h.type === 'crane') this.drawCrane(ctx, h);
      else this.drawRectHazard(ctx, h);
    }
  }

  drawDrone(ctx, h) {
    ctx.save();
    ctx.translate(h.x, h.y);
    const bob = Math.sin(this.time * 8 + h.x) * 2;
    ctx.translate(0, bob);
    ctx.shadowColor = '#ff4d8f';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff4d8f';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(214,229,255,.62)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.moveTo(-11, -5);
    ctx.lineTo(-20, -12);
    ctx.moveTo(11, -5);
    ctx.lineTo(20, -12);
    ctx.stroke();
    ctx.fillStyle = '#111a29';
    ctx.beginPath();
    ctx.roundRect(-13, -8, 26, 16, 6);
    ctx.fill();
    ctx.strokeStyle = '#ff4d8f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = .4;
    ctx.strokeStyle = '#dff5ff';
    ctx.beginPath();
    ctx.ellipse(-20, -12, 12, 3, 0, 0, TAU);
    ctx.ellipse(20, -12, 12, 3, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawCrane(ctx, h) {
    if (h.tipX == null) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,193,105,.72)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(h.x, this.level.ground);
    ctx.lineTo(h.x, h.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,211,144,.78)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(h.tipX, h.tipY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(10,13,19,.48)';
    ctx.lineWidth = 1;
    const dx = h.tipX - h.x;
    const dy = h.tipY - h.y;
    const len = Math.hypot(dx,dy);
    const nx = dx/len;
    const ny = dy/len;
    for (let s = 30; s < len; s += 34) {
      const px = h.x + nx*s;
      const py = h.y + ny*s;
      ctx.beginPath();
      ctx.moveTo(px - ny*8, py + nx*8);
      ctx.lineTo(px + ny*8, py - nx*8);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawRectHazard(ctx, h) {
    ctx.save();
    const color = h.type === 'billboard' ? '#9a72ff' : '#ff4d8f';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = `${color}28`;
    ctx.strokeStyle = `${color}c0`;
    ctx.lineWidth = 2;
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.strokeRect(h.x, h.y, h.w, h.h);
    ctx.shadowBlur = 0;
    if (h.type === 'billboard') {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = '900 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('KEEP MOVING', h.x + h.w/2, h.y + h.h/2 + 4);
    }
    ctx.restore();
  }

  drawPlayerTrail(ctx) {
    const speed = Math.hypot(this.player.vx, this.player.vy);
    if (speed < 400) return;
    const pal = this.level.palette;
    for (let i = this.player.trail.length - 1; i >= 2; i -= 2) {
      const t = this.player.trail[i];
      ctx.globalAlpha = t.a * .07;
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(2, 11 - i * .35), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawPlayer(ctx) {
    const p = this.player;
    if (this.dead && Math.floor(this.respawnTimer * 14) % 2 === 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    const velocityAngle = Math.atan2(p.vy, Math.max(80, p.vx));
    const poseAngle = p.onGround ? 0 : clamp(velocityAngle * .38, -.42, .55);
    ctx.rotate(p.angle + poseAngle);
    const speed = Math.hypot(p.vx, p.vy);
    const stretch = clamp((speed - 300) / 1200, 0, .23);
    ctx.scale(1 + stretch, 1 - stretch * .45);

    if (p.invuln > 0) ctx.globalAlpha = .55 + Math.sin(this.time * 30) * .35;
    ctx.shadowColor = this.level.palette.accent;
    ctx.shadowBlur = 16;

    ctx.fillStyle = '#e8f6ff';
    ctx.beginPath();
    ctx.arc(0, -17, 8.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a1524';
    ctx.beginPath();
    ctx.ellipse(-3, -18, 1.7, 3.4, -.35, 0, TAU);
    ctx.ellipse(3, -18, 1.7, 3.4, .35, 0, TAU);
    ctx.fill();

    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#e9f7ff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(0, 9);
    ctx.stroke();

    const run = p.onGround ? Math.sin(p.runPhase) : 0;
    const swing = this.web.active ? clamp((this.web.anchor.x - p.x) / 250, -1, 1) : 0;
    const armA = p.onGround ? run * .8 : -1.0 - swing * .25;
    const armB = p.onGround ? -run * .8 : .75 + swing * .25;
    const legA = p.onGround ? run * .92 : .72;
    const legB = p.onGround ? -run * .92 : -.5;

    this.drawLimb(ctx, 0, -6, armA, 14, 14);
    this.drawLimb(ctx, 0, -5, armB + Math.PI, 14, 14);
    this.drawLimb(ctx, 0, 8, legA + .45, 15, 16);
    this.drawLimb(ctx, 0, 8, legB + Math.PI - .45, 15, 16);

    ctx.fillStyle = this.level.palette.accent;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, -1, 2.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawLimb(ctx, x, y, angle, upper, lower) {
    const ex = x + Math.cos(angle) * upper;
    const ey = y + Math.sin(angle) * upper;
    const bend = angle + (Math.sin(this.time * 6 + angle) * .14) + .2;
    const hx = ex + Math.cos(bend) * lower;
    const hy = ey + Math.sin(bend) * lower;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }

  drawParticles(ctx) {
    for (const q of this.particles) {
      const a = clamp(q.life / q.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = q.color;
      if (q.streak) ctx.fillRect(q.x, q.y, 18, q.size);
      else {
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawScreenEffects(ctx) {
    if (!this.running) return;
    const speed = Math.hypot(this.player.vx, this.player.vy);
    const intensity = clamp((speed - 500) / 650, 0, 1);
    if (intensity > .02) {
      ctx.save();
      ctx.globalAlpha = intensity * .18;
      ctx.strokeStyle = this.level.palette.accent;
      ctx.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        const y = ((i * 61 + this.time * 220) % this.height);
        const x = ((i * 137) % this.width);
        const len = 24 + (i % 5) * 17 + intensity * 80;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - len, y + 3);
        ctx.stroke();
      }
      ctx.restore();
    }

    const vignette = ctx.createRadialGradient(this.width/2, this.height/2, this.height*.22, this.width/2, this.height/2, this.height*.78);
    vignette.addColorStop(.55, 'transparent');
    vignette.addColorStop(1, 'rgba(0,0,0,.38)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0,0,this.width,this.height);
  }
}
