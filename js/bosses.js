'use strict';
// Bosses. Every boss is built from turrets and cores (with the shared shield / beam / ring-shot
// mechanics) and described by an entry in BOSSES. Vertical stages show the top-down hull at the top
// of the screen, facing down. Side missions show a side-profile hull at the right, facing left.
// Part offsets: ox/oy for the top-down hull, sx/sy for the side profile.

const BOSS_PARTS = {
  // Two turrets and a core that stays shielded until both turrets fall.
  std: [
    { id: 'L', kind: 'turret', ox: -38, oy: 2, sx: -20, sy: -14, r: 8, hp: 60 },
    { id: 'R', kind: 'turret', ox: 38, oy: 2, sx: -20, sy: 14, r: 8, hp: 60 },
    { id: 'C', kind: 'core', ox: 0, oy: 6, sx: 8, sy: 0, r: 11, hp: 150 },
  ],
  // A lone core (the Hive Queen shields it herself).
  core: [{ id: 'C', kind: 'core', ox: 0, oy: 6, sx: 0, sy: 0, r: 12, hp: 230 }],
  // Two cores and no turrets (X-Inactivator).
  twinCore: [
    { id: 'C1', kind: 'core', ox: -30, oy: 4, sx: -24, sy: 0, r: 10, hp: 120 },
    { id: 'C2', kind: 'core', ox: 30, oy: 4, sx: 24, sy: 0, r: 10, hp: 120 },
  ],
};

// shield: 'turrets' = cores shielded while any turret stands
//         'launch'  = core shielded while it launches a swarm
//         'swapCore' = one core shielded at a time, picked at random (like X-inactivation)
//         'swapTurret' = one turret shielded at a time, in turn (like imprinting), core as 'turrets'
const BOSSES = {
  gunship: { name: 'HISTONE GUNSHIP', pal: 'gunship', parts: 'std', shield: 'turrets', launch: 'fighter', hp: 0.6 },
  gunship2: { name: 'GUNSHIP MK II', pal: 'gunship', parts: 'std', shield: 'turrets', launch: 'splitter', hp: 0.8 },
  fortress: { name: 'NUCLEOSOME FORTRESS', pal: 'fortress', parts: 'std', shield: 'turrets', launch: 'fighter', hp: 1 },
  copier: { name: 'DNMT1 COPIER', pal: 'copier', parts: 'std', shield: 'turrets', launch: 'splitter', hp: 0.65,
    regrow: true, intro: 'MY COPIER REBUILDS WHAT YOU BREAK. DNMT1 NEVER FORGETS A PATTERN.' },
  queen: { name: 'HIVE QUEEN', pal: 'queen', parts: 'core', shield: 'launch', launch: 'drone', hp: 0.6,
    intro: 'MY QUEEN. HER DRONES WILL SWARM YOU WHILE SHE HIDES BEHIND THEM.' },
  xinact: { name: 'X-INACTIVATOR', pal: 'xinact', parts: 'twinCore', shield: 'swapCore', launch: 'fighter', hp: 0.65,
    intro: 'TWO CORES, ONE SWITCHED OFF. WHICH ONE? EVEN I DO NOT KNOW.' },
  twins: { name: 'IMPRINT TWINS', pal: 'twins', parts: 'std', shield: 'swapTurret', launch: 'fighter', hp: 0.65,
    intro: 'ONLY ONE PARENT GETS TO SPEAK AT A TIME. GUESS WHICH.' },
  flagship: { name: "VOSS'S FLAGSHIP", pal: 'flagship', parts: 'std', shield: 'turrets', launch: 'methyl', hp: 1.1,
    regrow: true, fast: true, intro: 'MY FLAGSHIP. EVERY WEAPON YOU HAVE SEEN, ALL AT ONCE.' },
};

Object.assign(Game, {
  // side = side-scrolling mission. id picks the entry in BOSSES.
  makeBoss(side, id = side ? 'gunship' : 'fortress') {
    const def = BOSSES[id];
    const m = def.hp * (1 + Math.max(0, Math.floor(this.stage / 5) - 1) * 0.5);
    const parts = BOSS_PARTS[def.parts].map(q => ({ ...q, hp: Math.round(q.hp * m), max: Math.round(q.hp * m),
      dead: false, x: 0, y: 0, cd: randi(50, 90), flash: 0, shielded: false }));
    this.lastBossName = def.name;
    return {
      id, def, side, hull: side ? SPR.bossSideHulls[def.pal] : SPR.bossHulls[def.pal],
      x: side ? W + 70 : 128, y: side ? 110 : -30, baseY: 58, homeX: 192, t: 0, mt: 0, entering: true, dying: 0,
      parts, ringCd: 150, launchCd: 200, beamCd: 90, beamT: 0, beamAng: 0, beamDir: 1, phase2: false,
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

  // Beam origin and direction for the boss's sweeping silencer beam.
  bossBeamRay() {
    const B = this.boss, core = this.beamCore();
    const [ox, oy] = this.orient(0, 8);
    const [dx, dy] = this.orient(Math.sin(B.beamAng), Math.cos(B.beamAng));
    return { x: core.x + ox, y: core.y + oy, dx, dy };
  },

  // Which parts are shielded right now, following the boss's shield rule.
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
    if (rule === 'swapTurret' && turrets.filter(q => !q.dead).length > 1) {
      if (--B.swapT <= 0) { B.swapT = 300; B.open ^= 1; Sound.sfx('charge'); }
      turrets.forEach((q, i) => { q.shielded = i !== B.open; });
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
        const [ex, ey] = B.side ? [rand(-56, 56), rand(-18, 18)] : [rand(-50, 50), rand(-14, 14)];
        this.explode(B.x + ex, B.y + ey, 10);
        Sound.sfx('explode');
      }
      if (--B.dying === 0) this.bossDefeated();
      return;
    }
    if (B.entering) {
      if (B.side) { B.x -= 0.6; if (B.x <= B.homeX) { B.x = B.homeX; B.entering = false; } }
      else { B.y += 0.5; if (B.y >= B.baseY) { B.y = B.baseY; B.entering = false; } }
      if (!B.entering) this.say(def.intro || VOSS.bossShield);
    } else {
      if (B.beamT <= 0) B.mt++;   // hover in place while firing the beam
      if (B.side) {
        B.y = 110 + Math.sin(B.mt * 0.012) * 45;
        B.x = B.homeX + Math.sin(B.t * 0.03) * 3;
      } else {
        B.x = 128 + Math.sin(B.mt * 0.012) * 60;
        B.y = B.baseY + Math.sin(B.t * 0.03) * 3;
      }
    }
    for (const pt of B.parts) {
      const [ox, oy] = B.side ? [pt.sx, pt.sy] : [pt.ox, pt.oy];
      pt.x = B.x + ox; pt.y = B.y + oy;
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

    const lvl = Math.min(this.stage / 5, 4) + (def.fast ? 1 : 0);
    for (const tt of this.bossTurrets()) {
      if (!tt.dead && --tt.cd <= 0) {
        tt.cd = Math.max(35, 85 - lvl * 10);
        const [mx, my] = this.orient(0, 6);
        this.spreadShot(tt.x + mx, tt.y + my, 3, 0.28, 2.2 + lvl * 0.2);
      }
    }
    const core = this.beamCore();
    if (--B.ringCd <= 0 && core) {
      B.ringCd = core.shielded ? 170 : 120;
      this.ringShot(core.x, core.y, core.shielded ? 10 : 14, 1.5 + lvl * 0.15, B.t * 0.05);
    }
    if (--B.launchCd <= 0) this.bossLaunch();
    const exposed = this.bossCores().some(q => !q.dead && !q.shielded);
    if (!exposed && !B.phase2) return;
    if (!B.phase2) { B.phase2 = true; B.beamCd = 100; if (def.shield === 'turrets') this.say(VOSS.bossPhase2); }
    if (B.beamT > 0) {
      B.beamT--;
      if (B.beamT < 140) {
        const k = 1 - B.beamT / 140;
        B.beamAng = B.beamDir * (-0.7 + 1.4 * k);
        if (B.beamT % 10 === 0) Sound.sfx('beam');
        this.checkBossBeam();
      }
    } else if (--B.beamCd <= 0) {
      B.beamCd = def.fast ? 220 : 300;
      B.beamT = 180;
      // sweep starts away from the player and crosses them
      const across = B.side ? p.y > B.y : p.x < B.x;
      B.beamDir = across ? -1 : 1;
      B.beamAng = -0.7 * B.beamDir;
      Sound.sfx('charge');
    }
  },

  // Escorts launched from the hull. The Hive Queen shields her core while she launches.
  bossLaunch() {
    const B = this.boss, type = B.def.launch;
    const swarm = B.def.shield === 'launch';
    B.launchCd = swarm ? 240 : 320;
    if (swarm) { B.shieldT = 150; this.popup(B.x, B.y - 30, 'SWARM!', C.gold); }
    const n = swarm ? 3 : 1;
    for (let i = 0; i < n; i++) {
      for (const s of [-1, 1]) {
        if (B.side) {
          const kind = type === 'methyl' && i === 0 && s < 0 ? 'methyl' : type === 'methyl' ? 'fighter' : type;
          this.spawnSideEnemy(kind, kind === 'methyl' ? 'methyl' : 'swoop', B.x - 40 - i * 10, B.y + s * (20 + i * 8));
        } else {
          const [ox, oy] = [s * (52 - i * 10), 2 + i * 6];
          this.spawnKamikaze(B.x + ox, B.y + oy, s, type === 'methyl' ? 'fighter' : type);
        }
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
    const rx = b.x - B.x, ry = b.y - B.y;
    if (B.side) {
      // side profile: long hull plus the bridge tower on top
      if ((Math.abs(rx) < 60 && Math.abs(ry) < 13) || (rx > -4 && rx < 32 && ry < 0 && ry > -22)) {
        b.dead = true;
        this.spark(b.x, b.y, C.lgray, 2);
      }
      return;
    }
    const dx = Math.abs(rx);
    if (dx < 56 && ry > -18 + dx * 0.22 && ry < 14 - dx * 0.42) {
      b.dead = true;
      this.spark(b.x, b.y, C.lgray, 2);
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
      pt.hp = Math.max(pt.max * 0.5, pt.hp - d * 0.25);
      pt.flash = 2;
      if (this.t - (B.hintT || -999) > 150) {
        B.hintT = this.t;
        const hint = { turrets: 'SHIELDED! HIT THE TURRETS', launch: 'SHIELDED! WAIT FOR IT',
          swapCore: 'SHIELDED! HIT THE OPEN CORE', swapTurret: 'SHIELDED! HIT THE OPEN ONE' }[B.def.shield];
        const [ox, oy] = this.orient(0, 22);
        this.popup(clamp(pt.x + ox, 104, W - 104), clamp(pt.y + oy, 20, 200), hint, C.aqua);
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
    if (pt.kind === 'turret' && B.def.regrow && !B.regrew) { B.regrew = true; B.regrow = { part: pt, t: 300 }; }
    if (pt.kind === 'core' && this.bossCores().every(q => q.dead)) {
      B.dying = 120;
      B.beamT = 0;
      B.regrow = null;
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
      this.booms.push({ x: B.x + rand(-56, 56), y: B.y + rand(-16, 16), n: 16, delay: i * 6 });
    }
    for (const e of this.enemies) { e.dead = true; this.explode(e.x, e.y, 8); }
    this.enemies = [];
    this.eBul = [];
    this.boss = null;
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
    const B = this.boss;
    const x = Math.round(B.x), y = Math.round(B.y);
    ctx.drawImage(B.hull, x - 64, y - (B.hull.height >> 1));
    const [barX, barY] = this.orient(0, 7);   // gun barrel direction

    for (const tt of this.bossTurrets()) {
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
      if (tt.shielded) this.drawShieldRing(ctx, tx, ty, 11);
    }
    for (const core of this.bossCores()) if (!core.dead) this.drawBossCore(ctx, B, core);

    if (B.beamT > 0 && B.beamT < 140 && this.beamCore()) {
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
