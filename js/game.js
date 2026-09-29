'use strict';
// CHIMERA WING: The Epigenome War — game logic and rendering.

const C = NES.C;
const W = NES.W, H = NES.H;
const PY = 212;        // player's home row
const PY_MIN = 150;    // highest Guardian/Battloid can climb
const SIDE_GROUND = 206;   // top of the ground strip in side-scrolling missions
const TAU = Math.PI * 2;

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const angDiff = (a, b) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  return d;
};
const pad6 = n => String(Math.floor(n)).padStart(6, '0');

const FORMS = [
  { name: 'FIGHTER', short: 'FTR', speed: 2.4, free: false, hit: 3 },
  { name: 'GUARDIAN', short: 'GRD', speed: 1.8, free: true, hit: 4 },
  { name: 'BATTLOID', short: 'BTL', speed: 1.3, free: true, hit: 5 },
];

const ENEMY = {
  fighter: { name: 'MIG', hp: 1, pts: [50, 100], hit: 6 },
  bomber: { name: 'BOMBER', hp: 1, pts: [80, 160], hit: 7 },
  methyl: { name: 'METHYLATOR', hp: 2, pts: [150, 400], hit: 8 },
  sam: { name: 'SAM SITE', hp: 2, pts: [200, 200], hit: 7 },
};

// Even stages are side-scrolling missions. Odd stages are Galaga-style:
// challenging stages at 3, 7, 11... and the Nucleosome Fortress at 5, 15, 25...
function stageTypeOf(n) {
  if (n % 2 === 0) return 'side';
  if (n % 10 === 5) return 'boss';
  if (n % 4 === 3) return 'challenge';
  return 'normal';
}

// Dr. Helena Voss: rogue epigeneticist. Her science is real; her ethics are not.
// In-game radio lines. Stage briefings and the rest of the story live in story.js.
const VOSS = {
  sideBoss: 'MY HISTONE GUNSHIP. SAME CORE DESIGN, NOW WITH MORE GUNS.',
  silence: ['METHYLATED! THAT GENE STAYS OFF.', 'A LITTLE CH3 ON YOUR PROMOTER. HUSH.', 'NO TRANSCRIPTION FOR YOU!'],
  restore: ['DEMETHYLATED?! THAT MARK WAS SUPPOSED TO BE PERMANENT!', 'TET ENZYMES? HOW... DULL.'],
  locked: 'GENOME FULLY SILENCED. GOODNIGHT, PILOT.',
  bossShield: 'MY HISTONE CORE IS SHIELDED WHILE BOTH TURRETS STAND. GOOD LUCK.',
  bossPhase2: 'MY HISTONE CORE IS EXPOSED... HOW RUDE.',
  bossDown: "A SETBACK! MARKS CAN BE REWRITTEN. I'LL BE BACK!",
  finalDown: "MY TRANSMITTER! MIRA, DON'T YOU DARE...",
  gameover: 'YOUR PHENOTYPE HAS BEEN... REVISED.',
};

// ---- Flight paths -------------------------------------------------------------
// Catmull-Rom splines resampled to ~1px steps so enemies move at constant speed.
function buildPath(pts) {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const dense = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    for (let s = 0; s < 1; s += 0.02) {
      const s2 = s * s, s3 = s2 * s;
      const f = k => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * s + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * s2 +
        (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * s3);
      dense.push({ x: f(0), y: f(1) });
    }
  }
  const end = pts[pts.length - 1];
  dense.push({ x: end[0], y: end[1] });
  const out = [{ ...dense[0] }];
  let need = 1;
  for (let i = 1; i < dense.length; i++) {
    const a = dense[i - 1], b = dense[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let pos = 0;
    while (seg - pos >= need) {
      pos += need;
      const r = pos / seg;
      out.push({ x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r });
      need = 1;
    }
    need -= seg - pos;
  }
  return out;
}

const PATH_DEFS = {
  top: [[96, -16], [96, 24], [88, 64], [60, 100], [36, 132], [40, 164], [68, 180], [96, 164], [104, 132], [92, 108]],
  side: [[-16, 196], [24, 184], [72, 164], [112, 136], [124, 104], [112, 76], [84, 72], [68, 96], [80, 120], [108, 124]],
  topc: [[120, -16], [120, 32], [140, 80], [168, 120], [188, 152], [176, 184], [148, 184], [132, 156], [136, 120]],
  ch1: [[-16, 48], [56, 72], [112, 132], [160, 160], [204, 140], [212, 100], [184, 76], [152, 96], [160, 140], [216, 196], [272, 216]],
  ch2: [[120, -16], [120, 72], [96, 132], [56, 148], [36, 120], [52, 92], [92, 100], [124, 148], [128, 260]],
  ch3: [[-16, 132], [72, 128], [124, 96], [160, 60], [196, 68], [208, 100], [176, 124], [120, 112], [60, 64], [24, -24]],
};
const PATHS = {};
for (const [k, pts] of Object.entries(PATH_DEFS)) {
  PATHS[k] = buildPath(pts);
  PATHS[k + 'M'] = buildPath(pts.map(([x, y]) => [W - x, y]));   // mirrored
}

// ---- Wave layouts -------------------------------------------------------------
// Formation: row 0 = methylators, rows 1-2 = bombers, rows 3-4 = MiGs (40 planes, like Galaga).
function buildNormalWaves() {
  const S = (type, c, r, path, delay) => ({ type, slot: { c, r }, path, delay });
  const waves = [];
  let w = [];
  [3, 4, 5, 6].forEach((c, i) => { w.push(S('bomber', c, 1, 'top', i * 8)); w.push(S('fighter', c, 3, 'topM', i * 8)); });
  waves.push(w);
  w = [];
  [3, 4, 5, 6].forEach((c, i) => w.push(S('methyl', c, 0, 'side', i * 16)));
  [1, 2, 7, 8].forEach((c, i) => w.push(S('bomber', c, 1, 'side', i * 16 + 8)));
  waves.push(w);
  w = [];
  [1, 2, 3, 4, 5, 6, 7, 8].forEach((c, i) => w.push(S('bomber', c, 2, 'sideM', i * 8)));
  waves.push(w);
  w = [];
  [[0, 3], [1, 3], [2, 3], [7, 3], [8, 3], [9, 3], [4, 4], [5, 4]].forEach(([c, r], i) => w.push(S('fighter', c, r, 'topc', i * 8)));
  waves.push(w);
  w = [];
  [0, 1, 2, 3, 6, 7, 8, 9].forEach((c, i) => w.push(S('fighter', c, 4, 'topcM', i * 8)));
  waves.push(w);
  return waves.map(list => ({ list, timer: 0, wait: 0 }));
}

function buildChallengeWaves(stage) {
  const types = ['fighter', 'bomber', 'methyl'];
  const plan = [['ch1', 'ch1M'], ['ch2', 'ch2M'], ['ch3', 'ch3M'], ['ch1M', 'ch2'], ['ch3M', 'ch2M']];
  return plan.map(([a, b], wi) => {
    const type = types[(wi + stage) % 3];
    const list = [];
    for (let i = 0; i < 4; i++) {
      list.push({ type, slot: null, path: a, delay: i * 10 });
      list.push({ type, slot: null, path: b, delay: i * 10 + 5 });
    }
    return { list, timer: 0, wait: 0 };
  });
}

const HOWTO_PAGES = 5;
const MENU = ['START GAME', 'CONTROLLER SETUP', 'HOW TO PLAY'];
const SETUP_STEPS = [
  { key: 'fire', label: 'FIRE' },
  { key: 'special', label: 'SPECIAL WEAPON' },
  { key: 'transform', label: 'TRANSFORM' },
  { key: 'prevForm', label: 'PREV FORM' },
  { key: 'start', label: 'START / PAUSE' },
];

function loadHi() {
  try { return parseInt(localStorage.getItem('chimera.hi'), 10) || 20000; } catch (e) { return 20000; }
}
function saveHi(v) {
  try { localStorage.setItem('chimera.hi', String(v)); } catch (e) { /* storage unavailable */ }
}

const Game = {
  state: 'title', stateT: 0, t: 0, paused: false,
  menu: 0, howPage: 0, setup: null,
  score: 0, hi: 20000, lives: 3, stage: 0, nextExtra: 20000,
  player: null, enemies: [], pBul: [], eBul: [], parts: [], pops: [], booms: [], stars: [],
  waves: [], waveI: 0, formation: null, formationReady: false, attackCd: 0,
  stageType: 'normal', adapt: -1, nextAdapt: -1, formKills: [0, 0, 0], stageHits: 0,
  shots: 0, hitsTotal: 0, boss: null, radio: null, intro: null, toastMsg: null,
  clearDelay: 90, bossWin: false, resultBonus: 0,
  scroll: 0, side: null,                                   // side-scrolling mission state
  special: null, lastSpecial: 0, laser: null, crushT: 0,   // mission special weapon
  pickups: [], radioQ: [], hintsSeen: new Set(),           // TET capsules, queued radio, Mira's tips

  init() {
    this.hi = loadHi();
    for (let i = 0; i < 70; i++) {
      this.stars.push({ x: rand(0, W), y: rand(0, H), s: rand(0.3, 1.5),
        c: pick([C.white, C.sky, C.pink, C.yellow, C.lime, C.red, C.lgray]), ph: randi(0, 59) });
    }
    this.player = this.newPlayer();
    this.toTitle();
  },

  setState(s) { this.state = s; this.stateT = 0; },

  toTitle() {
    this.setState('title');
    this.enemies = []; this.pBul = []; this.eBul = []; this.parts = []; this.pops = []; this.booms = [];
    this.boss = null; this.radio = null; this.radioQ = []; this.pickups = []; this.paused = false;
    this.stageType = 'normal'; this.special = null; this.laser = null; this.crushT = 0;
    Sound.playSong(Sound.SONGS.title);
  },

  toast(text) { this.toastMsg = { text, t: 150 }; },

  // Radio message. who defaults to the current villain. queued = wait for the current message.
  say(text, who = this.villain(), queued = false) {
    const msg = { who, lines: NES.wrap(text, 25).slice(0, 3), t: 200 };
    if (queued && this.radio) this.radioQ.push(msg); else this.radio = msg;
  },

  newPlayer() {
    return { x: 128, y: PY, form: 0, nextForm: 0, morphT: 0, fireCd: 0, alive: true, respawnT: 0,
      invuln: 60, battCd: 0, silenced: [false, false, false], silenceT: [0, 0, 0], moving: false, shieldT: 0 };
  },

  startGame(stage = 1) {
    this.score = 0; this.lives = 3; this.nextExtra = 20000;
    this.nextAdapt = -1; this.shots = 0; this.hitsTotal = 0;
    this.hintsSeen = new Set();
    this.player = this.newPlayer();
    this.startStage(stage);
  },

  get isSide() { return this.stageType === 'side'; },

  startStage(n) {
    this.stage = n;
    this.stageType = stageTypeOf(n);
    this.enemies = []; this.eBul = []; this.pBul = [];
    this.laser = null; this.crushT = 0;
    this.special = null;   // chosen fresh in the hangar; leftover ammo never carries over
    if (this.isSide) this.initSide();
    this.waves = this.stageType === 'normal' ? buildNormalWaves()
      : this.stageType === 'challenge' ? buildChallengeWaves(n) : [];
    this.waveI = 0;
    this.formationReady = false;
    this.formation = { t: 0, ox: 0, spread: 1, bt: 0 };
    this.attackCd = 90;
    this.boss = null; this.bossWin = false;
    this.stageHits = 0;
    this.adapt = this.nextAdapt;
    this.formKills = [0, 0, 0];
    const p = this.player;
    p.silenced = [false, false, false];
    p.silenceT = [0, 0, 0];
    p.shieldT = 0;
    if (!p.alive && this.lives > 0) this.respawn();
    this.placePlayer();

    this.pickups = []; this.radioQ = [];
    const B = this.briefingFor(n);
    this.startBriefing(this.stageType === 'challenge' ? '' : 'STAGE ' + n, B.title, B.pages, () => this.openHangar());
    Sound.playSong(Sound.SONGS.stage);
  },

  beginPlay() {
    this.setState('play');
    if (this.stageType === 'boss') {
      this.boss = this.makeBoss(false);
      Sound.playSong(Sound.SONGS.boss);
    }
  },

  // Start position: bottom-center for vertical stages, left side for side-scrolling missions.
  placePlayer() {
    const p = this.player;
    if (this.isSide) { p.x = 40; p.y = 186; } else { p.x = 128; p.y = PY; }
  },

  // Converts a direction given in "vertical stage" terms (up = forward) into the current
  // stage's orientation. In side missions forward is right, so everything turns 90 degrees.
  orient(x, y) { return this.isSide ? [-y, x] : [x, y]; },

  // Epigenetic memory: if one form scored most of the kills, the next squadron resists it.
  computeAdapt() {
    const total = this.formKills[0] + this.formKills[1] + this.formKills[2];
    if (total < 12) return -1;
    let best = 0;
    for (let f = 1; f < 3; f++) if (this.formKills[f] > this.formKills[best]) best = f;
    return this.formKills[best] / total >= 0.6 ? best : -1;
  },

  addScore(n) {
    this.score += n;
    if (this.score > this.hi) this.hi = this.score;
    if (this.score >= this.nextExtra) {
      this.lives++;
      this.nextExtra = this.nextExtra === 20000 ? 70000 : this.nextExtra + 70000;
      this.popup(this.player.x, this.player.y - 20, '1UP', C.lime);
      Sound.sfx('oneup');
    }
  },

  popup(x, y, text, col = C.white) { this.pops.push({ x, y, text, col, t: 50 }); },

  // ---- Effects ---------------------------------------------------------------
  explode(x, y, n, cols) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.4, 2.4), life = randi(14, 32);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, cols, sz: Math.random() < 0.3 ? 2 : 1 });
    }
    this.parts.push({ ring: true, x, y, r: 2, life: 8, max: 8 });
  },

  spark(x, y, col, n = 4) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(0.5, 1.5);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 8, max: 8, cols: [col], sz: 1 });
    }
  },

  updateParticles() {
    for (const q of this.parts) {
      if (!q.ring) { q.x += q.vx; q.y += q.vy; q.vx *= 0.95; q.vy *= 0.95; } else q.r += 2;
      q.life--;
    }
    this.parts = this.parts.filter(q => q.life > 0);
    for (const q of this.pops) { q.t--; q.y -= 0.3; }
    this.pops = this.pops.filter(q => q.t > 0);
    for (const b of this.booms) if (--b.delay <= 0) { this.explode(b.x, b.y, b.n); Sound.sfx('explode'); }
    this.booms = this.booms.filter(b => b.delay > 0);
  },

  updateStars(speed) {
    const sideways = this.isSide && this.state !== 'title' && this.state !== 'howto' && this.state !== 'setup';
    for (const s of this.stars) {
      if (sideways) {
        s.x -= s.s * speed;
        if (s.x < 0) { s.x += W; s.y = rand(0, H); }
      } else {
        s.y += s.s * speed;
        if (s.y >= H) { s.y -= H; s.x = rand(0, W); }
      }
    }
  },

  // ---- Main update -------------------------------------------------------------
  update() {
    this.t++;
    Sound.update();
    if (this.toastMsg && --this.toastMsg.t <= 0) this.toastMsg = null;
    if (this.paused) { this.updateGameMenu(); return; }
    this.updateStars(this.state === 'intro' || this.state === 'hangar' ? 3 : 1);
    if (this.isSide && this.state !== 'title') this.scroll += 1.5;
    if (this.radio && --this.radio.t <= 0) this.radio = this.radioQ.shift() || null;
    switch (this.state) {
      case 'title': this.updateTitle(); break;
      case 'howto': this.updateHowto(); break;
      case 'setup': this.updateSetup(); break;
      case 'intro': this.updateIntro(); break;
      case 'hangar': this.updateHangar(); break;
      case 'play': this.updatePlay(); break;
      case 'clear': this.updateClear(); break;
      case 'result': this.updateResult(); break;
      case 'gameover': this.updateGameOver(); break;
    }
    this.updateParticles();
  },

  // ---- In-game menu (Start) ---------------------------------------------------------
  // Works with just a d-pad + A/B + Start: up/down to choose, A to pick, B or Start to resume.
  openGameMenu() {
    this.paused = true;
    this.gameMenuSel = 0;
    Sound.sfx('select');
  },

  gameMenuItems() {
    return ['RESUME', 'SOUND: ' + (Sound.muted ? 'OFF' : 'ON'), 'QUIT TO TITLE'];
  },

  updateGameMenu() {
    const n = this.gameMenuItems().length;
    if (Input.just('up')) { this.gameMenuSel = (this.gameMenuSel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { this.gameMenuSel = (this.gameMenuSel + 1) % n; Sound.sfx('move'); }
    if (Input.just('start') || Input.just('back') || Input.just('special')) { this.paused = false; Sound.sfx('select'); return; }
    if (!Input.just('fire')) return;
    Sound.sfx('select');
    if (this.gameMenuSel === 0) this.paused = false;
    else if (this.gameMenuSel === 1) Sound.toggleMute();
    else { saveHi(this.hi); this.toTitle(); }
  },

  updateTitle() {
    this.stateT++;
    const anyPress = Input.just('fire') || Input.just('start') || Input.just('transform');
    if (anyPress) Sound.unlock();
    if (Input.just('up')) { this.menu = (this.menu + MENU.length - 1) % MENU.length; Sound.sfx('move'); }
    if (Input.just('down')) { this.menu = (this.menu + 1) % MENU.length; Sound.sfx('move'); }
    if (this.stateT > 20 && (Input.just('fire') || Input.just('start'))) {
      Sound.sfx('select');
      if (this.menu === 0) { Sound.stopSong(); this.startGame(1); }
      else if (this.menu === 1) this.openSetup();
      else { this.howPage = 0; this.setState('howto'); }
    }
  },

  updateHowto() {
    this.stateT++;
    if (Input.just('back')) { this.setState('title'); return; }
    if (this.stateT > 10 && (Input.just('fire') || Input.just('start') || Input.just('right'))) {
      Sound.sfx('move');
      this.stateT = 0;
      if (++this.howPage >= HOWTO_PAGES) this.setState('title');
    }
    if (Input.just('left') && this.howPage > 0) { this.howPage--; Sound.sfx('move'); }
  },

  openSetup() {
    this.setState('setup');
    this.setup = { step: 0, map: {}, held: new Set(Input.rawButtons()), msg: null, done: 0 };
  },

  updateSetup() {
    const S = this.setup;
    if (S.done > 0) { if (--S.done === 0) this.setState('title'); return; }
    if (Input.keyJust('Escape')) { this.setState('title'); return; }
    const pad = Input.pads()[0];
    if (!pad) return;
    if (Input.keyJust('KeyR')) {
      Input.resetMapping(pad.id);
      S.msg = 'DEFAULTS RESTORED'; S.done = 90; Sound.sfx('select');
      return;
    }
    const raw = Input.rawButtons();
    const fresh = raw.filter(b => !S.held.has(b));
    S.held = new Set(raw);
    if (!fresh.length) return;
    const b = fresh[0];
    if (Object.values(S.map).some(list => list.includes(b))) { Sound.sfx('denied'); return; }
    S.map[SETUP_STEPS[S.step].key] = [b];
    Sound.sfx('select');
    if (++S.step >= SETUP_STEPS.length) {
      Input.saveMapping(pad.id, S.map);
      S.msg = 'SAVED!'; S.done = 90;
    }
  },

  updateIntro() {
    this.stateT++;
    const I = this.intro;
    I.t++;
    const shown = Math.floor(I.t / 1.5);
    if (!I.full && shown < I.total && I.t % 3 === 0) Sound.sfx('blip');
    if (shown >= I.total) I.full = true;
    this.updatePlayer(false);
    this.updateBullets();
    // The briefing waits for fire (Space / pad A). A press finishes the typing, the next one
    // turns the page, and after the last page it moves on. Start skips the rest of the briefing.
    if (this.stateT <= 20) return;
    if (Input.just('start')) { I.done(); return; }
    if (Input.just('fire')) {
      if (!I.full) { I.full = true; I.t = I.total * 1.5; }
      else if (I.page < I.pages.length - 1) { this.showPage(I.page + 1); Sound.sfx('move'); }
      else I.done();
    }
  },

  updatePlay() {
    if (Input.just('start') || Input.just('back')) { this.openGameMenu(); return; }
    this.stateT++;
    this.updateFormation();
    this.updateSpawns();
    if (this.isSide) this.updateSide();
    this.updatePlayer(true);
    this.updateEnemies();
    if (this.boss) this.updateBoss();
    this.updateBullets();
    this.updateSpecial();
    this.collide();
    this.updatePickups();
    this.updateAttacks();
    if (this.state === 'play') this.checkStageEnd();
  },

  updateClear() {
    this.stateT++;
    this.updatePlayer(true);
    this.updateBullets();
    this.updateSpecial();
    this.updatePickups();
    if (this.state !== 'clear' || this.stateT <= this.clearDelay) return;
    if (this.bossWin && this.stage === FINALE) this.startEnding();
    else this.startStage(this.stage + 1);
  },

  updateResult() {
    this.stateT++;
    this.updatePlayer(false);
    if (this.stateT > 240) this.startStage(this.stage + 1);
  },

  updateGameOver() {
    this.stateT++;
    this.updateFormation();
    this.updateEnemies();
    if (this.boss) { this.boss.t++; }
    this.updateBullets();
    if ((this.stateT > 120 && (Input.just('fire') || Input.just('start'))) || this.stateT > 1200) this.toTitle();
  },

  checkStageEnd() {
    if (this.stageType === 'boss' || this.isSide) return;   // these end when their boss falls
    if (this.waveI < this.waves.length || this.enemies.length) return;
    this.nextAdapt = this.computeAdapt();
    if (this.stageType === 'challenge') {
      this.setState('result');
      this.resultBonus = this.stageHits >= 40 ? 10000 : this.stageHits * 100;
      this.addScore(this.resultBonus);
      Sound.playSong(this.stageHits >= 40 ? Sound.SONGS.victory : Sound.SONGS.stage);
    } else {
      this.clearDelay = 90;
      this.setState('clear');
    }
  },

  gameOver() {
    this.setState('gameover');
    saveHi(this.hi);
    this.radio = null;
    Sound.playSong(Sound.SONGS.gameover);
  },

  // ---- Formation & spawning ----------------------------------------------------
  slotPos(slot) {
    const f = this.formation;
    return {
      x: 128 + f.ox + (slot.c - 4.5) * 16 * f.spread,
      y: 38 + slot.r * 15 * (1 + (f.spread - 1) * 0.6),
    };
  },

  updateFormation() {
    const f = this.formation;
    if (!f) return;
    f.t++;
    if (!this.formationReady) {
      f.ox = Math.sin(f.t * 0.02) * 12;   // sway while squadrons fly in
      f.spread = 1;
      const settling = this.enemies.some(e => e.state === 'enter' || e.state === 'toSlot');
      if (this.stageType === 'normal' && this.waveI >= this.waves.length && !settling) {
        this.formationReady = true;
        this.attackCd = 60;
      }
    } else {
      f.ox *= 0.96;                          // then "breathe" like Galaga
      f.bt++;
      f.spread = 1 + 0.12 * (0.5 - 0.5 * Math.cos(f.bt * 0.035));
    }
  },

  updateSpawns() {
    const w = this.waves[this.waveI];
    if (!w) return;
    if (w.wait > 0) { w.wait--; return; }
    w.timer++;
    for (const s of w.list) if (!s.done && w.timer >= s.delay) { s.done = true; this.spawnEnemy(s, this.waveI); }
    if (w.list.every(s => s.done)) {
      const busy = this.enemies.some(e => e.wave === this.waveI && e.state === 'enter' && e.pd < e.path.length * 0.55);
      if (!busy) {
        this.waveI++;
        if (this.waves[this.waveI]) this.waves[this.waveI].wait = 20;
      }
    }
  },

  spawnEnemy(s, wave) {
    const path = PATHS[s.path];
    const chall = this.stageType === 'challenge';
    const hp = chall ? 1 : ENEMY[s.type].hp;
    const e = {
      type: s.type, hp, maxHp: hp, x: path[0].x, y: path[0].y, vx: 0, vy: 1,
      ang: Math.atan2(path[4].y - path[0].y, path[4].x - path[0].x) + Math.PI / 2,
      state: 'enter', path, pd: 0, slot: s.slot, wave,
      speed: Math.min(2 + this.stage * 0.04, 3),
      acetyl: !chall && this.stage >= 2 && Math.random() < Math.min(0.08 + this.stage * 0.02, 0.35),
      holding: -1, flash: 0, fireYs: [], t: randi(0, 60), dead: false, enterFireAt: 0,
    };
    if (!chall && this.stage >= 2 && Math.random() < Math.min(0.15 + this.stage * 0.04, 0.6)) {
      e.enterFireAt = randi(40, Math.max(41, Math.min(160, path.length - 40)));
    }
    this.enemies.push(e);
  },

  spawnKamikaze(x, y, side) {
    this.enemies.push({
      type: 'fighter', hp: 1, maxHp: 1, x, y, vx: 0, vy: 1, ang: Math.PI, state: 'dive',
      phase: 1, pt: 0, hd: Math.PI / 2 + side * 0.4, spd: 1.5, maxSpd: 2.6, turn: side,
      slot: null, wave: -1, acetyl: false, holding: -1, flash: 0, fireYs: [110], t: 0, dead: false, wob: 0,
    });
  },

  // ---- Enemies -----------------------------------------------------------------
  updateEnemies() {
    for (const e of this.enemies) {
      e.t++;
      if (e.flash > 0) e.flash--;
      const oy = e.y;
      switch (e.state) {
        case 'enter': {
          e.pd += e.speed;
          const i = Math.floor(e.pd);
          if (i >= e.path.length - 1) {
            if (!e.slot) { e.dead = true; break; }   // challenge planes fly off
            e.state = 'toSlot';
          } else {
            const q = e.path[i];
            e.vx = q.x - e.x; e.vy = q.y - e.y;
            e.x = q.x; e.y = q.y;
            if (e.enterFireAt && i >= e.enterFireAt) { e.enterFireAt = 0; this.enemyFire(e); }
          }
          break;
        }
        case 'toSlot': {
          const s = this.slotPos(e.slot);
          const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy);
          const sp = Math.max(e.speed, 1.5);
          if (d <= sp) { e.x = s.x; e.y = s.y; e.vx = 0; e.vy = 0; e.state = 'form'; }
          else { e.vx = dx / d * sp; e.vy = dy / d * sp; e.x += e.vx; e.y += e.vy; }
          break;
        }
        case 'form': {
          const s = this.slotPos(e.slot);
          e.x = s.x; e.y = s.y; e.vx = 0; e.vy = 0;
          break;
        }
        case 'dive': this.updateDive(e); break;
        case 'beamgo': this.updateBeamGo(e); break;
        case 'beam': this.updateBeam(e); break;
        case 'side': this.updateSideEnemy(e); break;
      }
      const moving = Math.abs(e.vx) + Math.abs(e.vy) > 0.05;
      const target = e.face !== undefined ? e.face
        : e.state === 'form' || e.state === 'beam' ? Math.PI
          : moving ? Math.atan2(e.vy, e.vx) + Math.PI / 2 : e.ang;
      e.ang += clamp(angDiff(e.ang, target), -0.25, 0.25);
      if (e.state === 'dive' && e.fireYs.length && oy < e.fireYs[0] && e.y >= e.fireYs[0]) {
        e.fireYs.shift();
        this.enemyFire(e);
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  },

  startDive(e, turn) {
    e.state = 'dive'; e.phase = 0; e.pt = 0; e.hd = -Math.PI / 2;
    e.turn = turn ?? (e.x < 128 ? -1 : 1);
    e.spd = 1.6;
    e.maxSpd = Math.min(2.2 + this.stage * 0.06, 3.4) * (e.acetyl ? 1.2 : 1);
    e.fireYs = [70, 110, 140].slice(0, this.stage < 2 ? 1 : this.stage < 6 ? 2 : 3);
    e.wob = rand(0, TAU);
    Sound.sfx('dive');
  },

  updateDive(e) {
    const p = this.player;
    e.pt++;
    if (e.phase === 0) {
      // peel out of formation with a half loop
      e.hd += e.turn * Math.PI / 32;
      if (e.pt >= 32) e.phase = 1;
    } else {
      e.spd = Math.min(e.maxSpd, e.spd + 0.05);
      if (e.y < 170) {
        let tx = p.alive ? p.x : 128;
        if (e.type === 'bomber') tx += Math.sin(e.pt * 0.06 + e.wob) * 48;
        const desired = Math.atan2(PY + 40 - e.y, tx - e.x);
        const rate = (e.type === 'fighter' ? 0.045 : 0.035) * (e.acetyl ? 1.4 : 1);
        e.hd += clamp(angDiff(e.hd, desired), -rate, rate);
      }
    }
    e.vx = Math.cos(e.hd) * e.spd;
    e.vy = Math.sin(e.hd) * e.spd;
    e.x += e.vx; e.y += e.vy;
    if (e.y > H + 16 || e.x < -24 || e.x > W + 24) {
      if (!e.slot) { e.dead = true; return; }
      const s = this.slotPos(e.slot);
      e.x = s.x; e.y = -16; e.state = 'toSlot';   // loop back in from the top
    }
  },

  // Methylator attack: fly above the player and fire a gene-silencing beam.
  startBeam(e) {
    e.state = 'beamgo'; e.phase = 0; e.pt = 0; e.hd = -Math.PI / 2;
    e.turn = e.x < 128 ? -1 : 1; e.spd = 1.6;
    e.tx = clamp(this.player.x, 32, W - 32); e.ty = 120;
    Sound.sfx('dive');
  },

  updateBeamGo(e) {
    e.pt++;
    if (e.phase === 0) {
      e.hd += e.turn * Math.PI / 32;
      if (e.pt >= 32) e.phase = 1;
    } else {
      const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
      if (d < 2) {
        e.x = e.tx; e.y = e.ty; e.vx = 0; e.vy = 0;
        e.state = 'beam'; e.beamT = 0; e.beamExt = 0;
        return;
      }
      if (d < 24) {   // final approach: straight in
        const sp = Math.min(1.2, d);
        e.vx = dx / d * sp; e.vy = dy / d * sp;
        e.x += e.vx; e.y += e.vy;
        return;
      }
      e.hd += clamp(angDiff(e.hd, Math.atan2(dy, dx)), -0.09, 0.09);
      e.spd = Math.min(2, e.spd + 0.03);
    }
    e.vx = Math.cos(e.hd) * e.spd;
    e.vy = Math.sin(e.hd) * e.spd;
    e.x += e.vx; e.y += e.vy;
  },

  updateBeam(e) {
    const T = ++e.beamT;
    e.vx = 0; e.vy = 0;
    if (T % 10 === 1 && T < 160) Sound.sfx('beam');
    e.beamExt = T < 40 ? T / 40 : T < 160 ? 1 : Math.max(0, 1 - (T - 160) / 30);
    if (T >= 190) { e.state = 'toSlot'; e.beamExt = 0; return; }
    const p = this.player;
    if (e.beamExt >= 1 && T < 160 && p.alive && p.invuln <= 0 && e.holding < 0) {
      const y0 = e.y + 6;
      if (p.y > y0) {
        const hw = 3 + (p.y - y0) * 0.28;
        if (Math.abs(p.x - e.x) < hw - 2) this.silenceForm(e);
      }
    }
  },

  updateAttacks() {
    if (this.stageType !== 'normal' || !this.formationReady || !this.player.alive) return;
    if (--this.attackCd > 0) return;
    const pool = this.enemies.filter(e => e.state === 'form');
    const active = this.enemies.length - pool.length;
    const few = this.enemies.length <= 6;
    this.attackCd = few ? randi(20, 40)
      : randi(Math.max(35, 110 - this.stage * 6), Math.max(70, 170 - this.stage * 8));
    const maxDivers = few ? 6 : Math.min(2 + (this.stage >> 1), 7);
    if (!pool.length || active >= maxDivers) return;
    const meths = pool.filter(e => e.type === 'methyl');
    const e = meths.length && Math.random() < 0.3 ? pick(meths) : pick(pool);
    if (e.type === 'methyl') {
      const beaming = this.enemies.some(x => x.state === 'beamgo' || x.state === 'beam');
      if (!beaming && e.holding < 0 && Math.random() < 0.6) { this.startBeam(e); return; }
      const turn = e.x < 128 ? -1 : 1;
      this.startDive(e, turn);
      // bomber escorts, like Galaga's boss + butterflies
      pool.filter(b => b.type === 'bomber' && b.slot.r === 1 && Math.abs(b.slot.c - e.slot.c) <= 2)
        .slice(0, 2).forEach(b => this.startDive(b, turn));
    } else {
      this.startDive(e);
    }
  },

  enemyFire(e) {
    const p = this.player;
    if (this.stageType === 'challenge' || !p.alive) return;
    if (this.eBul.length > 10 + this.stage) return;
    const sp = Math.min(2 + this.stage * 0.08, 3.4);
    let a = Math.atan2(p.y - e.y, p.x - e.x);
    if (!this.isSide) a = clamp(a, 0.35, Math.PI - 0.35);   // vertical stages: only shoot downward
    const angles = e.acetyl ? [a - 0.15, a + 0.15] : [a];
    for (const aa of angles) this.eBul.push({ x: e.x, y: e.y + 4, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp });
  },

  spreadShot(x, y, n, gap, sp) {
    const p = this.player;
    const base = p.alive ? Math.atan2(p.y - y, p.x - x) : Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * gap;
      this.eBul.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    }
  },

  ringShot(x, y, n, sp, phase) {
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * TAU;
      this.eBul.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    }
  },

  damageEnemy(e, dmg, form) {
    this.hitsTotal++;
    const resisted = form >= 0 && this.adapt === form && this.stageType !== 'challenge';
    if (resisted) dmg *= 0.5;
    e.hp -= dmg;
    if (e.hp <= 0.01) { this.killEnemy(e, form); return; }
    e.flash = 6;
    if (resisted) { Sound.sfx('tink'); this.spark(e.x, e.y + 4, C.lgray); } else Sound.sfx('hit');
  },

  killEnemy(e, form) {
    if (e.dead) return;
    e.dead = true;
    const diving = e.state !== 'form';
    let pts = this.stageType === 'challenge' ? 100 : ENEMY[e.type].pts[diving ? 1 : 0];
    if (e.acetyl) { pts *= 2; this.dropTet(e); }
    if (e.holding >= 0) { this.restoreForm(e.holding); pts += 1000; }
    this.addScore(pts);
    if (diving || pts >= 300) this.popup(e.x, e.y - 4, String(pts), e.acetyl ? C.gold : C.white);
    this.explode(e.x, e.y, e.type === 'methyl' ? 18 : 12);
    Sound.sfx('explode');
    if (form >= 0) this.formKills[form]++;
    this.stageHits++;
  },

  // ---- Player --------------------------------------------------------------------
  available(f) {
    const p = this.player;
    return !p.silenced[f] && !(f === 2 && p.battCd > 0);
  },

  nextAvailable(from, dir) {
    for (let i = 1; i <= 2; i++) {
      const f = (from + dir * i + 3) % 3;
      if (this.available(f)) return f;
    }
    return -1;
  },

  morphTo(f) {
    const p = this.player;
    if (f < 0) return;
    p.nextForm = f;
    p.morphT = 14;
    Sound.sfx('transform');
    this.spark(p.x, p.y, C.white, 6);
  },

  cycleForm(dir) {
    const p = this.player;
    const f = this.nextAvailable(p.morphT > 0 ? p.nextForm : p.form, dir);
    if (f < 0) { Sound.sfx('denied'); return; }
    this.morphTo(f);
  },

  updatePlayer(canFire) {
    const p = this.player;
    for (let f = 0; f < 3; f++) {
      if (p.silenceT[f] > 0 && --p.silenceT[f] === 0 && p.silenced[f]) this.restoreForm(f);
    }
    if (!p.alive) {
      p.respawnT--;
      if (this.lives <= 0) { if (p.respawnT <= 0 && this.state !== 'gameover') this.gameOver(); return; }
      const busy = this.enemies.some(e => e.state === 'dive' || e.state === 'beamgo' || e.state === 'beam');
      if (p.respawnT <= 0 && (!busy || p.respawnT < -180)) this.respawn();
      return;
    }
    if (p.invuln > 0) p.invuln--;
    if (p.battCd > 0) p.battCd--;
    if (p.fireCd > 0) p.fireCd--;

    const cur = p.morphT > 0 ? p.nextForm : p.form;
    if (Input.just('transform')) this.cycleForm(1);
    else if (Input.just('prevForm')) this.cycleForm(-1);
    else {
      for (let f = 0; f < 3; f++) {
        if (Input.just('form' + (f + 1)) && f !== cur) {
          if (this.available(f)) this.morphTo(f); else Sound.sfx('denied');
        }
      }
    }
    if (p.morphT > 0) { p.morphT--; if (p.morphT === 7) p.form = p.nextForm; }

    const F = FORMS[p.form];
    const sp = F.speed * (p.morphT > 0 ? 0.6 : 1);
    let dx = 0, dy = 0;
    if (Input.pressed('left')) dx--;
    if (Input.pressed('right')) dx++;
    if (Input.pressed('up')) dy--;
    if (Input.pressed('down')) dy++;
    if (this.isSide) {
      // Side missions: every form flies freely over the left part of the screen.
      p.x = clamp(p.x + dx * sp, 10, 200);
      p.y = clamp(p.y + dy * sp, 18, SIDE_GROUND - 10);
    } else {
      p.x = clamp(p.x + dx * sp, 9, W - 9);
      if (F.free) p.y = clamp(p.y + dy * sp, PY_MIN, PY);
      else p.y = Math.min(PY, p.y + 2);   // Fighter drops back to low altitude
    }
    p.moving = dx !== 0 || dy !== 0;

    if (canFire && p.morphT === 0 && p.fireCd <= 0 && Input.pressed('fire')) this.fireWeapon();
    if (canFire && Input.just('special')) this.useSpecial();
  },

  // Adds a player bullet described in vertical-stage terms (up = forward) and rotates it
  // to face forward in side missions.
  shoot(ox, oy, vx, vy, extra) {
    const p = this.player;
    const [dx, dy] = this.orient(ox, oy);
    const [bvx, bvy] = this.orient(vx, vy);
    const b = { x: p.x + dx, y: p.y + dy, vx: bvx, vy: bvy, ...extra };
    if (b.hd !== undefined && this.isSide) b.hd += Math.PI / 2;
    this.pBul.push(b);
  },

  fireWeapon() {
    const p = this.player;
    const mine = this.pBul.filter(b => b.form === p.form).length;
    if (p.form === 0) {
      if (mine > 4) return;
      for (const ox of [-3, 3]) this.shoot(ox, -6, 0, -6, { kind: 'shot', dmg: 1, form: 0 });
      p.fireCd = 9; this.shots += 2;
      Sound.sfx('shoot');
    } else if (p.form === 1) {
      if (mine > 9) return;
      for (const a of [-0.22, 0, 0.22]) {
        this.shoot(0, -6, Math.sin(a) * 5, -Math.cos(a) * 5, { kind: 'spread', dmg: 1, form: 1 });
      }
      p.fireCd = 15; this.shots += 3;
      Sound.sfx('spread');
    } else {
      if (mine > 4) return;
      for (const s of [-1, 1]) {
        const hd = -Math.PI / 2 + s * 0.9;
        this.shoot(s * 6, -4, Math.cos(hd) * 1.2, Math.sin(hd) * 1.2,
          { hd, spd: 1.2, kind: 'missile', dmg: 2, form: 2, life: 150, target: null });
      }
      p.fireCd = 26; this.shots += 2;
      Sound.sfx('missile');
    }
  },

  hitPlayer() {
    const p = this.player;
    if (!p.alive || p.invuln > 0 || p.shieldT > 0) return;
    if (p.form === 2 && p.morphT === 0) {
      // Battloid armor soaks the hit, then the robot is forced back into a flight form.
      p.battCd = 600;
      p.invuln = 90;
      const nf = this.nextAvailable(2, 1);
      if (nf < 0) { this.killPlayer(); return; }
      this.morphTo(nf);
      this.explode(p.x, p.y, 10, [C.white, C.lgray, C.gray]);
      this.popup(p.x, p.y - 16, 'ARMOR BREAK', C.orange);
      Sound.sfx('armor');
      return;
    }
    this.killPlayer();
  },

  killPlayer() {
    const p = this.player;
    p.alive = false;
    p.respawnT = 150;
    p.morphT = 0;
    this.lives--;
    this.explode(p.x, p.y, 30, [C.white, C.sky, C.red, C.yellow]);
    for (let i = 1; i <= 3; i++) this.booms.push({ x: p.x + rand(-10, 10), y: p.y + rand(-8, 8), n: 10, delay: i * 8 });
    Sound.sfx('die');
  },

  respawn() {
    const p = this.player;
    p.alive = true; p.invuln = 120; p.battCd = 0; p.morphT = 0; p.fireCd = 0;
    this.placePlayer();
    let f = [0, 1, 2].find(i => !p.silenced[i]);
    if (f === undefined) {
      p.silenced = [false, false, false];
      for (const e of this.enemies) e.holding = -1;
      f = 0;
    }
    p.form = p.nextForm = f;
  },

  // Methylation beam hit: that form's gene is switched off until the methylator is shot down.
  silenceForm(src) {
    const p = this.player;
    if (p.shieldT > 0) { this.spark(p.x, p.y, C.aqua, 6); return; }   // Gene Shield blocks beams
    const remaining = [0, 1, 2].filter(f => !p.silenced[f]);
    if (remaining.length <= 1) {
      this.say(VOSS.locked);
      this.killPlayer();
      if (src !== 'boss') src.beamT = Math.max(src.beamT, 160);
      return;
    }
    const f = p.morphT > 0 ? p.nextForm : p.form;
    p.silenced[f] = true;
    if (src === 'boss') p.silenceT[f] = 600;
    else { src.holding = f; src.beamT = 160; }
    this.popup(p.x, p.y - 18, FORMS[f].name + ' SILENCED', C.pink);
    this.say(pick(VOSS.silence));
    this.hint('silenced');
    Sound.sfx('silence');
    this.spark(p.x, p.y, C.lime, 10);
    p.invuln = 90;
    let next = this.nextAvailable(f, 1);
    if (next < 0) { p.battCd = 0; next = this.nextAvailable(f, 1); }
    this.morphTo(next);
  },

  restoreForm(f) {
    const p = this.player;
    if (!p.silenced[f]) return;
    p.silenced[f] = false;
    p.silenceT[f] = 0;
    this.popup(p.x, p.y - 26, FORMS[f].name + ' RESTORED', C.lime);
    if (this.state === 'play') this.say(pick(VOSS.restore));
    Sound.sfx('restore');
  },

  // ---- Bullets & collisions -------------------------------------------------------
  findTarget(x, y) {
    let best = null, bd = Infinity;
    const side = this.isSide;
    const consider = (o) => {
      const behind = side ? o.x < x : o.y > y;   // prefer targets in front of the missile
      const d = (o.x - x) ** 2 + (o.y - y) ** 2 + (behind ? 3 * (side ? (o.x - x) ** 2 : (o.y - y) ** 2) : 0);
      if (d < bd) { bd = d; best = o; }
    };
    for (const e of this.enemies) if (!e.dead && e.y > -8) consider(e);
    if (this.boss && !this.boss.dying) for (const pt of this.boss.parts) if (!pt.dead && !pt.shielded) consider(pt);
    return best;
  },

  updateBullets() {
    for (const b of this.pBul) {
      if (b.kind === 'missile') {
        if (!b.target || b.target.dead) b.target = this.findTarget(b.x, b.y);
        if (b.target) b.hd += clamp(angDiff(b.hd, Math.atan2(b.target.y - b.y, b.target.x - b.x)), -0.12, 0.12);
        b.spd = Math.min(4.5, b.spd + 0.12);
        b.vx = Math.cos(b.hd) * b.spd;
        b.vy = Math.sin(b.hd) * b.spd;
        if (--b.life <= 0) b.dead = true;
        if (this.t % 2 === 0) this.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0.2, life: 10, max: 10, cols: [C.gray, C.lgray], sz: 1 });
      } else if (b.life !== undefined && --b.life <= 0) {
        b.dead = true;
        if (b.kind === 'cluster') this.burstCluster(b);   // fuse ran out: burst in the air
      }
      b.x += b.vx; b.y += b.vy;
      if (b.y < -10 || b.y > H + 10 || b.x < -10 || b.x > W + 10) b.dead = true;
    }
    for (const b of this.eBul) {
      b.x += b.vx; b.y += b.vy;
      if (b.y < -10 || b.y > H + 10 || b.x < -10 || b.x > W + 10) b.dead = true;
    }
    this.pBul = this.pBul.filter(b => !b.dead);
    this.eBul = this.eBul.filter(b => !b.dead);
  },

  collide() {
    const p = this.player;
    for (const b of this.pBul) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const hr = ENEMY[e.type].hit;
        if (Math.abs(b.x - e.x) < hr && Math.abs(b.y - e.y) < hr + 2) {
          b.dead = true;
          this.damageEnemy(e, b.dmg, b.form);
          if (b.kind === 'cluster') this.burstCluster(b);
          break;
        }
      }
      if (!b.dead && this.boss) {
        this.bossHitTest(b);
        if (b.dead && b.kind === 'cluster') this.burstCluster(b);
      }
    }
    if (p.alive && p.shieldT > 0) {
      // Gene Shield: destroys bullets and rams enemies instead of taking hits.
      for (const b of this.eBul) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < 13) { b.dead = true; this.spark(b.x, b.y, C.aqua, 2); }
      }
      for (const e of this.enemies) {
        if (!e.dead && e.state !== 'form' && Math.hypot(e.x - p.x, e.y - p.y) < 14) this.damageEnemy(e, 0.25, -1);
      }
    } else if (p.alive && p.invuln <= 0) {
      const hb = FORMS[p.form].hit;
      for (const b of this.eBul) {
        if (Math.abs(b.x - p.x) < hb && Math.abs(b.y - p.y) < hb + 1) { b.dead = true; this.hitPlayer(); break; }
      }
      if (p.alive && p.invuln <= 0) {
        for (const e of this.enemies) {
          if (!e.dead && e.state !== 'form' && Math.abs(e.x - p.x) < hb + 4 && Math.abs(e.y - p.y) < hb + 4) {
            this.killEnemy(e, p.form);
            this.hitPlayer();
            break;
          }
        }
      }
    }
    this.pBul = this.pBul.filter(b => !b.dead);
    this.eBul = this.eBul.filter(b => !b.dead);
    this.enemies = this.enemies.filter(e => !e.dead);
  },

  // ---- Bosses ---------------------------------------------------------------------
  // Vertical stages: the Nucleosome Fortress faces down from the top of the screen.
  // Side missions: the Histone Gunship uses the same layout turned to face left, from the right edge.
  // Part offsets are written for the vertical layout; orient() turns them for side missions.
  makeBoss(side) {
    let m = 1 + Math.max(0, Math.floor(this.stage / 5) - 1) * 0.5;
    if (side) m *= 0.6;   // gunship is a mission-ending mid-boss, a bit lighter than the fortress
    const part = (id, ox, oy, r, hp) => ({ id, ox, oy, r, hp: Math.round(hp * m), max: Math.round(hp * m),
      dead: false, x: 0, y: 0, cd: randi(50, 90), flash: 0, shielded: false });
    return {
      side, hull: side ? SPR.gunshipHull : SPR.bossHull,
      x: side ? W + 70 : 128, y: side ? 110 : -30, baseY: 58, t: 0, mt: 0, entering: true, dying: 0,
      parts: [part('L', -38, 2, 8, 60), part('R', 38, 2, 8, 60), part('C', 0, 6, 11, 150)],
      ringCd: 150, launchCd: 200, beamCd: 90, beamT: 0, beamAng: 0, beamDir: 1, phase2: false,
    };
  },

  // Beam origin and direction for the boss's sweeping silencer beam.
  bossBeamRay() {
    const B = this.boss, core = B.parts[2];
    const [ox, oy] = this.orient(0, 8);
    const [dx, dy] = this.orient(Math.sin(B.beamAng), Math.cos(B.beamAng));
    return { x: core.x + ox, y: core.y + oy, dx, dy };
  },

  updateBoss() {
    const B = this.boss, p = this.player;
    B.t++;
    for (const pt of B.parts) if (pt.flash > 0) pt.flash--;
    if (B.dying > 0) {
      if (B.dying % 5 === 0) {
        const [ex, ey] = this.orient(rand(-50, 50), rand(-14, 14));
        this.explode(B.x + ex, B.y + ey, 10);
        Sound.sfx('explode');
      }
      if (--B.dying === 0) this.bossDefeated();
      return;
    }
    if (B.entering) {
      if (B.side) { B.x -= 0.6; if (B.x <= 196) { B.x = 196; B.entering = false; } }
      else { B.y += 0.5; if (B.y >= B.baseY) { B.y = B.baseY; B.entering = false; } }
      if (!B.entering) this.say(VOSS.bossShield);
    } else {
      if (B.beamT <= 0) B.mt++;   // hover in place while firing the beam
      if (B.side) {
        B.y = 110 + Math.sin(B.mt * 0.012) * 45;
        B.x = 196 + Math.sin(B.t * 0.03) * 3;
      } else {
        B.x = 128 + Math.sin(B.mt * 0.012) * 60;
        B.y = B.baseY + Math.sin(B.t * 0.03) * 3;
      }
    }
    for (const pt of B.parts) {
      const [ox, oy] = this.orient(pt.ox, pt.oy);
      pt.x = B.x + ox; pt.y = B.y + oy;
    }
    const [L, R, core] = B.parts;
    core.shielded = !L.dead || !R.dead;
    if (B.entering) return;

    const lvl = Math.min(this.stage / 5, 4);
    for (const tt of [L, R]) {
      if (!tt.dead && --tt.cd <= 0) {
        tt.cd = Math.max(40, 85 - lvl * 10);
        const [mx, my] = this.orient(0, 6);
        this.spreadShot(tt.x + mx, tt.y + my, 3, 0.28, 2.2 + lvl * 0.2);
      }
    }
    if (--B.ringCd <= 0) {
      B.ringCd = core.shielded ? 170 : 120;
      this.ringShot(core.x, core.y, core.shielded ? 10 : 14, 1.5 + lvl * 0.15, B.t * 0.05);
    }
    if (--B.launchCd <= 0) {
      B.launchCd = 320;
      for (const s of [-1, 1]) {
        const [ox, oy] = this.orient(s * 52, 2);
        if (B.side) this.spawnSideEnemy('fighter', 'swoop', B.x + ox, B.y + oy);
        else this.spawnKamikaze(B.x + ox, B.y + oy, s);
      }
    }
    if (!core.shielded) {
      if (!B.phase2) { B.phase2 = true; B.beamCd = 100; this.say(VOSS.bossPhase2); }
      if (B.beamT > 0) {
        B.beamT--;
        if (B.beamT < 140) {
          const k = 1 - B.beamT / 140;
          B.beamAng = B.beamDir * (-0.7 + 1.4 * k);
          if (B.beamT % 10 === 0) Sound.sfx('beam');
          this.checkBossBeam();
        }
      } else if (--B.beamCd <= 0) {
        B.beamCd = 300;
        B.beamT = 180;
        // sweep starts away from the player and crosses them
        const across = B.side ? p.y > B.y : p.x < B.x;
        B.beamDir = across ? -1 : 1;
        B.beamAng = -0.7 * B.beamDir;
        Sound.sfx('charge');
      }
    }
  },

  checkBossBeam() {
    const p = this.player;
    if (!p.alive || p.invuln > 0) return;
    const r = this.bossBeamRay();
    const vx = p.x - r.x, vy = p.y - r.y;
    if (vx * r.dx + vy * r.dy <= 0) return;   // player is behind the emitter
    if (Math.abs(vx * r.dy - vy * r.dx) < 7) this.silenceForm('boss');
  },

  bossHitTest(b) {
    const B = this.boss;
    if (B.dying || (B.entering && (B.y < 0 || B.x > W))) return;
    for (const pt of B.parts) {
      if (pt.dead || Math.hypot(b.x - pt.x, b.y - pt.y) >= pt.r + 2) continue;
      b.dead = true;
      this.damageBossPart(pt, b.dmg, b.form, b.x, b.y);
      return;
    }
    // Hull check in the boss's own (vertical) frame.
    const rx = b.x - B.x, ry = b.y - B.y;
    const lx = B.side ? ry : rx, ly = B.side ? -rx : ry;
    const dx = Math.abs(lx);
    if (dx < 56 && ly > -18 + dx * 0.22 && ly < 14 - dx * 0.42) {
      b.dead = true;
      this.spark(b.x, b.y, C.lgray, 2);
    }
  },

  damageBossPart(pt, d, form, hx, hy) {
    const B = this.boss;
    if (form >= 0 && this.adapt === form) { d *= 0.5; this.spark(hx, hy, C.lgray); }
    this.hitsTotal++;
    if (pt.shielded) {
      // The shield soaks most of the damage, and the core can't fall until the turrets do.
      this.spark(hx, hy, C.aqua);
      Sound.sfx('tink');
      pt.hp = Math.max(pt.max * 0.5, pt.hp - d * 0.25);
      pt.flash = 2;
      if (this.t - (B.hintT || -999) > 150) {
        B.hintT = this.t;
        const [ox, oy] = this.orient(0, 22);
        this.popup(clamp(pt.x + ox, 104, W - 104), clamp(pt.y + oy, 20, 200), 'SHIELDED! HIT THE TURRETS', C.aqua);
      }
      return;
    }
    pt.hp -= d;
    pt.flash = 4;
    Sound.sfx('bossHit');
    if (pt.hp <= 0) this.destroyPart(pt);
  },

  destroyPart(pt) {
    const B = this.boss;
    if (pt.dead) return;
    pt.dead = true;
    this.explode(pt.x, pt.y, 24);
    Sound.sfx('boom');
    if (pt.id === 'C') {
      B.dying = 120;
      B.beamT = 0;
      this.eBul = [];
    } else {
      this.addScore(3000);
      this.popup(pt.x, pt.y, '3000', C.gold);
    }
  },

  bossDefeated() {
    const B = this.boss, p = this.player;
    this.addScore(20000);
    this.popup(B.x, B.y, '20000', C.gold);
    for (let i = 0; i < 6; i++) {
      const [ox, oy] = this.orient(rand(-56, 56), rand(-16, 16));
      this.booms.push({ x: B.x + ox, y: B.y + oy, n: 16, delay: i * 6 });
    }
    for (const e of this.enemies) { e.dead = true; this.explode(e.x, e.y, 8); }
    this.enemies = [];
    this.eBul = [];
    this.boss = null;
    this.say(this.stage === FINALE ? VOSS.finalDown : VOSS.bossDown);
    p.silenced = [false, false, false];
    p.silenceT = [0, 0, 0];
    this.nextAdapt = this.computeAdapt();
    this.bossWin = true;
    this.clearDelay = 300;
    this.setState('clear');
    Sound.playSong(Sound.SONGS.victory);
  },

  // ================================================================================
  // Rendering
  // ================================================================================
  draw(ctx) {
    ctx.fillStyle = C.black;
    ctx.fillRect(0, 0, W, H);
    this.drawStars(ctx);
    if (this.state === 'title') this.drawTitle(ctx);
    else if (this.state === 'howto') this.drawHowto(ctx);
    else if (this.state === 'setup') this.drawSetup(ctx);
    else this.drawWorld(ctx);
    if (this.toastMsg && (this.toastMsg.t > 30 || this.toastMsg.t % 8 < 5)) {
      const w = NES.textWidth(this.toastMsg.text) + 12;
      NES.box(ctx, 128 - (w >> 1), 212, w, 13, C.navy, C.sky);
      NES.text(ctx, this.toastMsg.text, 128, 215, C.white, { align: 'center' });
    }
  },

  drawStars(ctx) {
    for (const s of this.stars) {
      if ((this.t + s.ph) % 60 < 48) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
    }
  },

  // side = true draws the ship facing right (side-scrolling missions).
  drawShip(ctx, form, x, y, morphT, flame, side = false) {
    const white = morphT > 0 && ((morphT >> 1) & 1);
    NES.drawRot(ctx, white ? SPR.playerWhite[form] : SPR.player[form], x, y, side ? Math.PI / 2 : 0);
    if (!flame || morphT > 0 || form === 2) return;
    ctx.fillStyle = (this.t >> 1) & 1 ? C.orange : C.yellow;
    const len = 2 + ((this.t >> 2) & 1);
    x = Math.round(x); y = Math.round(y);
    // exhaust rects as [dx, width] behind the ship
    const jets = form === 0 ? [[-2, 1], [2, 1]] : [[-4, 2], [3, 2]];
    for (const [dx, w] of jets) {
      if (side) ctx.fillRect(x - 8 - len + 1, y + dx, len, w);
      else ctx.fillRect(x + dx, y + 8, w, len);
    }
  },

  drawWorld(ctx) {
    const p = this.player;
    if (this.isSide) this.drawSideBG(ctx);
    if (this.boss) this.drawBoss(ctx);
    for (const e of this.enemies) this.drawEnemy(ctx, e);
    this.drawPickups(ctx);
    this.drawSpecialFx(ctx, 'under');
    for (const b of this.pBul) {
      const bx = Math.round(b.x), by = Math.round(b.y);
      if (b.kind === 'shot') {
        const horiz = Math.abs(b.vx) > Math.abs(b.vy);
        ctx.fillStyle = C.yellow;
        if (horiz) ctx.fillRect(bx - 2, by, 5, 1); else ctx.fillRect(bx, by - 2, 1, 5);
        ctx.fillStyle = C.white;
        if (horiz) ctx.fillRect(bx + 2, by, 1, 1); else ctx.fillRect(bx, by - 2, 1, 1);
      } else if (b.kind === 'spread') {
        ctx.fillStyle = C.aqua; ctx.fillRect(bx - 1, by - 1, 2, 2);
      } else if (b.kind === 'cluster') {
        NES.disc(ctx, bx, by, 2, (this.t >> 2) & 1 ? C.orange : C.red);
      } else if (b.kind === 'frag') {
        ctx.fillStyle = (this.t >> 1) & 1 ? C.yellow : C.orange; ctx.fillRect(bx - 1, by - 1, 2, 2);
      } else {
        NES.drawRot(ctx, SPR.missile, b.x, b.y, b.hd + Math.PI / 2);
      }
    }
    for (const b of this.eBul) NES.draw(ctx, SPR.ebullet, b.x, b.y);
    if (p.alive && (p.invuln <= 0 || (this.t >> 2) & 1)) this.drawShip(ctx, p.form, p.x, p.y, p.morphT, true, this.isSide);
    this.drawSpecialFx(ctx, 'over');
    this.drawParticles(ctx);
    this.drawHUD(ctx);
    if (this.radio) this.drawRadio(ctx);

    switch (this.state) {
      case 'intro': this.drawIntro(ctx); break;
      case 'hangar': this.drawHangar(ctx); break;
      case 'clear':
        if (this.bossWin && this.stateT > 30) {
          NES.text(ctx, this.isSide ? 'GUNSHIP DESTROYED!' : 'FORTRESS DESTROYED!', 128, 96, C.gold, { align: 'center', shadow: C.darkred });
          NES.text(ctx, 'BONUS 20000', 128, 110, C.white, { align: 'center' });
        }
        break;
      case 'result': this.drawResult(ctx); break;
      case 'gameover': this.drawGameOver(ctx); break;
    }
    if (this.paused) this.drawGameMenu(ctx);
  },

  drawGameMenu(ctx) {
    NES.box(ctx, 64, 76, 128, 84, C.black, C.white);
    NES.text(ctx, 'GAME MENU', 128, 84, C.gold, { align: 'center' });
    this.gameMenuItems().forEach((item, i) => {
      const y = 102 + i * 14;
      const sel = i === this.gameMenuSel;
      if (sel) NES.draw(ctx, SPR.life, 80, y + 3);
      NES.text(ctx, item, 90, y, sel ? C.white : C.gray);
    });
    NES.text(ctx, 'A: PICK  B: BACK', 128, 148, C.lgray, { align: 'center' });
  },

  drawEnemy(ctx, e) {
    const set = SPR.enemy[e.type];
    const f = (e.t >> 3) & 1;
    const img = e.flash > 0 ? set.white
      : e.type === 'methyl' && e.hp < e.maxHp ? set.dmg[f]
        : e.acetyl ? set.acetyl[f] : set.normal[f];
    if (e.beamExt > 0 && (e.state === 'beam' || e.state === 'side')) this.drawMethylBeam(ctx, e);
    if (e.holding >= 0) {
      // the silenced form is carried behind the methylator, like Galaga's captured fighter
      const bx = e.x - Math.sin(e.ang) * 15, by = e.y + Math.cos(e.ang) * 15;
      NES.drawRot(ctx, SPR.silenced[e.holding], bx, by, e.ang);
    }
    NES.drawRot(ctx, img, e.x, e.y, e.ang);
  },

  // Cone-shaped methylation beam: points down in vertical stages, left in side missions.
  drawMethylBeam(ctx, e) {
    const cols = [C.lime, C.green, C.aqua];
    if (e.state === 'side') {
      const x0 = Math.round(e.x - 6), y = Math.round(e.y);
      const len = Math.floor(x0 * e.beamExt);
      for (let xx = 0; xx < len; xx += 2) {
        const hw = Math.floor(3 + xx * 0.28);
        ctx.fillStyle = cols[((xx >> 1) + (this.t >> 2)) % 3];
        ctx.fillRect(x0 - xx, y - hw, 1, hw * 2 + 1);
      }
      if (len > 40 && (this.t >> 3) & 1) NES.text(ctx, 'CH3', x0 - (len >> 1), y - 3, C.white, { align: 'center' });
      return;
    }
    const x = Math.round(e.x), y0 = Math.round(e.y + 6);
    const len = Math.floor((PY + 12 - y0) * e.beamExt);
    for (let yy = 0; yy < len; yy += 2) {
      const hw = Math.floor(3 + yy * 0.28);
      ctx.fillStyle = cols[((yy >> 1) + (this.t >> 2)) % 3];
      ctx.fillRect(x - hw, y0 + yy, hw * 2 + 1, 1);
    }
    if (len > 40 && (this.t >> 3) & 1) NES.text(ctx, 'CH3', x, y0 + (len >> 1), C.white, { align: 'center' });
  },

  drawParticles(ctx) {
    for (const q of this.parts) {
      if (q.ring) {
        ctx.fillStyle = C.white;
        for (let k = 0; k < 8; k++) {
          const a = k * Math.PI / 4;
          ctx.fillRect(Math.round(q.x + Math.cos(a) * q.r), Math.round(q.y + Math.sin(a) * q.r), 1, 1);
        }
        continue;
      }
      const cols = q.cols || [C.darkred, C.red, C.orange, C.yellow, C.white];
      ctx.fillStyle = cols[Math.min(cols.length - 1, Math.floor((q.life / q.max) * cols.length))];
      ctx.fillRect(Math.round(q.x), Math.round(q.y), q.sz, q.sz);
    }
    for (const q of this.pops) NES.text(ctx, q.text, q.x, q.y, q.col, { align: 'center' });
  },

  drawHUD(ctx) {
    const p = this.player;
    NES.text(ctx, '1UP', 4, 1, C.red);
    NES.text(ctx, pad6(this.score), 32, 1, C.white);
    NES.text(ctx, 'HI', 164, 1, C.red);
    NES.text(ctx, pad6(this.hi), 184, 1, C.white);
    // Top middle alternates between the mission's special weapon ammo and the adaptation warning.
    const sp = this.special;
    const showAdapt = this.adapt >= 0 && (!sp || (this.t >> 6) & 1);
    if (showAdapt) {
      if ((this.t >> 4) & 1) NES.text(ctx, 'ADPT:' + FORMS[this.adapt].short, 88, 1, C.pink);
    } else if (sp) {
      const def = SPECIALS[sp.idx];
      NES.draw(ctx, SPR.specialIcons[sp.idx], 92, 4);
      NES.text(ctx, def.short + ' ' + String(sp.ammo).padStart(2, '0'), 100, 1, sp.ammo ? C.gold : C.gray);
    }

    // reserve ships
    for (let i = 0; i < Math.min(this.lives - (p.alive ? 1 : 0), 7); i++) NES.draw(ctx, SPR.life, 7 + i * 9, 234);

    // form status
    for (let f = 0; f < 3; f++) {
      const x = 84 + f * 30, y = 231;
      const cur = p.alive && (p.morphT > 0 ? p.nextForm : p.form) === f;
      let col = C.gray;
      if (p.silenced[f]) col = C.magenta;
      else if (f === 2 && p.battCd > 0) col = C.orange;
      else if (cur) col = C.white;
      if (cur) { ctx.fillStyle = C.navy; ctx.fillRect(x - 2, y - 1, 25, 9); }
      NES.text(ctx, FORMS[f].short, x, y, col);
      if (p.silenced[f]) { ctx.fillStyle = C.magenta; ctx.fillRect(x - 1, y + 3, 23, 1); }
      if (f === 2 && p.battCd > 0 && !p.silenced[f]) {
        ctx.fillStyle = C.orange; ctx.fillRect(x, y + 8, Math.ceil(21 * (1 - p.battCd / 600)), 1);
      }
    }
    NES.text(ctx, 'ST', 214, 231, C.red);
    NES.text(ctx, String(this.stage).padStart(2, '0'), 234, 231, C.white);

    if (this.boss && !this.radio) {
      const B = this.boss;
      const tot = B.parts.reduce((s, q) => s + q.max, 0);
      const cur = B.parts.reduce((s, q) => s + Math.max(0, q.hp), 0);
      NES.text(ctx, this.villain() === 'echo' ? 'ECHO' : 'VOSS', 4, 11, CAST[this.villain()].col);
      ctx.fillStyle = C.darkred; ctx.fillRect(40, 12, 160, 5);
      ctx.fillStyle = C.pink; ctx.fillRect(40, 12, Math.ceil(160 * cur / tot), 5);
    }
  },

  drawPortrait(ctx, x, y, who) {
    ctx.fillStyle = who === 'mira' ? C.dgreen : C.navy;
    ctx.fillRect(x, y, 26, 26);
    ctx.drawImage(CAST[who].portrait(), x + 1, y + 1);
    if (who === 'echo' && (this.t >> 2) & 1) {   // the Echo is a broadcast: add scanlines
      ctx.fillStyle = C.black;
      for (let j = 2; j < 26; j += 3) ctx.fillRect(x + 1, y + j, 24, 1);
    }
  },

  drawRadio(ctx) {
    const r = this.radio;
    NES.box(ctx, 2, 10, 252, 30, C.black, CAST[r.who].col);
    this.drawPortrait(ctx, 4, 12, r.who);
    r.lines.forEach((l, i) => NES.text(ctx, l, 34, 13 + i * 9, C.white));
  },

  drawIntro(ctx) {
    const I = this.intro;
    const who = CAST[I.who];
    if (I.label) NES.text(ctx, I.label, 128, 22, C.white, { align: 'center', scale: 2, shadow: C.navy });
    NES.text(ctx, I.title, 128, 42, this.stageType === 'boss' ? C.pink : C.aqua, { align: 'center' });
    if (this.adapt >= 0) {
      NES.text(ctx, 'ENEMY ADAPTED TO: ' + FORMS[this.adapt].name, 128, 58, C.red, { align: 'center' });
      NES.text(ctx, 'IT TAKES HALF DAMAGE. MIX IT UP!', 128, 68, C.orange, { align: 'center' });
    }
    // Dialogue box sits above the player's ship so it stays visible during the intro.
    const by = 90;
    NES.box(ctx, 4, by, 248, 84, C.black, who.col);
    this.drawPortrait(ctx, 10, by + 6, I.who);
    NES.text(ctx, who.name, 42, by + 6, who.col);
    let left = I.full ? Infinity : Math.floor(I.t / 1.5);
    I.lines.forEach((l, i) => {
      if (left <= 0) return;
      NES.text(ctx, l.slice(0, left), 42, by + 20 + i * 10, C.white);
      left -= l.length;
    });
    if (I.pages.length > 1) NES.text(ctx, (I.page + 1) + '/' + I.pages.length, 10, by + 74, C.gray);
    if (I.full && (this.t >> 4) & 1) {
      const last = I.page === I.pages.length - 1;
      NES.text(ctx, last ? 'PRESS SPACE / A' : 'NEXT: SPACE / A', 244, by + 74, C.white, { align: 'right' });
    }
  },

  drawResult(ctx) {
    const perfect = this.stageHits >= 40;
    if (this.stateT > 20) NES.text(ctx, 'NUMBER OF HITS', 60, 88, C.aqua);
    if (this.stateT > 50) NES.text(ctx, String(this.stageHits), 196, 88, C.white, { align: 'right' });
    if (this.stateT > 90) {
      if (perfect) {
        if ((this.t >> 3) & 1) NES.text(ctx, 'PERFECT!', 128, 64, C.gold, { align: 'center', scale: 2 });
        NES.text(ctx, 'SPECIAL BONUS 10000', 128, 110, C.gold, { align: 'center' });
      } else {
        NES.text(ctx, 'BONUS', 60, 110, C.aqua);
        NES.text(ctx, String(this.resultBonus), 196, 110, C.white, { align: 'right' });
      }
    }
  },

  drawGameOver(ctx) {
    NES.text(ctx, 'GAME OVER', 128, 60, C.red, { align: 'center', scale: 2, shadow: C.darkred });
    if (this.stateT > 60) {
      const ratio = this.shots ? (this.hitsTotal / this.shots * 100).toFixed(1) : '0.0';
      NES.text(ctx, '- RESULTS -', 128, 90, C.red, { align: 'center' });
      NES.text(ctx, 'SHOTS FIRED', 40, 106, C.gold);
      NES.text(ctx, String(this.shots), 216, 106, C.white, { align: 'right' });
      NES.text(ctx, 'NUMBER OF HITS', 40, 118, C.gold);
      NES.text(ctx, String(this.hitsTotal), 216, 118, C.white, { align: 'right' });
      NES.text(ctx, 'HIT-MISS RATIO', 40, 130, C.gold);
      NES.text(ctx, ratio + ' %', 216, 130, C.white, { align: 'right' });
    }
    if (this.stateT > 90) {
      const who = CAST[this.villain()];
      NES.box(ctx, 4, 170, 248, 36, C.black, who.col);
      this.drawPortrait(ctx, 10, 175, this.villain());
      NES.text(ctx, who.name, 42, 175, who.col);
      NES.wrap(VOSS.gameover, 25).forEach((l, i) => NES.text(ctx, l, 42, 187 + i * 9, C.white));
    }
  },

  drawBoss(ctx) {
    const B = this.boss;
    const x = Math.round(B.x), y = Math.round(B.y);
    const [L, R, core] = B.parts;
    if (B.side) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 2);   // nose points left
      ctx.drawImage(B.hull, -64, -24);
      ctx.restore();
    } else {
      ctx.drawImage(B.hull, x - 64, y - 24);
    }
    const [barX, barY] = this.orient(0, 7);   // gun barrel direction

    for (const tt of [L, R]) {
      const tx = Math.round(tt.x), ty = Math.round(tt.y);
      if (tt.dead) {
        NES.disc(ctx, tx, ty, 6, C.black);
        if ((this.t >> 2) & 1) { ctx.fillStyle = C.red; ctx.fillRect(tx - 1, ty, 2, 1); }
        if (this.t % 12 === 0) this.parts.push({ x: tx + rand(-3, 3), y: ty, vx: 0, vy: -0.4, life: 20, max: 20, cols: [C.gray, C.lgray], sz: 2 });
        continue;
      }
      NES.disc(ctx, tx, ty, 8, tt.flash ? C.white : C.lgray);
      NES.disc(ctx, tx, ty, 6, tt.flash ? C.white : C.gray);
      NES.disc(ctx, tx, ty + 1, 3, (this.t >> 3) & 1 ? C.red : C.darkred);
      ctx.fillStyle = C.black;
      ctx.fillRect(tx + barX - 1, ty + barY - 1, 3, 3);   // gun barrel
      ctx.fillRect(tx + Math.round(barX * 0.7) - 1, ty + Math.round(barY * 0.7) - 1, 3, 3);
    }

    // The histone core, with DNA wrapped around it.
    const cx = Math.round(core.x), cy = Math.round(core.y);
    if (!core.dead) {
      if (B.beamT >= 140 && (B.beamT >> 1) & 1) NES.disc(ctx, cx, cy, 14, C.lime);
      NES.disc(ctx, cx, cy, 11, core.flash ? C.white : C.purple);
      NES.disc(ctx, cx - 3, cy - 3, 5, core.flash ? C.white : C.magenta);
      ctx.fillStyle = C.pink; ctx.fillRect(cx - 5, cy - 6, 2, 2);
      for (let i = -14; i <= 14; i++) {
        const s = Math.sin(i * 0.45 + B.t * 0.12) * 7;
        ctx.fillStyle = C.aqua; ctx.fillRect(cx + i, Math.round(cy + s), 1, 1);
        ctx.fillStyle = C.lime; ctx.fillRect(cx + i, Math.round(cy - s), 1, 1);
        if ((i + 14) % 4 === 0) {
          ctx.fillStyle = C.lgray;
          const a = Math.round(Math.min(cy + s, cy - s)), b = Math.round(Math.max(cy + s, cy - s));
          ctx.fillRect(cx + i, a + 1, 1, Math.max(0, b - a - 1));
        }
      }
      if (core.shielded) {
        ctx.fillStyle = C.aqua;
        for (let k = 0; k < 24; k++) {
          if ((k + (this.t >> 2)) % 3 === 0) continue;
          const a = k / 24 * TAU;
          ctx.fillRect(Math.round(cx + Math.cos(a) * 15), Math.round(cy + Math.sin(a) * 15), 1, 1);
        }
      }
    }

    if (B.beamT > 0 && B.beamT < 140 && !core.dead) {
      const r = this.bossBeamRay();
      const cols = [C.lime, C.aqua, C.white];
      for (let s = 0; s < 300; s++) {
        const bx = r.x + r.dx * s, by = r.y + r.dy * s;
        if (by > H || by < -4 || bx < -4 || bx > W + 4) break;
        ctx.fillStyle = cols[((s + this.t * 3) >> 2) % 3];
        ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 5, 5);
      }
    }
  },

  // ---- Menus -----------------------------------------------------------------------
  drawHelix(ctx, x, phase) {
    for (let y = 12; y < 228; y++) {
      const s = Math.sin((y + phase) * 0.08) * 6;
      if (y % 2 === 0) {
        ctx.fillStyle = C.teal; ctx.fillRect(Math.round(x + s), y, 1, 1);
        ctx.fillStyle = C.dgreen; ctx.fillRect(Math.round(x - s), y, 1, 1);
      }
      if (y % 8 === 0) {
        ctx.fillStyle = C.gray;
        const a = Math.round(Math.min(x + s, x - s)), b = Math.round(Math.max(x + s, x - s));
        ctx.fillRect(a, y, b - a, 1);
      }
    }
  },

  drawTitle(ctx) {
    const t = this.t;
    this.drawHelix(ctx, 12, t * 0.5);
    this.drawHelix(ctx, W - 13, t * 0.5 + 40);
    const logo = [C.yellow, C.yellow, C.gold, C.gold, C.orange, C.rust, C.red];
    NES.text(ctx, 'CHIMERA', 128, 18, C.gold, { scale: 3, align: 'center', rows: logo, shadow: C.navy });
    NES.text(ctx, 'WING', 128, 44, C.gold, { scale: 3, align: 'center', rows: logo, shadow: C.navy });
    NES.text(ctx, 'THE EPIGENOME WAR', 128, 72, C.aqua, { align: 'center' });

    // ship demo: cycles through all three forms
    const cyc = t % 100;
    const form = Math.floor(t / 100) % 3;
    const morph = cyc < 14 ? 14 - cyc : 0;
    this.drawShip(ctx, form, 128, 98, morph, true);
    NES.text(ctx, FORMS[form].name, 128, 112, C.lgray, { align: 'center' });

    MENU.forEach((m, i) => {
      const y = 134 + i * 13;
      NES.text(ctx, m, 84, y, i === this.menu ? C.white : C.gray);
      if (i === this.menu) NES.draw(ctx, SPR.life, 72, y + 3);
    });

    NES.text(ctx, 'HI-SCORE ' + pad6(this.hi), 128, 180, C.red, { align: 'center' });
    const pad = Input.padName();
    if (pad) NES.text(ctx, ('PAD: ' + pad).slice(0, 28), 128, 196, C.lime, { align: 'center' });
    else NES.text(ctx, 'PAD: PRESS ANY BUTTON', 128, 196, C.gray, { align: 'center' });
    if (Sound.locked && (t >> 5) & 1) NES.text(ctx, 'PRESS A KEY FOR SOUND', 128, 208, C.gray, { align: 'center' });
    NES.text(ctx, 'Z FIRE  C SPECIAL  X MORPH', 128, 224, C.lgray, { align: 'center' });
  },

  drawHowto(ctx) {
    const T = (s, x, y, c = C.white, o) => NES.text(ctx, s, x, y, c, o);
    const pg = this.howPage;
    if (pg === 0) {
      T('MISSION BRIEFING', 128, 10, C.gold, { align: 'center' });
      ['DR. HELENA VOSS, A ROGUE', 'EPIGENETICIST, HAS TAKEN OVER',
        "THE WORLD'S AIR FORCES. SHE", 'NEVER CHANGED THEIR DNA. SHE',
        'SWITCHED THEIR GENES OFF.', '', 'DR. MIRA KATO, HER OLD LAB',
        'PARTNER, BUILT THE VX-3 CHIMERA', 'TO STOP HER. YOU FLY IT.']
        .forEach((l, i) => T(l, 8, 26 + i * 10));
      T('CONTROLS', 128, 120, C.gold, { align: 'center' });
      T('PAD', 72, 132, C.aqua); T('KEYS', 176, 132, C.aqua);
      [['MOVE', 'DPAD/STICK', 'ARROWS'], ['FIRE', 'A', 'Z SPACE'], ['SPECIAL', 'B', 'C'],
        ['MORPH', 'SELECT', 'X'], ['BACK', 'LB', 'Q'], ['MENU', 'START', 'ENTER']]
        .forEach(([a, b, c], i) => { T(a, 8, 144 + i * 10, C.lgray); T(b, 72, 144 + i * 10); T(c, 176, 144 + i * 10); });
      T('1 2 3 KEYS PICK A FORM', 128, 208, C.gray, { align: 'center' });
    } else if (pg === 4) {
      T('THE SCIENCE', 128, 10, C.gold, { align: 'center' });
      [['GENOME', 'ALL YOUR DNA. ALMOST EVERY', 'CELL CARRIES THE SAME COPY.'],
        ['EPIGENOME', 'MARKS ON DNA AND HISTONES THAT', 'SET WHICH GENES A CELL USES.'],
        ['METHYLATION', 'METHYL GROUPS ON DNA. NEAR A', 'PROMOTER THEY SILENCE A GENE.'],
        ['ACETYLATION', 'ACETYL GROUPS ON HISTONES', 'LOOSEN DNA SO GENES SWITCH ON.'],
        ['HISTONES', 'PROTEIN SPOOLS. DNA WRAPPED', 'ON THEM FORMS NUCLEOSOMES.'],
        ['TET ENZYMES', 'START REMOVING METHYL MARKS.', 'MARKS CAN BE UNDONE!']]
        .forEach(([term, a, b], i) => {
          const y = 26 + i * 32;
          T(term, 8, y, C.aqua); T(a, 16, y + 10); T(b, 16, y + 19, C.lgray);
        });
    } else if (pg === 3) {
      T('MISSIONS', 128, 10, C.gold, { align: 'center' });
      this.drawShip(ctx, 0, 24, 34, 0, true, true);
      ['EVEN-NUMBERED STAGES ARE', 'SIDE-SCROLLING MISSIONS. YOU', 'FLY RIGHT AND MOVE FREELY.',
        'WATCH FOR SAM SITES ON THE', 'GROUND, AMBUSHES FROM BEHIND', '(!>) AND THE GUNSHIP AT THE END.']
        .forEach((l, i) => T(l, i < 3 ? 40 : 8, 26 + i * 10));
      T('SPECIAL WEAPONS', 128, 96, C.gold, { align: 'center' });
      T('BEFORE EACH STAGE, PICK ONE:', 8, 110, C.lgray);
      SPECIALS.forEach((s, i) => {
        const y = 124 + i * 14;
        NES.draw(ctx, SPR.specialIcons[i], 14, y + 3);
        T(s.name, 26, y, s.color);
        T('X' + s.ammo, 248, y, C.white, { align: 'right' });
      });
      T('LIMITED AMMO. IT ONLY WORKS', 128, 184, C.pink, { align: 'center' });
      T('FOR THAT ONE MISSION.', 128, 194, C.pink, { align: 'center' });
    } else if (pg === 1) {
      T('THE VX-3 CHIMERA', 128, 10, C.gold, { align: 'center' });
      const rows = [
        ['FIGHTER', 'FASTEST. TWIN CANNONS.', 'STAYS AT LOW ALTITUDE.'],
        ['GUARDIAN', 'THREE-WAY SPREAD SHOT.', 'CAN CLIMB AND DIVE.'],
        ['BATTLOID', 'HOMING MISSILES. SLOW.', 'ARMOR SURVIVES ONE HIT.'],
      ];
      rows.forEach(([n, a, b], f) => {
        const y = 34 + f * 48;
        this.drawShip(ctx, f, 24, y + 10, 0, true);
        T(n, 48, y, C.aqua); T(a, 48, y + 12); T(b, 48, y + 22, C.lgray);
      });
      T('MORPH ANY TIME. A SILENCED', 128, 186, C.pink, { align: 'center' });
      T('FORM CANNOT BE USED.', 128, 196, C.pink, { align: 'center' });
    } else {
      T("VOSS'S AIR FORCE", 128, 10, C.gold, { align: 'center' });
      const rows = [['fighter', 'MIG', '50 / 100'], ['bomber', 'BOMBER', '80 / 160'], ['methyl', 'METHYLATOR', '150 / 400']];
      rows.forEach(([type, n, pts], i) => {
        const y = 32 + i * 22;
        NES.drawRot(ctx, SPR.enemy[type].normal[(this.t >> 3) & 1], 24, y + 3, Math.PI);
        T(n, 44, y, C.white); T(pts, 240, y, C.aqua, { align: 'right' });
      });
      T('(IN FORMATION / DIVING)', 240, 98, C.gray, { align: 'right' });
      NES.drawRot(ctx, SPR.enemy.fighter.acetyl[0], 24, 113, Math.PI);
      ['ACETYLATED (GOLD) PLANES:', 'FASTER, DOUBLE POINTS.'].forEach((l, i) => T(l, 40, 108 + i * 10, C.gold));
      NES.draw(ctx, SPR.tet, 24, 134);
      ['SOME DROP TET CAPSULES.', 'THEY RESTORE A FORM.'].forEach((l, i) => T(l, 40, 128 + i * 10, C.lime));
      ['METHYLATOR BEAMS SILENCE THE', 'FORM YOU ARE IN. SHOOT DOWN THE', 'CARRIER TO RESTORE IT (+1000).',
        'LEAN ON ONE FORM AND VOSS', 'MAKES HER PILOTS RESIST IT.', 'KEEP TRANSFORMING!']
        .forEach((l, i) => T(l, 8, 156 + i * 10, i < 3 ? C.pink : C.lgray));
    }
    T((pg + 1) + '/' + HOWTO_PAGES + '  FIRE: NEXT', 128, 226, C.gray, { align: 'center' });
  },

  drawSetup(ctx) {
    const S = this.setup;
    NES.text(ctx, 'CONTROLLER SETUP', 128, 14, C.gold, { align: 'center' });
    const pad = Input.padName();
    if (!pad) {
      ['NO CONTROLLER FOUND.', '', 'PLUG IN A USB PAD AND', 'PRESS ANY BUTTON ON IT.', '',
        'BROWSERS HIDE PADS UNTIL', 'A BUTTON IS PRESSED.']
        .forEach((l, i) => NES.text(ctx, l, 128, 60 + i * 12, C.white, { align: 'center' }));
    } else {
      NES.text(ctx, pad.slice(0, 30), 128, 34, C.lime, { align: 'center' });
      NES.text(ctx, 'PRESS THE BUTTON FOR:', 128, 60, C.white, { align: 'center' });
      SETUP_STEPS.forEach((st, i) => {
        const y = 82 + i * 16;
        const col = i === S.step ? C.white : i < S.step ? C.lime : C.gray;
        if (i === S.step && !S.done && (this.t >> 3) & 1) NES.text(ctx, '>', 40, y, C.gold);
        NES.text(ctx, st.label, 52, y, col);
        if (S.map[st.key]) NES.text(ctx, 'BTN ' + S.map[st.key][0], 212, y, C.lime, { align: 'right' });
      });
      NES.text(ctx, 'STICK AND D-PAD ARE AUTOMATIC', 128, 158, C.lgray, { align: 'center' });
    }
    if (S.msg) NES.text(ctx, S.msg, 128, 180, C.gold, { align: 'center' });
    NES.text(ctx, 'ESC: CANCEL   R: RESET PAD', 128, 222, C.gray, { align: 'center' });
  },
};
