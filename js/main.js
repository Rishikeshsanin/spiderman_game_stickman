import { ThreadRunnerGame } from './game.js';
import { LEVELS } from './levels.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const canvas = $('#game');
const screens = $$('.screen');
const hud = $('#hud');
const mobileControls = $('#mobile-controls');
let toastTimer = null;

const save = loadSave();

function loadSave() {
  try {
    return { unlocked: 1, best: {}, ...JSON.parse(localStorage.getItem('thread-runner-save') || '{}') };
  } catch { return { unlocked: 1, best: {} }; }
}

function persist() {
  localStorage.setItem('thread-runner-save', JSON.stringify(save));
}

function showScreen(id = null) {
  screens.forEach(s => s.classList.toggle('active', s.id === id));
}

function setHud(show) {
  hud.classList.toggle('hidden', !show);
  const touch = matchMedia('(pointer: coarse)').matches || innerWidth < 800;
  mobileControls.classList.toggle('hidden', !(show && touch));
  mobileControls.setAttribute('aria-hidden', show && touch ? 'false' : 'true');
}

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 900);
}

const game = new ThreadRunnerGame(canvas, {
  onHud: setHud,
  onPause: paused => showScreen(paused ? 'pause-screen' : null),
  onToast: toast,
  onComboPulse: () => {
    const card = $('#combo-card');
    card.classList.add('hot');
    setTimeout(() => card.classList.remove('hot'), 170);
  },
  onStats: (stats, level) => {
    $('#hud-level').textContent = String(level.id).padStart(2, '0');
    $('#hud-distance').textContent = `${stats.distance} m`;
    $('#hud-score').textContent = String(Math.round(stats.score)).padStart(6, '0');
    $('#hud-combo').textContent = `x${stats.combo}`;
    $('#combo-fill').style.width = `${stats.comboEnergy}%`;
    $('#combo-label').textContent = stats.combo >= 4 ? 'OVERDRIVE' : stats.combo >= 2 ? 'FLOW COMBO' : 'FLOW';
  },
  onComplete: result => {
    const levelId = result.levelIndex + 1;
    save.best[levelId] = Math.max(save.best[levelId] || 0, result.score);
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelId + 1));
    persist();
    $('#result-score').textContent = result.score.toLocaleString();
    $('#result-combo').textContent = `x${result.bestCombo}`;
    $('#result-time').textContent = `${result.time.toFixed(1)}s`;
    $('#result-title').textContent = result.stars === 3 ? 'SKYLINE OWNED' : result.stars === 2 ? 'CLEAN RUN' : 'LEVEL CLEARED';
    const stars = $('#star-row');
    stars.textContent = '★ '.repeat(result.stars) + '☆ '.repeat(3 - result.stars);
    stars.className = `star-row ${['','one','two','three'][result.stars]}`;
    $('#next-btn').style.display = result.hasNext ? '' : 'none';
    $('#next-btn').dataset.next = String(result.levelIndex + 1);
    renderLevelList();
    setHud(false);
    showScreen('result-screen');
  }
});

function renderLevelList() {
  const list = $('#level-list');
  list.innerHTML = '';
  LEVELS.forEach((level, index) => {
    const locked = level.id > save.unlocked;
    const card = document.createElement('article');
    card.className = `level-card${locked ? ' locked' : ''}`;
    card.innerHTML = `
      <span class="level-number">${String(level.id).padStart(2,'0')}</span>
      <span class="eyebrow">${locked ? 'LOCKED' : (save.best[level.id] ? `BEST ${save.best[level.id].toLocaleString()}` : 'READY')}</span>
      <h3>${level.name}</h3>
      <p>${level.subtitle}</p>
      <div class="difficulty">${Array.from({length:5},(_,i)=>`<i class="${i < level.difficulty ? 'on' : ''}"></i>`).join('')}</div>`;
    if (!locked) card.addEventListener('click', () => startLevel(index));
    list.appendChild(card);
  });
}

function startLevel(index) {
  showScreen(null);
  game.start(index);
}

$('#play-btn').addEventListener('click', () => startLevel(0));
$('#level-select-btn').addEventListener('click', () => { renderLevelList(); showScreen('level-select'); });
$$('.close-screen').forEach(btn => btn.addEventListener('click', () => showScreen('menu')));
$('#pause-btn').addEventListener('click', () => game.setPaused(true));
$('#resume-btn').addEventListener('click', () => game.setPaused(false));
$('#restart-btn').addEventListener('click', () => { showScreen(null); game.restart(); });
$('#quit-btn').addEventListener('click', () => { game.stop(); showScreen('menu'); });
$('#retry-btn').addEventListener('click', () => { showScreen(null); game.restart(); });
$('#result-menu-btn').addEventListener('click', () => { game.stop(); showScreen('menu'); });
$('#next-btn').addEventListener('click', e => startLevel(Number(e.currentTarget.dataset.next || 0)));

$$('[data-control]').forEach(btn => {
  const control = btn.dataset.control;
  const down = e => { e.preventDefault(); game.audio.resume(); game.setMobileControl(control, true); };
  const up = e => { e.preventDefault(); game.setMobileControl(control, false); };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('pointerleave', e => { if (e.buttons === 0) up(e); });
});

renderLevelList();
setHud(false);
showScreen('menu');
