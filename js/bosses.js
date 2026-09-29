'use strict';
// Side-mission bosses: fortified ground bases. The base scrolls in along the ground and the scroll
// stops when it arrives. To win, destroy every target on it: gun turrets, missile launchers,
// fighter hangars, radar dishes and reactor cores. Each sector's base adds a twist through its
// shield rule, and some rebuild a turret. Vertical boss fights are capital-ship flyovers (capital.js).
//
// The structure is SPR.baseHulls (176 x 112, drawn from the ground up). It is scenery: shots and
// the ship pass over it, and only the targets on it take hits. Target offsets (sx, sy) are from the
// base's left edge at ground level, so sy is negative (up).

const BASE_W = 176, BASE_H = 112;

const BASE_LAYOUTS = {
  // Four turrets, a missile launcher, a hangar, a radar and one core behind the wall.
  std: [
    { kind: 'turret', sx: 14, sy: -44 }, { kind: 'turret', sx: 55, sy: -80 },
    { kind: 'turret', sx: 116, sy: -82 }, { kind: 'turret', sx: 160, sy: -44 },
    { kind: 'launcher', sx: 96, sy: -46 }, { kind: 'hangar', sx: 16, sy: -15 },
    { kind: 'radar', sx: 135, sy: -114 }, { kind: 'core', sx: 95, sy: -62 },
  ],
  // The Hive: two drone hangars and a single core it shields itself.
  hive: [
    { kind: 'turret', sx: 14, sy: -44 }, { kind: 'turret', sx: 160, sy: -44 }, { kind: 'turret', sx: 116, sy: -82 },
    { kind: 'launcher', sx: 55, sy: -80 }, { kind: 'hangar', sx: 16, sy: -15 }, { kind: 'hangar', sx: 70, sy: -15 },
    { kind: 'radar', sx: 135, sy: -114 }, { kind: 'core', sx: 95, sy: -62 },
  ],
  // Two cores, one on the wall and one on the roof (X-Inactivator).
  twinCore: [
    { kind: 'turret', sx: 14, sy: -44 }, { kind: 'turret', sx: 55, sy: -80 }, { kind: 'turret', sx: 116, sy: -82 },
    { kind: 'hangar', sx: 16, sy: -15 }, { kind: 'radar', sx: 135, sy: -114 },
    { kind: 'core', sx: 95, sy: -62 }, { kind: 'core', sx: 150, sy: -50 },
  ],
};
const BASE_PART = {   // hit radius, base hp, points
  turret: { r: 7, hp: 12, pts: 1000 }, launcher: { r: 7, hp: 14, pts: 1000 }, hangar: { r: 9, hp: 16, pts: 1500 },
  radar: { r: 7, hp: 8, pts: 800 }, core: { r: 11, hp: 40, pts: 3000 },
};

// shield: 'turrets'    = cores shielded while any turret stands
//         'launch'     = core shielded while the hangars launch a swarm
//         'swapCore'   = one core shielded at a time, picked at random (like X-inactivation)
//         'swapTurret' = one turret open at a time, in turn (like imprinting); cores as 'turrets'
const BOSSES = {
  bunker: { name: 'HISTONE BUNKER', pal: 'bunker', layout: 'std', shield: 'turrets', launch: 'fighter', hp: 0.6 },
  copier: { name: 'DNMT1 COPIER', pal: 'copier', layout: 'std', shield: 'turrets', launch: 'splitter', hp: 0.65,
    regrow: true, intro: 'MY COPIER REBUILDS WHAT YOU BREAK. DNMT1 NEVER FORGETS A PATTERN.' },
  queen: { name: 'HIVE NEST', pal: 'queen', layout: 'hive', shield: 'launch', launch: 'drone', hp: 0.6,
    intro: 'MY NEST. ITS DRONES WILL SWARM YOU WHILE THE CORE HIDES BEHIND THEM.' },
  xinact: { name: 'X-INACTIVATOR', pal: 'xinact', layout: 'twinCore', shield: 'swapCore', launch: 'fighter', hp: 0.65,
    intro: 'TWO CORES, ONE SWITCHED OFF. WHICH ONE? EVEN I DO NOT KNOW.' },
  twins: { name: 'IMPRINT KEEP', pal: 'twins', layout: 'std', shield: 'swapTurret', launch: 'fighter', hp: 0.65,
    intro: 'ONLY ONE PARENT GETS TO SPEAK AT A TIME. GUESS WHICH.' },
  citadel: { name: "VOSS'S CITADEL", pal: 'citadel', layout: 'std', shield: 'turrets', launch: 'methyl', hp: 1.1,
    regrow: true, fast: true, intro: 'MY CITADEL. EVERY WEAPON YOU HAVE SEEN, ALL AT ONCE.' },
};

Object.assign(Game, {
  makeBoss(id) {
    const def = BOSSES[id];
    const m = def.hp * (1 + Math.max(0, this.stage - 3) * 0.05);   // gentle growth with progress
    const parts = BASE_LAYOUTS[def.layout].map((q, i) => {
      const P = BASE_PART[q.kind], hp = Math.max(1, Math.round(P.hp * m));
      return { ...q, id: q.kind + i, r: P.r, hp, max: hp, dead: false, x: 0, y: 0,
        cd: randi(60, 140), flash: 0, shielded: false };
    });
    this.lastBossName = def.name;
    return {
      id, def, hull: SPR.baseHulls[def.pal],
      x: W + 8, homeX: 80, t: 0, entering: true, dying: 0,
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
    for (const pt of B.parts) { pt.x = B.x + pt.sx; pt.y = SIDE_GROUND + pt.sy; }
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
        if (!q.shielded) this.spreadShot(q.x - 4, q.y - 2, lvl >= 2 ? 3 : 2, 0.3, 1.7 + lvl * 0.15);
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
    const B = this.boss, p = this.player;
    const bx = Math.round(B.x), gy = SIDE_GROUND;
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
      if (q.kind === 'turret') {
        NES.disc(ctx, x, y, 7, white ? C.white : C.lgray);
        NES.disc(ctx, x, y, 5, white ? C.white : C.gray);
        const a = Math.round(Math.atan2(p.y - y, p.x - x) / (Math.PI / 4)) * (Math.PI / 4);
        ctx.fillStyle = C.black;
        for (const k of [5, 8]) ctx.fillRect(x + Math.round(Math.cos(a) * k) - 1, y + Math.round(Math.sin(a) * k) - 1, 3, 3);
        ctx.fillStyle = (this.t >> 3) & 1 ? C.red : C.darkred; ctx.fillRect(x - 1, y - 1, 2, 2);
      } else if (q.kind === 'launcher') {
        ctx.fillStyle = white ? C.white : C.gray; ctx.fillRect(x - 7, y - 3, 15, 7);
        for (let k = -5; k <= 5; k += 5) {   // missile rack
          ctx.fillStyle = C.white; ctx.fillRect(x + k - 1, y - 9, 2, 6);
          ctx.fillStyle = C.red; ctx.fillRect(x + k - 1, y - 10, 2, 1);
        }
      } else if (q.kind === 'hangar') {
        ctx.fillStyle = white ? C.white : C.lgray; ctx.fillRect(x - 10, y - 12, 21, 24);
        ctx.fillStyle = C.black; ctx.fillRect(x - 8, y - 10, 17, 22);
        ctx.fillStyle = (this.t >> 3) & 1 ? C.yellow : C.orange;
        for (let k = -8; k <= 10; k += 6) ctx.fillRect(x - 10, y + k, 1, 2);
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
