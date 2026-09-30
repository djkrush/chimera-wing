'use strict';
// Side-scrolling stages, in the style of U.N. Squadron. The ship faces right and flies freely.
// Enemy squads arrive on a timed script (with extra patterns per system). A stronghold's assault ends
// at the system's boss base (bosses.js); other side legs just end when their script has played out.
// A GROUND RAID (this.raid) swaps much of the air traffic for tank columns and missile sites.

Object.assign(Game, {
  initSide() {
    this.scroll = 0;
    const s = this.stage;
    const kinds = ['migLine', 'migLine', 'migSwoop', 'migRear', 'bomber', 'sam', 'sam', ...this.systemSideKinds()];
    if (s >= 4) kinds.push('tankCol');
    if (this.raid) kinds.push('tankCol', 'tankCol', 'tankCol', 'sam', 'sam', 'sam');
    const events = [{ t: 700, kind: 'methyl' }, { t: 1700, kind: 'methyl' }];
    // ~45-55 seconds before the boss; a side approach (no boss) is a bit shorter
    const dur = (this.legBoss ? 2400 : 1900) + Math.min(s, 12) * 60;
    for (let t = 90; t < dur; t += randi(80, 140) - Math.min(s * 3, 40)) {
      let kind = pick(kinds);
      if (kind === 'migRear' && s < 4) kind = 'migSwoop';   // no ambushes from behind in the first mission
      events.push({ t, kind });
    }
    events.sort((a, b) => a.t - b.t);
    if (this.legBoss) events.push({ t: dur + 150, kind: 'boss' });
    this.side = { events, i: 0, t: 0, warns: [] };
  },

  updateSide() {
    const S = this.side;
    S.t++;
    while (S.i < S.events.length && S.events[S.i].t <= S.t) this.spawnSidePattern(S.events[S.i++].kind);
    for (const w of S.warns) w.t--;
    S.warns = S.warns.filter(w => w.t > 0);
  },

  spawnSidePattern(kind) {
    const p = this.player;
    switch (kind) {
      case 'migLine': {
        const y = randi(34, 166), amp = pick([0, 16, 28]);
        for (let i = 0; i < 5; i++) this.spawnSideEnemy(this.mixType('fighter'), 'sine', W + 16 + i * 30, y, { amp, ph: i * 0.6 });
        break;
      }
      case 'migSwoop': {
        const y = pick([30, 170]);
        for (let i = 0; i < 4; i++) this.spawnSideEnemy(this.mixType('fighter'), 'swoop', W + 16 + i * 28, y + (y < 100 ? i * 8 : -i * 8));
        break;
      }
      case 'migRear': {
        // ambush from behind, with a warning flashed on the left edge first
        for (let i = 0; i < 3; i++) {
          const y = clamp(p.y + (i - 1) * 30, 28, 180);
          this.spawnSideEnemy('fighter', 'rear', -40 - i * 30, y);
          this.side.warns.push({ y, t: 50 });
        }
        break;
      }
      case 'bomber':
        this.spawnSideEnemy(this.mixType('bomber'), 'bomber', W + 16, randi(40, 150));
        if (this.stage >= 6) this.spawnSideEnemy(this.mixType('bomber'), 'bomber', W + 80, randi(40, 150));
        break;
      case 'splitterLine': {
        const y = randi(40, 160);
        for (let i = 0; i < 3; i++) this.spawnSideEnemy('splitter', 'sine', W + 16 + i * 32, y, { amp: 20, ph: i * 0.8 });
        break;
      }
      case 'droneSwarm': {
        const y = randi(40, 160);
        for (let i = 0; i < 8; i++) this.spawnSideEnemy('drone', 'swarm', W + 10 + i * 14, y + ((i * 9) % 28) - 14);
        break;
      }
      case 'armoredPair':
        for (let i = 0; i < 2; i++) this.spawnSideEnemy('armored', 'bomber', W + 20 + i * 70, randi(40, 150));
        break;
      case 'sam': {
        const n = randi(2, 3);
        for (let i = 0; i < n; i++) this.spawnSideEnemy('sam', 'ground', W + 14 + i * 40, SIDE_GROUND - 8);
        break;
      }
      case 'tankCol': {   // a column of tanks rolling along the ground, guns raised
        const n = randi(2, 3 + (this.raid ? 1 : 0));
        for (let i = 0; i < n; i++) this.spawnSideEnemy('tank', 'tank', W + 14 + i * 34, SIDE_GROUND - 6);
        break;
      }
      case 'methyl':
        this.spawnSideEnemy('methyl', 'methyl', W + 12, randi(40, 170));
        break;
      case 'boss': {
        const id = this.missionBoss();
        this.boss = this.makeBoss(id);
        if (id === 'bunker') this.say(VOSS.sideBoss);
        else this.say('BASE AHEAD: THE ' + BOSSES[id].name + '!', 'mira');
        Sound.playSong(Sound.SONGS.boss);
        break;
      }
    }
  },

  spawnSideEnemy(type, beh, x, y, extra = {}) {
    const s = this.stage;
    const hp = Math.round({ fighter: 1, bomber: 4 + Math.floor(s / 6), methyl: 3, sam: 2, splitter: 2, drone: 1,
      armored: 6 + Math.floor(s / 5), tank: 3 + Math.floor(s / 6) }[type] * this.hpMul());
    const acetyl = type !== 'sam' && type !== 'tank' && s >= 2 && Math.random() < this.acetylChance();
    const base = beh === 'rear' ? 2.8 : Math.min(1.8 + s * 0.05, 3);
    const e = {
      type, hp, maxHp: hp, x, y, vx: 0, vy: 0, state: 'side', beh, st: 0,
      hd: beh === 'rear' ? 0 : Math.PI, spd: base * (acetyl ? 1.2 : 1),
      ang: beh === 'rear' ? Math.PI / 2 : -Math.PI / 2,
      slot: null, wave: -1, acetyl, holding: -1, flash: 0, fireYs: [], t: randi(0, 60), dead: false,
      fireAt: s >= 2 && Math.random() < 0.5 ? randi(40, 110) : 0,
      ...extra,
    };
    if (type === 'sam' || type === 'tank') e.face = 0;
    this.enemies.push(e);
    return e;
  },

  updateSideEnemy(e) {
    const p = this.player;
    e.st++;
    switch (e.beh) {
      case 'sine':
        e.vx = -e.spd;
        e.vy = e.amp ? Math.cos(e.st * 0.06 + e.ph) * e.amp * 0.06 : 0;
        break;
      case 'swoop':
        // fly in, then curve toward the player for about a second
        if (e.st > 25 && e.st < 85 && p.alive) {
          e.hd += clamp(angDiff(e.hd, Math.atan2(p.y - e.y, p.x - e.x)), -0.05, 0.05);
        }
        e.vx = Math.cos(e.hd) * e.spd;
        e.vy = Math.sin(e.hd) * e.spd;
        break;
      case 'rear':
        if (e.x < p.x && p.alive) e.hd += clamp(angDiff(e.hd, Math.atan2(p.y - e.y, 200)), -0.02, 0.02);
        e.vx = Math.cos(e.hd) * e.spd;
        e.vy = Math.sin(e.hd) * e.spd;
        if (e.st === 70) this.enemyFire(e);
        break;
      case 'swarm':   // drones: fast, and they drift toward your altitude
        e.vx = -e.spd * 1.3;
        e.vy = p.alive ? clamp((p.y - e.y) * 0.02, -0.6, 0.6) : 0;
        break;
      case 'bomber':
        e.vx = -0.5;
        e.vy = Math.sin(e.st * 0.02) * 0.3;
        if (e.st % 100 === 50 && e.x < W - 10) this.spreadShot(e.x - 14, e.y, 3, 0.25, 2);
        break;
      case 'ground':
        e.vx = this.scrollLock ? 0 : -1.5;   // moves with the ground
        e.vy = 0;
        if (e.x < W - 8 && e.x > 30 && e.st % Math.max(70, 110 - this.stage * 4) === 0) this.enemyFire(e);
        break;
      case 'tank':   // drives slowly right against the scroll, so it crawls across the screen
        e.vx = (this.scrollLock ? 0 : -1.5) + 0.5;
        e.vy = 0;
        if (e.x < W - 8 && e.x > 20 && e.st % Math.max(60, 100 - this.stage * 3) === 30) this.enemyFire(e);
        if (this.scrollLock && e.x > W + 20) e.dead = true;
        break;
      case 'methyl':
        this.updateSideMethyl(e);
        return;
    }
    e.x += e.vx;
    e.y += e.vy;
    if (e.fireAt && e.st === e.fireAt && e.x < W - 10) this.enemyFire(e);
    const gone = (e.vx < 0 && e.x < -30) || (e.vx > 0 && e.x > W + 30) || e.y < -40 || e.y > H + 20;
    if (gone) e.dead = true;
  },

  // Methylator: parks at the right, lines up with the player and fires a leftward silencing beam.
  // If it gets away while carrying a gene, that form stays silenced until the mission ends.
  updateSideMethyl(e) {
    const p = this.player;
    if (!e.phase) e.phase = 'in';
    if (e.phase === 'in') {
      const tx = 200, ty = clamp(p.alive ? p.y : 110, 30, 180);
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      if (d < 2 || e.st > 240) {
        e.phase = 'beam'; e.beamT = 0; e.face = -Math.PI / 2; e.vx = 0; e.vy = 0;
      } else {
        const sp = Math.min(1.8, d * 0.08 + 0.5);
        e.vx = dx / d * sp; e.vy = dy / d * sp;
        e.x += e.vx; e.y += e.vy;
      }
    } else if (e.phase === 'beam') {
      const T = ++e.beamT;
      if (T % 10 === 1 && T < 150) Sound.sfx('beam');
      e.beamExt = T < 30 ? T / 30 : T < 150 ? 1 : Math.max(0, 1 - (T - 150) / 25);
      if (T < 150 && p.alive) e.y += clamp((p.y - e.y) * 0.02, -0.3, 0.3);   // slowly tracks you
      if (e.beamExt >= 1 && T < 150 && p.alive && p.invuln <= 0 && e.holding < 0) {
        const x0 = e.x - 16;
        if (p.x < x0 && Math.abs(p.y - e.y) < 3 + (x0 - p.x) * 0.28 - 2) this.silenceForm(e);
      }
      if (T >= 175) { e.phase = 'out'; e.beamExt = 0; }
    } else {
      e.vx = 1; e.vy = 0;   // backs away to the right, still facing you
      e.x += e.vx;
      if (e.x > W + 30) e.dead = true;
    }
  },

  // SNES parallax landscape (scenery.js), plus the incoming-enemy warnings.
  drawSideBG(ctx) {
    this.drawSideLayers(ctx);   // scenery.js
    if (this.side && (this.t >> 2) & 1) {
      for (const w of this.side.warns) NES.text(ctx, '!>', 4, w.y - 3, C.red);
    }
  },
});
