'use strict';
// CHIMERA WING: The Epigenome War — game logic and rendering.

const C = NES.C;
const W = NES.W, H = NES.H;
const CX = W >> 1;          // screen center
const OX = (W - 256) >> 1;  // left edge of a centered 256-wide panel (menus and dialogue)
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
  { name: 'FIGHTER', short: 'FTR', speed: 2.4, free: false, hit: 4 },
  { name: 'GUARDIAN', short: 'GRD', speed: 1.8, free: true, hit: 5 },
  { name: 'BATTLOID', short: 'BTL', speed: 1.3, free: true, hit: 6 },
];

const ENEMY = {
  fighter: { name: 'MIG', hp: 1, pts: [50, 100], hit: 9 },
  bomber: { name: 'BOMBER', hp: 1, pts: [80, 160], hit: 12 },
  methyl: { name: 'METHYLATOR', hp: 2, pts: [150, 400], hit: 13 },
  sam: { name: 'SAM SITE', hp: 2, pts: [200, 200], hit: 10 },
  splitter: { name: 'SPLITTER', hp: 2, pts: [120, 240], hit: 11 },
  drone: { name: 'DRONE', hp: 1, pts: [30, 60], hit: 6 },
  armored: { name: 'ARMORED', hp: 5, pts: [250, 500], hit: 13 },
};

// Dr. Helena Voss: rogue epigeneticist. Her science is real; her ethics are not.
// In-game radio lines. Stage briefings and the rest of the story live in story.js.
const VOSS = {
  sideBoss: 'MY HISTONE BUNKER. A HISTONE CORE, WRAPPED IN GUNS.',
  silence: ['METHYLATED! THAT GENE STAYS OFF.', 'A LITTLE CH3 ON YOUR PROMOTER. HUSH.', 'NO TRANSCRIPTION FOR YOU!'],
  restore: ['DEMETHYLATED?! THAT MARK WAS SUPPOSED TO BE PERMANENT!', 'TET ENZYMES? HOW... DULL.'],
  locked: 'GENOME FULLY SILENCED. GOODNIGHT, PILOT.',
  bossShield: 'MY HISTONE CORE IS SHIELDED WHILE MY TURRETS STAND. GOOD LUCK.',
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
// The paths were laid out for a 256-wide field; they stretch to the widescreen.
const PATHS = {};
for (const [k, pts] of Object.entries(PATH_DEFS)) {
  PATHS[k] = buildPath(pts.map(([x, y]) => [x * W / 256, y]));
  PATHS[k + 'M'] = buildPath(pts.map(([x, y]) => [W - x * W / 256, y]));   // mirrored
}

// ---- Wave layouts -------------------------------------------------------------
// Formation: row 0 = methylators, rows 1-2 = bombers, rows 3-4 = MiGs (40 planes, like Galaga).
function buildNormalWaves() {
  const S = (type, c, r, path, delay) => ({ type, slot: { c, r }, path, delay });
  const waves = [];
  let w = [];
  [3, 4, 5, 6].forEach((c, i) => { w.push(S('bomber', c, 1, 'top', i * 13)); w.push(S('fighter', c, 3, 'topM', i * 13)); });
  waves.push(w);
  w = [];
  [3, 4, 5, 6].forEach((c, i) => w.push(S('methyl', c, 0, 'side', i * 26)));
  [1, 2, 7, 8].forEach((c, i) => w.push(S('bomber', c, 1, 'side', i * 26 + 13)));
  waves.push(w);
  w = [];
  [1, 2, 3, 4, 5, 6, 7, 8].forEach((c, i) => w.push(S('bomber', c, 2, 'sideM', i * 13)));
  waves.push(w);
  w = [];
  [[0, 3], [1, 3], [2, 3], [7, 3], [8, 3], [9, 3], [4, 4], [5, 4]].forEach(([c, r], i) => w.push(S('fighter', c, r, 'topc', i * 13)));
  waves.push(w);
  w = [];
  [0, 1, 2, 3, 6, 7, 8, 9].forEach((c, i) => w.push(S('fighter', c, 4, 'topcM', i * 13)));
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
      list.push({ type, slot: null, path: a, delay: i * 14 });
      list.push({ type, slot: null, path: b, delay: i * 14 + 7 });
    }
    return { list, timer: 0, wait: 0 };
  });
}

const HOWTO_PAGES = 5;
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
  score: 0, hi: 20000, shields: 0, stage: 0, nextExtra: 20000,
  player: null, enemies: [], pBul: [], eBul: [], parts: [], pops: [], booms: [], stars: [],
  waves: [], waveI: 0, formation: null, formationReady: false, attackCd: 0,
  stageType: 'normal', adapt: -1, nextAdapt: -1, formKills: [0, 0, 0], stageHits: 0,
  shots: 0, hitsTotal: 0, boss: null, radio: null, intro: null, toastMsg: null,
  clearDelay: 90, bossWin: false, resultBonus: 0,
  scroll: 0, side: null,                                   // side-scrolling mission state
  special: null, lastSpecial: 0, laser: null, crushT: 0,   // mission special weapon
  pickups: [], radioQ: [], hintsSeen: new Set(),           // TET capsules, queued radio, Mira's tips
  camp: null, mission: null, inBase: false, carrier: null, // campaign (campaign.js), carrier (carrier.js)
  capital: null, legBoss: false, scrollLock: false,        // capital ship (capital.js); leg ends in a boss; base arrived
  wingT: 0, tetT: 0, lastBossName: '',

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
    this.mission = null; this.carrier = null; this.capital = null; this.inBase = false; this.wingT = 0; this.tetT = 0;
    Sound.playSong(Sound.SONGS.title);
  },

  toast(text) { this.toastMsg = { text, t: 150 }; },

  // Radio message. who defaults to the current villain. queued = wait for the current message.
  say(text, who = this.villain(), queued = false) {
    const msg = { who, lines: NES.wrap(text, 25).slice(0, 3), t: 200 };
    if (queued && this.radio) this.radioQ.push(msg); else this.radio = msg;
  },

  newPlayer() {
    return { x: CX, y: PY, form: 0, nextForm: 0, morphT: 0, fireCd: 0, alive: true, respawnT: 0,
      invuln: 60, battCd: 0, silenced: [false, false, false], silenceT: [0, 0, 0], moving: false, shieldT: 0 };
  },

  get isSide() { return this.stageType === 'side'; },

  // Resets the playfield for one leg of a mission. type: normal | challenge | side | capital.
  setupStage(type) {
    this.stageType = type;
    this.enemies = []; this.eBul = []; this.pBul = [];
    this.laser = null; this.crushT = 0; this.wingT = 0; this.tetT = 0;
    if (this.isSide) this.initSide();
    this.waves = type === 'normal' ? buildNormalWaves() : type === 'challenge' ? buildChallengeWaves(this.stage) : [];
    this.waveI = 0;
    this.formationReady = false;
    this.formation = { t: 0, ox: 0, spread: 1, bt: 0 };
    this.attackCd = 90;
    this.boss = null; this.capital = null; this.bossWin = false; this.scrollLock = false;
    this.stageHits = 0;
    this.adapt = this.nextAdapt;
    this.formKills = [0, 0, 0];
    const p = this.player;
    p.silenced = [false, false, false];
    p.silenceT = [0, 0, 0];
    p.shieldT = 0; p.alive = true; p.hidden = false; p.morphT = 0; p.invuln = 0;
    this.shields = this.statOf('shields');   // repaired on the carrier before every takeoff
    if (this.special) this.special.ammo = this.statOf('special');   // and rearmed
    this.placePlayer();
    this.pickups = []; this.radioQ = []; this.radio = null;
  },

  beginPlay() {
    this.setState('play');
    if (this.stageType === 'capital') {
      this.capital = this.makeCapital(this.missionCapital());
      Sound.playSong(Sound.SONGS.boss);
    }
  },

  // Start position: bottom-center for vertical stages, left side for side-scrolling missions.
  placePlayer() {
    const p = this.player;
    if (this.isSide) { p.x = 40; p.y = 186; } else { p.x = CX; p.y = PY; }
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
      // Score bonus: repair one shield (instead of an extra ship).
      this.nextExtra = this.nextExtra === 20000 ? 70000 : this.nextExtra + 70000;
      if (this.shields < this.statOf('shields')) {
        this.shields++;
        this.popup(this.player.x, this.player.y - 20, 'SHIELD +1', C.lime);
        Sound.sfx('oneup');
      }
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
    const sideways = (this.isSide && !this.inMenu()) || this.state === 'sortie';
    this.nebY = (this.nebY || 0) + speed * 0.08;   // the nebula (scenery.js) drifts slower than the stars
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
    const st = this.state;
    this.updateStars(st === 'intro' || st === 'hangar' || st === 'sortie' ? 3 : st === 'takeoff' || st === 'landing' ? 2 : 1);
    if (this.isSide && !this.inMenu() && !this.scrollLock) this.scroll += 1.5;   // a boss base stops the scroll
    if (this.radio && --this.radio.t <= 0) this.radio = this.radioQ.shift() || null;
    switch (this.state) {
      case 'title': this.updateTitle(); break;
      case 'howto': this.updateHowto(); break;
      case 'pilot': this.updatePilotSelect(); break;
      case 'setup': this.updateSetup(); break;
      case 'intro': this.updateIntro(); break;
      case 'hangar': this.updateHangar(); break;
      case 'play': this.updatePlay(); break;
      case 'clear': this.updateClear(); break;
      case 'result': this.updateResult(); break;
      case 'gameover': this.updateGameOver(); break;
      case 'base': this.updateBase(); break;
      case 'map': this.updateMap(); break;
      case 'travel': this.updateTravel(); break;
      case 'sortie': this.updateSortie(); break;
      case 'takeoff': this.updateTakeoff(); break;
      case 'landing': this.updateLanding(); break;
      case 'debrief': this.updateDebrief(); break;
      case 'learn': this.updateLearn(); break;
    }
    this.updateParticles();
  },

  // Full-screen menu screens (no playfield behind them).
  inMenu() {
    return ['title', 'howto', 'setup', 'pilot', 'base', 'map', 'travel', 'sortie', 'debrief', 'learn'].includes(this.state);
  },

  // ---- In-game menu (Start) ---------------------------------------------------------
  // Works with just a d-pad + A/B + Start: up/down to choose, A to pick, B or Start to resume.
  openGameMenu() {
    this.paused = true;
    this.gameMenuSel = 0;
    Sound.sfx('select');
  },

  gameMenuItems() {
    const items = ['RESUME', 'SOUND: ' + (Sound.muted ? 'OFF' : 'ON')];
    if (this.mission && !this.inBase) items.push('ABORT MISSION');
    return [...items, 'QUIT TO TITLE'];
  },

  updateGameMenu() {
    const n = this.gameMenuItems().length;
    if (Input.just('up')) { this.gameMenuSel = (this.gameMenuSel + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { this.gameMenuSel = (this.gameMenuSel + 1) % n; Sound.sfx('move'); }
    if (Input.just('start') || Input.just('back') || Input.just('special')) { this.paused = false; Sound.sfx('select'); return; }
    if (!Input.just('fire')) return;
    Sound.sfx('select');
    const item = this.gameMenuItems()[this.gameMenuSel];
    if (item === 'RESUME') this.paused = false;
    else if (item.startsWith('SOUND')) Sound.toggleMute();
    else if (item === 'ABORT MISSION') { this.paused = false; this.missionFailed(); }
    else { saveHi(this.hi); this.toTitle(); }
  },

  updateTitle() {
    this.stateT++;
    const anyPress = Input.just('fire') || Input.just('start') || Input.just('transform');
    if (anyPress) Sound.unlock();
    const items = this.titleItems(), n = items.length;
    this.menu = Math.min(this.menu, n - 1);
    if (Input.just('up')) { this.menu = (this.menu + n - 1) % n; Sound.sfx('move'); }
    if (Input.just('down')) { this.menu = (this.menu + 1) % n; Sound.sfx('move'); }
    if (this.stateT > 20 && (Input.just('fire') || Input.just('start'))) {
      Sound.sfx('select');
      const item = items[this.menu];
      if (item === 'CONTINUE') this.continueCampaign();
      else if (item === 'NEW GAME') this.openPilotSelect();
      else if (item === 'CONTROLLER SETUP') this.openSetup();
      else { this.howPage = 0; this.setState('howto'); }
    }
  },

  titleItems() {
    return [...(this.hasSave() ? ['CONTINUE'] : []), 'NEW GAME', 'CONTROLLER SETUP', 'HOW TO PLAY'];
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
    if (!this.inBase) { this.updatePlayer(false); this.updateBullets(); }
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
    if (this.capital) this.updateCapital();
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
    this.legDone();
  },

  updateResult() {
    this.stateT++;
    this.updatePlayer(false);
    if (this.stateT > 240) this.legDone();
  },

  updateGameOver() {
    this.stateT++;
    this.updateFormation();
    this.updateEnemies();
    if (this.boss) { this.boss.t++; }
    this.updateBullets();
    if ((this.stateT > 120 && (Input.just('fire') || Input.just('start'))) || this.stateT > 1200) this.missionFailed();
  },

  checkStageEnd() {
    if (this.stageType === 'capital') return;   // ends when the capital ship's last target falls
    if (this.isSide) {                           // side approach: ends when its script has played out
      if (this.legBoss || this.side.i < this.side.events.length || this.enemies.length) return;
      this.nextAdapt = this.computeAdapt();
      this.clearDelay = 90;
      this.setState('clear');
      return;
    }
    if (this.waveI < this.waves.length || this.enemies.length) return;
    this.nextAdapt = this.computeAdapt();
    if (this.stageType === 'challenge') {
      this.setState('result');
      this.resultBonus = this.stageHits >= 40 ? 10000 : this.stageHits * 100;
      this.addScore(this.resultBonus);
      if (this.mission) this.mission.bonusCr += this.stageHits * 10 + (this.stageHits >= 40 ? 500 : 0);
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
      x: CX + f.ox + (slot.c - 4.5) * 28 * f.spread,   // 10 columns span about 280px of the widescreen
      y: 40 + slot.r * 19 * (1 + (f.spread - 1) * 0.6),
    };
  },

  updateFormation() {
    const f = this.formation;
    if (!f) return;
    f.t++;
    if (!this.formationReady) {
      f.ox = Math.sin(f.t * 0.02) * 20;   // sway while squadrons fly in
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
    const type = this.mixType(s.type);
    const hp = chall ? 1 : ENEMY[type].hp;
    const e = {
      type, hp, maxHp: hp, x: path[0].x, y: path[0].y, vx: 0, vy: 1,
      ang: Math.atan2(path[4].y - path[0].y, path[4].x - path[0].x) + Math.PI / 2,
      state: 'enter', path, pd: 0, slot: s.slot, wave,
      speed: Math.min(2 + this.stage * 0.04, 3),
      acetyl: !chall && this.stage >= 2 && Math.random() < this.acetylChance(),
      holding: -1, flash: 0, fireYs: [], t: randi(0, 60), dead: false, enterFireAt: 0,
    };
    if (!chall && this.stage >= 2 && Math.random() < Math.min(0.15 + this.stage * 0.04, 0.6)) {
      e.enterFireAt = randi(40, Math.max(41, Math.min(160, path.length - 40)));
    }
    this.enemies.push(e);
  },

  spawnKamikaze(x, y, side, type = 'fighter') {
    const hp = ENEMY[type].hp;
    this.enemies.push({
      type, hp, maxHp: hp, x, y, vx: 0, vy: 1, ang: Math.PI, state: 'dive',
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
    e.turn = turn ?? (e.x < CX ? -1 : 1);
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
        let tx = p.alive ? p.x : CX;
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
    e.turn = e.x < CX ? -1 : 1; e.spd = 1.6;
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
      const y0 = e.y + 11;
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
      const turn = e.x < CX ? -1 : 1;
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
    for (const aa of angles) this.eBul.push({ x: e.x, y: e.y + 9, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp });
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
    if (e.type === 'splitter') this.splitEnemy(e);
  },

  // Chance a new plane is acetylated (gold). Some sectors field more of them.
  acetylChance() { return Math.min(0.08 + this.stage * 0.02, 0.35) + this.sectorDef().acetyl; },

  // DNMT1 copies a methylation pattern onto both new DNA strands: a Splitter breaks into two MiGs.
  splitEnemy(e) {
    for (const s of [-1, 1]) {
      if (this.isSide) this.spawnSideEnemy('fighter', 'swoop', e.x, e.y + s * 8);
      else this.spawnKamikaze(e.x + s * 6, e.y, s);
    }
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
      if (--p.respawnT <= 0 && this.state !== 'gameover') this.gameOver();
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
    const sp = F.speed * this.speedMul() * (p.morphT > 0 ? 0.6 : 1);
    let dx = 0, dy = 0;
    if (Input.pressed('left')) dx--;
    if (Input.pressed('right')) dx++;
    if (Input.pressed('up')) dy--;
    if (Input.pressed('down')) dy++;
    if (this.isSide) {
      // Side missions: every form flies freely over the left part of the screen.
      const maxX = this.boss ? W - 10 : W - 164;   // at a boss base you can fly the whole screen
      p.x = clamp(p.x + dx * sp, 18, maxX);
      p.y = clamp(p.y + dy * sp, 22, SIDE_GROUND - 14);
    } else {
      p.x = clamp(p.x + dx * sp, 14, W - 14);
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
    if (this.wingT > 0 && extra.form >= 0) {   // WINGMAN special: the drone copies every shot
      const [wx, wy] = this.wingOffset();
      this.pBul.push({ ...b, x: b.x + wx, y: b.y + wy });
    }
  },

  fireWeapon() {
    const p = this.player, k = this.gunPower();
    const mine = this.pBul.filter(b => b.form === p.form).length;
    if (p.form === 0) {
      if (mine > 4) return;
      for (const ox of [-3, 3]) this.shoot(ox, -6, 0, -6, { kind: 'shot', dmg: k, form: 0 });
      p.fireCd = 9; this.shots += 2;
      Sound.sfx('shoot');
    } else if (p.form === 1) {
      if (mine > 9) return;
      for (const a of [-0.22, 0, 0.22]) {
        this.shoot(0, -6, Math.sin(a) * 5, -Math.cos(a) * 5, { kind: 'spread', dmg: k, form: 1 });
      }
      p.fireCd = 15; this.shots += 3;
      Sound.sfx('spread');
    } else {
      if (mine > 4) return;
      for (const s of [-1, 1]) {
        const hd = -Math.PI / 2 + s * 0.9;
        this.shoot(s * 6, -4, Math.cos(hd) * 1.2, Math.sin(hd) * 1.2,
          { hd, spd: 1.2, kind: 'missile', dmg: 2 * k, form: 2, life: 150, target: null });
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
      const nf = this.nextAvailable(2, 1);
      if (nf < 0) { this.takeHit(); return; }   // nowhere to morph: the shields take it
      p.battCd = 600;
      p.invuln = 90;
      this.morphTo(nf);
      this.explode(p.x, p.y, 10, [C.white, C.lgray, C.gray]);
      this.popup(p.x, p.y - 16, 'ARMOR BREAK', C.orange);
      Sound.sfx('armor');
      return;
    }
    this.takeHit();
  },

  killPlayer() {
    const p = this.player;
    p.alive = false;
    p.respawnT = 150;
    p.morphT = 0;
    this.explode(p.x, p.y, 30, [C.white, C.sky, C.red, C.yellow]);
    for (let i = 1; i <= 3; i++) this.booms.push({ x: p.x + rand(-10, 10), y: p.y + rand(-8, 8), n: 10, delay: i * 8 });
    Sound.sfx('die');
  },

  // Methylation beam hit: that form's gene is switched off until the methylator is shot down.
  silenceForm(src) {
    const p = this.player;
    if (p.shieldT > 0) { this.spark(p.x, p.y, C.aqua, 6); return; }   // Gene Shield blocks beams
    const remaining = [0, 1, 2].filter(f => !p.silenced[f]);
    if (remaining.length <= 1) {
      // Last form silenced: the shields take the hit and reboot the whole genome.
      if (src !== 'boss') src.beamT = Math.max(src.beamT, 160);
      if (!this.takeHit()) { this.say(VOSS.locked); return; }
      p.silenced = [false, false, false];
      p.silenceT = [0, 0, 0];
      for (const e of this.enemies) e.holding = -1;
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
  // Can a homing missile chase this? Alive, on screen and hittable right now. Checked every frame,
  // so a missile lets go of a target that dies, leaves, gets shielded or is removed.
  targetable(o) {
    if (o.dead || o.x < -8 || o.x > W + 8 || o.y < -8 || o.y > H + 8) return false;
    if (this.enemies.includes(o)) return true;
    const B = this.boss;
    if (B && B.parts.includes(o)) return !B.dying && !B.entering && !o.shielded;
    return this.capitalOnScreen().includes(o);
  },

  findTarget(x, y) {
    let best = null, bd = Infinity;
    const side = this.isSide;
    const all = [...this.enemies, ...(this.boss ? this.boss.parts : []), ...this.capitalOnScreen()];
    for (const o of all) {
      if (!this.targetable(o)) continue;
      const behind = side ? o.x < x : o.y > y;   // prefer targets in front of the missile
      const d = (o.x - x) ** 2 + (o.y - y) ** 2 + (behind ? 3 * (side ? (o.x - x) ** 2 : (o.y - y) ** 2) : 0);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  },

  updateBullets() {
    for (const b of this.pBul) {
      if (b.kind === 'missile') {
        if (!b.target || !this.targetable(b.target)) b.target = this.findTarget(b.x, b.y);
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
      if (!b.dead && (this.boss || this.capital)) {
        if (this.boss) this.bossHitTest(b); else this.capitalHitTest(b);
        if (b.dead && b.kind === 'cluster') this.burstCluster(b);
      }
    }
    if (p.alive && p.shieldT > 0) {
      // Gene Shield: destroys bullets and rams enemies instead of taking hits.
      for (const b of this.eBul) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < 18) { b.dead = true; this.spark(b.x, b.y, C.aqua, 2); }
      }
      for (const e of this.enemies) {
        if (!e.dead && e.state !== 'form' && Math.hypot(e.x - p.x, e.y - p.y) < 20) this.damageEnemy(e, 0.25, -1);
      }
    } else if (p.alive && p.invuln <= 0) {
      const hb = FORMS[p.form].hit;
      for (const b of this.eBul) {
        if (Math.abs(b.x - p.x) < hb && Math.abs(b.y - p.y) < hb + 1) { b.dead = true; this.hitPlayer(); break; }
      }
      if (p.alive && p.invuln <= 0) {
        for (const e of this.enemies) {
          if (!e.dead && e.state !== 'form' && Math.abs(e.x - p.x) < hb + 8 && Math.abs(e.y - p.y) < hb + 8) {
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

  // ================================================================================
  // Rendering
  // ================================================================================
  draw(ctx) {
    ctx.fillStyle = C.black;
    ctx.fillRect(0, 0, W, H);
    this.drawStars(ctx);
    if (this.state === 'title') this.drawTitle(ctx);
    else if (this.state === 'howto') this.drawHowto(ctx);
    else if (this.state === 'pilot') this.drawPilotSelect(ctx);
    else if (this.state === 'setup') this.drawSetup(ctx);
    else if (this.inMenu()) this.drawMenuScreen(ctx);
    else if (this.inBase) this.drawInBase(ctx);
    else this.drawWorld(ctx);
    if (this.toastMsg && (this.toastMsg.t > 30 || this.toastMsg.t % 8 < 5)) {
      const w = NES.textWidth(this.toastMsg.text) + 12;
      NES.box(ctx, CX - (w >> 1), 212, w, 13, C.navy, C.sky);
      NES.text(ctx, this.toastMsg.text, CX, 215, C.white, { align: 'center' });
    }
  },

  // side = true draws the side profile, facing right (side-scrolling missions).
  drawShip(ctx, form, x, y, morphT, flame, side = false, hull = this.camp ? this.camp.hull : 0) {
    const set = SPR.hulls[hull][side ? 'side' : 'top'];
    const white = morphT > 0 && ((morphT >> 1) & 1);
    const img = white ? set.white[form] : set.normal[form];
    NES.draw(ctx, img, x, y);
    if (!flame || morphT > 0 || form === 2) return;
    // Engine glow, blended additively. Flickers between two sizes.
    const r = 2 + ((this.t >> 1) & 1);
    x = Math.round(x); y = Math.round(y);
    const jets = side ? [[-(img.width >> 1) - 1, form === 0 ? 0 : -2]]
      : (form === 0 ? [-4, 4] : [-4, 3]).map(dx => [dx, (img.height >> 1) + 1]);
    SNES.add(ctx, () => {
      for (const [dx, dy] of jets) {
        NES.draw(ctx, SNES.glow(r + 2, '#a04810'), x + dx, y + dy);
        NES.draw(ctx, SNES.glow(r, '#f8c040'), x + dx, y + dy);
      }
    });
  },

  drawWorld(ctx) {
    const p = this.player;
    if (this.isSide) this.drawSideBG(ctx); else this.drawTopBG(ctx);
    if (this.carrier) this.drawCarrier(ctx);
    if (this.capital) this.drawCapital(ctx);
    if (this.boss) this.drawBoss(ctx);
    for (const e of this.enemies) this.drawEnemy(ctx, e);
    this.drawPickups(ctx);
    this.drawSpecialFx(ctx, 'under');
    for (const b of this.pBul) {
      const bx = Math.round(b.x), by = Math.round(b.y);
      if (b.kind === 'shot') {   // a glowing bolt: additive halo, then a hot core
        const horiz = Math.abs(b.vx) > Math.abs(b.vy);
        SNES.add(ctx, () => NES.draw(ctx, SNES.glow(3, '#907020'), bx, by));
        ctx.fillStyle = C.yellow;
        if (horiz) ctx.fillRect(bx - 3, by, 7, 1); else ctx.fillRect(bx, by - 3, 1, 7);
        ctx.fillStyle = C.white;
        if (horiz) ctx.fillRect(bx + 1, by, 3, 1); else ctx.fillRect(bx, by - 3, 1, 3);
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
    SNES.add(ctx, () => { for (const b of this.eBul) NES.draw(ctx, SNES.glow(4, (this.t >> 2) & 1 ? '#c01830' : '#a01050'), b.x, b.y); });
    for (const b of this.eBul) NES.draw(ctx, SPR.ebullet, b.x, b.y);
    if (p.alive && !p.hidden && (p.invuln <= 0 || (this.t >> 2) & 1)) this.drawShip(ctx, p.form, p.x, p.y, p.morphT, true, this.isSide);
    if (p.alive && this.wingT > 0 && (this.wingT > 90 || (this.t >> 2) & 1)) this.drawWingman(ctx);
    this.drawSpecialFx(ctx, 'over');
    this.drawParticles(ctx);
    this.drawHUD(ctx);
    this.panel(ctx, () => this.drawOverlay(ctx));
  },

  // Run a layout made for a 256-wide screen, centered on the widescreen.
  panel(ctx, fn) { ctx.save(); ctx.translate(OX, 0); fn(); ctx.restore(); },

  // Dialogue, menus and banners over the playfield (in a centered 256-wide panel).
  drawOverlay(ctx) {
    if (this.radio) this.drawRadio(ctx);
    switch (this.state) {
      case 'intro': this.drawIntro(ctx); break;
      case 'hangar': this.drawHangar(ctx); break;
      case 'takeoff': case 'landing': this.drawCarrierText(ctx); break;
      case 'play': this.drawCapitalText(ctx); break;
      case 'clear':
        if (this.bossWin && this.stateT > 30) {
          NES.text(ctx, this.lastBossName, 128, 86, C.gold, { align: 'center', shadow: C.darkred });
          NES.text(ctx, 'DESTROYED!', 128, 96, C.gold, { align: 'center', shadow: C.darkred });
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
    if (e.state === 'side') { this.drawSideEnemy(ctx, e); return; }
    const set = SPR.enemy[e.type];
    const f = (e.t >> 3) & 1;
    const img = e.flash > 0 ? set.white
      : e.type === 'methyl' && e.hp < e.maxHp ? set.dmg[f]
        : e.acetyl ? set.acetyl[f] : set.normal[f];
    if (e.beamExt > 0 && (e.state === 'beam' || e.state === 'side')) this.drawMethylBeam(ctx, e);
    if (e.holding >= 0) {
      // the silenced form is carried behind the methylator, like Galaga's captured fighter
      const bx = e.x - Math.sin(e.ang) * 26, by = e.y + Math.cos(e.ang) * 26;
      NES.drawRot(ctx, SPR.hulls[this.camp ? this.camp.hull : 0].top.silenced[e.holding], bx, by, e.ang);
    }
    NES.drawRot(ctx, img, e.x, e.y, e.ang);
  },

  // Side missions: unrotated side profiles. They face left, and flip when flying right.
  drawSideEnemy(ctx, e) {
    const set = SPR.enemy[e.type].side;
    const f = (e.t >> 3) & 1;
    const img = e.flash > 0 ? set.white
      : e.type === 'methyl' && e.hp < e.maxHp ? set.dmg[f]
        : e.acetyl ? set.acetyl[f] : set.normal[f];
    if (e.beamExt > 0) this.drawMethylBeam(ctx, e);
    if (e.holding >= 0) NES.draw(ctx, SPR.hulls[this.camp ? this.camp.hull : 0].side.silenced[e.holding], e.x + 34, e.y);
    if (e.type !== 'sam' && e.vx > 0.3 && e.phase !== 'out') NES.drawFlip(ctx, img, e.x, e.y);
    else NES.draw(ctx, img, e.x, e.y);
  },

  // Cone-shaped methylation beam: points down in vertical stages, left in side missions.
  drawMethylBeam(ctx, e) {
    const cols = [C.lime, C.green, C.aqua];
    if (e.state === 'side') {
      const x0 = Math.round(e.x - 16), y = Math.round(e.y);
      const len = Math.floor(x0 * e.beamExt);
      for (let xx = 0; xx < len; xx += 2) {
        const hw = Math.floor(3 + xx * 0.28);
        ctx.fillStyle = cols[((xx >> 1) + (this.t >> 2)) % 3];
        ctx.fillRect(x0 - xx, y - hw, 1, hw * 2 + 1);
      }
      if (len > 40 && (this.t >> 3) & 1) NES.text(ctx, 'CH3', x0 - (len >> 1), y - 3, C.white, { align: 'center' });
      return;
    }
    const x = Math.round(e.x), y0 = Math.round(e.y + 11);
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
      const col = cols[Math.min(cols.length - 1, Math.floor((q.life / q.max) * cols.length))];
      // explosions glow: each spark adds light, so dense bursts bloom toward white
      SNES.add(ctx, () => NES.draw(ctx, SNES.glow(q.sz + 1, col), q.x, q.y));
    }
    for (const q of this.pops) NES.text(ctx, q.text, q.x, q.y, q.col, { align: 'center' });
  },

  // A framed gauge: dark socket, then a fill with a lit top and a shadowed bottom.
  drawBar(ctx, x, y, w, h, frac, col, back = '#200818') {
    ctx.fillStyle = '#000010'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
    const fw = Math.max(0, Math.min(w, Math.ceil(w * frac)));
    if (fw) SNES.bands(ctx, y, y + h, [SNES.mix(col, '#ffffff', 0.55), col, SNES.mix(col, '#000000', 0.4)], x, fw);
  },

  drawHUD(ctx) {
    const p = this.player;
    // see-through backing behind the HUD rows (color math), so the readouts float over the playfield
    SNES.half(ctx, () => { ctx.fillStyle = '#000010'; ctx.fillRect(0, 0, W, 10); ctx.fillRect(0, 229, W, 11); }, 0.6);
    NES.text(ctx, '1UP', 4, 1, C.red);
    NES.text(ctx, pad6(this.score), 32, 1, C.white);
    NES.text(ctx, 'HI', W - 69, 1, C.red);
    NES.text(ctx, pad6(this.hi), W - 49, 1, C.white);
    // Top middle alternates between the mission's special weapon ammo and the adaptation warning.
    const sp = this.special;
    const showAdapt = this.adapt >= 0 && (!sp || (this.t >> 6) & 1);
    if (showAdapt) {
      if ((this.t >> 4) & 1) NES.text(ctx, 'ADPT:' + FORMS[this.adapt].short, CX, 1, C.pink, { align: 'center' });
    } else if (sp) {
      const def = SPECIALS[sp.idx];
      NES.draw(ctx, SPR.specialIcons[sp.idx], CX - 32, 4);
      NES.text(ctx, def.short + ' ' + String(sp.ammo).padStart(2, '0'), CX - 24, 1, sp.ammo ? C.gold : C.gray);
    }

    // shield pips; with none left the next hit is fatal
    const maxSh = this.statOf('shields');
    if (!this.shields && p.alive) { if ((this.t >> 3) & 1) NES.text(ctx, 'DANGER', 4, 231, C.red); }
    else for (let i = 0; i < maxSh; i++) NES.draw(ctx, i < this.shields ? SPR.shieldPip : SPR.shieldPipOff, 7 + i * 6, 234);

    // form status
    for (let f = 0; f < 3; f++) {
      const x = CX - 40 + f * 30, y = 231;
      const cur = p.alive && (p.morphT > 0 ? p.nextForm : p.form) === f;
      let col = C.gray;
      if (p.silenced[f]) col = C.magenta;
      else if (f === 2 && p.battCd > 0) col = C.orange;
      else if (cur) col = C.white;
      if (cur) NES.hilite(ctx, x - 3, y - 2, 27, 11);
      NES.text(ctx, FORMS[f].short, x, y, col);
      if (p.silenced[f]) { ctx.fillStyle = C.magenta; ctx.fillRect(x - 1, y + 3, 23, 1); }
      if (f === 2 && p.battCd > 0 && !p.silenced[f]) {
        ctx.fillStyle = C.orange; ctx.fillRect(x, y + 8, Math.ceil(21 * (1 - p.battCd / 600)), 1);
      }
    }
    NES.text(ctx, 'LV', W - 42, 231, C.red);
    NES.text(ctx, String(this.camp ? this.camp.level : 1).padStart(2, '0'), W - 22, 231, C.white);

    if (this.boss && !this.radio) {
      const B = this.boss;
      const tot = B.parts.reduce((s, q) => s + q.max, 0);
      const cur = B.parts.reduce((s, q) => s + Math.max(0, q.hp), 0);
      NES.text(ctx, this.villain() === 'echo' ? 'ECHO' : 'VOSS', 4, 11, CAST[this.villain()].col);
      this.drawBar(ctx, 40, 12, W - 80, 5, cur / tot, C.pink);
    }
    if (this.capital && !this.radio) {   // capital ship: targets left, and which pass this is
      const K = this.capital, left = this.capitalLeft();
      NES.text(ctx, 'PASS ' + K.pass, 4, 11, C.gold);
      this.drawBar(ctx, 56, 12, W - 112, 5, left / K.targets.length, C.pink);
      NES.text(ctx, String(left), W - 4, 11, C.white, { align: 'right' });
    }
  },

  // A 60 x 68 SNES portrait frame: beveled border in the speaker's color around the 56 x 64 portrait.
  drawFace(ctx, img, x, y, col) {
    NES.box(ctx, x, y, 60, 68, SNES.mix(col, '#000000', 0.72), col);
    ctx.drawImage(img, x + 2, y + 2);
  },

  drawPortrait(ctx, x, y, who) {
    this.drawFace(ctx, CAST[who].portrait(), x, y, CAST[who].col);
    if (who === 'echo' && (this.t >> 2) & 1) {   // the Echo is a broadcast: add scanlines
      ctx.fillStyle = C.black;
      for (let j = 4; j < 65; j += 3) ctx.fillRect(x + 2, y + j, 56, 1);
    }
  },

  // Stat pips as little shaded gems (lit top, dark bottom); empty ones are dark sockets.
  drawStatPips(ctx, x, y, v, max, col) {
    for (let s = 0; s < max; s++) {
      const px = x + s * 8;
      ctx.fillStyle = '#000010'; ctx.fillRect(px, y, 7, 7);
      if (s < v) SNES.bands(ctx, y + 1, y + 6, [SNES.mix(col, '#ffffff', 0.5), col, SNES.mix(col, '#000000', 0.45)], px + 1, 5);
      else { ctx.fillStyle = '#182040'; ctx.fillRect(px + 1, y + 1, 5, 5); }
    }
  },

  // Dialogue sits in the centered panel; the speaker's portrait goes in the widescreen margin to its left.
  drawRadio(ctx) {
    const r = this.radio;
    NES.box(ctx, 2, 10, 252, 42, C.black, CAST[r.who].col);   // below the HUD's top row
    this.drawPortrait(ctx, -64, 10, r.who);
    r.lines.forEach((l, i) => NES.text(ctx, l, 12, 17 + i * 11, C.white));
  },

  drawIntro(ctx) {
    const I = this.intro;
    const who = CAST[I.who];
    if (I.label) NES.text(ctx, I.label, 128, 22, C.white, { align: 'center', scale: 2, shadow: C.navy });
    NES.text(ctx, I.title, 128, 42, C.aqua, { align: 'center' });
    if (this.adapt >= 0) {
      NES.text(ctx, 'ENEMY ADAPTED TO: ' + FORMS[this.adapt].name, 128, 58, C.red, { align: 'center' });
      NES.text(ctx, 'IT TAKES HALF DAMAGE. MIX IT UP!', 128, 68, C.orange, { align: 'center' });
    }
    // Dialogue box sits above the player's ship so it stays visible during the intro.
    const by = 90;
    NES.box(ctx, 4, by, 248, 84, C.black, who.col);
    this.drawPortrait(ctx, -64, by + 8, I.who);
    NES.text(ctx, who.name, 12, by + 7, who.col);
    let left = I.full ? Infinity : Math.floor(I.t / 1.5);
    I.lines.forEach((l, i) => {
      if (left <= 0) return;
      NES.text(ctx, l.slice(0, left), 12, by + 20 + i * 10, C.white);
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
    if (this.stateT > 20) NES.box(ctx, 44, 56, 168, 70, C.black, C.sky);
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
    NES.text(ctx, 'MISSION FAILED', 128, 60, C.red, { align: 'center', scale: 2, shadow: C.darkred });
    if (this.stateT > 60) {
      NES.box(ctx, 30, 82, 196, 62, C.black, C.red);
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
      NES.box(ctx, 4, 164, 248, 46, C.black, who.col);
      this.drawPortrait(ctx, -64, 154, this.villain());
      NES.text(ctx, who.name, 12, 171, who.col);
      NES.wrap(VOSS.gameover, 25).forEach((l, i) => NES.text(ctx, l, 12, 184 + i * 10, C.white));
    }
  },

  // ---- Menus -----------------------------------------------------------------------
  // A DNA double helix: shaded backbone beads (the near strand brighter), base pairs in four colors,
  // and methyl marks (magenta) sitting on some of the C bases.
  drawHelix(ctx, x, phase) {
    const BASES = [['#e83838', '#f8d040'], ['#3868f0', '#40c858'], ['#f8d040', '#e83838'], ['#40c858', '#3868f0']];
    for (let y = 14; y < 226; y += 2) {
      const a = (y + phase) * 0.08, s = Math.sin(a) * 6, front = Math.cos(a) > 0;
      if (y % 8 === 0) {   // a base pair between the strands
        const l = Math.round(Math.min(x + s, x - s)), r = Math.round(Math.max(x + s, x - s)), m = (l + r) >> 1;
        const [c1, c2] = BASES[((y + phase * 0) >> 3) % 4];
        ctx.fillStyle = SNES.mix(c1, '#000000', 0.3); ctx.fillRect(l, y, m - l, 1);
        ctx.fillStyle = SNES.mix(c2, '#000000', 0.3); ctx.fillRect(m, y, r - m, 1);
        if ((y >> 3) % 5 === 2) { ctx.fillStyle = C.magenta; ctx.fillRect(m - 1, y - 2, 2, 2); }   // CH3
      }
      NES.draw(ctx, SNES.sphere(1, front ? '#40d8c8' : '#207060'), x + s, y);
      NES.draw(ctx, SNES.sphere(1, front ? '#206050' : '#40b880'), x - s, y);
    }
  },

  // The title logo, pre-rendered in chrome (a bright band across the middle row) over a blue extrusion.
  titleLogo() {
    if (this.logoImg) return this.logoImg;
    const chrome = ['#fff8e0', '#f8d860', '#f0a828', '#fff4c8', '#e87018', '#b83010', '#701808'];
    this.logoImg = SNES.layer(256, 66, g => {
      for (const [txt, y] of [['CHIMERA', 4], ['WING', 34]]) {
        for (let d = 3; d >= 1; d--) NES.text(g, txt, 128 + d, y + d, '#2040a0', { scale: 3, align: 'center' });
        NES.text(g, txt, 128, y, C.gold, { scale: 3, align: 'center', rows: chrome });
      }
    });
    return this.logoImg;
  },

  drawTitle(ctx) {
    const t = this.t;
    // Earth rising at the bottom: a rotating globe with a glowing rim of atmosphere (additive).
    const cx = CX, cy = 396, r = 240;
    SNES.add(ctx, () => {
      const glowCols = ['#081430', '#102858', '#1c4490', '#3068d0'];
      for (let x = 0; x < W; x++) {
        const top = cy - Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx)));
        glowCols.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(x, Math.round(top) - 8 + i * 2, 1, 2); });
      }
    });
    SNES.globe(ctx, this.scenery(SECTORS[0].planets[0]).floor, cx, cy, r, t * 0.0015);
    for (const [x, ph] of [[14, 0], [44, 60], [W - 15, 40], [W - 45, 100]]) this.drawHelix(ctx, x, t * 0.5 + ph);
    this.panel(ctx, () => this.drawTitleMenu(ctx));
  },

  drawTitleMenu(ctx) {
    const t = this.t;

    // logo, with a glint sweeping across it every few seconds
    const logo = this.titleLogo();
    ctx.drawImage(logo, 0, 14);
    const gx = (t % 240) * 3 - 60;
    if (gx < 300) {
      const g = this.glintCanvas || (this.glintCanvas = SNES.layer(256, 66, () => {}));
      const gc = g.getContext('2d');
      gc.globalCompositeOperation = 'source-over'; gc.clearRect(0, 0, 256, 66); gc.drawImage(logo, 0, 0);
      gc.globalCompositeOperation = 'source-atop'; gc.fillStyle = '#ffffff';
      gc.beginPath(); gc.moveTo(gx, 0); gc.lineTo(gx + 10, 0); gc.lineTo(gx - 12, 66); gc.lineTo(gx - 22, 66); gc.fill();
      SNES.add(ctx, () => ctx.drawImage(g, 0, 14));
    }
    NES.text(ctx, 'THE EPIGENOME WAR', 128, 84, C.aqua, { align: 'center' });

    // ship demo: cycles through all three forms
    const cyc = t % 100;
    const form = Math.floor(t / 100) % 3;
    const morph = cyc < 14 ? 14 - cyc : 0;
    this.drawShip(ctx, form, 128, 112, morph, true);
    NES.text(ctx, FORMS[form].name, 128, 130, C.lgray, { align: 'center' });

    const items = this.titleItems();
    NES.box(ctx, 44, 139, 168, items.length * 12 + 8, C.black, C.sky);   // fits CONTROLLER SETUP
    items.forEach((m, i) => {
      const y = 144 + i * 12;
      if (i === this.menu) { NES.hilite(ctx, 48, y - 2, 160, 11); NES.draw(ctx, SPR.life, 60, y + 3); }
      NES.text(ctx, m, 72, y, i === this.menu ? C.white : C.lgray);
    });

    NES.text(ctx, 'HI-SCORE ' + pad6(this.hi), 128, 199, C.red, { align: 'center' });
    const pad = Input.padName();
    if (Sound.locked && (t >> 5) & 1) NES.text(ctx, 'PRESS A KEY FOR SOUND', 128, 210, C.white, { align: 'center' });
    else if (pad) NES.text(ctx, ('PAD: ' + pad).slice(0, 28), 128, 210, C.lime, { align: 'center' });
    else NES.text(ctx, 'PAD: PRESS ANY BUTTON', 128, 210, C.lgray, { align: 'center' });
    NES.text(ctx, 'Z FIRE  C SPECIAL  X MORPH', 128, 225, C.white, { align: 'center' });
  },

  drawHowto(ctx) { this.panel(ctx, () => this.drawHowtoPage(ctx)); },

  drawHowtoPage(ctx) {
    // lines up to 31 characters: a full-screen window, with the left margin pulled in to fit
    const T = (s, x, y, c = C.white, o) => NES.text(ctx, s, x === 8 ? 5 : x === 16 ? 13 : x, y, c, o);
    const pg = this.howPage;
    NES.box(ctx, 0, 0, 256, 240, C.black, C.gold);
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
      T('THE CAMPAIGN', 128, 10, C.gold, { align: 'center' });
      ['YOUR CARRIER FLIES FROM STAR', 'TO STAR. EVERY PLANET HAS TWO', 'LEGS: A VERTICAL APPROACH,',
        'THEN A SIDE ASSAULT AND BOSS.', 'CLEAR A SECTOR TO OPEN MORE.', 'SPEND CREDITS AT STARBASES.']
        .forEach((l, i) => T(l, 8, 24 + i * 10, i < 4 ? C.white : C.lgray));
      T('SPECIAL WEAPONS', 128, 90, C.gold, { align: 'center' });
      T('LEARN ONE AT LV 2, 5 AND 8:', 8, 102, C.lgray);
      SPECIALS.forEach((s, i) => {
        const y = 116 + i * 11;
        NES.draw(ctx, SPR.specialIcons[i], 14, y + 3);
        T(s.name, 26, y, s.color);
      });
      T('AMMO = YOUR SPECIAL STAT,', 128, 186, C.pink, { align: 'center' });
      T('REFILLED AT EVERY TAKEOFF.', 128, 196, C.pink, { align: 'center' });
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

  drawSetup(ctx) { this.panel(ctx, () => this.drawSetupPage(ctx)); },

  drawSetupPage(ctx) {
    const S = this.setup;
    NES.box(ctx, 2, 2, 252, 236, C.black, C.sky);
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
