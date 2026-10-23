import { initDB, saveGame, loadGame, clearSave, addScore, getTopScores, saveSetting, loadSetting } from './db.js';
import { LEVEL_IDS, loadLevel, getNextLevelId, getLevelIndex } from './levels.js';
import { findPlayerStart, getSpawns, isExit } from './map.js';
import { Player } from './player.js';
import { createEnemies, createPickups } from './enemies.js';
import { Input } from './input.js';
import { Engine } from './engine.js';
import { SFX, setSoundEnabled, isSoundEnabled } from './audio.js';

let state = 'menu';
let currentLevelId = 'e1m1';
let player = null;
let enemies = [];
let pickups = [];
let map = null;
let engine = null;
let input = null;
let lastTime = 0;
let animId = null;
let showMinimap = true;

const menu = document.getElementById('menu');
const scoresScreen = document.getElementById('scores-screen');
const settingsScreen = document.getElementById('settings-screen');
const hud = document.getElementById('hud');
const touchControls = document.getElementById('touch-controls');
const overlay = document.getElementById('overlay');
const pauseScreen = document.getElementById('pause-screen');
const canvas = document.getElementById('gameCanvas');
const minimapCanvas = document.getElementById('minimap');

async function init() {
  await initDB();
  engine = new Engine(canvas);
  input = new Input();

  input.mouseSens = await loadSetting('mouseSens', 1.5);
  input.touchSens = await loadSetting('touchSens', 1.2);
  showMinimap = await loadSetting('minimap', true);
  setSoundEnabled(await loadSetting('sound', true));

  document.getElementById('mouse-sens').value = input.mouseSens;
  document.getElementById('touch-sens').value = input.touchSens;
  document.getElementById('sound-toggle').checked = isSoundEnabled();
  document.getElementById('minimap-toggle').checked = showMinimap;

  const save = await loadGame();
  document.getElementById('btn-continue').disabled = !save;

  bindUI();
  showScreen('menu');
}

function bindUI() {
  document.getElementById('btn-newgame').onclick = () => startNewGame();
  document.getElementById('btn-continue').onclick = () => continueGame();
  document.getElementById('btn-scores').onclick = () => showScores();
  document.getElementById('btn-settings').onclick = () => showScreen('settings');
  document.getElementById('btn-scores-back').onclick = () => showScreen('menu');
  document.getElementById('btn-settings-back').onclick = async () => {
    input.mouseSens = parseFloat(document.getElementById('mouse-sens').value);
    input.touchSens = parseFloat(document.getElementById('touch-sens').value);
    const sound = document.getElementById('sound-toggle').checked;
    showMinimap = document.getElementById('minimap-toggle').checked;
    setSoundEnabled(sound);
    await saveSetting('mouseSens', input.mouseSens);
    await saveSetting('touchSens', input.touchSens);
    await saveSetting('sound', sound);
    await saveSetting('minimap', showMinimap);
    minimapCanvas.classList.toggle('hidden', !showMinimap);
    showScreen('menu');
  };
  document.getElementById('btn-overlay').onclick = () => { showScreen('menu'); stopLoop(); };
  document.getElementById('btn-resume').onclick = () => {
    state = 'playing';
    pauseScreen.classList.add('hidden');
    if (!input.isMobile) document.body.requestPointerLock?.();
  };
  document.getElementById('btn-save-quit').onclick = async () => {
    await doSave();
    showScreen('menu');
    stopLoop();
    document.getElementById('btn-continue').disabled = false;
  };

  // Use door button
  const useBtn = document.getElementById('btn-use');
  if (useBtn) {
    useBtn.addEventListener('touchstart', e => { e.preventDefault(); tryUse(); }, { passive: false });
  }
}

function showScreen(name) {
  [menu, scoresScreen, settingsScreen, overlay, pauseScreen].forEach(el => el.classList.add('hidden'));
  hud.classList.add('hidden');
  touchControls.classList.add('hidden');
  if (name === 'menu') menu.classList.remove('hidden');
  if (name === 'scores') scoresScreen.classList.remove('hidden');
  if (name === 'settings') settingsScreen.classList.remove('hidden');
  if (name === 'overlay') overlay.classList.remove('hidden');
  if (name === 'pause') pauseScreen.classList.remove('hidden');
  if (name === 'playing') {
    hud.classList.remove('hidden');
    if (input.isMobile) touchControls.classList.remove('hidden');
    minimapCanvas.classList.toggle('hidden', !showMinimap);
  }
}

async function showScores() {
  const scores = await getTopScores(10);
  const list = document.getElementById('scores-list');
  list.innerHTML = scores.length
    ? scores.map((s, i) => `<li>${i + 1}. ${s.score} (ур. ${s.level}) — ${new Date(s.date).toLocaleDateString()}</li>`).join('')
    : '<li>Пока нет рекордов</li>';
  showScreen('scores');
}

async function startNewGame() {
  currentLevelId = LEVEL_IDS[0];
  await loadCurrentLevel();
  state = 'playing';
  showScreen('playing');
  if (!input.isMobile) document.body.requestPointerLock?.();
  startLoop();
}

async function continueGame() {
  const save = await loadGame();
  if (!save) return;
  currentLevelId = save.levelId || LEVEL_IDS[0];
  await loadCurrentLevel(save.player);
  state = 'playing';
  showScreen('playing');
  if (!input.isMobile) document.body.requestPointerLock?.();
  startLoop();
}

async function loadCurrentLevel(playerState = null) {
  map = await loadLevel(currentLevelId);
  // Clone data so doors can be opened without mutating cached JSON permanently in a bad way
  map = { ...map, data: [...map.data] };
  const start = findPlayerStart(map);
  player = new Player(start.x, start.y);
  if (playerState) player.loadState(playerState);
  const spawns = getSpawns(map);
  enemies = createEnemies(spawns.enemies);
  pickups = createPickups(spawns.pickups);
  updateHUD();
}

function startLoop() {
  lastTime = performance.now();
  if (animId) cancelAnimationFrame(animId);
  loop(lastTime);
}

function stopLoop() {
  if (animId) cancelAnimationFrame(animId);
  animId = null;
}

function tryUse() {
  if (player && player.tryOpenDoor(map)) SFX.door();
}

function loop(time) {
  animId = requestAnimationFrame(loop);
  if (state !== 'playing') return;

  const rot = input.getRotation();
  if (rot) player.rotate(-rot);

  const { forward, strafe } = input.getMovement();
  player.tryMove(forward, strafe, map);

  if (input.keys['KeyE']) tryUse();

  if (input.isShooting()) {
    const shot = player.shoot();
    if (shot) {
      SFX[shot.sfx]?.() || SFX.shoot();
      handleShot(shot);
    }
  }

  if (input.isWeaponSwitch()) {
    player.switchWeapon();
    updateHUD();
  }

  if (input.isPause()) {
    state = 'paused';
    pauseScreen.classList.remove('hidden');
    document.exitPointerLock?.();
    input.keys['Escape'] = false;
    input.keys['KeyP'] = false;
  }

  // Enemies
  for (const e of enemies) {
    const res = e.update(player, map);
    if (res === 'hit') SFX.hurt();
  }

  // Pickups
  for (const p of pickups) {
    if (!p.alive) continue;
    const dx = p.x - player.x, dy = p.y - player.y;
    if (dx * dx + dy * dy < 0.4) {
      p.alive = false;
      if (p.type === 'health') { player.heal(25); SFX.pickup(); }
      if (p.type === 'ammo') { player.addAmmo(15, 8); SFX.pickup(); }
    }
  }

  if (player.checkExit(map)) {
    levelComplete();
    return;
  }

  if (!player.alive) {
    gameOver();
    return;
  }

  engine.render(player, map, enemies, pickups);
  if (showMinimap) drawMinimap();
  updateHUD();
}

function handleShot(shot) {
  const pellets = shot.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const spread = (Math.random() - 0.5) * (shot.spread || 0.15);
    // Approximate direction with spread
    let closest = null;
    let closestDist = shot.range;
    const ang = Math.atan2(player.dirY, player.dirX) + spread;
    const rdx = Math.cos(ang);
    const rdy = Math.sin(ang);

    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > shot.range) continue;
      const dot = (dx * rdx + dy * rdy) / dist;
      if (dot < 0.92) continue;
      if (dist < closestDist) {
        closestDist = dist;
        closest = e;
      }
    }
    if (closest) {
      const killed = closest.takeDamage(shot.damage);
      SFX.hit();
      if (killed) {
        player.score += closest.scoreValue;
        SFX.enemyDeath();
      }
    }
  }
}

function drawMinimap() {
  const ctx = minimapCanvas.getContext('2d');
  const s = 4;
  const w = map.width * s;
  const h = map.height * s;
  minimapCanvas.width = w;
  minimapCanvas.height = h;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = map.data[y * map.width + x];
      if (t === 1) ctx.fillStyle = '#666';
      else if (t === 2) ctx.fillStyle = '#a60';
      else if (t === 5) ctx.fillStyle = '#0a0';
      else continue;
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  // player
  ctx.fillStyle = '#0f0';
  ctx.beginPath();
  ctx.arc(player.x * s, player.y * s, 2, 0, Math.PI * 2);
  ctx.fill();
  // direction
  ctx.strokeStyle = '#0f0';
  ctx.beginPath();
  ctx.moveTo(player.x * s, player.y * s);
  ctx.lineTo((player.x + player.dirX * 2) * s, (player.y + player.dirY * 2) * s);
  ctx.stroke();
  // enemies
  ctx.fillStyle = '#f00';
  for (const e of enemies) {
    if (!e.alive) continue;
    ctx.fillRect(e.x * s - 1, e.y * s - 1, 3, 3);
  }
}

function updateHUD() {
  document.getElementById('hp').textContent = Math.max(0, Math.floor(player.hp));
  const w = player.weapons[player.currentWeapon];
  document.getElementById('ammo').textContent = player.ammo[w.ammoKey];
  document.getElementById('level').textContent = getLevelIndex(currentLevelId) + 1;
  document.getElementById('score').textContent = player.score;
  document.getElementById('weapon-name').textContent = w.name;
}

async function levelComplete() {
  state = 'levelcomplete';
  player.score += 500;
  SFX.level();
  const nextId = getNextLevelId(currentLevelId) || map.next;

  if (!nextId) {
    await addScore(player.score, LEVEL_IDS.length);
    await clearSave();
    document.getElementById('overlay-title').textContent = 'ПОБЕДА!';
    document.getElementById('overlay-text').textContent = `Все уровни пройдены! Очки: ${player.score}`;
    document.getElementById('btn-overlay').textContent = 'В меню';
    showScreen('overlay');
    stopLoop();
    document.exitPointerLock?.();
  } else {
    document.getElementById('overlay-title').textContent = 'УРОВЕНЬ ПРОЙДЕН';
    document.getElementById('overlay-text').textContent = `${map.name} · Очки: ${player.score}`;
    document.getElementById('btn-overlay').textContent = 'Далее';
    showScreen('overlay');
    const btn = document.getElementById('btn-overlay');
    const goNext = async () => {
      currentLevelId = nextId;
      await loadCurrentLevel(player.getState());
      state = 'playing';
      showScreen('playing');
      if (!input.isMobile) document.body.requestPointerLock?.();
      startLoop();
      btn.onclick = () => { showScreen('menu'); stopLoop(); };
    };
    btn.onclick = goNext;
    setTimeout(goNext, 1800);
  }
}

async function gameOver() {
  state = 'gameover';
  SFX.death();
  await addScore(player.score, getLevelIndex(currentLevelId) + 1);
  await clearSave();
  document.getElementById('overlay-title').textContent = 'GAME OVER';
  document.getElementById('overlay-text').textContent = `Очки: ${player.score}`;
  document.getElementById('btn-overlay').textContent = 'В меню';
  showScreen('overlay');
  stopLoop();
  document.exitPointerLock?.();
  document.getElementById('btn-continue').disabled = true;
}

async function doSave() {
  if (!player) return;
  await saveGame({ levelId: currentLevelId, player: player.getState() });
}

init().catch(console.error);
