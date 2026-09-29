'use strict';
// Sector campaign. The space carrier travels between star systems (sectors) on a galaxy map and
// docks at each sector's starbase (starbase.js). Every planet is a mission with two legs:
//   approach: a vertical Galaga-style stage   assault: a side-scrolling stage that ends in a boss
// The ship takes off from the carrier before each leg and lands on it after (carrier.js).
// Clearing every planet in a sector pays a bonus and opens the sectors linked to it.

// sky: side-mission background [far mountains, near hills, ground, ground stripes]
// disc: planet colors [body, band] for the map and cutscenes
// swap: enemy types this sector swaps in, as [new type, chance]
// sideKinds: extra side-mission patterns (side.js) added to the usual mix
const SECTORS = [
  { id: 'sol', name: 'SOL', short: 'SOL', base: 'LUNA STATION', x: 30, y: 108, col: C.gold,
    links: ['acen', 'barn'], boss: 'gunship', hull: -1, acetyl: 0, swap: {}, sideKinds: [],
    bonus: { money: 1000, xp: 150 },
    planets: [
      { id: 'earth', name: 'EARTH', sky: [C.navy, C.dgreen, C.brown, C.olive], disc: [C.blue, C.green] },
      { id: 'mars', name: 'MARS', sky: [C.maroon, C.rust, C.darkred, C.orange], disc: [C.rust, C.orange] },
      { id: 'venus', name: 'VENUS', sky: [C.olive, C.gold, C.brown, C.yellow], disc: [C.gold, C.cream],
        approach: 'challenge' },
    ] },
  { id: 'acen', name: 'ALPHA CENTAURI', short: 'ALPHA CEN', base: 'CENTAURI GATE', x: 92, y: 60, col: C.orange,
    links: ['sol', 'sirius'], boss: 'copier', hull: 1, acetyl: 0,
    swap: { fighter: [['splitter', 0.35]] }, sideKinds: ['splitterLine', 'splitterLine'],
    bonus: { money: 1500, xp: 200 },
    planets: [
      { id: 'proxima', name: 'PROXIMA B', sky: [C.darkred, C.maroon, C.brown, C.red], disc: [C.red, C.orange] },
      { id: 'toliman', name: 'TOLIMAN', sky: [C.teal, C.dgreen, C.olive, C.cyan], disc: [C.teal, C.cyan],
        approach: 'challenge' },
    ] },
  { id: 'barn', name: "BARNARD'S STAR", short: 'BARNARD', base: 'HIVEWATCH', x: 92, y: 156, col: C.red,
    links: ['sol', 'tau'], boss: 'queen', hull: 2, acetyl: 0.1,
    swap: { fighter: [['drone', 0.5]] }, sideKinds: ['droneSwarm', 'droneSwarm'],
    bonus: { money: 1500, xp: 200 },
    planets: [
      { id: 'hive', name: 'BARNARD B', sky: [C.brown, C.olive, C.maroon, C.gold], disc: [C.olive, C.gold] },
      { id: 'nectar', name: 'NECTAR', sky: [C.olive, C.gold, C.brown, C.cream], disc: [C.gold, C.yellow] },
    ] },
  { id: 'sirius', name: 'SIRIUS', short: 'SIRIUS', base: 'DOG STAR DOCK', x: 162, y: 60, col: C.ice,
    links: ['acen', 'tau', 'eps'], boss: 'xinact', hull: 3, acetyl: 0.2,
    swap: {}, sideKinds: ['bomber', 'bomber'],
    bonus: { money: 2000, xp: 250 },
    planets: [
      { id: 'agouti', name: 'AGOUTI PRIME', sky: [C.brown, C.olive, C.maroon, C.gold], disc: [C.gold, C.brown] },
      { id: 'calico', name: 'CALICO', sky: [C.gray, C.rust, C.brown, C.orange], disc: [C.orange, C.lgray],
        approach: 'challenge' },
    ] },
  { id: 'tau', name: 'TAU CETI', short: 'TAU CETI', base: 'CETI ANCHORAGE', x: 162, y: 156, col: C.yellow,
    links: ['barn', 'sirius', 'eps'], boss: 'twins', hull: 3, acetyl: 0,
    swap: { bomber: [['armored', 0.4]] }, sideKinds: ['armoredPair'],
    bonus: { money: 2000, xp: 250 },
    planets: [
      { id: 'taue', name: 'TAU CETI E', sky: [C.navy, C.blue, C.gray, C.lgray], disc: [C.lgray, C.sky] },
      { id: 'tauf', name: 'TAU CETI F', sky: [C.navy, C.violet, C.purple, C.lavender], disc: [C.violet, C.lavender] },
    ] },
  { id: 'eps', name: 'EPSILON ERIDANI', short: 'EPS ERI', base: 'ERIDANI ROADS', x: 224, y: 108, col: C.pink,
    links: ['sirius', 'tau'], boss: 'flagship', hull: -1, acetyl: 0.1,
    swap: { fighter: [['splitter', 0.2], ['drone', 0.2]], bomber: [['armored', 0.3]] },
    sideKinds: ['splitterLine', 'droneSwarm', 'armoredPair'],
    bonus: { money: 3000, xp: 300 },
    planets: [
      { id: 'aegir', name: 'AEGIR', sky: [C.purple, C.violet, C.navy, C.lavender], disc: [C.violet, C.pink],
        approach: 'boss', boss: 'gunship2' },
      { id: 'citadel', name: 'THE CITADEL', sky: [C.maroon, C.purple, C.black, C.magenta], disc: [C.magenta, C.purple] },
    ] },
];
const SECTOR_BY_ID = Object.fromEntries(SECTORS.map(S => [S.id, S]));

// XP needed to reach each level (index 0 = level 1). New specials are learned at LEARN_LEVELS.
const LEVELS = [0, 150, 450, 800, 1200, 1700, 2300, 3000, 3800, 4700];
const LEARN_LEVELS = [2, 5, 8];

Object.assign(Game, {
  mapSel: 0, travel: null, debrief: null,

  // ---- Lookups --------------------------------------------------------------------
  sectorDef() { return SECTOR_BY_ID[this.mission ? this.mission.sector : this.camp ? this.camp.sector : 'sol']; },
  planetDef() { return this.mission ? this.mission.planet : null; },
  planetSky() { const P = this.planetDef(); return P ? P.sky : SECTORS[0].planets[0].sky; },
  missionBoss() { const P = this.planetDef(); return (P && P.boss) || this.sectorDef().boss; },
  sectorSideKinds() { return this.sectorDef().sideKinds; },
  isFinale() { const M = this.mission; return !!M && M.planet.id === 'citadel' && M.leg === 'assault'; },

  // A sector may swap some enemy types for its own.
  mixType(type) {
    for (const [nt, chance] of this.sectorDef().swap[type] || []) if (Math.random() < chance) return nt;
    return type;
  },

  sectorCleared(id) { return SECTOR_BY_ID[id].planets.every(P => this.camp.cleared[P.id]); },
  isUnlocked(id) { return id === 'sol' || SECTOR_BY_ID[id].links.some(l => this.sectorCleared(l)); },
  planetsCleared() { return Object.keys(this.camp.cleared).length; },
  sectorsCleared() { return SECTORS.filter(S => this.sectorCleared(S.id)).length; },

  // Difficulty number for the existing stage formulas: it climbs with progress, not with route.
  difficulty(leg) { return 1 + this.planetsCleared() + (leg === 'assault' ? 1 : 0) + this.camp.loop * 8; },

  // ---- Campaign start, save and load --------------------------------------------------
  newCampaign(pilot) {
    this.pilot = pilot;
    this.camp = { v: 1, pilot, hull: 0, hulls: [0], up: { weapons: 0, shields: 0, special: 0 }, money: 0, xp: 0,
      level: 1, learned: [], learnQ: 0, cleared: {}, sector: 'sol', loop: 0, beats: [], score: 0 };
    this.resetRun(0);
    this.startTravel('sol', 'sol');
  },

  resetRun(score) {
    this.score = score; this.nextExtra = 20000;
    while (this.nextExtra <= score) this.nextExtra += 70000;
    this.nextAdapt = -1; this.shots = 0; this.hitsTotal = 0;
    this.hintsSeen = new Set();
    this.player = this.newPlayer();
    this.special = null;
    this.lastSpecial = this.camp.learned[0] || 0;
  },

  hasSave() {
    try { return !!localStorage.getItem('chimera.save'); } catch (e) { return false; }
  },

  saveCampaign() {
    if (!this.camp || this.camp.test) return;
    this.camp.score = this.score;
    try { localStorage.setItem('chimera.save', JSON.stringify(this.camp)); } catch (e) { /* storage unavailable */ }
    saveHi(this.hi);
  },

  continueCampaign() {
    let c = null;
    try { c = JSON.parse(localStorage.getItem('chimera.save')); } catch (e) { c = null; }
    if (!c || c.v !== 1 || !PILOTS[c.pilot] || !SECTOR_BY_ID[c.sector] || !HULLS[c.hull]) {
      Sound.sfx('denied');
      this.toast('SAVE DATA UNREADABLE');
      return;
    }
    this.camp = c;
    this.pilot = c.pilot;
    this.resetRun(c.score || 0);
    this.startTravel(c.sector, c.sector);
  },

  // Dev shortcut (?stage=N): planet ceil(N/2) in map order, odd N = approach, even N = assault.
  testLeg(n) {
    const all = SECTORS.flatMap(S => S.planets.map(P => [S, P]));
    const k = clamp(Math.ceil(n / 2), 1, all.length) - 1;
    const [S, P] = all[k];
    this.pilot = 0;
    this.camp = { v: 1, test: true, pilot: 0, hull: 0, hulls: [0], up: { weapons: 0, shields: 0, special: 0 },
      money: 0, xp: 0, level: 1, learned: SPECIALS.map((s, i) => i), learnQ: 0, cleared: {}, sector: S.id,
      loop: 0, beats: [], score: 0 };
    for (let i = 0; i < k; i++) this.camp.cleared[all[i][1].id] = true;
    this.resetRun(0);
    this.mission = { sector: S.id, planet: P, leg: 'approach', score0: 0, bonusCr: 0, replay: false };
    this.special = { idx: 0, ammo: 0, cd: 0 };
    this.startLeg(n % 2 ? 'approach' : 'assault');
  },

  // ---- Starbase arrival ------------------------------------------------------------------
  arriveBase() {
    this.mission = null;
    this.inBase = true;
    this.carrier = null; this.boss = null;
    this.enemies = []; this.eBul = []; this.pBul = []; this.pickups = [];
    this.radio = null; this.radioQ = [];
    this.stageType = 'normal'; this.special = null; this.wingT = 0; this.tetT = 0; this.laser = null;
    const p = this.player;
    p.alive = true; p.hidden = true; p.silenced = [false, false, false]; p.silenceT = [0, 0, 0];
    this.baseUI = { page: 'main', sel: 0 };
    this.saveCampaign();
    this.setState('base');
    Sound.playSong(Sound.SONGS.base);
  },

  // ---- Missions ---------------------------------------------------------------------------
  startMission(i) {
    const S = this.sectorDef(), P = S.planets[i];
    this.mission = { sector: S.id, planet: P, leg: 'approach', score0: this.score, bonusCr: 0,
      replay: !!this.camp.cleared[P.id] };
    this.nextAdapt = -1;
    const B = this.planetBriefing(S, P);
    this.startBriefing(P.name, B.title, B.pages, () => this.openLoadout());
    Sound.playSong(Sound.SONGS.stage);
  },

  openLoadout() {
    if (this.camp.learned.length) { this.openHangar(); return; }
    this.special = null;
    this.startSortie();
  },

  // Cutscene: the carrier leaves the starbase and flies out to the planet.
  startSortie() {
    this.setState('sortie');
    Sound.sfx('takeoff');
  },

  updateSortie() {
    this.stateT++;
    const skip = this.stateT > 20 && (Input.just('fire') || Input.just('start'));
    if (this.stateT > 170 || skip) this.startLeg('approach');
  },

  startLeg(leg) {
    const M = this.mission;
    M.leg = leg;
    this.inBase = false;
    this.stage = this.difficulty(leg);
    this.setupStage(leg === 'approach' ? (M.planet.approach || 'normal') : 'side');
    if (Sound.current !== Sound.SONGS.mission) Sound.playSong(Sound.SONGS.mission);   // keep the groove across legs
    this.startTakeoff();
    if (leg === 'assault') this.say('APPROACH CLEAR. REARMED AND REFUELED. NOW THE ASSAULT ON ' + M.planet.name + '.', 'mira');
  },

  // A leg's enemies (or boss) are gone: head back to the carrier.
  legDone() { this.startLanding(); },

  afterLanding() {
    if (this.mission.leg === 'approach') this.startLeg('assault');
    else this.missionComplete();
  },

  missionFailed() {
    saveHi(this.hi);
    this.toast('MISSION FAILED');
    this.arriveBase();
  },

  // ---- Rewards -----------------------------------------------------------------------------
  missionComplete() {
    const c = this.camp, M = this.mission, S = this.sectorDef(), P = M.planet;
    const tier = this.planetsCleared() - (M.replay ? 1 : 0);
    const mult = (M.replay ? 0.5 : 1) * (1 + c.loop * 0.5);
    const round10 = v => Math.round(v / 10) * 10;
    const pay = round10((600 + 150 * tier) * mult);
    const combat = round10((this.score - M.score0) / 40 + M.bonusCr);
    const xp = Math.round((150 + 25 * tier) * mult);
    const lines = [['MISSION PAY', pay + ' CR'], ['COMBAT PAY', combat + ' CR'], ['EXPERIENCE', xp + ' XP']];
    let money = pay + combat, gain = xp;
    const before = SECTORS.filter(q => this.isUnlocked(q.id)).map(q => q.id);
    const wasClear = this.sectorCleared(S.id);
    c.cleared[P.id] = true;
    const sectorClear = !wasClear && this.sectorCleared(S.id);
    if (sectorClear) {
      const bm = round10(S.bonus.money * (1 + c.loop * 0.5));
      money += bm; gain += S.bonus.xp;
      lines.push(['SECTOR BONUS', bm + ' CR'], ['', S.bonus.xp + ' XP']);
    }
    const unlocked = SECTORS.filter(q => !before.includes(q.id) && this.isUnlocked(q.id)).map(q => q.name);
    c.money += money;
    c.xp += gain;
    const levels = [];
    while (c.level < LEVELS.length && c.xp >= LEVELS[c.level]) {
      c.level++;
      levels.push(c.level);
      if (LEARN_LEVELS.includes(c.level) && c.learned.length + c.learnQ < SPECIALS.length) c.learnQ++;
    }
    this.debrief = { planet: P.name, lines, total: money, levels, unlocked, sectorClear, sector: S.name,
      finale: this.isFinale() };
    this.setState('debrief');
    Sound.playSong(Sound.SONGS.victory);
  },

  updateDebrief() {
    this.stateT++;
    if (this.stateT === 150 && this.debrief.levels.length) Sound.sfx('levelup');
    if (this.stateT === 60) Sound.sfx('cash');
    if (this.stateT < 90 || !(Input.just('fire') || Input.just('start'))) return;
    Sound.sfx('select');
    if (this.camp.learnQ > 0) this.openLearn();
    else this.leaveDebrief();
  },

  leaveDebrief() {
    if (this.debrief && this.debrief.finale) { this.debrief = null; this.mission = null; this.startEnding(); return; }
    this.debrief = null;
    this.arriveBase();
  },

  drawDebrief(ctx) {
    const D = this.debrief, c = this.camp, center = { align: 'center' };
    NES.text(ctx, D.planet, 128, 14, C.gold, { align: 'center', scale: 2, shadow: C.navy });
    NES.text(ctx, 'MISSION COMPLETE', 128, 36, C.white, center);
    D.lines.forEach(([a, b], i) => {
      if (this.stateT < 20 + i * 12) return;
      NES.text(ctx, a, 32, 56 + i * 11, C.aqua);
      NES.text(ctx, b, 224, 56 + i * 11, C.white, { align: 'right' });
    });
    let y = 62 + D.lines.length * 11;
    if (this.stateT >= 60) {
      NES.text(ctx, 'CREDITS', 32, y, C.gold);
      NES.text(ctx, c.money + ' CR', 224, y, C.gold, { align: 'right' });
      y += 11;
      this.drawXpBar(ctx, 32, y);
      y += 16;
    }
    if (this.stateT >= 150) {
      for (const lv of D.levels) {
        const learn = LEARN_LEVELS.includes(lv) ? ' NEW SPECIAL!' : '';
        if ((this.t >> 3) & 1) NES.text(ctx, 'LEVEL UP! LV ' + lv + learn, 128, y, C.lime, center);
        y += 11;
      }
      if (D.sectorClear) { NES.text(ctx, D.sector + ' CLEARED!', 128, y, C.gold, center); y += 11; }
      for (const name of D.unlocked) { NES.text(ctx, 'NEW SECTOR: ' + name, 128, y, C.pink, center); y += 11; }
    }
    if (this.stateT >= 90 && (this.t >> 4) & 1) NES.text(ctx, 'PRESS SPACE / A', 128, 222, C.white, center);
  },

  // XP bar toward the next level.
  drawXpBar(ctx, x, y) {
    const c = this.camp;
    NES.text(ctx, 'LV ' + c.level, x, y, C.lime);
    const lo = LEVELS[c.level - 1], hi = LEVELS[c.level];
    ctx.fillStyle = C.dgreen; ctx.fillRect(x + 40, y + 1, 120, 5);
    if (hi === undefined) { ctx.fillStyle = C.lime; ctx.fillRect(x + 40, y + 1, 120, 5); NES.text(ctx, 'MAX', x + 192, y, C.lime, { align: 'right' }); return; }
    ctx.fillStyle = C.lime; ctx.fillRect(x + 40, y + 1, Math.floor(120 * (c.xp - lo) / (hi - lo)), 5);
    NES.text(ctx, String(c.xp), x + 192, y, C.white, { align: 'right' });
  },

  // After the finale's epilogue: the Echo campaign (New Game+). Sectors reset, everything else stays.
  startNewGamePlus() {
    const c = this.camp;
    c.loop++;
    c.cleared = {};
    c.beats = [];
    const from = c.sector;
    c.sector = 'sol';
    this.startTravel(from, 'sol');
  },

  // ---- Galaxy map and carrier travel ----------------------------------------------------
  openMap() {
    this.setState('map');
    this.mapSel = SECTORS.findIndex(S => S.id === this.camp.sector);
  },

  updateMap() {
    this.stateT++;
    if (Input.just('back') || Input.just('special')) { Sound.sfx('move'); this.setState('base'); return; }
    const dirs = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const [key, [dx, dy]] of Object.entries(dirs)) {
      if (!Input.just(key)) continue;
      const cur = SECTORS[this.mapSel];
      let best = -1, bd = Infinity;
      SECTORS.forEach((S, i) => {
        const vx = S.x - cur.x, vy = S.y - cur.y, along = vx * dx + vy * dy;
        if (along <= 0) return;
        const d = along + Math.abs(vx * dy - vy * dx) * 2;
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0) { this.mapSel = best; Sound.sfx('move'); }
    }
    if (this.stateT > 10 && (Input.just('fire') || Input.just('start'))) {
      const S = SECTORS[this.mapSel];
      if (S.id === this.camp.sector) { Sound.sfx('select'); this.setState('base'); }
      else if (this.isUnlocked(S.id)) { Sound.sfx('select'); this.startTravel(this.camp.sector, S.id); }
      else Sound.sfx('denied');
    }
  },

  startTravel(from, to) {
    this.travel = { from, to };
    this.inBase = false;
    this.setState('travel');
    Sound.playSong(Sound.SONGS.base);
  },

  updateTravel() {
    this.stateT++;
    const T = this.travel, dur = T.from === T.to ? 70 : 150;
    const skip = this.stateT > 20 && (Input.just('fire') || Input.just('start'));
    if (this.stateT >= dur || skip) {
      this.camp.sector = T.to;
      this.travel = null;
      this.arriveBase();
    }
  },

  drawMap(ctx, carrierAt) {
    const c = this.camp, center = { align: 'center' };
    NES.text(ctx, 'GALAXY MAP', 128, 8, C.gold, center);
    // routes
    for (const S of SECTORS) {
      for (const id of S.links) {
        const O = SECTOR_BY_ID[id];
        if (O.x < S.x || (O.x === S.x && O.y < S.y)) continue;   // draw each link once
        const open = this.isUnlocked(S.id) && this.isUnlocked(O.id);
        ctx.fillStyle = open ? C.navy : C.black;
        const n = Math.ceil(Math.hypot(O.x - S.x, O.y - S.y) / 4);
        for (let k = 1; k < n; k++) {
          ctx.fillStyle = open ? ((k + (this.t >> 3)) % 3 ? C.blue : C.sky) : C.gray;
          if (open || k % 2) ctx.fillRect(Math.round(S.x + (O.x - S.x) * k / n), Math.round(S.y + (O.y - S.y) * k / n), 1, 1);
        }
      }
    }
    SECTORS.forEach((S, i) => {
      const open = this.isUnlocked(S.id), done = this.sectorCleared(S.id);
      NES.disc(ctx, S.x, S.y, 5, open ? S.col : C.gray);
      NES.disc(ctx, S.x - 1, S.y - 1, 2, open ? C.white : C.lgray);
      NES.text(ctx, open ? S.short : '???', S.x, S.y + 10, open ? (done ? C.lime : C.white) : C.gray, center);
      if (done) NES.text(ctx, 'CLEAR', S.x, S.y + 19, C.lime, center);
      if (i === this.mapSel && this.state === 'map' && (this.t >> 3) & 1) {
        NES.text(ctx, '[', S.x - 13, S.y - 3, C.gold);
        NES.text(ctx, ']', S.x + 9, S.y - 3, C.gold);
      }
    });
    const at = carrierAt || SECTOR_BY_ID[c.sector];
    this.drawCarrierIcon(ctx, at.x, at.y - 12);
  },

  drawMapScreen(ctx) {
    this.drawMap(ctx);
    const S = SECTORS[this.mapSel], c = this.camp, center = { align: 'center' };
    NES.box(ctx, 8, 180, 240, 38, C.black, S.col);
    if (this.isUnlocked(S.id)) {
      const n = S.planets.filter(P => c.cleared[P.id]).length;
      NES.text(ctx, S.name, 14, 185, S.col);
      NES.text(ctx, n + '/' + S.planets.length + ' PLANETS', 242, 185, C.white, { align: 'right' });
      NES.text(ctx, 'STARBASE: ' + S.base, 14, 196, C.lgray);
      if (S.hull >= 0) NES.text(ctx, 'SELLS: ' + HULLS[S.hull].name, 14, 206, C.aqua);
    } else {
      NES.text(ctx, 'UNCHARTED SECTOR', 14, 185, C.gray);
      NES.text(ctx, 'CLEAR A LINKED SECTOR FIRST.', 14, 196, C.lgray);
    }
    const here = S.id === c.sector;
    NES.text(ctx, here ? 'A: DOCK   B: BACK' : 'A: TRAVEL   B: BACK', 128, 226, C.gray, center);
  },

  drawTravel(ctx) {
    const T = this.travel, A = SECTOR_BY_ID[T.from], B = SECTOR_BY_ID[T.to];
    const dur = T.from === T.to ? 70 : 150;
    const k = Math.min(1, this.stateT / (dur - 30));
    const e = k * k * (3 - 2 * k);
    this.drawMap(ctx, { x: A.x + (B.x - A.x) * e, y: A.y + (B.y - A.y) * e });
    const msg = k < 1 && T.from !== T.to ? 'JUMPING TO ' + B.name : 'DOCKING AT ' + B.base;
    NES.box(ctx, 8, 190, 240, 20, C.black, B.col);
    if ((this.t >> 3) & 1 || k >= 1) NES.text(ctx, msg, 128, 196, C.white, { align: 'center' });
  },

  // Full-screen campaign screens.
  drawMenuScreen(ctx) {
    switch (this.state) {
      case 'base': this.drawBase(ctx); break;
      case 'map': this.drawMapScreen(ctx); break;
      case 'travel': this.drawTravel(ctx); break;
      case 'sortie': this.drawSortie(ctx); break;
      case 'debrief': this.drawDebrief(ctx); break;
      case 'learn': this.drawLearn(ctx); break;
    }
  },

  // Briefing and loadout at the starbase: the station behind the dialogue.
  drawInBase(ctx) {
    this.drawBaseScene(ctx, 118);
    if (this.state === 'intro') this.drawIntro(ctx);
    else if (this.state === 'hangar') this.drawHangar(ctx);
    if (this.radio) this.drawRadio(ctx);
  },

  drawSortie(ctx) {
    const P = this.mission.planet, T = this.stateT;
    const r = Math.min(70, 8 + T * 0.4);
    const px = 256 - Math.min(40, T * 0.3);
    NES.disc(ctx, px, 120, r, P.disc[0]);
    for (let j = -r + 4; j <= r; j += 11) {   // cloud bands
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - j * j)));
      ctx.fillStyle = P.disc[1];
      ctx.fillRect(Math.round(px - w), Math.round(120 + j), w * 2, 4);
    }
    this.drawCarrierSide(ctx, 90 + Math.sin(T * 0.05) * 4, 124 + Math.sin(T * 0.03) * 3, true);
    NES.text(ctx, 'EN ROUTE TO ' + P.name, 128, 20, C.white, { align: 'center' });
    if (T > 20 && (this.t >> 4) & 1) NES.text(ctx, 'A: SKIP', 128, 222, C.gray, { align: 'center' });
  },
});
