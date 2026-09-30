'use strict';
// Open-world campaign. The space carrier flies between planets (world.js has the galaxies, systems
// and planets; starmap.js has the maps and travel) and docks at each planet's orbital station
// (starbase.js). Every planet offers a few missions. A mission is one or more legs:
//   normal / challenge: a vertical Galaga-style stage     side / raid: a side-scrolling stage
//   the STRONGHOLD: two legs ending in a boss (order 'vs' = vertical approach, then a side assault
//   ending at a boss warship (bosses.js); 'sv' = side approach, then a capital-ship flyover (capital.js))
// The ship takes off from the carrier before each leg and lands on it after (carrier.js).

// XP needed to reach each level (index 0 = level 1). Every level-up trains a stat, then teaches a
// special (even levels) or a passive skill (odd levels); see skills.js.
const LEVELS = Array.from({ length: 30 }, (_, i) => Math.round((100 * i + 45 * i * i) / 10) * 10);
const round10 = v => Math.round(v / 10) * 10;

Object.assign(Game, {
  debrief: null,

  // ---- Lookups --------------------------------------------------------------------
  hereId() { return this.mission ? this.mission.planet.id : this.camp ? this.camp.at : 'earth'; },
  planetHere() { return PLANET_BY_ID[this.hereId()]; },
  systemDef() { return SYSTEM_BY_ID[this.planetHere().sys]; },
  galaxyDef() { return GALAXIES[this.systemDef().galIndex]; },
  planetDef() { return this.mission ? this.mission.planet : null; },
  planetSky() { return this.planetHere().sky; },
  missionBoss() { const P = this.planetDef(); return (P && P.boss) || this.systemDef().boss; },
  missionCapital() { const P = this.planetDef(); return (P && P.capital) || this.systemDef().capital; },
  systemSideKinds() { return this.systemDef().sideKinds; },
  isFinale() {
    const M = this.mission;
    return !!M && M.planet.id === 'citadel' && M.kind === 'strike' && M.leg === M.legs.length - 1;
  },

  // A system may swap some enemy types for its own.
  mixType(type) {
    for (const [nt, chance] of this.systemDef().swap[type] || []) if (Math.random() < chance) return nt;
    return type;
  },

  // ---- Progress -------------------------------------------------------------------------
  missionDone(P, i) { return !!this.camp.cleared[P.id + ':' + i]; },
  // The stronghold (last mission) opens once every other mission on the planet is flown.
  missionOpen(P, i) { return i < P.missions.length - 1 || P.missions.slice(0, -1).every((k, j) => this.missionDone(P, j)); },
  planetCleared(P) { return P.missions.every((k, i) => this.missionDone(P, i)); },
  systemClearedCount(S) { return S.planets.filter(P => this.planetCleared(P)).length; },
  systemNeed(S) { return Math.ceil(S.planets.length / 2); },
  systemSecured(S) { return this.systemClearedCount(S) >= this.systemNeed(S); },
  systemCleared(S) { return S.planets.every(P => this.planetCleared(P)); },
  galaxyOpen(G) { return G.index === 0 || GALAXIES[G.index - 1].systems.every(S => this.systemSecured(S)); },
  systemOpen(S) {
    const G = GALAXIES[S.galIndex];
    if ((this.camp.opened || []).includes(S.id)) return true;   // reached in a version 1 save
    if (!this.galaxyOpen(G)) return false;
    return S === G.systems[0] || S.links.some(id => this.systemSecured(SYSTEM_BY_ID[id]));
  },
  systemsSecured() { return SYSTEMS.filter(S => this.systemSecured(S)).length; },

  // Difficulty number for the stage formulas: it grows with where you fly (the system's place in the
  // galaxy chain, and the planet's place in its system), like the zones of an open-world game.
  difficulty(boss) {
    const S = this.systemDef(), P = this.planetHere();
    return 1 + Math.round(S.tier * 1.4 + P.index * 0.3) + (boss ? 1 : 0) + this.camp.loop * 8;
  },
  // Enemy toughness: later galaxies field sturdier machines (weapons stats keep climbing too).
  hpMul() { return 1 + this.systemDef().galIndex * 0.6 + (this.camp ? this.camp.loop * 0.5 : 0); },

  // ---- Campaign start, save and load --------------------------------------------------
  newCamp(pilot) {
    return { v: 2, pilot, hull: 0, hulls: [0], up: {}, train: { weapons: 0, shields: 0, special: 0 }, money: 0, xp: 0,
      level: 1, learned: [], passives: [], pending: ['starter'], cleared: {}, at: 'earth', loop: 0, beats: [], seen: [], score: 0 };
  },

  newCampaign(pilot) {
    this.pilot = pilot;
    this.camp = this.newCamp(pilot);
    this.resetRun(0);
    this.startTravel('earth', 'earth');
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
    if (c && c.v === 1) c = this.migrateSave(c);
    if (!c || c.v !== 2 || !PILOTS[c.pilot] || !PLANET_BY_ID[c.at] || !HULLS[c.hull]) {
      Sound.sfx('denied');
      this.toast('SAVE DATA UNREADABLE');
      return;
    }
    this.camp = c;
    this.pilot = c.pilot;
    this.resetRun(c.score || 0);
    this.startTravel(c.at, c.at);
  },

  // Version 1 saves (six sectors, one mission per planet): cleared planets keep every mission cleared,
  // the carrier moves to the old sector's first planet, and the pilot picks a starting passive.
  migrateSave(o) {
    if (!o || !PILOTS[o.pilot]) return null;
    const c = this.newCamp(o.pilot);
    c.at = { sol: 'earth', acen: 'proxima', barn: 'hive', sirius: 'agouti', tau: 'taue', eps: 'aegir' }[o.sector] || 'earth';
    for (const id of Object.keys(o.cleared || {})) {
      const P = PLANET_BY_ID[id];
      if (P) P.missions.forEach((k, i) => { c.cleared[id + ':' + i] = true; });
    }
    Object.assign(c, { hull: o.hull || 0, hulls: o.hulls || [0], up: { ...(o.up || {}) }, money: o.money || 0, xp: o.xp || 0,
      level: o.level || 1, learned: o.learned || [], loop: o.loop || 0, beats: o.beats || [], score: o.score || 0 });
    for (let i = 0; i < (o.learnQ || 0); i++) c.pending.push('special');
    c.opened = [...new Set([c.at, ...Object.keys(o.cleared || {})].filter(id => PLANET_BY_ID[id]).map(id => PLANET_BY_ID[id].sys))];
    return c;
  },

  // Dev shortcut (?stage=N): planet ceil(N/2) in map order (PLANETS), its stronghold; odd N = first
  // leg, even N = the boss leg. ?passives=drone,rear and ?hull=N set up the test ship.
  testLeg(n, q) {
    const k = clamp(Math.ceil(n / 2), 1, PLANETS.length) - 1, P = PLANETS[k];
    this.pilot = 0;
    this.camp = this.newCamp(0);
    const passives = (q.get('passives') || '').split(',').filter(id => PASSIVES.some(s => s.id === id));
    Object.assign(this.camp, { test: true, at: P.id, learned: SPECIALS.map((s, i) => i), passives, pending: [],
      hull: clamp(parseInt(q.get('hull'), 10) || 0, 0, HULLS.length - 1) });
    this.camp.hulls = [this.camp.hull];
    for (let i = 0; i < k; i++) PLANETS[i].missions.forEach((m, j) => { this.camp.cleared[PLANETS[i].id + ':' + j] = true; });
    this.resetRun(0);
    this.mission = this.makeMission(P, P.missions.length - 1);
    this.special = { idx: 0, ammo: 0, cd: 0 };
    this.startLeg(n % 2 ? 0 : this.mission.legs.length - 1);
  },

  // ---- Starbase arrival ------------------------------------------------------------------
  arriveBase() {
    this.mission = null;
    this.inBase = true;
    this.carrier = null; this.boss = null;
    this.enemies = []; this.eBul = []; this.pBul = []; this.pickups = [];
    this.radio = null; this.radioQ = [];
    this.stageType = 'normal'; this.special = null; this.wingT = 0; this.tetT = 0; this.laser = null;
    this.clearSpecialFx();
    const p = this.player, c = this.camp;
    p.alive = true; p.hidden = true; p.silenced = [false, false, false]; p.silenceT = [0, 0, 0];
    this.baseUI = { page: 'main', sel: 0, top: 0 };
    this.saveCampaign();
    this.setState('base');
    Sound.playSong(Sound.SONGS.base);
    if (c.pending.length) { this.openLearn(); return; }   // level-up choices first (skills.js)
    const G = this.galaxyDef();
    if (!c.seen.includes(G.id)) {                           // first visit to a galaxy: Mira's briefing
      c.seen.push(G.id);
      const B = GALAXY_STORY[G.id];
      if (B && !c.loop) this.startBriefing(G.name, B.title, B.pages, () => this.setState('base'));
    }
  },

  // ---- Missions ---------------------------------------------------------------------------
  makeMission(P, mi) {
    const kind = P.missions[mi];
    let legs = MISSION_KINDS[kind].legs.map(type => ({ type }));
    if (kind === 'strike') {
      legs = P.order === 'sv' ? [{ type: 'side' }, { type: 'capital', boss: true }]
        : [{ type: P.approach || 'normal' }, { type: 'side', boss: true }];
    }
    return { sys: P.sys, planet: P, mi, kind, legs, leg: 0, score0: this.score, bonusCr: 0, replay: this.missionDone(P, mi) };
  },

  startMission(mi) {
    const P = this.planetHere(), S = this.systemDef();
    this.mission = this.makeMission(P, mi);
    this.nextAdapt = -1;
    const B = this.planetBriefing(S, P, this.mission.kind);
    this.startBriefing(P.name, B.title, B.pages, () => this.openLoadout());
    Sound.playSong(Sound.SONGS.stage);
  },

  openLoadout() {
    if (this.camp.learned.length) { this.openHangar(); return; }
    this.special = null;
    this.startSortie();
  },

  // Cutscene: the carrier leaves orbit and flies down toward the planet.
  startSortie() {
    this.setState('sortie');
    Sound.sfx('takeoff');
  },

  updateSortie() {
    this.stateT++;
    const skip = this.stateT > 20 && (Input.just('fire') || Input.just('start'));
    if (this.stateT > 170 || skip) this.startLeg(0);
  },

  startLeg(i) {
    const M = this.mission, L = M.legs[i];
    M.leg = i;
    this.inBase = false;
    this.legBoss = !!L.boss;
    this.raid = L.type === 'raid';
    this.stage = this.difficulty(L.boss);
    this.setupStage(this.raid ? 'side' : L.type);
    if (Sound.current !== Sound.SONGS.mission) Sound.playSong(Sound.SONGS.mission);   // keep the groove across legs
    this.startTakeoff();
    if (i > 0) this.say('APPROACH CLEAR. REARMED AND REFUELED. NOW THE ASSAULT ON ' + M.planet.name + '.', 'mira');
  },

  // A leg's enemies (or boss) are gone: head back to the carrier.
  legDone() { this.startLanding(); },

  afterLanding() {
    const M = this.mission;
    if (M.leg < M.legs.length - 1) this.startLeg(M.leg + 1);
    else this.missionComplete();
  },

  missionFailed() {
    saveHi(this.hi);
    this.toast('MISSION FAILED');
    this.arriveBase();
  },

  // ---- Rewards -----------------------------------------------------------------------------
  missionComplete() {
    const c = this.camp, M = this.mission, S = this.systemDef(), P = M.planet, K = MISSION_KINDS[M.kind];
    const mult = (M.replay ? 0.5 : 1) * (1 + c.loop * 0.5);
    const payMul = (1 + 0.1 * this.upLevel('broker')) * (this.hasPassive('salvage') ? 1.2 : 1);
    const xpMul = this.hasPassive('study') ? 1.2 : 1;
    const pay = round10((500 + 140 * S.tier) * K.pay * mult * payMul);
    const combat = round10(((this.score - M.score0) / 40 + M.bonusCr) * payMul);
    const xp = Math.round((120 + 25 * S.tier) * K.pay * mult * xpMul);
    const lines = [['MISSION PAY', pay + ' CR'], ['COMBAT PAY', combat + ' CR'], ['EXPERIENCE', xp + ' XP']];
    let money = pay + combat, gain = xp;
    const openBefore = SYSTEMS.filter(q => this.systemOpen(q)).map(q => q.id);
    const galBefore = GALAXIES.filter(g => this.galaxyOpen(g)).map(g => g.id);
    const was = { planet: this.planetCleared(P), secured: this.systemSecured(S), cleared: this.systemCleared(S) };
    c.cleared[P.id + ':' + M.mi] = true;
    const bonus = (label, m, x) => {
      m = round10(m * (1 + c.loop * 0.5) * payMul); x = Math.round(x * xpMul);
      money += m; gain += x;
      lines.push([label, m + ' CR'], ['', x + ' XP']);
    };
    const planetClear = !was.planet && this.planetCleared(P);
    if (planetClear) bonus('PLANET BONUS', 300 * (1 + S.tier * 0.3), 60 + 10 * S.tier);
    const secured = !was.secured && this.systemSecured(S);
    if (secured) bonus('SYSTEM BONUS', S.bonus.money, S.bonus.xp);
    const liberated = !was.cleared && this.systemCleared(S);
    if (liberated) bonus('LIBERATION', S.bonus.money / 2, S.bonus.xp / 2);
    const unlocked = [...GALAXIES.filter(g => !galBefore.includes(g.id) && this.galaxyOpen(g)).map(g => 'GALAXY: ' + g.name),
      ...SYSTEMS.filter(q => !openBefore.includes(q.id) && this.systemOpen(q)).map(q => 'SYSTEM: ' + q.name)];
    c.money += money;
    c.xp += gain;
    const levels = this.gainLevels();
    this.debrief = { planet: P.name, kind: K.name, lines, total: money, levels, unlocked, planetClear, secured, liberated,
      system: S.name, finale: this.isFinale() };
    this.setState('debrief');
    Sound.playSong(Sound.SONGS.victory);
  },

  updateDebrief() {
    this.stateT++;
    if (this.stateT === 150 && this.debrief.levels.length) Sound.sfx('levelup');
    if (this.stateT === 60) Sound.sfx('cash');
    if (this.stateT < 90 || !(Input.just('fire') || Input.just('start'))) return;
    Sound.sfx('select');
    if (this.camp.pending.length) this.openLearn();
    else this.leaveDebrief();
  },

  leaveDebrief() {
    if (this.debrief && this.debrief.finale) { this.debrief = null; this.mission = null; this.startEnding(); return; }
    this.debrief = null;
    this.arriveBase();
  },

  drawDebrief(ctx) {
    const D = this.debrief, c = this.camp, center = { align: 'center' };
    NES.box(ctx, 2, 2, 252, 236, C.black, C.gold);
    NES.text(ctx, D.planet, 128, 10, C.gold, { align: 'center', scale: 2, shadow: C.navy });
    NES.text(ctx, D.kind + ' COMPLETE', 128, 30, C.white, center);
    D.lines.forEach(([a, b], i) => {
      if (this.stateT < 20 + i * 12) return;
      NES.text(ctx, a, 32, 44 + i * 10, C.aqua);
      NES.text(ctx, b, 224, 44 + i * 10, C.white, { align: 'right' });
    });
    let y = 48 + D.lines.length * 10;
    if (this.stateT >= 60) {
      NES.text(ctx, 'CREDITS', 32, y, C.gold);
      NES.text(ctx, c.money + ' CR', 224, y, C.gold, { align: 'right' });
      y += 11;
      this.drawXpBar(ctx, 32, y);
      y += 14;
    }
    if (this.stateT >= 150) {
      const msgs = [];
      if (D.levels.length) msgs.push(['LEVEL UP! LV ' + D.levels[D.levels.length - 1], C.lime, true]);
      if (D.planetClear) msgs.push([D.planet + ' CLEARED!', C.gold]);
      if (D.secured) msgs.push([D.system + ' SECURED!', C.gold]);
      if (D.liberated) msgs.push([D.system + ' LIBERATED!', C.gold]);
      for (const u of D.unlocked) msgs.push(['NEW ' + u, C.pink]);
      for (const [m, col, blink] of msgs.slice(0, 5)) {
        if (!blink || (this.t >> 3) & 1) NES.text(ctx, m, 128, y, col, center);
        y += 10;
      }
    }
    if (this.stateT >= 90 && (this.t >> 4) & 1) NES.text(ctx, 'PRESS SPACE / A', 128, 226, C.white, center);
  },

  // XP bar toward the next level.
  drawXpBar(ctx, x, y, w = 120) {
    const c = this.camp;
    NES.text(ctx, 'LV ' + c.level, x, y, C.lime);
    const lo = LEVELS[c.level - 1], hi = LEVELS[c.level];
    if (hi === undefined) { this.drawBar(ctx, x + 40, y + 1, w, 5, 1, C.lime, '#082008'); NES.text(ctx, 'MAX', x + w + 72, y, C.lime, { align: 'right' }); return; }
    this.drawBar(ctx, x + 40, y + 1, w, 5, (c.xp - lo) / (hi - lo), C.lime, '#082008');
    NES.text(ctx, String(c.xp), x + w + 72, y, C.white, { align: 'right' });
  },

  // After the finale's epilogue: the Echo campaign (New Game+). The galaxies reset, everything else stays.
  startNewGamePlus() {
    const c = this.camp;
    c.loop++;
    c.cleared = {};
    c.beats = [];
    const from = c.at;
    c.at = 'earth';
    this.startTravel(from, 'earth');
  },

  // Full-screen campaign screens.
  drawMenuScreen(ctx) {
    switch (this.state) {
      case 'base': this.drawBase(ctx); break;
      case 'sortie': this.drawSortie(ctx); break;
      case 'map': this.drawMapScreen(ctx); break;
      case 'travel': this.drawTravel(ctx); break;
      case 'debrief': this.panel(ctx, () => this.drawDebrief(ctx)); break;
      case 'learn': this.panel(ctx, () => this.drawLearn(ctx)); break;
    }
  },

  // Briefing and loadout at the starbase: the station behind the dialogue.
  drawInBase(ctx) {
    this.drawBaseScene(ctx, 118);
    this.panel(ctx, () => {
      if (this.state === 'intro') this.drawIntro(ctx);
      else if (this.state === 'hangar') this.drawHangar(ctx);
      if (this.radio) this.drawRadio(ctx);
    });
  },

  drawSortie(ctx) {
    const P = this.mission.planet, T = this.stateT;
    const r = Math.round(Math.min(70, 8 + T * 0.4));
    const px = W - 20 - Math.min(60, T * 0.4), sc = this.scenery(P);
    SNES.add(ctx, () => {   // atmosphere: a glow a little larger than the planet
      const g = SNES.glow(40, SNES.mix(sc.haze, '#000000', 0.45)), d = (r + 8) * 2 + 1;
      ctx.drawImage(g, Math.round(px - d / 2), Math.round(120 - d / 2), d, d);
    });
    SNES.globe(ctx, sc.floor, px, 120, r, T * 0.004);
    const s = 0.5 - Math.min(0.2, T * 0.0015);   // the carrier shrinks into the distance
    this.drawCarrierSide(ctx, 30 + T * 0.35 + Math.sin(T * 0.05) * 4, 132 - CAR.sh * s / 2 + Math.sin(T * 0.03) * 3, true, s);
    NES.text(ctx, 'EN ROUTE TO ' + P.name, CX, 20, C.white, { align: 'center' });
    if (T > 20 && (this.t >> 4) & 1) NES.text(ctx, 'A: SKIP', CX, 222, C.gray, { align: 'center' });
  },
});
