'use strict';
// Side-mission bosses: grounded warships. At the end of an assault a battleship, Star Destroyer or
// drone carrier sits on its landing legs, bow toward you, and the scroll stops when it arrives. To win,
// destroy every target on it: gun turrets, missile launchers, fighter hangars, radar masts and reactor
// cores. Each sector's ship adds a twist through its shield rule, and some rebuild a turret. Vertical
// boss fights are capital-ship flyovers (capital.js).
//
// The hull is painted once by the shipyard (shipyard.js), BASE_W x BASE_H with its bottom row on the
// ground. It is scenery: shots and the ship pass over it, and only the targets on it take hits. The
// painter returns target slots per kind; sx, sy are from the hull's left edge at ground level, so sy
// is negative (up). Turrets, launchers, radars, hangar lights and cores are drawn live on top.

const BASE_W = 340, BASE_H = 150;

// How many targets of each kind a layout mounts (the painter says where).
const BASE_LAYOUTS = {
  std: { turret: 4, launcher: 1, hangar: 1, radar: 1, core: 1 },        // four turrets and one core
  hive: { turret: 3, launcher: 1, hangar: 2, radar: 1, core: 1 },       // two drone hangars, a core it shields itself
  twinCore: { turret: 3, hangar: 1, radar: 1, core: 2 },                // two cores (X-Inactivator)
};
const BASE_PART = {   // hit radius, base hp, points
  turret: { r: 8, hp: 12, pts: 1000 }, launcher: { r: 8, hp: 14, pts: 1000 }, hangar: { r: 11, hp: 16, pts: 1500 },
  radar: { r: 7, hp: 8, pts: 800 }, core: { r: 11, hp: 40, pts: 3000 },
};

// shield: 'turrets'    = cores shielded while any turret stands
//         'launch'     = core shielded while the hangars launch a swarm
//         'swapCore'   = one core shielded at a time, picked at random (like X-inactivation)
//         'swapTurret' = one turret open at a time, in turn (like imprinting); cores as 'turrets'
const BOSSES = {
  bunker: { name: 'HISTONE BUNKER', style: 'battleship', layout: 'std', shield: 'turrets', launch: 'fighter', hp: 0.6,
    pal: { hull: '#6c7c5c', deck: '#4c5840', metal: '#a0ac90', trim: '#a83020' } },
  copier: { name: 'DNMT1 COPIER', style: 'destroyer', layout: 'std', shield: 'turrets', launch: 'splitter', hp: 0.65,
    pal: { hull: '#4c8c8c', deck: '#2c5c64', metal: '#8cc4c0', trim: '#d8e0e8' },
    regrow: true, intro: 'MY COPIER REBUILDS WHAT YOU BREAK. DNMT1 NEVER FORGETS A PATTERN.' },
  queen: { name: 'HIVE NEST', style: 'carrier', layout: 'hive', shield: 'launch', launch: 'drone', hp: 0.6,
    pal: { hull: '#8c7c40', deck: '#5c5030', metal: '#c0ac68', trim: '#e8c030' },
    intro: 'MY NEST. ITS DRONES WILL SWARM YOU WHILE THE CORE HIDES BEHIND THEM.' },
  xinact: { name: 'X-INACTIVATOR', style: 'battleship', layout: 'twinCore', shield: 'swapCore', launch: 'fighter', hp: 0.65,
    pal: { hull: '#9c5c3c', deck: '#6c3c2c', metal: '#c89c7c', trim: '#f0d0a0' },
    intro: 'TWO CORES, ONE SWITCHED OFF. WHICH ONE? EVEN I DO NOT KNOW.' },
  twins: { name: 'IMPRINT KEEP', style: 'destroyer', layout: 'std', shield: 'swapTurret', launch: 'fighter', hp: 0.65,
    pal: { hull: '#4c64a8', deck: '#2c3c70', metal: '#98a8d8', trim: '#80d0f8' },
    intro: 'ONLY ONE PARENT GETS TO SPEAK AT A TIME. GUESS WHICH.' },
  citadel: { name: "VOSS'S CITADEL", style: 'battleship', layout: 'std', shield: 'turrets', launch: 'methyl', hp: 1.1,
    pal: { hull: '#6c58a0', deck: '#403468', metal: '#a898d0', trim: '#e070d0' },
    regrow: true, fast: true, intro: 'MY CITADEL. EVERY WEAPON YOU HAVE SEEN, ALL AT ONCE.' },
};
const baseArt = {};   // baked once per boss

// Side profiles, bow left. Each paints the hull and returns its target slots [x, y] per kind (canvas
// coordinates; the ground is y = BASE_H), in the order they are used.
const BASE_STYLES = {
  // A Yamato-style battleship: flared bow with the wave-motion gun, red lower hull, triple turrets
  // fore and aft, the pagoda tower and funnel amidships, a hangar door aft.
  battleship(S, M) {
    const G = BASE_H, K = G - 26, D = G - 72;
    S.poly([[2, D - 2], [30, D], [338, D], [338, K - 8], [326, K], [64, K]], M.hull, 2);
    S.recolor(0, K - 16, BASE_W, 17, M.hull, M.trim);
    S.rect(26, D - 3, 312, 3, M.deck, 3);
    [[140, 226, 22], [150, 214, 36], [160, 204, 50], [168, 196, 62], [176, 188, 70]].forEach(([x0, x1, h], i) => {   // pagoda
      S.rect(x0, D - h, x1 - x0, h - (i ? 14 - i : 3), i % 2 ? M.hullL : M.metal, 3 + i);
      YARD.windows(S, x0 + 3, D - h + 3, x1 - x0 - 6, 5, i === 3 ? M.glass : M.black, 3, 1);
    });
    S.rect(181, D - 76, 2, 8, M.dark, 8);                                                   // mast
    S.rect(170, D - 64, 24, 2, M.metal, 8);                                                 // rangefinder
    S.poly([[226, D - 3], [250, D - 3], [256, D - 40], [232, D - 44]], M.metal, 4);          // funnel
    S.poly([[232, D - 44], [256, D - 40], [255, D - 36], [233, D - 40]], M.black);
    const turret = [[56, D - 6], [98, D - 12], [292, D - 6], [128, D - 26], [240, D - 50]];
    S.rect(84, D - 8, 28, 5, M.metal, 4);                                                    // raised barbette
    S.rect(116, D - 24, 24, 21, M.metal, 3);
    S.rect(252, D - 10, 22, 7, M.metal, 4);                                                  // launcher bed
    S.disc(14, D + 6, 9, M.metal, 3); S.disc(14, D + 6, 6, M.black);                         // bow muzzle
    for (const x of [284, 244]) { S.rect(x - 16, K - 44, 32, 28, M.metal, 3); S.rect(x - 14, K - 42, 28, 24, M.black); }
    S.disc(180, K - 34, 13, M.metal, 3);
    for (const x of [100, 282]) {                                                            // landing legs
      S.poly([[x - 7, K], [x + 7, K], [x + 13, G - 4], [x - 13, G - 4]], M.dark, 1);
      S.rect(x - 18, G - 5, 36, 5, M.metal, 1);
    }
    for (const y of [D + 8, D + 24]) S.rect(334, y, 5, 10, M.noz, 3);
    YARD.modules(S, 30, D, 300, K - D - 18, M.hull, M.mod, 3, 31, 10, 0.3);
    YARD.windows(S, 40, D + 8, 280, 8, M.lamp, 2, 1);
    YARD.plates(S, 0, 0, BASE_W, BASE_H, M.hull, M.hullL, M.seam, 24, 10, 32);
    return { turret, launcher: [[262, D - 14]], hangar: [[284, K - 30], [244, K - 30]], radar: [[182, D - 78]],
      core: [[180, K - 34], [14, D + 6]] };
  },

  // A Star Destroyer wedge: the prow low at the front, the deck climbing to a stepped superstructure
  // and the bridge tower at the stern.
  destroyer(S, M) {
    const G = BASE_H, K = G - 24, D = G - 70, top = x => (K - 22) + (x - 4) / 246 * (D - 8 - (K - 22));
    S.poly([[4, K - 22], [250, D - 8], [338, D - 8], [338, K], [20, K]], M.hull, 2);
    for (let x = 6; x < 250; x++) S.px(x, top(x) + 1, M.trim);
    S.rect(20, K - 6, 318, 6, M.deck, 2);
    [[236, 334, 20], [250, 326, 34], [264, 318, 46]].forEach(([x0, x1, h], i) => {
      S.rect(x0, D - 8 - h, x1 - x0, h, i === 1 ? M.metal : M.hullL, 3 + i);
      YARD.windows(S, x0 + 3, D - 5 - h, x1 - x0 - 6, 5, M.black, 2, 1);
    });
    S.rect(286, D - 64, 10, 12, M.metal, 6);                                                 // bridge neck
    S.rect(266, D - 72, 52, 10, M.metal, 7);                                                 // bridge
    YARD.windows(S, 268, D - 69, 48, 4, M.glass, 3, 1);
    for (const x of [276, 308]) S.disc(x, D - 74, 5, M.hullL, 8);                            // sensor domes
    const turret = [70, 120, 170, 215, 36].map(x => [x, top(x) - 5]);
    for (const [x, y] of turret) S.rect(x - 9, y + 3, 18, 4, M.metal, 3);
    S.rect(238, D - 31, 22, 3, M.metal, 5);
    for (const x of [150, 96]) { S.rect(x - 16, K - 30, 32, 24, M.metal, 3); S.rect(x - 14, K - 28, 28, 20, M.black); }
    S.disc(206, K - 30, 13, M.metal, 3); S.disc(304, D - 20, 11, M.metal, 4);
    for (const x of [80, 290]) {
      S.poly([[x - 7, K], [x + 7, K], [x + 13, G - 4], [x - 13, G - 4]], M.dark, 1);
      S.rect(x - 18, G - 5, 36, 5, M.metal, 1);
    }
    for (const y of [D + 4, D + 22, D + 40]) S.rect(334, y, 5, 10, M.noz, 3);
    YARD.modules(S, 10, D - 8, 330, K - D, M.hull, M.mod, 3, 33, 10, 0.4);
    YARD.modules(S, 230, D - 80, 110, 80, M.hullL, M.mod, 5, 34, 8, 0.5);
    YARD.plates(S, 0, 0, BASE_W, BASE_H, M.hull, M.hullL, M.seam, 22, 10, 35);
    return { turret, launcher: [[248, D - 35]], hangar: [[150, K - 18], [96, K - 18]], radar: [[292, D - 78]],
      core: [[206, K - 30], [304, D - 20]] };
  },

  // A drone carrier: a long flat-top with hangar bays along its side and the island aft.
  carrier(S, M) {
    const G = BASE_H, K = G - 26, D = G - 80;
    S.poly([[6, D + 6], [20, D - 6], [330, D - 6], [338, D], [338, K - 6], [326, K], [40, K], [6, K - 30]], M.hull, 2);
    S.rect(14, D - 10, 324, 4, M.deck, 3);
    YARD.windows(S, 18, D - 10, 316, 14, M.lamp, 1, 1);
    [[226, 290, 20], [232, 284, 34], [240, 276, 46]].forEach(([x0, x1, h], i) => {
      S.rect(x0, D - 10 - h, x1 - x0, h, i % 2 ? M.metal : M.hullL, 4 + i);
      YARD.windows(S, x0 + 3, D - 7 - h, x1 - x0 - 6, 4, i === 2 ? M.glass : M.black, 2, 1);
    });
    S.rect(256, D - 68, 3, 12, M.dark, 7);
    const hangar = [[60, K - 26], [120, K - 26], [180, K - 26]];
    for (const [x, y] of hangar) { S.rect(x - 18, y - 16, 36, 30, M.metal, 3); S.rect(x - 16, y - 14, 32, 26, M.black); }
    const turret = [[44, D - 14], [124, D - 14], [204, D - 14], [312, D - 14]];
    for (const [x, y] of turret) S.rect(x - 9, y + 2, 18, 3, M.metal, 4);
    S.rect(140, D - 16, 24, 6, M.metal, 4);
    S.disc(290, K - 28, 13, M.metal, 3); S.disc(232, K - 28, 11, M.metal, 3);
    for (const x of [90, 290]) {
      S.poly([[x - 7, K], [x + 7, K], [x + 13, G - 4], [x - 13, G - 4]], M.dark, 1);
      S.rect(x - 18, G - 5, 36, 5, M.metal, 1);
    }
    for (const y of [D + 6, D + 24]) S.rect(334, y, 5, 10, M.noz, 3);
    YARD.modules(S, 10, D - 6, 330, K - D, M.hull, M.mod, 3, 36, 10, 0.4);
    YARD.plates(S, 0, 0, BASE_W, BASE_H, M.hull, M.hullL, M.seam, 20, 10, 37);
    return { turret, launcher: [[152, D - 20]], hangar, radar: [[257, D - 70]], core: [[290, K - 28], [232, K - 28]] };
  },
};

Object.assign(Game, {
  bossArt(id) {
    if (baseArt[id]) return baseArt[id];
    const def = BOSSES[id], pal = def.pal, S = YARD.sheet(BASE_W, BASE_H);
    const M = {
      hull: S.mat(pal.hull), hullL: S.mat(SNES.mix(pal.hull, '#ffffff', 0.12)), seam: S.mat(pal.hull, { base: 1 }),
      deck: S.mat(pal.deck), metal: S.mat(pal.metal), trim: S.mat(pal.trim), dark: S.mat(SNES.mix(pal.deck, '#000000', 0.4)),
      noz: S.mat('#303440'), glass: S.mat('#f8d858', { flat: true }), black: S.mat('#080810', { flat: true }),
      lamp: S.mat('#f8e070', { flat: true }),
    };
    M.mod = { metal: S.mat(SNES.mix(pal.metal, pal.hull, 0.4)), light: S.mat(pal.metal), dark: M.dark, black: M.black };
    const slots = BASE_STYLES[def.style](S, M);
    const hull = S.bake({ shadow: 3 });
    // live parts: a gun housing, its barrels (pivoting on the image center, pointing left) and a missile rack
    const T = YARD.sheet(20, 10), tm = T.mat(pal.metal), td = T.mat(SNES.mix(pal.deck, '#000000', 0.3));
    T.poly([[2, 9], [4, 3], [8, 1], [14, 1], [18, 4], [19, 9]], tm, 1); T.rect(6, 4, 9, 1, td);
    const Bs = YARD.sheet(31, 5), bm = Bs.mat(SNES.mix(pal.deck, '#000000', 0.2));
    Bs.rect(1, 0, 15, 2, bm, 1); Bs.rect(3, 3, 13, 2, bm, 1);
    return (baseArt[id] = { hull, slots, housing: T.bake({ shadow: 1 }), barrels: Bs.bake({ shadow: 0 }) });
  },

  makeBoss(id) {
    const def = BOSSES[id], art = this.bossArt(id);
    const m = def.hp * (1 + Math.max(0, this.stage - 3) * 0.05);   // gentle growth with progress
    const parts = [];
    for (const [kind, n] of Object.entries(BASE_LAYOUTS[def.layout])) {
      art.slots[kind].slice(0, n).forEach(([x, y]) => {
        const P = BASE_PART[kind], hp = Math.max(1, Math.round(P.hp * m));
        parts.push({ kind, sx: x, sy: y - BASE_H, id: kind + parts.length, r: P.r, hp, max: hp, dead: false, x: 0, y: 0,
          cd: randi(60, 140), flash: 0, shielded: false, aim: Math.PI });
      });
    }
    this.lastBossName = def.name;
    return {
      id, def, hull: art.hull, art,
      x: W + 8, homeX: W - BASE_W - 8, t: 0, entering: true, dying: 0,
      parts, ringCd: 200, beamCd: 150, beamT: 0, beamAng: 0, beamDir: 1, phase2: false,
      swapT: 300, open: 0, shieldT: 0, regrow: null, regrew: false,
    };
  },

  bossCores() { return this.boss.parts.filter(q => q.kind === 'core'); },
  bossTurrets() { return this.boss.parts.filter(q => q.kind === 'turret'); },

  // The core the beam fires from: the first one that is alive and open.
  beamCore() {
    const cores = this.bossCores().filter(q => !q.dead);
    return cores.find(q => !q.shielded) || cores[0];
  },

  // Beam origin and direction for the core's sweeping silencer beam (it fires left).
  bossBeamRay() {
    const B = this.boss, core = this.beamCore();
    return { x: core.x - 8, y: core.y, dx: -Math.cos(B.beamAng), dy: Math.sin(B.beamAng) };
  },

  // Which parts are shielded right now, following the base's shield rule.
  updateBossShields() {
    const B = this.boss, rule = B.def.shield;
    const turrets = this.bossTurrets(), cores = this.bossCores();
    const turretsUp = turrets.some(q => !q.dead);
    if (rule === 'swapCore') {
      const live = cores.filter(q => !q.dead);
      if (--B.swapT <= 0) { B.swapT = randi(200, 330); B.open = Math.random() < 0.5 ? 0 : 1; Sound.sfx('charge'); }
      cores.forEach((q, i) => { q.shielded = live.length > 1 && i !== B.open; });
      return;
    }
    const liveTurrets = turrets.filter(q => !q.dead);
    if (rule === 'swapTurret' && liveTurrets.length > 1) {
      if (--B.swapT <= 0) { B.swapT = 240; B.open = (B.open + 1) % liveTurrets.length; Sound.sfx('charge'); }
      liveTurrets.forEach((q, i) => { q.shielded = i !== B.open % liveTurrets.length; });
    } else turrets.forEach(q => { q.shielded = false; });
    if (rule === 'launch') { for (const q of cores) q.shielded = B.shieldT > 0; return; }
    for (const q of cores) q.shielded = turretsUp;
  },

  updateBoss() {
    const B = this.boss, p = this.player, def = B.def;
    B.t++;
    for (const pt of B.parts) if (pt.flash > 0) pt.flash--;
    if (B.dying > 0) {
      if (B.dying % 5 === 0) {
        this.explode(B.x + rand(0, BASE_W), SIDE_GROUND - rand(0, BASE_H), 10);
        Sound.sfx('explode');
      }
      if (--B.dying === 0) this.bossDefeated();
      return;
    }
    if (B.entering) {   // rolls in with the ground, then the scroll stops
      B.x -= 1.5;
      if (B.x <= B.homeX) {
        B.x = B.homeX; B.entering = false; this.scrollLock = true;
        this.say(def.intro || VOSS.bossShield);
        this.hint('base');
      }
    }
    for (const pt of B.parts) {
      pt.x = B.x + pt.sx; pt.y = SIDE_GROUND + pt.sy;
      if (pt.kind === 'turret' && p.alive) pt.aim += clamp(angDiff(pt.aim, Math.atan2(p.y - pt.y, p.x - pt.x)), -0.04, 0.04);
    }
    if (B.shieldT > 0) B.shieldT--;
    this.updateBossShields();
    if (B.entering) return;

    // DNMT1 copies the pattern back: the first lost turret grows back once.
    if (B.regrow && --B.regrow.t <= 0) {
      const q = B.regrow.part;
      q.dead = false; q.hp = Math.round(q.max * 0.6); q.flash = 8;
      B.regrow = null;
      this.spark(q.x, q.y, C.cyan, 12);
      this.say('PATTERN RESTORED. THANK YOU, DNMT1.');
      Sound.sfx('restore');
    }

    // Attacks stay readable: small aimed spreads, slow missile fans, an occasional ring.
    const lvl = Math.min(this.stage / 5, 3) + (def.fast ? 0.5 : 0);
    for (const q of B.parts) {
      if (q.dead || --q.cd > 0) continue;
      if (q.kind === 'turret') {
        q.cd = Math.max(70, 120 - lvl * 12) + randi(0, 40);
        if (!q.shielded) this.spreadShot(q.x + Math.cos(q.aim) * 14, q.y + Math.sin(q.aim) * 14, lvl >= 2 ? 3 : 2, 0.3, 1.7 + lvl * 0.15);
      } else if (q.kind === 'launcher') {
        q.cd = 220 - lvl * 15;
        this.spreadShot(q.x, q.y - 6, 3, 0.35, 1.1 + lvl * 0.1);
        Sound.sfx('missile');
      } else if (q.kind === 'hangar') {
        q.cd = def.shield === 'launch' ? 300 : 420;
        this.bossLaunch(q);
      } else if (q.kind === 'core') {
        q.cd = q.shielded ? 260 : 200;
        this.ringShot(q.x, q.y, q.shielded ? 6 : 8, 1.2 + lvl * 0.1, B.t * 0.05);
      } else q.cd = 999;   // radar: just a target
    }
    const exposed = this.bossCores().some(q => !q.dead && !q.shielded);
    if (!exposed && !B.phase2) return;
    if (!B.phase2) { B.phase2 = true; B.beamCd = 120; if (def.shield === 'turrets') this.say(VOSS.bossPhase2); }
    if (B.beamT > 0) {
      B.beamT--;
      if (B.beamT < 140) {
        const k = 1 - B.beamT / 140;
        B.beamAng = B.beamDir * (-0.6 + 1.2 * k);
        if (B.beamT % 10 === 0) Sound.sfx('beam');
        this.checkBossBeam();
      }
    } else if (--B.beamCd <= 0 && this.beamCore()) {
      B.beamCd = def.fast ? 360 : 440;
      B.beamT = 180;
      // sweep starts away from the player and crosses them
      B.beamDir = p.y > this.beamCore().y ? -1 : 1;
      B.beamAng = -0.6 * B.beamDir;
      Sound.sfx('charge');
    }
  },

  // A hangar launches escorts. The Hive shields its core while a swarm is out.
  bossLaunch(q) {
    const B = this.boss, type = B.def.launch, swarm = B.def.shield === 'launch';
    if (this.enemies.length >= 8) return;
    if (swarm) { B.shieldT = 120; this.popup(q.x, q.y - 16, 'SWARM!', C.gold); }
    const n = swarm ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const kind = type === 'methyl' && i === 0 && this.enemies.every(e => e.type !== 'methyl') ? 'methyl'
        : type === 'methyl' ? 'fighter' : type;
      this.spawnSideEnemy(kind, kind === 'methyl' ? 'methyl' : 'swoop', q.x - 12 - i * 10, q.y - i * 8);
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
    if (B.dying || B.x > W) return;
    for (const pt of B.parts) {
      if (pt.dead || Math.hypot(b.x - pt.x, b.y - pt.y) >= pt.r + 2) continue;
      b.dead = true;
      this.damageBossPart(pt, b.dmg, b.form, b.x, b.y);
      return;
    }
  },

  damageBossPart(pt, d, form, hx, hy) {
    const B = this.boss;
    if (form >= 0 && this.adapt === form) { d *= 0.5; this.spark(hx, hy, C.lgray); }
    this.hitsTotal++;
    if (pt.shielded) {
      // The shield soaks most of the damage, and a shielded part can't fall.
      this.spark(hx, hy, C.aqua);
      Sound.sfx('tink');
      pt.hp = Math.max(pt.max * 0.5, pt.hp - d * 0.4);
      pt.flash = 2;
      if (this.t - (B.hintT || -999) > 150) {
        B.hintT = this.t;
        const hint = { turrets: 'SHIELDED! TURRETS FIRST', launch: 'SHIELDED! WAIT FOR IT',
          swapCore: 'SHIELDED! HIT THE OPEN CORE', swapTurret: 'SHIELDED! HIT THE OPEN ONE' }[B.def.shield];
        this.popup(clamp(pt.x - 30, 104, W - 104), clamp(pt.y - 14, 20, 200), hint, C.aqua);
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
    this.explode(pt.x, pt.y, pt.kind === 'core' ? 24 : 16);
    Sound.sfx('boom');
    if (pt.kind === 'turret' && B.def.regrow && !B.regrew) { B.regrew = true; B.regrow = { part: pt, t: 300 }; }
    const pts = BASE_PART[pt.kind].pts;
    this.addScore(pts);
    this.popup(pt.x, pt.y - 8, String(pts), C.gold);
    if (B.parts.every(q => q.dead) && !B.regrow) {   // every target down: the base goes up
      B.dying = 120;
      B.beamT = 0;
      this.eBul = [];
    }
  },

  bossDefeated() {
    const B = this.boss, p = this.player;
    this.addScore(20000);
    this.popup(B.x + BASE_W / 2, SIDE_GROUND - 60, '20000', C.gold);
    for (let i = 0; i < 6; i++) {
      this.booms.push({ x: B.x + rand(0, BASE_W), y: SIDE_GROUND - rand(0, BASE_H), n: 16, delay: i * 6 });
    }
    for (const e of this.enemies) { e.dead = true; this.explode(e.x, e.y, 8); }
    this.enemies = [];
    this.eBul = [];
    this.boss = null;
    this.scrollLock = false;
    this.say(this.isFinale() ? VOSS.finalDown : VOSS.bossDown);
    p.silenced = [false, false, false];
    p.silenceT = [0, 0, 0];
    this.nextAdapt = this.computeAdapt();
    this.bossWin = true;
    this.clearDelay = 300;
    this.setState('clear');
    Sound.playSong(Sound.SONGS.victory);
  },

  drawBoss(ctx) {
    const B = this.boss, A = B.art;
    const bx = Math.round(B.x), gy = SIDE_GROUND;
    SNES.half(ctx, () => { ctx.fillStyle = '#000010'; ctx.fillRect(bx + 10, gy - 2, BASE_W - 10, 4); }, 0.5);   // ground shadow
    ctx.drawImage(B.hull, bx, gy - BASE_H);
    for (const q of B.parts) {
      const x = Math.round(q.x), y = Math.round(q.y);
      if (q.dead) {
        NES.disc(ctx, x, y, q.kind === 'core' ? 8 : 5, C.black);
        if ((this.t >> 2) & 1) { ctx.fillStyle = C.red; ctx.fillRect(x - 1, y, 2, 1); }
        if (this.t % 12 === 0) this.parts.push({ x: x + rand(-3, 3), y, vx: 0, vy: -0.4, life: 20, max: 20, cols: [C.gray, C.lgray], sz: 2 });
        continue;
      }
      const white = q.flash > 0;
      if (q.kind === 'turret') {   // a gun housing whose twin barrels swing to track you
        SNES.drawRot(ctx, A.barrels, x, y - 1, q.aim - Math.PI);
        NES.draw(ctx, A.housing, x, y + 1);
        ctx.fillStyle = (this.t >> 3) & 1 ? C.red : C.darkred; ctx.fillRect(x - 1, y, 2, 1);
        if (white) SNES.add(ctx, () => NES.draw(ctx, SNES.glow(9, '#a0a0a0'), x, y));
      } else if (q.kind === 'launcher') {
        ctx.fillStyle = '#303440'; ctx.fillRect(x - 9, y + 1, 19, 4);
        for (let k = -6; k <= 6; k += 6) {   // missile rack, reloading after each salvo
          const up = Math.min(8, Math.max(0, 8 - (q.cd - 180) / 4));
          ctx.fillStyle = C.lgray; ctx.fillRect(x + k - 1, y + 1 - up, 3, up);
          ctx.fillStyle = C.red; ctx.fillRect(x + k - 1, y - up, 3, 1);
        }
        if (white) SNES.add(ctx, () => NES.draw(ctx, SNES.glow(9, '#a0a0a0'), x, y));
      } else if (q.kind === 'hangar') {
        ctx.fillStyle = (this.t >> 3) & 1 ? C.yellow : C.orange;
        for (let k = -10; k <= 10; k += 5) ctx.fillRect(x + k, y - 13, 1, 1);
        if (white) SNES.half(ctx, () => { ctx.fillStyle = C.white; ctx.fillRect(x - 14, y - 12, 28, 24); }, 0.6);
      } else if (q.kind === 'radar') {
        const w = Math.round(Math.abs(Math.cos(this.t * 0.05)) * 7) + 1;   // spinning dish
        ctx.fillStyle = C.gray; ctx.fillRect(x, y, 1, 8);
        ctx.fillStyle = white ? C.white : C.lgray; ctx.fillRect(x - w, y - 2, w * 2 + 1, 3);
        ctx.fillStyle = C.red; ctx.fillRect(x, y - 4, 1, 2);
      } else this.drawBossCore(ctx, B, q);
      if (q.shielded && q.kind !== 'core') this.drawShieldRing(ctx, x, y, 10);
    }
    if (B.beamT > 0 && B.beamT < 140 && this.beamCore()) {
      const r = this.bossBeamRay();
      const cols = [C.lime, C.aqua, C.white];
      for (let s = 0; s < 300; s++) {
        const px = r.x + r.dx * s, py = r.y + r.dy * s;
        if (py > H || py < -4 || px < -4 || px > W + 4) break;
        ctx.fillStyle = cols[((s + this.t * 3) >> 2) % 3];
        ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 5, 5);
      }
    }
  },

  // The histone core, with DNA wrapped around it.
  drawBossCore(ctx, B, core) {
    const cx = Math.round(core.x), cy = Math.round(core.y), r = core.r;
    if (B.beamT >= 140 && core === this.beamCore() && (B.beamT >> 1) & 1) NES.disc(ctx, cx, cy, r + 3, C.lime);
    NES.disc(ctx, cx, cy, r, core.flash ? C.white : C.purple);
    NES.disc(ctx, cx - 3, cy - 3, Math.max(3, r - 6), core.flash ? C.white : C.magenta);
    ctx.fillStyle = C.pink; ctx.fillRect(cx - 5, cy - 6, 2, 2);
    const span = r + 3;
    for (let i = -span; i <= span; i++) {
      const s = Math.sin(i * 0.45 + B.t * 0.12) * (r - 4);
      ctx.fillStyle = C.aqua; ctx.fillRect(cx + i, Math.round(cy + s), 1, 1);
      ctx.fillStyle = C.lime; ctx.fillRect(cx + i, Math.round(cy - s), 1, 1);
      if ((i + span) % 4 === 0) {
        ctx.fillStyle = C.lgray;
        const a = Math.round(Math.min(cy + s, cy - s)), b = Math.round(Math.max(cy + s, cy - s));
        ctx.fillRect(cx + i, a + 1, 1, Math.max(0, b - a - 1));
      }
    }
    if (core.shielded) this.drawShieldRing(ctx, cx, cy, r + 4);
  },

  drawShieldRing(ctx, cx, cy, r) {
    ctx.fillStyle = C.aqua;
    for (let k = 0; k < 24; k++) {
      if ((k + (this.t >> 2)) % 3 === 0) continue;
      const a = k / 24 * TAU;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  },
});
