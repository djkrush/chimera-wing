'use strict';
// Capital ships: the vertical boss fights. A giant ship (think Star Destroyer) scrolls under you
// while you fly its length, knocking out gun turrets, fighter hangars and reactor cores. If you
// reach the end with targets left, you come about and fly over it again (the ship is now seen
// the other way round). This repeats until every target is gone.
// Target positions are in the hull's own frame: lx from the centerline, ly from the bow.

const CAPITALS = {
  dreadnought: { name: 'METHYL DREADNOUGHT', w: 150, len: 520, turrets: 8, hangars: 2, cores: 1, launch: 'fighter',
    pal: { body: C.gray, top: C.lgray, lines: C.navy, edge: C.white, trim: C.violet },
    intro: 'MY DREADNOUGHT. EVERY GUN ON IT IS POINTED AT YOU.' },
  replicator: { name: 'DNMT1 REPLICATOR', w: 140, len: 480, turrets: 10, hangars: 2, cores: 1, launch: 'splitter',
    pal: { body: C.teal, top: C.cyan, lines: C.navy, edge: C.ice, trim: C.dgreen },
    intro: 'MY REPLICATOR. ONE PERFECT PATTERN, COPIED A THOUSAND TIMES.' },
  ark: { name: 'HIVE ARK', w: 160, len: 480, turrets: 6, hangars: 4, cores: 1, launch: 'drone',
    pal: { body: C.olive, top: C.gold, lines: C.brown, edge: C.cream, trim: C.yellow },
    intro: 'THE ARK CARRIES MY WHOLE HIVE. MIND THE DRONES.' },
  barr: { name: 'BARR BODY', w: 150, len: 520, turrets: 8, hangars: 2, cores: 2, launch: 'fighter',
    pal: { body: C.rust, top: C.orange, lines: C.maroon, edge: C.cream, trim: C.brown },
    intro: 'A BARR BODY IS A SILENCED X CHROMOSOME, PACKED TIGHT. SO IS THIS SHIP.' },
  imprint: { name: 'IMPRINT CRUISER', w: 140, len: 520, turrets: 10, hangars: 2, cores: 2, launch: 'fighter',
    pal: { body: C.blue, top: C.periwinkle, lines: C.navy, edge: C.ice, trim: C.sky },
    intro: 'THIS CRUISER ANSWERS TO ONE PARENT ONLY. ME.' },
  nucleosome: { name: 'NUCLEOSOME DREADNOUGHT', w: 170, len: 600, turrets: 12, hangars: 3, cores: 2, launch: 'splitter',
    pal: { body: C.violet, top: C.lavender, lines: C.navy, edge: C.lgray, trim: C.purple },
    intro: 'MY DREADNOUGHT RUNS ON HISTONE CORES. WRAPPED TIGHT, KEPT QUIET.' },
};
const CAPITAL_PTS = { turret: 500, hangar: 1000, core: 3000 };
const capitalHulls = {};   // baked once per ship type

Object.assign(Game, {
  // Hull half-width at distance ly from the bow: a long wedge, widest toward the stern.
  capHalf(def, ly) { return 8 + (def.w / 2 - 8) * Math.min(1, ly / (def.len * 0.85)); },

  capitalHull(id) {
    if (capitalHulls[id]) return capitalHulls[id];
    const def = CAPITALS[id], { w, len, pal } = def, cx = w >> 1;
    const c = document.createElement('canvas');
    c.width = w; c.height = len;
    const x = c.getContext('2d');
    const put = (col, a, b, cw, ch) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); };
    for (let py = 0; py < len; py++) {
      const hw = Math.round(this.capHalf(def, py));
      put(pal.edge, cx - hw, py, hw * 2 + 1, 1);
      if (py === 0 || py === len - 1) continue;
      put(py % 24 === 0 ? pal.lines : pal.body, cx - hw + 1, py, hw * 2 - 1, 1);
      for (let k = 20; k < hw - 4; k += 20) { put(pal.lines, cx - k, py, 1, 1); put(pal.lines, cx + k, py, 1, 1); }
      if (py > 24 && py < len * 0.78) put(py % 6 < 3 ? pal.trim : pal.lines, cx - 3, py, 7, 1);   // center trench
      if (py > len * 0.78 && py < len * 0.92) put(pal.top, cx - 18, py, 37, 1);                    // bridge tower
    }
    for (let k = -14; k <= 14; k += 4) put(C.yellow, cx + k, Math.round(len * 0.82), 2, 1);        // bridge windows
    for (const ex of [-40, -20, 0, 20, 40]) put(C.gray, cx + ex - 3, len - 5, 7, 5);                // engine bells
    capitalHulls[id] = c;
    return c;
  },

  layoutTargets(def) {
    const T = [], L = def.len;
    for (let i = 0; i < def.turrets; i++) {
      const ly = Math.round(L * (0.1 + 0.8 * (i + 0.5) / def.turrets));
      T.push({ kind: 'turret', lx: (i % 2 ? 1 : -1) * Math.round(this.capHalf(def, ly) - 10), ly, r: 6, hp: 5 });
    }
    for (let i = 0; i < def.hangars; i++) {
      const ly = Math.round(L * (0.2 + 0.3 * i / Math.max(1, def.hangars - 1)));
      T.push({ kind: 'hangar', lx: (i % 2 ? 1 : -1) * Math.round(this.capHalf(def, ly) * 0.45), ly, r: 8, hp: 10 });
    }
    for (let i = 0; i < def.cores; i++) {
      T.push({ kind: 'core', lx: def.cores === 1 ? 0 : (i ? 1 : -1) * 28, ly: Math.round(L * 0.66), r: 10, hp: 22 });
    }
    return T;
  },

  makeCapital(id) {
    const def = CAPITALS[id], k = 1 + this.stage * 0.06;
    this.lastBossName = def.name;
    const targets = this.layoutTargets(def).map(q => ({ ...q, hp: Math.round(q.hp * k), max: Math.round(q.hp * k),
      dead: false, x: 0, y: -99, cd: randi(60, 160), flash: 0 }));
    Sound.playSong(Sound.SONGS.boss);
    return { id, def, hull: this.capitalHull(id), y: 0, speed: 0.7, pass: 1, flip: false, turnT: 0, dying: 0, t: 0, targets };
  },

  capitalLeft() { return this.capital.targets.filter(q => !q.dead).length; },

  // Targets that can be hit right now.
  capitalOnScreen() {
    const K = this.capital;
    if (!K || K.turnT > 0) return [];
    return K.targets.filter(q => !q.dead && q.y > -8 && q.y < H + 8);
  },

  updateCapital() {
    const K = this.capital, def = K.def, p = this.player;
    K.t++;
    if (K.turnT > 0) {
      if (--K.turnT === 0) { K.flip = !K.flip; K.y = 0; K.pass++; }
      return;
    }
    K.y += K.speed;
    if (K.pass === 1 && Math.round(K.y) === 40) { this.say(def.intro); this.hint('capital'); }
    // 180-degree turn on every other pass: the far end comes first and left becomes right.
    for (const q of K.targets) {
      q.x = 128 + (K.flip ? -q.lx : q.lx);
      q.y = K.y - def.len + (K.flip ? def.len - q.ly : q.ly);
      if (q.flash > 0) q.flash--;
    }
    if (K.dying > 0) {
      if (K.dying % 6 === 0) {
        this.explode(128 + rand(-def.w / 2, def.w / 2) * 0.8, rand(20, H - 40), 12);
        Sound.sfx('explode');
      }
      if (--K.dying === 0) this.capitalDefeated();
      return;
    }
    const lvl = Math.min(this.stage / 5, 3);
    for (const q of K.targets) {
      if (q.dead || q.y < 4 || q.y > H - 50) continue;
      if (q.kind === 'turret' && --q.cd <= 0) {
        q.cd = Math.max(70, 130 - lvl * 15) + randi(0, 40);
        if (p.alive && q.y < p.y - 24) {   // only guns ahead of you fire
          const a = Math.atan2(p.y - q.y, p.x - q.x), sp = 1.6 + lvl * 0.15;
          this.eBul.push({ x: q.x, y: q.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
        }
      } else if (q.kind === 'hangar' && q.y < 150 && --q.cd <= 0) {
        q.cd = 210;
        if (this.enemies.length < 8) {
          const type = def.launch === 'fighter' ? this.mixType('fighter') : def.launch;
          this.spawnKamikaze(q.x, q.y, q.lx < 0 ? -1 : 1, type);
        }
      } else if (q.kind === 'core' && --q.cd <= 0) {
        q.cd = 230;
        this.ringShot(q.x, q.y, 8, 1.2 + lvl * 0.1, K.t * 0.05);
      }
    }
    if (K.y - def.len > H) {   // flown the whole length with targets left: come about
      K.turnT = 110;
      this.eBul = [];
      this.say(this.capitalLeft() + ' TARGETS LEFT. COMING ABOUT FOR ANOTHER PASS.', 'mira');
    }
  },

  capitalHitTest(b) {
    for (const q of this.capitalOnScreen()) {
      if (Math.hypot(b.x - q.x, b.y - q.y) >= q.r + 2) continue;
      b.dead = true;
      this.damageCapTarget(q, b.dmg, b.form, b.x, b.y);
      return;
    }
  },

  damageCapTarget(q, d, form, hx, hy) {
    const K = this.capital;
    if (q.dead || K.dying) return;
    if (form >= 0 && this.adapt === form) { d *= 0.5; this.spark(hx, hy, C.lgray); }
    this.hitsTotal++;
    q.hp -= d;
    q.flash = 4;
    Sound.sfx('bossHit');
    if (q.hp > 0) return;
    q.dead = true;
    this.explode(q.x, q.y, q.kind === 'core' ? 24 : 14);
    Sound.sfx(q.kind === 'core' ? 'boom' : 'explode');
    const pts = CAPITAL_PTS[q.kind];
    this.addScore(pts);
    this.popup(q.x, q.y - 8, String(pts), C.gold);
    if (!this.capitalLeft()) { K.dying = 150; this.eBul = []; Sound.sfx('boom'); }
  },

  capitalDefeated() {
    const p = this.player;
    this.addScore(20000);
    this.popup(128, 100, '20000', C.gold);
    for (const e of this.enemies) { e.dead = true; this.explode(e.x, e.y, 8); }
    this.enemies = [];
    this.eBul = [];
    this.capital = null;
    this.say(VOSS.bossDown);
    p.silenced = [false, false, false];
    p.silenceT = [0, 0, 0];
    this.nextAdapt = this.computeAdapt();
    this.bossWin = true;
    this.clearDelay = 240;
    this.setState('clear');
    Sound.playSong(Sound.SONGS.victory);
  },

  // ---- Drawing ------------------------------------------------------------------------
  drawCapital(ctx) {
    const K = this.capital, def = K.def;
    if (K.turnT > 0) return;
    const top = Math.round(K.y - def.len), x0 = 128 - (def.w >> 1);
    if (top < H && top + def.len > 0) {
      if (!K.flip) ctx.drawImage(K.hull, x0, top);
      else {
        ctx.save();
        ctx.translate(128, top + (def.len >> 1));
        ctx.rotate(Math.PI);
        ctx.drawImage(K.hull, -(def.w >> 1), -(def.len >> 1));
        ctx.restore();
      }
      // engine glow off the stern
      const sy = K.flip ? top - 3 : top + def.len;
      ctx.fillStyle = (this.t >> 1) & 1 ? C.sky : C.blue;
      for (const ex of [-40, -20, 0, 20, 40]) ctx.fillRect(128 + ex - 2, sy, 5, 3);
    }
    const p = this.player;
    for (const q of K.targets) {
      if (q.y < -12 || q.y > H + 12) continue;
      const x = Math.round(q.x), y = Math.round(q.y);
      if (q.dead) {
        NES.disc(ctx, x, y, q.kind === 'core' ? 8 : 5, C.black);
        if ((this.t >> 2) & 1) { ctx.fillStyle = C.red; ctx.fillRect(x - 1, y, 2, 1); }
        continue;
      }
      if (q.kind === 'turret') {
        NES.disc(ctx, x, y, 6, q.flash ? C.white : C.lgray);
        NES.disc(ctx, x, y, 4, q.flash ? C.white : C.gray);
        const a = Math.round(Math.atan2(p.y - y, p.x - x) / (Math.PI / 4)) * (Math.PI / 4);
        ctx.fillStyle = C.black;
        ctx.fillRect(x + Math.round(Math.cos(a) * 5) - 1, y + Math.round(Math.sin(a) * 5) - 1, 3, 3);
        ctx.fillStyle = C.red; ctx.fillRect(x - 1, y - 1, 2, 2);
      } else if (q.kind === 'hangar') {
        ctx.fillStyle = q.flash ? C.white : def.pal.edge; ctx.fillRect(x - 8, y - 6, 17, 12);
        ctx.fillStyle = C.black; ctx.fillRect(x - 7, y - 5, 15, 10);
        ctx.fillStyle = (this.t >> 3) & 1 ? C.yellow : C.orange;
        for (let k = -6; k <= 6; k += 4) ctx.fillRect(x + k, y + (K.flip ? -4 : 3), 2, 1);   // runway lights
      } else {
        NES.disc(ctx, x, y, 10, q.flash ? C.white : C.purple);
        NES.disc(ctx, x - 2, y - 2, 5, q.flash ? C.white : C.magenta);
        for (let i = -12; i <= 12; i++) {   // DNA wrapped around the histone core
          const s = Math.sin(i * 0.45 + this.t * 0.12) * 6;
          ctx.fillStyle = C.aqua; ctx.fillRect(x + i, Math.round(y + s), 1, 1);
          ctx.fillStyle = C.lime; ctx.fillRect(x + i, Math.round(y - s), 1, 1);
        }
      }
    }
  },

  drawCapitalText(ctx) {
    const K = this.capital;
    if (!K || K.turnT <= 0) return;
    const center = { align: 'center' };
    NES.text(ctx, 'COMING ABOUT', 128, 80, C.gold, { align: 'center', scale: 2, shadow: C.navy });
    NES.text(ctx, 'PASS ' + (K.pass + 1), 128, 104, C.white, center);
    NES.text(ctx, this.capitalLeft() + ' TARGETS LEFT', 128, 116, C.aqua, center);
  },
});
